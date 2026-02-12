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

    // 1️⃣ Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      alert(error.message);
      return;
    }

    // 2️⃣ Save profile data (name + email)
    const user = data.user;

    if (user) {
      await supabase.from("profiles").insert({
        id: user.id,
        name: name,
        email: email,
      });
    }

    setIsLoading(false);
    alert("Account created successfully!");
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] text-gray-900">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-[420px]">

        <h2 className="text-3xl font-bold mb-8">Create Account</h2>

        <form onSubmit={handleSignup} className="space-y-6">

          {/* NAME */}
          <div className="relative">
            <User className="absolute left-4 top-4 text-gray-400" />
            <input
              required
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* EMAIL */}
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-gray-400" />
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-gray-400" />
            <input
              required
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* BUTTON */}
          <button
            disabled={isLoading}
            className="w-full py-4 bg-black text-white rounded-xl font-bold flex justify-center items-center hover:bg-gray-900 transition"
          >
            {isLoading ? <Loader2 className="animate-spin"/> : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-purple-600 font-semibold hover:underline">
            Sign in
          </a>
        </p>

      </div>
    </div>
  );
}
