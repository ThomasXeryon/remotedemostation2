export interface ControlWidget {
  id: string;
  type: 'button' | 'slider' | 'joystick' | 'toggle' | 'input';
  name: string;
  command: string;
  parameters?: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: {
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: any;
    style?: Record<string, any>;
  };
}

export interface TelemetryData {
  timestamp: Date;
  position?: number;
  velocity?: number;
  load?: number;
  temperature?: number;
  [key: string]: any;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'operator' | 'viewer';
  organization: {
    id: number;
    name: string;
    slug: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

export interface DemoStation {
  id: string;
  name: string;
  description?: string;
  isOnline: boolean;
  hardwareType: string;
  lastHeartbeat?: Date;
  configuration: Record<string, any>;
  safetyLimits: Record<string, any>;
}

export interface Session {
  id: number;
  userId: number;
  demoStationId: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  isActive: boolean;
}

export interface WebSocketMessage {
  type: 'join' | 'command' | 'telemetry' | 'command_executed' | 'joined' | 'ping' | 'pong';
  stationId?: string | number;
  userId?: number;
  sessionId?: number;
  command?: string;
  parameters?: Record<string, any>;
  position?: number;
  velocity?: number;
  load?: number;
  timestamp?: number;
}
