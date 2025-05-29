import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { VideoFeed } from "@/components/video-feed";
import { ControlPanel } from "@/components/control-panel";
import { TelemetrySection } from "@/components/telemetry-section";
import { useWebSocket } from "@/hooks/use-websocket";
import { getCurrentUser } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Square, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Joystick } from "@/components/joystick";

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

function ToggleControl({ widget, style, isSessionActive, handleCommand }: {
  widget: ControlWidget;
  style: any;
  isSessionActive: boolean;
  handleCommand: (command: string, params: any) => void;
}) {
  const [isToggled, setIsToggled] = useState(false);
  
  return (
    <div
      style={{
        ...style,
        background: `linear-gradient(145deg, ${widget.style.backgroundColor}, #${widget.style.backgroundColor.slice(1).split('').map(c => Math.max(0, parseInt(c, 16) - 2).toString(16)).join('')})`,
        border: `3px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        cursor: isSessionActive ? 'pointer' : 'not-allowed',
        opacity: isSessionActive ? 1 : 0.6,
        position: 'relative'
      }}
      onClick={() => {
        if (isSessionActive) {
          const newToggleState = !isToggled;
          setIsToggled(newToggleState);
          handleCommand(widget.command, { value: newToggleState, ...widget.parameters });
        }
      }}
      className="shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
    >
      {/* Toggle label */}
      <div 
        style={{ 
          color: widget.style.textColor, 
          fontSize: `${Math.max(10, widget.style.fontSize - 2)}px`,
          fontWeight: '600',
          marginBottom: '8px',
          textAlign: 'center',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}
      >
        {widget.name}
      </div>
      
      {/* Enhanced toggle switch */}
      <div 
        className="relative transition-all duration-300 ease-out"
        style={{
          width: '48px',
          height: '24px',
          borderRadius: '12px',
          backgroundColor: isToggled ? widget.style.textColor : '#64748b',
          boxShadow: isToggled 
            ? `0 0 12px ${widget.style.textColor}40, inset 0 2px 4px rgba(0,0,0,0.2)` 
            : 'inset 0 2px 4px rgba(0,0,0,0.3)',
          border: '2px solid rgba(255,255,255,0.2)'
        }}
      >
        {/* Toggle knob */}
        <div 
          className="absolute top-1 rounded-full transition-all duration-300 ease-out"
          style={{
            width: '16px',
            height: '16px',
            background: 'linear-gradient(145deg, #ffffff, #f1f5f9)',
            transform: isToggled ? 'translateX(24px)' : 'translateX(2px)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
            border: '1px solid #e2e8f0'
          }}
        >
          {/* Knob highlight */}
          <div 
            className="absolute inset-0.5 rounded-full opacity-60"
            style={{ 
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), transparent 50%)'
            }}
          />
        </div>
        
        {/* Glow effect when active */}
        {isToggled && (
          <div 
            className="absolute inset-0 rounded-full opacity-40 animate-pulse"
            style={{
              background: `radial-gradient(circle, ${widget.style.textColor}60, transparent 70%)`
            }}
          />
        )}
      </div>
      
      {/* State indicator */}
      <div 
        className="text-xs font-medium mt-2 transition-colors duration-200"
        style={{ 
          color: isToggled ? widget.style.textColor : '#64748b',
          textShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }}
      >
        {isToggled ? 'ON' : 'OFF'}
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
  const [isPressed, setIsPressed] = useState(false);

  const handleJoystickStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSessionActive) return;
    e.preventDefault();
    isDraggingRef.current = true;
    setIsPressed(true);
    
    const container = containerRef.current;
    const knob = knobRef.current;
    if (!container || !knob) return;

    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2;
    const containerRadius = Math.min(containerRect.width, containerRect.height) / 2;
    const maxDistance = containerRadius - 20; // Leave some padding from edge

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
      
      // Move the knob from its center position
      knob.style.left = `calc(50% + ${x}px)`;
      knob.style.top = `calc(50% + ${y}px)`;
      knob.style.transform = 'translate(-50%, -50%)';
      
      const normalizedX = Math.round((x / maxDistance) * 100);
      const normalizedY = Math.round((y / maxDistance) * 100);
      handleCommand(widget.command, { x: normalizedX, y: normalizedY, ...widget.parameters });
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
      setIsPressed(false);
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
        background: `linear-gradient(145deg, ${widget.style.backgroundColor}, #${widget.style.backgroundColor.slice(1).split('').map(c => Math.max(0, parseInt(c, 16) - 2).toString(16)).join('')})`,
        border: `3px solid ${widget.style.borderColor}`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: isSessionActive ? 'grab' : 'not-allowed',
        opacity: isSessionActive ? 1 : 0.6,
        boxShadow: isPressed 
          ? 'inset 0 4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.1)' 
          : '0 6px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
      }}
      className="transition-all duration-150"
      onMouseDown={handleJoystickStart}
      onTouchStart={handleJoystickStart}
    >
      {/* Crosshair guides */}
      <div 
        className="absolute w-full h-0.5 opacity-20"
        style={{ backgroundColor: widget.style.textColor }}
      />
      <div 
        className="absolute h-full w-0.5 opacity-20"
        style={{ backgroundColor: widget.style.textColor }}
      />
      
      {/* Center dot */}
      <div 
        className="absolute w-2 h-2 rounded-full opacity-30"
        style={{ backgroundColor: widget.style.textColor }}
      />
      
      {/* Knob */}
      <div
        ref={knobRef}
        className="absolute rounded-full transition-all duration-150"
        style={{
          width: '32px',
          height: '32px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: `linear-gradient(145deg, #ffffff, #f0f0f0)`,
          border: `2px solid ${widget.style.borderColor}`,
          boxShadow: isPressed 
            ? '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(0,0,0,0.1)' 
            : '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
          cursor: isSessionActive ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'not-allowed',
          transitionDuration: isDraggingRef.current ? '0ms' : '150ms',
          zIndex: 10
        }}
      >
        {/* Knob inner highlight */}
        <div 
          className="absolute inset-1 rounded-full opacity-40"
          style={{ 
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), transparent 50%)`
          }}
        />
      </div>
    </div>
  );
}

export function StationControl() {
  const { id } = useParams();
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
    refetchInterval: 1000, // Refresh every second when session is active
  });

  // Fix: station comes as an array, get the first element
  const stationData = Array.isArray(station) ? station[0] : station;
  
  console.log('Station data:', stationData);
  console.log('Station configuration:', stationData?.configuration);
  
  // Get saved layout or use default
  const layout = stationData?.configuration?.interfaceLayout || {
    camera: { width: 45, height: 90, position: { x: 5, y: 5 } },
    controlPanel: { width: 50, height: 90, position: { x: 45, y: 5 } }
  };

  console.log('Using layout:', layout);

  // Listen for organization changes and refetch data
  useEffect(() => {
    const handleOrganizationChanged = () => {
      console.log('Station Control: Organization changed, refetching station data');
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

  const { 
    connectionStats, 
    isConnected, 
    sendCommand 
  } = useWebSocket(id || '', 1, isSessionActive ? 1 : undefined);

  const handleCommand = (command: string, parameters?: Record<string, any>) => {
    console.log('Sending command:', command, parameters);
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

  const demoStation = station as DemoStation;
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
            <h1 className="text-xl font-bold">{demoStation.name}</h1>
            <p className="text-sm text-gray-600">{demoStation.description}</p>
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
              Stop Session
            </Button>
          )}
        </div>
      </div>

      {/* Main Control Interface - Exact Layout from Editor */}
      <div className="flex-1 flex gap-4 p-4">
        {/* Camera Feed Panel */}
        <div 
          style={{ 
            width: `${layout.camera.width}%`
          }}
        >
          <VideoFeed
            stationName={stationData?.name || 'Demo Station'}
            telemetry={telemetryData && telemetryData.length > 0 ? telemetryData[0] : null}
            isRecording={isSessionActive}
          />
        </div>

        {/* Control Panel */}
        <div 
          className="bg-white border border-gray-200 rounded-lg p-4"
          style={{ 
            width: `${layout.controlPanel.width}%`
          }}
        >
          {/* Custom Control Layout - exactly as designed */}
          {controlConfig?.controls && controlConfig.controls.length > 0 ? (
            <div>
              <h3 className="font-semibold mb-3">Hardware Controls</h3>
              <div className="relative bg-gray-50 rounded-lg p-4 min-h-[400px] border-2 border-dashed border-gray-200">
                {controlConfig.controls.map((widget: ControlWidget) => {
                  const style = {
                    position: 'absolute' as const,
                    left: `${widget.position.x}px`,
                    top: `${widget.position.y}px`,
                    width: `${widget.size.width}px`,
                    height: `${widget.size.height}px`,
                    backgroundColor: widget.style?.backgroundColor || '#3b82f6',
                    color: widget.style?.textColor || '#ffffff',
                    border: `2px solid ${widget.style?.borderColor || '#2563eb'}`,
                    borderRadius: widget.style?.borderRadius || 6,
                    fontSize: widget.style?.fontSize || 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isSessionActive ? 'pointer' : 'not-allowed',
                    opacity: isSessionActive ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                    fontWeight: 'medium',
                    userSelect: 'none' as const,
                  };

                  const handleControlClick = () => {
                    if (isSessionActive) {
                      handleCommand(widget.command, widget.parameters || {});
                    }
                  };

                  if (widget.type === 'button') {
                    return (
                      <div
                        key={widget.id}
                        style={{
                          position: 'absolute',
                          left: `${widget.position.x}px`,
                          top: `${widget.position.y}px`,
                          width: `${widget.size.width}px`,
                          height: `${widget.size.height}px`,
                          background: `linear-gradient(145deg, ${widget.style.backgroundColor}, #${widget.style.backgroundColor.slice(1).split('').map(c => Math.max(0, parseInt(c, 16) - 3).toString(16)).join('')})`,
                          color: widget.style.textColor,
                          border: `3px solid ${widget.style.borderColor}`,
                          borderRadius: `${widget.style.borderRadius}px`,
                          fontSize: `${widget.style.fontSize}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          cursor: isSessionActive ? 'pointer' : 'not-allowed',
                          opacity: isSessionActive ? 1 : 0.6,
                          userSelect: 'none',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          overflow: 'hidden'
                        }}
                        onClick={handleControlClick}
                        className="shadow-lg hover:shadow-xl active:scale-95 active:shadow-inner transition-all duration-150 hover:brightness-110"
                        onMouseDown={(e) => {
                          if (isSessionActive) {
                            e.currentTarget.style.transform = 'scale(0.95)';
                            e.currentTarget.style.boxShadow = 'inset 0 4px 8px rgba(0,0,0,0.3)';
                          }
                        }}
                        onMouseUp={(e) => {
                          if (isSessionActive) {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isSessionActive) {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '';
                          }
                        }}
                      >
                        {/* Button highlight overlay */}
                        <div 
                          className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"
                          style={{ borderRadius: `${widget.style.borderRadius - 2}px` }}
                        />
                        {widget.name}
                      </div>
                    );
                  }

                  if (widget.type === 'slider') {
                    return (
                      <div
                        key={widget.id}
                        style={{
                          position: 'absolute',
                          left: `${widget.position.x}px`,
                          top: `${widget.position.y}px`,
                          width: `${widget.size.width}px`,
                          height: `${widget.size.height}px`,
                          background: `linear-gradient(145deg, ${widget.style.backgroundColor}, #${widget.style.backgroundColor.slice(1).split('').map(c => Math.max(0, parseInt(c, 16) - 2).toString(16)).join('')})`,
                          border: `3px solid ${widget.style.borderColor}`,
                          borderRadius: `${widget.style.borderRadius}px`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px'
                        }}
                        className="shadow-lg"
                      >
                        {/* Slider label */}
                        <div 
                          style={{ 
                            color: widget.style.textColor, 
                            fontSize: `${Math.max(10, widget.style.fontSize - 2)}px`,
                            fontWeight: '600',
                            marginBottom: '8px',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}
                        >
                          {widget.name}
                        </div>
                        
                        {/* Custom slider container */}
                        <div className="relative w-full">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue="50"
                            className="w-full h-3 rounded-full appearance-none cursor-pointer slider-thumb"
                            style={{
                              background: `linear-gradient(to right, ${widget.style.textColor} 0%, ${widget.style.textColor} 50%, #cbd5e1 50%, #cbd5e1 100%)`,
                              outline: 'none',
                              WebkitAppearance: 'none',
                              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            disabled={!isSessionActive}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              const percentage = value + '%';
                              e.target.style.background = `linear-gradient(to right, ${widget.style.textColor} 0%, ${widget.style.textColor} ${percentage}, #cbd5e1 ${percentage}, #cbd5e1 100%)`;
                              
                              if (isSessionActive) {
                                handleCommand(widget.command, { value: value, ...widget.parameters });
                              }
                            }}
                          />
                          
                          {/* Value display */}
                          <div 
                            className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold"
                            style={{ color: widget.style.textColor }}
                            id={`slider-value-${widget.id}`}
                          >
                            50
                          </div>
                        </div>
                        
                        <style jsx>{`
                          .slider-thumb::-webkit-slider-thumb {
                            appearance: none;
                            height: 20px;
                            width: 20px;
                            border-radius: 50%;
                            background: linear-gradient(145deg, #ffffff, #f0f0f0);
                            border: 2px solid ${widget.style.borderColor};
                            cursor: pointer;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8);
                            transition: all 0.15s ease;
                          }
                          .slider-thumb::-webkit-slider-thumb:hover {
                            transform: scale(1.1);
                            box-shadow: 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8);
                          }
                          .slider-thumb::-webkit-slider-thumb:active {
                            transform: scale(0.95);
                            box-shadow: 0 1px 3px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.2);
                          }
                          .slider-thumb::-moz-range-thumb {
                            height: 20px;
                            width: 20px;
                            border-radius: 50%;
                            background: linear-gradient(145deg, #ffffff, #f0f0f0);
                            border: 2px solid ${widget.style.borderColor};
                            cursor: pointer;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                          }
                        `}</style>
                      </div>
                    );
                  }

                  if (widget.type === 'toggle') {
                    return <ToggleControl key={widget.id} widget={widget} style={style} isSessionActive={isSessionActive} handleCommand={handleCommand} />;
                  }

                  if (widget.type === 'joystick') {
                    return <JoystickControl key={widget.id} widget={widget} style={style} isSessionActive={isSessionActive} handleCommand={handleCommand} />;
                  }

                  return null;
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">No Controls Configured</div>
              <div className="text-xs mt-1">Configure controls in Station Editor</div>
            </div>
          )}

          {/* Hardware Status */}
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">Hardware Status</div>
            <div className="text-xs mt-1">Status will appear when hardware is connected</div>
          </div>
        </div>
      </div>
    </div>
  );
}