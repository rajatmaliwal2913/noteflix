"use client";

import AuthLayout from "@/components/auth/AuthLayout";
import { Mail, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function login() {
    localStorage.setItem("noteflix_user", email);
    router.push("/dashboard");
  }

  return (
    <AuthLayout>
      <div>
        {/* top right signup */}
        <div className="absolute top-8 right-10 text-sm">
          <span className="text-gray-500 hover:text-gray-700 cursor-pointer">
            Sign Up
          </span>
        </div>

        {/* Title */}
        <h2 className="text-5xl font-semibold mb-14 text-gray-800">
          Welcome Back
        </h2>

        {/* EMAIL */}
        <div className="flex items-center gap-4 bg-gray-100 rounded-full px-6 py-5 mb-5 shadow-inner">
          <Mail size={20} className="text-gray-400" />
          <input
            placeholder="Email"
            className="bg-transparent outline-none w-full text-gray-700 placeholder-gray-400"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* PASSWORD */}
        <div className="flex items-center gap-4 bg-gray-100 rounded-full px-6 py-5 mb-4 shadow-inner">
          <Lock size={20} className="text-gray-400" />
          <input
            type="password"
            placeholder="Password"
            className="bg-transparent outline-none w-full text-gray-700 placeholder-gray-400"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <p className="text-orange-500 text-sm mb-10 ml-2 cursor-pointer hover:opacity-80">
          Forgot password?
        </p>

        {/* LOGIN BUTTON */}
        <button
          onClick={login}
          className="
            w-full py-5 rounded-full text-white font-semibold text-xl mt-2
            bg-gradient-to-r from-orange-500 via-pink-500 to-orange-400
            shadow-lg hover:scale-[1.02] hover:shadow-xl transition duration-200
          "
        >
          Login
        </button>

        <p className="text-center text-gray-500 mt-10">
          Don’t have an account?
          <span className="text-orange-500 ml-1 cursor-pointer hover:underline">
            Sign up
          </span>
        </p>
      </div>
    </AuthLayout>
  );
}
