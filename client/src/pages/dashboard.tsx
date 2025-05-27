import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Edit, Circle } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { VideoFeed } from '@/components/video-feed';
import { ControlPanel } from '@/components/control-panel';
import { TelemetrySection } from '@/components/telemetry-section';
import { ControlBuilderModal } from '@/components/control-builder-modal';
import { useWebSocket } from '@/hooks/use-websocket';
import { getCurrentUser, logout } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { User, DemoStation, ControlWidget, TelemetryData, Session } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser() as User;
  
  const [selectedStation, setSelectedStation] = useState<DemoStation | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isControlBuilderOpen, setIsControlBuilderOpen] = useState(false);
  const [speed, setSpeed] = useState(25);
  const [targetPosition, setTargetPosition] = useState(142.5);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryData[]>([]);

  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    lastMessage, 
    connectionStats, 
    sendCommand 
  } = useWebSocket(
    selectedStation?.id || 0, 
    user?.id || 0, 
    currentSession?.id
  );

  // Fetch demo stations
  const { data: demoStations = [] } = useQuery({
    queryKey: ['/api/demo-stations'],
    enabled: !!user,
  });

  // Fetch control configuration for selected station
  const { data: controlConfig } = useQuery({
    queryKey: ['/api/demo-stations', selectedStation?.id, 'controls'],
    enabled: !!selectedStation,
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (stationId: number) => {
      const response = await apiRequest('POST', `/api/demo-stations/${stationId}/sessions`);
      return response.json();
    },
    onSuccess: (session) => {
      setCurrentSession(session);
      toast({
        title: "Session started",
        description: "You can now control the demo station",
      });
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/end`);
      return response.json();
    },
    onSuccess: () => {
      setCurrentSession(null);
      toast({
        title: "Session ended",
        description: "Control session has been terminated",
      });
    },
  });

  // Save control configuration mutation
  const saveControlsMutation = useMutation({
    mutationFn: async (controls: ControlWidget[]) => {
      if (!selectedStation) throw new Error('No station selected');
      
      const response = await apiRequest('POST', `/api/demo-stations/${selectedStation.id}/controls`, {
        controls,
        layout: { version: 1 }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/demo-stations', selectedStation?.id, 'controls']
      });
      toast({
        title: "Controls saved",
        description: "Control configuration has been updated",
      });
    },
  });

  // Handle station selection
  const handleStationSelect = (station: DemoStation) => {
    setSelectedStation(station);
    if (currentSession) {
      endSessionMutation.mutate(currentSession.id);
    }
    startSessionMutation.mutate(station.id);
  };

  // Handle logout
  const handleLogout = () => {
    if (currentSession) {
      endSessionMutation.mutate(currentSession.id);
    }
    logout();
    window.location.href = '/login';
  };

  // Handle emergency stop
  const handleEmergencyStop = () => {
    sendCommand('emergency_stop');
    toast({
      title: "EMERGENCY STOP ACTIVATED",
      description: "All motion has been stopped immediately",
      variant: "destructive",
    });
  };

  // Handle control commands
  const handleCommand = (command: string, parameters?: Record<string, any>) => {
    sendCommand(command, parameters);
  };

  // Handle control builder save
  const handleSaveControls = (controls: ControlWidget[]) => {
    saveControlsMutation.mutate(controls);
    setIsControlBuilderOpen(false);
  };

  // Process WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'telemetry') {
      const newTelemetryData: TelemetryData = {
        timestamp: new Date(lastMessage.timestamp!),
        position: lastMessage.position,
        velocity: lastMessage.velocity,
        load: lastMessage.load,
      };
      
      setTelemetryHistory(prev => [newTelemetryData, ...prev.slice(0, 99)]);
    }
  }, [lastMessage]);

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
                disabled={!isConnected}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
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

              {/* Control Panel Section */}
              <div className="col-span-4">
                <ControlPanel
                  onCommand={handleCommand}
                  speed={speed}
                  targetPosition={targetPosition}
                  safetyLimits={selectedStation.safetyLimits as any || { min: 0, max: 500 }}
                  onSpeedChange={setSpeed}
                  onTargetPositionChange={setTargetPosition}
                />
              </div>

              {/* Telemetry Section */}
              <div className="col-span-12 mt-6">
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
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  No Demo Station Selected
                </h2>
                <p className="text-slate-600">
                  Select a demo station from the sidebar to begin
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Control Builder Modal */}
      <ControlBuilderModal
        isOpen={isControlBuilderOpen}
        onClose={() => setIsControlBuilderOpen(false)}
        controls={controlConfig?.controls || []}
        onSaveControls={handleSaveControls}
      />
    </div>
  );
}
