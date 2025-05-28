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

  return (
    <PageLayout
      title="Team Members"
      subtitle="Manage your organization's team members and permissions"
      action={{
        label: "Invite Member",
        onClick: () => setInviteModalOpen(true)
      }}
    >
      <div className="content-card">
        <div className="section-spacing-sm">
          {mockMembers.map((member) => (
            <div key={member.id} className="list-item-hover">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-gray-900">{member.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Mail className="w-3 h-3" />
                      <span>{member.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <Shield className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-medium">{member.role}</span>
                    </div>
                    <p className="text-xs text-gray-500">Last active {member.lastActive}</p>
                  </div>
                  <Badge variant={member.status === "Active" ? "default" : "secondary"}>
                    {member.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}