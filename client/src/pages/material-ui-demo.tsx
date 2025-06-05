import { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Slider,
  Button,
  Chip,
  Grid,
  Paper,
  Divider,
  Stack,
  IconButton,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import {
  PlayArrow,
  Stop,
  Clear,
  RotateLeft,
  VideogameAsset,
  Settings,
} from "@mui/icons-material";

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

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export default function MaterialUIDemo() {
  const [commandHistory, setCommandHistory] = useState<CommandLog[]>([]);
  const [joystickPosition, setJoystickPosition] = useState<JoystickPosition>({ x: 0, y: 0 });
  const [sliderValue, setSliderValue] = useState(50);
  const [combinedSlider, setCombinedSlider] = useState(25);
  const [isDragging, setIsDragging] = useState(false);
  
  const joystickRef = useRef<HTMLDivElement>(null);

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

  // Material-UI Joystick functionality
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
      const maxDistance = 60;
      
      let x = deltaX;
      let y = deltaY;
      
      if (distance > maxDistance) {
        x = (deltaX / distance) * maxDistance;
        y = (deltaY / distance) * maxDistance;
      }
      
      const normalizedX = parseFloat((x / maxDistance).toFixed(3));
      const normalizedY = parseFloat((-y / maxDistance).toFixed(3));
      
      setJoystickPosition({ x: normalizedX, y: normalizedY });
      logCommand('mui_joystick', 'move', { x: normalizedX, y: normalizedY });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setJoystickPosition({ x: 0, y: 0 });
      logCommand('mui_joystick', 'stop', { x: 0, y: 0 });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSliderChange = (_: Event, value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setSliderValue(newValue);
    logCommand('mui_slider', 'change', { value: newValue });
  };

  const handleCombinedSliderChange = (_: Event, value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setCombinedSlider(newValue);
    logCommand('combined_mui_slider', 'intensity_update', { intensity: newValue });
  };

  // Initialize demo
  useEffect(() => {
    logCommand('mui_system', 'initialized', { 
      framework: 'Material-UI',
      components: ['Slider', 'Card', 'Button', 'Chip'],
      timestamp: new Date().toISOString()
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header */}
        <Card elevation={3} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VideogameAsset sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h3" component="h1" fontWeight="bold" color="primary">
                  Material-UI Professional Controls
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Remote Demo Station hardware control interface
                </Typography>
              </Box>
            </Stack>
            
            <Grid container spacing={2}>
              <Grid xs={12} md={4}>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'primary.50',
                    border: '1px solid',
                    borderColor: 'primary.200'
                  }}
                >
                  <Chip 
                    label="Material-UI Components" 
                    color="primary" 
                    size="small" 
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="primary.dark">
                    Professional control components with Material Design principles
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'success.50',
                    border: '1px solid',
                    borderColor: 'success.200'
                  }}
                >
                  <Chip 
                    label="Touch Responsive" 
                    color="success" 
                    size="small" 
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="success.dark">
                    Mobile-friendly drag and touch interactions
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'secondary.50',
                    border: '1px solid',
                    borderColor: 'secondary.200'
                  }}
                >
                  <Chip 
                    label="Real-time Commands" 
                    color="secondary" 
                    size="small" 
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="secondary.dark">
                    Live hardware command streaming and logging
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Control Demonstrations */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          
          {/* Joystick Demo */}
          <Grid item xs={12} lg={4}>
            <Card elevation={2} sx={{ border: '2px solid', borderColor: 'primary.200' }}>
              <CardHeader 
                title="Material-UI Joystick"
                titleTypographyProps={{ color: 'primary.main', fontWeight: 'bold' }}
                avatar={<Settings color="primary" />}
              />
              <CardContent>
                <Stack spacing={3} alignItems="center">
                  <Box
                    ref={joystickRef}
                    onMouseDown={handleJoystickMouseDown}
                    sx={{
                      width: 140,
                      height: 140,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                      position: 'relative',
                      cursor: 'pointer',
                      border: '4px solid',
                      borderColor: 'primary.100',
                      boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
                      '&:hover': {
                        boxShadow: '0 12px 40px rgba(25, 118, 210, 0.4)',
                      }
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: `translate(calc(-50% + ${joystickPosition.x * 50}px), calc(-50% + ${-joystickPosition.y * 50}px))`,
                        transition: 'transform 0.05s ease',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        border: '3px solid',
                        borderColor: 'primary.dark',
                      }}
                    />
                  </Box>
                  
                  <Paper elevation={1} sx={{ p: 2, width: '100%', backgroundColor: 'grey.50' }}>
                    <Typography variant="body2" component="div" fontFamily="monospace" textAlign="center">
                      <div>X: {joystickPosition.x.toFixed(3)}</div>
                      <div>Y: {joystickPosition.y.toFixed(3)}</div>
                      <Typography variant="caption" color="text.secondary">
                        Magnitude: {Math.sqrt(joystickPosition.x**2 + joystickPosition.y**2).toFixed(3)}
                      </Typography>
                    </Typography>
                  </Paper>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Slider Demo */}
          <Grid item xs={12} lg={4}>
            <Card elevation={2} sx={{ border: '2px solid', borderColor: 'success.200' }}>
              <CardHeader 
                title="Material-UI Slider"
                titleTypographyProps={{ color: 'success.main', fontWeight: 'bold' }}
                avatar={<PlayArrow color="success" />}
              />
              <CardContent>
                <Stack spacing={4} alignItems="center">
                  <Typography variant="h2" component="div" color="success.main" fontWeight="bold">
                    {sliderValue}%
                  </Typography>
                  
                  <Box sx={{ width: '100%', px: 2 }}>
                    <Slider
                      value={sliderValue}
                      onChange={handleSliderChange}
                      min={0}
                      max={100}
                      step={1}
                      color="success"
                      size="medium"
                      sx={{
                        '& .MuiSlider-thumb': {
                          width: 28,
                          height: 28,
                          border: '3px solid white',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        },
                        '& .MuiSlider-track': {
                          height: 8,
                        },
                        '& .MuiSlider-rail': {
                          height: 8,
                        }
                      }}
                    />
                  </Box>
                  
                  <Paper elevation={1} sx={{ p: 2, width: '100%', backgroundColor: 'grey.50' }}>
                    <Typography variant="body2" component="div" fontFamily="monospace" textAlign="center">
                      <div>Value: {sliderValue}%</div>
                      <div>Normalized: {(sliderValue / 100).toFixed(2)}</div>
                      <Typography variant="caption" color="text.secondary">
                        Range: 0-100
                      </Typography>
                    </Typography>
                  </Paper>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Combined Controls */}
          <Grid item xs={12} lg={4}>
            <Card elevation={2} sx={{ border: '2px solid', borderColor: 'secondary.200' }}>
              <CardHeader 
                title="Combined Controls"
                titleTypographyProps={{ color: 'secondary.main', fontWeight: 'bold' }}
                avatar={<Stop color="secondary" />}
              />
              <CardContent>
                <Stack spacing={3} alignItems="center">
                  <Box
                    sx={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #dc004e 0%, #c2185b 100%)',
                      position: 'relative',
                      cursor: 'pointer',
                      border: '3px solid',
                      borderColor: 'secondary.200',
                      boxShadow: '0 4px 16px rgba(220, 0, 78, 0.3)',
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
                        transform: 'translate(-50%, -50%)',
                        border: '2px solid',
                        borderColor: 'secondary.dark',
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ width: '100%', px: 1 }}>
                    <Slider
                      value={combinedSlider}
                      onChange={handleCombinedSliderChange}
                      min={0}
                      max={100}
                      step={5}
                      color="secondary"
                      size="small"
                    />
                  </Box>
                  
                  <Paper elevation={1} sx={{ p: 2, width: '100%', backgroundColor: 'grey.50' }}>
                    <Typography variant="body2" component="div" fontFamily="monospace" textAlign="center">
                      <div>Intensity: {combinedSlider}%</div>
                      <Typography variant="caption" color="text.secondary">
                        Status: Active
                      </Typography>
                    </Typography>
                  </Paper>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Command Log */}
        <Card elevation={3}>
          <CardHeader 
            title={
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: 'success.main',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                  }}
                />
                <Typography variant="h6" fontWeight="bold">
                  Hardware Command Stream
                </Typography>
              </Stack>
            }
            action={
              <Button
                variant="contained"
                color="error"
                startIcon={<Clear />}
                onClick={clearCommandLog}
                size="small"
              >
                Clear Log
              </Button>
            }
          />
          <Divider />
          <CardContent>
            <Paper 
              elevation={0}
              sx={{ 
                backgroundColor: '#1a1a1a',
                color: '#00ff41',
                p: 2,
                height: 300,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                border: '1px solid #333'
              }}
            >
              {commandHistory.length === 0 ? (
                <Typography color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                  // Waiting for control interactions...
                </Typography>
              ) : (
                commandHistory.map((cmd, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      mb: 0.5,
                      color: index === 0 ? '#ffff00' : '#00ff41'
                    }}
                  >
                    <Typography component="span" sx={{ color: '#888', fontFamily: 'monospace' }}>
                      [{cmd.timestamp.split('T')[1].split('.')[0]}]
                    </Typography>
                    {' '}
                    <Typography component="span" sx={{ fontFamily: 'monospace' }}>
                      {cmd.device}.{cmd.action}({JSON.stringify(cmd.data)})
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
}