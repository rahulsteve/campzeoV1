"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Shield, BarChart3, Users, ArrowRight, Layers, Globe } from "lucide-react";
import { SignInButton, SignedOut, SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TestimonialCarousel } from "@/components/testimonial-carousel";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}

      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src="/logo-1.png" alt="Campzeo" className="h-8" />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Testimonials
              </a>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <SignedOut>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => router.push("/sign-up")}>
                    Sign Up
                  </Button>
                  <SignInButton mode="modal">
                    <Button>Sign In</Button>
                  </SignInButton>
                </div>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
                <Link href="/organisation">
                  <Button variant="outline">Dashboard</Button>
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            🚀 Now with AI-powered insights
          </Badge>
          <h1 className="mb-6 max-w-5xl mx-auto text-4xl md:text-6xl font-bold tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            The Complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">SaaS Platform</span> for Modern Teams
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            Streamline your workflow, boost productivity, and scale your business with our all-in-one platform.
            Start your free 14-day trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Button size="lg" className="h-12 px-8 text-lg" onClick={() => router.push("/sign-up")}>
              Start Free Trial
              <ArrowRight className="ml-2 size-5" />
            </Button>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                View Pricing
              </Button>
            </Link>
          </div>
          <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-green-500" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <Check className="size-4 text-green-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Check className="size-4 text-green-500" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful Features for Every Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Everything you need to manage, scale, and optimize your business operations
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 px-4">
            {/* Feature 1 */}
            <div className="relative group perspective-1000">
              <Card className="relative h-full bg-background/60 backdrop-blur-sm border-muted/20 p-2 transition-all duration-500 hover:rotate-y-6 hover:scale-105 hover:shadow-2xl z-10">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/50 to-orange-500/50 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
                <CardHeader className="relative bg-card rounded-lg h-full">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <BarChart3 className="size-6 text-primary" />
                  </div>
                  <CardTitle className="mb-2">Advanced Analytics</CardTitle>
                  <CardDescription>
                    Get deep insights into your business metrics with real-time dashboards and custom reports
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Feature 2 */}
            <div className="relative group perspective-1000">
              <Card className="relative h-full bg-background/60 backdrop-blur-sm border-muted/20 p-2 transition-all duration-500 hover:-rotate-y-6 hover:scale-105 hover:shadow-2xl z-10">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/50 to-purple-500/50 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
                <CardHeader className="relative bg-card rounded-lg h-full">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Shield className="size-6 text-primary" />
                  </div>
                  <CardTitle className="mb-2">Enterprise Security</CardTitle>
                  <CardDescription>
                    Bank-level encryption, SOC 2 compliance, and advanced access controls to keep your data safe
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Feature 3 */}
            <div className="relative group perspective-1000">
              <Card className="relative h-full bg-background/60 backdrop-blur-sm border-muted/20 p-2 transition-all duration-500 hover:rotate-y-6 hover:scale-105 hover:shadow-2xl z-10">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-green-500/50 to-teal-500/50 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
                <CardHeader className="relative bg-card rounded-lg h-full">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Users className="size-6 text-primary" />
                  </div>
                  <CardTitle className="mb-2">Team Collaboration</CardTitle>
                  <CardDescription>
                    Work seamlessly with your team using shared workspaces, comments, and real-time updates
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Get started in minutes with our simple three-step process designed for growth
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative px-4">
            {/* Step 1 */}
            <div className="relative group perspective-1000">
              <div className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-card border border-muted/20 shadow-xl transition-all duration-500 hover:rotate-x-6 hover:scale-105 hover:shadow-2xl hover:border-primary/50 z-10 h-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>

                <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/10 to-orange-100 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Globe className="size-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">1. Connect</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Seamlessly link all your social media profiles and ad accounts in one secure dashboard.
                </p>
              </div>
              {/* Connector Line (Desktop) */}
              <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-2 bg-gradient-to-r from-muted to-transparent transform -translate-y-1/2 z-0 opacity-50" />
            </div>

            {/* Step 2 */}
            <div className="relative group perspective-1000">
              <div className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-card border border-muted/20 shadow-xl transition-all duration-500 hover:-rotate-x-6 hover:scale-105 hover:shadow-2xl hover:border-primary/50 z-10 h-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-primary rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>

                <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/10 to-orange-100 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Layers className="size-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">2. Create & Schedule</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Use our AI-powered tools to create engaging content and schedule it for optimal times.
                </p>
              </div>
              {/* Connector Line (Desktop) */}
              <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-2 bg-gradient-to-r from-muted to-transparent transform -translate-y-1/2 z-0 opacity-50" />
            </div>

            {/* Step 3 */}
            <div className="relative group perspective-1000">
              <div className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-card border border-muted/20 shadow-xl transition-all duration-500 hover:rotate-x-6 hover:scale-105 hover:shadow-2xl hover:border-primary/50 z-10 h-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>

                <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/10 to-orange-100 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Zap className="size-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">3. Analyze & Grow</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track performance with real-time analytics and optimize your strategy for growth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Trusted by Industry Leaders</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              See what our customers have to say about their experience
            </p>
          </div>
          <TestimonialCarousel />
        </div>
      </section>

      {/* Pricing Teaser Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative">
            {/* Abstract Background pattern */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 size-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 size-64 bg-white/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 px-8 py-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Ready to streamline your workflow?</h2>
              <p className="text-primary-foreground/90 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
                Join thousands of teams already using Campzeo to manage their social presence.
                Plans start at free.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/pricing">
                  <Button size="lg" variant="secondary" className="h-12 px-8 text-lg w-full sm:w-auto">
                    View Pricing Plans
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-lg bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto"
                  onClick={() => router.push("/sign-up")}
                >
                  Start Free Trial
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo-1.png" alt="Campzeo" className="h-8" />
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The all-in-one platform for modern social media management and analytics.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><Link href="/pricing" className="hover:text-primary transition-colors">Enterprise</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Community</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2025 Campzeo. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
              <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
