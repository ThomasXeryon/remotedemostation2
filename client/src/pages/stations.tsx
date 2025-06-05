import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Plus, Cpu, Circle, Settings, Trash2, Edit, Power, PowerOff, Camera, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@clerk/clerk-react';
import type { DemoStation } from '@shared/schema';

interface CreateStationForm {
  name: string;
  description: string;
  cameraCount: number;
  sessionTimeLimit: number;
  requiresLogin: boolean;
}

export default function StationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState<CreateStationForm>({
    name: '',
    description: '',
    cameraCount: 1,
    sessionTimeLimit: 30,
    requiresLogin: true,
  });



  // Fetch demo stations
  const { data: demoStations = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/demo-stations'],
    enabled: isLoaded && !!user,
  });

  // Listen for organization changes and refetch data
  useEffect(() => {
    const handleOrganizationChanged = () => {
      console.log('Stations page: Organization changed, refetching demo stations');
      refetch();
    };

    window.addEventListener('organizationChanged', handleOrganizationChanged);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChanged);
    };
  }, [refetch]);

  // Check authentication state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <div>Authentication required</div>;
  }

  // Create station mutation
  const createStationMutation = useMutation({
    mutationFn: async (stationData: CreateStationForm) => {
      return apiRequest('/api/demo-stations', {
        method: 'POST',
        body: JSON.stringify(stationData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo-stations'] });
      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        description: '',
        cameraCount: 1,
        sessionTimeLimit: 30,
        requiresLogin: true,
      });
      toast({ title: 'Demo station created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create demo station', variant: 'destructive' });
    },
  });



  // Delete station mutation
  const deleteStationMutation = useMutation({
    mutationFn: async (stationId: number) => {
      return apiRequest(`/api/demo-stations/${stationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo-stations'] });
      toast({ title: 'Demo station deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete demo station', variant: 'destructive' });
    },
  });

  // Toggle station status mutation
  const toggleStationMutation = useMutation({
    mutationFn: async ({ stationId, isOnline }: { stationId: number; isOnline: boolean }) => {
      return apiRequest(`/api/demo-stations/${stationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isOnline }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo-stations'] });
      toast({ title: 'Station status updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update station status', variant: 'destructive' });
    },
  });

  const getStatusColor = (station: DemoStation) => {
    return station.isOnline ? 'text-green-600' : 'text-red-600';
  };

  const getStatusText = (station: DemoStation) => {
    return station.isOnline ? 'Enabled' : 'Disabled';
  };

  const handleCreateStation = () => {
    if (!createForm.name.trim()) {
      toast({ title: 'Station name is required', variant: 'destructive' });
      return;
    }
    createStationMutation.mutate(createForm);
  };

  const handleEditStation = (station: DemoStation) => {
    console.log('Editing station with ID:', station.id);
    setLocation(`/stations/${station.id}/edit`);
  };

  const handleDeleteStation = (station: DemoStation) => {
    if (confirm(`Are you sure you want to delete "${station.name}"?`)) {
      deleteStationMutation.mutate(station.id);
    }
  };

  const handleToggleStation = (station: DemoStation) => {
    toggleStationMutation.mutate({
      stationId: station.id,
      isOnline: !station.isOnline,
    });
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Demo Stations</h1>
          <p className="text-muted-foreground">Manage and monitor your organization's demo stations</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Station
        </Button>
      </div>
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogTrigger asChild>
          {/* The button is now rendered by the PageLayout component */}
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Demo Station</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Station Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Linear Actuator Station"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Brief description of the demo station..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cameraCount">Camera Count</Label>
                <Select
                  value={createForm.cameraCount.toString()}
                  onValueChange={(value) => setCreateForm({ ...createForm, cameraCount: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Camera</SelectItem>
                    <SelectItem value="2">2 Cameras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sessionTime">Session Time (minutes)</Label>
                <Input
                  id="sessionTime"
                  type="number"
                  value={createForm.sessionTimeLimit}
                  onChange={(e) => setCreateForm({
                    ...createForm,
                    sessionTimeLimit: parseInt(e.target.value) || 30
                  })}
                  min="1"
                  max="120"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="requiresLogin"
                checked={createForm.requiresLogin}
                onCheckedChange={(checked) => setCreateForm({ ...createForm, requiresLogin: checked })}
              />
              <Label htmlFor="requiresLogin">Require user login to access</Label>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateStation}
                disabled={createStationMutation.isPending}
              >
                {createStationMutation.isPending ? 'Creating...' : 'Create Station'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stations Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded"></div>
                  <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : demoStations.length === 0 ? (
        <div className="text-center py-12">
          <Cpu className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Demo Stations</h3>
          <p className="text-slate-600 mb-6">
            Get started by creating your first demo station.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demoStations.map((station: DemoStation) => (
            <Card key={station.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Cpu className="w-5 h-5" />
                      <span>{station.name}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Circle 
                        className={`w-3 h-3 ${getStatusColor(station)}`} 
                        fill="currentColor" 
                      />
                      <Badge variant={station.isOnline ? 'default' : 'secondary'}>
                        {getStatusText(station)}
                      </Badge>
                    </div>
                  </div>

                  {(currentUser.role === 'admin' || currentUser.role === 'operator') && (
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditStation(station)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStation(station)}
                        disabled={toggleStationMutation.isPending}
                      >
                        {station.isOnline ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteStation(station)}
                        disabled={deleteStationMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm mb-4">
                  {station.description || 'No description available'}
                </p>

                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Camera className="w-4 h-4" />
                    <span>{station.cameraCount || 1} Camera{(station.cameraCount || 1) > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{station.sessionTimeLimit || 30}min</span>
                  </div>
                </div>

                {station.requiresLogin && (
                  <Badge variant="outline" className="mt-2">
                    Login Required
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}