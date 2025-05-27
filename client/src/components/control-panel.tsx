import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Square,
  Home,
  Target,
  ArrowRight
} from 'lucide-react';
import { Joystick } from './joystick';

interface ControlPanelProps {
  onCommand: (command: string, parameters?: Record<string, any>) => void;
  speed: number;
  targetPosition: number;
  safetyLimits: { min: number; max: number };
  onSpeedChange: (speed: number) => void;
  onTargetPositionChange: (position: number) => void;
}

export function ControlPanel({ 
  onCommand, 
  speed, 
  targetPosition, 
  safetyLimits,
  onSpeedChange, 
  onTargetPositionChange 
}: ControlPanelProps) {
  const [localTargetPosition, setLocalTargetPosition] = useState(targetPosition);

  const handleJoystickMove = (x: number, y: number) => {
    onCommand('joystick_move', { x, y });
  };

  const handleJoystickStop = () => {
    onCommand('joystick_stop');
  };

  const handleDirectionalMove = (direction: string) => {
    onCommand('move_direction', { direction, speed });
  };

  const handleMoveToPosition = () => {
    if (localTargetPosition >= safetyLimits.min && localTargetPosition <= safetyLimits.max) {
      onCommand('move_to_position', { position: localTargetPosition, speed });
      onTargetPositionChange(localTargetPosition);
    }
  };

  const handleHomePosition = () => {
    onCommand('home_position');
  };

  const handleCalibrate = () => {
    onCommand('calibrate');
  };

  const handleEmergencyStop = () => {
    onCommand('emergency_stop');
  };

  return (
    <div className="space-y-6">
      {/* Movement Controls */}
      <Card className="control-widget hover:shadow-lg transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Movement Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Joystick Control */}
          <div className="flex flex-col items-center space-y-4">
            <Joystick 
              onMove={handleJoystickMove}
              onStop={handleJoystickStop}
              size={120}
            />
            
            {/* Directional Buttons */}
            <div className="grid grid-cols-3 gap-2 w-32">
              <div></div>
              <Button
                variant="outline"
                size="sm"
                className="w-10 h-10 p-0"
                onMouseDown={() => handleDirectionalMove('up')}
                onMouseUp={() => onCommand('stop')}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <div></div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-10 h-10 p-0"
                onMouseDown={() => handleDirectionalMove('left')}
                onMouseUp={() => onCommand('stop')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-10 h-10 p-0"
                onClick={handleEmergencyStop}
              >
                <Square className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-10 h-10 p-0"
                onMouseDown={() => handleDirectionalMove('right')}
                onMouseUp={() => onCommand('stop')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <div></div>
              <Button
                variant="outline"
                size="sm"
                className="w-10 h-10 p-0"
                onMouseDown={() => handleDirectionalMove('down')}
                onMouseUp={() => onCommand('stop')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <div></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Speed & Position Controls */}
      <Card className="control-widget hover:shadow-lg transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Precision Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Speed Slider */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Speed (mm/s)
            </Label>
            <div className="space-y-2">
              <Slider
                value={[speed]}
                onValueChange={([newSpeed]) => onSpeedChange(newSpeed)}
                min={1}
                max={500}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>1</span>
                <span className="font-medium">{speed}</span>
                <span>500</span>
              </div>
            </div>
          </div>

          {/* Position Input */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Target Position (mm)
            </Label>
            <div className="flex space-x-2">
              <Input
                type="number"
                value={localTargetPosition}
                onChange={(e) => setLocalTargetPosition(Number(e.target.value))}
                min={safetyLimits.min}
                max={safetyLimits.max}
                className="flex-1"
              />
              <Button onClick={handleMoveToPosition} size="sm">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleHomePosition}
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              <Home className="w-4 h-4 mr-1" />
              Home
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCalibrate}
              className="text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              <Target className="w-4 h-4 mr-1" />
              Calibrate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Safety & Limits */}
      <Card className="control-widget hover:shadow-lg transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Safety Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Software Limits */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-slate-700">
                Software Limits
              </Label>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                Active
              </span>
            </div>
            <div className="flex space-x-2 text-sm">
              <div className="flex-1">
                <Label className="block text-xs text-slate-500">Min (mm)</Label>
                <Input
                  type="number"
                  value={safetyLimits.min}
                  disabled
                  className="text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="block text-xs text-slate-500">Max (mm)</Label>
                <Input
                  type="number"
                  value={safetyLimits.max}
                  disabled
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Emergency Controls */}
          <div className="pt-2 border-t border-slate-200">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleEmergencyStop}
            >
              <Square className="w-4 h-4 mr-2" />
              EMERGENCY STOP
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
