import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, generateStationId } from "./storage";
import { db } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
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

  // Delete organization - moved before other routes to ensure proper registration
  app.delete('/api/organizations/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    console.log('=== ORGANIZATION DELETION ENDPOINT CALLED ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Params:', req.params);
    console.log('User:', req.user);
    
    try {
      const orgId = parseInt(req.params.id);
      console.log(`Parsing org ID: ${orgId}`);
      
      if (isNaN(orgId)) {
        console.error('Invalid organization ID');
        return res.status(400).json({ message: 'Invalid organization ID' });
      }
      
      console.log(`Calling storage.deleteOrganization(${orgId})`);
      await storage.deleteOrganization(orgId);
      console.log(`Organization ${orgId} deleted successfully`);
      
      res.status(200).json({ message: 'Organization deleted successfully' });
    } catch (error) {
      console.error('Organization deletion failed:', error);
      res.status(500).json({ message: 'Failed to delete organization', error: error.message });
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
        configuration: {},
        safetyLimits: {}
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

      const updatedStation = await storage.updateDemoStation(stationId, req.body);
      console.log('Updated station:', updatedStation);
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