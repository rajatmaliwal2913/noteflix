"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    MessageSquare,
    Star,
    Settings,
    LogOut,
    Menu,
    Sparkles,
    ChevronLeft
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface SidebarProps {
    initialCollapsed?: boolean;
}

export default function Sidebar({ initialCollapsed = false }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(initialCollapsed);

    async function logout() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    const menuItems = [
        { label: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/dashboard" },
        { label: "AI Chat", icon: <MessageSquare size={20} />, href: "/ai-chat" },
        { label: "Bookmarks", icon: <Star size={20} />, href: "/bookmarks" },
        { label: "Settings", icon: <Settings size={20} />, href: "/settings" },
    ];

    return (
        <motion.div
            animate={{ width: collapsed ? 80 : 280 }}
            className="h-[calc(100vh-48px)] m-6 rounded-3xl glass-card shadow-xl p-6 flex flex-col justify-between z-40 sticky top-6"
        >
            <div>
                <div className="flex items-center justify-between mb-12">
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Sparkles className="text-white" size={20} />
                                </div>
                                <span className="font-bold text-xl bg-blue-600 bg-clip-text text-transparent">
                                    Noteflix
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-foreground-muted"
                    >
                        {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                    </button>

                </div>

                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <motion.div
                                    whileHover={{ x: 4 }}
                                    className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group ${isActive
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "text-foreground-muted hover:bg-blue-600 hover:text-white"
                                        } ${collapsed ? "justify-center px-0" : ""}`}

                                >
                                    <div className={`${isActive ? "text-white" : "text-blue-600 group-hover:text-white"}`}>
                                        {item.icon}
                                    </div>
                                    {!collapsed && (
                                        <span className={`font-semibold ${isActive ? "text-white" : ""}`}>
                                            {item.label}
                                        </span>
                                    )}
                                </motion.div>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <button
                onClick={logout}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-foreground-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 ${collapsed ? "justify-center px-0" : ""
                    }`}
            >

                <LogOut size={20} />
                {!collapsed && <span className="font-semibold">Logout</span>}
            </button>
        </motion.div>
    );
}
