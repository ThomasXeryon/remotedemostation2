import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, Eye, Move, Palette, Settings, MousePointer, Gamepad2, Sliders, Layout } from 'lucide-react';

export interface ControlWidget {
  id: string;
  name: string;
  type: 'button' | 'slider' | 'toggle' | 'joystick';
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

export interface LayoutConfig {
  camera: {
    width: number;
    height: number;
    position: { x: number; y: number };
  };
  controlPanel: {
    width: number;
    height: number;
    position: { x: number; y: number };
  };
}

interface ControlBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  controls: ControlWidget[];
  onSaveControls: (controls: ControlWidget[]) => void;
  layout?: LayoutConfig;
  onSaveLayout?: (layout: LayoutConfig) => void;
}

export function ControlBuilderModal({
  isOpen,
  onClose,
  controls,
  onSaveControls,
  layout,
  onSaveLayout
}: ControlBuilderModalProps) {
  const [localControls, setLocalControls] = useState<ControlWidget[]>([]);
  const [selectedControl, setSelectedControl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('controls');
  const [localLayout, setLocalLayout] = useState<LayoutConfig>(
    layout || {
      camera: { width: 65, height: 80, position: { x: 5, y: 10 } },
      controlPanel: { width: 25, height: 80, position: { x: 72, y: 10 } }
    }
  );
  const canvasRef = useRef<HTMLDivElement>(null);

  // Sync controls and layout with props
  useEffect(() => {
    if (controls && Array.isArray(controls)) {
      setLocalControls(controls);
    }
    if (layout) {
      setLocalLayout(layout);
    }
  }, [controls, layout, isOpen]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addControl = (type: ControlWidget['type'], size: 'small' | 'medium' | 'large' = 'medium') => {
    const sizes = {
      small: { button: {w: 80, h: 30}, slider: {w: 120, h: 20}, toggle: {w: 40, h: 20}, joystick: {w: 60, h: 60} },
      medium: { button: {w: 100, h: 35}, slider: {w: 150, h: 25}, toggle: {w: 50, h: 25}, joystick: {w: 80, h: 80} },
      large: { button: {w: 130, h: 45}, slider: {w: 200, h: 30}, toggle: {w: 65, h: 30}, joystick: {w: 100, h: 100} }
    };

    const controlSize = sizes[size][type];
    
    const newControl: ControlWidget = {
      id: generateId(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${size}`,
      type,
      command: `${type}_command`,
      position: { x: 50, y: 50 },
      size: { width: controlSize.w, height: controlSize.h },
      style: {
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        borderColor: '#1d4ed8',
        borderRadius: 8,
        fontSize: size === 'small' ? 12 : size === 'medium' ? 14 : 16,
      },
    };
    
    setLocalControls([...localControls, newControl]);
    setSelectedControl(newControl.id);
  };

  const updateControl = (id: string, updates: Partial<ControlWidget>) => {
    setLocalControls(prev => prev.map(control =>
      control.id === id ? { ...control, ...updates } : control
    ));
  };

  const deleteControl = (id: string) => {
    setLocalControls(prev => prev.filter(control => control.id !== id));
    if (selectedControl === id) {
      setSelectedControl(null);
    }
  };

  // React DnD drop target for the canvas
  const [{ isOver }, drop] = useDrop({
    accept: 'control',
    drop: (item: { id: string }, monitor) => {
      if (!canvasRef.current) return;
      
      const offset = monitor.getClientOffset();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      if (offset) {
        const newX = offset.x - canvasRect.left;
        const newY = offset.y - canvasRect.top;
        
        updateControl(item.id, {
          position: {
            x: Math.max(0, Math.min(newX, canvasRect.width - 120)),
            y: Math.max(0, Math.min(newY, canvasRect.height - 40))
          }
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Draggable control component
  const DraggableControl = ({ control }: { control: ControlWidget }) => {
    const [{ isDragging }, drag] = useDrag({
      type: 'control',
      item: { id: control.id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const style = {
      position: 'absolute' as const,
      left: control.position.x,
      top: control.position.y,
      width: control.size.width,
      height: control.size.height,
      backgroundColor: control.style.backgroundColor,
      color: control.style.textColor,
      border: `2px solid ${control.style.borderColor}`,
      borderRadius: control.style.borderRadius,
      fontSize: control.style.fontSize,
      cursor: isDragging ? 'grabbing' : 'grab',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none' as const,
      outline: selectedControl === control.id ? '2px solid #f59e0b' : 'none',
      outlineOffset: '2px',
      zIndex: selectedControl === control.id ? 10 : 1,
      opacity: isDragging ? 0.5 : 1,
    };

    const renderContent = () => {
      switch (control.type) {
        case 'button':
          return <span className="truncate px-2">{control.name}</span>;
        case 'slider':
          return (
            <div className="w-full px-2">
              <div className="w-full h-1 bg-gray-300 rounded">
                <div className="w-1/3 h-1 bg-white rounded" />
              </div>
            </div>
          );
        case 'toggle':
          return (
            <div className="w-6 h-3 bg-gray-300 rounded-full relative">
              <div className="w-2 h-2 bg-white rounded-full absolute top-0.5 left-0.5" />
            </div>
          );
        case 'joystick':
          return (
            <div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
          );
        default:
          return control.name;
      }
    };

    return (
      <div
        ref={drag}
        style={style}
        onClick={() => setSelectedControl(control.id)}
        className="shadow-sm hover:shadow-md transition-shadow"
      >
        {renderContent()}
      </div>
    );
  };

  const handleSave = () => {
    onSaveControls(localControls);
    if (onSaveLayout) {
      onSaveLayout(localLayout);
    }
    onClose();
  };

  const selectedControlData = localControls.find(c => c.id === selectedControl);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Gamepad2 className="w-5 h-5" />
            <span>Control & Layout Builder</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex h-full">
          {/* Left Sidebar */}
          <div className="w-80 border-r p-4 space-y-4 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="controls">Controls</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>
              
              <TabsContent value="controls" className="space-y-4">
                {/* Add Controls */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Buttons */}
                    <div>
                      <Label className="text-xs font-medium text-gray-600 mb-2 block">Buttons</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <Button onClick={() => addControl('button', 'small')} variant="outline" size="sm" className="text-xs h-8">
                          <MousePointer className="w-3 h-3 mr-1" />
                          S
                        </Button>
                        <Button onClick={() => addControl('button', 'medium')} variant="outline" size="sm" className="text-xs h-8">
                          <MousePointer className="w-3 h-3 mr-1" />
                          M
                        </Button>
                        <Button onClick={() => addControl('button', 'large')} variant="outline" size="sm" className="text-xs h-8">
                          <MousePointer className="w-3 h-3 mr-1" />
                          L
                        </Button>
                      </div>
                    </div>

                    {/* Sliders */}
                    <div>
                      <Label className="text-xs font-medium text-gray-600 mb-2 block">Sliders</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <Button onClick={() => addControl('slider', 'small')} variant="outline" size="sm" className="text-xs h-8">
                          <Sliders className="w-3 h-3 mr-1" />
                          S
                        </Button>
                        <Button onClick={() => addControl('slider', 'medium')} variant="outline" size="sm" className="text-xs h-8">
                          <Sliders className="w-3 h-3 mr-1" />
                          M
                        </Button>
                        <Button onClick={() => addControl('slider', 'large')} variant="outline" size="sm" className="text-xs h-8">
                          <Sliders className="w-3 h-3 mr-1" />
                          L
                        </Button>
                      </div>
                    </div>

                    {/* Toggles */}
                    <div>
                      <Label className="text-xs font-medium text-gray-600 mb-2 block">Toggles</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <Button onClick={() => addControl('toggle', 'small')} variant="outline" size="sm" className="text-xs h-8">
                          <Settings className="w-3 h-3 mr-1" />
                          S
                        </Button>
                        <Button onClick={() => addControl('toggle', 'medium')} variant="outline" size="sm" className="text-xs h-8">
                          <Settings className="w-3 h-3 mr-1" />
                          M
                        </Button>
                        <Button onClick={() => addControl('toggle', 'large')} variant="outline" size="sm" className="text-xs h-8">
                          <Settings className="w-3 h-3 mr-1" />
                          L
                        </Button>
                      </div>
                    </div>

                    {/* Joysticks */}
                    <div>
                      <Label className="text-xs font-medium text-gray-600 mb-2 block">Joysticks</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <Button onClick={() => addControl('joystick', 'small')} variant="outline" size="sm" className="text-xs h-8">
                          <Gamepad2 className="w-3 h-3 mr-1" />
                          S
                        </Button>
                        <Button onClick={() => addControl('joystick', 'medium')} variant="outline" size="sm" className="text-xs h-8">
                          <Gamepad2 className="w-3 h-3 mr-1" />
                          M
                        </Button>
                        <Button onClick={() => addControl('joystick', 'large')} variant="outline" size="sm" className="text-xs h-8">
                          <Gamepad2 className="w-3 h-3 mr-1" />
                          L
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Properties Panel */}
                {selectedControlData && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center">
                          <Palette className="w-4 h-4 mr-2" />
                          Properties
                        </div>
                        <Button
                          onClick={() => deleteControl(selectedControlData.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={selectedControlData.name}
                          onChange={(e) => updateControl(selectedControlData.id, { name: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Command</Label>
                        <Input
                          value={selectedControlData.command}
                          onChange={(e) => updateControl(selectedControlData.id, { command: e.target.value })}
                          placeholder="e.g., move_forward"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Input
                            type="number"
                            value={selectedControlData.size.width}
                            onChange={(e) => updateControl(selectedControlData.id, {
                              size: { ...selectedControlData.size, width: parseInt(e.target.value) || 100 }
                            })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Height</Label>
                          <Input
                            type="number"
                            value={selectedControlData.size.height}
                            onChange={(e) => updateControl(selectedControlData.id, {
                              size: { ...selectedControlData.size, height: parseInt(e.target.value) || 35 }
                            })}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Background Color</Label>
                        <Input
                          type="color"
                          value={selectedControlData.style.backgroundColor}
                          onChange={(e) => updateControl(selectedControlData.id, {
                            style: { ...selectedControlData.style, backgroundColor: e.target.value }
                          })}
                          className="h-8"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="layout" className="space-y-4">
                {/* Layout Editor */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Layout className="w-4 h-4 mr-2" />
                      Layout Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Camera Panel</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width (%)</Label>
                          <Slider
                            value={[localLayout.camera.width]}
                            onValueChange={([value]) => setLocalLayout(prev => ({
                              ...prev,
                              camera: { ...prev.camera, width: value }
                            }))}
                            max={90}
                            min={30}
                            step={5}
                            className="mt-2"
                          />
                          <span className="text-xs text-gray-500">{localLayout.camera.width}%</span>
                        </div>
                        <div>
                          <Label className="text-xs">Height (%)</Label>
                          <Slider
                            value={[localLayout.camera.height]}
                            onValueChange={([value]) => setLocalLayout(prev => ({
                              ...prev,
                              camera: { ...prev.camera, height: value }
                            }))}
                            max={90}
                            min={30}
                            step={5}
                            className="mt-2"
                          />
                          <span className="text-xs text-gray-500">{localLayout.camera.height}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-3 block">Control Panel</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width (%)</Label>
                          <Slider
                            value={[localLayout.controlPanel.width]}
                            onValueChange={([value]) => setLocalLayout(prev => ({
                              ...prev,
                              controlPanel: { ...prev.controlPanel, width: value }
                            }))}
                            max={60}
                            min={15}
                            step={5}
                            className="mt-2"
                          />
                          <span className="text-xs text-gray-500">{localLayout.controlPanel.width}%</span>
                        </div>
                        <div>
                          <Label className="text-xs">Height (%)</Label>
                          <Slider
                            value={[localLayout.controlPanel.height]}
                            onValueChange={([value]) => setLocalLayout(prev => ({
                              ...prev,
                              controlPanel: { ...prev.controlPanel, height: value }
                            }))}
                            max={90}
                            min={30}
                            step={5}
                            className="mt-2"
                          />
                          <span className="text-xs text-gray-500">{localLayout.controlPanel.height}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Main Canvas */}
          <div className="flex-1 p-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    Canvas Preview
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSave} size="sm">
                      Save Changes
                    </Button>
                    <Button onClick={onClose} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-full">
                <div 
                  ref={(node) => {
                    canvasRef.current = node;
                    drop(node);
                  }}
                  className={`relative w-full h-full bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden min-h-[500px] ${
                    isOver ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                >
                  {localControls.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Move className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">Drag controls here</p>
                        <p className="text-sm">Use the controls panel to add components</p>
                      </div>
                    </div>
                  ) : (
                    localControls.map(control => (
                      <DraggableControl key={control.id} control={control} />
                    ))
                  )}

                  {/* Layout preview overlay */}
                  {activeTab === 'layout' && (
                    <>
                      <div 
                        className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30 flex items-center justify-center"
                        style={{
                          left: `${localLayout.camera.position.x}%`,
                          top: `${localLayout.camera.position.y}%`,
                          width: `${localLayout.camera.width}%`,
                          height: `${localLayout.camera.height}%`
                        }}
                      >
                        <span className="text-blue-700 font-medium">Camera</span>
                      </div>
                      <div 
                        className="absolute border-2 border-green-500 bg-green-100 bg-opacity-30 flex items-center justify-center"
                        style={{
                          left: `${localLayout.controlPanel.position.x}%`,
                          top: `${localLayout.controlPanel.position.y}%`,
                          width: `${localLayout.controlPanel.width}%`,
                          height: `${localLayout.controlPanel.height}%`
                        }}
                      >
                        <span className="text-green-700 font-medium">Controls</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}