import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  IconButton,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Alert,
  Chip,
  Slider,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  ArrowBack,
  Settings,
  Edit,
  Save,
  Videocam,
  Computer,
  Timeline,
} from '@mui/icons-material';
import { getCurrentUser } from '@/lib/auth';
import { useWebSocket } from '@/hooks/use-websocket';
import {
  MaterialJoystick,
  MaterialSlider,
  MaterialButton,
  MaterialToggle,
} from '@/components/material-ui-controls';

interface DemoStation {
  id: string;
  name: string;
  description: string | null;
  organizationId: number;
  hardwareType: string;
  isOnline: boolean;
  cameraCount: number;
  sessionTimeLimit: number;
  requiresLogin: boolean;
  lastHeartbeat: Date | null;
  configuration: any;
  safetyLimits: any;
  createdAt: Date;
}

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

export default function StationControl() {
  const { id } = useParams() as { id: string };
  const currentUser = getCurrentUser();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<ControlWidget | null>(null);
  const [localControls, setLocalControls] = useState<ControlWidget[]>([]);
  const [controlValues, setControlValues] = useState<Record<string, any>>({});
  
  const { connectionStatus, sendMessage } = useWebSocket(`ws://localhost:5000/ws`);

  // Fetch station data
  const { data: stationData, isLoading: stationLoading } = useQuery({
    queryKey: ['/api/demo-stations', id],
    enabled: !!id,
  });

  // Fetch controls configuration
  const { data: controlsData, isLoading: controlsLoading } = useQuery({
    queryKey: ['/api/demo-stations', id, 'controls'],
    enabled: !!id,
  });

  useEffect(() => {
    if (controlsData?.controls) {
      setLocalControls(controlsData.controls);
    }
  }, [controlsData]);

  const handleStartSession = async () => {
    try {
      const response = await fetch(`/api/demo-stations/${id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        setIsSessionActive(true);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleStopSession = async () => {
    setIsSessionActive(false);
  };

  const executeCommand = useCallback((command: string, parameters: any = {}) => {
    if (!isSessionActive) return;
    
    const commandData = {
      type: 'command',
      stationId: id,
      command,
      parameters,
      timestamp: Date.now(),
    };
    
    sendMessage(commandData);
  }, [isSessionActive, id, sendMessage]);

  const saveControls = async () => {
    try {
      const response = await fetch(`/api/demo-stations/${id}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ controls: localControls }),
      });
      
      if (response.ok) {
        setIsEditMode(false);
        setSelectedWidget(null);
      }
    } catch (error) {
      console.error('Failed to save controls:', error);
    }
  };

  if (stationLoading || controlsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading station control interface...</Typography>
      </Box>
    );
  }

  if (!stationData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography color="error">Station not found</Typography>
      </Box>
    );
  }

  const layout = stationData?.configuration?.interfaceLayout || {
    camera: { width: 45, height: 90, position: { x: 5, y: 5 } },
    controlPanel: { width: 50, height: 90, position: { x: 45, y: 5 } }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Control Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Link href="/dashboard">
            <Button variant="outlined" size="small" startIcon={<ArrowBack />}>
              Exit Control
            </Button>
          </Link>
          <Box>
            <Typography variant="h5" component="h1" fontWeight="bold">
              {stationData.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stationData.description}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button 
            onClick={() => isEditMode ? saveControls() : setIsEditMode(true)}
            variant={isEditMode ? "contained" : "outlined"}
            color={isEditMode ? "success" : "primary"}
            startIcon={isEditMode ? <Save /> : <Edit />}
          >
            {isEditMode ? "Save Layout" : "Edit Layout"}
          </Button>
          {!isSessionActive ? (
            <Button 
              onClick={handleStartSession} 
              variant="contained"
              color="success"
              startIcon={<PlayArrow />}
            >
              Start Session
            </Button>
          ) : (
            <Button 
              onClick={handleStopSession} 
              variant="contained"
              color="error"
              startIcon={<Stop />}
            >
              End Session
            </Button>
          )}
        </Box>
      </Box>

      {/* Main Interface */}
      <Box sx={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Camera Feed */}
        <Box 
          sx={{
            bgcolor: 'grey.900',
            borderRadius: 2,
            m: 1,
            position: 'absolute',
            overflow: 'hidden',
            width: `${layout.camera.width}%`,
            height: `${layout.camera.height}%`,
            left: `${layout.camera.position.x}%`,
            top: `${layout.camera.position.y}%`,
          }}
        >
          <Box sx={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white'
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Videocam sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" component="p">Live Camera Feed</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Hardware: {stationData.hardwareType}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Control Panel */}
        <Box 
          sx={{
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            m: 1,
            position: 'absolute',
            width: `${layout.controlPanel.width}%`,
            height: `${layout.controlPanel.height}%`,
            left: `${layout.controlPanel.position.x}%`,
            top: `${layout.controlPanel.position.y}%`,
          }}
        >
          <Box sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" component="h3" fontWeight="bold">
                Control Panel
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small">Settings</Button>
                <Button variant="outlined" size="small">Presets</Button>
                <Button variant="outlined" size="small">Logs</Button>
                <Button variant="outlined" size="small">Help</Button>
              </Box>
            </Box>

            {/* Dynamic Controls */}
            <Grid container spacing={2} sx={{ height: 'calc(100% - 80px)', overflow: 'auto' }}>
              {localControls.map((widget: ControlWidget) => {
                const isSelected = selectedWidget?.id === widget.id;
                return (
                  <Grid item xs={6} key={widget.id}>
                    <Card
                      sx={{
                        p: 2,
                        cursor: isEditMode ? 'pointer' : 'default',
                        border: isSelected ? 2 : 1,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected && isEditMode ? 'primary.50' : 'background.paper',
                        '&:hover': isEditMode ? { boxShadow: 2 } : {},
                        minHeight: 120,
                      }}
                      onClick={() => isEditMode && setSelectedWidget(widget)}
                    >
                      <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                        {widget.name}
                      </Typography>
                      
                      {widget.type === 'button' && (
                        <MaterialButton
                          onClick={() => executeCommand(widget.command, widget.parameters)}
                          fullWidth
                          disabled={!isSessionActive}
                          size="small"
                        >
                          {widget.name}
                        </MaterialButton>
                      )}
                      
                      {widget.type === 'slider' && (
                        <MaterialSlider
                          value={controlValues[widget.id] || 0}
                          onChange={(value) => {
                            setControlValues(prev => ({ ...prev, [widget.id]: value }));
                            executeCommand(widget.command, { ...widget.parameters, value });
                          }}
                          disabled={!isSessionActive}
                          min={0}
                          max={100}
                        />
                      )}
                      
                      {widget.type === 'joystick' && (
                        <MaterialJoystick
                          onMove={(position) => executeCommand(widget.command, { ...widget.parameters, ...position })}
                          onStop={() => executeCommand(`${widget.command}_stop`, widget.parameters)}
                          disabled={!isSessionActive}
                          size={80}
                        />
                      )}
                      
                      {widget.type === 'toggle' && (
                        <MaterialToggle
                          checked={controlValues[widget.id] || false}
                          onChange={(checked) => {
                            setControlValues(prev => ({ ...prev, [widget.id]: checked }));
                            executeCommand(widget.command, { ...widget.parameters, enabled: checked });
                          }}
                          disabled={!isSessionActive}
                          label={widget.name}
                        />
                      )}
                      
                      {isEditMode && isSelected && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'primary.200' }}>
                          <Typography variant="caption" color="primary.main">
                            Click to edit this control
                          </Typography>
                        </Box>
                      )}
                    </Card>
                  </Grid>
                );
              })}
              
              {isEditMode && (
                <Grid item xs={6}>
                  <Card
                    sx={{
                      p: 2,
                      border: 2,
                      borderStyle: 'dashed',
                      borderColor: 'grey.300',
                      cursor: 'pointer',
                      minHeight: 120,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': { borderColor: 'grey.400' }
                    }}
                    onClick={() => {
                      const newControl: ControlWidget = {
                        id: Date.now().toString(),
                        type: 'button',
                        name: 'New Control',
                        command: 'new_command',
                        parameters: {},
                        position: { x: 0, y: 0 },
                        size: { width: 100, height: 50 },
                        style: {
                          backgroundColor: '#f3f4f6',
                          textColor: '#374151',
                          borderColor: '#d1d5db',
                          borderRadius: 8,
                          fontSize: 14
                        }
                      };
                      setLocalControls([...localControls, newControl]);
                    }}
                  >
                    <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="h4" component="div" sx={{ mb: 1 }}>+</Typography>
                      <Typography variant="body2">Add Control</Typography>
                    </Box>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        </Box>
      </Box>

      {/* WebSocket Connection Status */}
      {connectionStatus !== 'connected' && (
        <Alert 
          severity="warning" 
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            zIndex: 1000
          }}
        >
          WebSocket: {connectionStatus}
        </Alert>
      )}
    </Box>
  );
}