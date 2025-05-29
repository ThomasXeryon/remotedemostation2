
import { useRef, useEffect, useState, useCallback } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  onStop: () => void;
  size?: number;
  className?: string;
}

export function Joystick({ onMove, onStop, size = 120, className = '' }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleSize = Math.min(size / 3, 40);
  const maxDistance = (size - handleSize) / 2 - 8; // Leave padding from edge

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!baseRef.current) return;

    const baseRect = baseRef.current.getBoundingClientRect();
    const centerX = baseRect.left + baseRect.width / 2;
    const centerY = baseRect.top + baseRect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let newX = deltaX;
    let newY = deltaY;

    if (distance > maxDistance) {
      const ratio = maxDistance / distance;
      newX = deltaX * ratio;
      newY = deltaY * ratio;
    }

    setPosition({ x: newX, y: newY });

    // Normalize to -1 to 1 range
    const normalizedX = newX / maxDistance;
    const normalizedY = -newY / maxDistance; // Invert Y axis

    onMove(normalizedX, normalizedY);
  }, [maxDistance, onMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
    e.preventDefault();
  }, [updatePosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX, e.clientY);
  }, [isDragging, updatePosition]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onStop();
  }, [isDragging, onStop]);

  // Touch events for mobile support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    updatePosition(touch.clientX, touch.clientY);
    e.preventDefault();
  }, [updatePosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
    e.preventDefault();
  }, [isDragging, updatePosition]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onStop();
  }, [isDragging, onStop]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={baseRef}
        className="relative cursor-grab select-none transition-all duration-150"
        style={{ 
          width: size, 
          height: size,
          background: 'linear-gradient(145deg, #f8fafc, #e2e8f0)',
          border: '3px solid #cbd5e1',
          borderRadius: '50%',
          boxShadow: isDragging 
            ? 'inset 0 4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.1)' 
            : '0 6px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Crosshair guides */}
        <div 
          className="absolute w-full h-0.5 bg-slate-400 opacity-20"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />
        <div 
          className="absolute h-full w-0.5 bg-slate-400 opacity-20"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />
        
        {/* Center dot */}
        <div 
          className="absolute w-2 h-2 bg-slate-400 rounded-full opacity-30"
          style={{ 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)' 
          }}
        />
        
        {/* Handle */}
        <div
          ref={handleRef}
          className="absolute rounded-full transition-all duration-150"
          style={{
            width: handleSize,
            height: handleSize,
            left: `calc(50% + ${position.x}px - ${handleSize / 2}px)`,
            top: `calc(50% + ${position.y}px - ${handleSize / 2}px)`,
            background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
            border: '2px solid #3b82f6',
            boxShadow: isDragging 
              ? '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(0,0,0,0.1)' 
              : '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
            cursor: isDragging ? 'grabbing' : 'grab',
            transitionDuration: isDragging ? '0ms' : '150ms',
          }}
        >
          {/* Handle inner highlight */}
          <div 
            className="absolute inset-1 rounded-full opacity-40"
            style={{ 
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), transparent 50%)'
            }}
          />
        </div>
      </div>
    </div>
  );
}
