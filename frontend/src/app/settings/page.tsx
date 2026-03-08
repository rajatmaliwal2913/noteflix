"use client";

import Sidebar from "@/components/Sidebar";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Laptop, Palette } from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    const themes = [
        { id: "light", label: "Light", icon: <Sun size={20} /> },
        { id: "dark", label: "Dark", icon: <Moon size={20} /> },
        { id: "system", label: "System", icon: <Monitor size={20} /> },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden transition-colors duration-300">
            <Sidebar />

            <div className="flex-1 px-14 py-12 relative z-10 transition-all duration-300 overflow-y-auto">
                <div className="mb-10 text-foreground">
                    <h1 className="text-5xl font-bold flex items-center gap-4">
                        Settings <Palette className="text-purple-600" size={40} />
                    </h1>
                    <p className="text-foreground-muted mt-2">Personalize your Noteflix experience</p>
                </div>


                <div className="max-w-2xl space-y-8">
                    {/* Appearance Section */}
                    <section className="bg-card backdrop-blur-xl border border-border rounded-[32px] p-8 shadow-lg">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            Appearance
                        </h2>

                        <div className="space-y-4">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Choose a theme</p>
                            <div className="grid grid-cols-3 gap-4">
                                {themes.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${theme === t.id
                                            ? "border-purple-600 bg-purple-500/10 text-purple-600 shadow-md"
                                            : "border-border bg-card hover:border-purple-300"
                                            }`}
                                    >
                                        {t.icon}
                                        <span className="font-semibold">{t.label}</span>
                                    </button>

                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Profile Section (Mock for now) */}
                    <section className="bg-card backdrop-blur-xl border border-border rounded-[32px] p-8 shadow-lg opacity-60">
                        <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-foreground-muted">Email Address</label>
                                <input
                                    type="email"
                                    disabled
                                    value="user@example.com"
                                    className="px-4 py-3 rounded-xl border border-border bg-muted text-foreground-muted"
                                />
                            </div>
                            <p className="text-xs text-foreground-muted italic">Profile editing is coming soon!</p>

                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
