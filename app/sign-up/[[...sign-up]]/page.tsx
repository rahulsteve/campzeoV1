"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Loader2, ArrowRight, Building2, User, MapPin, MessageSquare } from "lucide-react";

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

    // Validation
    const requiredFields = {
      name: "Owner Name",
      email: "Email",
      password: "Password",
      mobile: "Mobile Number",
      organisationName: "Organisation Name",
      address: "Address",
      city: "City",
      state: "State",
      country: "Country",
      postalCode: "Postal Code",
    };

    // Check for missing required fields
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!form[field as keyof typeof form] || form[field as keyof typeof form].trim() === "") {
        toast.error("Missing Required Field", {
          description: `${label} is required.`,
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
        setLoading(false);
        return;
      }

      toast.success("Success!", {
        description: "Your enquiry has been submitted. Redirecting...",
      });

      setTimeout(() => {
        router.push("/pending-approval");
      }, 1500);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Submission Failed", {
        description: "An error occurred during submission. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 pt-24 sm:pt-32 pb-12">
        <div className="w-full max-w-3xl">
          <Card className="shadow-xl border-muted/20">
            <CardHeader className="space-y-2 text-center pb-8 border-b bg-muted/5">
              <CardTitle className="text-3xl font-bold">Start your Free Trial</CardTitle>
              <CardDescription className="text-lg text-muted-foreground max-w-lg mx-auto">
                Create an account to access our comprehensive suite of tools. No credit card required.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={submit} className="space-y-8">

                {/* Account Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-medium border-b pb-2">
                    <User className="size-4" />
                    <h3>Account Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="John Doe"
                        value={form.name}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work Email <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@company.com"
                        value={form.email}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={handleChange}
                        className="bg-background"
                      />
                      <p className="text-xs text-muted-foreground">Min 8 chars, 1 uppercase, 1 lowercase, 1 number.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Phone Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="mobile"
                        name="mobile"
                        placeholder="+1 (555) 000-0000"
                        value={form.mobile}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Organization Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-medium border-b pb-2">
                    <Building2 className="size-4" />
                    <h3>Organization Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="organisationName">Organization Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="organisationName"
                        name="organisationName"
                        placeholder="Acme Inc."
                        value={form.organisationName}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxNumber">Tax ID / GST <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <Input
                        id="taxNumber"
                        name="taxNumber"
                        placeholder="Tax ID"
                        value={form.taxNumber}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-medium border-b pb-2">
                    <MapPin className="size-4" />
                    <h3>Location</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Street Address <span className="text-red-500">*</span></Label>
                      <Input
                        id="address"
                        name="address"
                        placeholder="123 Business Blvd"
                        value={form.address}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                      <Input
                        id="city"
                        name="city"
                        placeholder="New York"
                        value={form.city}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State / Province <span className="text-red-500">*</span></Label>
                      <Input
                        id="state"
                        name="state"
                        placeholder="NY"
                        value={form.state}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                      <Input
                        id="country"
                        name="country"
                        placeholder="United States"
                        value={form.country}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code <span className="text-red-500">*</span></Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        placeholder="10001"
                        value={form.postalCode}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Info Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-medium border-b pb-2">
                    <MessageSquare className="size-4" />
                    <h3>Additional Information</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="enquiryText">Tell us about your needs <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                    <Textarea
                      id="enquiryText"
                      name="enquiryText"
                      placeholder="I'm interested in..."
                      className="min-h-[100px] bg-background"
                      value={form.enquiryText}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full text-lg h-12"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Create Account
                        <ArrowRight className="size-4" />
                      </span>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    By clicking "Create Account", you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
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
