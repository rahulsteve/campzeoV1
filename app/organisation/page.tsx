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
  Megaphone,
  Contact,
  Loader2,
  LayoutDashboard,
  Calendar
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import CalendarView from "./_components/CalendarView";

interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  organisation?: {
    name: string;
    isTrial: boolean;
    trialEndDate: string | null;
    subscriptions?: {
      plan?: {
        name: string;
      };
    }[];
  };
}

export default function OrganisationDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    campaigns: 0,
    contacts: 0,
    users: 1 // Default to 1 (current user) as we don't have a users list API yet
  });
  const [scheduledPosts, setScheduledPosts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch User & Organisation Details
        const userRes = await fetch("/api/user/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        } else {
          console.error("Failed to fetch user");
          toast.error("Failed to load user profile");
        }

        // 2. Fetch Campaigns Count
        const campaignsRes = await fetch("/api/campaigns?limit=1");
        if (campaignsRes.ok) {
          const data = await campaignsRes.json();
          setStats(prev => ({ ...prev, campaigns: data.pagination?.total || 0 }));
        }

        // 3. Fetch Contacts Count
        const contactsRes = await fetch("/api/contacts?limit=1");
        if (contactsRes.ok) {
          const data = await contactsRes.json();
          setStats(prev => ({ ...prev, contacts: data.pagination?.total || 0 }));
        }


        // 4. Fetch Scheduled Posts for Calendar
        try {
          const postsRes = await fetch("/api/scheduled-posts");
          console.log('Posts API Response Status:', postsRes.status);

          if (postsRes.ok) {
            const data = await postsRes.json();
            console.log('Posts API Data:', data);
            if (data.posts) {
              setScheduledPosts(data.posts);
              console.log('Scheduled posts loaded:', data.posts.length);
            }
          } else {
            const errorText = await postsRes.text();
            console.error('Posts API Error:', postsRes.status, errorText);
            toast.error(`Failed to load scheduled posts: ${postsRes.status}`);
          }
        } catch (postsError) {
          console.error('Error fetching posts:', postsError);
          toast.error('Failed to load scheduled posts');
        }


      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleManageBilling = () => {
    router.push("/organisation/billing");
  };

  const getUserInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Derived state or mocks
  const orgName = user?.organisation?.name || "Your Organisation";

  // Get Plan Name from subscription
  const latestSubscription = user?.organisation?.subscriptions?.[0];
  const planName = latestSubscription?.plan?.name || "Free";

  const isTrial = user?.organisation?.isTrial || false;
  // Mock usage data
  const storageUsed = 2.4;
  const storageLimit = 5.0;

  return (
    <div className="p-6">
      <div className=" mx-auto space-y-6">

        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="flex items-center justify-between">
            {/* <h1 className="text-3xl font-bold tracking-tight">Organisation Overview</h1> */}
            <TabsList>
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="size-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="size-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Welcome Section */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Welcome back, {orgName}</h2>
              <p className="text-muted-foreground mt-1">
                Here's what's happening with your account today
              </p>
            </div>

            {/* Plan Status Banner */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-primary-foreground">{planName} Plan</h3>
                      <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                        {isTrial ? "Trial Period" : "Active"}
                      </Badge>
                    </div>
                    <p className="text-primary-foreground/80">
                      {isTrial && user?.organisation?.trialEndDate
                        ? `Trial ends on ${new Date(user.organisation.trialEndDate).toLocaleDateString()}`
                        : "Your subscription is active."}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleManageBilling} className="bg-white text-primary hover:bg-white/90">
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
                  <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                  <Megaphone className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.campaigns}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active marketing campaigns
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                  <Contact className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.contacts}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Audience reach
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.users}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active team members
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs Content (Inner Dashboard Tabs) */}
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
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <p>No recent activity to show yet.</p>
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
                      {/* Future: Invite Member Button */}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {user && (
                        <div className="flex items-center justify-between py-3 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{getUserInitials(user.firstName, user.lastName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {[user.firstName, user.lastName].filter(Boolean).join(" ") || "User"}
                              </p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{user.role.replace('_', ' ')}</Badge>
                          </div>
                        </div>
                      )}
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
                          <span className="text-sm font-medium">Storage</span>
                          <span className="text-sm text-muted-foreground">{storageUsed}/{storageLimit}GB</span>
                        </div>
                        <Progress value={(storageUsed / storageLimit) * 100} />
                      </div>
                      {/* Add more usage stats when API is available */}
                      <div className="p-4 bg-muted/50 rounded-lg text-sm text-center text-muted-foreground">
                        Detailed usage metrics coming soon.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="calendar" className="h-full">
            <CalendarView posts={scheduledPosts} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
