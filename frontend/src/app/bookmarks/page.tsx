"use client";

import Sidebar from "@/components/Sidebar";
import { Star, ExternalLink, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function BookmarksPage() {
    const router = useRouter();
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBookmarks() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from("bookmarks")
                .select("*")
                .eq("user_id", session.user.id)
                .order("created_at", { ascending: false });

            if (!error) setBookmarks(data || []);
            setLoading(false);
        }
        fetchBookmarks();
    }, []);

    const removeBookmark = async (id: string) => {
        const { error } = await supabase
            .from("bookmarks")
            .delete()
            .eq("id", id);

        if (!error) {
            setBookmarks(prev => prev.filter(b => b.id !== id));
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden">

            <Sidebar />

            <div className="flex-1 px-14 py-12 relative z-10 transition-all duration-300 overflow-y-auto">
                <div className="mb-10 text-foreground">
                    <h1 className="text-5xl font-bold flex items-center gap-4">
                        Bookmarks <Star className="text-yellow-400 fill-yellow-400" size={40} />
                    </h1>
                    <p className="text-foreground-muted mt-2">Your saved lectures and insights</p>
                </div>


                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-card animate-pulse rounded-3xl border border-border" />
                        ))}
                    </div>

                ) : bookmarks.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-20 text-center shadow-lg max-w-2xl"
                    >
                        <div className="text-5xl mb-4">⭐</div>
                        <h3 className="text-xl font-semibold mb-2 text-foreground">No bookmarks yet</h3>
                        <p className="text-foreground-muted">
                            Click the star icon on any notes page to save your favorite lectures here.
                        </p>
                    </motion.div>

                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bookmarks.map((bookmark) => (
                            <motion.div
                                key={bookmark.id}
                                whileHover={{ y: -5 }}
                                className="bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-6 shadow-lg group relative"
                            >
                                <div className="aspect-video rounded-2xl bg-muted mb-4 overflow-hidden relative">

                                    <img
                                        src={`https://img.youtube.com/vi/${bookmark.video_id}/maxresdefault.jpg`}
                                        alt={bookmark.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/notes?v=${bookmark.video_id}`);
                                            }}
                                            className="p-3 bg-white rounded-full text-purple-600 shadow-xl cursor-pointer"
                                        >
                                            <ExternalLink size={24} />
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg line-clamp-2 mb-2 text-foreground">{bookmark.title}</h3>
                                <div className="flex justify-between items-center text-sm text-foreground-muted">
                                    <span>{new Date(bookmark.created_at).toLocaleDateString()}</span>
                                    <button
                                        onClick={() => removeBookmark(bookmark.id)}
                                        className="text-foreground-muted hover:text-red-500 transition-colors"
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
    );
}
