"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });

    setIsLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account created successfully!");
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">

      <div className="bg-card p-10 rounded-3xl shadow-xl w-[420px] border border-border">

        <h2 className="text-3xl font-bold mb-8 text-foreground">Create Account</h2>

        <form onSubmit={handleSignup} className="space-y-6">

          {}
          <div className="relative">
            <User className="absolute left-4 top-4 text-gray-400" />
            <input
              required
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-xl text-foreground placeholder-foreground-muted outline-none focus:ring-2 focus:ring-purple-500"
            />

          </div>

          {}
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-gray-400" />
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-xl text-foreground placeholder-foreground-muted outline-none focus:ring-2 focus:ring-purple-500"
            />

          </div>

          {}
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-gray-400" />
            <input
              required
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-xl text-foreground placeholder-foreground-muted outline-none focus:ring-2 focus:ring-purple-500"
            />

          </div>

          {}
          <button
            disabled={isLoading}
            className="w-full py-4 bg-foreground text-background rounded-xl font-bold flex justify-center items-center hover:opacity-90 transition"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Create Account"}
          </button>

        </form>

        <p className="mt-6 text-center text-foreground-muted">
          Already have an account?{" "}
          <a href="/login" className="text-purple-600 font-semibold hover:underline">
            Sign in
          </a>
        </p>

      </div>
    </div>
  );
}
