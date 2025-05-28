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
import { ControlBuilderModal, type ControlWidget } from '@/components/control-builder-modal';
import { LayoutEditorModal, type LayoutConfig } from '@/components/layout-editor-modal';
import type { DemoStation } from '@shared/schema';

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
  const [isControlBuilderOpen, setIsControlBuilderOpen] = useState(false);
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);

  // State for station configuration
  const [config, setConfig] = useState<StationConfig>({
    name: '',
    description: '',
    cameraCount: 1,
    sessionTimeLimit: 5,
    requiresLogin: false,
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
  const [layout, setLayout] = useState<LayoutConfig>({
    camera: {
      width: 65,
      height: 80,
      position: { x: 5, y: 10 }
    },
    controlPanel: {
      width: 25,
      height: 80,
      position: { x: 72, y: 10 }
    }
  });

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
    return () => window.removeEventListener('organizationChanged', handleOrganizationChanged);
  }, [refetchStation, refetchControls]);

  // Initialize config when station loads
  useEffect(() => {
    if (station && !isLoading) {
      setConfig({
        name: station.name || '',
        description: station.description || '',
        cameraCount: station.cameraCount || 1,
        sessionTimeLimit: station.sessionTimeLimit || 5,
        requiresLogin: station.requiresLogin || false,
        requireApproval: station.requireApproval || false,
        safetyLimits: station.safetyLimits || {
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

      // Load saved layout if it exists
      if (station.configuration?.interfaceLayout) {
        setLayout(station.configuration.interfaceLayout);
      }
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

  const handleSaveControls = (newControls: ControlWidget[]) => {
    setControls(newControls);
    saveControlsMutation.mutate();
  };

  const handleSaveLayout = (newLayout: LayoutConfig) => {
    setLayout(newLayout);
    // Save layout to station configuration
    handleConfigChange({ 
      ...config, 
      interfaceLayout: newLayout 
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="text-center">Loading station configuration...</div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="text-center">Station not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
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
            <h1 className="text-3xl font-bold tracking-tight">Edit Station</h1>
            <p className="text-gray-600">Configure settings and controls for {station.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary">Unsaved changes</Badge>
          )}
          <Button 
            onClick={() => saveConfigMutation.mutate()}
            disabled={saveConfigMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <div className="border rounded-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="layout">Interface Layout</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>

          {/* Basic Settings Tab */}
          <TabsContent value="basic" className="space-y-6 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Station Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Station Name</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => handleConfigChange({ name: e.target.value })}
                  />
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
          <TabsContent value="controls" className="space-y-6 p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Gamepad2 className="w-5 h-5" />
                    <span>UI Controls Builder</span>
                  </div>
                  <Button onClick={() => setIsControlBuilderOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Open Control Builder
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {controls.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No controls configured yet</p>
                      <p className="text-sm mb-4">Use the drag-and-drop control builder to create custom UI controls</p>
                      <Button onClick={() => setIsControlBuilderOpen(true)} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Start Building Controls
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {controls.length} control{controls.length !== 1 ? 's' : ''} configured
                        </p>
                        <Button onClick={() => setIsControlBuilderOpen(true)} variant="outline" size="sm">
                          Edit Layout
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {controls.map((control) => (
                          <Card key={control.id} className="border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="capitalize">{control.type}</Badge>
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: control.style?.backgroundColor || '#3b82f6' }} />
                              </div>
                              <h4 className="font-medium text-sm mb-1">{control.name}</h4>
                              <p className="text-xs text-gray-500 mb-2">{control.command || 'No command set'}</p>
                              <div className="flex justify-between text-xs text-gray-400">
                                <span>{control.size?.width || 120}×{control.size?.height || 40}px</span>
                                <span>({control.position?.x || 0}, {control.position?.y || 0})</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Layout Tab */}
          <TabsContent value="layout" className="space-y-6 p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Interface Layout Designer</span>
                  </div>
                  <Button onClick={() => setIsLayoutEditorOpen(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Open Layout Editor
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-12 text-gray-500">
                    <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Customize Your Interface Layout</p>
                    <p className="text-sm mb-4">Drag and resize camera and control panel areas to create the perfect interface</p>
                    <Button onClick={() => setIsLayoutEditorOpen(true)} variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Start Layout Design
                    </Button>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Current Layout Settings</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Camera Area</p>
                        <p>Size: {layout.camera.width}% × {layout.camera.height}%</p>
                        <p>Position: ({Math.round(layout.camera.position.x)}%, {Math.round(layout.camera.position.y)}%)</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Control Panel</p>
                        <p>Size: {layout.controlPanel.width}% × {layout.controlPanel.height}%</p>
                        <p>Position: ({Math.round(layout.controlPanel.position.x)}%, {Math.round(layout.controlPanel.position.y)}%)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Safety Tab */}
          <TabsContent value="safety" className="space-y-6 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Safety Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Speed</Label>
                    <Input
                      type="number"
                      value={config.safetyLimits.maxSpeed}
                      onChange={(e) => handleSafetyLimitsChange({ maxSpeed: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Max Position</Label>
                    <Input
                      type="number"
                      value={config.safetyLimits.maxPosition}
                      onChange={(e) => handleSafetyLimitsChange({ maxPosition: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Min Position</Label>
                  <Input
                    type="number"
                    value={config.safetyLimits.minPosition}
                    onChange={(e) => handleSafetyLimitsChange({ minPosition: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.safetyLimits.emergencyStopEnabled}
                    onCheckedChange={(checked) => handleSafetyLimitsChange({ emergencyStopEnabled: checked })}
                  />
                  <Label>Emergency Stop Enabled</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="space-y-6 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Network Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Connection Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={config.networkSettings.connectionTimeout}
                    onChange={(e) => handleNetworkSettingsChange({ connectionTimeout: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Heartbeat Interval (ms)</Label>
                  <Input
                    type="number"
                    value={config.networkSettings.heartbeatInterval}
                    onChange={(e) => handleNetworkSettingsChange({ heartbeatInterval: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Max Retries</Label>
                  <Input
                    type="number"
                    value={config.networkSettings.maxRetries}
                    onChange={(e) => handleNetworkSettingsChange({ maxRetries: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Control Builder Modal */}
      <ControlBuilderModal
        isOpen={isControlBuilderOpen}
        onClose={() => setIsControlBuilderOpen(false)}
        controls={controls}
        onSaveControls={handleSaveControls}
      />

      {/* Layout Editor Modal */}
      <LayoutEditorModal
        isOpen={isLayoutEditorOpen}
        onClose={() => setIsLayoutEditorOpen(false)}
        layout={layout}
        onSaveLayout={handleSaveLayout}
      />
    </div>
  );
}