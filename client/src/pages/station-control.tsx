import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
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
    telemetryData, 
    connectionStats, 
    isConnected, 
    sendCommand 
  } = useWebSocket(id ? parseInt(id) : 0, 1, isSessionActive ? 1 : undefined);

  const handleCommand = (command: string, parameters?: Record<string, any>) => {
    console.log('Sending command:', command, parameters);
    sendCommand({
      type: 'command',
      command,
      parameters: parameters || {}
    });
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
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div>Loading station...</div>
        </div>
      </Layout>
    );
  }

  if (!station) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div>Station not found</div>
        </div>
      </Layout>
    );
  }

  const demoStation = station as DemoStation;
  const controlWidgets = (controls?.controls || []) as ControlWidget[];

  return (
    <Layout>
      <div className="px-6 py-3 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{demoStation.name}</h1>
              <p className="text-muted-foreground">{demoStation.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant={demoStation.isOnline ? "default" : "secondary"}>
              {demoStation.isOnline ? "Online" : "Offline"}
            </Badge>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>

        {/* Session Control */}
        <Card>
          <CardHeader>
            <CardTitle>Session Control</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              {!isSessionActive ? (
                <Button onClick={handleStartSession} disabled={!demoStation.isOnline}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Session
                </Button>
              ) : (
                <Button onClick={handleStopSession} variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Session
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Session limit: {demoStation.sessionTimeLimit} minutes
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Main Control Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Feed */}
          <div className="space-y-4">
            <VideoFeed
              stationName={demoStation.name}
              telemetry={telemetryData[0] || null}
              isRecording={isSessionActive}
            />
            
            {/* Custom Controls */}
            {controlWidgets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Custom Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {controlWidgets.map((widget) => (
                      <Button
                        key={widget.id}
                        onClick={() => handleCommand(widget.command, widget.parameters)}
                        disabled={!isSessionActive}
                        variant="outline"
                      >
                        {widget.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Control Panel and Telemetry */}
          <div className="space-y-4">
            <ControlPanel
              onCommand={handleCommand}
              speed={speed}
              targetPosition={targetPosition}
              safetyLimits={{ min: -100, max: 100 }}
              onSpeedChange={setSpeed}
              onTargetPositionChange={setTargetPosition}
            />
            
            <TelemetrySection
              telemetryData={telemetryData}
              connectionStats={connectionStats}
              isConnected={isConnected}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}