"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Package, Search, ShoppingBag, ArrowRight } from "lucide-react";

export default function GuestAccountView() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, phone }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Failed to create account");
          setLoading(false);
          return;
        }
        // Auto sign-in after registration
        const signInRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (signInRes?.error) {
          setErrorMsg("Account created! Please sign in with your credentials.");
          setMode("signin");
        } else {
          window.location.reload();
        }
      } else {
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (res?.error) {
          setErrorMsg("Invalid email or password.");
        } else {
          window.location.reload();
        }
      }
    } catch {
      setErrorMsg("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <section className="py-12 sm:py-16 border-b border-daxul-black/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <span className="font-mono text-xs text-[#71717A] uppercase tracking-widest block mb-1">
            Customer Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-daxul-black">
            {mode === "signin" ? "Account Sign In" : "Create Customer Account"}
          </h1>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-md mx-auto px-4 sm:px-6 w-full space-y-8">
        <div className="bg-white border border-daxul-black/10 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex border-b border-daxul-black/10 pb-3 gap-6">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
              }}
              className={`text-xs font-bold uppercase tracking-wider pb-1 transition-colors ${
                mode === "signin"
                  ? "text-daxul-black border-b-2 border-daxul-black"
                  : "text-[#71717A] hover:text-daxul-black"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg(null);
              }}
              className={`text-xs font-bold uppercase tracking-wider pb-1 transition-colors ${
                mode === "register"
                  ? "text-daxul-black border-b-2 border-daxul-black"
                  : "text-[#71717A] hover:text-daxul-black"
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 border border-red-200 text-xs p-3 rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#71717A] mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-[#F3F0E9] border border-daxul-black/15 focus:border-daxul-black rounded-lg px-3.5 py-2.5 text-xs text-daxul-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#71717A] mb-1">
                    Mobile Phone (for tracking updates)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#F3F0E9] border border-daxul-black/15 focus:border-daxul-black rounded-lg px-3.5 py-2.5 text-xs text-daxul-black focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#71717A] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#F3F0E9] border border-daxul-black/15 focus:border-daxul-black rounded-lg px-3.5 py-2.5 text-xs text-daxul-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#71717A] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                minLength={8}
                className="w-full bg-[#F3F0E9] border border-daxul-black/15 focus:border-daxul-black rounded-lg px-3.5 py-2.5 text-xs text-daxul-black focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black border border-daxul-black font-bold py-3 rounded-lg text-xs uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span>{loading ? "Processing..." : mode === "signin" ? "Sign In to Portal" : "Create Account"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {mode === "signin" && (
            <p className="text-[11px] text-[#71717A] text-center">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-daxul-black font-bold underline"
              >
                Create one now
              </button>{" "}
              to sync your past orders.
            </p>
          )}
        </div>

        {/* Guest tracking banner */}
        <div className="bg-[#EAE5DA]/60 border border-daxul-black/10 rounded-xl p-5 text-center space-y-3">
          <Package className="w-7 h-7 text-[#71717A] mx-auto" />
          <h3 className="text-xs font-bold uppercase text-daxul-black">Looking for a guest order?</h3>
          <p className="text-[11px] text-[#555550] leading-relaxed">
            You don&apos;t need an account to track your orders. Look up real-time fabrication and delivery with your order number.
          </p>
          <div className="pt-1">
            <Link
              href="/track"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-daxul-black underline"
            >
              <Search className="w-3 h-3" />
              <span>Track Guest Order</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
