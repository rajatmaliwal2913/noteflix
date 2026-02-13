
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube, Loader2, Sparkles, Film, Wand2, ArrowRight, Settings2, CheckSquare, Image, Code
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProcessPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [step, setStep] = useState<"input" | "preview">("input");

  // Preview Data
  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // 🎛️ Options
  const [depth, setDepth] = useState("Standard");
  const [format, setFormat] = useState("Bullet Points");
  const [tone, setTone] = useState("Student");
  const [language, setLanguage] = useState("English");
  const [includeVisuals, setIncludeVisuals] = useState(true);
  const [includeCode, setIncludeCode] = useState(true);

  // 📚 Chapter Selection
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  /* Extract YouTube ID */
  function getVideoId(link: string) {
    const reg = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/;
    const match = link.match(reg);
    return match ? match[1] : "";
  }

  /* STEP 1 → Preview with Backend Call */
  async function handlePreview() {
    const id = getVideoId(url);
    if (!id) return alert("Please paste a valid YouTube URL");

    setVideoId(id);
    setLoadingPreview(true);

    try {
      // Restore backend call for chapters
      const res = await fetch("http://127.0.0.1:8000/preview-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error("Preview failed");
      const data = await res.json();
      setPreview(data);

      // Initialize all chapters selected
      if (data.chapters && data.chapters.length > 0) {
        setSelectedIndices(new Set(data.chapters.map((_: any, i: number) => i)));
      } else {
        setSelectedIndices(new Set());
      }

      setStep("preview");
    } catch (err) {
      alert("Failed to fetch video details");
    } finally {
      setLoadingPreview(false);
    }
  }

  /* STEP 2 → Navigate immediately and stream in background */
  async function generateNotes() {
    // Construct selected_chapters payload
    let selectedChaptersPayload = null;
    if (preview?.chapters && preview.chapters.length > 0) {
      const selectedList = preview.chapters.filter((_: any, i: number) => selectedIndices.has(i));
      if (selectedList.length === 0) return alert("Select at least one chapter");

      selectedChaptersPayload = selectedList.map((ch: any) => ({
        start: ch.start, end: ch.end, title: ch.title
      }));
    }

    // Store initial data for immediate display
    const initialData = {
      metadata: {
        ...preview,
        video_id: videoId,
        title: preview?.title || "Loading...",
        thumbnail: preview?.thumbnail || "",
        duration: preview?.duration || 0,
        author: preview?.author || "Unknown"
      },
      notes: [],
      transcript: [],
      sections: []
    };
    localStorage.setItem("noteflix_data", JSON.stringify(initialData));

    // Navigate immediately to notes page (no processing screen)
    router.push(`/notes`);

    // Start processing in background
    try {
      const response = await fetch("http://127.0.0.1:8000/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          depth, format, tone, language,
          include_visuals: includeVisuals,
          include_code: includeCode,
          selected_chapters: selectedChaptersPayload
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            // Stream metadata/transcript immediately
            if (event.status === "metadata_ready") {
              const currentData = JSON.parse(localStorage.getItem("noteflix_data") || "{}");
              currentData.metadata = event.metadata;
              currentData.transcript = event.transcript;
              localStorage.setItem("noteflix_data", JSON.stringify(currentData));
              window.dispatchEvent(new CustomEvent("metadataReady", { detail: { metadata: event.metadata, transcript: event.transcript } }));
            }

            // Stream individual notes as they're generated (in order)
            if (event.status === "note_ready" && event.note) {
              const currentData = JSON.parse(localStorage.getItem("noteflix_data") || "{}");
              if (!currentData.notes) currentData.notes = [];
              while (currentData.notes.length <= event.index) {
                currentData.notes.push(null);
              }
              currentData.notes[event.index] = event.note;
              localStorage.setItem("noteflix_data", JSON.stringify(currentData));
              window.dispatchEvent(new CustomEvent("noteStreamed", { 
                detail: { 
                  note: event.note, 
                  index: event.index,
                  total: event.total 
                } 
              }));
            }

            // Update on complete
            if (event.status === "complete" && event.data) {
              localStorage.setItem("noteflix_data", JSON.stringify(event.data));
              window.dispatchEvent(new CustomEvent("notesUpdated", { detail: event.data }));
            }

            if (event.status === "error") {
              console.error("Processing error:", event.message);
              window.dispatchEvent(new CustomEvent("notesError", { detail: { message: event.message } }));
            }

          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }

    } catch (err: any) {
      console.error("Error:", err);
      window.dispatchEvent(new CustomEvent("notesError", { detail: { message: err.message } }));
    }
  }

  // Toggle Helpers
  const toggleChapter = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIndices(newSet);
  };

  const toggleAll = () => {
    if (preview?.chapters) {
      if (selectedIndices.size === preview.chapters.length) setSelectedIndices(new Set());
      else setSelectedIndices(new Set(preview.chapters.map((_: any, i: number) => i)));
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-10 relative overflow-hidden">

      {/* 🌈 background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[700px] h-[700px] bg-purple-400/30 blur-[160px] rounded-full -top-60 -left-40" />
        <div className="absolute w-[600px] h-[600px] bg-blue-400/30 blur-[160px] rounded-full bottom-0 right-0" />
      </div>

      <AnimatePresence mode="wait">

        {/* ================= STEP 1: INPUT ================= */}
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="bg-white/80 backdrop-blur-2xl p-14 rounded-[40px] shadow-2xl w-[720px] text-center border border-white/40"
          >
            <Sparkles className="mx-auto mb-6 text-purple-600" size={42} />

            <h1 className="text-5xl font-bold mb-4 text-gray-900">
              Generate Lecture Notes
            </h1>

            <p className="text-gray-500 mb-10 text-lg">
              Paste a YouTube lecture and let AI turn it into structured notes.
            </p>

            <div className="flex gap-4">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 px-6 py-5 text-lg rounded-2xl bg-white text-gray-900 placeholder:text-gray-400 border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
              />

              <button
                onClick={handlePreview}
                disabled={loadingPreview}
                className="group px-8 rounded-2xl bg-black text-white font-semibold flex items-center gap-3 hover:bg-gray-900 transition disabled:opacity-50"
              >
                {loadingPreview ? <Loader2 className="animate-spin" /> : <Youtube size={20} />}
                Preview
                {!loadingPreview && <ArrowRight className="group-hover:translate-x-1 transition" />}
              </button>
            </div>
          </motion.div>
        )}

        {/* ================= STEP 2: PREVIEW & SELECTION ================= */}
        {step === "preview" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white/90 backdrop-blur-2xl p-10 rounded-[40px] shadow-2xl w-[1100px] h-[85vh] overflow-hidden flex flex-col border border-white/40"
          >
            <div className="flex gap-10 h-full overflow-hidden">

              {/* LEFT: Video & Options */}
              <div className="w-1/2 flex flex-col h-full overflow-y-auto pr-2">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 flex gap-2 items-center">
                  <Film /> Setup Notes
                </h2>

                {/* Iframe */}
                <div className="aspect-video rounded-2xl overflow-hidden shadow-lg mb-6 shrink-0">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    allowFullScreen
                  />
                </div >

                <SectionTitle icon={<Settings2 />} title="Customization" />
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Select title="Depth" value={depth} setValue={setDepth} options={["Concise", "Standard", "Detailed"]} />
                  <Select title="Format" value={format} setValue={setFormat} options={["Bullet Points", "Paragraphs", "Mixed"]} />
                  <Select title="Tone" value={tone} setValue={setTone} options={["Student", "Professional", "Conversational"]} />
                  <Select title="Language" value={language} setValue={setLanguage} options={["English", "Hindi"]} />
                </div>

                <div className="space-y-3">
                  <Toggle label="Include Visuals" value={includeVisuals} setValue={setIncludeVisuals} icon={<Image size={16} />} />
                  <Toggle label="Include Code" value={includeCode} setValue={setIncludeCode} icon={<Code size={16} />} />
                </div>
              </div >

              {/* RIGHT: Chapter Selection */}
              < div className="w-1/2 flex flex-col h-full border-l pl-8 border-gray-100" >
                <div className="flex justify-between items-center mb-4">
                  <SectionTitle icon={<CheckSquare />} title="Select Chapters" />
                  {preview?.chapters && (
                    <button onClick={toggleAll} className="text-sm font-semibold text-purple-600 hover:text-purple-800">
                      {selectedIndices.size === preview.chapters.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                  {preview?.chapters && preview.chapters.length > 0 ? (
                    <div className="space-y-2">
                      {preview.chapters.map((ch: any, i: number) => (
                        <div
                          key={i}
                          onClick={() => toggleChapter(i)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3
                                        ${selectedIndices.has(i)
                              ? "bg-purple-50 border-purple-200 shadow-sm"
                              : "bg-white border-gray-100 opacity-60 hover:opacity-100"}`}
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0
                                            ${selectedIndices.has(i) ? "bg-purple-600 border-purple-600" : "border-gray-300"}`}>
                            {selectedIndices.has(i) && <CheckSquare size={14} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${selectedIndices.has(i) ? "text-purple-900" : "text-gray-500"}`}>
                              {ch.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {Math.floor(ch.start / 60)}:{Math.floor(ch.start % 60).toString().padStart(2, '0')} - {Math.floor(ch.end / 60)}:{Math.floor(ch.end % 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6">
                      <Sparkles className="mb-2 opacity-50" size={32} />
                      <p className="font-medium text-gray-600">Auto-Segmentation Enabled</p>
                      <p className="text-sm mt-1">AI will automatically analyze the video structure.</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-auto">
                  <button
                    onClick={() => setStep("input")}
                    className="px-6 py-4 rounded-2xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={generateNotes}
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-lg flex justify-center gap-2 shadow-lg hover:scale-[1.02] transition"
                  >
                    <Wand2 /> Generate Notes {selectedIndices.size > 0 && `(${selectedIndices.size})`}
                  </button>
                </div>
              </div >
            </div >
          </motion.div >
        )}


      </AnimatePresence >
    </div >
  );
}

/* reusable components */
function SectionTitle({ title, icon }: any) {
  return <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">{icon} {title}</h3>;
}

function Select({ title, options, value, setValue }: any) {
  return (
    <div>
      <label className="font-semibold text-xs text-gray-500 ml-1 mb-1 block">{title}</label>
      <select value={value} onChange={(e) => setValue(e.target.value)} className="w-full p-3 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 outline-none">
        {options.map((o: string) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, value, setValue, icon }: any) {
  return (
    <div onClick={() => setValue(!value)} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition shadow-sm">
      <div className="flex items-center gap-3 text-gray-700 text-sm">{icon}<span className="font-medium">{label}</span></div>
      <div className={`w-10 h-5 rounded-full ${value ? "bg-purple-600" : "bg-gray-200"} relative transition-colors duration-300`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all duration-300 ${value ? "left-[22px]" : "left-0.5"}`} />
      </div>
    </div>
  );
}

