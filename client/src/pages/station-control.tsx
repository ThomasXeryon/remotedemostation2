import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { VideoFeed } from "@/components/video-feed";
import { ControlPanel } from "@/components/control-panel";
import { TelemetrySection } from "@/components/telemetry-section";
import { useWebSocket } from "@/hooks/use-websocket";
import { getCurrentUser } from "@/lib/auth";
import { useState, useEffect } from "react";
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
                    left: widget.position.x,
                    top: widget.position.y,
                    width: widget.size.width,
                    height: widget.size.height,
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

                  switch (widget.type) {
                    case 'button':
                      return (
                        <div
                          key={widget.id}
                          style={{
                            ...style,
                            backgroundColor: widget.style.backgroundColor,
                            color: widget.style.textColor,
                            border: `2px solid ${widget.style.borderColor}`,
                            borderRadius: `${widget.style.borderRadius}px`,
                            fontSize: `${widget.style.fontSize}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '500',
                            cursor: isSessionActive ? 'pointer' : 'not-allowed',
                            opacity: isSessionActive ? 1 : 0.6,
                            userSelect: 'none'
                          }}
                          onClick={handleControlClick}
                          className="shadow-sm hover:shadow-md active:scale-95 transition-all"
                        >
                          {widget.name}
                        </div>
                      );

                    case 'slider':
                      return (
                        <div
                          key={widget.id}
                          style={{
                            ...style,
                            backgroundColor: widget.style.backgroundColor,
                            border: `2px solid ${widget.style.borderColor}`,
                            borderRadius: `${widget.style.borderRadius}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px'
                          }}
                          className="shadow-sm"
                        >
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue="50"
                            className="w-full h-2 rounded-full appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, ${widget.style.textColor} 0%, ${widget.style.textColor} 50%, #e5e7eb 50%, #e5e7eb 100%)`,
                              outline: 'none'
                            }}
                            disabled={!isSessionActive}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              const percentage = value + '%';
                              e.target.style.background = `linear-gradient(to right, ${widget.style.textColor} 0%, ${widget.style.textColor} ${percentage}, #e5e7eb ${percentage}, #e5e7eb 100%)`;
                              
                              if (isSessionActive) {
                                handleCommand(widget.command, { value: value, ...widget.parameters });
                              }
                            }}
                          />
                        </div>
                      );

                    case 'toggle': {
                      const [isToggled, setIsToggled] = useState(false);
                      return (
                        <div
                          key={widget.id}
                          style={{
                            ...style,
                            backgroundColor: widget.style.backgroundColor,
                            border: `2px solid ${widget.style.borderColor}`,
                            borderRadius: `${widget.style.borderRadius}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px',
                            cursor: isSessionActive ? 'pointer' : 'not-allowed',
                            opacity: isSessionActive ? 1 : 0.6
                          }}
                          onClick={() => {
                            if (isSessionActive) {
                              const newToggleState = !isToggled;
                              setIsToggled(newToggleState);
                              handleCommand(widget.command, { value: newToggleState, ...widget.parameters });
                            }
                          }}
                          className="shadow-sm"
                        >
                          <div 
                            className="w-8 h-4 rounded-full relative transition-colors"
                            style={{backgroundColor: isToggled ? widget.style.textColor : widget.style.borderColor}}
                          >
                            <div 
                              className="w-3 h-3 rounded-full absolute top-0.5 transition-transform duration-200"
                              style={{
                                backgroundColor: '#ffffff',
                                transform: isToggled ? 'translateX(16px)' : 'translateX(2px)'
                              }}
                            />
                          </div>
                        </div>
                      );
                    }

                    case 'joystick': {
                      const joystickRef = useRef<HTMLDivElement>(null);
                      const knobRef = useRef<HTMLDivElement>(null);
                      const isDraggingRef = useRef(false);

                      const handleJoystickStart = (e: React.MouseEvent | React.TouchEvent) => {
                        if (!isSessionActive) return;
                        e.preventDefault();
                        isDraggingRef.current = true;
                        
                        const joystick = joystickRef.current;
                        const knob = knobRef.current;
                        if (!joystick || !knob) return;

                        const rect = joystick.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        const maxDistance = 18;

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
                          
                          knob.style.transform = `translate(${x}px, ${y}px)`;
                          
                          const normalizedX = Math.round((x / maxDistance) * 100);
                          const normalizedY = Math.round((y / maxDistance) * 100);
                          handleCommand(widget.command, { x: normalizedX, y: normalizedY, ...widget.parameters });
                        };

                        const handleEnd = () => {
                          isDraggingRef.current = false;
                          if (knob) {
                            knob.style.transform = 'translate(0px, 0px)';
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
                          key={widget.id}
                          style={{
                            ...style,
                            backgroundColor: widget.style.backgroundColor,
                            border: `2px solid ${widget.style.borderColor}`,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px'
                          }}
                          className="shadow-sm"
                        >
                          <div 
                            ref={joystickRef}
                            className="w-12 h-12 rounded-full cursor-pointer"
                            style={{
                              backgroundColor: widget.style.textColor,
                              position: 'relative'
                            }}
                            onMouseDown={handleJoystickStart}
                            onTouchStart={handleJoystickStart}
                          >
                            <div
                              ref={knobRef}
                              className="w-6 h-6 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-sm transition-transform"
                              style={{transitionDuration: isDraggingRef.current ? '0ms' : '200ms'}}
                            />
                          </div>
                        </div>
                      );
                    }

                    default:
                      return null;
                  }
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