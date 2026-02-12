"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube, Loader2, Sparkles, Film, Wand2, ArrowRight
} from "lucide-react";

export default function ProcessPage() {
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [step, setStep] = useState<"input" | "preview" | "processing">("input");
  const [progress, setProgress] = useState(0);

  /* Extract YouTube ID */
  function getVideoId(link: string) {
    const reg =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/;
    const match = link.match(reg);
    return match ? match[1] : "";
  }

  /* STEP 1 → Preview */
  function handlePreview() {
    const id = getVideoId(url);
    if (!id) {
      alert("Please paste a valid YouTube URL");
      return;
    }
    setVideoId(id);
    setStep("preview");
  }

  /* STEP 2 → Fake processing (later connect API) */
  async function generateNotes() {
    setStep("processing");
    setProgress(0);

    const steps = [15, 35, 55, 75, 90, 100];
    for (let s of steps) {
      await new Promise(r => setTimeout(r, 900));
      setProgress(s);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-10 relative overflow-hidden">

      {/* 🌈 background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[700px] h-[700px] bg-purple-400/30 blur-[160px] rounded-full -top-60 -left-40"/>
        <div className="absolute w-[600px] h-[600px] bg-blue-400/30 blur-[160px] rounded-full bottom-0 right-0"/>
      </div>

      <AnimatePresence mode="wait">

        {/* ================= STEP 1 ================= */}
        {step === "input" && (
          <motion.div
            key="input"
            initial={{opacity:0, y:40}}
            animate={{opacity:1, y:0}}
            exit={{opacity:0, y:-40}}
            className="bg-white/80 backdrop-blur-2xl p-14 rounded-[40px] shadow-2xl w-[720px] text-center border border-white/40"
          >
            <Sparkles className="mx-auto mb-6 text-purple-600" size={42}/>

            <h1 className="text-5xl font-bold mb-4 text-gray-900">
              Generate Lecture Notes
            </h1>

            <p className="text-gray-500 mb-10 text-lg">
              Paste a YouTube lecture and let AI turn it into structured notes.
            </p>

            <div className="flex gap-4">
              <input
                value={url}
                onChange={(e)=>setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 px-6 py-5 text-lg rounded-2xl 
                bg-white text-gray-900 placeholder:text-gray-400
                border border-gray-200 outline-none
                focus:ring-2 focus:ring-purple-500"
              />

              <button
                onClick={handlePreview}
                className="group px-8 rounded-2xl bg-black text-white font-semibold flex items-center gap-3 hover:bg-gray-900 transition"
              >
                <Youtube size={20}/>
                Preview
                <ArrowRight className="group-hover:translate-x-1 transition"/>
              </button>
            </div>
          </motion.div>
        )}

        {/* ================= STEP 2 ================= */}
        {step === "preview" && (
          <motion.div
            key="preview"
            initial={{opacity:0, scale:0.95}}
            animate={{opacity:1, scale:1}}
            exit={{opacity:0}}
            className="bg-white/80 backdrop-blur-2xl p-10 rounded-[40px] shadow-2xl w-[1000px] border border-white/40"
          >
            <h2 className="text-3xl font-bold mb-6 flex gap-2 items-center text-gray-900">
              <Film/> Video Preview
            </h2>

            {/* 🎬 Embedded YouTube Player */}
            <div className="aspect-video rounded-3xl overflow-hidden shadow-xl mb-10">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                allowFullScreen
              />
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-6 mb-10">
              <Select title="Notes Style" options={["Concise","Detailed"]}/>
              <Select title="Format" options={["Bullet Points","Paragraphs"]}/>
            </div>

            <button
              onClick={generateNotes}
              className="group w-full py-5 rounded-2xl 
              bg-gradient-to-r from-purple-600 to-blue-600 
              text-white font-semibold text-lg flex justify-center gap-3 shadow-xl"
            >
              <Wand2/>
              Generate Notes
              <ArrowRight className="group-hover:translate-x-1 transition"/>
            </button>
          </motion.div>
        )}

        {/* ================= STEP 3 ================= */}
        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{opacity:0, scale:0.9}}
            animate={{opacity:1, scale:1}}
            className="bg-white/80 backdrop-blur-2xl p-14 rounded-[40px] shadow-2xl w-[720px] text-center border border-white/40"
          >
            <Loader2 className="animate-spin mx-auto mb-6 text-purple-600" size={44}/>

            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              AI is generating your notes…
            </h2>

            <div className="w-full bg-gray-200 h-4 rounded-full mt-10 overflow-hidden">
              <motion.div
                className="h-4 bg-gradient-to-r from-purple-600 to-blue-600"
                animate={{width:`${progress}%`}}
              />
            </div>

            <p className="mt-4 text-gray-500 font-medium">
              {progress}% complete
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

/* reusable select */
function Select({title, options}:{title:string, options:string[]}) {
  return (
    <div>
      <label className="font-semibold text-gray-700">{title}</label>
      <select
        className="w-full mt-2 p-4 rounded-xl 
        bg-white text-gray-900 border border-gray-200
        outline-none focus:ring-2 focus:ring-purple-500"
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
