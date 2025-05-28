import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Plus, Trash2, Settings, Gamepad2, Sliders, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getCurrentUser } from '@/lib/auth';
import type { DemoStation } from '@shared/schema';

interface ControlWidget {
  id: string;
  name: string;
  type: 'button' | 'slider' | 'toggle';
  command: string;
  parameters?: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
}




interface StationConfig {
  name: string;
  description: string;
  cameraCount: number;
  sessionTimeLimit: number;
  requiresLogin: boolean;
  requireApproval: boolean;
  safetyLimits: {
    maxSpeed: number;
    maxPosition: number;
    minPosition: number;
    emergencyStopEnabled: boolean;
  };
  networkSettings: {
    connectionTimeout: number;
    heartbeatInterval: number;
    maxRetries: number;
  };
}

export default function StationEditor() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState('basic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch station data
  const { data: station, isLoading, refetch: refetchStation } = useQuery<DemoStation>({
    queryKey: [`/api/demo-stations/${id}`],
    enabled: !!id,
  });

  // Fetch control configuration
  const { data: controlConfig, refetch: refetchControls } = useQuery({
    queryKey: [`/api/demo-stations/${id}/controls`],
    enabled: !!id,
  });

  // Listen for organization changes and refetch data
  useEffect(() => {
    const handleOrganizationChanged = () => {
      console.log('Station Editor: Organization changed, refetching station data');
      refetchStation();
      refetchControls();
    };

    window.addEventListener('organizationChanged', handleOrganizationChanged);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChanged);
    };
  }, [refetchStation, refetchControls]);

  console.log('Control config from API:', controlConfig);

  const [config, setConfig] = useState<StationConfig>({
    name: '',
    description: '',
    cameraCount: 1,
    sessionTimeLimit: 30,
    requiresLogin: true,
    requireApproval: false,
    safetyLimits: {
      maxSpeed: 100,
      maxPosition: 500,
      minPosition: -500,
      emergencyStopEnabled: true,
    },
    networkSettings: {
      connectionTimeout: 5000,
      heartbeatInterval: 1000,
      maxRetries: 3,
    },
  });

  const [controls, setControls] = useState<ControlWidget[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize config when station data loads
  React.useEffect(() => {
    if (station && !isLoading) {
      console.log('Loading station data:', station);
      setConfig({
        name: station.name || '',
        description: station.description || '',
        cameraCount: station.cameraCount || 1,
        sessionTimeLimit: station.sessionTimeLimit || 30,
        requiresLogin: station.requiresLogin ?? true,
        requireApproval: station.requireApproval ?? false,
        safetyLimits: {
          maxSpeed: 100,
          maxPosition: 500,
          minPosition: -500,
          emergencyStopEnabled: true,
        },
        networkSettings: {
          connectionTimeout: 5000,
          heartbeatInterval: 1000,
          maxRetries: 3,
        },
      });
    }
  }, [station, isLoading]);

  // Initialize controls when control config loads
  React.useEffect(() => {
    if (controlConfig?.controls && Array.isArray(controlConfig.controls)) {
      console.log('Loading controls:', controlConfig.controls);
      setControls(controlConfig.controls);
    }
  }, [controlConfig]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/demo-stations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(config),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo-stations'] });
      setHasUnsavedChanges(false);
      toast({ title: 'Configuration saved successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to save configuration', variant: 'destructive' });
    },
  });

  // Save controls mutation
  const saveControlsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/demo-stations/${id}/controls`, {
        method: 'POST',
        body: JSON.stringify({ 
          controls: controls,
          layout: {},
          demoStationId: id,
          createdBy: currentUser?.id
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/demo-stations/${id}/controls`] });
      toast({ title: 'Controls saved successfully' });
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({ title: 'Failed to save controls', variant: 'destructive' });
    },
  });

  const handleConfigChange = (updates: Partial<StationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleSafetyLimitsChange = (updates: Partial<StationConfig['safetyLimits']>) => {
    setConfig(prev => ({ 
      ...prev, 
      safetyLimits: { ...prev.safetyLimits, ...updates }
    }));
    setHasUnsavedChanges(true);
  };

  const handleNetworkSettingsChange = (updates: Partial<StationConfig['networkSettings']>) => {
    setConfig(prev => ({ 
      ...prev, 
      networkSettings: { ...prev.networkSettings, ...updates }
    }));
    setHasUnsavedChanges(true);
  };

  const addControl = (type: ControlWidget['type']) => {
    const newControl: ControlWidget = {
      id: `control_${Date.now()}`,
      type,
      name: `New ${type}`,
      command: '',
      position: { x: 50, y: 50 },
      size: { width: 100, height: 40 },
    };
    setControls(prev => [...prev, newControl]);
  };

  const updateControl = (id: string, updates: Partial<ControlWidget>) => {
    setControls(prev => prev.map(control => 
      control.id === id ? { ...control, ...updates } : control
    ));
  };

  const removeControl = (id: string) => {
    setControls(prev => prev.filter(control => control.id !== id));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!station) {
    return <div className="flex items-center justify-center h-full">Station not found</div>;
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation('/stations')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Stations
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Configure: {station.name}</h1>
              <p className="text-sm text-slate-600">Set up controls, parameters, and station behavior</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Unsaved Changes
              </Badge>
            )}
            <Button 
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="controls">UI Controls</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Settings Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Station Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Station Name</Label>
                    <Input
                      id="name"
                      value={config.name}
                      onChange={(e) => handleConfigChange({ name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessionTime">Session Time Limit (minutes)</Label>
                    <Input
                      id="sessionTime"
                      type="number"
                      value={config.sessionTimeLimit}
                      onChange={(e) => handleConfigChange({ sessionTimeLimit: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={config.description}
                    onChange={(e) => handleConfigChange({ description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="cameraCount">Camera Count</Label>
                    <Select 
                      value={config.cameraCount.toString()}
                      onValueChange={(value) => handleConfigChange({ cameraCount: parseInt(value) })}
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
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Access Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="requiresLogin" className="text-base font-medium">Require User Login</Label>
                        <p className="text-sm text-gray-500">Users must be logged in to access this station</p>
                      </div>
                      <Switch
                        id="requiresLogin"
                        checked={config.requiresLogin}
                        onCheckedChange={(checked) => handleConfigChange({ requiresLogin: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="requireApproval" className="text-base font-medium">Require Admin Approval</Label>
                        <p className="text-sm text-gray-500">Customer accounts must be approved by an admin before accessing this station</p>
                      </div>
                      <Switch
                        id="requireApproval"
                        checked={config.requireApproval}
                        onCheckedChange={(checked) => handleConfigChange({ requireApproval: checked })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Controls Tab */}
          <TabsContent value="controls" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Gamepad2 className="w-5 h-5" />
                    <span>UI Controls Builder</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" onClick={() => addControl('button')}>
                      <Plus className="w-4 h-4 mr-1" />
                      Button
                    </Button>
                    <Button size="sm" onClick={() => addControl('slider')}>
                      <Plus className="w-4 h-4 mr-1" />
                      Slider
                    </Button>
                    <Button size="sm" onClick={() => addControl('toggle')}>
                      <Plus className="w-4 h-4 mr-1" />
                      Toggle
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {controls.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No controls configured yet</p>
                      <p className="text-sm">Add buttons, sliders, or joysticks to build your interface</p>
                    </div>
                  ) : (
                    controls.map((control) => (
                      <Card key={control.id} className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="outline">{control.type}</Badge>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => removeControl(control.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Control Name</Label>
                              <Input
                                value={control.name}
                                onChange={(e) => updateControl(control.id, { name: e.target.value })}
                                placeholder="e.g., Move Forward"
                              />
                            </div>
                            <div>
                              <Label>Command</Label>
                              <Input
                                value={control.command}
                                onChange={(e) => updateControl(control.id, { command: e.target.value })}
                                placeholder="e.g., MOVE_FORWARD"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
                {controls.length > 0 && (
                  <div className="flex justify-between items-center pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Gamepad2 className="w-4 h-4 mr-2" />
                      {showPreview ? 'Hide Preview' : 'Show Live Preview'}
                    </Button>
                    <Button 
                      onClick={() => saveControlsMutation.mutate()}
                      disabled={saveControlsMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveControlsMutation.isPending ? 'Saving...' : 'Save Controls'}
                    </Button>
                  </div>
                )}
                
                {/* Live Preview Panel */}
                {showPreview && controls.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Live Control Preview</CardTitle>
                      <p className="text-sm text-slate-600">This is how your controls will appear to users</p>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-slate-50 p-6 rounded-lg min-h-[200px] relative">
                        <div className="grid grid-cols-3 gap-4">
                          {controls.map((control) => (
                            <div key={control.id} className="flex flex-col space-y-2">
                              {control.type === 'button' && (
                                <Button className="w-full" disabled>
                                  {control.name || 'Unnamed Button'}
                                </Button>
                              )}
                              {control.type === 'slider' && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">
                                    {control.name || 'Unnamed Slider'}
                                  </Label>
                                  <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    defaultValue="50"
                                    className="w-full"
                                    disabled
                                  />
                                </div>
                              )}
                              {control.type === 'toggle' && (
                                <div className="flex items-center space-x-2">
                                  <input 
                                    type="checkbox" 
                                    disabled
                                    className="w-4 h-4"
                                  />
                                  <Label className="text-sm">
                                    {control.name || 'Unnamed Toggle'}
                                  </Label>
                                </div>
                              )}
                              <p className="text-xs text-slate-500">
                                Command: {control.command || 'No command'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parameters Tab */}
          <TabsContent value="parameters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5" />
                  <span>Safety & Operation Parameters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Movement Limits</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="maxSpeed">Max Speed</Label>
                      <Input
                        id="maxSpeed"
                        type="number"
                        value={config.safetyLimits.maxSpeed}
                        onChange={(e) => handleSafetyLimitsChange({ maxSpeed: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPosition">Max Position</Label>
                      <Input
                        id="maxPosition"
                        type="number"
                        value={config.safetyLimits.maxPosition}
                        onChange={(e) => handleSafetyLimitsChange({ maxPosition: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="minPosition">Min Position</Label>
                      <Input
                        id="minPosition"
                        type="number"
                        value={config.safetyLimits.minPosition}
                        onChange={(e) => handleSafetyLimitsChange({ minPosition: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center space-x-2">
                  <Switch
                    id="emergencyStop"
                    checked={config.safetyLimits.emergencyStopEnabled}
                    onCheckedChange={(checked) => handleSafetyLimitsChange({ emergencyStopEnabled: checked })}
                  />
                  <Label htmlFor="emergencyStop">Enable Emergency Stop</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <RotateCcw className="w-5 h-5" />
                  <span>Network & Connection Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="connectionTimeout">Connection Timeout (ms)</Label>
                    <Input
                      id="connectionTimeout"
                      type="number"
                      value={config.networkSettings.connectionTimeout}
                      onChange={(e) => handleNetworkSettingsChange({ connectionTimeout: parseInt(e.target.value) || 5000 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="heartbeatInterval">Heartbeat Interval (ms)</Label>
                    <Input
                      id="heartbeatInterval"
                      type="number"
                      value={config.networkSettings.heartbeatInterval}
                      onChange={(e) => handleNetworkSettingsChange({ heartbeatInterval: parseInt(e.target.value) || 1000 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxRetries">Max Retries</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      value={config.networkSettings.maxRetries}
                      onChange={(e) => handleNetworkSettingsChange({ maxRetries: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}