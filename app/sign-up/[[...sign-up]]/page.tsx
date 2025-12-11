"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Zap, Loader2, CheckCircle2, Star, ArrowRight } from "lucide-react";

export default function Page() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    organisationName: "",
    mobile: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    enquiryText: "",
    taxNumber: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation logic remains the same
    const requiredFields = {
      email: "Email",
      password: "Password",
      name: "Owner Name",
      organisationName: "Organisation Name",
      mobile: "Mobile Number",
      address: "Address",
      city: "City",
      state: "State",
      country: "Country",
      postalCode: "Postal Code",
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!form[field as keyof typeof form] || form[field as keyof typeof form].trim() === "") {
        toast.error("Missing Required Field", {
          description: `${label} is required. Please fill in all fields.`,
        });
        return;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Invalid Email", {
        description: "Please enter a valid email address.",
      });
      return;
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(form.password)) {
      toast.error("Weak Password", {
        description: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.",
      });
      return;
    }

    // Mobile validation
    if (form.mobile.length < 10) {
      toast.error("Invalid Mobile Number", {
        description: "Mobile number must be at least 10 digits.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          toast.error("Validation Failed", {
            description: data.errors.join(", "),
          });
        } else {
          toast.error("Submission Failed", {
            description: data.message || "Failed to submit enquiry",
          });
        }
        return;
      }

      toast.success("Success!", {
        description: "Your enquiry has been submitted successfully. Redirecting...",
      });

      setTimeout(() => {
        router.push("/pending-approval");
      }, 1500);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Submission Failed", {
        description: error instanceof Error ? error.message : "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Panel - Branding & Testimonials */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-neutral-900 border-r border-neutral-800 flex-col justify-between p-12 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800 via-neutral-900 to-neutral-950 -z-10" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/50 to-transparent z-0" />

        {/* Content */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="py-2 px-1   rounded-lg">
              <img src="/logo-3.png" alt="CampZeo" style={{ width: 'auto', height: '50px' }} />
            </div>
            <span className="text-3xl font-bold text-red-500">Campzeo</span>
          </Link>

          <div className="space-y-6 max-w-lg mt-20">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.1]">
              Manage your campaigns <br />
              <span className="text-primary">like a pro.</span>
            </h1>
            <p className="text-lg text-neutral-400 leading-relaxed">
              Join thousands of organizations using Campzeo to streamline their social media presence, automate workflows, and drive real engagement.
            </p>

            <div className="flex gap-4 pt-4">
              <div className="flex items-center gap-2 text-white/90 bg-white/5 py-2 px-4 rounded-full border border-white/10 backdrop-blur-sm">
                <CheckCircle2 className="size-4 text-primary" />
                <span className="text-sm font-medium">14-day free trial</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 bg-white/5 py-2 px-4 rounded-full border border-white/10 backdrop-blur-sm">
                <CheckCircle2 className="size-4 text-primary" />
                <span className="text-sm font-medium">No credit card required</span>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 ">
          <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 p-6 rounded-2xl">
            <div className="flex gap-1 mb-4 text-primary">
              <Star className="size-4 fill-primary" />
              <Star className="size-4 fill-primary" />
              <Star className="size-4 fill-primary" />
              <Star className="size-4 fill-primary" />
              <Star className="size-4 fill-primary" />
            </div>
            <p className="text-lg text-neutral-200 leading-relaxed mb-4">
              &quot;Campzeo transformed how we handle our social campaigns. The automation features alone saved us 20 hours a week. It's an absolute game-changer for our marketing team.&quot;
            </p>
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-neutral-700 flex items-center justify-center text-white font-bold">
                JD
              </div>
              <div>
                <p className="font-semibold text-white">Jane Doe</p>
                <p className="text-sm text-neutral-400">Marketing Director, TechFlow</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto w-full">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
            <p className="text-muted-foreground">
              Enter your details below to get started with your free trial.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organisationName">Organisation Name <span className="text-destructive">*</span></Label>
                <Input
                  id="organisationName"
                  name="organisationName"
                  placeholder="Acme Corp"
                  value={form.organisationName}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Owner Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number <span className="text-destructive">*</span></Label>
                <Input
                  id="mobile"
                  name="mobile"
                  placeholder="+1 (555) 000-0000"
                  value={form.mobile}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="123 Main St"
                  value={form.address}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="New York"
                  value={form.city}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="NY"
                  value={form.state}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                <Input
                  id="country"
                  name="country"
                  placeholder="United States"
                  value={form.country}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code <span className="text-destructive">*</span></Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  placeholder="10001"
                  value={form.postalCode}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="taxNumber">GST / Tax Number <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input
                  id="taxNumber"
                  name="taxNumber"
                  placeholder="Tax ID or VAT Number"
                  value={form.taxNumber}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a strong password (min 8 chars)"
                  value={form.password}
                  onChange={handleChange}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number.
                </p>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="enquiryText">Why are you interested in Campzeo? <span className="text-destructive">*</span></Label>
                <Textarea
                  id="enquiryText"
                  name="enquiryText"
                  placeholder="Share a bit about your organization's needs..."
                  className="min-h-[80px] resize-none"
                  value={form.enquiryText}
                  onChange={handleChange}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium shadow-md transition-all hover:shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account & Submit <ArrowRight className="size-4" />
                </span>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              By creating an account, you agree to our <Link href="/terms-of-service" className="underline hover:text-foreground">Terms of Service</Link> and <Link href="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
            </p>
          </form>

          <div className="text-center pt-4">
            <span className="text-sm text-muted-foreground">Already have an account? </span>
            <Link href="/sign-in" className="text-sm font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
