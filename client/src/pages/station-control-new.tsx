import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { Play, Settings, Eye, Edit2, Save, X, Grid, Square, Monitor } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function StationControl() {
  const { id } = useParams<{ id: string }>();
  const currentUser = getCurrentUser();
  
  // State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedControl, setSelectedControl] = useState<string | null>(null);
  const [localControls, setLocalControls] = useState<ControlWidget[]>([]);
  const [localLayout, setLocalLayout] = useState<any>(null);
  const [draggedControl, setDraggedControl] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<string | null>(null);
  const [draggingPanel, setDraggingPanel] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const [showCanvasBorder, setShowCanvasBorder] = useState(false);

  // Grid configuration
  const GRID_SIZE = 20;
  const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  // Default layout
  const defaultLayout = {
    camera: { width: 920, height: 540, position: { x: 40, y: 40 } },
    controlPanel: { width: 900, height: 540, position: { x: 980, y: 40 } }
  };

  // Fetch station data
  const { data: stationData, isLoading } = useQuery<DemoStation>({
    queryKey: ['/api/demo-stations', id],
    enabled: !!id,
  });

  // Fetch controls
  const { data: controlsData, refetch: refetchControls } = useQuery({
    queryKey: ['/api/demo-stations', id, 'controls'],
    enabled: !!id,
  });

  const station = stationData;

  // Initialize controls and layout
  useEffect(() => {
    if (controlsData && typeof controlsData === 'object' && 'controls' in controlsData) {
      setLocalControls((controlsData as any).controls || []);
    }
    if (controlsData && typeof controlsData === 'object' && 'layout' in controlsData) {
      setLocalLayout((controlsData as any).layout || defaultLayout);
    } else if (station?.configuration?.interfaceLayout) {
      setLocalLayout(station.configuration.interfaceLayout);
    } else {
      setLocalLayout(defaultLayout);
    }
  }, [controlsData, station]);

  // Event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, controlId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    
    setSelectedControl(controlId);
    
    const control = localControls.find(c => c.id === controlId);
    if (!control) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = (e.target as HTMLElement).closest('.relative.w-full')?.getBoundingClientRect();
    
    if (containerRect) {
      setDragOffset({
        x: e.clientX - (containerRect.left + control.position.x),
        y: e.clientY - (containerRect.top + control.position.y)
      });
    }
    
    setDraggedControl(controlId);
  }, [isEditMode, localControls]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedControl || !isEditMode) return;
    
    const container = document.querySelector('.flex-1.relative.overflow-hidden') as HTMLElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const newX = snapToGrid(e.clientX - containerRect.left - dragOffset.x);
    const newY = snapToGrid(e.clientY - containerRect.top - dragOffset.y);
    
    setLocalControls(prev => prev.map(control => 
      control.id === draggedControl 
        ? { ...control, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
        : control
    ));
  }, [draggedControl, isEditMode, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggedControl(null);
    setResizing(null);
    setDraggingPanel(null);
  }, []);

  // Panel resize handlers
  const handlePanelMouseDown = useCallback((e: React.MouseEvent, panelType: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingPanel(panelType);
  }, [isEditMode]);

  const handlePanelDragMove = useCallback((e: MouseEvent) => {
    if (!draggingPanel || !isEditMode) return;
    
    const container = document.querySelector('.relative.w-full[style*="calc(100% - 3rem)"]') as HTMLElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const newX = snapToGrid(e.clientX - containerRect.left);
    const newY = snapToGrid(e.clientY - containerRect.top);
    
    setLocalLayout((prev: any) => ({
      ...prev,
      [draggingPanel]: {
        ...prev[draggingPanel],
        position: { x: Math.max(0, newX), y: Math.max(0, newY) }
      }
    }));
  }, [draggingPanel, isEditMode, snapToGrid]);

  // Resize handlers
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, panelType: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setResizing(panelType);
  }, [isEditMode]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing || !isEditMode) return;
    
    const container = document.querySelector('.relative.w-full[style*="calc(100% - 3rem)"]') as HTMLElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const panel = localLayout?.[resizing];
    if (!panel) return;
    
    const newWidth = snapToGrid(e.clientX - containerRect.left - panel.position.x);
    const newHeight = snapToGrid(e.clientY - containerRect.top - panel.position.y);
    
    setLocalLayout((prev: any) => ({
      ...prev,
      [resizing]: {
        ...prev[resizing],
        width: Math.max(100, newWidth),
        height: Math.max(100, newHeight)
      }
    }));
  }, [resizing, isEditMode, localLayout, snapToGrid]);

  // Attach global event listeners
  useEffect(() => {
    if (isEditMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mousemove', handlePanelDragMove);
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mousemove', handlePanelDragMove);
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isEditMode, handleMouseMove, handlePanelDragMove, handleResizeMove, handleMouseUp]);

  // Save changes
  const saveControls = async () => {
    try {
      const response = await fetch(`/api/demo-stations/${id}/controls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ 
          demoStationId: id,
          controls: localControls,
          layout: localLayout || {},
          createdBy: currentUser?.id
        }),
      });

      if (response.ok && localLayout) {
        const stationUpdateResponse = await fetch(`/api/demo-stations/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            configuration: {
              ...station?.configuration,
              interfaceLayout: localLayout
            }
          }),
        });

        if (stationUpdateResponse.ok) {
          console.log('Layout saved successfully');
          refetchControls();
        }
      }

      if (response.ok) {
        console.log('Save successful');
      } else {
        console.error('Save failed:', await response.json());
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  // Add new control
  const addControl = (type: 'button' | 'slider' | 'joystick' | 'toggle') => {
    const newControl: ControlWidget = {
      id: `control-${Date.now()}`,
      type,
      name: `New ${type}`,
      command: '',
      position: { x: 100, y: 100 },
      size: { width: 100, height: 40 },
      style: {
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        borderColor: '#1e40af',
        borderRadius: 6,
        fontSize: 14
      }
    };
    
    setLocalControls(prev => [...prev, newControl]);
    setSelectedControl(newControl.id);
  };

  // Delete control
  const deleteControl = (controlId: string) => {
    setLocalControls(prev => prev.filter(c => c.id !== controlId));
    if (selectedControl === controlId) {
      setSelectedControl(null);
    }
  };

  // Update control properties
  const updateControl = (controlId: string, updates: Partial<ControlWidget>) => {
    setLocalControls(prev => prev.map(control => 
      control.id === controlId ? { ...control, ...updates } : control
    ));
  };

  // Control rendering
  const renderControl = (control: ControlWidget) => {
    const isSelected = selectedControl === control.id && isEditMode;
    
    return (
      <div
        key={control.id}
        className={`absolute cursor-${isEditMode ? 'move' : 'pointer'} select-none ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          left: control.position.x,
          top: control.position.y,
          width: control.size.width,
          height: control.size.height,
        }}
        onMouseDown={(e) => handleMouseDown(e, control.id)}
        onClick={() => isEditMode && setSelectedControl(control.id)}
      >
        {control.type === 'button' && (
          <button
            className="w-full h-full rounded flex items-center justify-center text-white font-medium border-2"
            style={{
              backgroundColor: control.style.backgroundColor,
              color: control.style.textColor,
              borderColor: control.style.borderColor,
              borderRadius: control.style.borderRadius,
              fontSize: control.style.fontSize,
            }}
          >
            {control.name}
          </button>
        )}
        
        {control.type === 'slider' && (
          <div className="w-full h-full flex items-center">
            <input
              type="range"
              className="w-full"
              style={{ accentColor: control.style.backgroundColor }}
              disabled={isEditMode}
            />
          </div>
        )}
        
        {control.type === 'toggle' && (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="toggle"
              disabled={isEditMode}
            />
            <span style={{ color: control.style.textColor, fontSize: control.style.fontSize }}>
              {control.name}
            </span>
          </label>
        )}
        
        {control.type === 'joystick' && (
          <div 
            className="w-full h-full rounded-full border-4 relative"
            style={{
              borderColor: control.style.borderColor,
              backgroundColor: control.style.backgroundColor + '20'
            }}
          >
            <div 
              className="absolute w-6 h-6 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: control.style.backgroundColor }}
            />
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!station) {
    return <div className="flex items-center justify-center h-screen">Station not found</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{station.name}</h1>
            <p className="text-gray-600">{station.description}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {!isEditMode && (
              <>
                <Button
                  onClick={() => setIsSessionActive(!isSessionActive)}
                  className={`${isSessionActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isSessionActive ? 'End Session' : 'Start Session'}
                </Button>
                
                <Button variant="outline" onClick={() => setIsEditMode(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
            
            {isEditMode && (
              <>
                <Button onClick={saveControls} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                
                <Button variant="outline" onClick={() => {
                  setIsEditMode(false);
                  setSelectedControl(null);
                }}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-5rem)]">
        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden">
          <div 
            className="relative w-full h-full"
            style={{ 
              width: canvasSize.width, 
              height: canvasSize.height,
              backgroundImage: showGrid ? `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              ` : 'none',
              backgroundSize: showGrid ? `${GRID_SIZE}px ${GRID_SIZE}px` : 'auto',
              border: showCanvasBorder ? '2px dashed #8b5cf6' : 'none',
            }}
          >
            {/* Camera Panel */}
            {localLayout?.camera && (
              <div
                className={`absolute bg-gray-900 rounded-lg flex items-center justify-center text-white ${isEditMode ? 'cursor-move' : ''}`}
                style={{
                  left: localLayout.camera.position.x,
                  top: localLayout.camera.position.y,
                  width: localLayout.camera.width,
                  height: localLayout.camera.height,
                  border: isEditMode ? '2px solid #3b82f6' : 'none'
                }}
                onMouseDown={(e) => handlePanelMouseDown(e, 'camera')}
              >
                <Monitor className="w-8 h-8 mr-2" />
                <span>Live Camera Feed</span>
                
                {isEditMode && (
                  <>
                    {/* Drag Handle */}
                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded cursor-move" />
                    
                    {/* Resize Handle */}
                    <div 
                      className="absolute bottom-1 right-1 w-4 h-4 bg-blue-500 cursor-se-resize"
                      onMouseDown={(e) => handleResizeMouseDown(e, 'camera')}
                    />
                  </>
                )}
              </div>
            )}

            {/* Control Panel */}
            {localLayout?.controlPanel && (
              <div
                className={`absolute bg-gray-50 border-2 border-gray-200 rounded-lg ${isEditMode ? 'cursor-move' : ''}`}
                style={{
                  left: localLayout.controlPanel.position.x,
                  top: localLayout.controlPanel.position.y,
                  width: localLayout.controlPanel.width,
                  height: localLayout.controlPanel.height,
                  border: isEditMode ? '2px solid #10b981' : '2px solid #e5e7eb'
                }}
                onMouseDown={(e) => handlePanelMouseDown(e, 'controlPanel')}
              >
                {/* Controls */}
                {localControls.map(renderControl)}
                
                {isEditMode && (
                  <>
                    {/* Drag Handle */}
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded cursor-move" />
                    
                    {/* Resize Handle */}
                    <div 
                      className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 cursor-se-resize"
                      onMouseDown={(e) => handleResizeMouseDown(e, 'controlPanel')}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Toolbox */}
        {isEditMode && (
          <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Toolbox</h3>
            
            {/* Canvas Options */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Canvas</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showGrid"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                  />
                  <label htmlFor="showGrid" className="text-sm">Show Grid</label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showBorder"
                    checked={showCanvasBorder}
                    onChange={(e) => setShowCanvasBorder(e.target.checked)}
                  />
                  <label htmlFor="showBorder" className="text-sm">Show Canvas Border</label>
                </div>
                
                <div>
                  <Label htmlFor="resolution">Resolution</Label>
                  <Select
                    value={`${canvasSize.width}x${canvasSize.height}`}
                    onValueChange={(value) => {
                      const [width, height] = value.split('x').map(Number);
                      setCanvasSize({ width, height });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">HD (1920×1080)</SelectItem>
                      <SelectItem value="2560x1440">2K (2560×1440)</SelectItem>
                      <SelectItem value="3840x2160">4K (3840×2160)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Add Controls */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Add Controls</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addControl('button')}
                  className="w-full"
                >
                  Button
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addControl('slider')}
                  className="w-full"
                >
                  Slider
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addControl('toggle')}
                  className="w-full"
                >
                  Toggle
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addControl('joystick')}
                  className="w-full"
                >
                  Joystick
                </Button>
              </div>
            </div>

            {/* Selected Control Properties */}
            {selectedControl && (
              <div className="mb-6">
                <h4 className="font-medium mb-3">Control Properties</h4>
                {(() => {
                  const control = localControls.find(c => c.id === selectedControl);
                  if (!control) return null;
                  
                  return (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="controlName">Name</Label>
                        <Input
                          id="controlName"
                          value={control.name}
                          onChange={(e) => updateControl(control.id, { name: e.target.value })}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="controlCommand">Command</Label>
                        <Input
                          id="controlCommand"
                          value={control.command}
                          onChange={(e) => updateControl(control.id, { command: e.target.value })}
                          placeholder="e.g., move_forward"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="backgroundColor">Background Color</Label>
                        <Input
                          id="backgroundColor"
                          type="color"
                          value={control.style.backgroundColor}
                          onChange={(e) => updateControl(control.id, { 
                            style: { ...control.style, backgroundColor: e.target.value }
                          })}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="textColor">Text Color</Label>
                        <Input
                          id="textColor"
                          type="color"
                          value={control.style.textColor}
                          onChange={(e) => updateControl(control.id, { 
                            style: { ...control.style, textColor: e.target.value }
                          })}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="positionX">X Position</Label>
                          <Input
                            id="positionX"
                            type="number"
                            value={control.position.x}
                            onChange={(e) => updateControl(control.id, { 
                              position: { ...control.position, x: Number(e.target.value) }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="positionY">Y Position</Label>
                          <Input
                            id="positionY"
                            type="number"
                            value={control.position.y}
                            onChange={(e) => updateControl(control.id, { 
                              position: { ...control.position, y: Number(e.target.value) }
                            })}
                          />
                        </div>
                      </div>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteControl(control.id)}
                        className="w-full"
                      >
                        Delete Control
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}