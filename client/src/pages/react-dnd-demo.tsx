import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Button,
  Paper,
  Divider,
  Stack,
  Grid,
} from "@mui/material";
import {
  VideogameAsset,
  Clear,
  DragIndicator,
  TouchApp,
} from "@mui/icons-material";
import { ReactDndJoystickDemo } from "../components/react-dnd-joystick";
import { ReactDndSliderDemo } from "../components/react-dnd-slider";

interface CommandLog {
  timestamp: string;
  device: string;
  action: string;
  data: any;
}

export default function ReactDndDemo() {
  const [commandHistory, setCommandHistory] = useState<CommandLog[]>([]);

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

  useEffect(() => {
    logCommand('react_dnd_system', 'initialized', { 
      framework: 'React DnD + Material-UI',
      backends: ['HTML5Backend', 'TouchBackend'],
      components: ['Joystick', 'Slider', 'MultiBackend'],
      timestamp: new Date().toISOString()
    });
  }, []);

  return (
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
              <DragIndicator sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h3" component="h1" fontWeight="bold" color="primary">
                React DnD Professional Controls
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Advanced drag and drop hardware control interface
              </Typography>
            </Box>
          </Stack>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
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
                  label="React DnD Library" 
                  color="primary" 
                  size="small" 
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="primary.dark">
                  Professional drag and drop with multi-backend support
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
                  label="Touch & Desktop" 
                  color="success" 
                  size="small" 
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="success.dark">
                  Seamless interaction across all devices and platforms
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
                  label="Hardware Integration" 
                  color="secondary" 
                  size="small" 
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="secondary.dark">
                  Real-time command streaming for hardware control
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Control Demonstrations */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        
        {/* React DnD Joystick Demo */}
        <Grid item xs={12} lg={4}>
          <Card elevation={2} sx={{ border: '2px solid', borderColor: 'primary.200', height: '100%' }}>
            <CardHeader 
              title="React DnD Joystick"
              titleTypographyProps={{ color: 'primary.main', fontWeight: 'bold' }}
              avatar={<DragIndicator color="primary" />}
            />
            <CardContent>
              <ReactDndJoystickDemo 
                title="Advanced Joystick Control"
                onCommand={logCommand}
              />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Drag the white circle to control hardware movement. Uses React DnD 
                  with multi-backend support for smooth desktop and touch interactions.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* React DnD Horizontal Slider Demo */}
        <Grid item xs={12} lg={4}>
          <Card elevation={2} sx={{ border: '2px solid', borderColor: 'success.200', height: '100%' }}>
            <CardHeader 
              title="React DnD Horizontal Slider"
              titleTypographyProps={{ color: 'success.main', fontWeight: 'bold' }}
              avatar={<TouchApp color="success" />}
            />
            <CardContent>
              <ReactDndSliderDemo 
                title="Precision Control"
                initialValue={75}
                color="#2e7d32"
                orientation="horizontal"
                onCommand={logCommand}
              />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Drag the slider thumb for precise value control. Supports both 
                  mouse and touch interactions with smooth value updates.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* React DnD Vertical Slider Demo */}
        <Grid item xs={12} lg={4}>
          <Card elevation={2} sx={{ border: '2px solid', borderColor: 'secondary.200', height: '100%' }}>
            <CardHeader 
              title="React DnD Vertical Slider"
              titleTypographyProps={{ color: 'secondary.main', fontWeight: 'bold' }}
              avatar={<VideogameAsset color="secondary" />}
            />
            <CardContent>
              <ReactDndSliderDemo 
                title="Intensity Control"
                initialValue={25}
                color="#dc004e"
                orientation="vertical"
                onCommand={logCommand}
              />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Vertical slider for intensity or power control. Perfect for 
                  hardware applications requiring vertical movement control.
                </Typography>
              </Box>
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
                React DnD Hardware Command Stream
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
              <Typography color="text.disabled" sx={{ fontFamily: 'monospace', color: '#888' }}>
                // Waiting for React DnD control interactions...
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
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Commands: {commandHistory.length} | 
              Backends: HTML5 + Touch | 
              Framework: React DnD + Material-UI
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}