import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Users, Cpu, Trash2, Settings, Crown, UserPlus, Ban, Activity, Clock, Shield, Mail, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth';
import { PageLayout } from '@/components/page-layout';
import { apiRequest } from '@/lib/queryClient';
import type { Organization } from '@shared/schema';

interface OrganizationUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
  lastLogin?: string;
  sessionCount: number;
  commandCount: number;
}

export default function Organizations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e293b'
  });
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'Operator'
  });

  // Fetch user's organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['/api/users/me/organizations'],
    enabled: !!user,
  });

  // Fetch organization users when user management is open
  const { data: organizationUsers = [] } = useQuery<OrganizationUser[]>({
    queryKey: ['/api/organizations', selectedOrgId, 'users'],
    enabled: !!selectedOrgId && isUserManagementOpen,
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (orgData: typeof newOrg) => {
      return await apiRequest('/api/organizations', {
        method: 'POST',
        body: JSON.stringify(orgData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/organizations'] });
      setIsCreateModalOpen(false);
      setNewOrg({ name: '', slug: '', primaryColor: '#3b82f6', secondaryColor: '#1e293b' });
      toast({
        title: "Organization created successfully!",
        description: "Your new organization has been created and you've been added as an admin.",
      });
    },
    onError: (error: any) => {
      console.error('Organization creation error:', error);
      toast({
        title: "Failed to create organization",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: number) => {
      return await apiRequest(`/api/organizations/${orgId}/delete`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Organization deleted successfully!",
        description: "The organization and all its data have been permanently removed.",
      });
      queryClient.removeQueries({ queryKey: ['/api/users/me/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete organization",
        description: error.message || "There was an error deleting the organization.",
        variant: "destructive",
      });
    },
  });

  // User management mutations
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return await apiRequest(`/api/organizations/${selectedOrgId}/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', selectedOrgId, 'users'] });
      toast({ title: "User role updated successfully!" });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/organizations/${selectedOrgId}/users/${userId}/ban`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', selectedOrgId, 'users'] });
      toast({ title: "User has been banned from the organization." });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/organizations/${selectedOrgId}/users/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', selectedOrgId, 'users'] });
      toast({ title: "User has been removed from the organization." });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data: typeof inviteData) => {
      return await apiRequest(`/api/organizations/${selectedOrgId}/users/invite`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', selectedOrgId, 'users'] });
      setIsInviteUserOpen(false);
      setInviteData({ email: '', role: 'Operator' });
      toast({ title: "User invitation sent successfully!" });
    },
  });

  const handleDeleteOrg = (orgId: number, orgName: string) => {
    if (window.confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone and will permanently remove all data associated with this organization.`)) {
      deleteOrgMutation.mutate(orgId);
    }
  };

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newOrg.slug || newOrg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    createOrgMutation.mutate({ ...newOrg, slug });
  };

  const handleSwitchOrganization = async (orgId: number) => {
    try {
      const response = await fetch('/api/users/me/switch-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      queryClient.clear();
      window.dispatchEvent(new CustomEvent('organizationChanged'));

      toast({
        title: "Organization switched successfully!",
        description: "You are now working in the new organization.",
      });
    } catch (error: any) {
      console.error('Organization switch error:', error);
      toast({
        title: "Failed to switch organization",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const openUserManagement = (orgId: number) => {
    setSelectedOrgId(orgId);
    setIsUserManagementOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800';
      case 'Operator': return 'bg-blue-100 text-blue-800';
      case 'Viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentUser = getCurrentUser();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your organizations and their members
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Organization
        </Button>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organizations found</h3>
            <p className="text-muted-foreground mb-6">Create your first organization to get started</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg font-medium">{org.name}</CardTitle>
                  {org.id === currentUser?.organizationId && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openUserManagement(org.id)}
                    title="Manage Users"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  {org.id !== currentUser?.organizationId && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteOrg(org.id, org.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {(org as any).userCount || 0} users
                  </div>
                  <div className="flex items-center">
                    <Cpu className="w-4 h-4 mr-1" />
                    {(org as any).stationCount || 0} stations
                  </div>
                </div>
                <div className="flex space-x-2">
                  {org.id === currentUser?.organizationId ? (
                    <Badge variant="default" className="flex-1 justify-center">
                      Current Organization
                    </Badge>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleSwitchOrganization(org.id)}
                    >
                      Switch to this org
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Organization Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to manage your demo stations and team members.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                placeholder="Acme Robotics"
                required
              />
            </div>
            <div>
              <Label htmlFor="slug">URL Slug (optional)</Label>
              <Input
                id="slug"
                value={newOrg.slug}
                onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
                placeholder="acme-robotics"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={newOrg.primaryColor}
                  onChange={(e) => setNewOrg({ ...newOrg, primaryColor: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <Input
                  id="secondaryColor"
                  type="color"
                  value={newOrg.secondaryColor}
                  onChange={(e) => setNewOrg({ ...newOrg, secondaryColor: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOrgMutation.isPending}>
                {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Management Dialog */}
      <Dialog open={isUserManagementOpen} onOpenChange={setIsUserManagementOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Organization Users</DialogTitle>
            <DialogDescription>
              View and manage users in your organization, track their activity, and control permissions.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="users" className="w-full">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {organizationUsers.length} user(s) in this organization
                </div>
                <Button size="sm" onClick={() => setIsInviteUserOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizationUsers.map((orgUser) => (
                    <TableRow key={orgUser.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{orgUser.firstName} {orgUser.lastName}</div>
                          <div className="text-sm text-muted-foreground">{orgUser.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(orgUser.role)}>
                          {orgUser.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={orgUser.isActive ? "default" : "secondary"}>
                          {orgUser.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(orgUser.joinedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{orgUser.sessionCount} sessions</div>
                          <div>{orgUser.commandCount} commands</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Select
                            value={orgUser.role}
                            onValueChange={(role) => updateUserRoleMutation.mutate({ userId: orgUser.id, role })}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Operator">Operator</SelectItem>
                              <SelectItem value="Viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => banUserMutation.mutate(orgUser.id)}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeUserMutation.mutate(orgUser.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="activity">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <div className="text-muted-foreground">
                  Activity tracking will show user actions, login times, and system usage here.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={isInviteUserOpen} onOpenChange={setIsInviteUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join this organization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); inviteUserMutation.mutate(inviteData); }} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="user@company.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={inviteData.role} onValueChange={(role) => setInviteData({ ...inviteData, role })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin - Full access</SelectItem>
                  <SelectItem value="Operator">Operator - Can control stations</SelectItem>
                  <SelectItem value="Viewer">Viewer - Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteUserMutation.isPending}>
                {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}