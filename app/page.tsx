"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Shield, BarChart3, Users, ArrowRight, Layers, Globe } from "lucide-react";
import { SignInButton, SignedOut, SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from '@/components/Header';
import { usePlans, Plan } from "@/hooks/use-plans";
import { formatPrice } from "@/lib/plans";
import { TestimonialCarousel } from "@/components/testimonial-carousel";



export default function LandingPage() {
  const { plans, isLoading: plansLoading } = usePlans();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const router = useRouter();

  const handlePlanSelect = (plan: Plan) => {
    if (plan.price === 0) {
      // Redirect to sign up for free trial
      router.push("/sign-up");
    } else {
      // Show payment modal for paid plans
      setSelectedPlan(plan);
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    alert("Payment successful! Your account has been created.");
    router.push("/organisation");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      {/* <Header /> */}
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!plansLoading && plans.length > 0 && (
              <Button size="lg" onClick={() => handlePlanSelect(plans[0])}>
                Start Free Trial
                <ArrowRight className="ml-2 size-4" />
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Pricing
            </Button>
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
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful Features for Every Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Everything you need to manage, scale, and optimize your business operations
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-background/60 backdrop-blur-sm border-muted/20 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="size-6 text-primary" />
                </div>
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Get deep insights into your business metrics with real-time dashboards and custom reports
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-background/60 backdrop-blur-sm border-muted/20 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="size-6 text-primary" />
                </div>
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  Bank-level encryption, SOC 2 compliance, and advanced access controls to keep your data safe
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-background/60 backdrop-blur-sm border-muted/20 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="size-6 text-primary" />
                </div>
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>
                  Work seamlessly with your team using shared workspaces, comments, and real-time updates
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your needs. Start with a free trial or go straight to a paid plan.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {plansLoading ? (
              <div className="col-span-3 text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading plans...</p>
              </div>
            ) : (
              plans.map((plan) => {
                const isPopular = plan.price > 0 && plan.price < 5000;
                const isTrial = plan.price === 0;

                return (
                  <Card
                    key={plan.id}
                    className={`relative ${isPopular ? "border-primary shadow-lg" : ""}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="gap-1">
                          <Star className="size-3" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.description || (isTrial ? "Try all features for free" : "Perfect for your needs")}</CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl">{plan.price === 0 ? "Free" : `₹${plan.price}`}</span>
                        {plan.price > 0 && <span className="text-muted-foreground">/{plan.billingCycle || 'month'}</span>}
                        {isTrial && <span className="text-muted-foreground"> trial</span>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="size-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => handlePlanSelect(plan)}
                      >
                        {isTrial ? "Start Free Trial" : "Purchase Now"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
          <TestimonialCarousel />
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-4 text-primary-foreground">Ready to Get Started?</h2>
          <p className="mb-8 text-primary-foreground/90">
            Join thousands of teams already using SaaSify to streamline their operations
          </p>
          <Button size="lg" variant="secondary" onClick={() => !plansLoading && plans.length > 0 && handlePlanSelect(plans[0])}>
            Start Your Free Trial
            <ArrowRight className="ml-2 size-4" />
          </Button>
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
