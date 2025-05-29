import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { Play, Edit2, Save, X, Monitor, Move, Grid3X3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

export default function StationControlSimple() {
  const { id } = useParams<{ id: string }>();
  const currentUser = getCurrentUser();
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [toolboxPosition, setToolboxPosition] = useState({ x: 50, y: 100 });
  const [isDraggingToolbox, setIsDraggingToolbox] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cameraPanel, setCameraPanel] = useState({ x: 40, y: 40, width: 920, height: 540 });
  const [controlPanel, setControlPanel] = useState({ x: 980, y: 40, width: 900, height: 540 });
  const [isDraggingPanel, setIsDraggingPanel] = useState<string | null>(null);
  const [isResizingPanel, setIsResizingPanel] = useState<string | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);

  // Snap to grid function
  const snapToGrid = (value: number, gridSize: number = 20) => {
    return Math.round(value / gridSize) * gridSize;
  };

  // Fetch station data
  const { data: stationData, isLoading } = useQuery<DemoStation>({
    queryKey: ['/api/demo-stations', id],
    enabled: !!id,
  });

  // Fetch saved control configuration
  const { data: controlConfig } = useQuery({
    queryKey: ['/api/demo-stations', id, 'controls'],
    enabled: !!id,
  });

  // Load saved layout when control config is available
  useEffect(() => {
    console.log('Control config loaded:', controlConfig);
    if (controlConfig?.layout) {
      console.log('Layout found:', controlConfig.layout);
      const { camera, controlPanel: control } = controlConfig.layout;
      if (camera) {
        console.log('Setting camera panel:', camera);
        setCameraPanel({
          x: camera.position?.x || 40,
          y: camera.position?.y || 40,
          width: camera.width || 920,
          height: camera.height || 540
        });
      }
      if (control) {
        console.log('Setting control panel:', control);
        setControlPanel({
          x: control.position?.x || 980,
          y: control.position?.y || 40,
          width: control.width || 900,
          height: control.height || 540
        });
      }
    }
  }, [controlConfig]);

  // Dragging functionality for toolbox
  const handleToolboxMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingToolbox(true);
    setDragOffset({
      x: e.clientX - toolboxPosition.x,
      y: e.clientY - toolboxPosition.y
    });
  }, [toolboxPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingToolbox) return;
    
    setToolboxPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  }, [isDraggingToolbox, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingToolbox(false);
  }, []);

  // Panel drag and resize handlers
  const handlePanelMouseDown = useCallback((e: React.MouseEvent, panelType: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPanel(panelType);
    
    const panel = panelType === 'camera' ? cameraPanel : controlPanel;
    setDragOffset({
      x: e.clientX - panel.x,
      y: e.clientY - panel.y
    });
  }, [isEditMode, cameraPanel, controlPanel]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, panelType: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizingPanel(panelType);
  }, [isEditMode]);

  const handlePanelMove = useCallback((e: MouseEvent) => {
    if (isDraggingPanel) {
      const rawX = Math.max(0, e.clientX - dragOffset.x);
      const rawY = Math.max(0, e.clientY - dragOffset.y);
      const snappedX = snapToGrid(rawX);
      const snappedY = snapToGrid(rawY);
      
      if (isDraggingPanel === 'camera') {
        setCameraPanel(prev => ({ ...prev, x: snappedX, y: snappedY }));
      } else if (isDraggingPanel === 'control') {
        setControlPanel(prev => ({ ...prev, x: snappedX, y: snappedY }));
      }
    }
    
    if (isResizingPanel) {
      const panel = isResizingPanel === 'camera' ? cameraPanel : controlPanel;
      const rawWidth = Math.max(100, e.clientX - panel.x);
      const rawHeight = Math.max(100, e.clientY - panel.y);
      const snappedWidth = snapToGrid(rawWidth);
      const snappedHeight = snapToGrid(rawHeight);
      
      if (isResizingPanel === 'camera') {
        setCameraPanel(prev => ({ ...prev, width: snappedWidth, height: snappedHeight }));
      } else if (isResizingPanel === 'control') {
        setControlPanel(prev => ({ ...prev, width: snappedWidth, height: snappedHeight }));
      }
    }
  }, [isDraggingPanel, isResizingPanel, dragOffset, cameraPanel, controlPanel, snapToGrid]);

  useEffect(() => {
    if (isDraggingToolbox || isDraggingPanel || isResizingPanel) {
      const mouseMoveHandler = (e: MouseEvent) => {
        if (isDraggingToolbox) {
          setToolboxPosition({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y
          });
        } else {
          handlePanelMove(e);
        }
      };
      
      const mouseUpHandler = () => {
        setIsDraggingToolbox(false);
        setIsDraggingPanel(null);
        setIsResizingPanel(null);
      };
      
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      
      return () => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
      };
    }
  }, [isDraggingToolbox, isDraggingPanel, isResizingPanel, dragOffset, handlePanelMove]);

  // Save functionality
  const handleSave = async () => {
    try {
      const response = await fetch(`/api/demo-stations/${id}/controls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ 
          demoStationId: id,
          controls: [],
          layout: {
            camera: { 
              width: cameraPanel.width, 
              height: cameraPanel.height, 
              position: { x: cameraPanel.x, y: cameraPanel.y } 
            },
            controlPanel: { 
              width: controlPanel.width, 
              height: controlPanel.height, 
              position: { x: controlPanel.x, y: controlPanel.y } 
            }
          },
          createdBy: currentUser?.id
        }),
      });

      if (response.ok) {
        console.log('Settings saved successfully');
        alert('Settings saved successfully!');
      } else {
        console.error('Save failed:', await response.json());
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-lg">Loading station...</div>
      </div>
    );
  }

  if (!stationData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-lg">Station not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{stationData.name}</h1>
            <p className="text-gray-600">{stationData.description}</p>
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
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                
                <Button variant="outline" onClick={() => setIsEditMode(false)}>
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
        <div className="flex-1 relative overflow-hidden bg-gray-50">
          <div 
            className="relative w-full h-full p-8"
            style={{ 
              backgroundImage: showGrid ? `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              ` : 'none',
              backgroundSize: showGrid ? '20px 20px' : 'auto',
              border: showGrid ? '2px dashed #8b5cf6' : 'none',
            }}
          >
            {/* Camera Panel */}
            <div className="absolute bg-gray-900 rounded-lg flex items-center justify-center text-white"
                 style={{
                   left: cameraPanel.x,
                   top: cameraPanel.y,
                   width: cameraPanel.width,
                   height: cameraPanel.height,
                   border: isEditMode ? (selectedPanel === 'camera' ? '3px solid #3b82f6' : '2px solid #3b82f6') : 'none'
                 }}
                 onClick={() => isEditMode && setSelectedPanel('camera')}>
              <Monitor className="w-8 h-8 mr-2" />
              <span>Live Camera Feed</span>
              
              {/* Drag Handle */}
              {isEditMode && (
                <div 
                  className="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded cursor-move flex items-center justify-center"
                  onMouseDown={(e) => handlePanelMouseDown(e, 'camera')}
                >
                  <Move className="w-4 h-4 text-white" />
                </div>
              )}
              
              {/* Resize Handle */}
              {isEditMode && (
                <div 
                  className="absolute bottom-2 right-2 w-6 h-6 bg-blue-500 rounded cursor-nw-resize flex items-center justify-center"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'camera')}
                >
                  <div className="w-3 h-3 border-r-2 border-b-2 border-white"></div>
                </div>
              )}
            </div>

            {/* Control Panel */}
            <div className="absolute bg-white border-2 border-gray-200 rounded-lg"
                 style={{
                   left: controlPanel.x,
                   top: controlPanel.y,
                   width: controlPanel.width,
                   height: controlPanel.height,
                   border: isEditMode ? (selectedPanel === 'control' ? '3px solid #10b981' : '2px solid #10b981') : '2px solid #e5e7eb'
                 }}
                 onClick={() => isEditMode && setSelectedPanel('control')}>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Controls</h3>
                <p className="text-gray-600">Control widgets will appear here</p>
              </div>
              
              {/* Drag Handle */}
              {isEditMode && (
                <div 
                  className="absolute top-2 left-2 w-6 h-6 bg-green-500 rounded cursor-move flex items-center justify-center"
                  onMouseDown={(e) => handlePanelMouseDown(e, 'control')}
                >
                  <Move className="w-4 h-4 text-white" />
                </div>
              )}
              
              {/* Resize Handle */}
              {isEditMode && (
                <div 
                  className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded cursor-nw-resize flex items-center justify-center"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'control')}
                >
                  <div className="w-3 h-3 border-r-2 border-b-2 border-white"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Draggable Toolbox */}
        {isEditMode && (
          <div 
            className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-50 w-80 max-h-96 overflow-y-auto"
            style={{
              left: toolboxPosition.x,
              top: toolboxPosition.y,
            }}
          >
            {/* Draggable Header */}
            <div 
              className="bg-gray-100 px-4 py-3 border-b border-gray-200 cursor-move flex items-center justify-between rounded-t-lg"
              onMouseDown={handleToolboxMouseDown}
            >
              <h3 className="text-lg font-semibold flex items-center">
                <Move className="w-4 h-4 mr-2" />
                Edit Toolbox
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditMode(false)}
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4">
              {/* Canvas Options */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center">
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Canvas
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="showGrid" 
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                    />
                    <label htmlFor="showGrid" className="text-sm">Show Grid & Border</label>
                  </div>
                </div>
              </div>

              {/* Add Controls */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Add Controls</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="w-full">Button</Button>
                  <Button variant="outline" size="sm" className="w-full">Slider</Button>
                  <Button variant="outline" size="sm" className="w-full">Toggle</Button>
                  <Button variant="outline" size="sm" className="w-full">Joystick</Button>
                </div>
              </div>

              {/* Selected Panel Properties */}
              {selectedPanel && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3">
                    {selectedPanel === 'camera' ? 'Camera Panel' : 'Control Panel'} Properties
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="panelX">X Position</Label>
                        <Input 
                          id="panelX" 
                          type="number" 
                          value={selectedPanel === 'camera' ? cameraPanel.x : controlPanel.x}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            if (selectedPanel === 'camera') {
                              setCameraPanel(prev => ({ ...prev, x: value }));
                            } else {
                              setControlPanel(prev => ({ ...prev, x: value }));
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="panelY">Y Position</Label>
                        <Input 
                          id="panelY" 
                          type="number" 
                          value={selectedPanel === 'camera' ? cameraPanel.y : controlPanel.y}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            if (selectedPanel === 'camera') {
                              setCameraPanel(prev => ({ ...prev, y: value }));
                            } else {
                              setControlPanel(prev => ({ ...prev, y: value }));
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="panelWidth">Width</Label>
                        <Input 
                          id="panelWidth" 
                          type="number" 
                          value={selectedPanel === 'camera' ? cameraPanel.width : controlPanel.width}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 100;
                            if (selectedPanel === 'camera') {
                              setCameraPanel(prev => ({ ...prev, width: value }));
                            } else {
                              setControlPanel(prev => ({ ...prev, width: value }));
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="panelHeight">Height</Label>
                        <Input 
                          id="panelHeight" 
                          type="number" 
                          value={selectedPanel === 'camera' ? cameraPanel.height : controlPanel.height}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 100;
                            if (selectedPanel === 'camera') {
                              setCameraPanel(prev => ({ ...prev, height: value }));
                            } else {
                              setControlPanel(prev => ({ ...prev, height: value }));
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (selectedPanel === 'camera') {
                          setCameraPanel(prev => ({
                            ...prev,
                            x: snapToGrid(prev.x),
                            y: snapToGrid(prev.y),
                            width: snapToGrid(prev.width),
                            height: snapToGrid(prev.height)
                          }));
                        } else {
                          setControlPanel(prev => ({
                            ...prev,
                            x: snapToGrid(prev.x),
                            y: snapToGrid(prev.y),
                            width: snapToGrid(prev.width),
                            height: snapToGrid(prev.height)
                          }));
                        }
                      }}
                      className="w-full"
                    >
                      Snap to Grid
                    </Button>
                  </div>
                </div>
              )}

              {/* Control Properties */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Control Properties</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="controlName">Name</Label>
                    <Input id="controlName" placeholder="Control name" />
                  </div>
                  
                  <div>
                    <Label htmlFor="controlCommand">Command</Label>
                    <Input id="controlCommand" placeholder="e.g., move_forward" />
                  </div>
                  
                  <div>
                    <Label htmlFor="backgroundColor">Background Color</Label>
                    <Input id="backgroundColor" type="color" defaultValue="#3b82f6" />
                  </div>
                  
                  <div>
                    <Label htmlFor="textColor">Text Color</Label>
                    <Input id="textColor" type="color" defaultValue="#ffffff" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}