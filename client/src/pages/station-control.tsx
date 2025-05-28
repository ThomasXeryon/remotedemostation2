import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { VideoFeed } from "@/components/video-feed";
import { ControlPanel } from "@/components/control-panel";
import { TelemetrySection } from "@/components/telemetry-section";
import { useWebSocket } from "@/hooks/use-websocket";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Square } from "lucide-react";
import { Link } from "wouter";

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
  parameters: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export function StationControl() {
  const { id } = useParams();
  const [speed, setSpeed] = useState(50);
  const [targetPosition, setTargetPosition] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const { data: station, isLoading: stationLoading } = useQuery({
    queryKey: ['/api/demo-stations', id],
    enabled: !!id,
  });

  const { data: controls } = useQuery({
    queryKey: ['/api/demo-stations', id, 'controls'],
    enabled: !!id,
  });

  const { data: telemetryData } = useQuery({
    queryKey: ['/api/demo-stations', id, 'telemetry'],
    enabled: !!id && isSessionActive,
    refetchInterval: 1000, // Refresh every second when session is active
  });

  const { 
    connectionStats, 
    isConnected, 
    sendCommand 
  } = useWebSocket(id ? parseInt(id) : 0, 1, isSessionActive ? 1 : undefined);

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
  const controlWidgets = (Array.isArray(controls) ? controls : []) as ControlWidget[];

  return (
    <div className="h-screen flex flex-col">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="text-white border-gray-600 hover:bg-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit Control
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{demoStation.name}</h1>
            <p className="text-sm text-gray-300">{demoStation.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={demoStation.isOnline ? "default" : "secondary"}>
            {demoStation.isOnline ? "Online" : "Offline"}
          </Badge>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          {!isSessionActive ? (
            <Button onClick={handleStartSession} disabled={!demoStation.isOnline} className="bg-green-600 hover:bg-green-700">
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

      {/* Main Control Interface */}
      <div className="flex-1 flex">
        {/* Left Side - Video Feed (takes most space) */}
        <div className="flex-1 p-4">
          <div className="h-full bg-gray-800 rounded-lg flex items-center justify-center relative">
            <VideoFeed
              stationName={demoStation.name}
              telemetry={telemetryData && telemetryData.length > 0 ? telemetryData[0] : null}
              isRecording={isSessionActive}
            />
            
            {/* Camera count indicator */}
            {demoStation.cameraCount > 1 && (
              <div className="absolute top-4 left-4 flex space-x-2">
                {Array.from({ length: demoStation.cameraCount }, (_, i) => (
                  <Button key={i} size="sm" variant={i === 0 ? "default" : "outline"} className="text-xs">
                    Cam {i + 1}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Real Hardware Controls */}
        <div className="w-80 p-4 border-l space-y-4 overflow-y-auto">
          {/* Real Custom Controls - only shows when configured */}
          {controlWidgets.length > 0 ? (
            <div>
              <h3 className="font-semibold mb-3">Hardware Controls</h3>
              <div className="grid grid-cols-2 gap-2">
                {controlWidgets.map((widget) => (
                  <Button
                    key={widget.id}
                    onClick={() => handleCommand(widget.command, widget.parameters)}
                    disabled={!isSessionActive}
                    variant="outline"
                    size="sm"
                  >
                    {widget.name}
                  </Button>
                ))}
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