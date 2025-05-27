import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Circle, AlertTriangle, Edit } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { VideoFeed } from '@/components/video-feed';
import { ControlPanel } from '@/components/control-panel';
import { TelemetrySection } from '@/components/telemetry-section';
import { ControlBuilderModal } from '@/components/control-builder-modal';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, refreshUserData } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import type { DemoStation, Session, TelemetryData, ControlConfiguration } from '@shared/schema';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organization: {
    id: number;
    name: string;
    slug: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

export default function Dashboard() {
  const [selectedStation, setSelectedStation] = useState<DemoStation | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryData[]>([]);
  const [isControlBuilderOpen, setIsControlBuilderOpen] = useState(false);
  const [controlConfig, setControlConfig] = useState<ControlConfiguration | null>(null);
  const [user, setUser] = useState<User | null>(getCurrentUser() as User | null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // WebSocket connection
  const { isConnected, connectionStats, sendCommand } = useWebSocket(
    selectedStation?.id || 0,
    user?.id || 0,
    currentSession?.id
  );

  // Fetch user organizations
  const { data: userOrganizations = [] } = useQuery({
    queryKey: ['/api/users/me/organizations'],
    enabled: !!user
  });

  // Fetch demo stations
  const { data: demoStations = [] } = useQuery({
    queryKey: ['/api/demo-stations'],
    enabled: !!user
  });

  // Fetch control configuration for selected station
  const { data: stationControls } = useQuery({
    queryKey: ['/api/demo-stations', selectedStation?.id, 'controls'],
    enabled: !!selectedStation
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (stationId: number) => {
      return apiRequest(`/api/demo-stations/${stationId}/sessions`, {
        method: 'POST'
      });
    },
    onSuccess: (session) => {
      setCurrentSession(session);
      toast({
        title: "Session Started",
        description: "Control session has been initiated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Session Error",
        description: "Failed to start control session.",
        variant: "destructive"
      });
    }
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return apiRequest(`/api/sessions/${sessionId}/end`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      setCurrentSession(null);
      toast({
        title: "Session Ended",
        description: "Control session has been terminated."
      });
    }
  });

  // Save controls mutation
  const saveControlsMutation = useMutation({
    mutationFn: async (controls: ControlWidget[]) => {
      if (!selectedStation) throw new Error('No station selected');
      return apiRequest(`/api/demo-stations/${selectedStation.id}/controls`, {
        method: 'POST',
        body: JSON.stringify({ controls })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo-stations', selectedStation?.id, 'controls'] });
      toast({
        title: "Controls Saved",
        description: "Control configuration has been updated successfully."
      });
    }
  });

  useEffect(() => {
    if (stationControls) {
      setControlConfig(stationControls);
    }
  }, [stationControls]);

  const handleLogout = () => {
    // Logout handled by auth system
    window.location.href = '/login';
  };

  const handleStationSelect = (station: DemoStation) => {
    setSelectedStation(station);
    setCurrentSession(null);
    setTelemetryHistory([]);
    
    // Start session automatically
    createSessionMutation.mutate(station.id);
    
    // Simulate telemetry data
    const interval = setInterval(() => {
      const newTelemetryData: TelemetryData = {
        id: Date.now(),
        demoStationId: station.id,
        timestamp: new Date(),
        data: {
          temperature: 20 + Math.random() * 10,
          humidity: 40 + Math.random() * 20,
          pressure: 1000 + Math.random() * 50,
          vibration: Math.random() * 5,
          position: {
            x: Math.random() * 100,
            y: Math.random() * 100,
            z: Math.random() * 100
          }
        }
      };
      
      setTelemetryHistory(prev => [newTelemetryData, ...prev.slice(0, 99)]);
    }, 1000);

    return () => clearInterval(interval);
  };

  const handleCommand = (command: string, parameters?: Record<string, any>) => {
    if (!selectedStation || !currentSession) return;
    
    sendCommand({
      command,
      parameters: parameters || {},
      sessionId: currentSession.id,
      stationId: selectedStation.id
    });
    
    toast({
      title: "Command Sent",
      description: `Executed: ${command}`,
      duration: 2000
    });
  };

  const handleEmergencyStop = () => {
    handleCommand('EMERGENCY_STOP');
    if (currentSession) {
      endSessionMutation.mutate(currentSession.id);
    }
  };

  const handleSaveControls = (controls: ControlWidget[]) => {
    saveControlsMutation.mutate(controls);
    setIsControlBuilderOpen(false);
  };

  // Auto-select organization if there's only one
  useEffect(() => {
    const autoSelectOrganization = async () => {
      if (userOrganizations && userOrganizations.length === 1 && user && !user.organization) {
        try {
          await apiRequest('/api/users/me/switch-organization', {
            method: 'POST',
            body: JSON.stringify({ organizationId: userOrganizations[0].organization.id })
          });
          
          // Refresh user data
          const response = await apiRequest('/api/users/me');
          setUser(response);
          
          toast({
            title: "Organization Selected",
            description: `Switched to ${userOrganizations[0].organization.name}`,
            duration: 3000
          });
        } catch (error) {
          console.error('Failed to auto-select organization:', error);
        }
      }
    };

    autoSelectOrganization();
  }, [userOrganizations, user]);

  // Auto-select first station if none selected
  useEffect(() => {
    if (demoStations.length > 0 && !selectedStation) {
      handleStationSelect(demoStations[0]);
    }
  }, [demoStations, selectedStation]);

  if (!user) {
    return null; // Will redirect to login via auth check
  }

  const formatSessionTime = (session: Session | null) => {
    if (!session || !session.startTime) return '0:00';
    
    const elapsed = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar
        user={user}
        demoStations={demoStations}
        activeDemoStation={selectedStation}
        onLogout={handleLogout}
        onStationSelect={handleStationSelect}
      />

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
              {user.role !== 'viewer' && (
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
              {/* Video Feed Section */}
              <div className="col-span-8">
                <VideoFeed
                  stationName={selectedStation.name}
                  telemetry={telemetryHistory[0] || null}
                  isRecording={isConnected}
                />
              </div>

              {/* Control Panel */}
              <div className="col-span-4 space-y-6">
                <ControlPanel
                  onCommand={handleCommand}
                  speed={50}
                  targetPosition={0}
                  safetyLimits={{ min: -100, max: 100 }}
                  onSpeedChange={(speed) => handleCommand('SET_SPEED', { speed })}
                  onTargetPositionChange={(position) => handleCommand('MOVE_TO', { position })}
                />

                <TelemetrySection
                  telemetryData={telemetryHistory}
                  connectionStats={connectionStats}
                  isConnected={isConnected}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">No Demo Station Selected</h2>
                <p className="text-slate-600">
                  Please select a demo station from the sidebar to begin your control session.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Control Builder Modal */}
      {/* <ControlBuilderModal
        isOpen={isControlBuilderOpen}
        onClose={() => setIsControlBuilderOpen(false)}
        controls={controlConfig?.controls || []}
        onSaveControls={handleSaveControls}
      /> */}
    </div>
  );
}