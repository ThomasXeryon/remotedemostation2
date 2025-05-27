import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Cpu, Circle, Settings, Trash2, Edit, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getCurrentUser } from '@/lib/auth';
import type { DemoStation } from '@shared/schema';
import { AlertTriangle } from 'lucide-react';

interface CreateStationForm {
  name: string;
  description: string;
  hardwareType: string;
  configuration: {
    maxSpeed: number;
    maxPosition: number;
    minPosition: number;
  };
  safetyLimits: {
    maxLoad: number;
    maxTemperature: number;
    emergencyStopEnabled: boolean;
  };
}

export default function StationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<DemoStation | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState<CreateStationForm>({
    name: '',
    description: '',
    hardwareType: 'actuator',
    configuration: {
      maxSpeed: 100,
      maxPosition: 500,
      minPosition: -500,
    },
    safetyLimits: {
      maxLoad: 50,
      maxTemperature: 80,
      emergencyStopEnabled: true,
    },
  });

  // Fetch demo stations
  const { data: demoStations = [], isLoading } = useQuery({
    queryKey: ['/api/demo-stations'],
    enabled: !!currentUser,
  });

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
        hardwareType: 'actuator',
        configuration: {
          maxSpeed: 100,
          maxPosition: 500,
          minPosition: -500,
        },
        safetyLimits: {
          maxLoad: 50,
          maxTemperature: 80,
          emergencyStopEnabled: true,
        },
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
    if (!station.isOnline) return 'bg-slate-400';
    if (station.lastHeartbeat) {
      const timeSinceHeartbeat = Date.now() - new Date(station.lastHeartbeat).getTime();
      if (timeSinceHeartbeat < 30000) return 'bg-green-500';
      if (timeSinceHeartbeat < 120000) return 'bg-yellow-500';
    }
    return 'bg-red-500';
  };

  const getStatusText = (station: DemoStation) => {
    if (!station.isOnline) return 'Offline';
    if (station.lastHeartbeat) {
      const timeSinceHeartbeat = Date.now() - new Date(station.lastHeartbeat).getTime();
      if (timeSinceHeartbeat < 30000) return 'Online';
      if (timeSinceHeartbeat < 120000) return 'Warning';
    }
    return 'Disconnected';
  };

  const handleCreateStation = () => {
    if (!createForm.name.trim()) {
      toast({ title: 'Station name is required', variant: 'destructive' });
      return;
    }
    createStationMutation.mutate(createForm);
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Demo Stations</h1>
            <p className="text-slate-600 mt-2">
              Manage and monitor your organization's demo stations
            </p>
          </div>

          {(currentUser.role === 'admin' || currentUser.role === 'operator') && (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Station
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Demo Station</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="hardwareType">Hardware Type</Label>
                      <Select
                        value={createForm.hardwareType}
                        onValueChange={(value) => setCreateForm({ ...createForm, hardwareType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="actuator">Linear Actuator</SelectItem>
                          <SelectItem value="motor">Servo Motor</SelectItem>
                          <SelectItem value="stepper">Stepper Motor</SelectItem>
                          <SelectItem value="robotic_arm">Robotic Arm</SelectItem>
                          <SelectItem value="conveyor">Conveyor Belt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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

                  <div>
                    <h4 className="text-sm font-medium mb-3">Configuration</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="maxSpeed">Max Speed</Label>
                        <Input
                          id="maxSpeed"
                          type="number"
                          value={createForm.configuration.maxSpeed}
                          onChange={(e) => setCreateForm({
                            ...createForm,
                            configuration: {
                              ...createForm.configuration,
                              maxSpeed: parseInt(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxPosition">Max Position</Label>
                        <Input
                          id="maxPosition"
                          type="number"
                          value={createForm.configuration.maxPosition}
                          onChange={(e) => setCreateForm({
                            ...createForm,
                            configuration: {
                              ...createForm.configuration,
                              maxPosition: parseInt(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="minPosition">Min Position</Label>
                        <Input
                          id="minPosition"
                          type="number"
                          value={createForm.configuration.minPosition}
                          onChange={(e) => setCreateForm({
                            ...createForm,
                            configuration: {
                              ...createForm.configuration,
                              minPosition: parseInt(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Safety Limits</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="maxLoad">Max Load (kg)</Label>
                        <Input
                          id="maxLoad"
                          type="number"
                          value={createForm.safetyLimits.maxLoad}
                          onChange={(e) => setCreateForm({
                            ...createForm,
                            safetyLimits: {
                              ...createForm.safetyLimits,
                              maxLoad: parseInt(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxTemperature">Max Temperature (°C)</Label>
                        <Input
                          id="maxTemperature"
                          type="number"
                          value={createForm.safetyLimits.maxTemperature}
                          onChange={(e) => setCreateForm({
                            ...createForm,
                            safetyLimits: {
                              ...createForm.safetyLimits,
                              maxTemperature: parseInt(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                    </div>
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
          )}
        </div>

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
            {(currentUser.role === 'admin' || currentUser.role === 'operator') && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Demo Station
              </Button>
            )}
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
                        <Badge variant="outline">
                          {station.hardwareType}
                        </Badge>
                      </div>
                    </div>

                    {(currentUser.role === 'admin' || currentUser.role === 'operator') && (
                      <div className="flex space-x-1">
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
                          onClick={() => {
                            setSelectedStation(station);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {currentUser.role === 'admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteStation(station)}
                            disabled={deleteStationMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">
                    {station.description || 'No description available'}
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Last Heartbeat:</span>
                      <span className="text-slate-700">
                        {station.lastHeartbeat 
                          ? new Date(station.lastHeartbeat).toLocaleString()
                          : 'Never'
                        }
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Safety Limits:</span>
                      <span className="text-slate-700">
                        {station.safetyLimits?.maxLoad || 'N/A'} kg / {station.safetyLimits?.maxTemperature || 'N/A'}°C
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
             <Button onClick={() => { setSelectedStation(demoStations[0]); setIsDetailModalOpen(true);}} >Open Modal</Button>
          </div>
        )}
        

        {/* Station Details/Configuration Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Configure: {selectedStation?.name}</span>
              </DialogTitle>
            </DialogHeader>

            {selectedStation && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Station Name</Label>
                      <p className="text-sm text-slate-600">{selectedStation.name}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <div className="flex items-center space-x-2">
                        <Circle 
                          className={`w-3 h-3 ${getStatusColor(selectedStation)}`} 
                          fill="currentColor" 
                        />
                        <span className="text-sm">{getStatusText(selectedStation)}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Cameras</Label>
                      <p className="text-sm text-slate-600">{selectedStation.cameraCount || 1}</p>
                    </div>
                    <div>
                      <Label>Session Time Limit</Label>
                      <p className="text-sm text-slate-600">{selectedStation.sessionTimeLimit || 30} minutes</p>
                    </div>
                    <div>
                      <Label>Access</Label>
                      <p className="text-sm text-slate-600">
                        {selectedStation.requiresLogin ? 'Login Required' : 'Public Access'}
                      </p>
                    </div>
                    <div>
                      <Label>Created</Label>
                      <p className="text-sm text-slate-600">
                        {new Date(selectedStation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {selectedStation.description && (
                    <div className="mt-4">
                      <Label>Description</Label>
                      <p className="text-sm text-slate-600">{selectedStation.description}</p>
                    </div>
                  )}
                </div>

                {/* Control Configuration */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Control Configuration</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Configure buttons, joysticks, and control layout for this station.
                  </p>
                  <Button variant="outline" className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Open Control Builder
                  </Button>
                </div>

                {/* Camera Configuration */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Camera Configuration</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Configure camera feeds, switching, and display options.
                  </p>
                  <Button variant="outline" className="w-full">
                    <Cpu className="w-4 h-4 mr-2" />
                    Configure Cameras
                  </Button>
                </div>

                {/* Safety & Limits */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Safety & Limits</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Set hardware safety limits, emergency stop behavior, and operational boundaries.
                  </p>
                  <Button variant="outline" className="w-full">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Configure Safety Settings
                  </Button>
                </div>

                {/* Advanced Settings */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Advanced Settings</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Network settings, telemetry configuration, and custom commands.
                  </p>
                  <Button variant="outline" className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    Advanced Configuration
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}