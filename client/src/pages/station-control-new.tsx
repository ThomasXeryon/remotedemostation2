import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Play, Square, ArrowLeft, Edit3, Save, Activity, Grid } from 'lucide-react';
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [localControls, setLocalControls] = useState<ControlWidget[]>([]);
  const [draggedControl, setDraggedControl] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [localLayout, setLocalLayout] = useState<any>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  
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
    camera: { width: 45, height: 90, position: { x: 5, y: 5 } },
    controlPanel: { width: 50, height: 90, position: { x: 45, y: 5 } }
  };

  // All callbacks
  const handleMouseDown = useCallback((e: React.MouseEvent, controlId: string) => {
    if (!isEditMode) return;
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
  }, [isEditMode, localControls]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedControl || !isEditMode) return;
    
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
  }, [draggedControl, dragOffset, isEditMode]);

  const handleMouseUp = useCallback(() => {
    setDraggedControl(null);
    setResizing(null);
  }, []);

  // Handle resizing of camera and control panels
  const handleResizeStart = useCallback((e: React.MouseEvent, element: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setResizing(element);
  }, [isEditMode]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing || !isEditMode || !localLayout) return;
    
    const container = document.querySelector('.flex-1.flex.relative') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const snappedX = snapToGrid(e.clientX - rect.left);
    const snappedY = snapToGrid(e.clientY - rect.top);
    const mouseXPercent = (snappedX / rect.width) * 100;
    const mouseYPercent = (snappedY / rect.height) * 100;
    
    setLocalLayout((prev: any) => {
      const newLayout = { ...prev };
      
      if (resizing === 'camera') {
        // Resize camera panel with grid snapping
        newLayout.camera = {
          ...newLayout.camera,
          width: Math.max(20, Math.min(80, mouseXPercent - (newLayout.camera?.position?.x || 0))),
          height: Math.max(30, Math.min(90, mouseYPercent - (newLayout.camera?.position?.y || 0)))
        };
      } else if (resizing === 'controlPanel') {
        // Resize control panel with grid snapping
        newLayout.controlPanel = {
          ...newLayout.controlPanel,
          width: Math.max(20, Math.min(80, mouseXPercent - (newLayout.controlPanel?.position?.x || 0))),
          height: Math.max(30, Math.min(90, mouseYPercent - (newLayout.controlPanel?.position?.y || 0)))
        };
      }
      
      return newLayout;
    });
  }, [resizing, isEditMode, localLayout, snapToGrid]);

  // All effects
  useEffect(() => {
    if (controlConfig && typeof controlConfig === 'object' && controlConfig !== null && 'controls' in controlConfig && Array.isArray(controlConfig.controls)) {
      setLocalControls(controlConfig.controls);
    }
  }, [controlConfig]);

  useEffect(() => {
    if (isEditMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isEditMode, handleMouseMove, handleResizeMove, handleMouseUp]);

  // Initialize local layout from station data
  useEffect(() => {
    if (stationData?.configuration?.interfaceLayout) {
      setLocalLayout(stationData.configuration.interfaceLayout);
    } else {
      // Set default layout if none exists
      setLocalLayout({
        camera: {
          position: { x: 5, y: 5 },
          width: 40,
          height: 60
        },
        controlPanel: {
          position: { x: 50, y: 5 },
          width: 45,
          height: 85
        }
      });
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

      if (response.ok) {
        setIsEditMode(false);
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
          <Button 
            onClick={() => isEditMode ? saveControls() : setIsEditMode(true)}
            variant={isEditMode ? "default" : "outline"}
            className={isEditMode ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isEditMode ? <Save className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
            {isEditMode ? "Save Layout" : "Edit Layout"}
          </Button>
          
          {isEditMode && (
            <Button
              onClick={() => setShowGrid(!showGrid)}
              variant="outline"
              size="sm"
              className={showGrid ? "bg-blue-100" : ""}
            >
              <Grid className="w-4 h-4 mr-2" />
              {showGrid ? "Hide Grid" : "Show Grid"}
            </Button>
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
      <div className="flex-1 flex relative">
        {/* Grid Overlay */}
        {isEditMode && showGrid && (
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
          className="bg-gray-900 rounded-lg m-2 relative overflow-hidden"
          style={{
            width: localLayout ? `${localLayout.camera?.width || 45}%` : `${layout.camera.width}%`,
            height: localLayout ? `${localLayout.camera?.height || 60}%` : `${layout.camera.height}%`,
            left: localLayout ? `${localLayout.camera?.position?.x || 2}%` : `${layout.camera.position.x}%`,
            top: localLayout ? `${localLayout.camera?.position?.y || 2}%` : `${layout.camera.position.y}%`,
            position: 'absolute'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Live Camera Feed</p>
              <p className="text-sm opacity-75">Hardware: {stationData.hardwareType}</p>
            </div>
          </div>
          {/* Resize handle for camera */}
          {isEditMode && (
            <div
              className="absolute bottom-1 right-1 w-4 h-4 bg-blue-500 cursor-se-resize opacity-70 hover:opacity-100 rounded-tl z-20"
              onMouseDown={(e) => handleResizeStart(e, 'camera')}
              title="Drag to resize camera"
            />
          )}
        </div>

        {/* Control Panel */}
        <div 
          className="bg-white border rounded-lg m-2 relative"
          style={{
            width: localLayout ? `${localLayout.controlPanel?.width || 45}%` : `${layout.controlPanel.width}%`,
            height: localLayout ? `${localLayout.controlPanel?.height || 85}%` : `${layout.controlPanel.height}%`,
            left: localLayout ? `${localLayout.controlPanel?.position?.x || 50}%` : `${layout.controlPanel.position.x}%`,
            top: localLayout ? `${localLayout.controlPanel?.position?.y || 2}%` : `${layout.controlPanel.position.y}%`,
            position: 'absolute'
          }}
        >
          <div className="h-full p-4 relative overflow-hidden">
            <h3 className="text-lg font-semibold mb-4">Hardware Controls</h3>

            {/* Add Controls Panel - only show in edit mode */}
            {isEditMode && (
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
                    cursor: isEditMode ? 'move' : 'pointer',
                    outline: isEditMode ? '2px dashed #3b82f6' : 'none',
                    outlineOffset: isEditMode ? '4px' : '0px',
                    opacity: isEditMode ? 0.8 : 1,
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
                        if (isEditMode) return;
                        if (isSessionActive) handleCommand(widget.command, widget.parameters);
                      }}
                      onMouseDown={(e) => {
                        if (isEditMode) {
                          handleMouseDown(e, widget.id);
                          return;
                        }
                      }}
                      disabled={!isSessionActive && !isEditMode}
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
          {isEditMode && (
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