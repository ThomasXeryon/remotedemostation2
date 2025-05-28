import { Link, useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  BarChart3, 
  Cpu, 
  Gauge,
  LogOut,
  Building2,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { User, DemoStation } from '@/types';

interface SidebarProps {
  user: User;
  demoStations: DemoStation[];
  activeDemoStation?: DemoStation;
  onLogout: () => void;
  onStationSelect: (station: DemoStation) => void;
  onCreateStation: () => void;
}

export function Sidebar({ 
  user, 
  demoStations, 
  activeDemoStation, 
  onLogout, 
  onStationSelect,
  onCreateStation
}: SidebarProps) {
  const [location] = useLocation();
  const [currentOrganization, setCurrentOrganization] = useState(user.organization);

  // Listen for organization changes
  useEffect(() => {
    const handleOrganizationChanged = () => {
      // Organization has changed, component will re-render with new user data
      setCurrentOrganization(user.organization);
    };

    window.addEventListener('organizationChanged', handleOrganizationChanged);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChanged);
    };
  }, [user.organization]);

  // Update current organization when user prop changes
  useEffect(() => {
    setCurrentOrganization(user.organization);
  }, [user.organization]);

  const navItems = [
    { 
      path: '/dashboard', 
      icon: Gauge, 
      label: 'Control Dashboard',
      active: location === '/dashboard'
    },

    { 
      path: '/stations', 
      icon: Cpu, 
      label: 'Demo Stations',
      badge: demoStations.length,
      active: location === '/stations'
    },
    { 
      path: '/team', 
      icon: Users, 
      label: 'Team Members',
      active: location === '/team'
    },
    { 
      path: '/analytics', 
      icon: BarChart3, 
      label: 'Analytics',
      active: location === '/analytics'
    },
    { 
      path: '/organizations', 
      icon: Settings, 
      label: 'Settings',
      active: location === '/organizations'
    },
  ];

  const getStatusColor = (station: DemoStation) => {
    if (!station.isOnline) return 'bg-slate-400';
    if (station.lastHeartbeat) {
      const timeSinceHeartbeat = Date.now() - new Date(station.lastHeartbeat).getTime();
      if (timeSinceHeartbeat < 30000) return 'bg-green-500'; // Online
      if (timeSinceHeartbeat < 120000) return 'bg-yellow-500'; // Warning
    }
    return 'bg-red-500'; // Offline
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Organization Switcher Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-slate-900">
            Demo Platform
          </h1>
        </div>
        <OrganizationSwitcher currentOrganization={currentOrganization} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                item.active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </div>


      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.firstName} ${user.lastName}`} />
            <AvatarFallback>
              {user.firstName[0]}{user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {user.role}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-slate-400 hover:text-slate-600"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}