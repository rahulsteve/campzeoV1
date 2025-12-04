import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./_components/settings-client";
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: { 
      organisation: {
        include: {
          organisationPlatforms: true
        }
      } 
    },
  });

  if (!dbUser) {
    redirect("/onboarding");
  }

  const userData = {
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    mobile: dbUser.mobile,
    email: dbUser.email,
    facebookConnected: !!dbUser.facebookAccessToken,
    instagramConnected: !!dbUser.instagramAccessToken,
    linkedInConnected: !!dbUser.linkedInAccessToken,
    linkedInAuthUrn: dbUser.linkedInAuthUrn,
    youtubeConnected: !!dbUser.youtubeAccessToken,
    pinterestConnected: !!dbUser.pinterestAccessToken,
    emailConnected: dbUser.organisation?.organisationPlatforms.some(p => p.platform === 'EMAIL') ?? false,
    smsConnected: dbUser.organisation?.organisationPlatforms.some(p => p.platform === 'SMS') ?? false,
    whatsappConnected: dbUser.organisation?.organisationPlatforms.some(p => p.platform === 'WHATSAPP') ?? false,
  };

  const assignedPlatforms = dbUser.organisation?.organisationPlatforms.map(p => p.platform) || [];

  return (
    <div className="min-h-screen bg-background">
                <Header />
                <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6">
                        <div className="max-w-7xl mx-auto space-y-6">
                            {/* Header */}
                             <div className="container mx-auto py-10">
      <SettingsClient userData={userData} assignedPlatforms={assignedPlatforms} />
    </div>
                        </div>
                    </main>
                </div>
    
                
            </div>
   
  );
}
