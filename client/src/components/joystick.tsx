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

  const handleSize = size / 3;
  const maxDistance = (size - handleSize) / 2;

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
        className="bg-slate-100 border-2 border-slate-300 rounded-full relative cursor-pointer select-none"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          ref={handleRef}
          className="bg-blue-500 rounded-full absolute shadow-lg transition-none"
          style={{
            width: handleSize,
            height: handleSize,
            left: `calc(50% + ${position.x}px - ${handleSize / 2}px)`,
            top: `calc(50% + ${position.y}px - ${handleSize / 2}px)`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        />
      </div>
    </div>
  );
}
