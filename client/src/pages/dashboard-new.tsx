import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Settings, Play, Clock, Users } from "lucide-react";
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

export function Dashboard() {
  const { data: demoStations, isLoading } = useQuery({
    queryKey: ['/api/demo-stations'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Loading demo stations...</div>
      </div>
    );
  }

  const stations = (demoStations as DemoStation[]) || [];

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Demo Station Dashboard</h1>
            <p className="text-muted-foreground">Overview of available demo stations</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {stations.length} Station{stations.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Station Cards */}
        {stations.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <Monitor className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Demo Stations Available</h3>
                <p className="text-muted-foreground">Contact your administrator to create demo stations.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stations.map((station) => (
              <Card key={station.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Monitor className="w-5 h-5" />
                      <span>{station.name}</span>
                    </CardTitle>
                    <Badge variant={station.isOnline ? "default" : "secondary"}>
                      {station.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {station.description || "No description available"}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{station.sessionTimeLimit}min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Monitor className="w-3 h-3" />
                      <span>{station.cameraCount} camera{station.cameraCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{station.requiresLogin ? "Login req." : "Open access"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {station.hardwareType}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Link href={`/stations/${station.id}/control`}>
                      <Button 
                        size="sm" 
                        disabled={!station.isOnline}
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Control
                      </Button>
                    </Link>
                    <Link href={`/stations/${station.id}/edit`}>
                      <Button size="sm" variant="outline">
                        <Settings className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}