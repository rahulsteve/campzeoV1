"use client";

import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  Home,
  Bell,
  Zap,
  Menu,
} from "lucide-react";
import { SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const SidebarContent = () => (
  <nav className="space-y-2">
    <Link href="/organisation">
      <Button variant="secondary" className="w-full justify-start">
        <LayoutDashboard className="size-4 mr-2" />
        Dashboard
      </Button>
    </Link>
    <Button variant="ghost" className="w-full justify-start">
      <FileText className="size-4 mr-2" />
      Documents
    </Button>
    <Button variant="ghost" className="w-full justify-start">
      <Users className="size-4 mr-2" />
      Team
    </Button>
    <Link href="/organisation/analytics">
      <Button variant="ghost" className="w-full justify-start">
        <BarChart3 className="size-4 mr-2" />
        Analytics
      </Button>
    </Link>
    <Link href="/organisation/billing">
      <Button variant="ghost" className="w-full justify-start">
        <CreditCard className="size-4 mr-2" />
        Billing
      </Button>
    </Link>
    <Link href="/organisation/settings">
      <Button variant="ghost" className="w-full justify-start">
        <Settings className="size-4 mr-2" />
        Settings
      </Button>
    </Link>
  </nav>
);

export function OrganisationLayoutWrapper({ children, isImpersonating }: { children: React.ReactNode; isImpersonating?: boolean }) {
  const handleExitImpersonation = () => {
    // Clear the cookie
    document.cookie = "admin_impersonation=; path=/; max-age=0";
    // Redirect to admin
    window.location.href = "/admin";
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        {isImpersonating && (
            <div className="bg-amber-100 text-amber-900 px-4 py-1 text-xs font-medium text-center border-b border-amber-200 flex items-center justify-center gap-2">
                <span>You are impersonating an organisation.</span>
                <button onClick={handleExitImpersonation} className="underline hover:text-amber-700 font-bold">
                    Back to Admin
                </button>
            </div>
        )}
        
      </header>

      <div className="flex">
        {/* Sidebar (Desktop) */}
        <aside className="w-64 border-r bg-background min-h-[calc(100vh-4rem)] p-4 hidden md:block">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
