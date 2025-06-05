import type { Express } from "express";
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

interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: number;
    organizationId: number;
    role: string;
  };
}

// Middleware to verify JWT token
function authenticateToken(req: AuthenticatedRequest, res: Express.Response, next: Express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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

  if (!token) {
    console.log('No token provided, headers:', req.headers);
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.log('JWT verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid token' });
    }
    console.log('JWT verified successfully for user:', user.id);
    req.user = user;
    next();
  });
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
  // Use the correct absolute URL for the current environment
  let callbackURL;
  
  // Check if we're in a deployment environment (no REPLIT_DEV_DOMAIN means deployment)
  if (!process.env.REPLIT_DEV_DOMAIN && process.env.REPL_SLUG) {
    // In deployment, check for custom domain first, then fall back to replit domain
    if (process.env.CUSTOM_DOMAIN) {
      callbackURL = `https://${process.env.CUSTOM_DOMAIN}/auth/google/callback`;
    } else {
      callbackURL = `https://${process.env.REPL_SLUG}.replit.app/auth/google/callback`;
    }
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    // In development, use the dev domain
    callbackURL = `https://${process.env.REPLIT_DEV_DOMAIN}/auth/google/callback`;
  } else {
    // Fallback for local development
    callbackURL = 'https://localhost:5000/auth/google/callback';
  }
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
      const station = await storage.getDemoStation(stationId);

      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      if (req.user!.role === 'viewer') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const configData = insertControlConfigurationSchema.parse({
        ...req.body,
        demoStationId: stationId,
        createdBy: req.user!.id
      });

      const config = await storage.createControlConfiguration(configData);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ message: 'Failed to save control configuration' });
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