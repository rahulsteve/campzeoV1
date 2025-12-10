"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { RazorpayButton } from "@/components/razorpay-button";
import { formatPrice } from "@/lib/plans";
import { toast } from "sonner";
import { usePlans } from "@/hooks/use-plans";

export default function OnboardingPage() {
  const { user } = useUser();
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
      debugger;
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
          console.log("Organization ID:", syncedUser.organisationId);
          console.log("Organization Name:", syncedUser.organisation.name);
          console.log("Has Subscription:", syncedUser.hasActiveSubscription);
          console.log("Subscription Object:", syncedUser.subscription);

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

    if (user) {
      debugger;
      if (!formData.email) {
        setFormData(prev => ({ ...prev, email: user.primaryEmailAddress?.emailAddress || "" }));
      }
      syncUser();
    } else {
      setIsSyncing(false);
    }
  }, [user, router]);

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
      console.log("=== REDIRECT DECISION ===");
      console.log("API Response User Role:", data.user?.role);
      console.log("Clerk Metadata Role:", user?.publicMetadata?.role);
      console.log("Is Admin (DB):", data.user?.role === "ADMIN_USER");
      console.log("Is Admin (Clerk):", user?.publicMetadata?.role === "admin");
      console.log("========================");

      if (data.user?.role === "ADMIN_USER" || user?.publicMetadata?.role === "admin") {
        console.log("🔀 Redirecting to /admin");
        router.push("/admin");
      } else {
        console.log("🔀 Redirecting to /organisation");
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
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Setting up your account...</p>
            </div>
          </CardContent>
        </Card>
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
            </div>

            {/* Plan Features */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">What's Included:</h3>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="size-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="size-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Welcome to CampZeo!</CardTitle>
          <CardDescription>
            Choose your plan and set up your organization to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name *</Label>
                <Input
                  id="organizationName"
                  placeholder="Acme Corp"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9999999999"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Tax Number */}
              <div className="space-y-2">
                <Label htmlFor="taxNumber">Tax Number (GST/VAT)</Label>
                <Input
                  id="taxNumber"
                  placeholder="GSTIN..."
                  value={formData.taxNumber}
                  onChange={handleInputChange}
                />
              </div>

              {/* Address */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  placeholder="123 Business St"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Mumbai"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="Maharashtra"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  placeholder="India"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Postal Code */}
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  placeholder="400001"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Plan Selection */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-lg">Select Your Plan *</Label>
              {plansLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading plans...</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {plans.map((plan) => {
                    // Determine if this is a popular/recommended plan based on price range
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
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary">Most Popular</Badge>
                          </div>
                        )}
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <div className="mt-2">
                            <span className="text-3xl font-bold">
                              {formatPrice(plan.price, "INR")}
                            </span>
                            {plan.price > 0 && (
                              <span className="text-muted-foreground text-sm">/{plan.billingCycle || 'month'}</span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {plan.features.slice(0, 4).map((feature, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <Check className="size-4 text-primary shrink-0 mt-0.5" />
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

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
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
  );
}
