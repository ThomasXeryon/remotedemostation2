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
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: isSessionActive ? 'default' : 'not-allowed',
        opacity: isSessionActive ? 1 : 0.6,
        transition: 'all 0.2s ease'
      }}
    >
      <span 
        style={{ 
          color: widget.style.textColor, 
          fontSize: `${widget.style.fontSize + 2}px`,
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }} 
        className="mb-3 font-semibold tracking-wide"
      >
        {widget.name}
      </span>
      <div className="w-full flex flex-col items-center space-y-3">
        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div 
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-200 ease-out"
            style={{
              width: `${value}%`,
              background: `linear-gradient(90deg, ${widget.style.textColor}, ${widget.style.textColor}cc)`,
              boxShadow: `0 0 8px ${widget.style.textColor}40`
            }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={handleSliderChange}
            disabled={!isSessionActive}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div 
            className="absolute top-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 transform -translate-y-1/2 transition-all duration-200"
            style={{
              left: `calc(${value}% - 10px)`,
              borderColor: widget.style.textColor,
              boxShadow: `0 2px 8px rgba(0,0,0,0.2), 0 0 0 3px ${widget.style.textColor}20`
            }}
          />
        </div>
        <div className="flex items-center space-x-2">
          <span 
            style={{ color: widget.style.textColor }} 
            className="text-lg font-bold tracking-wider"
          >
            {value}%
          </span>
        </div>
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
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: isSessionActive ? 'pointer' : 'not-allowed',
        opacity: isSessionActive ? 1 : 0.6,
        transition: 'all 0.2s ease'
      }}
      onClick={handleToggle}
    >
      <span 
        style={{ 
          color: widget.style.textColor, 
          fontSize: `${widget.style.fontSize + 2}px`,
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }} 
        className="mb-4 font-semibold tracking-wide"
      >
        {widget.name}
      </span>
      <div
        className="relative p-1 rounded-full transition-all duration-300 ease-out"
        style={{
          width: '64px',
          height: '32px',
          backgroundColor: isOn ? widget.style.textColor : '#cbd5e1',
          boxShadow: isOn 
            ? `0 0 20px ${widget.style.textColor}40, inset 0 2px 4px rgba(0,0,0,0.1)` 
            : 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <div
          className="absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ease-out shadow-lg"
          style={{
            transform: isOn ? 'translateX(32px)' : 'translateX(0px)',
            boxShadow: isOn 
              ? `0 4px 12px rgba(0,0,0,0.15), 0 0 8px ${widget.style.textColor}30`
              : '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <div 
            className="absolute inset-1 rounded-full transition-all duration-300"
            style={{
              background: isOn 
                ? `radial-gradient(circle, ${widget.style.textColor}20, transparent)`
                : 'transparent'
            }}
          />
        </div>
      </div>
      <div className="mt-2">
        <span 
          className="text-xs font-medium tracking-wider uppercase"
          style={{ color: widget.style.textColor }}
        >
          {isOn ? 'ON' : 'OFF'}
        </span>
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
        opacity: isSessionActive ? 1 : 0.6,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'all 0.2s ease'
      }}
      onMouseDown={handleJoystickStart}
      onTouchStart={handleJoystickStart}
    >
      <div
        className="absolute inset-4 rounded-full border-2 opacity-20"
        style={{ borderColor: widget.style.textColor }}
      />
      <div
        ref={knobRef}
        className="w-8 h-8 bg-white rounded-full absolute shadow-lg transition-all"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          transitionDuration: isDraggingRef.current ? '0ms' : '200ms',
          zIndex: 10,
          border: `1px solid ${widget.style.borderColor}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
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
              <div className="relative w-full" style={{ height: 'calc(100% - 3rem)' }}>
                {controlWidgets.map((widget: ControlWidget) => {
                  const widgetStyle = {
                    position: 'absolute' as const,
                    left: `${Math.max(0, Math.min(widget.position.x, 400))}px`,
                    top: `${Math.max(0, Math.min(widget.position.y, 300))}px`,
                    width: `${Math.min(widget.size.width, 200)}px`,
                    height: `${Math.min(widget.size.height, 100)}px`,
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
                            fontWeight: '600',
                            cursor: isSessionActive ? 'pointer' : 'not-allowed',
                            opacity: isSessionActive ? 1 : 0.6,
                            boxShadow: isSessionActive 
                              ? '0 4px 12px rgba(0,0,0,0.15)'
                              : '0 2px 6px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          className="select-none"
                          onClick={() => isSessionActive && handleCommand(widget.command, widget.parameters)}
                          disabled={!isSessionActive}
                          onMouseEnter={(e) => {
                            if (isSessionActive) {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isSessionActive) {
                              e.currentTarget.style.transform = 'translateY(0px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                            }
                          }}
                          onMouseDown={(e) => {
                            if (isSessionActive) {
                              e.currentTarget.style.transform = 'translateY(1px)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                            }
                          }}
                          onMouseUp={(e) => {
                            if (isSessionActive) {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                            }
                          }}
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