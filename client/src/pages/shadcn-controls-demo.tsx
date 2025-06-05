import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Square, RotateCcw, Trash2 } from "lucide-react";

interface CommandLog {
  timestamp: string;
  device: string;
  action: string;
  data: any;
}

interface JoystickPosition {
  x: number;
  y: number;
}

export default function ShadcnControlsDemo() {
  const [commandHistory, setCommandHistory] = useState<CommandLog[]>([]);
  const [joystickPosition, setJoystickPosition] = useState<JoystickPosition>({ x: 0, y: 0 });
  const [sliderValue, setSliderValue] = useState([50]);
  const [combinedSlider, setCombinedSlider] = useState([25]);
  const [isDragging, setIsDragging] = useState(false);
  
  const joystickRef = useRef<HTMLDivElement>(null);
  const combinedJoystickRef = useRef<HTMLDivElement>(null);

  const logCommand = (device: string, action: string, data: any) => {
    const command: CommandLog = {
      timestamp: new Date().toISOString(),
      device,
      action,
      data
    };
    
    setCommandHistory(prev => [command, ...prev.slice(0, 49)]);
  };

  const clearCommandLog = () => {
    setCommandHistory([]);
  };

  // Joystick functionality
  const handleJoystickMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!joystickRef.current) return;
      
      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 50;
      
      let x = deltaX;
      let y = deltaY;
      
      if (distance > maxDistance) {
        x = (deltaX / distance) * maxDistance;
        y = (deltaY / distance) * maxDistance;
      }
      
      const normalizedX = parseFloat((x / maxDistance).toFixed(3));
      const normalizedY = parseFloat((-y / maxDistance).toFixed(3));
      
      setJoystickPosition({ x: normalizedX, y: normalizedY });
      logCommand('shadcn_joystick', 'move', { x: normalizedX, y: normalizedY });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setJoystickPosition({ x: 0, y: 0 });
      logCommand('shadcn_joystick', 'stop', { x: 0, y: 0 });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    logCommand('shadcn_slider', 'change', { value: value[0] });
  };

  const handleCombinedSliderChange = (value: number[]) => {
    setCombinedSlider(value);
    logCommand('combined_shadcn_slider', 'intensity_update', { intensity: value[0] });
  };

  // Initialize demo
  useEffect(() => {
    logCommand('shadcn_system', 'initialized', { 
      framework: 'shadcn/ui',
      components: ['Slider', 'Card', 'Button', 'Badge'],
      timestamp: new Date().toISOString()
    });
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-4xl font-bold flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
            shadcn/ui Professional Controls
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Remote Demo Station using shadcn/ui components for hardware control interfaces
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border">
              <Badge variant="secondary" className="mb-2">shadcn/ui Slider</Badge>
              <p className="text-sm text-muted-foreground">Professional range controls with custom styling</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border">
              <Badge variant="secondary" className="mb-2">Custom Joystick</Badge>
              <p className="text-sm text-muted-foreground">Touch-responsive directional control</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border">
              <Badge variant="secondary" className="mb-2">Real-time Commands</Badge>
              <p className="text-sm text-muted-foreground">Live hardware command streaming</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Control Demonstrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Joystick Demo */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-xl text-blue-700 dark:text-blue-300">
              shadcn/ui Joystick
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div 
                ref={joystickRef}
                className="relative w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full border-4 border-blue-300 cursor-pointer shadow-lg"
                onMouseDown={handleJoystickMouseDown}
              >
                <div 
                  className="absolute w-8 h-8 bg-white rounded-full border-2 border-blue-600 shadow-md transition-all duration-75"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${joystickPosition.x * 50}px), calc(-50% + ${-joystickPosition.y * 50}px))`
                  }}
                />
              </div>
            </div>
            
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="text-center font-mono text-sm">
                  <div>X: {joystickPosition.x.toFixed(3)}</div>
                  <div>Y: {joystickPosition.y.toFixed(3)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Magnitude: {Math.sqrt(joystickPosition.x**2 + joystickPosition.y**2).toFixed(3)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Slider Demo */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-xl text-green-700 dark:text-green-300">
              shadcn/ui Slider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
                {sliderValue[0]}%
              </div>
              
              <div className="px-4">
                <Slider
                  value={sliderValue}
                  onValueChange={handleSliderChange}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="text-center font-mono text-sm">
                  <div>Value: {sliderValue[0]}%</div>
                  <div>Normalized: {(sliderValue[0] / 100).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Range: 0-100
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Combined Controls */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="text-xl text-purple-700 dark:text-purple-300">
              Combined Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div 
                ref={combinedJoystickRef}
                className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full border-2 border-purple-300 cursor-pointer"
                onMouseDown={(e) => {
                  // Similar joystick logic for combined control
                  logCommand('combined_joystick', 'interaction', { type: 'start' });
                }}
              >
                <div className="absolute w-5 h-5 bg-white rounded-full border border-purple-600 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
            
            <div className="px-2">
              <Slider
                value={combinedSlider}
                onValueChange={handleCombinedSliderChange}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="text-center font-mono text-xs">
                  <div>Intensity: {combinedSlider[0]}%</div>
                  <div>Status: Active</div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      {/* Command Log */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Hardware Command Stream
            </CardTitle>
            <Button variant="destructive" size="sm" onClick={clearCommandLog}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full rounded-md border bg-muted/50 p-4">
            {commandHistory.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                // Waiting for control interactions...
              </div>
            ) : (
              <div className="space-y-1 font-mono text-sm">
                {commandHistory.map((cmd, index) => (
                  <div 
                    key={index} 
                    className={`${index === 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}
                  >
                    <span className="text-muted-foreground">
                      [{cmd.timestamp.split('T')[1].split('.')[0]}]
                    </span>{' '}
                    {cmd.device}.{cmd.action}({JSON.stringify(cmd.data)})
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}