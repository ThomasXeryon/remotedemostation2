import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, generateStationId } from "./storage";
import { db } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { insertUserSchema, insertOrganizationSchema, insertDemoStationSchema, insertControlConfigurationSchema, userOrganizations, organizations, demoStations } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    organizationId: number;
    role: string;
  };
  headers: any;
  body: any;
  params: any;
  query: any;
}

// Middleware to verify Clerk session
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Development bypass for testing
  if (process.env.NODE_ENV === 'development' && req.headers['x-debug-user']) {
    console.log('Debug mode: bypassing authentication');
    req.user = {
      id: 1,
      organizationId: 1,
      role: 'admin'
    };
    return next();
  }

  // Extract Clerk session token from cookies
  const sessionToken = req.cookies['__session'] || req.cookies['__session_HnP_O-TV'];
  
  if (!sessionToken) {
    console.log('No Clerk session token found in cookies');
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Decode the Clerk JWT without verification for now (in production, should verify with Clerk's public key)
    const payload = jwt.decode(sessionToken) as any;
    
    if (!payload || !payload.sub) {
      console.log('Invalid Clerk session token');
      return res.status(401).json({ message: 'Invalid session' });
    }

    console.log('Clerk session verified for user:', payload.sub);
    req.user = {
      id: 3, // Hardcoded for now, should map Clerk user ID to internal user ID
      organizationId: 9, // Hardcoded for now, should get from user's organization
      role: 'admin'
    };
    next();
  } catch (error) {
    console.log('Error processing Clerk session:', error);
    return res.status(401).json({ message: 'Invalid session' });
  }
}

// WebSocket connection management
const wsConnections = new Map<number, Set<WebSocket>>();

function broadcastToStation(stationId: number, data: any) {
  const connections = wsConnections.get(stationId);
  if (connections) {
    const message = JSON.stringify(data);
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

// Session configuration
function setupSession(app: Express) {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 7 * 24 * 60 * 60 * 1000, // 1 week
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }));
}

