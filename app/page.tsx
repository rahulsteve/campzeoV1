"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Shield, BarChart3, Users, Star, ArrowRight } from "lucide-react";
import { useState } from "react";
// import { PaymentModal } from "@/components/PaymentModal"; // We will need to migrate this component too
import { SignInButton, SignUpButton, SignedOut, SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from '@/components/Header';

type Plan = {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  isTrial?: boolean;
  isPopular?: boolean;
  priceId?: string;
};

const plans: Plan[] = [
  {
    name: "Free Trial",
    price: 0,
    period: "14 days",
    description: "Try all features for free",
    isTrial: true,
    features: [
      "Up to 5 users",
      "Basic analytics",
      "Email support",
      "Core features access",
      "5GB storage",
      "Community support",
    ],
  },
  {
    name: "Professional",
    price: 2999,
    period: "month",
    description: "Perfect for growing teams",
    isPopular: true,
    priceId: "plan_pro_monthly",
    features: [
      "Unlimited users",
      "Advanced analytics",
      "Priority support",
      "All features unlocked",
      "100GB storage",
      "Custom integrations",
      "API access",
      "White-label options",
    ],
  },
  {
    name: "Enterprise",
    price: 9999,
    period: "month",
    description: "For large organizations",
    priceId: "plan_enterprise_monthly",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "24/7 phone support",
      "Custom SLA",
      "Unlimited storage",
      "Advanced security",
      "Custom contracts",
      "On-premise deployment option",
    ],
  },
];

export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const router = useRouter();

  const handlePlanSelect = (plan: Plan) => {
    if (plan.isTrial) {
      // Redirect to sign up
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
    <div className="min-h-screen">
      {/* Navigation */}
      <Header />
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src="/logo-1.png" alt="Campzeo" className="h-8" />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground">
                Pricing
              </a>
              <a href="#about" className="text-muted-foreground hover:text-foreground">
                About
              </a>
            </div>
            <div className="flex items-center gap-4">
              <SignedOut>
                <div className="flex items-center gap-3">

                  <button
                    className="px-3 py-2 text-red-500 border border-red-500 rounded-md"
                    onClick={() => router.push("/sign-up")}
                  >
                    Sign Up
                  </button>

                  <SignInButton mode="modal">

                    <button className="px-3 py-2 text-red-500 border border-red-500 rounded-md" style={{ backgroundColor: "red", color: "white" }}>
                      Sign In
                    </button>
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
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            🚀 Now with AI-powered insights
          </Badge>
          <h1 className="mb-6 max-w-4xl mx-auto">
            The Complete SaaS Platform for Modern Teams
          </h1>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your workflow, boost productivity, and scale your business with our all-in-one platform.
            Start your free 14-day trial today, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => handlePlanSelect(plans[0])}>
              Start Free Trial
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Pricing
            </Button>
          </div>
          <div className="mt-16 flex justify-center gap-8 text-sm text-muted-foreground">
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
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">Powerful Features for Every Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage, scale, and optimize your business operations
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <BarChart3 className="size-12 text-primary mb-4" />
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Get deep insights into your business metrics with real-time dashboards and custom reports
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Shield className="size-12 text-primary mb-4" />
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  Bank-level encryption, SOC 2 compliance, and advanced access controls to keep your data safe
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Users className="size-12 text-primary mb-4" />
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>
                  Work seamlessly with your team using shared workspaces, comments, and real-time updates
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your needs. Start with a free trial or go straight to a paid plan.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.isPopular ? "border-primary shadow-lg" : ""}`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="gap-1">
                      <Star className="size-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl">{plan.price === 0 ? "Free" : `₹${plan.price}`}</span>
                    {plan.price > 0 && <span className="text-muted-foreground">/{plan.period}</span>}
                    {plan.isTrial && <span className="text-muted-foreground"> for {plan.period}</span>}
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
                    variant={plan.isPopular ? "default" : "outline"}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    {plan.isTrial ? "Start Free Trial" : "Purchase Now"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-4 text-primary-foreground">Ready to Get Started?</h2>
          <p className="mb-8 text-primary-foreground/90">
            Join thousands of teams already using SaaSify to streamline their operations
          </p>
          <Button size="lg" variant="secondary" onClick={() => handlePlanSelect(plans[0])}>
            Start Your Free Trial
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand Section */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <img src="/logo-1.png" alt="Campzeo" className="h-8" />
              </div>
              <p className="text-muted-foreground text-sm">
                Streamline your social media management with powerful tools and insights.
              </p>
            </div>

            {/* Quick Links */}
            <div className="text-center">
              <h3 className="font-semibold text-foreground mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="text-center md:text-right">
              <h3 className="font-semibold text-foreground mb-3">Contact</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>support@campzeo.com</li>
                <li>privacy@campzeo.com</li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t text-center text-muted-foreground text-sm">
            <p>© 2025 Campzeo. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Payment Modal Placeholder - Needs migration */}
      {/* {showPaymentModal && selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )} */}
    </div>
  );
}
