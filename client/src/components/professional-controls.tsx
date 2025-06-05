import React, { useState } from 'react';
import { Joystick } from 'react-joystick-component';
import { Range } from 'react-range';
import { ControlWidget } from './control-builder-modal';

interface ProfessionalJoystickProps {
  widget: ControlWidget;
  style: React.CSSProperties;
  isSessionActive: boolean;
  handleCommand: (command: string, params: any) => void;
}

export function ProfessionalJoystick({ widget, style, isSessionActive, handleCommand }: ProfessionalJoystickProps) {
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

interface ProfessionalSliderProps {
  widget: ControlWidget;
  style: React.CSSProperties;
  isSessionActive: boolean;
  handleCommand: (command: string, params: any) => void;
}

export function ProfessionalSlider({ widget, style, isSessionActive, handleCommand }: ProfessionalSliderProps) {
  const [value, setValue] = useState([50]);

  const handleValueChange = (values: number[]) => {
    if (!isSessionActive) return;
    setValue(values);
    handleCommand(widget.command, { value: values[0], ...widget.parameters });
  };

  return (
    <div
      style={{
        ...style,
        background: `linear-gradient(135deg, ${widget.style.backgroundColor}f0, ${widget.style.backgroundColor})`,
        border: `3px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius + 8}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 16px',
        boxShadow: isSessionActive 
          ? `0 8px 32px ${widget.style.borderColor}30, 0 4px 16px rgba(0,0,0,0.1)` 
          : '0 4px 16px rgba(0,0,0,0.05)',
        opacity: isSessionActive ? 1 : 0.6,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
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

interface ProfessionalButtonProps {
  widget: ControlWidget;
  style: React.CSSProperties;
  isSessionActive: boolean;
  handleCommand: (command: string, params: any) => void;
}

export function ProfessionalButton({ widget, style, isSessionActive, handleCommand }: ProfessionalButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    if (!isSessionActive) return;
    setIsPressed(true);
    handleCommand(widget.command, { pressed: true, ...widget.parameters });
  };

  const handleRelease = () => {
    if (!isSessionActive) return;
    setIsPressed(false);
    handleCommand(widget.command, { pressed: false, ...widget.parameters });
  };

  return (
    <button
      style={{
        ...style,
        background: isPressed 
          ? `linear-gradient(145deg, ${widget.style.backgroundColor}cc, ${widget.style.backgroundColor})` 
          : `linear-gradient(145deg, ${widget.style.backgroundColor}, ${widget.style.backgroundColor}dd)`,
        border: `3px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius}px`,
        color: widget.style.textColor,
        fontSize: `${widget.style.fontSize}px`,
        fontWeight: '700',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        cursor: isSessionActive ? 'pointer' : 'not-allowed',
        opacity: isSessionActive ? 1 : 0.6,
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
        boxShadow: isPressed 
          ? `inset 0 4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.1)` 
          : `0 6px 20px ${widget.style.borderColor}40, 0 4px 12px rgba(0,0,0,0.1)`,
        transition: 'all 0.15s ease',
        outline: 'none'
      }}
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      disabled={!isSessionActive}
    >
      {widget.name}
    </button>
  );
}

interface ProfessionalToggleProps {
  widget: ControlWidget;
  style: React.CSSProperties;
  isSessionActive: boolean;
  handleCommand: (command: string, params: any) => void;
}

export function ProfessionalToggle({ widget, style, isSessionActive, handleCommand }: ProfessionalToggleProps) {
  const [isOn, setIsOn] = useState(false);

  const handleToggle = () => {
    if (!isSessionActive) return;
    const newState = !isOn;
    setIsOn(newState);
    handleCommand(widget.command, { enabled: newState, ...widget.parameters });
  };

  return (
    <div
      style={{
        ...style,
        background: `linear-gradient(135deg, ${widget.style.backgroundColor}f0, ${widget.style.backgroundColor})`,
        border: `3px solid ${widget.style.borderColor}`,
        borderRadius: `${widget.style.borderRadius + 8}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxShadow: isSessionActive 
          ? `0 8px 32px ${widget.style.borderColor}30, 0 4px 16px rgba(0,0,0,0.1)` 
          : '0 4px 16px rgba(0,0,0,0.05)',
        opacity: isSessionActive ? 1 : 0.6,
        transition: 'all 0.3s ease',
        cursor: isSessionActive ? 'pointer' : 'not-allowed'
      }}
      onClick={handleToggle}
    >
      <span 
        style={{ 
          color: widget.style.textColor, 
          fontSize: `${widget.style.fontSize}px`,
          fontWeight: '700',
          marginBottom: '12px'
        }}
      >
        {widget.name}
      </span>
      
      <div 
        className="relative w-16 h-8 rounded-full transition-all duration-300"
        style={{
          background: isOn ? widget.style.textColor : 'rgba(255,255,255,0.3)',
          border: `2px solid ${widget.style.borderColor}`,
          boxShadow: `0 4px 12px ${isOn ? widget.style.textColor : widget.style.borderColor}30`
        }}
      >
        <div 
          className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300"
          style={{
            left: isOn ? 'calc(100% - 28px)' : '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        />
      </div>
    </div>
  );
}