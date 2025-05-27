import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MousePointer, 
  Sliders, 
  Crosshair, 
  ToggleLeft,
  Keyboard,
  X,
  RotateCcw
} from 'lucide-react';
import { ControlWidget } from '@/types';

interface ControlBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  controls: ControlWidget[];
  onSaveControls: (controls: ControlWidget[]) => void;
}

const CONTROL_TYPES = [
  { type: 'button' as const, icon: MousePointer, label: 'Button' },
  { type: 'slider' as const, icon: Sliders, label: 'Slider' },
  { type: 'joystick' as const, icon: Crosshair, label: 'Joystick' },
  { type: 'toggle' as const, icon: ToggleLeft, label: 'Toggle' },
  { type: 'input' as const, icon: Keyboard, label: 'Text Input' },
];

export function ControlBuilderModal({
  isOpen,
  onClose,
  controls,
  onSaveControls
}: ControlBuilderModalProps) {
  const [selectedControl, setSelectedControl] = useState<ControlWidget | null>(null);
  const [workingControls, setWorkingControls] = useState<ControlWidget[]>(controls);

  const handleDragStart = (controlType: ControlWidget['type']) => {
    // Implementation would handle drag start
    console.log('Drag start:', controlType);
  };

  const handleDropControl = (event: React.DragEvent) => {
    // Implementation would handle drop and create new control
    console.log('Drop control:', event);
  };

  const handleSelectControl = (control: ControlWidget) => {
    setSelectedControl(control);
  };

  const handleUpdateControl = (updates: Partial<ControlWidget>) => {
    if (!selectedControl) return;

    const updatedControls = workingControls.map(control =>
      control.id === selectedControl.id
        ? { ...control, ...updates }
        : control
    );

    setWorkingControls(updatedControls);
    setSelectedControl({ ...selectedControl, ...updates });
  };

  const handleResetControls = () => {
    setWorkingControls([]);
    setSelectedControl(null);
  };

  const handleSave = () => {
    onSaveControls(workingControls);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Control Builder</h2>
              <p className="text-sm text-slate-600 mt-1">
                Customize controls for this demo station
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-96">
          {/* Control Library */}
          <div className="w-64 bg-slate-50 border-r border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Control Types</h3>
            <div className="space-y-2">
              {CONTROL_TYPES.map(({ type, icon: Icon, label }) => (
                <div
                  key={type}
                  className="bg-white p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-500 transition-colors"
                  draggable
                  onDragStart={() => handleDragStart(type)}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 p-4 bg-slate-25">
            <div 
              className="border-2 border-dashed border-slate-300 rounded-lg h-full p-4 relative"
              onDrop={handleDropControl}
              onDragOver={(e) => e.preventDefault()}
            >
              {workingControls.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Crosshair className="w-12 h-12 mx-auto mb-2" />
                    <p>Drag controls here to customize layout</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {workingControls.map((control) => (
                    <div
                      key={control.id}
                      className={`p-3 bg-white border-2 rounded cursor-pointer transition-colors ${
                        selectedControl?.id === control.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => handleSelectControl(control)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{control.name}</span>
                        <span className="text-xs text-slate-500 capitalize">
                          ({control.type})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          <div className="w-80 bg-slate-50 border-l border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Properties</h3>
            
            {selectedControl ? (
              <div className="space-y-4 text-sm">
                <div>
                  <Label className="block font-medium text-slate-700 mb-1">
                    Control Name
                  </Label>
                  <Input
                    value={selectedControl.name}
                    onChange={(e) => handleUpdateControl({ name: e.target.value })}
                    placeholder="Enter name..."
                  />
                </div>
                
                <div>
                  <Label className="block font-medium text-slate-700 mb-1">
                    Command Mapping
                  </Label>
                  <Input
                    value={selectedControl.command}
                    onChange={(e) => handleUpdateControl({ command: e.target.value })}
                    placeholder="e.g., move_x"
                  />
                </div>
                
                {selectedControl.type === 'slider' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="block font-medium text-slate-700 mb-1">
                        Min Value
                      </Label>
                      <Input
                        type="number"
                        value={selectedControl.config.min || 0}
                        onChange={(e) => handleUpdateControl({
                          config: { ...selectedControl.config, min: Number(e.target.value) }
                        })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="block font-medium text-slate-700 mb-1">
                        Max Value
                      </Label>
                      <Input
                        type="number"
                        value={selectedControl.config.max || 100}
                        onChange={(e) => handleUpdateControl({
                          config: { ...selectedControl.config, max: Number(e.target.value) }
                        })}
                        placeholder="100"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Select a control to edit its properties
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={handleResetControls}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
