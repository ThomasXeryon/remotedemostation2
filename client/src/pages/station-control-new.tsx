import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Play, Square, ArrowLeft, Edit3, Save, Activity, Grid, Monitor, Settings, ChevronDown, Plus, Move, Camera, Layout } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { useWebSocket } from '@/hooks/use-websocket';

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
  const { id } = useParams();
  const currentUser = getCurrentUser();
  
  // All state hooks
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [canvasEditMode, setCanvasEditMode] = useState(false);
  const [controlsEditMode, setControlsEditMode] = useState(false);
  const [localControls, setLocalControls] = useState<ControlWidget[]>([]);
  const [draggedControl, setDraggedControl] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [localLayout, setLocalLayout] = useState<any>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [draggingPanel, setDraggingPanel] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 }); // Default to 1080p
  const [showCanvasBorder, setShowCanvasBorder] = useState(false);
  const [showCanvasDropdown, setShowCanvasDropdown] = useState(false);
  const [showControlsDropdown, setShowControlsDropdown] = useState(false);
  
  // Grid configuration
  const GRID_SIZE = 20; // 20px grid squares
  const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  // All queries
  const { data: station, isLoading: stationLoading, refetch: refetchStation } = useQuery({
    queryKey: ['/api/demo-stations', id],
    enabled: !!id,
  });

  const { data: controlConfig, refetch: refetchControls } = useQuery({
    queryKey: [`/api/demo-stations/${id}/controls`],
    enabled: !!id,
  });

  const { 
    sendCommand 
  } = useWebSocket(id || '', currentUser?.id || 1, isSessionActive ? 1 : 0);

  // Data transformations - moved here to fix declaration order
  const stationData = station ? (Array.isArray(station) ? station[0] : station) : null;
  const layout = stationData?.configuration?.interfaceLayout || {
    camera: { width: 50, height: 90, position: { x: 0, y: 5 } },
    controlPanel: { width: 50, height: 90, position: { x: 50, y: 5 } }
  };

  // All callbacks
  const handleMouseDown = useCallback((e: React.MouseEvent, controlId: string) => {
    if (!controlsEditMode) return;
    e.preventDefault();
    
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
  }, [controlsEditMode, localControls]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedControl || !controlsEditMode) return;
    
    const container = document.querySelector('.relative.w-full[style*="calc(100% - 3rem)"]') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const newX = snapToGrid(Math.max(0, Math.min(container.clientWidth - 120, e.clientX - rect.left - dragOffset.x)));
    const newY = snapToGrid(Math.max(0, Math.min(container.clientHeight - 40, e.clientY - rect.top - dragOffset.y)));
    
    setLocalControls(prev => prev.map(control => 
      control.id === draggedControl 
        ? { ...control, position: { x: newX, y: newY } }
        : control
    ));
  }, [draggedControl, dragOffset, controlsEditMode]);

  const handleMouseUp = useCallback(() => {
    setDraggedControl(null);
    setResizing(null);
    setDraggingPanel(null);
  }, []);

  // Handle resizing of camera and control panels
  const handleResizeStart = useCallback((e: React.MouseEvent, element: string) => {
    if (!canvasEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setResizing(element);
  }, [canvasEditMode]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing || !canvasEditMode || !localLayout) return;
    
    const container = document.querySelector('.flex-1.flex.relative') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const mouseX = snapToGrid(e.clientX - rect.left);
    const mouseY = snapToGrid(e.clientY - rect.top);
    
    setLocalLayout((prev: any) => {
      const newLayout = { ...prev };
      
      if (resizing === 'camera') {
        // Resize camera panel with pixel coordinates
        const currentPos = newLayout.camera?.position || { x: 40, y: 40 };
        newLayout.camera = {
          ...newLayout.camera,
          width: Math.max(200, mouseX - currentPos.x),
          height: Math.max(150, mouseY - currentPos.y)
        };
      } else if (resizing === 'controlPanel') {
        // Resize control panel with pixel coordinates
        const currentPos = newLayout.controlPanel?.position || { x: 880, y: 40 };
        newLayout.controlPanel = {
          ...newLayout.controlPanel,
          width: Math.max(300, mouseX - currentPos.x),
          height: Math.max(200, mouseY - currentPos.y)
        };
      }
      
      return newLayout;
    });
  }, [resizing, canvasEditMode, localLayout, snapToGrid]);

  // Handle panel dragging
  const handlePanelDragStart = useCallback((e: React.MouseEvent, panelType: string) => {
    if (!canvasEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingPanel(panelType);
    
    const container = document.querySelector('.flex-1.flex.relative') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const panelElement = e.currentTarget as HTMLElement;
    const panelRect = panelElement.getBoundingClientRect();
    
    setDragOffset({
      x: e.clientX - panelRect.left,
      y: e.clientY - panelRect.top
    });
  }, [canvasEditMode]);

  const handlePanelDragMove = useCallback((e: MouseEvent) => {
    if (!draggingPanel || !canvasEditMode || !localLayout) return;
    
    const container = document.querySelector('.flex-1.flex.relative') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const newX = snapToGrid(Math.max(0, e.clientX - rect.left - dragOffset.x));
    const newY = snapToGrid(Math.max(0, e.clientY - rect.top - dragOffset.y));
    
    setLocalLayout((prev: any) => {
      const newLayout = { ...prev };
      
      if (draggingPanel === 'camera') {
        newLayout.camera = {
          ...newLayout.camera,
          position: { x: newX, y: newY }
        };
      } else if (draggingPanel === 'controlPanel') {
        newLayout.controlPanel = {
          ...newLayout.controlPanel,
          position: { x: newX, y: newY }
        };
      }
      
      return newLayout;
    });
  }, [draggingPanel, canvasEditMode, localLayout, dragOffset, snapToGrid]);

  // All effects
  useEffect(() => {
    if (controlConfig && typeof controlConfig === 'object' && controlConfig !== null && 'controls' in controlConfig && Array.isArray(controlConfig.controls)) {
      setLocalControls(controlConfig.controls);
      
      // Also load layout from control configuration if available
      if ((controlConfig as any).layout && Object.keys((controlConfig as any).layout).length > 0) {
        setLocalLayout((controlConfig as any).layout);
      }
    }
  }, [controlConfig]);

  useEffect(() => {
    const isAnyEditMode = canvasEditMode || controlsEditMode;
    if (isAnyEditMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mousemove', handlePanelDragMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mousemove', handlePanelDragMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasEditMode, controlsEditMode, handleMouseMove, handleResizeMove, handlePanelDragMove, handleMouseUp]);

  // Initialize local layout from station data
  useEffect(() => {
    if (stationData?.configuration?.interfaceLayout) {
      setLocalLayout(stationData.configuration.interfaceLayout);
    } else {
      // Set default layout with proper 50/50 split for 1080p canvas
      const defaultCanvasLayout = {
        camera: {
          position: { x: 40, y: 40 },
          width: 920, // 50% of 1920px minus padding
          height: 540  // 50% of 1080px
        },
        controlPanel: {
          position: { x: 980, y: 40 }, // Start after camera width + padding
          width: 900,  // 50% of 1920px minus padding
          height: 540  // 50% of 1080px
        }
      };
      setLocalLayout(defaultCanvasLayout);
    }
  }, [stationData]);

  // Early returns
  if (stationLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div>Loading station...</div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div>Station not found</div>
      </div>
    );
  }

  // Regular functions (not hooks)
  const handleCommand = (command: string, parameters?: Record<string, any>) => {
    sendCommand(JSON.stringify({
      type: 'command',
      command,
      parameters: parameters || {}
    }));
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

  const addNewControl = (type: 'button' | 'slider' | 'toggle' | 'joystick') => {
    const newControl: ControlWidget = {
      id: `${type}_${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      command: `${type}_command`,
      parameters: {},
      position: { x: 100, y: 100 },
      size: {
        width: type === 'joystick' ? 120 : type === 'slider' ? 200 : type === 'toggle' ? 60 : 120,
        height: type === 'joystick' ? 120 : type === 'slider' ? 30 : type === 'toggle' ? 30 : 40
      },
      style: {
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        borderColor: '#1d4ed8',
        borderRadius: 8,
        fontSize: 14
      }
    };
    setLocalControls(prev => [...prev, newControl]);
  };

  const saveControls = async () => {
    try {
      // Save controls and layout
      const response = await fetch(`/api/demo-stations/${id}/controls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          demoStationId: id,
          controls: localControls,
          layout: localLayout || {},
          createdBy: currentUser?.id
        })
      });

      // Also update the station's main configuration with the interface layout
      if (response.ok && localLayout) {
        const stationUpdateResponse = await fetch(`/api/demo-stations/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            configuration: {
              ...stationData?.configuration,
              interfaceLayout: localLayout
            }
          })
        });

        if (stationUpdateResponse.ok) {
          console.log('Station configuration updated successfully');
        }
      }

      if (response.ok) {
        setCanvasEditMode(false);
        setControlsEditMode(false);
        refetchControls();
      } else {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
      }
    } catch (error) {
      console.error('Failed to save controls:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit Control
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{stationData.name}</h1>
            <p className="text-sm text-gray-600">{stationData.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Canvas Edit Dropdown */}
          <div className="relative">
            <Button
              onClick={() => setShowCanvasDropdown(!showCanvasDropdown)}
              variant={canvasEditMode ? "default" : "outline"}
              className={`${canvasEditMode ? "bg-blue-600 hover:bg-blue-700" : ""} flex items-center gap-2`}
            >
              Canvas
              <ChevronDown className="w-4 h-4" />
            </Button>
            
            {showCanvasDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <button
                  onClick={() => {
                    setCanvasEditMode(!canvasEditMode);
                    if (!canvasEditMode) {
                      setShowGrid(true);
                      setShowCanvasBorder(true);
                    } else {
                      setShowGrid(false);
                      setShowCanvasBorder(false);
                    }
                    setShowCanvasDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  {canvasEditMode ? 'Exit Canvas Edit' : 'Edit Canvas Layout'}
                </button>
                <button
                  onClick={() => {
                    setShowGrid(!showGrid);
                    setShowCanvasDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  {showGrid ? 'Hide Grid' : 'Show Grid'}
                </button>
                <button
                  onClick={() => {
                    setShowCanvasBorder(!showCanvasBorder);
                    setShowCanvasDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  {showCanvasBorder ? 'Hide Canvas Border' : 'Show Canvas Border'}
                </button>
                <hr className="my-1" />
                <div className="px-4 py-2">
                  <label className="block text-xs text-gray-500 mb-1">Resolution</label>
                  <select
                    value={`${canvasSize.width}x${canvasSize.height}`}
                    onChange={(e) => {
                      const [width, height] = e.target.value.split('x').map(Number);
                      setCanvasSize({ width, height });
                      setShowCanvasDropdown(false);
                    }}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="1920x1080">HD (1920×1080)</option>
                    <option value="2560x1440">2K (2560×1440)</option>
                    <option value="3840x2160">4K (3840×2160)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Controls Edit Dropdown */}
          <div className="relative">
            <Button
              onClick={() => setShowControlsDropdown(!showControlsDropdown)}
              variant={controlsEditMode ? "default" : "outline"}
              className={`${controlsEditMode ? "bg-green-600 hover:bg-green-700" : ""} flex items-center gap-2`}
            >
              Controls
              <ChevronDown className="w-4 h-4" />
            </Button>
            
            {showControlsDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <button
                  onClick={() => {
                    setControlsEditMode(!controlsEditMode);
                    setShowControlsDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  {controlsEditMode ? 'Exit Controls Edit' : 'Edit Controls'}
                </button>
                {controlsEditMode && (
                  <>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        const newControl: ControlWidget = {
                          id: `control-${Date.now()}`,
                          type: 'button',
                          name: 'New Button',
                          command: 'new_command',
                          parameters: {},
                          position: { x: 100, y: 100 },
                          size: { width: 120, height: 40 },
                          style: {
                            backgroundColor: '#3b82f6',
                            textColor: '#ffffff',
                            borderColor: '#2563eb',
                            borderRadius: 6,
                            fontSize: 14
                          }
                        };
                        setLocalControls(prev => [...prev, newControl]);
                        setShowControlsDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Add Button
                    </button>
                    <button
                      onClick={() => {
                        const newControl: ControlWidget = {
                          id: `control-${Date.now()}`,
                          type: 'slider',
                          name: 'New Slider',
                          command: 'slider_command',
                          parameters: { min: 0, max: 100, step: 1 },
                          position: { x: 100, y: 150 },
                          size: { width: 200, height: 20 },
                          style: {
                            backgroundColor: '#10b981',
                            textColor: '#ffffff',
                            borderColor: '#059669',
                            borderRadius: 10,
                            fontSize: 12
                          }
                        };
                        setLocalControls(prev => [...prev, newControl]);
                        setShowControlsDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Add Slider
                    </button>
                    <button
                      onClick={() => {
                        const newControl: ControlWidget = {
                          id: `control-${Date.now()}`,
                          type: 'joystick',
                          name: 'New Joystick',
                          command: 'joystick_command',
                          parameters: {},
                          position: { x: 100, y: 200 },
                          size: { width: 100, height: 100 },
                          style: {
                            backgroundColor: '#8b5cf6',
                            textColor: '#ffffff',
                            borderColor: '#7c3aed',
                            borderRadius: 50,
                            fontSize: 12
                          }
                        };
                        setLocalControls(prev => [...prev, newControl]);
                        setShowControlsDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Add Joystick
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          {(canvasEditMode || controlsEditMode) && (
            <>
              <Button
                onClick={() => setShowGrid(!showGrid)}
                variant="outline"
                size="sm"
                className={showGrid ? "bg-blue-100" : ""}
              >
                <Grid className="w-4 h-4 mr-2" />
                {showGrid ? "Hide Grid" : "Show Grid"}
              </Button>
              
              <Button
                onClick={() => setShowCanvasBorder(!showCanvasBorder)}
                variant="outline"
                size="sm"
                className={showCanvasBorder ? "bg-purple-100" : ""}
              >
                <Monitor className="w-4 h-4 mr-2" />
                {showCanvasBorder ? "Hide Canvas" : "Show Canvas"}
              </Button>
              
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded">
                <Settings className="w-4 h-4" />
                <select 
                  value={`${canvasSize.width}x${canvasSize.height}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value.split('x').map(Number);
                    setCanvasSize({ width, height });
                  }}
                  className="text-sm bg-transparent border-none outline-none"
                >
                  <option value="1920x1080">1920x1080 (HD)</option>
                  <option value="2560x1440">2560x1440 (2K)</option>
                  <option value="3840x2160">3840x2160 (4K)</option>
                  <option value="1280x720">1280x720 (720p)</option>
                  <option value="1600x900">1600x900 (16:9)</option>
                  <option value="1024x768">1024x768 (4:3)</option>
                </select>
              </div>
            </>
          )}
          
          {!isSessionActive ? (
            <Button 
              onClick={handleStartSession} 
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Session
            </Button>
          ) : (
            <Button onClick={handleStopSession} variant="destructive">
              <Square className="w-4 h-4 mr-2" />
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Main Interface */}
      <div className="flex-1 flex relative bg-gray-50">
        {/* Canvas Boundary */}
        {canvasEditMode && showCanvasBorder && (
          <div 
            className="absolute border-4 border-purple-500 border-dashed pointer-events-none z-20"
            style={{
              left: '20px',
              top: '20px',
              width: Math.min(canvasSize.width * 0.8, window.innerWidth * 0.9),
              height: Math.min(canvasSize.height * 0.8, window.innerHeight * 0.7),
              backgroundColor: 'rgba(147, 51, 234, 0.05)'
            }}
          >
            <div className="absolute -top-8 left-0 bg-purple-500 text-white px-3 py-1 text-sm rounded font-medium">
              Output Canvas: {canvasSize.width}×{canvasSize.height}
            </div>
            <div className="absolute -bottom-8 right-0 bg-purple-500 text-white px-3 py-1 text-xs rounded">
              Drag elements within this boundary
            </div>
          </div>
        )}
        
        {/* Grid Overlay */}
        {(canvasEditMode || controlsEditMode) && showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-20 z-10"
            style={{
              backgroundImage: `
                linear-gradient(to right, #3b82f6 1px, transparent 1px),
                linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
            }}
          />
        )}
        {/* Camera Feed */}
        <div 
          className={`bg-gray-900 rounded-lg relative overflow-hidden border-2 ${canvasEditMode ? 'border-blue-400 cursor-move' : 'border-transparent'}`}
          style={{
            width: localLayout ? `${localLayout.camera?.width || 800}px` : '800px',
            height: localLayout ? `${localLayout.camera?.height || 600}px` : '600px',
            left: localLayout ? `${localLayout.camera?.position?.x || 40}px` : '40px',
            top: localLayout ? `${localLayout.camera?.position?.y || 40}px` : '40px',
            position: 'absolute'
          }}
          onMouseDown={(e) => handlePanelDragStart(e, 'camera')}
        >
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Live Camera Feed</p>
              <p className="text-sm opacity-75">Hardware: {stationData.hardwareType}</p>
            </div>
          </div>
          
          {/* Drag handle for camera */}
          {canvasEditMode && (
            <div className="absolute top-1 left-1 w-6 h-6 bg-blue-500 rounded cursor-move opacity-70 hover:opacity-100 flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm"></div>
            </div>
          )}
          
          {/* Resize handle for camera */}
          {canvasEditMode && (
            <div
              className="absolute bottom-1 right-1 w-4 h-4 bg-blue-500 cursor-se-resize opacity-70 hover:opacity-100 rounded-tl z-20"
              onMouseDown={(e) => handleResizeStart(e, 'camera')}
              title="Drag to resize camera"
            />
          )}
        </div>

        {/* Control Panel */}
        <div 
          className={`bg-white border rounded-lg relative border-2 ${canvasEditMode ? 'border-green-400 cursor-move' : 'border-gray-200'}`}
          style={{
            width: localLayout ? `${localLayout.controlPanel?.width || 600}px` : '600px',
            height: localLayout ? `${localLayout.controlPanel?.height || 700}px` : '700px',
            left: localLayout ? `${localLayout.controlPanel?.position?.x || 880}px` : '880px',
            top: localLayout ? `${localLayout.controlPanel?.position?.y || 40}px` : '40px',
            position: 'absolute'
          }}
          onMouseDown={(e) => handlePanelDragStart(e, 'controlPanel')}
        >
          <div className="h-full p-4 relative overflow-hidden">
            {/* Drag handle for control panel */}
            {canvasEditMode && (
              <div className="absolute top-1 left-1 w-6 h-6 bg-green-500 rounded cursor-move opacity-70 hover:opacity-100 flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-sm"></div>
              </div>
            )}
            
            <h3 className="text-lg font-semibold mb-4">Hardware Controls</h3>

            {/* Add Controls Panel - only show in edit mode */}
            {controlsEditMode && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <h4 className="text-sm font-semibold mb-3">Add Controls</h4>
                <div className="flex space-x-2">
                  <Button onClick={() => addNewControl('button')} variant="outline" size="sm">
                    + Button
                  </Button>
                  <Button onClick={() => addNewControl('slider')} variant="outline" size="sm">
                    + Slider
                  </Button>
                  <Button onClick={() => addNewControl('toggle')} variant="outline" size="sm">
                    + Toggle
                  </Button>
                  <Button onClick={() => addNewControl('joystick')} variant="outline" size="sm">
                    + Joystick
                  </Button>
                </div>
              </div>
            )}

            {localControls.length > 0 ? (
              <div className="relative w-full" style={{ height: 'calc(100% - 3rem)' }}>
                {localControls.map((widget: ControlWidget) => {
                  const widgetStyle = {
                    position: 'absolute' as const,
                    left: `${widget.position.x}px`,
                    top: `${widget.position.y}px`,
                    width: `${widget.size.width}px`,
                    height: `${widget.size.height}px`,
                    cursor: controlsEditMode ? 'move' : 'pointer',
                    outline: controlsEditMode ? '2px dashed #3b82f6' : 'none',
                    outlineOffset: controlsEditMode ? '4px' : '0px',
                    opacity: controlsEditMode ? 0.8 : 1,
                  };

                  return (
                    <button
                      key={widget.id}
                      style={{
                        ...widgetStyle,
                        background: `linear-gradient(135deg, ${widget.style.backgroundColor}f0, ${widget.style.backgroundColor})`,
                        color: widget.style.textColor,
                        border: `3px solid ${widget.style.borderColor}`,
                        borderRadius: `${widget.style.borderRadius + 8}px`,
                        fontSize: `${widget.style.fontSize + 2}px`,
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      className="select-none"
                      onClick={() => {
                        if (controlsEditMode) return;
                        if (isSessionActive) handleCommand(widget.command, widget.parameters);
                      }}
                      onMouseDown={(e) => {
                        if (controlsEditMode) {
                          handleMouseDown(e, widget.id);
                          return;
                        }
                      }}
                      disabled={!isSessionActive && !controlsEditMode}
                    >
                      {widget.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-lg font-medium">No controls configured</p>
                  <p className="text-sm">Click "Edit Layout" to add controls</p>
                </div>
              </div>
            )}
          </div>
          {/* Resize handle for control panel */}
          {canvasEditMode && (
            <div
              className="absolute bottom-1 right-1 w-4 h-4 bg-blue-500 cursor-se-resize opacity-70 hover:opacity-100 rounded-tl z-20"
              onMouseDown={(e) => handleResizeStart(e, 'controlPanel')}
              title="Drag to resize control panel"
            />
          )}
        </div>
      </div>
    </div>
  );
}