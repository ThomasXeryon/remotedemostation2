import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Play, Square, ArrowLeft, Settings, Activity, Edit3, Save } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { useWebSocket } from '@/hooks/use-websocket';
import { 
  ShadcnJoystick, 
  ShadcnSlider, 
  ShadcnButton, 
  ShadcnToggle 
} from '@/components/shadcn-controls';

interface DemoStation {
  id: string;
  name: string;
  description: string | null;
  organizationId: number;
  hardwareType: string;
  isOnline: boolean;
  cameraCount: number;
  sessionTimeLimit: number;
  requiresLogin: boolean;
  lastHeartbeat: Date | null;
  configuration: any;
  safetyLimits: any;
  createdAt: Date;
}

interface ControlWidget {
  id: string;
  type: 'button' | 'slider' | 'joystick' | 'toggle';
  name: string;
  command: string;
  parameters?: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    borderRadius: number;
    fontSize: number;
  };
}

export default function StationControl() {
  const { id } = useParams() as { id: string };
  const currentUser = getCurrentUser();
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [localControls, setLocalControls] = useState<ControlWidget[]>([]);
  const [selectedControl, setSelectedControl] = useState<string | null>(null);
  const [draggedControl, setDraggedControl] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const { data: station, isLoading: stationLoading, refetch: refetchStation } = useQuery({
    queryKey: ['/api/demo-stations', id],
    enabled: !!id,
  });

  const { data: controlConfig, refetch: refetchControls } = useQuery({
    queryKey: [`/api/demo-stations/${id}/controls`],
    enabled: !!id,
  });

  const { data: telemetryData, refetch: refetchTelemetry } = useQuery({
    queryKey: ['/api/demo-stations', id, 'telemetry'],
    enabled: !!id && isSessionActive,
    refetchInterval: 1000,
  });

  const { 
    connectionStats, 
    isConnected, 
    sendCommand 
  } = useWebSocket(id || '', currentUser?.id || 1, isSessionActive ? 1 : 0);

  // Listen for organization changes
  useEffect(() => {
    const handleOrganizationChanged = () => {
      refetchStation();
      refetchControls();
      if (isSessionActive) {
        refetchTelemetry();
      }
    };

    window.addEventListener('organizationChanged', handleOrganizationChanged);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChanged);
    };
  }, [refetchStation, refetchControls, refetchTelemetry, isSessionActive]);

  // Sync local controls with fetched controls
  useEffect(() => {
    if (controlConfig && typeof controlConfig === 'object' && 'controls' in controlConfig) {
      const controlWidgets = Array.isArray(controlConfig.controls) ? controlConfig.controls : [];
      if (controlWidgets.length > 0) {
        setLocalControls(controlWidgets);
      }
    }
  }, [controlConfig]);

  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent, controlId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    
    const control = localControls.find(c => c.id === controlId);
    if (!control) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = (e.target as HTMLElement).closest('.relative.w-full')?.getBoundingClientRect();
    
    if (containerRect) {
      setDragOffset({
        x: e.clientX - (containerRect.left + control.position.x),
        y: e.clientY - (containerRect.top + control.position.y)
      });
    }
    
    setDraggedControl(controlId);
    setSelectedControl(controlId);
  }, [isEditMode, localControls]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedControl || !isEditMode) return;
    
    const container = document.querySelector('.relative.w-full[style*="calc(100% - 3rem)"]') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const newX = Math.max(0, Math.min(container.clientWidth - 120, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(container.clientHeight - 40, e.clientY - rect.top - dragOffset.y));
    
    setLocalControls(prev => prev.map(control => 
      control.id === draggedControl 
        ? { ...control, position: { x: newX, y: newY } }
        : control
    ));
  }, [draggedControl, dragOffset, isEditMode]);

  const handleMouseUp = useCallback(() => {
    setDraggedControl(null);
  }, []);

  useEffect(() => {
    if (isEditMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isEditMode, handleMouseMove, handleMouseUp]);

  // Session management
  const handleStartSession = async () => {
    try {
      const response = await fetch(`/api/demo-stations/${id}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        setIsSessionActive(true);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleStopSession = () => {
    setIsSessionActive(false);
  };

  // Control operations
  const handleCommand = (command: string, parameters?: Record<string, any>) => {
    sendCommand(JSON.stringify({
      type: 'command',
      command,
      parameters: parameters || {}
    }));
  };

  const saveControls = async () => {
    try {
      const response = await fetch(`/api/demo-stations/${id}/controls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ controls: localControls })
      });

      if (response.ok) {
        setIsEditMode(false);
        refetchControls();
      }
    } catch (error) {
      console.error('Failed to save controls:', error);
    }
  };

  const addNewControl = (type: 'button' | 'slider' | 'toggle' | 'joystick') => {
    const newControl: ControlWidget = {
      id: `${type}_${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      command: `${type}_command`,
      parameters: {},
      position: { x: 100, y: 100 },
      size: {
        width: type === 'joystick' ? 120 : type === 'slider' ? 200 : type === 'toggle' ? 60 : 120,
        height: type === 'joystick' ? 120 : type === 'slider' ? 30 : type === 'toggle' ? 30 : 40
      },
      style: {
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        borderColor: '#1d4ed8',
        borderRadius: 8,
        fontSize: 14
      }
    };
    setLocalControls(prev => [...prev, newControl]);
  };

  if (stationLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div>Loading station...</div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div>Station not found</div>
      </div>
    );
  }

  const stationData = Array.isArray(station) ? station[0] : station;
  const layout = stationData?.configuration?.interfaceLayout || {
    camera: { width: 45, height: 90, position: { x: 5, y: 5 } },
    controlPanel: { width: 50, height: 90, position: { x: 45, y: 5 } }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit Control
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{stationData.name}</h1>
            <p className="text-sm text-gray-600">{stationData.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => isEditMode ? saveControls() : setIsEditMode(true)}
            variant={isEditMode ? "default" : "outline"}
            className={isEditMode ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isEditMode ? <Save className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
            {isEditMode ? "Save Layout" : "Edit Layout"}
          </Button>
          {!isSessionActive ? (
            <Button 
              onClick={handleStartSession} 
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Session
            </Button>
          ) : (
            <Button onClick={handleStopSession} variant="destructive">
              <Square className="w-4 h-4 mr-2" />
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Main Interface */}
      <div className="flex-1 flex relative">
        {/* Camera Feed */}
        <div 
          className="bg-gray-900 rounded-lg m-2 relative overflow-hidden"
          style={{
            width: `${layout.camera.width}%`,
            height: `${layout.camera.height}%`,
            left: `${layout.camera.position.x}%`,
            top: `${layout.camera.position.y}%`,
            position: 'absolute'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Live Camera Feed</p>
              <p className="text-sm opacity-75">Hardware: {stationData.hardwareType}</p>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div 
          className="bg-white border rounded-lg m-2 relative"
          style={{
            width: `${layout.controlPanel.width}%`,
            height: `${layout.controlPanel.height}%`,
            left: `${layout.controlPanel.position.x}%`,
            top: `${layout.controlPanel.position.y}%`,
            position: 'absolute'
          }}
        >
          <div className="h-full p-4 relative overflow-hidden">
            <h3 className="text-lg font-semibold mb-4">Hardware Controls</h3>

            {/* Add Controls Panel - only show in edit mode */}
            {isEditMode && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <h4 className="text-sm font-semibold mb-3">Add Controls</h4>
                <div className="flex space-x-2">
                  <Button onClick={() => addNewControl('button')} variant="outline" size="sm">
                    + Button
                  </Button>
                  <Button onClick={() => addNewControl('slider')} variant="outline" size="sm">
                    + Slider
                  </Button>
                  <Button onClick={() => addNewControl('toggle')} variant="outline" size="sm">
                    + Toggle
                  </Button>
                  <Button onClick={() => addNewControl('joystick')} variant="outline" size="sm">
                    + Joystick
                  </Button>
                </div>
              </div>
            )}

            {localControls.length > 0 ? (
              <div className="relative w-full" style={{ height: 'calc(100% - 3rem)' }}>
                {localControls.map((widget: ControlWidget) => {
                  const baseStyle = {
                    position: 'absolute' as const,
                    left: `${widget.position.x}px`,
                    top: `${widget.position.y}px`,
                    width: `${widget.size.width}px`,
                    height: `${widget.size.height}px`,
                  };

                  const mouseProps = isEditMode ? {
                    onMouseDown: (e: React.MouseEvent) => handleMouseDown(e, widget.id)
                  } : {};

                  switch (widget.type) {
                    case 'button':
                      return (
                        <ShadcnButton
                          key={widget.id}
                          widget={widget}
                          style={baseStyle}
                          isSessionActive={isSessionActive}
                          handleCommand={(command, params) => handleCommand(command, { ...params, ...widget.parameters })}
                          {...mouseProps}
                        />
                      );
                    
                    case 'slider':
                      return (
                        <ShadcnSlider
                          key={widget.id}
                          widget={widget}
                          style={baseStyle}
                          isSessionActive={isSessionActive}
                          handleCommand={(command, params) => handleCommand(command, { ...params, ...widget.parameters })}
                          {...mouseProps}
                        />
                      );
                    
                    case 'joystick':
                      return (
                        <ShadcnJoystick
                          key={widget.id}
                          widget={widget}
                          style={baseStyle}
                          isSessionActive={isSessionActive}
                          handleCommand={(command, params) => handleCommand(command, { ...params, ...widget.parameters })}
                          {...mouseProps}
                        />
                      );
                    
                    case 'toggle':
                      return (
                        <ShadcnToggle
                          key={widget.id}
                          widget={widget}
                          style={baseStyle}
                          isSessionActive={isSessionActive}
                          handleCommand={(command, params) => handleCommand(command, { ...params, ...widget.parameters })}
                          {...mouseProps}
                        />
                      );

                    default:
                      return null;
                  }
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <div className="text-center">
                  <Settings className="w-8 h-8 mx-auto mb-2" />
                  <p>No controls configured</p>
                  <p className="text-sm">Add controls in edit mode</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="border-t p-2 bg-gray-50 flex justify-between items-center text-sm">
        <div className="flex items-center space-x-4">
          <span className={`px-2 py-1 rounded text-xs ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {connectionStats && (
            <span className="text-gray-600">
              Latency: {connectionStats.latency}ms
            </span>
          )}
        </div>
        <div>
          <span className={`px-2 py-1 rounded text-xs ${isSessionActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {isSessionActive ? 'Session Active' : 'Session Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}