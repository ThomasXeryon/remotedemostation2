import { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Slider,
  Switch,
  FormControlLabel,
  Typography,
  Paper,
  Stack,
} from '@mui/material';

interface JoystickPosition {
  x: number;
  y: number;
}

interface MaterialJoystickProps {
  onMove: (position: JoystickPosition) => void;
  onStop: (position: JoystickPosition) => void;
  size?: number | { xs: number; sm: number };
  disabled?: boolean;
}

export function MaterialJoystick({ onMove, onStop, size = 120, disabled = false }: MaterialJoystickProps) {
  const [position, setPosition] = useState<JoystickPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  
  // Calculate responsive size
  const joystickSize = typeof size === 'object' 
    ? (window.innerWidth < 600 ? size.xs : size.sm)
    : typeof size === 'number' ? size : 120;

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled) return;
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
      const maxDistance = joystickSize / 2 - 20;

      let x = deltaX;
      let y = deltaY;

      if (distance > maxDistance) {
        x = (deltaX / distance) * maxDistance;
        y = (deltaY / distance) * maxDistance;
      }

      const normalizedX = parseFloat((x / maxDistance).toFixed(3));
      const normalizedY = parseFloat((-y / maxDistance).toFixed(3));

      const newPosition = { x: normalizedX, y: normalizedY };
      setPosition(newPosition);
      onMove(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const resetPosition = { x: 0, y: 0 };
      setPosition(resetPosition);
      onStop(resetPosition);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, onMove, onStop, size]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box
        ref={joystickRef}
        onMouseDown={handleMouseDown}
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: disabled 
            ? 'linear-gradient(135deg, #ccc 0%, #999 100%)'
            : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          position: 'relative',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: '3px solid',
          borderColor: disabled ? 'grey.400' : 'primary.light',
          boxShadow: disabled ? 'none' : '0 4px 16px rgba(25, 118, 210, 0.3)',
          transition: 'all 0.2s ease',
          '&:hover': disabled ? {} : {
            boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
          },
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: 'white',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${position.x * (joystickSize / 2 - 20)}px), calc(-50% + ${-position.y * (joystickSize / 2 - 20)}px))`,
            transition: isDragging ? 'none' : 'transform 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            border: '2px solid',
            borderColor: disabled ? 'grey.600' : 'primary.dark',
          }}
        />
      </Box>
      <Paper elevation={1} sx={{ p: 1, minWidth: 120 }}>
        <Typography variant="caption" component="div" textAlign="center" fontFamily="monospace">
          X: {position.x.toFixed(2)}<br />
          Y: {position.y.toFixed(2)}
        </Typography>
      </Paper>
    </Box>
  );
}

interface MaterialSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export function MaterialSlider({ 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  label,
  disabled = false,
  color = 'primary'
}: MaterialSliderProps) {
  return (
    <Box sx={{ width: '100%', px: 1 }}>
      {label && (
        <Typography variant="body2" gutterBottom>
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" sx={{ minWidth: 40 }}>
          {min}
        </Typography>
        <Slider
          value={value}
          onChange={(_, newValue) => onChange(Array.isArray(newValue) ? newValue[0] : newValue)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          color={color}
          sx={{
            '& .MuiSlider-thumb': {
              width: 20,
              height: 20,
            },
            '& .MuiSlider-track': {
              height: 6,
            },
            '& .MuiSlider-rail': {
              height: 6,
            },
          }}
        />
        <Typography variant="body2" sx={{ minWidth: 40 }}>
          {max}
        </Typography>
      </Box>
      <Typography variant="body2" textAlign="center" fontWeight="bold">
        {value}
      </Typography>
    </Box>
  );
}

interface MaterialButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
}

export function MaterialButton({ 
  onClick, 
  children, 
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false
}: MaterialButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      color={color}
      size={size}
      disabled={disabled}
      fullWidth={fullWidth}
      sx={{
        minHeight: 44,
        fontWeight: 500,
      }}
    >
      {children}
    </Button>
  );
}

interface MaterialToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export function MaterialToggle({ 
  checked, 
  onChange, 
  label,
  disabled = false,
  color = 'primary'
}: MaterialToggleProps) {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          color={color}
        />
      }
      label={label || 'Toggle'}
    />
  );
}