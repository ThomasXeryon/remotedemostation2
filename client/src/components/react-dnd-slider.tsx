import { useState, useRef, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Box, Paper, Typography } from '@mui/material';

interface ReactDndSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  width?: number;
  height?: number;
  color?: string;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export function ReactDndSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  width = 200,
  height = 8,
  color = '#1976d2',
  disabled = false,
  orientation = 'horizontal'
}: ReactDndSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVertical = orientation === 'vertical';
  
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'slider-thumb',
    item: { type: 'slider-thumb' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Use empty image as drag preview
  preview(getEmptyImage(), { captureDraggingState: true });

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !isDragging) return;

    const rect = containerRef.current.getBoundingClientRect();
    let ratio: number;

    if (isVertical) {
      const relativeY = event.clientY - rect.top;
      ratio = Math.max(0, Math.min(1, 1 - relativeY / rect.height)); // Invert for vertical
    } else {
      const relativeX = event.clientX - rect.left;
      ratio = Math.max(0, Math.min(1, relativeX / rect.width));
    }

    const range = max - min;
    const rawValue = min + ratio * range;
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    
    onChange(clampedValue);
  }, [isDragging, min, max, step, onChange, isVertical]);

  // Add mouse move listener when dragging
  useState(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  });

  const percentage = ((value - min) / (max - min)) * 100;
  const trackSize = isVertical ? height : width;
  const thumbSize = 24;

  const trackStyles = {
    width: isVertical ? height : width,
    height: isVertical ? width : height,
    backgroundColor: '#e0e0e0',
    borderRadius: height / 2,
    position: 'relative' as const,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const fillStyles = {
    width: isVertical ? '100%' : `${percentage}%`,
    height: isVertical ? `${percentage}%` : '100%',
    backgroundColor: color,
    borderRadius: height / 2,
    position: 'absolute' as const,
    bottom: isVertical ? 0 : 'auto',
    left: 0,
  };

  const thumbPosition = isVertical 
    ? { bottom: `calc(${percentage}% - ${thumbSize / 2}px)`, left: '50%' }
    : { left: `calc(${percentage}% - ${thumbSize / 2}px)`, top: '50%' };

  const thumbStyles = {
    width: thumbSize,
    height: thumbSize,
    backgroundColor: 'white',
    border: `3px solid ${color}`,
    borderRadius: '50%',
    position: 'absolute' as const,
    transform: 'translate(-50%, -50%)',
    cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    zIndex: 1,
    ...thumbPosition,
  };

  return (
    <Box
      ref={containerRef}
      sx={trackStyles}
    >
      <Box sx={fillStyles} />
      <Box
        ref={disabled ? undefined : drag}
        sx={thumbStyles}
      />
    </Box>
  );
}

interface ReactDndSliderDemoProps {
  title?: string;
  initialValue?: number;
  min?: number;
  max?: number;
  color?: string;
  orientation?: 'horizontal' | 'vertical';
  onCommand?: (device: string, action: string, data: any) => void;
}

export function ReactDndSliderDemo({ 
  title = "React DnD Slider",
  initialValue = 50,
  min = 0,
  max = 100,
  color = '#1976d2',
  orientation = 'horizontal',
  onCommand 
}: ReactDndSliderDemoProps) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (newValue: number) => {
    setValue(newValue);
    if (onCommand) {
      onCommand('react_dnd_slider', 'change', { value: newValue });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Typography variant="h6" component="h3" fontWeight="bold" color="primary">
        {title}
      </Typography>
      
      <Typography variant="h3" component="div" color={color} fontWeight="bold">
        {value}%
      </Typography>
      
      <ReactDndSlider
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        color={color}
        orientation={orientation}
        width={orientation === 'horizontal' ? 200 : 8}
        height={orientation === 'horizontal' ? 8 : 200}
      />
      
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
          <div>Value: {value}%</div>
          <div>Normalized: {(value / 100).toFixed(2)}</div>
          <Typography variant="caption" color="text.secondary">
            Range: {min}-{max}
          </Typography>
        </Typography>
      </Paper>
    </Box>
  );
}