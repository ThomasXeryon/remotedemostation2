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
        background: `linear-gradient(135deg, ${widget.style.backgroundColor}f0, ${widget.style.backgroundColor})`,
        border: `3px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius + 8}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 16px',
        boxShadow: isSessionActive 
          ? `0 8px 32px ${widget.style.borderColor}30, 0 4px 16px rgba(0,0,0,0.1)` 
          : '0 4px 16px rgba(0,0,0,0.05)',
        cursor: isSessionActive ? 'default' : 'not-allowed',
        opacity: isSessionActive ? 1 : 0.6,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Subtle glow effect */}
      <div 
        className="absolute inset-0 rounded-lg opacity-20"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${widget.style.textColor}40, transparent 50%)`
        }}
      />
      
      <span 
        style={{ 
          color: widget.style.textColor, 
          fontSize: `${widget.style.fontSize + 3}px`,
          textShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontWeight: '700'
        }} 
        className="relative z-10 mb-4 tracking-wider uppercase"
      >
        {widget.name}
      </span>
      
      <div className="w-full flex flex-col items-center space-y-4 relative z-10">
        <div className="relative w-full h-6 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/30">
          {/* Progress fill */}
          <div 
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${value}%`,
              background: `linear-gradient(90deg, ${widget.style.textColor}, ${widget.style.textColor}dd, ${widget.style.textColor}99)`,
              boxShadow: `0 0 16px ${widget.style.textColor}60, inset 0 1px 2px rgba(255,255,255,0.3)`
            }}
          />
          
          {/* Input slider */}
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={handleSliderChange}
            disabled={!isSessionActive}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            style={{ cursor: isSessionActive ? 'pointer' : 'not-allowed' }}
          />
          
          {/* Custom thumb */}
          <div 
            className="absolute top-1/2 w-8 h-8 bg-white rounded-full shadow-xl border-3 transform -translate-y-1/2 transition-all duration-300 z-10"
            style={{
              left: `calc(${value}% - 16px)`,
              borderColor: widget.style.textColor,
              boxShadow: `0 4px 16px rgba(0,0,0,0.2), 0 0 0 4px ${widget.style.textColor}30, inset 0 2px 4px rgba(255,255,255,0.5)`,
              transform: isSessionActive ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0.9)'
            }}
          >
            <div 
              className="absolute inset-2 rounded-full"
              style={{
                background: `radial-gradient(circle, ${widget.style.textColor}40, transparent)`
              }}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-center">
          <div 
            className="px-4 py-2 rounded-lg border-2 bg-white/90 backdrop-blur-sm"
            style={{ 
              borderColor: widget.style.textColor,
              boxShadow: `0 4px 12px ${widget.style.textColor}20`
            }}
          >
            <span 
              style={{ color: widget.style.textColor }} 
              className="text-xl font-bold tracking-wider"
            >
              {value}%
            </span>
          </div>
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
        background: `linear-gradient(135deg, ${widget.style.backgroundColor}f0, ${widget.style.backgroundColor})`,
        border: `3px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius + 8}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 16px',
        boxShadow: isSessionActive 
          ? `0 8px 32px ${widget.style.borderColor}30, 0 4px 16px rgba(0,0,0,0.1)` 
          : '0 4px 16px rgba(0,0,0,0.05)',
        cursor: isSessionActive ? 'pointer' : 'not-allowed',
        opacity: isSessionActive ? 1 : 0.6,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        transform: isSessionActive && isOn ? 'translateY(-2px)' : 'translateY(0px)'
      }}
      onClick={handleToggle}
    >
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 rounded-lg opacity-20 transition-all duration-500"
        style={{
          background: isOn 
            ? `radial-gradient(circle at 50% 50%, ${widget.style.textColor}60, transparent 70%)`
            : `radial-gradient(circle at 30% 30%, ${widget.style.textColor}20, transparent 50%)`
        }}
      />
      
      <span 
        style={{ 
          color: widget.style.textColor, 
          fontSize: `${widget.style.fontSize + 3}px`,
          textShadow: isOn ? `0 0 12px ${widget.style.textColor}60` : '0 2px 8px rgba(0,0,0,0.2)',
          fontWeight: '700'
        }} 
        className="relative z-10 mb-6 tracking-wider uppercase transition-all duration-300"
      >
        {widget.name}
      </span>
      
      <div
        className="relative rounded-full transition-all duration-500 ease-out"
        style={{
          width: '80px',
          height: '40px',
          background: isOn 
            ? `linear-gradient(45deg, ${widget.style.textColor}, ${widget.style.textColor}cc)`
            : 'linear-gradient(45deg, #e2e8f0, #cbd5e1)',
          boxShadow: isOn 
            ? `0 0 30px ${widget.style.textColor}50, inset 0 2px 8px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.1)` 
            : 'inset 0 2px 8px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.1)',
          border: isOn ? `2px solid ${widget.style.textColor}40` : '2px solid #94a3b8'
        }}
      >
        {/* Track highlights */}
        <div 
          className="absolute inset-1 rounded-full transition-all duration-500"
          style={{
            background: isOn 
              ? `linear-gradient(45deg, transparent, ${widget.style.textColor}20)`
              : 'linear-gradient(45deg, rgba(255,255,255,0.8), transparent)'
          }}
        />
        
        {/* Toggle knob */}
        <div
          className="absolute top-1 w-8 h-8 bg-white rounded-full transition-all duration-500 ease-out shadow-xl border-2"
          style={{
            transform: isOn ? 'translateX(40px) scale(1.1)' : 'translateX(0px) scale(1)',
            borderColor: isOn ? widget.style.textColor : '#94a3b8',
            boxShadow: isOn 
              ? `0 6px 20px rgba(0,0,0,0.15), 0 0 16px ${widget.style.textColor}40, inset 0 2px 4px rgba(255,255,255,0.8)`
              : '0 6px 20px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.8)'
          }}
        >
          <div 
            className="absolute inset-1 rounded-full transition-all duration-500"
            style={{
              background: isOn 
                ? `radial-gradient(circle, ${widget.style.textColor}30, transparent 60%)`
                : 'transparent'
            }}
          />
        </div>
      </div>
      
      <div className="mt-4 relative z-10">
        <div 
          className="px-3 py-1 rounded-full border-2 bg-white/90 backdrop-blur-sm transition-all duration-300"
          style={{ 
            borderColor: isOn ? widget.style.textColor : '#94a3b8',
            boxShadow: isOn ? `0 4px 12px ${widget.style.textColor}20` : '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <span 
            className="text-sm font-bold tracking-wider uppercase transition-all duration-300"
            style={{ 
              color: isOn ? widget.style.textColor : '#64748b',
              textShadow: isOn ? `0 0 8px ${widget.style.textColor}40` : 'none'
            }}
          >
            {isOn ? 'ON' : 'OFF'}
          </span>
        </div>
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
    const maxDistance = Math.min(containerRect.width, containerRect.height) / 2 - 30;

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
      knob.style.transform = 'translate(-50%, -50%) scale(1.1)';

      const normalizedX = Math.round((x / maxDistance) * 100);
      const normalizedY = Math.round((y / maxDistance) * 100);
      handleCommand(widget.command, { x: normalizedX, y: normalizedY, ...widget.parameters });
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
      if (knob) {
        knob.style.left = '50%';
        knob.style.top = '50%';
        knob.style.transform = 'translate(-50%, -50%) scale(1)';
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
        background: `radial-gradient(circle at center, ${widget.style.backgroundColor}f0, ${widget.style.backgroundColor}cc, ${widget.style.backgroundColor}99)`,
        border: `4px solid ${widget.style.borderColor}`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: isSessionActive ? 'grab' : 'not-allowed',
        opacity: isSessionActive ? 1 : 0.6,
        boxShadow: isSessionActive 
          ? `0 12px 40px ${widget.style.borderColor}40, 0 8px 24px rgba(0,0,0,0.15), inset 0 4px 12px rgba(255,255,255,0.1)` 
          : '0 8px 24px rgba(0,0,0,0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(10px)'
      }}
      onMouseDown={handleJoystickStart}
      onTouchStart={handleJoystickStart}
    >
      {/* Outer ring guides */}
      <div
        className="absolute rounded-full border-2 opacity-30 transition-all duration-300"
        style={{ 
          inset: '12px',
          borderColor: widget.style.textColor,
          boxShadow: `0 0 16px ${widget.style.textColor}20`
        }}
      />
      <div
        className="absolute rounded-full border-2 opacity-15 transition-all duration-300"
        style={{ 
          inset: '24px',
          borderColor: widget.style.textColor
        }}
      />
      
      {/* Center dot */}
      <div 
        className="absolute w-3 h-3 rounded-full"
        style={{
          background: `radial-gradient(circle, ${widget.style.textColor}80, ${widget.style.textColor}40)`,
          boxShadow: `0 0 8px ${widget.style.textColor}60`
        }}
      />
      
      {/* Joystick knob */}
      <div
        ref={knobRef}
        className="absolute rounded-full shadow-2xl transition-all border-3"
        style={{
          width: '36px',
          height: '36px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1)',
          transitionDuration: isDraggingRef.current ? '0ms' : '300ms',
          zIndex: 10,
          background: `radial-gradient(circle at 30% 30%, #ffffff, #f8fafc, #e2e8f0)`,
          borderColor: widget.style.textColor,
          boxShadow: `0 8px 24px rgba(0,0,0,0.2), 0 0 16px ${widget.style.textColor}30, inset 0 2px 8px rgba(255,255,255,0.8)`,
          cursor: isDraggingRef.current ? 'grabbing' : 'grab'
        }}
      >
        {/* Knob highlight */}
        <div 
          className="absolute inset-1 rounded-full"
          style={{
            background: `radial-gradient(circle at 25% 25%, ${widget.style.textColor}20, transparent 60%)`
          }}
        />
        
        {/* Central grip texture */}
        <div className="absolute inset-2 rounded-full opacity-40" style={{
          background: `radial-gradient(circle, transparent 30%, ${widget.style.textColor}15 35%, transparent 40%, ${widget.style.textColor}15 45%, transparent 50%)`
        }} />
      </div>
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
                            background: `linear-gradient(135deg, ${widget.style.backgroundColor}f0, ${widget.style.backgroundColor}, ${widget.style.backgroundColor}dd)`,
                            color: widget.style.textColor,
                            border: `3px solid ${widget.style.borderColor}`,
                            borderRadius: `${widget.style.borderRadius + 8}px`,
                            fontSize: `${widget.style.fontSize + 2}px`,
                            fontWeight: '700',
                            cursor: isSessionActive ? 'pointer' : 'not-allowed',
                            opacity: isSessionActive ? 1 : 0.6,
                            boxShadow: isSessionActive 
                              ? `0 8px 32px ${widget.style.borderColor}30, 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 8px rgba(255,255,255,0.1)`
                              : '0 4px 16px rgba(0,0,0,0.05)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textShadow: `0 2px 8px rgba(0,0,0,0.2)`,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            backdropFilter: 'blur(10px)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          className="select-none"
                          onClick={() => isSessionActive && handleCommand(widget.command, widget.parameters)}
                          disabled={!isSessionActive}
                          onMouseEnter={(e) => {
                            if (isSessionActive) {
                              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                              e.currentTarget.style.boxShadow = `0 12px 40px ${widget.style.borderColor}40, 0 8px 24px rgba(0,0,0,0.15)`;
                              e.currentTarget.style.filter = 'brightness(1.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isSessionActive) {
                              e.currentTarget.style.transform = 'translateY(0px) scale(1)';
                              e.currentTarget.style.boxShadow = `0 8px 32px ${widget.style.borderColor}30, 0 4px 16px rgba(0,0,0,0.1)`;
                              e.currentTarget.style.filter = 'brightness(1)';
                            }
                          }}
                          onMouseDown={(e) => {
                            if (isSessionActive) {
                              e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
                              e.currentTarget.style.boxShadow = `0 4px 16px ${widget.style.borderColor}50, inset 0 4px 12px rgba(0,0,0,0.2)`;
                            }
                          }}
                          onMouseUp={(e) => {
                            if (isSessionActive) {
                              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                              e.currentTarget.style.boxShadow = `0 12px 40px ${widget.style.borderColor}40, 0 8px 24px rgba(0,0,0,0.15)`;
                            }
                          }}
                        >
                          {/* Subtle glow effect overlay */}
                          <div 
                            className="absolute inset-0 rounded-lg opacity-20 pointer-events-none"
                            style={{
                              background: `radial-gradient(circle at 30% 30%, ${widget.style.textColor}40, transparent 60%)`
                            }}
                          />
                          <span className="relative z-10">{widget.name}</span>
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