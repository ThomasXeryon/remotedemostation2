import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Mail, Shield, User } from "lucide-react";

export default function TeamMembers() {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const mockMembers = [
    {
      id: 1,
      name: "John Doe",
      email: "john@acme.com",
      role: "Admin",
      avatar: null,
      lastActive: "2 hours ago",
      status: "Active"
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@acme.com", 
      role: "Operator",
      avatar: null,
      lastActive: "1 day ago",
      status: "Active"
    },
    {
      id: 3,
      name: "Bob Wilson",
      email: "bob@acme.com",
      role: "Viewer",
      avatar: null,
      lastActive: "3 days ago",
      status: "Inactive"
    }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800';
      case 'Operator': return 'bg-blue-100 text-blue-800';
      case 'Viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">Manage your organization's team members and their permissions</p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{member.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{member.email}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <Badge className={getRoleColor(member.role)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {member.role}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last active {member.lastActive}
                    </p>
                  </div>
                  
                  <Badge variant={member.status === 'Active' ? 'default' : 'secondary'}>
                    {member.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}