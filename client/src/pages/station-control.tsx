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
                    if (isSessionActive && canStartSession) {
                      handleCommand(widget.command, widget.parameters || {});
                    }
                  };

                  switch (widget.type) {
                    case 'button':
                      return (
                        <div
                          key={widget.id}
                          style={style}
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
                          style={{...style, padding: '8px'}}
                          className="shadow-sm"
                        >
                          <div className="text-xs mb-2 text-center font-medium text-gray-700">
                            {widget.name}
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue="50"
                            className="w-full h-3 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, ${widget.style?.backgroundColor || '#2563eb'} 0%, ${widget.style?.backgroundColor || '#2563eb'} 50%, #e5e7eb 50%, #e5e7eb 100%)`,
                            }}
                            disabled={!isSessionActive}
                            onChange={(e) => {
                              // Update visual feedback
                              const value = parseInt(e.target.value);
                              const percentage = value + '%';
                              e.target.style.background = `linear-gradient(to right, ${widget.style?.backgroundColor || '#2563eb'} 0%, ${widget.style?.backgroundColor || '#2563eb'} ${percentage}, #e5e7eb ${percentage}, #e5e7eb 100%)`;
                              
                              // Update value display
                              const valueDisplay = document.getElementById(`slider-value-${widget.id}`);
                              if (valueDisplay) {
                                valueDisplay.textContent = value.toString();
                              }
                              
                              if (isSessionActive) {
                                handleCommand(widget.command, { value: e.target.value, ...widget.parameters });
                              }
                            }}
                          />
                          <div className="text-xs mt-1 text-center text-gray-500">
                            Value: <span id={`slider-value-${widget.id}`}>50</span>%
                          </div>
                        </div>
                      );

                    case 'toggle':
                      return (
                        <div
                          key={widget.id}
                          style={{...style, padding: '8px'}}
                          onClick={handleControlClick}
                          className="shadow-sm cursor-pointer"
                        >
                          <div 
                            className="w-12 h-6 rounded-full relative transition-colors"
                            style={{backgroundColor: widget.style?.borderColor || '#2563eb'}}
                          >
                            <div 
                              className="w-5 h-5 rounded-full absolute top-0.5 left-0.5 transition-transform"
                              style={{backgroundColor: widget.style?.textColor || '#ffffff'}}
                            />
                          </div>
                        </div>
                      );

                    case 'joystick':
                      return (
                        <div
                          key={widget.id}
                          style={{...style, padding: '8px'}}
                          className="shadow-sm"
                        >
                          <div className="text-xs mb-2 text-center font-medium text-gray-700">
                            {widget.name}
                          </div>
                          <div className="flex justify-center">
                            <Joystick
                              size={80}
                              onMove={(x, y) => {
                                if (isSessionActive) {
                                  handleCommand(widget.command, { 
                                    x: Math.round(x * 100), 
                                    y: Math.round(y * 100),
                                    ...widget.parameters 
                                  });
                                }
                              }}
                              onStop={() => {
                                if (isSessionActive) {
                                  handleCommand(widget.command, { x: 0, y: 0, ...widget.parameters });
                                }
                              }}
                            />
                          </div>
                        </div>
                      );

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

          {/* Real Hardware Status - only shows when connected */}
          {isConnected && telemetryData && telemetryData.length > 0 ? (
            <div>
              <h3 className="font-semibold mb-3">Hardware Status</h3>
              <div className="space-y-2 text-sm">
                {telemetryData[0].position && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Position:</span>
                    <span className="text-green-600 font-mono">{telemetryData[0].position}mm</span>
                  </div>
                )}
                {telemetryData[0].velocity && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Velocity:</span>
                    <span className="text-blue-600 font-mono">{telemetryData[0].velocity}mm/s</span>
                  </div>
                )}
                {telemetryData[0].load && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Load:</span>
                    <span className="text-yellow-600 font-mono">{telemetryData[0].load}%</span>
                  </div>
                )}
                {telemetryData[0].temperature && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Temperature:</span>
                    <span className="text-orange-600 font-mono">{telemetryData[0].temperature}°C</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">No Hardware Connected</div>
              <div className="text-xs mt-1">Connect demo station to view status</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}