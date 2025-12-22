"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, Sparkles, CreditCard, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { RazorpayButton } from "@/components/razorpay-button";
import { formatPrice } from "@/lib/plans";
import { toast } from "sonner";
import { usePlans } from "@/hooks/use-plans";

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { plans, isLoading: plansLoading } = usePlans();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    organizationName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    taxNumber: ""
  });

  // Sync user on mount
  useEffect(() => {
    const syncUser = async () => {
      try {
        const response = await fetch("/api/user/sync");
        const data = await response.json();
        console.log("=== ONBOARDING PAGE - User Sync ===");
        console.log("User sync result:", data);
        console.log("====================================");

        if (!data.user) {
          setIsSyncing(false);
          return;
        }

        const { user: syncedUser } = data;

        if (syncedUser.isAdmin) {
          console.log(" Admin user detected - Redirecting to /admin");
          router.push("/admin");
          return;
        }

        if (syncedUser.hasOrganisation && syncedUser.isTrialOrPremium) {
          console.log("User has organization with active subscription - Redirecting to /organisation");
          router.push("/organisation");
          return;
        }

        if (syncedUser.needsOnboarding &&
          syncedUser.organisation &&
          syncedUser.organisationId &&
          !syncedUser.hasActiveSubscription &&
          !syncedUser.subscription) {

          console.log(" User from enquiry - Prefilling onboarding form");
          setFormData({
            organizationName: syncedUser.organisation.name || "",
            email: syncedUser.organisation.email || user?.primaryEmailAddress?.emailAddress || "",
            phone: syncedUser.organisation.phone || "",
            address: syncedUser.organisation.address || "",
            city: syncedUser.organisation.city || "",
            state: syncedUser.organisation.state || "",
            country: syncedUser.organisation.country || "",
            postalCode: syncedUser.organisation.postalCode || "",
            taxNumber: syncedUser.organisation.taxNumber || ""
          });
          setIsSyncing(false);
          return;
        }

        console.log("📝 New user - Showing onboarding form");

      } catch (err) {
        console.error("Error syncing user:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    if (isLoaded && user) {
      if (!formData.email) {
        setFormData(prev => ({ ...prev, email: user.primaryEmailAddress?.emailAddress || "" }));
      }
      syncUser();
    } else if (isLoaded && !user) {
      setIsSyncing(false);
    }
  }, [isLoaded, user, router]); // formData dependency removed to avoid infinite loop if it changes

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const createOrganisation = async (paymentData?: any) => {
    try {
      const selectedPlan = plans.find(p => p.id === selectedPlanId);

      const response = await fetch("/api/organisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          plan: selectedPlan?.name || "FREE_TRIAL",
          planId: selectedPlanId,
          paymentData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organisation");
      }

      console.log("Organisation created:", data);
      toast.success("Welcome! Your account is ready.");

      // Redirect based on role
      if (data.user?.role === "ADMIN_USER" || user?.publicMetadata?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/organisation");
      }

    } catch (err) {
      console.error("Error creating organisation:", err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Validation
      if (!formData.organizationName || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.state || !formData.country || !formData.postalCode) {
        toast.error("Please fill in all required fields");
        setIsLoading(false);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Please enter a valid email address");
        setIsLoading(false);
        return;
      }

      // Phone validation
      if (formData.phone.length < 10) {
        toast.error("Please enter a valid phone number");
        setIsLoading(false);
        return;
      }

      const selectedPlan = plans.find(p => p.id === selectedPlanId);
      if (selectedPlan && selectedPlan.price === 0) {
        // Free trial - create organisation directly
        await createOrganisation();
      } else {
        // Paid plan - show payment step
        setShowPayment(true);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Failed to complete setup");
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentData?: any) => {
    try {
      setIsLoading(true);
      toast.info("Payment successful! Creating your organization...");

      // Store payment info to pass to organisation creation
      if (paymentData?.payment) {
        // Create organisation with payment information
        await createOrganisation(paymentData.payment);
      } else {
        await createOrganisation();
      }
    } catch (err) {
      console.error("Error after payment:", err);
      setError(err instanceof Error ? err.message : "Failed to complete setup");
      setIsLoading(false);
    }
  };

  const handlePaymentError = (error: string) => {
    setError(error);
    setShowPayment(false);
  };

  if (isSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-medium tracking-tight">Setting up your account...</h2>
          <p className="text-muted-foreground text-sm">Please wait while we sync your details.</p>
        </div>
      </div>
    );
  }

  // Payment step
  if (showPayment) {
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="size-8 text-primary" />
              </div>
            </div>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              You're almost there! Complete payment to activate your {plan.name} plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Summary */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organization:</span>
                  <span className="font-medium">{formData.organizationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing:</span>
                  <span className="font-medium">{plan.billingCycle || 'Monthly'}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-primary">
                    {formatPrice(plan.price, "INR")}/{plan.billingCycle || 'month'}
                  </span>
                </div>
              </div>



              <div className="mt-8 pt-6 border-t text-xs text-muted-foreground">
                <p>Secure payment powered by Razorpay. You can cancel anytime from your dashboard.</p>
              </div>
            </div>

            {/* Main Payment Content */}
            <div className="md:col-span-3 p-6 md:p-8 flex flex-col">
              <div className="mb-6">
                <CardTitle className="text-2xl mb-2">Complete Payment</CardTitle>
                <CardDescription>
                  Activate your <span className="font-medium text-foreground">{plan.name}</span> plan to unlock all features.
                </CardDescription>
              </div>

              <div className="space-y-6 flex-1">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                    <Sparkles className="size-4" /> What's included:
                  </h4>
                  <ul className="grid grid-cols-1 gap-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2">
                    <span className="font-bold">Error:</span> {error}
                  </div>
                )}
              </div>
            </div>
            {/* Payment Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPayment(false)}
                disabled={isLoading}
              >
                Back
              </Button>
              <RazorpayButton
                plan={plan.name}
                amount={plan.price}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                className="flex-1"
                organizationName={formData.organizationName}
                isSignup={true}
              >
                Pay {formatPrice(plan.price, "INR")}
              </RazorpayButton>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Razorpay. Your payment information is encrypted and secure.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Onboarding form
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 via-background to-background p-4 md:p-8">
      <Card className="w-full max-w-5xl shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center pb-8 pt-8">
          <div className="flex justify-center mb-6">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner">
              <Building2 className="size-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">Welcome to CampZeo!</CardTitle>
          <CardDescription className="text-lg mt-2 max-w-2xl mx-auto">
            Let's set up your organization workspace. It only takes a minute.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 md:px-12 pb-12">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Steps Visual (Optional, implies flow) */}
            <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
              {/* Left: Organization Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                  <h3 className="font-semibold text-lg">Organization Details</h3>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="organizationName"
                      placeholder="e.g. Acme Corp"
                      value={formData.organizationName}
                      onChange={handleInputChange}
                      required
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="bg-muted/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91..."
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="bg-muted/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxNumber">Tax Number / GSTIN</Label>
                    <Input
                      id="taxNumber"
                      placeholder="Optional"
                      value={formData.taxNumber}
                      onChange={handleInputChange}
                      className="bg-muted/30"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                  <Input
                    id="address"
                    placeholder="Street Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="bg-muted/30"
                  />
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Input
                      id="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="bg-muted/30"
                    />
                    <Input
                      id="state"
                      placeholder="State"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Input
                      id="country"
                      placeholder="Country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="bg-muted/30"
                    />
                    <Input
                      id="postalCode"
                      placeholder="Postal Code"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      required
                      className="bg-muted/30"
                    />
                  </div>
                </div>
              </div>

              {/* Right: Plan Selection */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                  <h3 className="font-semibold text-lg">Select a Plan</h3>
                </div>

                <div className="space-y-4">
                  {plansLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading plans...</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {plans.map((plan) => {
                        const isPopular = plan.price > 0 && plan.price < 5000;
                        return (
                          <Card
                            key={plan.id}
                            className={`cursor-pointer transition-all ${selectedPlanId === plan.id
                              ? "border-primary shadow-md ring-2 ring-primary"
                              : "hover:border-primary/50"
                              } ${isPopular ? "relative" : ""}`}
                            onClick={() => setSelectedPlanId(plan.id)}
                          >
                            {isPopular && (
                              <div className="absolute -top-3 right-4">
                                <Badge className="bg-primary text-xs">Most Popular</Badge>
                              </div>
                            )}
                            <CardHeader className="pb-3 p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-base font-bold">{plan.name}</CardTitle>
                                  <div className="mt-1">
                                    <span className="text-xl font-bold">
                                      {formatPrice(plan.price, "INR")}
                                    </span>
                                    {plan.price > 0 && (
                                      <span className="text-muted-foreground text-xs">/{plan.billingCycle || 'month'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <ul className="space-y-1.5">
                                {plan.features.slice(0, 3).map((feature, index) => (
                                  <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <div className="size-2 rounded-full bg-red-600 animate-pulse" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading || !selectedPlanId}>
              {isLoading ? "Setting up..." : plans.find(p => p.id === selectedPlanId)?.price === 0 ? "Start Free Trial" : "Continue to Payment"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}
