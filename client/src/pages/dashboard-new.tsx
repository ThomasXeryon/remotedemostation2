import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Monitor, Settings, Play, Clock, Users, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";

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
  const { data: demoStations, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/demo-stations'],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const currentUser = getCurrentUser();

  // Listen for organization changes and refetch data
  useEffect(() => {
    const handleOrganizationChanged = () => {
      console.log('Dashboard: Organization changed, refetching demo stations');
      refetch();
    };

    window.addEventListener('organizationChanged', handleOrganizationChanged);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChanged);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Loading demo stations...</div>
      </div>
    );
  }

  if (error) {
    console.error('Dashboard error:', error);
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Demo Station Dashboard</h1>
            <p className="text-muted-foreground">Overview of available demo stations</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium mb-2">Unable to Load Dashboard</h3>
              <p className="text-muted-foreground mb-4">There was an error loading the demo stations.</p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allStations = (demoStations as DemoStation[]) || [];
  // Filter stations: regular users only see enabled stations, admins see all
  const stations = currentUser?.role === 'admin' 
    ? allStations 
    : allStations.filter(station => station.isOnline);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Demo Station Dashboard</h1>
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
            <Card key={station.id} className={`hover:shadow-lg transition-shadow ${!station.isOnline ? 'opacity-75' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Monitor className="w-5 h-5" />
                    <span>{station.name}</span>
                  </CardTitle>
                  <Badge variant={station.isOnline ? "default" : "destructive"}>
                    {station.isOnline ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!station.isOnline && currentUser?.role === 'admin' && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 text-sm">
                      Not visible to users
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {station.description || "No description available"}
                </p>

                {/* Station Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    <span>{station.cameraCount} Camera{station.cameraCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{station.sessionTimeLimit}min Sessions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{station.requiresLogin ? "Login Required" : "Open Access"}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Link href={`/stations/${station.id}/control`}>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      disabled={!station.isOnline}
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
  );
}