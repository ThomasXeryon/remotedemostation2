import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, Eye, Move, Palette, Settings, MousePointer, Gamepad2 } from 'lucide-react';

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

interface ControlBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  controls: ControlWidget[];
  onSaveControls: (controls: ControlWidget[]) => void;
}

export function ControlBuilderModal({
  isOpen,
  onClose,
  controls,
  onSaveControls
}: ControlBuilderModalProps) {
  const [localControls, setLocalControls] = useState<ControlWidget[]>(controls);
  const [selectedControl, setSelectedControl] = useState<string | null>(null);
  const [draggedControl, setDraggedControl] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const defaultStyle = {
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    borderColor: '#2563eb',
    borderRadius: 6,
    fontSize: 14,
  };

  const addControl = (type: ControlWidget['type']) => {
    const newControl: ControlWidget = {
      id: `control-${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      command: '',
      position: { x: 50, y: 50 },
      size: getDefaultSize(type),
      style: { ...defaultStyle }
    };
    setLocalControls([...localControls, newControl]);
    setSelectedControl(newControl.id);
  };

  const getDefaultSize = (type: ControlWidget['type']) => {
    switch (type) {
      case 'button': return { width: 120, height: 40 };
      case 'slider': return { width: 200, height: 30 };
      case 'toggle': return { width: 60, height: 30 };
      case 'joystick': return { width: 120, height: 120 };
      default: return { width: 120, height: 40 };
    }
  };

  const updateControl = (id: string, updates: Partial<ControlWidget>) => {
    const updatedControls = localControls.map(control =>
      control.id === id ? { ...control, ...updates } : control
    );
    setLocalControls(updatedControls);
  };

  const deleteControl = (id: string) => {
    setLocalControls(localControls.filter(control => control.id !== id));
    if (selectedControl === id) {
      setSelectedControl(null);
    }
  };

  // Drag and drop handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, controlId: string) => {
    e.preventDefault();
    const control = localControls.find(c => c.id === controlId);
    if (!control) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedControl(controlId);
    setSelectedControl(controlId);
  }, [localControls]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedControl || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;

    updateControl(draggedControl, {
      position: {
        x: Math.max(0, Math.min(newX, canvasRect.width - 120)),
        y: Math.max(0, Math.min(newY, canvasRect.height - 40))
      }
    });
  }, [draggedControl, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggedControl(null);
  }, []);

  // Add event listeners for drag functionality
  React.useEffect(() => {
    if (draggedControl) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedControl, handleMouseMove, handleMouseUp]);

  const selectedControlData = localControls.find(c => c.id === selectedControl);

  const handleSelectControl = (control: ControlWidget) => {
    setSelectedControl(control.id);
  };

  const handleSave = () => {
    onSaveControls(localControls);
    onClose();
  };

  // Render control based on type
  const renderControl = (control: ControlWidget) => {
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
      cursor: draggedControl === control.id ? 'grabbing' : 'grab',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none' as const,
      outline: selectedControl === control.id ? '2px solid #f59e0b' : 'none',
      outlineOffset: '2px',
      zIndex: selectedControl === control.id ? 10 : 1,
    };

    switch (control.type) {
      case 'button':
        return (
          <div
            key={control.id}
            style={style}
            onMouseDown={(e) => handleMouseDown(e, control.id)}
            className="font-medium shadow-sm hover:shadow-md transition-shadow"
          >
            {control.name}
          </div>
        );

      case 'slider':
        return (
          <div
            key={control.id}
            style={{...style, padding: '4px'}}
            onMouseDown={(e) => handleMouseDown(e, control.id)}
            className="shadow-sm"
          >
            <div 
              className="w-full h-2 rounded-full"
              style={{backgroundColor: control.style.borderColor}}
            />
          </div>
        );

      case 'toggle':
        return (
          <div
            key={control.id}
            style={{...style, padding: '4px'}}
            onMouseDown={(e) => handleMouseDown(e, control.id)}
            className="shadow-sm"
          >
            <div 
              className="w-8 h-4 rounded-full relative"
              style={{backgroundColor: control.style.borderColor}}
            >
              <div 
                className="w-3 h-3 rounded-full absolute top-0.5 left-0.5 transition-transform"
                style={{backgroundColor: control.style.textColor}}
              />
            </div>
          </div>
        );

      case 'joystick':
        return (
          <div
            key={control.id}
            style={{...style, borderRadius: '50%'}}
            onMouseDown={(e) => handleMouseDown(e, control.id)}
            className="shadow-sm"
          >
            <div 
              className="w-12 h-12 rounded-full"
              style={{backgroundColor: control.style.textColor}}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Gamepad2 className="w-5 h-5" />
            <span>Control Builder</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          {/* Control Palette */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Controls</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => addControl('button')} 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <MousePointer className="w-4 h-4 mr-2" />
                  Button
                </Button>
                <Button 
                  onClick={() => addControl('slider')} 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Slider
                </Button>
                <Button 
                  onClick={() => addControl('toggle')} 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Toggle
                </Button>
                <Button 
                  onClick={() => addControl('joystick')} 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <Move className="w-4 h-4 mr-2" />
                  Joystick
                </Button>
              </CardContent>
            </Card>

            {/* Property Panel */}
            {selectedControlData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Palette className="w-4 h-4" />
                      <span>Properties</span>
                    </div>
                    <Button
                      onClick={() => deleteControl(selectedControlData.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="style">Style</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
                      <div>
                        <Label htmlFor="control-name">Name</Label>
                        <Input
                          id="control-name"
                          value={selectedControlData.name}
                          onChange={(e) => updateControl(selectedControlData.id, { name: e.target.value })}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="control-command">Command</Label>
                        <Input
                          id="control-command"
                          value={selectedControlData.command}
                          onChange={(e) => updateControl(selectedControlData.id, { command: e.target.value })}
                          placeholder="e.g., move_forward"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Width</Label>
                          <Input
                            type="number"
                            value={selectedControlData.size.width}
                            onChange={(e) => updateControl(selectedControlData.id, {
                              size: { ...selectedControlData.size, width: parseInt(e.target.value) || 120 }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Height</Label>
                          <Input
                            type="number"
                            value={selectedControlData.size.height}
                            onChange={(e) => updateControl(selectedControlData.id, {
                              size: { ...selectedControlData.size, height: parseInt(e.target.value) || 40 }
                            })}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="style" className="space-y-4">
                      <div>
                        <Label>Background Color</Label>
                        <Input
                          type="color"
                          value={selectedControlData.style.backgroundColor}
                          onChange={(e) => updateControl(selectedControlData.id, {
                            style: { ...selectedControlData.style, backgroundColor: e.target.value }
                          })}
                        />
                      </div>

                      <div>
                        <Label>Text Color</Label>
                        <Input
                          type="color"
                          value={selectedControlData.style.textColor}
                          onChange={(e) => updateControl(selectedControlData.id, {
                            style: { ...selectedControlData.style, textColor: e.target.value }
                          })}
                        />
                      </div>

                      <div>
                        <Label>Border Color</Label>
                        <Input
                          type="color"
                          value={selectedControlData.style.borderColor}
                          onChange={(e) => updateControl(selectedControlData.id, {
                            style: { ...selectedControlData.style, borderColor: e.target.value }
                          })}
                        />
                      </div>

                      <div>
                        <Label>Border Radius: {selectedControlData.style.borderRadius}px</Label>
                        <Slider
                          value={[selectedControlData.style.borderRadius]}
                          onValueChange={([value]) => updateControl(selectedControlData.id, {
                            style: { ...selectedControlData.style, borderRadius: value }
                          })}
                          max={20}
                          step={1}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label>Font Size: {selectedControlData.style.fontSize}px</Label>
                        <Slider
                          value={[selectedControlData.style.fontSize]}
                          onValueChange={([value]) => updateControl(selectedControlData.id, {
                            style: { ...selectedControlData.style, fontSize: value }
                          })}
                          min={10}
                          max={24}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Canvas */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>Control Canvas</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={onClose} variant="outline">
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      Save Layout
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div 
                  ref={canvasRef}
                  className="relative w-full h-[400px] bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden"
                  style={{ minHeight: '400px' }}
                >
                  {localControls.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Move className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">Drag controls here</p>
                        <p className="text-sm">Click "Add Controls" to get started</p>
                      </div>
                    </div>
                  ) : (
                    localControls.map(renderControl)
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