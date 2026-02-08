"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { processVideo } from "@/lib/api";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    const data = await processVideo(url);

    localStorage.setItem("noteflix_data", JSON.stringify(data));
    router.push("/notes");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-bold">NoteFlix 🎓</h1>
      <p className="text-gray-500">Turn any lecture into beautiful notes</p>

      <input
        className="border p-3 rounded w-[500px]"
        placeholder="Paste YouTube URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        className="bg-black text-white px-6 py-3 rounded"
      >
        {loading ? "Processing..." : "Generate Notes"}
      </button>
    </main>
  );
}
