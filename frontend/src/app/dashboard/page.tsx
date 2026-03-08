"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Video as VideoIcon, Clock as ClockIcon, Sparkles as SparklesIcon } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");

      const user = session.user;

      let { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) {
        const fallback = user.user_metadata?.name || "User";
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          name: fallback,
        });
        profile = { name: fallback };
      }

      setName(profile.name);
    }

    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">


      {/* 🌈 BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />
        <div className="absolute w-[700px] h-[700px] bg-purple-400/30 blur-[160px] rounded-full -top-60 -left-40" />
        <div className="absolute w-[600px] h-[600px] bg-blue-400/30 blur-[160px] rounded-full bottom-0 right-0" />
      </div>

      {/* 🧭 SIDEBAR */}
      <Sidebar />

      {/* 🧠 MAIN */}
      <div className="flex-1 px-14 py-12 relative z-10 transition-all duration-300 overflow-y-auto">

        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-foreground">
            Welcome back{name && `, ${name}`} ✨
          </h1>
          <p className="text-foreground-muted mt-2">Ready to learn today?</p>

        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-6 mb-14">
          <StatCard icon={<VideoIcon />} title="Videos processed" value="0" />
          <StatCard icon={<ClockIcon />} title="Hours saved" value="0h" />
          <StatCard icon={<SparklesIcon />} title="Notes created" value="0" />
        </div>

        {/* 🚀 HERO CTA */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600
          rounded-[40px] p-12 shadow-2xl max-w-4xl text-white mb-16"
        >
          <div className="absolute w-[500px] h-[500px] bg-white/20 blur-[120px] rounded-full -top-40 -right-40" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-10">
            <div>
              <h2 className="text-4xl font-bold mb-4">
                Turn any YouTube lecture into notes
              </h2>
              <p className="text-white/80 text-lg max-w-xl">
                Generate summaries, flashcards, quizzes and chat with your lecture in seconds.
              </p>
            </div>

            <button
              onClick={() => router.push("/process")}
              className="group relative px-10 py-5 rounded-2xl font-semibold text-lg
                bg-white/10 backdrop-blur-xl border border-white/30 text-white
                hover:bg-white hover:text-black transition-all duration-300
                flex items-center gap-4 shadow-2xl"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition" />

              <span className="relative">Generate Notes Now</span>

              <div className="relative w-9 h-9 rounded-full bg-white text-black flex items-center justify-center
                    group-hover:translate-x-1 transition">
                →
              </div>
            </button>
          </div>
        </motion.div>

        {/* 📚 LIBRARY */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Your Library</h2>

            <button className="text-purple-600 font-semibold hover:underline">
              View all
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-20 text-center shadow-lg"
          >
            <div className="text-5xl mb-4">📺</div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              No lectures yet
            </h3>
            <p className="text-foreground-muted">
              Generate your first YouTube lecture notes to see them here.
            </p>
          </motion.div>

        </div>

      </div>
    </div>
  );
}

/* COMPONENTS */

function StatCard({ icon, title, value }: any) {
  return (
    <motion.div whileHover={{ y: -6, scale: 1.02 }}
      className="bg-card/50 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-border">
      <div className="mb-3 text-purple-600">{icon}</div>
      <p className="text-foreground-muted text-sm">{title}</p>

      <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
        {value}
      </h3>
    </motion.div>
  );
}
