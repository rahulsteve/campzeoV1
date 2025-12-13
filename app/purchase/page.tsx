"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Star, ArrowRight, Sparkles, Check } from "lucide-react";
import { useSignUp, useSignIn, useClerk } from "@clerk/nextjs";
import { usePlans } from "@/hooks/use-plans";
import { formatPrice } from "@/lib/plans";
import { RazorpayButton } from "@/components/razorpay-button";

function PurchaseContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isLoaded, signUp, setActive } = useSignUp();
    // We use useSignIn to check if user already exists
    const { signIn } = useSignIn();
    const { plans, isLoading: plansLoading } = usePlans();
    const clerk = useClerk();

    const [step, setStep] = useState<"DETAILS" | "VERIFICATION" | "PAYMENT" | "SUCCESS">("DETAILS");
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [otp, setOtp] = useState("");
    const [invoice, setInvoice] = useState<any>(null);

    // Data for Organization Creation
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "", // Owner Name
        organisationName: "",
        mobile: "",
        address: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        taxNumber: "",
    });

    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

    useEffect(() => {
        if (plans.length > 0 && !selectedPlanId) {
            const planIdParam = searchParams.get("planId");
            if (planIdParam) {
                // Try to find by ID first (assuming ID matches, or name matches?)
                // The plan hook returns numerical IDs mostly, but params might be strings?
                // Let's assume passed planId is the numerical ID or name?
                // Actually typical flow might be passing the ID.
                const found = plans.find(p => p.id.toString() === planIdParam || p.name === planIdParam);
                if (found) setSelectedPlanId(found.id);
            } else {
                // Default to a paid plan if available, or first one
                const professional = plans.find(p => p.name === "Professional");
                if (professional) setSelectedPlanId(professional.id);
            }
        }
    }, [plans, searchParams, selectedPlanId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    // Handle Initial Sign Up
    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        // Basic Validation
        if (!formData.email || !formData.password || !formData.organisationName || !formData.name) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setLoading(true);

        try {
            // Split name
            const nameParts = formData.name.trim().split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

            let signUpAttempt = signUp;

            // Check if we are resuming an existing signup flow
            if (signUp.status === "missing_requirements" && signUp.emailAddress === formData.email) {
                signUpAttempt = signUp;
                // Check verification status
                if (signUpAttempt.verifications?.emailAddress?.status === "verified") {
                    // Already verified, try to complete
                    const completeSignUp = await signUpAttempt.update({ firstName, lastName });
                    if (completeSignUp.status === "complete") {
                        await setActive({ session: completeSignUp.createdSessionId });
                        setStep("PAYMENT");
                        setLoading(false);
                        return;
                    }
                    signUpAttempt = completeSignUp;
                }
            } else {
                // Start fresh signup
                signUpAttempt = await signUp.create({
                    emailAddress: formData.email,
                    password: formData.password,
                    firstName,
                    lastName,
                });
            }

            // Prepare email verification if not already verified
            if (signUpAttempt.verifications?.emailAddress?.status !== "verified") {
                await signUpAttempt.prepareEmailAddressVerification({ strategy: "email_code" });
                toast.success("Verification code sent to your email.");
                setStep("VERIFICATION");
            } else {
                // If already verified but session not active
                const completeSignUp = await signUpAttempt.update({ firstName, lastName });
                if (completeSignUp.status === "complete") {
                    await setActive({ session: completeSignUp.createdSessionId });
                    setStep("PAYMENT");
                } else {
                    setStep("VERIFICATION");
                }
            }
        } catch (err: any) {
            console.error("Sign up error:", err);
            if (err.errors?.[0]?.code === "form_identifier_exists") {
                toast.error("An account with this email already exists. Please sign in.");
            } else if (err.errors?.[0]?.message) {
                toast.error(err.errors[0].message);
            } else {
                toast.error("Failed to create account. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle Verification
    const handleVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setVerifying(true);

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code: otp,
            });

            if (completeSignUp.status !== "complete") {
                console.log(JSON.stringify(completeSignUp, null, 2));
                toast.error("Verification invalid.");
            } else {
                if (completeSignUp.createdSessionId) {
                    await setActive({ session: completeSignUp.createdSessionId });
                    toast.success("Account verified!");
                    // Move to Payment step
                    setStep("PAYMENT");
                }
            }
        } catch (err: any) {
            console.error("Verification error:", err);

            // Handle "already verified" error gracefully
            if (err.errors?.[0]?.code === "verification_already_verified") {
                // It's already verified, check if we can complete
                if (signUp.status === "complete" && signUp.createdSessionId) {
                    await setActive({ session: signUp.createdSessionId });
                    setStep("PAYMENT");
                    return;
                }
            }

            toast.error(err.errors?.[0]?.message || "Verification failed");
        } finally {
            setVerifying(false);
        }
    };

    // Handle Organisation Creation (After Payment or for Free Trial)
    const createOrganisation = async (paymentData?: any) => {
        try {
            // We need to re-fetch plan details
            const selectedPlan = plans.find(p => p.id === selectedPlanId);

            const response = await fetch("/api/organisations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationName: formData.organisationName,
                    email: formData.email,
                    phone: formData.mobile,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    country: formData.country,
                    postalCode: formData.postalCode,
                    taxNumber: formData.taxNumber,
                    plan: selectedPlan?.name || "FREE_TRIAL",
                    planId: selectedPlanId,
                    paymentData
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create organisation");
            }

            if (data.invoice) {
                setInvoice(data.invoice);
            }

            toast.success("Account created successfully!");
            setStep("SUCCESS");

        } catch (err: any) {
            console.error("Org creation error:", err);
            toast.error(err.message || "Failed to setup organisation.");
        }
    };

    // Skip payment for free trial or 0 price
    useEffect(() => {
        if (step === "PAYMENT" && plans.length > 0 && selectedPlanId) {
            const plan = plans.find(p => p.id === selectedPlanId);
            if (plan && plan.price === 0) {
                // Auto create for free plan
                createOrganisation();
            }
        }
    }, [step, plans, selectedPlanId]);


    const selectedPlan = plans.find(p => p.id === selectedPlanId);

    return (
        <div className="min-h-screen w-full flex bg-background">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-neutral-900 border-r border-neutral-800 flex-col justify-between p-12 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800 via-neutral-900 to-neutral-950 -z-10" />
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-2 mb-8">
                        <div className="bg-white p-1 rounded">
                            <img src="/logo-1.png" alt="CampZeo" className="h-8" />
                        </div>
                    </Link>

                    <div className="space-y-6 max-w-lg mt-20">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.1]">
                            Start your journey <br />
                            <span className="text-primary">with Campzeo.</span>
                        </h1>
                        <p className="text-lg text-neutral-400 leading-relaxed">
                            Professional tools for social media management, analytics, and growth.
                        </p>
                        {selectedPlan && (
                            <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                                <h3 className="text-xl font-semibold text-white mb-2">Selected Plan: {selectedPlan.name}</h3>
                                <div className="text-3xl font-bold text-primary mb-4">{formatPrice(selectedPlan.price, "INR")}<span className="text-sm text-neutral-400 font-normal">/{selectedPlan.billingCycle || 'month'}</span></div>
                                <ul className="space-y-2">
                                    {selectedPlan.features.slice(0, 4).map((f, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-neutral-300">
                                            <CheckCircle2 className="size-4 text-primary shrink-0" /> {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto w-full">
                <div className="w-full max-w-xl space-y-8">

                    {/* Header */}
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">
                            {step === "DETAILS" && "Create your account"}
                            {step === "VERIFICATION" && "Verify your email"}
                            {step === "PAYMENT" && "Complete Payment"}
                            {step === "SUCCESS" && "Welcome to CampZeo!"}
                        </h2>
                        <p className="text-muted-foreground">
                            {step === "DETAILS" && "Enter your details to get started."}
                            {step === "VERIFICATION" && `We sent a code to ${formData.email}`}
                            {step === "PAYMENT" && "Securely complete your purchase."}
                            {step === "SUCCESS" && "Your account has been set up successfully."}
                        </p>
                    </div>

                    {step === "DETAILS" && (
                        <form onSubmit={handleSignUp} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="organisationName">Organisation Name <span className="text-destructive">*</span></Label>
                                    <Input id="organisationName" name="organisationName" required value={formData.organisationName} onChange={handleChange} placeholder="Acme Inc." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Owner Name <span className="text-destructive">*</span></Label>
                                    <Input id="name" name="name" required value={formData.name} onChange={handleChange} placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                                    <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mobile">Mobile <span className="text-destructive">*</span></Label>
                                    <Input id="mobile" name="mobile" required value={formData.mobile} onChange={handleChange} placeholder="+1 234 567 8900" />
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                                    <Input id="address" name="address" required value={formData.address} onChange={handleChange} />
                                </div>

                                <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input id="city" name="city" required value={formData.city} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input id="state" name="state" required value={formData.state} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Input id="country" name="country" required value={formData.country} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="postalCode">Postal Code</Label>
                                        <Input id="postalCode" name="postalCode" required value={formData.postalCode} onChange={handleChange} />
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label htmlFor="taxNumber">Tax Number / GST (Optional)</Label>
                                    <Input id="taxNumber" name="taxNumber" value={formData.taxNumber} onChange={handleChange} />
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                                    <Input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} />
                                    <p className="text-xs text-muted-foreground">Min 8 chars, 1 uppercase, 1 lowercase, 1 number.</p>
                                </div>
                            </div>

                            <Button type="submit" className="w-full" size="lg" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : "Continue"}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                Already have an account? <Link href="/sign-in" className="underline">Sign In</Link>
                            </p>
                        </form>
                    )}

                    {step === "VERIFICATION" && (
                        <form onSubmit={handleVerification} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="otp">Verification Code</Label>
                                <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" className="text-center text-2xl tracking-widest letter-spacing-2" maxLength={6} />
                            </div>
                            <Button type="submit" className="w-full" size="lg" disabled={verifying}>
                                {verifying ? <Loader2 className="animate-spin" /> : "Verify Account"}
                            </Button>
                        </form>
                    )}

                    {step === "PAYMENT" && selectedPlan && selectedPlan.price > 0 && (
                        <div className="space-y-6">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-semibold">Plan Amount</span>
                                        <span className="text-xl font-bold">{formatPrice(selectedPlan.price, "INR")}</span>
                                    </div>
                                    <div className="text-sm text-neutral-500 mb-6">
                                        You are purchasing the <strong>{selectedPlan.name}</strong> plan for <strong>{formData.organisationName}</strong>.
                                    </div>

                                    <RazorpayButton
                                        plan={selectedPlan.name}
                                        amount={selectedPlan.price}
                                        organizationName={formData.organisationName}
                                        isSignup={true} // Important to redirect correctly or handle flow
                                        onSuccess={createOrganisation}
                                        className="w-full h-12 text-lg"
                                    >
                                        Pay Securely with Razorpay
                                    </RazorpayButton>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {step === "PAYMENT" && (!selectedPlan || selectedPlan.price === 0) && (
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="size-10 animate-spin text-primary" />
                            <p>Setting up your free account...</p>
                        </div>
                    )}

                    {step === "SUCCESS" && (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center text-center space-y-4 p-8 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800">
                                <div className="h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-xl font-semibold">Payment Successful!</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Your organisation <strong>{formData.organisationName}</strong> has been successfully created.
                                </p>
                            </div>

                            {invoice && (
                                <Card className="print:block border-primary/20">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-semibold text-lg">Invoice Details</h4>
                                                <p className="text-sm text-muted-foreground">{invoice.invoiceNumber}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Date</p>
                                                <p className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Plan</span>
                                                <span>{invoice.description}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                                                <span>Total Paid</span>
                                                <span>{formatPrice(invoice.amount, invoice.currency)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="flex flex-col md:flex-row gap-4 print:hidden">
                                <Button className="flex-1" size="lg" onClick={() => router.push('/organisation')}>
                                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                {invoice && (
                                    <Button variant="outline" className="flex-1" size="lg" onClick={() => window.print()}>
                                        Download / Print Invoice
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default function PurchasePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <PurchaseContent />
        </Suspense>
    )
}
