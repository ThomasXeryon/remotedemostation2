import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

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
        backgroundColor: widget.style.backgroundColor,
        border: `2px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius}px`,
        opacity: isSessionActive ? 1 : 0.6,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}
      onMouseDown={onMouseDown}
      className="transition-all hover:shadow-lg"
    >
      <span 
        style={{ 
          color: widget.style.textColor, 
          fontSize: `${widget.style.fontSize}px`,
          fontWeight: '600'
        }}
      >
        {widget.name}
      </span>
      
      <div className="w-full px-2">
        <Slider
          value={value}
          onValueChange={handleValueChange}
          disabled={!isSessionActive}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
      
      <span 
        style={{ color: widget.style.textColor }}
        className="text-lg font-bold"
      >
        {value[0]}%
      </span>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSessionActive) return;
    if (onMouseDown) onMouseDown(e);
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !isSessionActive || !containerRef.current || !knobRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = Math.min(rect.width, rect.height) / 2 - 20;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let x = deltaX;
    let y = deltaY;
    
    if (distance > maxDistance) {
      x = (deltaX / distance) * maxDistance;
      y = (deltaY / distance) * maxDistance;
    }
    
    setPosition({ x, y });
    
    const normalizedX = Math.round((x / maxDistance) * 100);
    const normalizedY = Math.round((y / maxDistance) * 100);
    handleCommand(widget.command, { x: normalizedX, y: normalizedY, ...widget.parameters });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    if (isSessionActive) {
      handleCommand(widget.command, { x: 0, y: 0, ...widget.parameters });
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        backgroundColor: widget.style.backgroundColor,
        border: `3px solid ${widget.style.borderColor}`,
        borderRadius: '50%',
        opacity: isSessionActive ? 1 : 0.6,
        position: 'relative',
        cursor: isSessionActive ? 'grab' : 'not-allowed'
      }}
      onMouseDown={handleMouseDown}
      className="transition-all hover:shadow-lg"
    >
      {/* Center crosshairs */}
      <div 
        className="absolute top-1/2 left-0 right-0 h-px opacity-30"
        style={{ backgroundColor: widget.style.textColor }}
      />
      <div 
        className="absolute left-1/2 top-0 bottom-0 w-px opacity-30"
        style={{ backgroundColor: widget.style.textColor }}
      />
      
      {/* Moveable knob */}
      <div
        ref={knobRef}
        className="absolute w-8 h-8 rounded-full border-2 bg-white transition-all"
        style={{
          left: `calc(50% + ${position.x}px)`,
          top: `calc(50% + ${position.y}px)`,
          transform: 'translate(-50%, -50%)',
          borderColor: widget.style.textColor,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      />
    </div>
  );
}