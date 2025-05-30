import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { Play, Edit2, Save, X, Monitor, Move, Grid3X3, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [toolboxPosition, setToolboxPosition] = useState({ x: 50, y: 100 });
  const [isDraggingToolbox, setIsDraggingToolbox] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cameraPanel, setCameraPanel] = useState({ x: 40, y: 40, width: 920, height: 540 });
  const [controlPanel, setControlPanel] = useState({ x: 980, y: 40, width: 900, height: 540 });
  const [previousControlPanel, setPreviousControlPanel] = useState({ x: 980, y: 40 });
  const [isDraggingPanel, setIsDraggingPanel] = useState<string | null>(null);
  const [isResizingPanel, setIsResizingPanel] = useState<string | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [controls, setControls] = useState<any[]>([]);
  const [selectedControl, setSelectedControl] = useState<any | null>(null);
  const [isDraggingControl, setIsDraggingControl] = useState<string | null>(null);

  // Snap to grid function
  const snapToGrid = (value: number, gridSize: number = 20) => {
    return Math.round(value / gridSize) * gridSize;
  };

  // Fetch station data
  const { data: stationData, isLoading } = useQuery<DemoStation>({
    queryKey: ['/api/demo-stations', id],
    enabled: !!id,
  });

  // Fetch control configuration
  const { data: controlData } = useQuery({
    queryKey: ['/api/demo-stations', id, 'controls'],
    enabled: !!id,
  });

  // Load saved layout from station configuration
  useEffect(() => {
    console.log('Station data loaded:', stationData);
    // Handle case where stationData might be an array or single object
    const station = Array.isArray(stationData) ? stationData[0] : stationData;
    if (station?.configuration?.interfaceLayout) {
      console.log('Layout found in station config:', station.configuration.interfaceLayout);
      const { camera, controlPanel: control } = station.configuration.interfaceLayout;
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
  }, [stationData]);

  // Load saved controls from station configuration
  useEffect(() => {
    const station = Array.isArray(stationData) ? stationData[0] : stationData;
    if (station?.configuration?.controls) {
      console.log('Loading saved controls:', station.configuration.controls);
      setControls(station.configuration.controls);
    }
  }, [stationData]);

  // Move controls when control panel moves
  useEffect(() => {
    const deltaX = controlPanel.x - previousControlPanel.x;
    const deltaY = controlPanel.y - previousControlPanel.y;
    
    if (deltaX !== 0 || deltaY !== 0) {
      setControls(prev => prev.map(control => ({
        ...control,
        position: {
          x: control.position.x + deltaX,
          y: control.position.y + deltaY
        }
      })));
      
      setPreviousControlPanel({ x: controlPanel.x, y: controlPanel.y });
    }
  }, [controlPanel.x, controlPanel.y, previousControlPanel]);

  // Control drag handlers
  const handleControlMouseDown = useCallback((e: React.MouseEvent, controlId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    const control = controls.find(c => c.id === controlId);
    if (!control || !control.position) return;
    
    setIsDraggingControl(controlId);
    setSelectedControl(control);
    setDragOffset({
      x: e.clientX - (control.position.x || 0),
      y: e.clientY - (control.position.y || 0)
    });
  }, [isEditMode, controls]);

  const handleControlMove = useCallback((e: MouseEvent) => {
    if (!isDraggingControl) return;
    
    const newX = snapToGrid(e.clientX - dragOffset.x);
    const newY = snapToGrid(e.clientY - dragOffset.y);
    
    setControls(prev => prev.map(control => 
      control.id === isDraggingControl 
        ? { ...control, position: { x: newX, y: newY } }
        : control
    ));
  }, [isDraggingControl, dragOffset, snapToGrid]);

  const handleControlMouseUp = useCallback(() => {
    setIsDraggingControl(null);
  }, []);

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
  }, [isDraggingToolbox, isDraggingPanel, isResizingPanel, isDraggingControl, dragOffset, handlePanelMove, handleControlMove]);

  // Mouse event handlers
  useEffect(() => {
    if (isDraggingControl) {
      document.addEventListener('mousemove', handleControlMove);
      document.addEventListener('mouseup', handleControlMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleControlMove);
        document.removeEventListener('mouseup', handleControlMouseUp);
      };
    }
  }, [isDraggingControl, handleControlMove, handleControlMouseUp]);

  // Control creation functions
  const createControl = (type: 'button' | 'slider' | 'toggle' | 'joystick') => {
    const newControl = {
      id: Date.now().toString(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${controls.length + 1}`,
      type,
      command: `${type}_command`,
      parameters: {},
      position: { 
        x: controlPanel.x + 20 + (controls.length * 20), 
        y: controlPanel.y + 50 + (controls.length * 20) 
      },
      size: type === 'joystick' ? { width: 120, height: 120 } : 
            type === 'slider' ? { width: 200, height: 40 } :
            { width: 100, height: 40 },
      style: {
        backgroundColor: type === 'button' ? '#3b82f6' : '#10b981',
        textColor: '#ffffff',
        borderColor: '#1e40af',
        borderRadius: 8,
        fontSize: 14
      }
    };
    
    setControls(prev => [...prev, newControl]);
    setSelectedControl(newControl.id);
  };

  const handleDeleteControl = (controlId: string) => {
    setControls(prev => prev.filter(c => c.id !== controlId));
    setSelectedControl(null);
  };

  // Render individual control
  const renderControl = (control: any) => {
    // Safety checks for control properties
    if (!control || !control.position || !control.size || !control.style) {
      return null;
    }

    const commonStyle = {
      position: 'absolute' as const,
      left: control.position.x || 0,
      top: control.position.y || 0,
      width: control.size.width || 100,
      height: control.size.height || 40,
      backgroundColor: control.style.backgroundColor || '#3b82f6',
      color: control.style.textColor || '#ffffff',
      borderRadius: control.style.borderRadius || 8,
      fontSize: control.style.fontSize || 14,
      border: `2px solid ${control.style.borderColor || '#1e40af'}`,
      cursor: isEditMode ? 'move' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      userSelect: 'none' as const,
      zIndex: selectedControl?.id === control.id ? 20 : 10,
      boxShadow: selectedControl?.id === control.id ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : undefined
    };

    const handleControlClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isEditMode) {
        setSelectedControl(selectedControl?.id === control.id ? null : control);
      } else {
        // Handle control interaction in non-edit mode
        console.log(`Control ${control.name} activated`);
      }
    };

    const handleControlMouseDownEvent = (e: React.MouseEvent) => {
      if (isEditMode) {
        handleControlMouseDown(e, control.id);
      } else {
        handleControlClick(e);
      }
    };

    switch (control.type) {
      case 'button':
        return (
          <div key={control.id} style={commonStyle} onMouseDown={handleControlMouseDownEvent}>
            {control.name}
          </div>
        );
      case 'slider':
        return (
          <div key={control.id} style={commonStyle} onMouseDown={handleControlMouseDownEvent}>
            <div className="w-full h-2 bg-gray-300 rounded-full relative">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '50%' }}></div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs">50%</div>
            </div>
          </div>
        );
      case 'toggle':
        return (
          <div key={control.id} style={commonStyle} onMouseDown={handleControlMouseDownEvent}>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-500 rounded border-2 border-white"></div>
              <span>{control.name}</span>
            </div>
          </div>
        );
      case 'joystick':
        return (
          <div key={control.id} style={{...commonStyle, borderRadius: '50%'}} onMouseDown={handleControlMouseDownEvent}>
            <div 
              className="w-8 h-8 bg-white rounded-full shadow-lg"
              style={{ transform: 'translate(0px, 0px)' }}
            ></div>
          </div>
        );
      default:
        return null;
    }
  };

  // Save functionality
  const handleSave = async () => {
    try {
      const layoutData = {
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
      };

      const response = await fetch(`/api/demo-stations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ 
          configuration: {
            interfaceLayout: layoutData,
            controls: controls
          }
        }),
      });

      if (response.ok) {
        console.log('Layout saved successfully');
        
        // Exit edit mode and hide all editing UI
        setIsEditMode(false);
        setShowGrid(false);
        setSelectedControl(null);
        
        // Show success toast
        toast({
          title: "Saved",
          description: "Controls and layout saved successfully",
        });
      } else {
        console.error('Save failed:', await response.json());
        toast({
          title: "Error",
          description: "Failed to save layout",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Error", 
        description: "Failed to save layout",
        variant: "destructive",
      });
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
        <div className="flex-1 relative overflow-auto bg-gray-50">
          <div 
            className="relative p-8"
            style={{ 
              width: '1920px',
              height: '1080px',
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
                   left: `${cameraPanel.x}px`,
                   top: `${cameraPanel.y}px`,
                   width: `${cameraPanel.width}px`,
                   height: `${cameraPanel.height}px`,
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
                   left: `${controlPanel.x}px`,
                   top: `${controlPanel.y}px`,
                   width: `${controlPanel.width}px`,
                   height: `${controlPanel.height}px`,
                   border: isEditMode ? (selectedPanel === 'control' ? '3px solid #10b981' : '2px solid #10b981') : '2px solid #e5e7eb'
                 }}
                 onClick={() => isEditMode && setSelectedPanel('control')}>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Controls</h3>
                {controls.length === 0 ? (
                  <p className="text-gray-600">Control widgets will appear here</p>
                ) : (
                  <div className="text-sm text-gray-600 mb-2">
                    {controls.length} control{controls.length !== 1 ? 's' : ''} configured
                  </div>
                )}
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

            {/* Render Controls */}
            {controls.map(control => renderControl(control))}
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
                  <Button variant="outline" size="sm" className="w-full" onClick={() => createControl('button')}>Button</Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => createControl('slider')}>Slider</Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => createControl('toggle')}>Toggle</Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => createControl('joystick')}>Joystick</Button>
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

              {/* Selected Control Properties */}
              {selectedControl && (
                <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium mb-3">Selected Control</h4>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Name:</strong> {selectedControl.name}</p>
                    <p className="text-sm"><strong>Type:</strong> {selectedControl.type}</p>
                    <p className="text-sm"><strong>Command:</strong> {selectedControl.command}</p>
                    <p className="text-sm"><strong>Position:</strong> ({selectedControl.position.x}, {selectedControl.position.y})</p>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteControl(selectedControl.id)}
                      className="w-full mt-2"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Control
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