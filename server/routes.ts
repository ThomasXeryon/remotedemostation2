import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertOrganizationSchema, insertDemoStationSchema, insertControlConfigurationSchema, userOrganizations, organizations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Get user's organization from the user_organizations table
      const userOrg = await db
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
        .where(eq(userOrganizations.userId, user.id))
        .limit(1);

      if (!userOrg.length) {
        return res.status(401).json({ message: 'No organization access' });
      }

      const organization = {
        id: userOrg[0].organizationId,
        name: userOrg[0].orgName,
        slug: userOrg[0].orgSlug,
        primaryColor: userOrg[0].orgPrimaryColor,
        secondaryColor: userOrg[0].orgSecondaryColor,
      };
      
      const token = jwt.sign(
        { 
          id: user.id, 
          organizationId: userOrg[0].organizationId,
          role: userOrg[0].role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: userOrg[0].role,
          organization
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Login failed' });
    }
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
          .where(eq(userOrganizations.userId, user.id))
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
      const userOrgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          primaryColor: organizations.primaryColor,
          secondaryColor: organizations.secondaryColor,
          role: userOrganizations.role,
        })
        .from(userOrganizations)
        .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
        .where(eq(userOrganizations.userId, req.user!.id));

      res.json(userOrgs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get organizations' });
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

      res.json({ 
        message: 'Organization switched successfully',
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
      const stationId = parseInt(req.params.id);
      const station = await storage.getDemoStation(stationId);
      
      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      res.json(station);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch demo station' });
    }
  });

  app.post('/api/demo-stations', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const stationData = insertDemoStationSchema.parse({
        ...req.body,
        organizationId: req.user!.organizationId
      });
      
      const station = await storage.createDemoStation(stationData);
      res.status(201).json(station);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create demo station' });
    }
  });

  // Control configurations routes
  app.get('/api/demo-stations/:id/controls', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const station = await storage.getDemoStation(stationId);
      
      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      const config = await storage.getControlConfiguration(stationId);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch control configuration' });
    }
  });

  app.post('/api/demo-stations/:id/controls', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stationId = parseInt(req.params.id);
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
      const stationId = parseInt(req.params.id);
      const station = await storage.getDemoStation(stationId);
      
      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      // End any existing active session
      const existingSession = await storage.getActiveSession(stationId);
      if (existingSession) {
        await storage.endSession(existingSession.id);
      }

      const session = await storage.createSession({
        userId: req.user!.id,
        demoStationId: stationId,
        isActive: true
      });

      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({ message: 'Failed to start session' });
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
  app.get('/api/demo-stations/:id/telemetry', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const station = await storage.getDemoStation(stationId);
      
      if (!station || station.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: 'Demo station not found' });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const telemetry = await storage.getTelemetryData(stationId, limit);
      res.json(telemetry);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch telemetry data' });
    }
  });

  return httpServer;
}
