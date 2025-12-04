"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  CreditCard,
  BarChart3,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

// Mock organisation data
const mockOrganisation = {
  name: "Acme Corp",
  email: "admin@acme.com",
  plan: "Professional",
  status: "active",
  trialEndsAt: null,
  storageUsed: 45,
  storageLimit: 100,
  usersCount: 12,
  usersLimit: 50,
  nextBillingDate: "2025-01-15",
  nextBillingAmount: 2999,
};

const mockTeamMembers = [
  { id: 1, name: "John Doe", email: "john@acme.com", role: "Admin", status: "active" },
  { id: 2, name: "Jane Smith", email: "jane@acme.com", role: "Member", status: "active" },
  { id: 3, name: "Bob Johnson", email: "bob@acme.com", role: "Member", status: "active" },
];

const mockRecentActivity = [
  { id: 1, action: "Document uploaded", user: "John Doe", timestamp: "2 hours ago" },
  { id: 2, action: "Team member invited", user: "Jane Smith", timestamp: "5 hours ago" },
  { id: 3, action: "Settings updated", user: "John Doe", timestamp: "1 day ago" },
];

export default function OrganisationDashboard() {
  const router = useRouter();
  const [orgName, setOrgName] = useState(mockOrganisation.name);

  useEffect(() => {
    // Sync user on mount
    fetch("/api/user/sync")
      .then((res) => res.json())
      .then((data) => console.log("User sync status:", data))
      .catch((err) => console.error("User sync error:", err));

    // Fetch tenant data
    fetch("/api/tenant")
      .then((res) => res.json())
      .then((data) => {
        console.log("=== TENANT DATA ===");
        console.log("Full Response:", data);
        if (data.tenant) {
          console.log("Organization Name:", data.tenant.name);
          console.log("Plan:", data.tenant.plan);
          console.log("Status:", data.tenant.status);
          console.log("Enquiry:", data.tenant.enquiry);
          console.log("Created At:", data.tenant.createdAt);
          console.log("==================");
        }
      })
      .catch((err) => console.error("Error fetching tenant:", err));
  }, []);

  const handleInviteMember = () => {
    alert("Invite member functionality would open a modal here");
  };

  const handleManageBilling = () => {
    alert("Manage billing functionality would be implemented here");
  };

  return (
    <div className="min-h-screen bg-background">

<Header />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Welcome Section */}
            <div>
              <h1>Welcome back, {orgName}</h1>
              <p className="text-muted-foreground">
                Here's what's happening with your account today
              </p>
            </div>

            {/* Plan Status Banner */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-primary-foreground">{mockOrganisation.plan} Plan</h3>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <p className="text-primary-foreground/80">
                      Next billing: {mockOrganisation.nextBillingDate} • ₹{mockOrganisation.nextBillingAmount}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleManageBilling}>
                    <CreditCard className="size-4 mr-2" />
                    Manage Billing
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Team Members</CardTitle>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{mockOrganisation.usersCount}</div>
                  <Progress value={(mockOrganisation.usersCount / mockOrganisation.usersLimit) * 100} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {mockOrganisation.usersCount} of {mockOrganisation.usersLimit} users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Storage Used</CardTitle>
                  <BarChart3 className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{mockOrganisation.storageUsed}GB</div>
                  <Progress value={mockOrganisation.storageUsed} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {mockOrganisation.storageUsed} of {mockOrganisation.storageLimit}GB used
                  </p>
                </CardContent>
              </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">API Calls</CardTitle>
                <Zap className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">12,450</div>
                <Progress value={62} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  62% of monthly limit
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Content */}
          <Tabs defaultValue="activity" className="space-y-4">
            <TabsList>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="team">Team Members</TabsTrigger>
              <TabsTrigger value="usage">Usage Details</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest actions in your workspace
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockRecentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p>{activity.action}</p>
                          <p className="text-sm text-muted-foreground">{activity.user}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{activity.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>
                        Manage your team members and their roles
                      </CardDescription>
                    </div>
                    <Button onClick={handleInviteMember}>
                      <Users className="size-4 mr-2" />
                      Invite Member
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockTeamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{member.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p>{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{member.role}</Badge>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

              <TabsContent value="usage" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Details</CardTitle>
                    <CardDescription>
                      Detailed breakdown of your usage and limits
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>Storage</span>
                          <span className="text-muted-foreground">{mockOrganisation.storageUsed}/{mockOrganisation.storageLimit}GB</span>
                        </div>
                        <Progress value={mockOrganisation.storageUsed} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>Team Members</span>
                          <span className="text-muted-foreground">{mockOrganisation.usersCount}/{mockOrganisation.usersLimit}</span>
                        </div>
                        <Progress value={(mockOrganisation.usersCount / mockOrganisation.usersLimit) * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>API Calls</span>
                          <span className="text-muted-foreground">12,450/20,000</span>
                        </div>
                        <Progress value={62} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
