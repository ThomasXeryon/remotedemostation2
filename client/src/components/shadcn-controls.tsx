import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Joystick } from 'react-joystick-component';
import { Range } from 'react-range';

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

interface ControlProps {
  widget: ControlWidget;
  style: React.CSSProperties;
  isSessionActive: boolean;
  handleCommand: (command: string, params: any) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export function ShadcnButton({ widget, style, isSessionActive, handleCommand, onMouseDown }: ControlProps) {
  const handleClick = () => {
    if (!isSessionActive) return;
    handleCommand(widget.command, { action: 'click', ...widget.parameters });
  };

  return (
    <Button
      style={{
        ...style,
        backgroundColor: widget.style.backgroundColor,
        color: widget.style.textColor,
        borderColor: widget.style.borderColor,
        borderRadius: `${widget.style.borderRadius}px`,
        fontSize: `${widget.style.fontSize}px`,
        opacity: isSessionActive ? 1 : 0.6,
        cursor: isSessionActive ? 'pointer' : 'not-allowed'
      }}
      onClick={handleClick}
      onMouseDown={onMouseDown}
      disabled={!isSessionActive}
      className="border-2 font-semibold transition-all hover:scale-105 active:scale-95"
    >
      {widget.name}
    </Button>
  );
}

export function ShadcnSlider({ widget, style, isSessionActive, handleCommand, onMouseDown }: ControlProps) {
  const [value, setValue] = useState([50]);

  const handleValueChange = (newValue: number[]) => {
    if (!isSessionActive) return;
    setValue(newValue);
    handleCommand(widget.command, { value: newValue[0], ...widget.parameters });
  };

  return (
    <div
      style={{
        ...style,
        background: `linear-gradient(135deg, ${widget.style.backgroundColor}f0, ${widget.style.backgroundColor})`,
        border: `3px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius + 8}px`,
        opacity: isSessionActive ? 1 : 0.6,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: isSessionActive 
          ? `0 8px 32px ${widget.style.borderColor}30, 0 4px 16px rgba(0,0,0,0.1)` 
          : '0 4px 16px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseDown={onMouseDown}
    >
      <span 
        style={{ 
          color: widget.style.textColor, 
          fontSize: `${widget.style.fontSize + 3}px`,
          textShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontWeight: '700'
        }} 
        className="mb-4 tracking-wider uppercase"
      >
        {widget.name}
      </span>
      
      <div className="w-full flex flex-col items-center space-y-4">
        <Range
          step={1}
          min={0}
          max={100}
          values={value}
          onChange={handleValueChange}
          disabled={!isSessionActive}
          renderTrack={({ props, children }) => (
            <div
              {...props}
              className="w-full h-6 rounded-full relative"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            >
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${value[0]}%`,
                  background: `linear-gradient(90deg, ${widget.style.textColor}, ${widget.style.textColor}dd)`,
                  boxShadow: `0 0 16px ${widget.style.textColor}60`
                }}
              />
              {children}
            </div>
          )}
          renderThumb={({ props }) => (
            <div
              {...props}
              className="w-8 h-8 bg-white rounded-full shadow-xl border-3 transition-all duration-300"
              style={{
                borderColor: widget.style.textColor,
                boxShadow: `0 4px 16px rgba(0,0,0,0.2), 0 0 0 4px ${widget.style.textColor}30`,
                transform: isSessionActive ? 'scale(1)' : 'scale(0.9)'
              }}
            />
          )}
        />
        
        <div 
          className="px-4 py-2 rounded-lg border-2 bg-white/90"
          style={{ 
            borderColor: widget.style.textColor,
            boxShadow: `0 4px 12px ${widget.style.textColor}20`
          }}
        >
          <span 
            style={{ color: widget.style.textColor }} 
            className="text-xl font-bold tracking-wider"
          >
            {value[0]}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function ShadcnToggle({ widget, style, isSessionActive, handleCommand, onMouseDown }: ControlProps) {
  const [checked, setChecked] = useState(false);

  const handleToggle = (newChecked: boolean) => {
    if (!isSessionActive) return;
    setChecked(newChecked);
    handleCommand(widget.command, { enabled: newChecked, ...widget.parameters });
  };

  return (
    <div
      style={{
        ...style,
        backgroundColor: widget.style.backgroundColor,
        border: `2px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius}px`,
        opacity: isSessionActive ? 1 : 0.6,
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
      onMouseDown={onMouseDown}
      className="transition-all hover:shadow-lg"
    >
      <Switch
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={!isSessionActive}
      />
      <span 
        style={{ 
          color: widget.style.textColor, 
          fontSize: `${widget.style.fontSize}px`,
          fontWeight: '600'
        }}
      >
        {widget.name}
      </span>
    </div>
  );
}

export function ShadcnJoystick({ widget, style, isSessionActive, handleCommand, onMouseDown }: ControlProps) {
  const handleMove = (stick: any) => {
    if (!isSessionActive) return;
    
    // Convert stick position to normalized values (-100 to 100)
    const x = Math.round(stick.x * 100);
    const y = Math.round(stick.y * 100);
    
    handleCommand(widget.command, { x, y, ...widget.parameters });
  };

  const handleStop = () => {
    if (!isSessionActive) return;
    handleCommand(widget.command, { x: 0, y: 0, ...widget.parameters });
  };

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(145deg, ${widget.style.backgroundColor}, ${widget.style.backgroundColor}dd)`,
        border: `3px solid ${widget.style.borderColor}`,
        borderRadius: '50%',
        opacity: isSessionActive ? 1 : 0.6,
        filter: isSessionActive ? 'none' : 'grayscale(50%)',
        boxShadow: isSessionActive 
          ? `0 8px 32px ${widget.style.borderColor}30, 0 4px 16px rgba(0,0,0,0.1)` 
          : '0 4px 16px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease'
      }}
      onMouseDown={onMouseDown}
    >
      <Joystick
        size={Math.min((style.width as number) - 20, (style.height as number) - 20)}
        sticky={false}
        baseColor={widget.style.backgroundColor}
        stickColor={widget.style.textColor}
        move={handleMove}
        stop={handleStop}
        disabled={!isSessionActive}
        throttle={50}
      />
    </div>
  );
}