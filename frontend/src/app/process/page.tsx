"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { processVideo } from "@/lib/api";

export default function ProcessingPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const url = localStorage.getItem("yt_url");
      if (!url) return;

      const data = await processVideo(url);
      localStorage.setItem("noteflix_data", JSON.stringify(data));

      router.push("/notes");
    };

    run();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Processing Lecture… ⏳</h1>
      <p>This can take 1–2 minutes</p>

      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black"></div>
    </div>
  );
}
