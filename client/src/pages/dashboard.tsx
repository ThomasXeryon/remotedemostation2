import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Circle, AlertTriangle, Edit, Play, Square, Plus } from 'lucide-react';

import { VideoFeed } from '@/components/video-feed';
import { ControlPanel } from '@/components/control-panel';
import { TelemetrySection } from '@/components/telemetry-section';
import { CreateStationModal } from '@/components/create-station-modal';
import { ControlBuilderModal } from '@/components/control-builder-modal';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, logout, refreshUserData } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import type { DemoStation, Session, ControlConfiguration } from '@shared/schema';
import { useLocation } from 'wouter';

interface User {
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

interface TelemetryData {
  id: number;
  timestamp: Date;
  position?: number;
  velocity?: number;
  load?: number;
  temperature?: number;
  data?: Record<string, any>;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedStation, setSelectedStation] = useState<DemoStation | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [controlConfig, setControlConfig] = useState<ControlConfiguration | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [isControlBuilderOpen, setIsControlBuilderOpen] = useState(false);
  const [isCreateStationOpen, setIsCreateStationOpen] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [targetPosition, setTargetPosition] = useState(0);
  const [safetyLimits] = useState({ min: -100, max: 100 });

  const { toast } = useToast();

  // Query for user data that gets refreshed when organization changes
  const { data: userData, error: userError } = useQuery({
    queryKey: ['/api/users/me'],
  });

  // Demo stations query
  const { data: demoStations = [], isLoading: isDemoStationsLoading, error: stationsError } = useQuery<DemoStation[]>({
    queryKey: ['/api/demo-stations'],
  });

  // Debug logging and error handling
  useEffect(() => {
    console.log('Dashboard - userData:', userData);
    console.log('Dashboard - userError:', userError);
    console.log('Dashboard - demoStations:', demoStations);
    console.log('Dashboard - stationsError:', stationsError);
    console.log('Dashboard - currentUser:', currentUser);
    
    // Handle errors gracefully
    if (userError) {
      console.error('User data error:', userError);
    }
    if (stationsError) {
      console.error('Stations data error:', stationsError);
    }
  }, [userData, userError, demoStations, stationsError, currentUser]);

  // Update current user when userData changes
  useEffect(() => {
    if (userData) {
      setCurrentUser(userData as User);
    }
  }, [userData]);

  // Listen for organization changes
  useEffect(() => {
    const handleOrganizationChanged = async () => {
      // Refresh user data from localStorage and API
      const updatedUser = await refreshUserData();
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
      // Clear and refetch all queries
      queryClient.clear();
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/users/me'] });
        queryClient.refetchQueries({ queryKey: ['/api/demo-stations'] });
      }, 100);
    };

