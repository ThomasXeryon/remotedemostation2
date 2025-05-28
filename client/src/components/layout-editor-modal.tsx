import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Monitor, Settings, Layout, Save, RotateCcw } from 'lucide-react';

export interface LayoutConfig {
  camera: {
    width: number; // percentage of total width
    height: number; // percentage of total height
    position: { x: number; y: number }; // percentage positions
  };
  controlPanel: {
    width: number; // percentage of total width
    height: number; // percentage of total height
    position: { x: number; y: number }; // percentage positions
  };
}

interface LayoutEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  layout: LayoutConfig;
  onSaveLayout: (layout: LayoutConfig) => void;
}

export function LayoutEditorModal({
  isOpen,
  onClose,
  layout,
  onSaveLayout
}: LayoutEditorModalProps) {
  const [localLayout, setLocalLayout] = useState<LayoutConfig>(layout);
  const [draggedElement, setDraggedElement] = useState<'camera' | 'controlPanel' | null>(null);
  const [resizingElement, setResizingElement] = useState<'camera' | 'controlPanel' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const defaultLayout: LayoutConfig = {
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
  };

  const updateLayout = (element: 'camera' | 'controlPanel', updates: Partial<LayoutConfig['camera']>) => {
    setLocalLayout(prev => ({
      ...prev,
      [element]: { ...prev[element], ...updates }
    }));
  };

  const resetToDefault = () => {
    setLocalLayout(defaultLayout);
  };

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, element: 'camera' | 'controlPanel') => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedElement(element);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedElement || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = ((e.clientX - canvasRect.left - dragOffset.x) / canvasRect.width) * 100;
    const newY = ((e.clientY - canvasRect.top - dragOffset.y) / canvasRect.height) * 100;

    updateLayout(draggedElement, {
      position: {
        x: Math.max(0, Math.min(newX, 100 - localLayout[draggedElement].width)),
        y: Math.max(0, Math.min(newY, 100 - localLayout[draggedElement].height))
      }
    });
  }, [draggedElement, dragOffset, localLayout]);

  const handleMouseUp = useCallback(() => {
    setDraggedElement(null);
    setResizingElement(null);
  }, []);

  // Add event listeners for drag functionality
  React.useEffect(() => {
    if (draggedElement || resizingElement) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedElement, resizingElement, handleMouseMove, handleMouseUp]);

  const handleSave = () => {
    onSaveLayout(localLayout);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <Layout className="w-5 h-5" />
            <span>Interface Layout Editor</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-full">
          {/* Layout Controls */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-screen">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Layout Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={resetToDefault} variant="outline" className="w-full">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Default
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>Camera Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Width: {localLayout.camera.width}%</Label>
                  <Slider
                    value={[localLayout.camera.width]}
                    onValueChange={([value]) => updateLayout('camera', { width: value })}
                    min={20}
                    max={80}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Height: {localLayout.camera.height}%</Label>
                  <Slider
                    value={[localLayout.camera.height]}
                    onValueChange={([value]) => updateLayout('camera', { height: value })}
                    min={30}
                    max={90}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>X Position</Label>
                    <Input
                      type="number"
                      value={Math.round(localLayout.camera.position.x)}
                      onChange={(e) => updateLayout('camera', {
                        position: { ...localLayout.camera.position, x: parseInt(e.target.value) || 0 }
                      })}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <Label>Y Position</Label>
                    <Input
                      type="number"
                      value={Math.round(localLayout.camera.position.y)}
                      onChange={(e) => updateLayout('camera', {
                        position: { ...localLayout.camera.position, y: parseInt(e.target.value) || 0 }
                      })}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Control Panel Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Width: {localLayout.controlPanel.width}%</Label>
                  <Slider
                    value={[localLayout.controlPanel.width]}
                    onValueChange={([value]) => updateLayout('controlPanel', { width: value })}
                    min={15}
                    max={50}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Height: {localLayout.controlPanel.height}%</Label>
                  <Slider
                    value={[localLayout.controlPanel.height]}
                    onValueChange={([value]) => updateLayout('controlPanel', { height: value })}
                    min={30}
                    max={90}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>X Position</Label>
                    <Input
                      type="number"
                      value={Math.round(localLayout.controlPanel.position.x)}
                      onChange={(e) => updateLayout('controlPanel', {
                        position: { ...localLayout.controlPanel.position, x: parseInt(e.target.value) || 0 }
                      })}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <Label>Y Position</Label>
                    <Input
                      type="number"
                      value={Math.round(localLayout.controlPanel.position.y)}
                      onChange={(e) => updateLayout('controlPanel', {
                        position: { ...localLayout.controlPanel.position, y: parseInt(e.target.value) || 0 }
                      })}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visual Layout Canvas */}
          <div className="lg:col-span-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layout className="w-4 h-4" />
                    <span>Visual Layout Preview</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={onClose} variant="outline">
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Layout
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div 
                  ref={canvasRef}
                  className="relative w-full bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden rounded-lg"
                  style={{ height: '500px', minHeight: '500px' }}
                >
                  {/* Camera Preview */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${localLayout.camera.position.x}%`,
                      top: `${localLayout.camera.position.y}%`,
                      width: `${localLayout.camera.width}%`,
                      height: `${localLayout.camera.height}%`,
                      cursor: draggedElement === 'camera' ? 'grabbing' : 'grab',
                      zIndex: draggedElement === 'camera' ? 10 : 1,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'camera')}
                    className="bg-black rounded border-2 border-blue-500 shadow-lg"
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium">
                      <Monitor className="w-6 h-6 mr-2" />
                      Camera Feed
                    </div>
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Drag to Move
                    </div>
                  </div>

                  {/* Control Panel Preview */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${localLayout.controlPanel.position.x}%`,
                      top: `${localLayout.controlPanel.position.y}%`,
                      width: `${localLayout.controlPanel.width}%`,
                      height: `${localLayout.controlPanel.height}%`,
                      cursor: draggedElement === 'controlPanel' ? 'grabbing' : 'grab',
                      zIndex: draggedElement === 'controlPanel' ? 10 : 1,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'controlPanel')}
                    className="bg-white rounded border-2 border-green-500 shadow-lg overflow-hidden"
                  >
                    <div className="h-full flex flex-col">
                      <div className="bg-green-500 text-white text-xs px-3 py-2 font-medium">
                        Control Panel
                      </div>
                      <div className="flex-1 p-3 space-y-2">
                        <div className="bg-blue-100 rounded p-2 text-xs">Hardware Controls</div>
                        <div className="bg-gray-100 rounded p-2 text-xs">Status Display</div>
                        <div className="bg-orange-100 rounded p-2 text-xs">Telemetry Data</div>
                      </div>
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Drag to Move
                      </div>
                    </div>
                  </div>

                  {/* Grid overlay for alignment */}
                  <div className="absolute inset-0 pointer-events-none opacity-20">
                    {Array.from({ length: 11 }, (_, i) => (
                      <div key={`v-${i}`} className="absolute border-l border-gray-400" style={{ left: `${i * 10}%`, height: '100%' }} />
                    ))}
                    {Array.from({ length: 11 }, (_, i) => (
                      <div key={`h-${i}`} className="absolute border-t border-gray-400" style={{ top: `${i * 10}%`, width: '100%' }} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}