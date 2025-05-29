import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Play, Square, ArrowLeft, Settings, Gauge, Zap, Activity } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { useWebSocket } from '@/hooks/use-websocket';

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

function SliderControl({ widget, style, isSessionActive, handleCommand }: {
  widget: ControlWidget;
  style: any;
  isSessionActive: boolean;
  handleCommand: (command: string, params: any) => void;
}) {
  const [value, setValue] = useState(50);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSessionActive) return;
    const newValue = parseInt(e.target.value);
    setValue(newValue);
    handleCommand(widget.command, { value: newValue, ...widget.parameters });
  };

  return (
    <div
      style={{
        ...style,
        backgroundColor: widget.style.backgroundColor,
        border: `2px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px'
      }}
      className="shadow-sm"
    >
      <span style={{ color: widget.style.textColor, fontSize: `${widget.style.fontSize}px` }} className="mb-2 font-medium">
        {widget.name}
      </span>
      <div className="w-full flex flex-col items-center">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={handleSliderChange}
          disabled={!isSessionActive}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, ${widget.style.textColor} 0%, ${widget.style.textColor} ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`
          }}
        />
        <span style={{ color: widget.style.textColor }} className="text-sm mt-1">{value}%</span>
      </div>
    </div>
  );
}

function ToggleControl({ widget, style, isSessionActive, handleCommand }: {
  widget: ControlWidget;
  style: any;
  isSessionActive: boolean;
  handleCommand: (command: string, params: any) => void;
}) {
  const [isOn, setIsOn] = useState(false);

  const handleToggle = () => {
    if (!isSessionActive) return;
    const newState = !isOn;
    setIsOn(newState);
    handleCommand(widget.command, { state: newState, ...widget.parameters });
  };

  return (
    <div
      style={{
        ...style,
        backgroundColor: widget.style.backgroundColor,
        border: `2px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        cursor: isSessionActive ? 'pointer' : 'not-allowed',
        opacity: isSessionActive ? 1 : 0.6
      }}
      className="shadow-sm"
      onClick={handleToggle}
    >
      <span style={{ color: widget.style.textColor, fontSize: `${widget.style.fontSize}px` }} className="mb-2 font-medium">
        {widget.name}
      </span>
      <div
        className="w-12 h-6 rounded-full relative transition-colors duration-200"
        style={{
          backgroundColor: isOn ? widget.style.textColor : '#e5e7eb'
        }}
      >
        <div
          className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 shadow-sm"
          style={{
            transform: isOn ? 'translateX(24px)' : 'translateX(2px)'
          }}
        />
      </div>
    </div>
  );
}

function JoystickControl({ widget, style, isSessionActive, handleCommand }: {
  widget: ControlWidget;
  style: any;
  isSessionActive: boolean;
  handleCommand: (command: string, params: any) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleJoystickStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSessionActive) return;
    e.preventDefault();
    isDraggingRef.current = true;
    
    const container = containerRef.current;
    const knob = knobRef.current;
    if (!container || !knob) return;

    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2;
    const maxDistance = Math.min(containerRect.width, containerRect.height) / 2 + 30;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      let x = deltaX;
      let y = deltaY;
      
      if (distance > maxDistance) {
        x = (deltaX / distance) * maxDistance;
        y = (deltaY / distance) * maxDistance;
      }
      
      knob.style.left = `calc(50% + ${x}px)`;
      knob.style.top = `calc(50% + ${y}px)`;
      knob.style.transform = 'translate(-50%, -50%)';
      
      const normalizedX = Math.round((x / maxDistance) * 100);
      const normalizedY = Math.round((y / maxDistance) * 100);
      handleCommand(widget.command, { x: normalizedX, y: normalizedY, ...widget.parameters });
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
      if (knob) {
        knob.style.left = '50%';
        knob.style.top = '50%';
        knob.style.transform = 'translate(-50%, -50%)';
      }
      handleCommand(widget.command, { x: 0, y: 0, ...widget.parameters });
      
      document.removeEventListener('mousemove', handleMove as EventListener);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove as EventListener);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove as EventListener);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove as EventListener);
    document.addEventListener('touchend', handleEnd);
  };

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        backgroundColor: widget.style.backgroundColor,
        border: `2px solid ${widget.style.borderColor}`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: isSessionActive ? 'pointer' : 'not-allowed',
        opacity: isSessionActive ? 1 : 0.6
      }}
      className="shadow-sm"
      onMouseDown={handleJoystickStart}
      onTouchStart={handleJoystickStart}
    >
      <div
        ref={knobRef}
        className="w-8 h-8 bg-white rounded-full absolute shadow-lg transition-all"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          transitionDuration: isDraggingRef.current ? '0ms' : '200ms',
          zIndex: 10
        }}
      />
    </div>
  );
}

export function StationControl() {
  const { id } = useParams();
  
  // All hooks must be at the top level
  const [speed, setSpeed] = useState(50);
  const [targetPosition, setTargetPosition] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const currentUser = getCurrentUser();

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

  // Now handle early returns after all hooks
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

  const handleCommand = (command: string, parameters?: Record<string, any>) => {
    sendCommand(JSON.stringify({
      type: 'command',
      command,
      parameters: parameters || {}
    }));
  };

  const handleStartSession = async () => {
    try {
      const response = await fetch(`/api/demo-stations/${id}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({})
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

  const controlWidgets = (controlConfig?.controls && Array.isArray(controlConfig.controls) ? controlConfig.controls : []) as ControlWidget[];
  const isAdmin = currentUser?.role === 'admin';

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
            
            {controlWidgets.length > 0 ? (
              <div className="relative w-full h-full">
                {controlWidgets.map((widget: ControlWidget) => {
                  const widgetStyle = {
                    position: 'absolute' as const,
                    left: `${widget.position.x}px`,
                    top: `${widget.position.y}px`,
                    width: `${widget.size.width}px`,
                    height: `${widget.size.height}px`,
                  };

                  switch (widget.type) {
                    case 'button':
                      return (
                        <button
                          key={widget.id}
                          style={{
                            ...widgetStyle,
                            backgroundColor: widget.style.backgroundColor,
                            color: widget.style.textColor,
                            border: `2px solid ${widget.style.borderColor}`,
                            borderRadius: `${widget.style.borderRadius}px`,
                            fontSize: `${widget.style.fontSize}px`,
                            cursor: isSessionActive ? 'pointer' : 'not-allowed',
                            opacity: isSessionActive ? 1 : 0.6
                          }}
                          className="font-medium shadow-sm hover:shadow-md transition-all"
                          onClick={() => isSessionActive && handleCommand(widget.command, widget.parameters)}
                          disabled={!isSessionActive}
                        >
                          {widget.name}
                        </button>
                      );
                    case 'slider':
                      return (
                        <SliderControl
                          key={widget.id}
                          widget={widget}
                          style={widgetStyle}
                          isSessionActive={isSessionActive}
                          handleCommand={handleCommand}
                        />
                      );
                    case 'toggle':
                      return (
                        <ToggleControl
                          key={widget.id}
                          widget={widget}
                          style={widgetStyle}
                          isSessionActive={isSessionActive}
                          handleCommand={handleCommand}
                        />
                      );
                    case 'joystick':
                      return (
                        <JoystickControl
                          key={widget.id}
                          widget={widget}
                          style={widgetStyle}
                          isSessionActive={isSessionActive}
                          handleCommand={handleCommand}
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
                  <p className="text-sm">Add controls in the station editor</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t bg-gray-50 p-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Latency: {connectionStats.latency}ms</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4" />
            <span>Speed: {speed}%</span>
          </div>
          <span className={`px-2 py-1 rounded text-xs ${isSessionActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {isSessionActive ? 'Session Active' : 'Session Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}