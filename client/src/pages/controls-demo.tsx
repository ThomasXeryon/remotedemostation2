import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { 
  ShadcnJoystick, 
  ShadcnSlider, 
  ShadcnButton, 
  ShadcnToggle 
} from '@/components/shadcn-controls';

const mockWidget = (type: string, position: { x: number; y: number }) => ({
  id: `demo-${type}`,
  type: type as 'button' | 'slider' | 'joystick' | 'toggle',
  name: `Demo ${type.charAt(0).toUpperCase() + type.slice(1)}`,
  command: `${type}_command`,
  parameters: {},
  position,
  size: { 
    width: type === 'joystick' ? 120 : type === 'slider' ? 200 : 120, 
    height: type === 'joystick' ? 120 : type === 'slider' ? 80 : 40 
  },
  style: {
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    borderColor: '#1d4ed8',
    borderRadius: 8,
    fontSize: 14
  }
});

export default function ControlsDemo() {
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [commandLog, setCommandLog] = useState<string[]>([]);

  const handleCommand = (command: string, params: any) => {
    const logEntry = `${command}: ${JSON.stringify(params)}`;
    setCommandLog(prev => [logEntry, ...prev.slice(0, 9)]);
  };

  const controls = [
    mockWidget('button', { x: 50, y: 50 }),
    mockWidget('slider', { x: 200, y: 50 }),
    mockWidget('joystick', { x: 450, y: 50 }),
    mockWidget('toggle', { x: 50, y: 200 })
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Professional Controls Demo</h1>
              <p className="text-gray-600">Testing shadcn/ui based control components</p>
            </div>
          </div>
          <Button
            onClick={() => setIsSessionActive(!isSessionActive)}
            className={`${isSessionActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isSessionActive ? 'Disable Controls' : 'Enable Controls'}
          </Button>
        </div>
      </div>

      {/* Main Demo Area */}
      <div className="flex h-[calc(100vh-5rem)]">
        {/* Controls Canvas */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg border-2 border-gray-200 h-full relative overflow-hidden">
            <div className="absolute top-4 left-4 text-sm text-gray-500">
              Control Canvas - {isSessionActive ? 'Active' : 'Inactive'}
            </div>
            
            {controls.map((widget) => {
              const baseStyle = {
                position: 'absolute' as const,
                left: `${widget.position.x}px`,
                top: `${widget.position.y}px`,
                width: `${widget.size.width}px`,
                height: `${widget.size.height}px`,
              };

              switch (widget.type) {
                case 'button':
                  return (
                    <ShadcnButton
                      key={widget.id}
                      widget={widget}
                      style={baseStyle}
                      isSessionActive={isSessionActive}
                      handleCommand={handleCommand}
                    />
                  );
                
                case 'slider':
                  return (
                    <ShadcnSlider
                      key={widget.id}
                      widget={widget}
                      style={baseStyle}
                      isSessionActive={isSessionActive}
                      handleCommand={handleCommand}
                    />
                  );
                
                case 'joystick':
                  return (
                    <ShadcnJoystick
                      key={widget.id}
                      widget={widget}
                      style={baseStyle}
                      isSessionActive={isSessionActive}
                      handleCommand={handleCommand}
                    />
                  );
                
                case 'toggle':
                  return (
                    <ShadcnToggle
                      key={widget.id}
                      widget={widget}
                      style={baseStyle}
                      isSessionActive={isSessionActive}
                      handleCommand={handleCommand}
                    />
                  );

                default:
                  return null;
              }
            })}
          </div>
        </div>

        {/* Command Log Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Command Log</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {commandLog.length === 0 ? (
              <p className="text-gray-500 text-sm">No commands yet. Interact with the controls!</p>
            ) : (
              commandLog.map((log, index) => (
                <div 
                  key={index} 
                  className="bg-gray-50 p-2 rounded text-xs font-mono border"
                >
                  {log}
                </div>
              ))
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <Button 
              onClick={() => setCommandLog([])} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              Clear Log
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}