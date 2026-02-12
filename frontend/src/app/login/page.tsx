"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2, Sparkles, Zap } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  }

  const floatingShapes = [
    { width: 300, height: 300, color: "bg-purple-200", delay: 0, x: "-10%", y: "-10%" },
    { width: 400, height: 400, color: "bg-blue-200", delay: 2, x: "80%", y: "20%" },
    { width: 250, height: 250, color: "bg-pink-200", delay: 4, x: "20%", y: "80%" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-[#FDFDFD] text-gray-900 overflow-hidden relative">

      {/* Background animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8),rgba(248,250,252,0.5))]" />

        {floatingShapes.map((shape, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.4, scale: 0.8 }}
            animate={{ y: [0, 40, 0], x: [0, 20, 0], rotate: [0, 20, -20, 0] }}
            transition={{ duration: 15 + i * 2, repeat: Infinity, ease: "easeInOut", delay: shape.delay }}
            className={`absolute rounded-full blur-[80px] mix-blend-multiply ${shape.color}`}
            style={{ width: shape.width, height: shape.height, left: shape.x, top: shape.y }}
          />
        ))}
      </div>

      <div className="w-full max-w-7xl mx-auto flex items-center justify-center p-6 relative z-10">
        <div className="w-full grid lg:grid-cols-2 gap-16 items-center">

          {/* LEFT HERO */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex flex-col space-y-8"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                Noteflix
              </span>
            </div>

            <h1 className="text-6xl font-extrabold text-gray-900 leading-tight">
              Learn smarter,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600">
                not harder.
              </span>
            </h1>

            <p className="text-xl text-gray-600 max-w-lg">
              Turn YouTube lectures into structured knowledge using AI.
            </p>

            <div className="flex gap-4">
              {["AI Notes", "Smart Quizzes", "Chat with Lectures"].map((f) => (
                <div key={f} className="bg-white px-5 py-3 rounded-full shadow text-sm font-semibold flex gap-2">
                  <Zap className="w-4 h-4 text-purple-500" /> {f}
                </div>
              ))}
            </div>
          </motion.div>

          {/* LOGIN CARD */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-10">

              <h2 className="text-3xl font-bold mb-6">Welcome Back</h2>

              <form onSubmit={handleLogin} className="space-y-6">

                <div className="relative">
                  <Mail className="absolute left-4 top-4 text-gray-400" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-4 text-gray-400" />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <button
                  disabled={isLoading}
                  className="w-full py-4 bg-black text-white rounded-xl font-bold flex justify-center items-center"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "Sign In"}
                </button>
              </form>

              <p className="mt-6 text-center text-gray-500">
                New here? <a href="/signup" className="text-purple-600 font-semibold">Create account</a>
              </p>

            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
