import { useState } from 'react';
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

  // Fetch user's organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['/api/users/me/organizations'],
    enabled: !!user,
  });

  // Organization switch mutation
  const switchOrganizationMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      return apiRequest('/api/users/me/switch-organization', {
        method: 'POST',
        body: JSON.stringify({ organizationId }),
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/demo-stations'] });
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('organizationChanged'));
      
      toast({ title: 'Organization switched successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Failed to switch organization',
        variant: 'destructive'
      });
    },
  });

  const handleSwitchOrganization = (org: Organization) => {
    if (org.id !== currentOrganization?.id) {
      switchOrganizationMutation.mutate(org.id);
    }
  };

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
              style={{ backgroundColor: currentOrganization?.primaryColor || '#3b82f6' }}
            >
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">
                {currentOrganization?.name || 'Select Organization'}
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
            {currentOrganization?.id === org.id && (
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