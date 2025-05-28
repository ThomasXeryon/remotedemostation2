import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Eye } from 'lucide-react';

export interface ControlWidget {
  id: string;
  name: string;
  type: 'button' | 'slider' | 'toggle';
  command: string;
  parameters?: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface ControlEditorProps {
  controls: ControlWidget[];
  onControlsChange: (controls: ControlWidget[]) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function ControlEditor({ controls, onControlsChange, onSave, isSaving }: ControlEditorProps) {
  const [selectedControl, setSelectedControl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const addControl = () => {
    const newControl: ControlWidget = {
      id: `control-${Date.now()}`,
      name: 'New Control',
      type: 'button',
      command: '',
      position: { x: 10, y: 10 },
      size: { width: 120, height: 40 }
    };
    onControlsChange([...controls, newControl]);
    setSelectedControl(newControl.id);
  };

  const updateControl = (id: string, updates: Partial<ControlWidget>) => {
    const updatedControls = controls.map(control =>
      control.id === id ? { ...control, ...updates } : control
    );
    onControlsChange(updatedControls);
  };

  const deleteControl = (id: string) => {
    onControlsChange(controls.filter(control => control.id !== id));
    if (selectedControl === id) {
      setSelectedControl(null);
    }
  };

  const selectedControlData = controls.find(c => c.id === selectedControl);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Control Configuration</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Controls'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Controls
              <Button size="sm" onClick={addControl}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {controls.length === 0 ? (
              <p className="text-gray-500 text-sm">No controls configured</p>
            ) : (
              controls.map(control => (
                <div
                  key={control.id}
                  className={`p-3 border rounded cursor-pointer flex items-center justify-between ${
                    selectedControl === control.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedControl(control.id)}
                >
                  <div>
                    <div className="font-medium text-sm">{control.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{control.type}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteControl(control.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Control Properties */}
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedControlData ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={selectedControlData.name}
                    onChange={(e) => updateControl(selectedControl!, { name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={selectedControlData.type} 
                    onValueChange={(value: 'button' | 'slider' | 'toggle') => 
                      updateControl(selectedControl!, { type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="button">Button</SelectItem>
                      <SelectItem value="slider">Slider</SelectItem>
                      <SelectItem value="toggle">Toggle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="command">Command</Label>
                  <Input
                    id="command"
                    value={selectedControlData.command}
                    onChange={(e) => updateControl(selectedControl!, { command: e.target.value })}
                    placeholder="e.g., move_forward, set_speed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="width">Width</Label>
                    <Input
                      id="width"
                      type="number"
                      value={selectedControlData.size.width}
                      onChange={(e) => updateControl(selectedControl!, { 
                        size: { ...selectedControlData.size, width: parseInt(e.target.value) || 120 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height</Label>
                    <Input
                      id="height"
                      type="number"
                      value={selectedControlData.size.height}
                      onChange={(e) => updateControl(selectedControl!, { 
                        size: { ...selectedControlData.size, height: parseInt(e.target.value) || 40 }
                      })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Select a control to edit its properties</p>
            )}
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {showPreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-64 relative bg-gray-50">
                {controls.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    Add controls to see preview
                  </div>
                ) : (
                  controls.map(control => (
                    <div
                      key={control.id}
                      className={`absolute ${
                        selectedControl === control.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{
                        left: control.position.x,
                        top: control.position.y,
                        width: control.size.width,
                        height: control.size.height
                      }}
                    >
                      {control.type === 'button' && (
                        <Button 
                          size="sm" 
                          className="w-full h-full text-xs"
                          variant="outline"
                          disabled
                        >
                          {control.name}
                        </Button>
                      )}
                      {control.type === 'slider' && (
                        <div className="w-full h-full bg-white border rounded flex items-center px-2">
                          <input 
                            type="range" 
                            className="w-full" 
                            disabled 
                          />
                        </div>
                      )}
                      {control.type === 'toggle' && (
                        <div className="w-full h-full bg-white border rounded flex items-center justify-center">
                          <div className="w-8 h-4 bg-gray-300 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Click "Show Preview" to see how controls will look
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}