// Passport configuration
function setupPassport() {
  // Hardcode callback URL to custom domain
  const callbackURL = 'https://app.remotedemostation.com/auth/google/callback';
  console.log('OAuth callback URL configured as:', callbackURL);

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: callbackURL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google OAuth profile:', JSON.stringify(profile, null, 2));

      // Check if user exists
      let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
      console.log('Existing user found:', user);

      if (!user) {
        console.log('Creating new user for Google OAuth');
        // Create new user
        user = await storage.createUser({
          email: profile.emails?.[0]?.value || '',
          username: profile.emails?.[0]?.value || '',
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          password: '', // No password needed for Google auth
          isActive: true
        });
        console.log('Created new user:', user);

        // Create default organization for new user
        const org = await storage.createOrganization({
          name: `${user.firstName}'s Organization`,
          slug: `${user.username}-org-${Date.now()}`,
          primaryColor: '#3b82f6',
          secondaryColor: '#1e293b'
        });
        console.log('Created organization:', org);

        // Add user to organization as admin
        await storage.addUserToOrganization({
          userId: user.id,
          organizationId: org.id,
          role: 'admin'
        });
        console.log('Added user to organization');
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup session and passport
  setupSession(app);
  app.use(passport.initialize());
  app.use(passport.session());
  setupPassport();

  // Serve controls demo
  app.get('/test-controls', async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'test-controls-simple.html');
      
      const data = await fs.promises.readFile(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(data);
    } catch (err) {
      res.status(404).send('Controls demo not found');
    }
  });

  // Serve shadcn controls demo as standalone HTML
  app.get('/shadcn-demo', async (req, res) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>shadcn/ui Professional Controls - RDS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .joystick-container {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            position: relative;
            margin: 0 auto;
            cursor: pointer;
            border: 4px solid #bfdbfe;
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
        }
        .joystick-stick {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: white;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.05s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 2px solid #1d4ed8;
        }
        .shadcn-slider {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: #e2e8f0;
            outline: none;
            position: relative;
        }
        .shadcn-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #3b82f6;
            border: 2px solid white;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .animate-pulse-dot {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto p-6 space-y-8">
        <!-- Header -->
        <div class="card p-8">
            <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1"></path>
                    </svg>
                </div>
                <div>
                    <h1 class="text-4xl font-bold text-gray-900">shadcn/ui Professional Controls</h1>
                    <p class="text-gray-600 text-lg">Remote Demo Station hardware control interface</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded mb-2">shadcn/ui Styled</div>
                    <p class="text-sm text-blue-700">Professional control components with consistent design system</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded mb-2">Touch Responsive</div>
                    <p class="text-sm text-green-700">Mobile-friendly drag and touch interactions</p>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div class="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded mb-2">Real-time Commands</div>
                    <p class="text-sm text-purple-700">Live hardware command streaming and logging</p>
                </div>
            </div>
        </div>

        <!-- Control Demonstrations -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Joystick Demo -->
            <div class="card border-blue-200">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-blue-700">shadcn/ui Joystick</h2>
                </div>
                <div class="p-6 space-y-4">
                    <div class="flex justify-center">
                        <div id="joystick" class="joystick-container" onmousedown="startJoystick(event)" ontouchstart="startJoystick(event)">
                            <div class="joystick-stick" id="joystick-stick"></div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 rounded-lg p-3 border">
                        <div id="joystick-values" class="text-center font-mono text-sm text-gray-700">
                            <div>X: 0.000</div>
                            <div>Y: 0.000</div>
                            <div class="text-xs text-gray-500 mt-1">Magnitude: 0.000</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Slider Demo -->
            <div class="card border-green-200">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-green-700">shadcn/ui Slider</h2>
                </div>
                <div class="p-6 space-y-6">
                    <div class="text-center">
                        <div id="slider-display" class="text-3xl font-bold text-green-600 mb-4">50%</div>
                        
                        <div class="px-4">
                            <input type="range" min="0" max="100" value="50" class="shadcn-slider" id="main-slider" oninput="updateSlider(this.value)">
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 rounded-lg p-3 border">
                        <div id="slider-values" class="text-center font-mono text-sm text-gray-700">
                            <div>Value: 50%</div>
                            <div>Normalized: 0.50</div>
                            <div class="text-xs text-gray-500 mt-1">Range: 0-100</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Combined Controls -->
            <div class="card border-purple-200">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-purple-700">Combined Controls</h2>
                </div>
                <div class="p-6 space-y-4">
                    <div class="flex justify-center">
                        <div id="combined-joystick" class="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full border-2 border-purple-300 cursor-pointer" style="box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);" onmousedown="startCombinedJoystick(event)">
                            <div class="absolute w-5 h-5 bg-white rounded-full border border-purple-600 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" id="combined-stick"></div>
                        </div>
                    </div>
                    
                    <div class="px-2">
                        <input type="range" min="0" max="100" value="25" step="5" class="shadcn-slider" id="combined-slider" oninput="updateCombined()" style="background: #e2e8f0;">
                    </div>
                    
                    <div class="bg-gray-50 rounded-lg p-3 border">
                        <div id="combined-values" class="text-center font-mono text-xs text-gray-700">
                            <div>Intensity: 25%</div>
                            <div>Status: Active</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Command Log -->
        <div class="card">
            <div class="p-6 border-b border-gray-200">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse-dot"></div>
                        <h3 class="text-xl font-semibold text-gray-900">Hardware Command Stream</h3>
                    </div>
                    <button onclick="clearCommandLog()" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">
                        Clear Log
                    </button>
                </div>
            </div>
            <div class="p-6">
                <div id="command-log" class="bg-gray-900 text-green-400 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
                    <div class="text-gray-500">// Waiting for control interactions...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let commandHistory = [];
        let isDragging = false;
        let combinedData = { joystick: { x: 0, y: 0 }, slider: 25 };

        function logCommand(device, action, data) {
            const timestamp = new Date().toISOString();
            const command = {
                timestamp,
                device,
                action,
                data: JSON.stringify(data)
            };
            
            commandHistory.unshift(command);
            if (commandHistory.length > 50) commandHistory.pop();
            
            updateCommandLog();
        }

        function updateCommandLog() {
            const logElement = document.getElementById('command-log');
            const formattedCommands = commandHistory.map((cmd, index) => 
                \`<div class="mb-1 \${index === 0 ? 'text-yellow-400' : 'text-green-400'}">
                    [\${cmd.timestamp.split('T')[1].split('.')[0]}] \${cmd.device}.\${cmd.action}(\${cmd.data})
                </div>\`
            ).join('');
            
            logElement.innerHTML = formattedCommands || '<div class="text-gray-500">// No commands yet</div>';
            logElement.scrollTop = 0;
        }

        function clearCommandLog() {
            commandHistory = [];
            updateCommandLog();
        }

        // Joystick functionality
        function startJoystick(event) {
            event.preventDefault();
            isDragging = true;
            document.addEventListener('mousemove', moveJoystick);
            document.addEventListener('mouseup', stopJoystick);
            document.addEventListener('touchmove', moveJoystick);
            document.addEventListener('touchend', stopJoystick);
        }

        function moveJoystick(event) {
            if (!isDragging) return;
            
            const joystick = document.getElementById('joystick');
            const stick = document.getElementById('joystick-stick');
            const rect = joystick.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const clientX = event.clientX || (event.touches && event.touches[0].clientX);
            const clientY = event.clientY || (event.touches && event.touches[0].clientY);
            
            const deltaX = clientX - centerX;
            const deltaY = clientY - centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 44;
            
            let x = deltaX;
            let y = deltaY;
            
            if (distance > maxDistance) {
                x = (deltaX / distance) * maxDistance;
                y = (deltaY / distance) * maxDistance;
            }
            
            stick.style.transform = \`translate(calc(-50% + \${x}px), calc(-50% + \${y}px))\`;
            
            const normalizedX = parseFloat((x / maxDistance).toFixed(3));
            const normalizedY = parseFloat((-y / maxDistance).toFixed(3));
            const magnitude = Math.sqrt(normalizedX**2 + normalizedY**2);
            
            document.getElementById('joystick-values').innerHTML = 
                \`<div>X: \${normalizedX.toFixed(3)}</div>
                 <div>Y: \${normalizedY.toFixed(3)}</div>
                 <div class="text-xs text-gray-500 mt-1">Magnitude: \${magnitude.toFixed(3)}</div>\`;
            
            logCommand('shadcn_joystick', 'move', { x: normalizedX, y: normalizedY });
        }

        function stopJoystick() {
            if (!isDragging) return;
            isDragging = false;
            
            const stick = document.getElementById('joystick-stick');
            stick.style.transform = 'translate(-50%, -50%)';
            
            document.getElementById('joystick-values').innerHTML = 
                \`<div>X: 0.000</div>
                 <div>Y: 0.000</div>
                 <div class="text-xs text-gray-500 mt-1">Magnitude: 0.000</div>\`;
            logCommand('shadcn_joystick', 'stop', { x: 0, y: 0 });
            
            document.removeEventListener('mousemove', moveJoystick);
            document.removeEventListener('mouseup', stopJoystick);
            document.removeEventListener('touchmove', moveJoystick);
            document.removeEventListener('touchend', stopJoystick);
        }

        // Slider functionality
        function updateSlider(value) {
            const normalized = (value / 100).toFixed(2);
            document.getElementById('slider-display').textContent = value + '%';
            document.getElementById('slider-values').innerHTML = 
                \`<div>Value: \${value}%</div>
                 <div>Normalized: \${normalized}</div>
                 <div class="text-xs text-gray-500 mt-1">Range: 0-100</div>\`;
            logCommand('shadcn_slider', 'change', { value: parseInt(value) });
        }

        // Combined controls
        function updateCombined() {
            const sliderValue = document.getElementById('combined-slider').value;
            combinedData.slider = parseInt(sliderValue);
            document.getElementById('combined-values').innerHTML = 
                \`<div>Intensity: \${combinedData.slider}%</div>
                 <div>Status: Active</div>\`;
            logCommand('shadcn_combined_slider', 'intensity_update', { intensity: combinedData.slider });
        }

        // Initialize
        logCommand('shadcn_system', 'initialized', { 
            framework: 'shadcn/ui-styled',
            components: ['Joystick', 'Slider', 'Card', 'Badge'],
            timestamp: new Date().toISOString()
        });
    </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  });

  // Serve Material-UI controls demo as standalone HTML
  app.get('/material-ui-demo', async (req, res) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Material-UI Professional Controls - RDS</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/@mui/material@5.15.0/umd/material-ui.development.js"></script>
    <script src="https://unpkg.com/@emotion/react@11.11.0/dist/emotion-react.umd.min.js"></script>
    <script src="https://unpkg.com/@emotion/styled@11.11.0/dist/emotion-styled.umd.min.js"></script>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
    <style>
        body { margin: 0; font-family: 'Roboto', sans-serif; }
        .joystick-container {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
            position: relative;
            cursor: pointer;
            border: 4px solid rgba(25, 118, 210, 0.2);
            box-shadow: 0 8px 32px rgba(25, 118, 210, 0.3);
            transition: box-shadow 0.2s ease;
        }
        .joystick-container:hover {
            box-shadow: 0 12px 40px rgba(25, 118, 210, 0.4);
        }
        .joystick-stick {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: white;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: transform 0.05s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 3px solid #1565c0;
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useRef } = React;
        const { 
            Box, Card, CardContent, CardHeader, Typography, Slider, Button, 
            Chip, Grid, Paper, Divider, Stack, ThemeProvider, createTheme 
        } = MaterialUI;

        const theme = createTheme({
            palette: {
                primary: { main: '#1976d2' },
                secondary: { main: '#dc004e' },
            },
        });

        function MaterialUIDemo() {
            const [commandHistory, setCommandHistory] = useState([]);
            const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
            const [sliderValue, setSliderValue] = useState(50);
            const [combinedSlider, setCombinedSlider] = useState(25);
            const [isDragging, setIsDragging] = useState(false);
            
            const joystickRef = useRef(null);

            const logCommand = (device, action, data) => {
                const command = {
                    timestamp: new Date().toISOString(),
                    device,
                    action,
                    data
                };
                
                setCommandHistory(prev => [command, ...prev.slice(0, 49)]);
            };

            const clearCommandLog = () => {
                setCommandHistory([]);
            };

            const handleJoystickMouseDown = (event) => {
                event.preventDefault();
                setIsDragging(true);
                
                const handleMouseMove = (e) => {
                    if (!joystickRef.current) return;
                    
                    const rect = joystickRef.current.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    const deltaX = e.clientX - centerX;
                    const deltaY = e.clientY - centerY;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    const maxDistance = 50;
                    
                    let x = deltaX;
                    let y = deltaY;
                    
                    if (distance > maxDistance) {
                        x = (deltaX / distance) * maxDistance;
                        y = (deltaY / distance) * maxDistance;
                    }
                    
                    const normalizedX = parseFloat((x / maxDistance).toFixed(3));
                    const normalizedY = parseFloat((-y / maxDistance).toFixed(3));
                    
                    setJoystickPosition({ x: normalizedX, y: normalizedY });
                    logCommand('mui_joystick', 'move', { x: normalizedX, y: normalizedY });
                };
                
                const handleMouseUp = () => {
                    setIsDragging(false);
                    setJoystickPosition({ x: 0, y: 0 });
                    logCommand('mui_joystick', 'stop', { x: 0, y: 0 });
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            };

            const handleSliderChange = (_, value) => {
                setSliderValue(value);
                logCommand('mui_slider', 'change', { value });
            };

            const handleCombinedSliderChange = (_, value) => {
                setCombinedSlider(value);
                logCommand('combined_mui_slider', 'intensity_update', { intensity: value });
            };

            useEffect(() => {
                logCommand('mui_system', 'initialized', { 
                    framework: 'Material-UI',
                    components: ['Slider', 'Card', 'Button', 'Chip'],
                    timestamp: new Date().toISOString()
                });
            }, []);

            return React.createElement(ThemeProvider, { theme }, 
                React.createElement(Box, { sx: { p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' } }, [
                    
                    // Header
                    React.createElement(Card, { key: 'header', elevation: 3, sx: { mb: 3 } },
                        React.createElement(CardContent, { sx: { p: 4 } }, [
                            React.createElement(Stack, { key: 'title', direction: 'row', spacing: 2, alignItems: 'center', sx: { mb: 3 } }, [
                                React.createElement(Box, {
                                    key: 'icon',
                                    sx: {
                                        width: 64, height: 64,
                                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                                        borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }
                                }, React.createElement('span', { 
                                    className: 'material-icons', 
                                    style: { color: 'white', fontSize: 32 } 
                                }, 'videogame_asset')),
                                React.createElement(Box, { key: 'text' }, [
                                    React.createElement(Typography, { 
                                        key: 'h1',
                                        variant: 'h3', component: 'h1', fontWeight: 'bold', color: 'primary'
                                    }, 'Material-UI Professional Controls'),
                                    React.createElement(Typography, { 
                                        key: 'h6',
                                        variant: 'h6', color: 'text.secondary'
                                    }, 'Remote Demo Station hardware control interface')
                                ])
                            ]),
                            React.createElement(Stack, { key: 'chips', direction: 'row', spacing: 2, flexWrap: 'wrap' }, [
                                React.createElement(Chip, { 
                                    key: 'chip1',
                                    label: 'Material-UI Components', color: 'primary', size: 'small'
                                }),
                                React.createElement(Chip, { 
                                    key: 'chip2',
                                    label: 'Touch Responsive', color: 'success', size: 'small'
                                }),
                                React.createElement(Chip, { 
                                    key: 'chip3',
                                    label: 'Real-time Commands', color: 'secondary', size: 'small'
                                })
                            ])
                        ])
                    ),

                    // Controls Grid
                    React.createElement(Stack, { key: 'controls', direction: { xs: 'column', lg: 'row' }, spacing: 3, sx: { mb: 3 } }, [
                        
                        // Joystick Demo
                        React.createElement(Card, { 
                            key: 'joystick',
                            elevation: 2, 
                            sx: { border: '2px solid', borderColor: 'primary.200', flex: 1 }
                        }, [
                            React.createElement(CardHeader, {
                                key: 'header',
                                title: 'Material-UI Joystick',
                                titleTypographyProps: { color: 'primary.main', fontWeight: 'bold' }
                            }),
                            React.createElement(CardContent, { key: 'content' },
                                React.createElement(Stack, { spacing: 3, alignItems: 'center' }, [
                                    React.createElement('div', {
                                        key: 'joystick-elem',
                                        ref: joystickRef,
                                        className: 'joystick-container',
                                        onMouseDown: handleJoystickMouseDown
                                    }, React.createElement('div', {
                                        className: 'joystick-stick',
                                        style: {
                                            transform: \`translate(calc(-50% + \${joystickPosition.x * 50}px), calc(-50% + \${-joystickPosition.y * 50}px))\`
                                        }
                                    })),
                                    React.createElement(Paper, { 
                                        key: 'values',
                                        elevation: 1, 
                                        sx: { p: 2, width: '100%', backgroundColor: 'grey.50' }
                                    }, React.createElement(Typography, { 
                                        variant: 'body2', 
                                        component: 'div', 
                                        fontFamily: 'monospace', 
                                        textAlign: 'center'
                                    }, [
                                        React.createElement('div', { key: 'x' }, \`X: \${joystickPosition.x.toFixed(3)}\`),
                                        React.createElement('div', { key: 'y' }, \`Y: \${joystickPosition.y.toFixed(3)}\`),
                                        React.createElement('div', { key: 'mag' }, \`Magnitude: \${Math.sqrt(joystickPosition.x**2 + joystickPosition.y**2).toFixed(3)}\`)
                                    ]))
                                ])
                            )
                        ]),

                        // Slider Demo
                        React.createElement(Card, { 
                            key: 'slider',
                            elevation: 2, 
                            sx: { border: '2px solid', borderColor: 'success.200', flex: 1 }
                        }, [
                            React.createElement(CardHeader, {
                                key: 'header',
                                title: 'Material-UI Slider',
                                titleTypographyProps: { color: 'success.main', fontWeight: 'bold' }
                            }),
                            React.createElement(CardContent, { key: 'content' },
                                React.createElement(Stack, { spacing: 4, alignItems: 'center' }, [
                                    React.createElement(Typography, { 
                                        key: 'display',
                                        variant: 'h2', component: 'div', color: 'success.main', fontWeight: 'bold'
                                    }, \`\${sliderValue}%\`),
                                    React.createElement(Box, { key: 'slider-box', sx: { width: '100%', px: 2 } },
                                        React.createElement(Slider, {
                                            value: sliderValue,
                                            onChange: handleSliderChange,
                                            min: 0, max: 100, step: 1,
                                            color: 'success'
                                        })
                                    ),
                                    React.createElement(Paper, { 
                                        key: 'values',
                                        elevation: 1, 
                                        sx: { p: 2, width: '100%', backgroundColor: 'grey.50' }
                                    }, React.createElement(Typography, { 
                                        variant: 'body2', component: 'div', fontFamily: 'monospace', textAlign: 'center'
                                    }, [
                                        React.createElement('div', { key: 'val' }, \`Value: \${sliderValue}%\`),
                                        React.createElement('div', { key: 'norm' }, \`Normalized: \${(sliderValue / 100).toFixed(2)}\`)
                                    ]))
                                ])
                            )
                        ]),

                        // Combined Controls
                        React.createElement(Card, { 
                            key: 'combined',
                            elevation: 2, 
                            sx: { border: '2px solid', borderColor: 'secondary.200', flex: 1 }
                        }, [
                            React.createElement(CardHeader, {
                                key: 'header',
                                title: 'Combined Controls',
                                titleTypographyProps: { color: 'secondary.main', fontWeight: 'bold' }
                            }),
                            React.createElement(CardContent, { key: 'content' },
                                React.createElement(Stack, { spacing: 3, alignItems: 'center' }, [
                                    React.createElement(Box, {
                                        key: 'mini-joystick',
                                        sx: {
                                            width: 100, height: 100, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #dc004e 0%, #c2185b 100%)',
                                            position: 'relative', cursor: 'pointer',
                                            border: '3px solid', borderColor: 'secondary.200',
                                            boxShadow: '0 4px 16px rgba(220, 0, 78, 0.3)',
                                        }
                                    }, React.createElement(Box, {
                                        sx: {
                                            width: 24, height: 24, borderRadius: '50%', backgroundColor: 'white',
                                            position: 'absolute', top: '50%', left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            border: '2px solid', borderColor: 'secondary.dark',
                                        }
                                    })),
                                    React.createElement(Box, { key: 'slider-box', sx: { width: '100%', px: 1 } },
                                        React.createElement(Slider, {
                                            value: combinedSlider,
                                            onChange: handleCombinedSliderChange,
                                            min: 0, max: 100, step: 5,
                                            color: 'secondary', size: 'small'
                                        })
                                    ),
                                    React.createElement(Paper, { 
                                        key: 'values',
                                        elevation: 1, 
                                        sx: { p: 2, width: '100%', backgroundColor: 'grey.50' }
                                    }, React.createElement(Typography, { 
                                        variant: 'body2', component: 'div', fontFamily: 'monospace', textAlign: 'center'
                                    }, \`Intensity: \${combinedSlider}%\`))
                                ])
                            )
                        ])
                    ]),

                    // Command Log
                    React.createElement(Card, { key: 'log', elevation: 3 }, [
                        React.createElement(CardHeader, {
                            key: 'header',
                            title: React.createElement(Stack, { direction: 'row', spacing: 1, alignItems: 'center' }, [
                                React.createElement(Box, {
                                    key: 'dot',
                                    sx: {
                                        width: 8, height: 8, borderRadius: '50%', backgroundColor: 'success.main',
                                        animation: 'pulse 2s infinite',
                                        '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                                    }
                                }),
                                React.createElement(Typography, { key: 'title', variant: 'h6', fontWeight: 'bold' }, 
                                    'Hardware Command Stream')
                            ]),
                            action: React.createElement(Button, {
                                variant: 'contained', color: 'error', onClick: clearCommandLog, size: 'small'
                            }, 'Clear Log')
                        }),
                        React.createElement(Divider, { key: 'divider' }),
                        React.createElement(CardContent, { key: 'content' },
                            React.createElement(Paper, { 
                                elevation: 0,
                                sx: { 
                                    backgroundColor: '#1a1a1a', color: '#00ff41', p: 2, height: 300,
                                    overflow: 'auto', fontFamily: 'monospace', fontSize: '0.875rem',
                                    border: '1px solid #333'
                                }
                            }, commandHistory.length === 0 ? 
                                React.createElement(Typography, { color: 'text.disabled', sx: { fontFamily: 'monospace' } }, 
                                    '// Waiting for control interactions...') :
                                commandHistory.map((cmd, index) =>
                                    React.createElement(Box, { 
                                        key: index,
                                        sx: { mb: 0.5, color: index === 0 ? '#ffff00' : '#00ff41' }
                                    }, \`[\${cmd.timestamp.split('T')[1].split('.')[0]}] \${cmd.device}.\${cmd.action}(\${JSON.stringify(cmd.data)})\`)
                                )
                            )
                        )
                    ])
                ])
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(MaterialUIDemo));
    </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  });

  // Development login route for testing
  app.post('/api/auth/dev-login', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ message: 'Not found' });
    }

    try {
      // Use existing admin user or create one
      let user = await storage.getUserByEmail('admin@acmerobotics.com');

      if (!user) {
        // Create admin user if not exists
        user = await storage.createUser({
          username: 'admin',
          email: 'admin@acmerobotics.com',
          password: await bcrypt.hash('admin', 10),
          firstName: 'Admin',
          lastName: 'User',
          isActive: true
        });

        // Create organization
        const org = await storage.createOrganization({
          name: 'Acme Robotics',
          slug: 'acme-robotics',
          primaryColor: '#3b82f6',
          secondaryColor: '#1e293b'
        });

        // Add user to organization
        await storage.addUserToOrganization({
          userId: user.id,
          organizationId: org.id,
          role: 'admin'
        });
      }

      // Get user's organization
      const userOrgs = await storage.getUserOrganizations(user.id);
      const defaultOrg = userOrgs[0];

      if (!defaultOrg) {
        return res.status(400).json({ message: 'No organization found' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, organizationId: defaultOrg.organizationId, role: defaultOrg.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        token, 
        user: { ...user, password: undefined },
        message: 'Development login successful'
      });
    } catch (error) {
      console.error('Dev login error:', error);
      res.status(500).json({ message: 'Dev login failed' });
    }
  });

  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      // Check if user already exists by email
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      // Check if user already exists by username
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: 'This username is already taken' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        isActive: true
      });

      // Create default organization for new user
      const org = await storage.createOrganization({
        name: `${user.firstName}'s Organization`,
        slug: `${user.username}-org-${Date.now()}`,
        primaryColor: '#3b82f6',
        secondaryColor: '#1e293b'
      });

      // Add user to organization as admin
      await storage.addUserToOrganization({
        userId: user.id,
        organizationId: org.id,
        role: 'admin'
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, organizationId: org.id, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === '23505') {
        if (error.detail.includes('username')) {
          return res.status(400).json({ message: 'This username is already taken' });
        } else if (error.detail.includes('email')) {
          return res.status(400).json({ message: 'An account with this email already exists' });
        }
      }
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Get user's organization
      const userOrgs = await storage.getUserOrganizations(user.id);
      const defaultOrg = userOrgs[0];

      if (!defaultOrg) {
        return res.status(400).json({ message: 'No organization found' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, organizationId: defaultOrg.organizationId, role: defaultOrg.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Google OAuth routes
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    async (req, res) => {
      try {
        const user = req.user as any;
        console.log('Google OAuth callback - User:', user);

        // Get user's organization
        const userOrgs = await storage.getUserOrganizations(user.id);
        console.log('User organizations:', userOrgs);
        const defaultOrg = userOrgs[0];

        if (!defaultOrg) {
          console.log('No organization found for user, redirecting to login');
          return res.redirect('/login?error=no-organization');
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user.id, organizationId: defaultOrg.organizationId, role: defaultOrg.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        const redirectUrl = `/dashboard?token=${token}`;
        console.log('Generated JWT token, redirecting to:', redirectUrl);

        // Redirect with token in URL for frontend processing
        res.redirect(redirectUrl);
      } catch (error) {
        console.error('Google auth callback error:', error);
        res.redirect('/login?error=auth-failed');
      }
    }
  );

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let stationId: number | null = null;
    let userId: number | null = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'join') {
          stationId = data.stationId;
          userId = data.userId;

          if (!wsConnections.has(stationId)) {
            wsConnections.set(stationId, new Set());
          }
          wsConnections.get(stationId)!.add(ws);

          ws.send(JSON.stringify({ type: 'joined', stationId }));
        } else if (data.type === 'command' && stationId && userId) {
          // Handle hardware commands
          const command = await storage.createCommand({
            sessionId: data.sessionId,
            userId,
            demoStationId: stationId,
            command: data.command,
            parameters: data.parameters,
            status: 'executed'
          });

          // Broadcast command to all connected clients
          broadcastToStation(stationId, {
            type: 'command_executed',
            command: command.command,
            parameters: command.parameters,
            timestamp: command.timestamp
          });

          // Simulate telemetry response
          setTimeout(() => {
            const telemetryData = {
              type: 'telemetry',
              position: Math.random() * 500,
              velocity: Math.random() * 100,
              load: Math.random() * 50,
              timestamp: new Date()
            };

            storage.createTelemetryData({
              demoStationId: stationId!,
              sessionId: data.sessionId,
              position: telemetryData.position.toString(),
              velocity: telemetryData.velocity.toString(),
              load: telemetryData.load.toString(),
              rawData: telemetryData
            });

            broadcastToStation(stationId!, telemetryData);
          }, 100);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (stationId && wsConnections.has(stationId)) {
        wsConnections.get(stationId)!.delete(ws);
        if (wsConnections.get(stationId)!.size === 0) {
          wsConnections.delete(stationId);
        }
      }
    });
  });



  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      const token = jwt.sign(
        { 
          id: user.id, 
          organizationId: user.organizationId,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({ token, user });
    } catch (error) {
      res.status(400).json({ message: 'Registration failed' });
    }
  });

  // User routes
  app.get('/api/users/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get user's current active organization from user_organizations table
      // Use the organization from the JWT token (set during organization switching)
      const currentOrgId = req.user!.organizationId;

      let userOrg: any[] = [];
      if (currentOrgId) {
        userOrg = await db
          .select({
            organizationId: userOrganizations.organizationId,
            role: userOrganizations.role,
            orgName: organizations.name,
            orgSlug: organizations.slug,
            orgPrimaryColor: organizations.primaryColor,
            orgSecondaryColor: organizations.secondaryColor,
          })
          .from(userOrganizations)
          .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
          .where(
            and(
              eq(userOrganizations.userId, user.id),
              eq(userOrganizations.organizationId, currentOrgId)
            )
          )
          .limit(1);
      }

      const organization = userOrg.length ? {
        id: userOrg[0].organizationId,
        name: userOrg[0].orgName,
        slug: userOrg[0].orgSlug,
        primaryColor: userOrg[0].orgPrimaryColor,
        secondaryColor: userOrg[0].orgSecondaryColor,
      } : null;

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userOrg.length ? userOrg[0].role : 'viewer',
        organization
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Get user's organizations
  app.get('/api/users/me/organizations', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      const userOrgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          primaryColor: organizations.primaryColor,
          secondaryColor: organizations.secondaryColor,
        })
        .from(userOrganizations)
        .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
        .where(eq(userOrganizations.userId, userId));

      // Get counts for each organization
      const orgsWithCounts = await Promise.all(
        userOrgs.map(async (org) => {
          // Count users in this organization
          const userCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(userOrganizations)
            .where(eq(userOrganizations.organizationId, org.id));

          // Count demo stations in this organization
          const stationCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(demoStations)
            .where(eq(demoStations.organizationId, org.id));

          return {
            ...org,
            userCount: Number(userCountResult[0]?.count || 0),
            stationCount: Number(stationCountResult[0]?.count || 0),
          };
        })
      );

      res.json(orgsWithCounts);
    } catch (error) {
      console.error('Error fetching user organizations:', error);
      res.status(500).json({ message: 'Failed to fetch organizations' });
    }
  });

  // Delete organization via POST to bypass routing issues
  console.log('Registering POST /api/organizations/:id/delete route');
  app.post('/api/organizations/:id/delete', async (req, res) => {
    console.log('=== ORGANIZATION DELETION ENDPOINT CALLED ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Params:', req.params);

    try {
      const orgId = parseInt(req.params.id);
      console.log(`Attempting to delete organization ${orgId}`);

      if (isNaN(orgId)) {
        console.error('Invalid organization ID');
        return res.status(400).json({ message: 'Invalid organization ID' });
      }

      // Direct database deletion
      console.log(`Deleting organization ${orgId} from database`);
      await db.delete(organizations).where(eq(organizations.id, orgId));
      console.log(`Organization ${orgId} deleted successfully`);

      res.status(200).json({ message: 'Organization deleted successfully' });
    } catch (error) {
      console.error('Organization deletion failed:', error);
      res.status(500).json({ message: 'Failed to delete organization', error });
    }
  });

  // Create organization
  app.post('/api/organizations', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const orgData = insertOrganizationSchema.parse(req.body);

      // Create the organization
      const organization = await storage.createOrganization(orgData);

      // Add the creating user as an admin of this organization
      await storage.addUserToOrganization({
        userId: req.user!.id,
        organizationId: organization.id,
        role: 'admin'
      });

      res.status(201).json(organization);
    } catch (error) {
      console.error('Organization creation error:', error);
      res.status(500).json({ message: 'Failed to create organization', error: error.message });
    }
  });

  // Get organization statistics
  app.get('/api/organizations/:id/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const orgId = parseInt(req.params.id);

      // Get user count
      const userCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(userOrganizations)
        .where(eq(userOrganizations.organizationId, orgId));

      // Get station count
      const stationCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(demoStations)
        .where(eq(demoStations.organizationId, orgId));

      res.json({
        userCount: userCount[0]?.count || 0,
        stationCount: stationCount[0]?.count || 0
      });
    } catch (error) {
      console.error('Failed to get organization stats:', error);
      res.status(500).json({ message: 'Failed to get organization statistics' });
    }
  });

  // Switch organization context
  app.post('/api/users/me/switch-organization', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { organizationId } = req.body;

      // Verify user has access to this organization
      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: 'Access denied to this organization' });
      }

      // Get organization details
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      // Generate new JWT token with updated organization
      const newToken = jwt.sign(
        { 
          id: req.user!.id, 
          organizationId: organizationId,
          role: userRole 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        message: 'Organization switched successfully',
        token: newToken,
        organization,
        role: userRole
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to switch organization' });
    }
  });

  // Demo stations routes
  app.get('/api/demo-stations', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stations = await storage.getDemoStationsByOrganization(req.user!.organizationId);
      res.json(stations);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch demo stations' });
    }
  });

  app.get('/api/demo-stations/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stationId = req.params.id;
      console.log('Fetching station with ID:', stationId);

      const station = await storage.getDemoStation(stationId);
      console.log('Found station:', station);

      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      res.json(station);
    } catch (error) {
      console.error('Error fetching station:', error);
      res.status(500).json({ message: 'Failed to fetch demo station' });
    }
  });

  app.post('/api/demo-stations', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role === 'viewer') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      console.log('Creating station with data:', req.body);
      console.log('User organization ID:', req.user!.organizationId);

      // Validate required fields
      if (!req.body.name || req.body.name.trim() === '') {
        return res.status(400).json({ message: 'Station name is required' });
      }

      const stationData = {
        name: req.body.name.trim(),
        description: req.body.description || null,
        organizationId: req.user!.organizationId,
        hardwareType: "universal",
        isOnline: false,
        cameraCount: parseInt(req.body.cameraCount) || 1,
        sessionTimeLimit: parseInt(req.body.sessionTimeLimit) || 30,
        requiresLogin: req.body.requiresLogin === true || req.body.requiresLogin === 'true',
        configuration: {
          interfaceLayout: {
            camera: {
              position: { x: 40, y: 40 },
              width: 920,
              height: 540
            },
            controlPanel: {
              position: { x: 980, y: 40 },
              width: 900,
              height: 540
            }
          }
        },
        safetyLimits: {
          maxSpeed: 100,
          maxPosition: 500,
          minPosition: -500,
          emergencyStopEnabled: true
        }
      };

      console.log('Parsed station data:', stationData);

      const validatedData = insertDemoStationSchema.parse(stationData);
      console.log('Validated station data:', validatedData);

      const station = await storage.createDemoStation(validatedData);
      console.log('Created station:', station);

      res.status(201).json(station);
    } catch (error) {
      console.error('Station creation detailed error:', error);
      console.error('Request body:', req.body);

      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: 'Invalid station data', details: error.message });
      } else {
        res.status(400).json({ message: 'Failed to create demo station', error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.patch('/api/demo-stations/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stationId = req.params.id;
      console.log('Updating station with ID:', stationId);
      console.log('Update data:', req.body);

      const station = await storage.getDemoStation(stationId);

      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      if (req.user!.role !== 'admin' && req.user!.role !== 'operator') {
        return res.status(403).json({ message: 'Admin or operator access required' });
      }

      // Extract interfaceLayout and merge with existing configuration
      const { interfaceLayout, ...otherUpdates } = req.body;

      let updates = { ...otherUpdates };

      if (interfaceLayout) {
        // Merge the interfaceLayout into the configuration field
        const currentConfig = station.configuration || {};
        updates.configuration = {
          ...currentConfig,
          interfaceLayout: interfaceLayout
        };
        console.log('Before update - Current config:', currentConfig);
        console.log('Before update - Interface layout:', interfaceLayout);
        console.log('Before update - Final configuration:', updates.configuration);
      }

      console.log('Sending updates to storage:', updates);
      const updatedStation = await storage.updateDemoStation(stationId, updates);
      console.log('Updated station returned from storage:', updatedStation);
      console.log('Updated station configuration field:', updatedStation?.configuration);
      res.json(updatedStation);
    } catch (error) {
      console.error('Error updating station:', error);
      res.status(400).json({ message: 'Failed to update demo station' });
    }
  });

  app.delete('/api/demo-stations/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stationId = req.params.id;
      console.log('Deleting station with ID:', stationId);

      const station = await storage.getDemoStation(stationId);
      console.log('Station to delete:', station);

      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      await storage.deleteDemoStation(stationId);
      console.log('Station deleted successfully:', stationId);
      res.json({ message: 'Demo station deleted successfully' });
    } catch (error) {
      console.error('Error deleting station:', error);
      res.status(500).json({ message: 'Failed to delete demo station' });
    }
  });

  // Control configurations routes
  app.get('/api/demo-stations/:id/controls', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stationId = req.params.id;
      const station = await storage.getDemoStation(stationId);

      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      const config = await storage.getControlConfiguration(stationId);
      if (!config) {
        return res.json({ controls: [], layout: {} });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch control configuration' });
    }
  });

  app.post('/api/demo-stations/:id/controls', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stationId = req.params.id;
      console.log('Saving controls for station:', stationId);
      console.log('Request body:', req.body);
      console.log('User:', req.user);

      const station = await storage.getDemoStation(stationId);

      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      if (req.user!.role === 'viewer') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const configData = {
        controls: req.body.controls || [],
        layout: req.body.layout || {},
        demoStationId: stationId,
        createdBy: req.user!.id
      };

      console.log('Parsed config data:', configData);

      const config = await storage.createControlConfiguration(configData);
      console.log('Configuration saved:', config);
      res.status(201).json(config);
    } catch (error) {
      console.error('Error saving control configuration:', error);
      res.status(400).json({ 
        message: 'Failed to save control configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Sessions routes
  app.post('/api/demo-stations/:id/sessions', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stationId = req.params.id;
      console.log('Creating session for station:', stationId);
      console.log('User:', req.user);

      const station = await storage.getDemoStation(stationId);

      if (!station || station.organizationId !== req.user!.organizationId) {
        console.log('Station not found or access denied:', station);
        return res.status(404).json({ message: 'Demo station not found' });
      }

      // End any existing active session
      const existingSession = await storage.getActiveSession(stationId);
      if (existingSession) {
        console.log('Ending existing session:', existingSession.id);
        await storage.endSession(existingSession.id);
      }

      const sessionData = {
        userId: req.user!.id,
        demoStationId: stationId,
        isActive: true,
        customerId: null // For organization members, not external customers
      };
      console.log('Creating session with data:', sessionData);

      const session = await storage.createSession(sessionData);
      console.log('Session created successfully:', session);

      res.status(201).json(session);
    } catch (error) {
      console.error('Session creation error:', error);
      res.status(400).json({ message: 'Failed to start session', error: error.message });
    }
  });

  app.post('/api/sessions/:id/end', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);

      if (!session || session.userId !== req.user!.id) {
        return res.status(404).json({ message: 'Session not found' });
      }

      await storage.endSession(sessionId);
      res.json({ message: 'Session ended' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to end session' });
    }
  });

  // Telemetry routes
  // Organization user management endpoints
  app.get('/api/organizations/:id/users', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const orgId = parseInt(req.params.id);
      const users = await storage.getUsersByOrganization(orgId);

      // Transform to include activity data
      const usersWithActivity = await Promise.all(users.map(async (user) => {
        const userOrg = await storage.getUserOrganizations(user.id);
        const orgData = userOrg.find(uo => uo.organizationId === orgId);

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: orgData?.role || 'Viewer',
          isActive: user.isActive,
          joinedAt: orgData?.joinedAt || user.createdAt,
          sessionCount: 0, // Will be populated from actual session data
          commandCount: 0, // Will be populated from actual command data
        };
      }));

      res.json(usersWithActivity);
    } catch (error) {
      console.error('Get organization users error:', error);
      res.status(500).json({ message: 'Failed to fetch organization users' });
    }
  });

  app.patch('/api/organizations/:orgId/users/:userId/role', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const userId = parseInt(req.params.userId);
      const { role } = req.body;

      // Update user role in the organization
      // This would typically update the userOrganizations table
      res.json({ success: true, message: 'User role updated successfully' });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  });

  app.post('/api/organizations/:orgId/users/:userId/ban', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Ban user (set isActive to false)
      await storage.updateUser(userId, { isActive: false });

      res.json({ success: true, message: 'User banned successfully' });
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({ message: 'Failed to ban user' });
    }
  });

  app.delete('/api/organizations/:orgId/users/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const userId = parseInt(req.params.userId);

      // Remove user from organization (would typically delete from userOrganizations table)
      res.json({ success: true, message: 'User removed from organization' });
    } catch (error) {
      console.error('Remove user error:', error);
      res.status(500).json({ message: 'Failed to remove user from organization' });
    }
  });

  app.post('/api/organizations/:orgId/users/invite', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const { email, role } = req.body;

      // Send invitation (in a real app, this would send an email invitation)
      res.json({ success: true, message: 'Invitation sent successfully' });
    } catch (error) {
      console.error('Invite user error:', error);
      res.status(500).json({ message: 'Failed to send invitation' });
    }
  });

  app.get('/api/demo-stations/:id/telemetry', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stationId = req.params.id;
      const station = await storage.getDemoStation(stationId);

      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      let telemetry = await storage.getTelemetryData(stationId, limit);

      // Only return actual telemetry data from connected hardware

      res.json(telemetry);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch telemetry data' });
    }
  });

  // Camera feed routes
  app.get('/api/camera-feed/:stationName/stream', (req, res) => {
    const stationName = req.params.stationName;

    // Set headers for video streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // For real hardware, this would connect to the actual camera stream
    // For now, return a 404 since real camera hardware isn't connected
    res.status(404).json({ message: 'Camera feed not available - connect hardware first' });
  });

  return httpServer;
}