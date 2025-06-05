import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Button,
  Alert,
  Grid,
  Box,
  CircularProgress,
  Stack,
  IconButton,
} from "@mui/material";
import {
  Monitor,
  Settings,
  PlayArrow,
  Schedule,
  People,
  Warning,
  Add,
} from "@mui/icons-material";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
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

export function Dashboard() {
  const { data: demoStations, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/demo-stations'],
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Listen for organization changes and refetch data
  useEffect(() => {
    const handleOrganizationChanged = () => {
      console.log('Dashboard: Organization changed, refetching demo stations');
      refetch();
    };

    window.addEventListener('organizationChanged', handleOrganizationChanged);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChanged);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="256px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    console.error('Dashboard error:', error);

    return (
      <Box sx={{ p: 3, space: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
            Demo Station Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overview of available demo stations
          </Typography>
        </Box>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
            <Box textAlign="center">
              <Warning sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" component="h3" fontWeight="medium" gutterBottom>
                Unable to Load Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Error: {error.message || 'There was an error loading the demo stations.'}
              </Typography>
              <Button variant="contained" onClick={() => refetch()}>
                Try Again
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const allStations = (demoStations as DemoStation[]) || [];
  // For now, show all stations since we're using Clerk authentication
  const stations = allStations;
  
  // Debug logging
  console.log('Dashboard debug:', {
    demoStations,
    allStations,
    stations,
    stationsLength: stations.length,
    isLoading,
    error
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
            Demo Station Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overview of available demo stations
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={`${stations.length} Station${stations.length !== 1 ? 's' : ''}`}
            variant="outlined"
            color="primary"
          />
        </Box>
      </Box>

      {/* Station Cards */}
      {stations.length === 0 ? (
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
            <Box textAlign="center">
              <Monitor sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" component="h3" fontWeight="medium" gutterBottom>
                No Demo Stations Available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contact your administrator to create demo stations.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {stations.map((station) => (
            <Grid item xs={12} md={6} lg={4} key={station.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  opacity: station.isOnline ? 1 : 0.75,
                  '&:hover': { 
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
              >
                <CardHeader 
                  title={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Monitor />
                      <Typography variant="h6" component="span">
                        {station.name}
                      </Typography>
                    </Stack>
                  }
                  action={
                    <Chip
                      label={station.isOnline ? "Online" : "Offline"}
                      color={station.isOnline ? "success" : "error"}
                      size="small"
                    />
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  <Stack spacing={2}>
                    {!station.isOnline && (
                      <Alert severity="warning" size="small">
                        Station offline
                      </Alert>
                    )}
                    
                    <Typography variant="body2" color="text.secondary">
                      {station.description || "No description available"}
                    </Typography>

                    {/* Station Stats */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Monitor fontSize="small" color="action" />
                          <Typography variant="body2">
                            {station.cameraCount} Camera{station.cameraCount !== 1 ? 's' : ''}
                          </Typography>
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Schedule fontSize="small" color="action" />
                          <Typography variant="body2">
                            {station.sessionTimeLimit}min Sessions
                          </Typography>
                        </Stack>
                      </Grid>
                      <Grid item xs={12}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <People fontSize="small" color="action" />
                          <Typography variant="body2">
                            {station.requiresLogin ? "Login Required" : "Open Access"}
                          </Typography>
                        </Stack>
                      </Grid>
                    </Grid>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                      <Link href={`/stations/${station.id}/control`}>
                        <Button 
                          size="small" 
                          variant="contained"
                          fullWidth
                          disabled={!station.isOnline}
                          startIcon={<PlayArrow />}
                        >
                          Control
                        </Button>
                      </Link>
                      <Link href={`/stations/${station.id}/edit`}>
                        <Button 
                          size="small" 
                          variant="outlined"
                          fullWidth
                          startIcon={<Settings />}
                        >
                          Edit
                        </Button>
                      </Link>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}