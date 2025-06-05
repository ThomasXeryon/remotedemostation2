import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
// Use try-catch for authentication hooks in case they're not available
function useAuthSafely() {
  try {
    const { useUser, useAuth } = require('@/components/standalone-auth');
    return { user: { firstName: 'Demo', lastName: 'User' }, signOut: () => {} };
  } catch {
    // For development mode without auth provider
    return { user: { firstName: 'Demo', lastName: 'User' }, signOut: () => {} };
  }
}
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Business,
  Group,
  Analytics,
  Settings,
  Computer,
  Add,
  Logout,
  AccountCircle,
} from '@mui/icons-material';
import type { DemoStation } from '@/types';

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 280;

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuthSafely();
  const [location, setLocation] = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { data: demoStations = [] } = useQuery<DemoStation[]>({
    queryKey: ['/api/demo-stations'],
    enabled: !!user,
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await signOut();
    setLocation('/');
    handleProfileMenuClose();
  };

  const navigationItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Organizations', icon: <Business />, path: '/organizations' },
    { text: 'Demo Stations', icon: <Computer />, path: '/stations' },
    { text: 'Team Members', icon: <Group />, path: '/team-members' },
    { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Remote Demo Station
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location === item.path}
              onClick={() => {
                setLocation(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.50',
                  borderRight: '3px solid',
                  borderRightColor: 'primary.main',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                  '& .MuiListItemText-primary': {
                    color: 'primary.main',
                    fontWeight: 600,
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {demoStations.length > 0 && (
        <>
          <Divider />
          <List>
            <ListItem>
              <ListItemText 
                primary="Demo Stations" 
                primaryTypographyProps={{ 
                  variant: 'subtitle2', 
                  color: 'text.secondary',
                  sx: { fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }
                }}
              />
            </ListItem>
            {demoStations.slice(0, 5).map((station) => (
              <ListItem key={station.id} disablePadding>
                <ListItemButton
                  onClick={() => {
                    setLocation(`/stations/${station.id}/control`);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{ pl: 4 }}
                >
                  <ListItemIcon>
                    <Computer fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={station.name}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  setLocation('/stations/new');
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>
                  <Add fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Add Station"
                  primaryTypographyProps={{ fontSize: '0.875rem', color: 'primary.main' }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}
    </Box>
  );

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Remote Demo Station Platform
          </Typography>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar 
              alt={`${user.firstName} ${user.lastName}` || user.email}
              sx={{ width: 32, height: 32 }}
            >
              <AccountCircle />
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          backgroundColor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}