import { useState, useRef, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Box, Paper, Typography } from '@mui/material';

interface JoystickPosition {
  x: number;
  y: number;
}

interface ReactDndJoystickProps {
  onPositionChange: (position: JoystickPosition) => void;
  size?: number;
  stickSize?: number;
  maxDistance?: number;
  color?: string;
  disabled?: boolean;
}

export function ReactDndJoystick({
  onPositionChange,
  size = 140,
  stickSize = 40,
  maxDistance = 50,
  color = '#1976d2',
  disabled = false
}: ReactDndJoystickProps) {
  const [position, setPosition] = useState<JoystickPosition>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'joystick-stick',
    item: { type: 'joystick-stick' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      // Return to center when drag ends
      const centerPosition = { x: 0, y: 0 };
      setPosition(centerPosition);
      onPositionChange(centerPosition);
    },
  });

  // Use empty image as drag preview to hide default preview
  preview(getEmptyImage(), { captureDraggingState: true });

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !isDragging) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let x = deltaX;
    let y = deltaY;
    
    // Constrain within circle
    if (distance > maxDistance) {
      x = (deltaX / distance) * maxDistance;
      y = (deltaY / distance) * maxDistance;
    }
    
    const normalizedX = parseFloat((x / maxDistance).toFixed(3));
    const normalizedY = parseFloat((-y / maxDistance).toFixed(3)); // Invert Y for joystick behavior
    
    const newPosition = { x: normalizedX, y: normalizedY };
    setPosition(newPosition);
    onPositionChange(newPosition);
  }, [isDragging, maxDistance, onPositionChange]);

  // Add mouse move listener when dragging
  useState(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  });

  const stickTransform = `translate(calc(-50% + ${position.x * maxDistance}px), calc(-50% + ${-position.y * maxDistance}px))`;

  return (
    <Box
      ref={containerRef}
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: '4px solid',
        borderColor: `${color}33`,
        boxShadow: `0 8px 32px ${color}30`,
        opacity: disabled ? 0.5 : 1,
        '&:hover': {
          boxShadow: disabled ? undefined : `0 12px 40px ${color}40`,
        },
        userSelect: 'none',
      }}
    >
      <Box
        ref={disabled ? undefined : drag}
        sx={{
          width: stickSize,
          height: stickSize,
          borderRadius: '50%',
          backgroundColor: 'white',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: stickTransform,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          border: '3px solid',
          borderColor: color,
          cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
          zIndex: 1,
        }}
      />
      
      {/* Center dot indicator */}
      <Box
        sx={{
          width: 4,
          height: 4,
          borderRadius: '50%',
          backgroundColor: 'white',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.7,
        }}
      />
    </Box>
  );
}

interface ReactDndJoystickDemoProps {
  title?: string;
  onCommand?: (device: string, action: string, data: any) => void;
}

export function ReactDndJoystickDemo({ 
  title = "React DnD Joystick", 
  onCommand 
}: ReactDndJoystickDemoProps) {
  const [position, setPosition] = useState<JoystickPosition>({ x: 0, y: 0 });

  const handlePositionChange = (newPosition: JoystickPosition) => {
    setPosition(newPosition);
    if (onCommand) {
      onCommand('react_dnd_joystick', 'move', newPosition);
    }
  };

  const magnitude = Math.sqrt(position.x ** 2 + position.y ** 2);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <Typography variant="h6" component="h3" fontWeight="bold" color="primary">
        {title}
      </Typography>
      
      <ReactDndJoystick onPositionChange={handlePositionChange} />
      
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          width: '100%', 
          maxWidth: 200,
          backgroundColor: 'grey.50' 
        }}
      >
        <Typography variant="body2" component="div" fontFamily="monospace" textAlign="center">
          <div>X: {position.x.toFixed(3)}</div>
          <div>Y: {position.y.toFixed(3)}</div>
          <Typography variant="caption" color="text.secondary">
            Magnitude: {magnitude.toFixed(3)}
          </Typography>
        </Typography>
      </Paper>
    </Box>
  );
}