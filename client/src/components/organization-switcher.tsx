import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown, Building2, Plus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface Organization {
  id: number;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  role: string;
}

interface OrganizationSwitcherProps {
  currentOrganization?: {
    id: number;
    name: string;
    primaryColor: string;
  };
}

export function OrganizationSwitcher({ currentOrganization }: OrganizationSwitcherProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = getCurrentUser();
  const [selectedOrg, setSelectedOrg] = useState(currentOrganization);

  // Update selected org when current organization prop changes
  useEffect(() => {
    setSelectedOrg(currentOrganization);
  }, [currentOrganization]);

  // Fetch user's organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['/api/users/me/organizations'],
    enabled: !!user,
  });

  // Fetch current user data to get organization info
  const { data: userData } = useQuery({
    queryKey: ['/api/users/me'],
    enabled: !!user,
  });

  // Organization switch mutation
  const switchOrganizationMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      try {
        const response = await fetch('/api/users/me/switch-organization', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ organizationId }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Organization switch error:', error);
        throw error;
      }
    },
    onSuccess: (data: any, organizationId: number) => {
      console.log('Organization switch successful:', data);
      
      // Save the new JWT token
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        console.log('New token saved to localStorage');
      }
      
      // Update user data in localStorage with new organization
      const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      if (data.organization) {
        currentUser.organization = data.organization;
        localStorage.setItem('auth_user', JSON.stringify(currentUser));
        console.log('Updated user organization in localStorage:', data.organization);
      }
      
      // Update selected org state
      const newOrg = organizations.find(org => org.id === organizationId);
      if (newOrg) {
        setSelectedOrg({
          id: newOrg.id,
          name: newOrg.name,
          primaryColor: newOrg.primaryColor
        });
      }
      
      toast({ title: 'Organization switched successfully' });
      
      // Clear queries and force immediate refresh without page reload
      queryClient.clear();
      
      // Immediately invalidate specific queries that depend on organization
      queryClient.invalidateQueries({ queryKey: ['/api/demo-stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/organizations'] });
      
      // Dispatch event to update other components immediately
      window.dispatchEvent(new CustomEvent('organizationChanged', { 
        detail: { organization: data.organization } 
      }));
    },
    onError: (error: any) => {
      console.error('Organization switch failed:', error);
      toast({ 
        title: 'Failed to switch organization',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    },
  });

  const handleSwitchOrganization = (org: Organization) => {
    if (org.id !== selectedOrg?.id) {
      switchOrganizationMutation.mutate(org.id);
    }
  };

  // Determine current organization to display
  const displayOrg = selectedOrg || userData?.organization || currentOrganization;

  const handleCreateOrganization = () => {
    setLocation('/organizations');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between p-3 h-auto hover:bg-slate-50"
        >
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: displayOrg?.primaryColor || '#3b82f6' }}
            >
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">
                {displayOrg?.name || 'No Organization Selected'}
              </p>
              <p className="text-xs text-slate-500">
                {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {organizations.map((org: Organization) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitchOrganization(org)}
            className="flex items-center space-x-3 p-3"
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: org.primaryColor }}
            >
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {org.name}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {org.role}
              </p>
            </div>
            {displayOrg?.id === org.id && (
              <Check className="h-4 w-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleCreateOrganization}
          className="flex items-center space-x-3 p-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
            <Plus className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Create Organization</p>
            <p className="text-xs text-slate-500">Set up a new organization</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}