"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, Sparkles, Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    localStorage.setItem("noteflix_user", email);
    router.push("/dashboard");
    setIsLoading(false);
  }

  // Floating shapes configuration
  const floatingShapes = [
    { width: 300, height: 300, color: "bg-purple-200", delay: 0, x: "-10%", y: "-10%" },
    { width: 400, height: 400, color: "bg-blue-200", delay: 2, x: "80%", y: "20%" },
    { width: 250, height: 250, color: "bg-pink-200", delay: 4, x: "20%", y: "80%" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-[#FDFDFD] overflow-hidden relative selection:bg-purple-100 selection:text-purple-900">

      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8),rgba(248,250,252,0.5))]" />

        {/* Animated Orbs */}
        {floatingShapes.map((shape, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.4, scale: 0.8 }}
            animate={{
              y: [0, 40, 0],
              x: [0, 20, 0],
              rotate: [0, 20, -20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 15 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: shape.delay,
            }}
            className={`absolute rounded-full blur-[80px] mix-blend-multiply ${shape.color}`}
            style={{
              width: shape.width,
              height: shape.height,
              left: shape.x,
              top: shape.y,
            }}
          />
        ))}

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="w-full max-w-7xl mx-auto flex items-center justify-center p-4 lg:p-8 relative z-10">
        <div className="w-full grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Side - Hero Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="hidden lg:flex flex-col space-y-8 h-full justify-center"
          >
            {/* Branding */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 transform rotate-3 hover:rotate-6 transition-transform">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                Noteflix
              </span>
            </motion.div>

            <div className="space-y-6">
              <h1 className="text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
                Learn smarter, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 animate-gradient-x">
                  not harder.
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                The AI-powered workspace that transforms your video content into
                interactive, structured knowledge. Join thousands of learners today.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-4">
              {['AI Summaries', 'Smart Quizzes', 'Visual Notes'].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="bg-white/60 backdrop-blur-md border border-white/60 px-6 py-3 rounded-full text-sm font-semibold text-gray-700 shadow-sm flex items-center gap-2 hover:bg-white hover:shadow-md transition-all cursor-default"
                >
                  <Zap className="w-4 h-4 text-purple-500" />
                  {feature}
                </motion.div>
              ))}
            </div>

            {/* Testimonial / Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 flex items-center gap-4 bg-white/60 p-4 rounded-2xl backdrop-blur-md border border-white/50 w-fit shadow-sm"
            >
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 border-2 border-white flex items-center justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-gray-500">U{i}</span>
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <p className="font-bold text-gray-900">10k+ Students</p>
                <p className="text-gray-500">Trust Noteflix for their studies</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Side - Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="relative group">
              {/* Card Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />

              <div className="relative bg-white/80 backdrop-blur-xl rounded-[1.75rem] shadow-xl p-8 md:p-12 ring-1 ring-gray-900/5">
                {/* Mobile Logo */}
                <div className="lg:hidden flex justify-center mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-xl flex items-center justify-center transform rotate-3">
                      <Sparkles className="text-white w-5 h-5" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">Noteflix</span>
                  </div>
                </div>

                <div className="mb-10">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
                  <p className="text-gray-500">Please enter your details to sign in.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Email</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400 group-focus-within/input:text-purple-600 transition-colors" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-11 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all outline-none font-medium"
                        placeholder="hello@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-sm font-semibold text-gray-700">Password</label>
                      <a href="#" className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                        Forgot Password?
                      </a>
                    </div>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within/input:text-purple-600 transition-colors" />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-11 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all outline-none font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02, translateY: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center py-4 px-6 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed group/btn"
                  >
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-gray-500 font-medium">
                    New to Noteflix?{" "}
                    <a href="#" className="text-purple-600 font-bold hover:underline decoration-2 underline-offset-4">
                      Create an account
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
