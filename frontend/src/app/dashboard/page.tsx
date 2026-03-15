"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Video as VideoIcon, Clock as ClockIcon, Sparkles as SparklesIcon, Trash2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lectures, setLectures] = useState<any[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(true);

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

      // 📚 FETCH LIBRARY
      const { data: lecturesData } = await supabase
        .from("lectures")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setLectures(lecturesData || []);
      setLoadingLectures(false);
    }

    loadUser();
  }, []);

  const removeLecture = async (id: string, video_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to remove this lecture from your library? This will also remove any associated bookmarks."
      )
    )
      return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // 1. Delete from lectures
    const { error: lectureError } = await supabase
      .from("lectures")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (lectureError) {
      console.error("Error deleting lecture:", lectureError);
      alert("Failed to delete lecture.");
      return;
    }

    // 2. Delete associated bookmarks
    await supabase
      .from("bookmarks")
      .delete()
      .eq("video_id", video_id)
      .eq("user_id", session.user.id);

    // 3. Update local state
    setLectures((prev) => prev.filter((l) => l.id !== id));
  };

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
            Welcome back{name ? `, ${name} ` : " "}✨
          </h1>
          <p className="text-foreground-muted mt-2">Ready to learn today?</p>

        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-6 mb-14">
          <StatCard icon={<VideoIcon />} title="Videos processed" value={lectures.length.toString()} />
          <StatCard icon={<ClockIcon />} title="Time Saved" value={formatTimeSaved(lectures)} />
        </div>

        {/* 🚀 HERO CTA */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-[40px] p-12 shadow-2xl max-w-4xl text-white mb-16"
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
              className="group relative px-10 py-5 rounded-2xl font-semibold text-lg bg-white/10 backdrop-blur-xl border border-white/30 text-white hover:bg-white hover:text-black transition-all duration-300 flex items-center gap-4 shadow-2xl"
            >

              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition" />

              <span className="relative">Generate Notes Now</span>

              <div className="relative w-9 h-9 rounded-full bg-white text-black flex items-center justify-center group-hover:translate-x-1 transition">
                →
              </div>
            </button>
          </div>
        </motion.div>

        {/* 📚 LIBRARY */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Your Library</h2>
          </div>

          {loadingLectures ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-card animate-pulse rounded-3xl border border-border" />
              ))}
            </div>
          ) : lectures.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lectures.map((lecture) => (
                <motion.div
                  key={lecture.id}
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    router.push(`/notes?v=${lecture.video_id}`);
                  }}
                  className="bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-6 shadow-lg group cursor-pointer relative"
                >
                  <div className="aspect-video rounded-2xl bg-muted mb-4 overflow-hidden relative">
                    <img
                      src={`https://img.youtube.com/vi/${lecture.video_id}/maxresdefault.jpg`}
                      alt={lecture.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="p-3 bg-white rounded-full text-purple-600 shadow-xl">
                        <VideoIcon size={24} />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg line-clamp-2 mb-2 text-foreground">{lecture.title}</h3>
                  <div className="flex justify-between items-center text-sm text-foreground-muted">
                    <span>{new Date(lecture.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => removeLecture(lecture.id, lecture.video_id, e)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-foreground-muted hover:text-red-500 transition-colors"
                      title="Remove from library"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

function formatTimeSaved(lectures: any[]) {
  const totalSeconds = lectures.reduce((acc, lecture) => {
    // Check multiple paths for duration
    const duration =
      lecture.metadata?.duration ||
      lecture.notes_data?.metadata?.duration ||
      0;
    return acc + Number(duration);
  }, 0);

  const totalMinutes = Math.floor(totalSeconds / 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
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
