import { Link, useLocation } from 'wouter';
import { 
  Settings, 
  Users, 
  BarChart3, 
  Cpu, 
  Gauge,
  LogOut,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, DemoStation } from '@/types';

interface SidebarProps {
  user: User;
  demoStations: DemoStation[];
  activeDemoStation?: DemoStation;
  onLogout: () => void;
  onStationSelect: (station: DemoStation) => void;
}

export function Sidebar({ 
  user, 
  demoStations, 
  activeDemoStation, 
  onLogout, 
  onStationSelect 
}: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    { 
      path: '/dashboard', 
      icon: Gauge, 
      label: 'Control Dashboard',
      active: location === '/dashboard'
    },
    { 
      path: '/organizations', 
      icon: Building2, 
      label: 'Organizations',
      active: location === '/organizations'
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
      path: '/settings', 
      icon: Settings, 
      label: 'Settings',
      active: location === '/settings'
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
      {/* Tenant Branding Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: user.organization?.primaryColor || '#3b82f6' }}
          >
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900">
              {user.organization?.name || 'Demo Platform'}
            </h1>
            <p className="text-xs text-slate-500">
              {user.organization?.name ? 'Remote Demo Station' : 'No Organization Selected'}
            </p>
          </div>
        </div>
        
        {/* Organization Status */}
        {user.organization && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: user.organization.primaryColor || '#3b82f6' }}
              />
              <p className="text-xs font-medium text-blue-700">
                Active Organization
              </p>
            </div>
            <p className="text-sm font-semibold text-blue-900 mt-1">
              {user.organization.name}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                  item.active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </a>
            </Link>
          ))}
        </div>

        {/* Demo Station Selector */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Active Stations
          </h3>
          <div className="space-y-2">
            {demoStations.map((station) => (
              <button
                key={station.id}
                onClick={() => onStationSelect(station)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeDemoStation?.id === station.id
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div 
                  className={`w-2 h-2 rounded-full ${getStatusColor(station)}`}
                />
                <span className="text-sm font-medium truncate">
                  {station.name}
                </span>
              </button>
            ))}
          </div>
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
