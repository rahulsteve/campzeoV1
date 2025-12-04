"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { SignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function Page() {
  const { client } = useClerk();

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
    setLoading(true);

    try {
      debugger;
      const signUp = await client.signUp.create({
        emailAddress: form.email,
        password: form.password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      const response = await fetch("/api/enquiries", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to submit enquiry");
      }

      toast.success("Success!", {
        description: "Your account has been created and enquiry submitted. Please check your email for verification.",
      });

      // Reset form after successful submission
      setForm({
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
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Submission Failed", {
        description: error instanceof Error ? error.message : "An error occurred during submission. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 gap-8">
      {/* <SignUp /> */}

      <div className="w-full max-w-2xl">
        <Card className="shadow-lg border-0 sm:border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Start your Free Trial</CardTitle>
            <CardDescription className="text-center">
              Create an account and tell us about your requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organisationName">Business Name</Label>
                <Input
                  id="organisationName"
                  name="organisationName"
                  placeholder="Acme Corp"
                  value={form.organisationName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  placeholder="+1 (555) 000-0000"
                  value={form.mobile}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="123 Main St"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="New York"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="NY"
                  value={form.state}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  placeholder="United States"
                  value={form.country}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  placeholder="10001"
                  value={form.postalCode}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="taxNumber">GST / Tax Number</Label>
                <Input
                  id="taxNumber"
                  name="taxNumber"
                  placeholder="Optional"
                  value={form.taxNumber}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="enquiryText">Enquiry</Label>
                <Textarea
                  id="enquiryText"
                  name="enquiryText"
                  placeholder="Tell us about your requirements..."
                  className="min-h-[100px]"
                  value={form.enquiryText}
                  onChange={handleChange}
                />
              </div>

              <Button
                type="submit"
                className="w-full md:col-span-2 mt-2"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Create Account & Submit Enquiry"}
              </Button>
              <div id="clerk-captcha" />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
