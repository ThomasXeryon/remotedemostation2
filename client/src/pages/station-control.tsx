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
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading station...</div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">Station not found</div>
      </div>
    );
  }

  const demoStation = station as DemoStation;
  const controlWidgets = (Array.isArray(controls) ? controls : []) as ControlWidget[];

  return (
    <div className="h-screen bg-black flex flex-col">
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
              telemetry={null}
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

        {/* Right Side - Controls */}
        <div className="w-80 p-4 bg-gray-900 space-y-4 overflow-y-auto">
          {/* Custom Controls */}
          {controlWidgets.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-3">Custom Controls</h3>
              <div className="grid grid-cols-2 gap-2">
                {controlWidgets.map((widget) => (
                  <Button
                    key={widget.id}
                    onClick={() => handleCommand(widget.command, widget.parameters)}
                    disabled={!isSessionActive}
                    variant="outline"
                    size="sm"
                    className="text-white border-gray-600 hover:bg-gray-700"
                  >
                    {widget.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Movement Controls */}
          <div>
            <h3 className="text-white font-semibold mb-3">Movement Controls</h3>
            <ControlPanel
              onCommand={handleCommand}
              speed={speed}
              targetPosition={targetPosition}
              safetyLimits={{ min: -100, max: 100 }}
              onSpeedChange={setSpeed}
              onTargetPositionChange={setTargetPosition}
            />
          </div>

          {/* Telemetry */}
          <div>
            <h3 className="text-white font-semibold mb-3">Status</h3>
            <TelemetrySection
              telemetryData={[]}
              connectionStats={connectionStats}
              isConnected={isConnected}
            />
          </div>
        </div>
      </div>
    </div>
  );
}