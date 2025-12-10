"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, Sparkles, MapPin, Phone, Mail, Globe, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { RazorpayButton } from "@/components/razorpay-button";
import { PLANS, formatPrice, type PlanType } from "@/lib/plans";
import { toast } from "sonner";
import { Header } from "@/components/Header";

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("FREE_TRIAL");
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

    if (user) {
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
      const response = await fetch("/api/organisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          plan: selectedPlan,
          paymentData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organisation");
      }

      console.log("Organisation created:", data);
      toast.success("Welcome! Your account is ready.");

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

      if (selectedPlan === "FREE_TRIAL") {
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

      if (paymentData?.payment) {
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
        <Card className="w-full max-w-md shadow-xl">
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
    const plan = PLANS[selectedPlan];
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <Card className="w-full max-w-2xl shadow-xl border-muted/20">
            <CardHeader className="text-center border-b bg-muted/5 pb-8">
              <div className="flex justify-center mb-6">
                <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/5">
                  <Sparkles className="size-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">Complete Your Payment</CardTitle>
              <CardDescription className="text-lg mt-2">
                You're almost there! Activate your <span className="font-semibold text-primary">{plan.name}</span> plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-8">
              {/* Order Summary */}
              <div className="bg-muted/10 rounded-xl p-6 border border-muted/20">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="size-5 text-primary" />
                  Order Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Organization</span>
                    <span className="font-medium bg-background px-3 py-1 rounded-md border">{formData.organizationName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium bg-background px-3 py-1 rounded-md border">{plan.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Billing Cycle</span>
                    <span className="font-medium bg-background px-3 py-1 rounded-md border">Monthly</span>
                  </div>
                  <div className="border-t pt-4 mt-4 flex justify-between items-center text-lg">
                    <span className="font-semibold">Total Amount</span>
                    <span className="font-bold text-2xl text-primary">
                      {formatPrice(plan.price, plan.currency)}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan Features */}
              <div className="rounded-xl p-6 border border-muted/20">
                <h3 className="font-semibold mb-3">What's Included:</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="mt-0.5 rounded-full bg-green-500/10 p-1">
                        <Check className="size-3 text-green-600 shrink-0" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <div className="size-2 rounded-full bg-red-500" />
                  {error}
                </div>
              )}

              {/* Payment Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-base"
                  onClick={() => setShowPayment(false)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <div className="flex-1">
                  <RazorpayButton
                    plan={selectedPlan}
                    amount={plan.price}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    className="w-full h-12 text-base shadow-lg shadow-primary/20"
                    organizationName={formData.organizationName}
                    isSignup={true}
                  >
                    Pay {formatPrice(plan.price, plan.currency)}
                  </RazorpayButton>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <div className="size-2 rounded-full bg-green-500" />
                Secure payment powered by Razorpay. Your payment information is encrypted.
              </div>
            </CardContent>
          </Card>
        </main>
        <footer className="py-8 border-t bg-background text-center text-sm text-muted-foreground">
          <div className="max-w-7xl mx-auto px-4">
            <p>© 2025 Campzeo. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // Onboarding form
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 py-24">
        <div className="w-full max-w-4xl">
          <Card className="shadow-xl border-muted/20 overflow-hidden">
            <CardHeader className="text-center pb-8 border-b bg-muted/5 pt-10">
              <div className="flex justify-center mb-6">
                <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/5">
                  <Building2 className="size-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold">Welcome to CampZeo!</CardTitle>
              <CardDescription className="text-lg text-muted-foreground max-w-xl mx-auto mt-3">
                Let's set up your organization so you can start managing your social media presence effectively.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 sm:p-10">
              <form onSubmit={handleSubmit} className="space-y-10">

                {/* Organization Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-primary font-semibold text-lg border-b pb-3">
                    <Building2 className="size-5" />
                    <h3>Organization Details</h3>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="organizationName">Organization Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="organizationName"
                        placeholder="Acme Corp"
                        value={formData.organizationName}
                        onChange={handleInputChange}
                        required
                        className="bg-background h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxNumber">Tax ID / GST <span className="text-muted-foreground font-normal text-xs ml-1">(Optional)</span></Label>
                      <Input
                        id="taxNumber"
                        placeholder="GSTIN..."
                        value={formData.taxNumber}
                        onChange={handleInputChange}
                        className="bg-background h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Work Email <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="pl-9 bg-background h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+91 9999999999"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          className="pl-9 bg-background h-11"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-primary font-semibold text-lg border-b pb-3">
                    <MapPin className="size-5" />
                    <h3>Location</h3>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Street Address <span className="text-red-500">*</span></Label>
                      <Input
                        id="address"
                        placeholder="123 Business St"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        className="bg-background h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                      <Input
                        id="city"
                        placeholder="Mumbai"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="bg-background h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State / Province <span className="text-red-500">*</span></Label>
                      <Input
                        id="state"
                        placeholder="Maharashtra"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                        className="bg-background h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          id="country"
                          placeholder="India"
                          value={formData.country}
                          onChange={handleInputChange}
                          required
                          className="pl-9 bg-background h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code <span className="text-red-500">*</span></Label>
                      <Input
                        id="postalCode"
                        placeholder="400001"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        required
                        className="bg-background h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="space-y-6 pt-2">
                  <div className="flex items-center gap-2 text-primary font-semibold text-lg border-b pb-3">
                    <Sparkles className="size-5" />
                    <h3>Select Your Plan</h3>
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
                    {Object.values(PLANS).map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${selectedPlan === plan.id
                            ? "border-primary bg-primary/5 shadow-lg"
                            : "border-muted bg-card hover:border-primary/50"
                          }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        {/* Selection Indicator */}
                        <div className={`absolute top-4 right-4 size-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                          }`}>
                          {selectedPlan === plan.id && <Check className="size-3" />}
                        </div>

                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary hover:bg-primary shadow-sm">Most Popular</Badge>
                          </div>
                        )}

                        <div className="p-5">
                          <h4 className={`font-bold text-lg ${selectedPlan === plan.id ? "text-primary" : ""}`}>{plan.name}</h4>
                          <div className="mt-2 mb-4">
                            <span className="text-3xl font-bold">
                              {formatPrice(plan.price, plan.currency)}
                            </span>
                            {plan.price > 0 && (
                              <span className="text-muted-foreground text-sm font-medium">/{plan.interval}</span>
                            )}
                          </div>

                          <ul className="space-y-3">
                            {plan.features.slice(0, 4).map((feature, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Check className={`size-4 shrink-0 mt-0.5 ${selectedPlan === plan.id ? "text-primary" : "text-muted-foreground"}`} />
                                <span className={selectedPlan === plan.id ? "text-foreground" : ""}>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <div className="size-2 rounded-full bg-red-500" />
                    {error}
                  </div>
                )}

                <div className="pt-6">
                  <Button type="submit" className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin size-5 border-2 border-white/30 border-t-white rounded-full" />
                        Processing...
                      </div>
                    ) : selectedPlan === "FREE_TRIAL" ? "Start Free 14-Day Trial" : "Continue to Payment"}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground mt-4">
                    By continuing, you agree to our <span className="underline cursor-pointer hover:text-foreground">Terms of Service</span> and <span className="underline cursor-pointer hover:text-foreground">Privacy Policy</span>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="py-8 border-t bg-background text-center text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2025 Campzeo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
