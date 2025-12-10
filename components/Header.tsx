'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Home } from 'lucide-react';
import Link from 'next/link';

export function Header() {
    const router = useRouter();

    return (
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
            <div className="flex h-16 items-center gap-4 px-6 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2 font-semibold cursor-pointer" onClick={() => router.push('/')}>
                    <img src="/logo-1.png" alt="CampZeo" className="h-8 w-auto" />
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-4">
                    <SignedOut>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" onClick={() => router.push("/pricing")}>
                                Pricing
                            </Button>
                            <Button variant="outline" onClick={() => router.push("/sign-up")}>
                                Sign Up
                            </Button>
                            <SignInButton mode="modal">
                                <Button>Sign In</Button>
                            </SignInButton>
                        </div>
                    </SignedOut>

                    <SignedIn>
                        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                            <Home className="size-5" />
                        </Button>
                        <Link href="/organisation">
                            <Button variant="ghost">Dashboard</Button>
                        </Link>
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>
                </div>
            </div>
        </header>
    );
}