    window.addEventListener('organizationChanged', handleOrganizationChanged);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChanged);
    };
  }, [queryClient]);

  // Load user data
  useEffect(() => {
    if (currentUser && Array.isArray(demoStations) && demoStations.length > 0) {
      if (!selectedStation) {
        setSelectedStation(demoStations[0]);
      }
    }
  }, [currentUser, demoStations, selectedStation]);

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStation) throw new Error('No station selected');
      return apiRequest(`/api/demo-stations/${selectedStation.id}/sessions`, {
        method: 'POST',
      });
    },
    onSuccess: (session) => {
      setCurrentSession(session);
      toast({ title: 'Session started successfully' });
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async () => {
      if (!currentSession) throw new Error('No active session');
      return apiRequest(`/api/sessions/${currentSession.id}/end`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      setCurrentSession(null);
      toast({ title: 'Session ended successfully' });
    },
  });

  // Control configuration query
  useEffect(() => {
    if (selectedStation) {
      console.log('Loading controls for station:', selectedStation.id);
      apiRequest(`/api/demo-stations/${selectedStation.id}/controls`, {
        method: 'GET',
      })
        .then((config) => {
          console.log('Loaded control config:', config);
          setControlConfig(config);
        })
        .catch((error) => {
          console.error('Failed to load controls:', error);
          setControlConfig(null);
        });
    }
  }, [selectedStation]);

  // Generate mock telemetry data
  useEffect(() => {
    if (selectedStation && currentSession) {
      const interval = setInterval(() => {
        const newTelemetryData: TelemetryData = {
          id: Date.now(),
          timestamp: new Date(),
          position: Math.random() * 100 - 50,
          velocity: Math.random() * 20 - 10,
          load: Math.random() * 100,
          temperature: 20 + Math.random() * 10,
          data: {
            voltage: 12 + Math.random() * 2,
            current: Math.random() * 5,
          }
        };

        setTelemetryData(prev => [...prev.slice(-99), newTelemetryData]);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedStation, currentSession]);

  // WebSocket connection
  const { isConnected, connectionStats } = useWebSocket(
    selectedStation?.id || 0,
    currentUser?.id || 0,
    currentSession?.id
  );

  // Send command function
  const sendCommand = async (command: string, parameters?: Record<string, any>) => {
    if (!currentSession || !selectedStation) {
      toast({ title: 'No active session', variant: 'destructive' });
      return;
    }

    try {
      await apiRequest('/api/commands', {
        method: 'POST',
        body: JSON.stringify({
          command,
          parameters,
          sessionId: currentSession.id,
          stationId: selectedStation.id,
        }),
      });

      toast({ title: `Command sent: ${command}` });
    } catch (error) {
      toast({ title: 'Failed to send command', variant: 'destructive' });
    }
  };

  // Save controls function
  const handleSaveControls = async (controls: any[]) => {
    if (!selectedStation) {
      console.error('No station selected for saving controls');
      return;
    }

    console.log('Saving controls for station:', selectedStation.id);
    console.log('Controls to save:', controls);

    try {
      const response = await apiRequest(`/api/demo-stations/${selectedStation.id}/controls`, {
        method: 'POST',
        body: JSON.stringify({ 
          controls,
          layout: {} // Add required layout field
        }),
      });

      console.log('Controls saved successfully:', response);
      setControlConfig({ controls } as any);
      setIsControlBuilderOpen(false);
      toast({ title: 'Controls saved successfully' });
    } catch (error) {
      console.error('Failed to save controls:', error);
      toast({ 
        title: 'Failed to save controls', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    }
  };

  const handleStationSelect = (station: DemoStation) => {
    setSelectedStation(station);
    setCurrentSession(null);
    setTelemetryData([]);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/login');
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleEmergencyStop = () => {
    sendCommand('EMERGENCY_STOP');
  };

  const formatSessionTime = (session: Session | null) => {
    if (!session || !session.startTime) return '00:00:00';
    const start = new Date(session.startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle errors first
  if (userError) {
    console.error('Dashboard error:', userError);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Unable to load user data</h2>
          <p className="text-muted-foreground mb-4">Please try refreshing the page.</p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    );
  }

  if (stationsError) {
    console.error('Dashboard error:', stationsError);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Unable to load stations</h2>
          <p className="text-muted-foreground mb-4">Please try refreshing the page.</p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!currentUser && !userData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Loading user data...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {selectedStation?.name || 'Select a Demo Station'}
              </h1>
              <p className="text-sm text-slate-600 mt-1 flex items-center space-x-2">
                <Circle 
                  className={`w-2 h-2 ${isConnected ? 'text-green-500 animate-pulse' : 'text-red-500'}`} 
                  fill="currentColor" 
                />
                <span>
                  {isConnected ? 'Connected' : 'Disconnected'} • 
                  Last update: {connectionStats.lastHeartbeat 
                    ? `${Math.floor((Date.now() - connectionStats.lastHeartbeat.getTime()) / 1000)}s ago`
                    : 'Never'
                  }
                </span>
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Session Timer */}
              <div className="text-sm text-slate-600">
                <span className="mr-2">⏱️</span>
                Session: <span className="font-mono">{formatSessionTime(currentSession)}</span>
              </div>

              {/* Emergency Stop */}
              <Button 
                variant="destructive" 
                onClick={handleEmergencyStop}
                disabled={!selectedStation}
                className="flex items-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                EMERGENCY STOP
              </Button>

              {/* Control Builder Toggle */}
              {(currentUser as any)?.role !== 'viewer' && (
                <Button 
                  onClick={() => setIsControlBuilderOpen(true)}
                  disabled={!selectedStation}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Customize Controls
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {selectedStation ? (
            <div className="grid grid-cols-12 gap-6 h-full">
              {/* Video Feed */}
              <div className="col-span-8 space-y-6">
                <VideoFeed 
                  stationName={selectedStation.name}
                  telemetry={telemetryData[telemetryData.length - 1] || null}
                  isRecording={!!currentSession}
                />

                {/* Control Panel */}
                <ControlPanel
                  onCommand={sendCommand}
                  speed={speed}
                  targetPosition={targetPosition}
                  safetyLimits={safetyLimits}
                  onSpeedChange={setSpeed}
                  onTargetPositionChange={setTargetPosition}
                />
              </div>

              {/* Telemetry & Session Controls */}
              <div className="col-span-4 space-y-6">
                {/* Session Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>Session Control</span>
                      <Badge variant={currentSession ? 'default' : 'secondary'}>
                        {currentSession ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!currentSession ? (
                      <Button 
                        onClick={() => startSessionMutation.mutate()}
                        disabled={startSessionMutation.isPending || !selectedStation}
                        className="w-full"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Session
                      </Button>
                    ) : (
                      <Button 
                        variant="destructive"
                        onClick={() => endSessionMutation.mutate()}
                        disabled={endSessionMutation.isPending}
                        className="w-full"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        End Session
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Telemetry */}
                <TelemetrySection
                  telemetryData={telemetryData}
                  connectionStats={connectionStats}
                  isConnected={isConnected}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">No Demo Station Selected</h2>
                <p className="text-slate-600">Select a demo station from the sidebar to begin.</p>
              </div>
            </div>
          )}
        </main>

        {/* Create Station Modal */}
        <CreateStationModal
          isOpen={isCreateStationOpen}
          onClose={() => setIsCreateStationOpen(false)}
        />

        {/* Control Builder Modal */}
        {selectedStation && (
          <ControlBuilderModal
            isOpen={isControlBuilderOpen}
            onClose={() => setIsControlBuilderOpen(false)}
            controls={Array.isArray(controlConfig?.controls) ? controlConfig.controls : []}
            onSaveControls={handleSaveControls}
          />
        )}
      </div>
  );
}