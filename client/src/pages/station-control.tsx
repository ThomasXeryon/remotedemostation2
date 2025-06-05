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
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      minHeight: '500px' // Ensure minimum usable height
    }}>
      {/* Top Control Bar - Responsive */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        p: { xs: 1, sm: 2 }, 
        borderBottom: 1, 
        borderColor: 'divider',
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        gap: 1
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, sm: 2 },
          flex: 1,
          minWidth: 0 // Allow text truncation
        }}>
          <Link href="/dashboard">
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<ArrowBack />}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              Exit Control
            </Button>
            <IconButton 
              size="small" 
              sx={{ display: { xs: 'flex', sm: 'none' } }}
            >
              <ArrowBack />
            </IconButton>
          </Link>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography 
              variant="h5"
              component="h1" 
              fontWeight="bold"
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.5rem' },
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {stationData.name}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                display: { xs: 'none', sm: 'block' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {stationData.description}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          flexShrink: 0
        }}>
          <Button 
            onClick={() => isEditMode ? saveControls() : setIsEditMode(true)}
            variant={isEditMode ? "contained" : "outlined"}
            color={isEditMode ? "success" : "primary"}
            size="small"
            startIcon={isEditMode ? <Save /> : <Edit />}
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 2 }
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {isEditMode ? "Save Layout" : "Edit Layout"}
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {isEditMode ? "Save" : "Edit"}
            </Box>
          </Button>
          {!isSessionActive ? (
            <Button 
              onClick={handleStartSession} 
              variant="contained"
              color="success"
              size="small"
              startIcon={<PlayArrow />}
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 2 }
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Start Session
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                Start
              </Box>
            </Button>
          ) : (
            <Button 
              onClick={handleStopSession} 
              variant="contained"
              color="error"
              size="small"
              startIcon={<Stop />}
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 2 }
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                End Session
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                End
              </Box>
            </Button>
          )}
        </Box>
      </Box>

      {/* Main Interface - Responsive Layout */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        overflow: 'hidden',
        gap: { xs: 1, sm: 2 },
        p: { xs: 1, sm: 2 }
      }}>
        {/* Camera Feed - Responsive */}
        <Box 
          sx={{
            bgcolor: 'grey.900',
            borderRadius: 2,
            overflow: 'hidden',
            flex: { xs: '0 0 40vh', sm: '0 0 50vh', md: '1' },
            minHeight: { xs: '200px', sm: '300px' },
            order: { xs: 1, md: 1 }
          }}
        >
          <Box sx={{ 
            height: '100%',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            p: 2
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Videocam sx={{ 
                fontSize: { xs: 40, sm: 48, md: 64 }, 
                mb: { xs: 1, sm: 2 }, 
                opacity: 0.5 
              }} />
              <Typography 
                variant={{ xs: 'body1', sm: 'h6' }} 
                component="p"
                sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
              >
                Live Camera Feed
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  opacity: 0.75,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                Hardware: {stationData?.hardwareType}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Control Panel - Responsive */}
        <Box 
          sx={{
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            flex: { xs: '1', md: '0 0 50%' },
            minHeight: { xs: '300px', sm: '400px' },
            maxHeight: { xs: 'none', md: '100%' },
            order: { xs: 2, md: 2 },
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ p: { xs: 1, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Control Panel Header - Responsive */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: { xs: 1, sm: 2 },
              flexWrap: 'wrap',
              gap: 1
            }}>
              <Typography 
                variant={{ xs: 'h6', sm: 'h5' }} 
                component="h3" 
                fontWeight="bold"
                sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}
              >
                Control Panel
              </Typography>
              <Box sx={{ 
                display: { xs: 'none', sm: 'flex' }, 
                gap: 0.5 
              }}>
                <Button variant="outlined" size="small">Settings</Button>
                <Button variant="outlined" size="small">Presets</Button>
                <Button variant="outlined" size="small">Logs</Button>
                <Button variant="outlined" size="small">Help</Button>
              </Box>
              <IconButton 
                size="small" 
                sx={{ display: { xs: 'flex', sm: 'none' } }}
              >
                <Settings />
              </IconButton>
            </Box>

            {/* Dynamic Controls - Responsive Grid */}
            <Box sx={{ 
              flex: 1, 
              overflow: 'auto',
              minHeight: 0 // Important for flex child with overflow
            }}>
              <Grid container spacing={{ xs: 1, sm: 2 }}>
                {localControls.map((widget: ControlWidget) => {
                  const isSelected = selectedWidget?.id === widget.id;
                  return (
                    <Grid 
                      item 
                      xs={12} 
                      sm={6} 
                      md={6}
                      lg={4}
                      key={widget.id}
                    >
                      <Card
                        sx={{
                          p: { xs: 1, sm: 2 },
                          cursor: isEditMode ? 'pointer' : 'default',
                          border: isSelected ? 2 : 1,
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          bgcolor: isSelected && isEditMode ? 'primary.50' : 'background.paper',
                          '&:hover': isEditMode ? { boxShadow: 2 } : {},
                          minHeight: { xs: 80, sm: 120 },
                          height: 'auto'
                        }}
                        onClick={() => isEditMode && setSelectedWidget(widget)}
                      >
                        <Typography 
                          variant="subtitle2" 
                          gutterBottom 
                          fontWeight="medium"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                        >
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
                          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <MaterialJoystick
                              onMove={(position) => executeCommand(widget.command, { ...widget.parameters, ...position })}
                              onStop={() => executeCommand(`${widget.command}_stop`, widget.parameters)}
                              disabled={!isSessionActive}
                              size={{ xs: 60, sm: 80 }}
                            />
                          </Box>
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
                            <Typography 
                              variant="caption" 
                              color="primary.main"
                              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                            >
                              Click to edit this control
                            </Typography>
                          </Box>
                        )}
                      </Card>
                    </Grid>
                  );
                })}
                
                {isEditMode && (
                  <Grid 
                    item 
                    xs={12} 
                    sm={6} 
                    md={6}
                    lg={4}
                  >
                    <Card
                      sx={{
                        p: { xs: 1, sm: 2 },
                        border: 2,
                        borderStyle: 'dashed',
                        borderColor: 'grey.300',
                        cursor: 'pointer',
                        minHeight: { xs: 80, sm: 120 },
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
                        <Typography 
                          variant={{ xs: 'h5', sm: 'h4' }} 
                          component="div" 
                          sx={{ mb: 1 }}
                        >
                          +
                        </Typography>
                        <Typography 
                          variant="body2"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                        >
                          Add Control
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
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