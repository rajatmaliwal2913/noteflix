"use client";

import Sidebar from "@/components/Sidebar";
import { MessageSquare, Send, Sparkles, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { API_URL } from "@/lib/api";

export default function AIChatPage() {
    const [messages, setMessages] = useState<Array<{ role: "user" | "assistant", content: string }>>([
        { role: "assistant", content: "Hello! I'm your global Noteflix assistant. You can ask me questions about any of your processed lectures!" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: userMsg,
                    transcript: null
                }),
            });

            if (!response.ok) throw new Error("Chat failed");
            const result = await response.json();
            setMessages(prev => [...prev, { role: "assistant", content: result.answer }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't reach the knowledge base. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex overflow-hidden text-foreground">

            <Sidebar />

            <div className="flex-1 flex flex-col relative z-10 px-6 py-8 h-screen">
                <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col bg-card/80 backdrop-blur-xl rounded-3xl border border-border shadow-xl overflow-hidden">

                    { }
                    <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-purple-500/5 to-blue-500/5">

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center shadow-sm border border-border">
                                <MessageSquare className="text-purple-600" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">Global AI Chat</h1>
                                <p className="text-sm text-foreground-muted">Ask anything across all your lectures</p>
                            </div>

                        </div>
                        <Sparkles className="text-purple-400" size={24} />
                    </div>

                    { }
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-sm ${msg.role === "user"
                                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                                        : "bg-muted text-foreground"
                                        }`}

                                >
                                    <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </motion.div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl px-6 py-4">
                                    <Loader2 className="animate-spin text-purple-600" size={20} />
                                </div>
                            </div>
                        )}

                        <div ref={scrollRef} />
                    </div>

                    { }
                    <form onSubmit={handleSubmit} className="p-6 bg-card border-t border-border">
                        <div className="flex gap-4">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="How does photosynthesis work? (Asking all lectures...)"
                                className="flex-1 px-6 py-4 rounded-2xl border border-border focus:ring-2 focus:ring-purple-500 outline-none text-foreground bg-background"
                            />

                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                <Send size={20} />
                                <span>Send</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
