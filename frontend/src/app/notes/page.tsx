"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, Download, FileQuestion, FileText, Home,
  MessageSquare, Send, Sparkles, Zap, ChevronLeft, ChevronRight,
  Edit2, Save, X, Loader2, CheckCircle2, XCircle, Info, Brain, RotateCw,
  Star, Search
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

function Flashcard({ data, index, total }: any) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when data changes (navigation)
  useEffect(() => {
    setIsFlipped(false);
  }, [data]);

  return (
    <div className="perspective-1000 w-full h-[400px] cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="w-full h-full relative preserve-3d"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xl text-white">
          <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
            {index + 1} / {total}
          </div>
          <Brain size={48} className="mb-6 text-white/80" />
          <h3 className="text-2xl font-bold leading-relaxed">
            {data.question}
          </h3>
          <p className="mt-8 text-white/60 text-sm font-medium animate-pulse flex items-center gap-2">
            <RotateCw size={14} /> Click to flip
          </p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 backface-hidden bg-card rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xl border-2 border-purple-100/20"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="absolute top-4 right-4 bg-muted text-foreground-muted px-3 py-1 rounded-full text-sm font-medium">
            Answer
          </div>
          <p className="text-xl text-foreground leading-relaxed font-medium">
            {data.answer}
          </p>
        </div>

      </motion.div>
    </div>
  );
}

type OutputTabType = "notes" | "quiz" | "flashcards" | "interview";

export default function NotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoIdFromUrl = searchParams.get("v");

  const [data, setData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("noteflix_data");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return null; }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);
  const [generating, setGenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("transcript");
  const [outputTab, setOutputTab] = useState<OutputTabType>("notes");
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState<string | null>(null);
  const [extras, setExtras] = useState<any>({
    quiz: null,
    flashcards: null,
    interview: null
  });

  const [flashcardIndex, setFlashcardIndex] = useState(0);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant", content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    async function checkBookmark() {
      if (!data?.metadata?.video_id) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: bookmark } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("video_id", data.metadata.video_id)
        .single();

      if (bookmark) setIsBookmarked(true);
    }
    checkBookmark();
  }, [data]);

  const toggleBookmark = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Please log in to bookmark lectures");

    if (isBookmarked) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", session.user.id)
        .eq("video_id", data.metadata.video_id);

      if (!error) setIsBookmarked(false);
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .insert({
          user_id: session.user.id,
          video_id: data.metadata.video_id,
          title: data.metadata.title,
          notes_data: data
        });

      if (!error) setIsBookmarked(true);
      else {
        console.error("Bookmark error:", error);
        alert("Failed to bookmark. Make sure the 'bookmarks' table exists.");
      }
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      // 1. Check URL param first
      if (videoIdFromUrl) {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: lectureData } = await supabase
            .from("lectures")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("video_id", videoIdFromUrl)
            .single();

          if (lectureData) {
            setData(lectureData.notes_data);
            setLoading(false);
            return;
          }
        }
      }

      // 2. Fallback to localStorage (for fresh generation)
      const saved = localStorage.getItem("noteflix_data");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData(parsed);
          setLoading(false);
        } catch (e) {
          console.error("Failed to parse saved data", e);
        }
      }
    }

    loadInitialData();

    // Listen for streaming note updates (individual notes as they're generated)
    const handleNoteStreamed = (e: CustomEvent) => {
      const { note, index } = e.detail;
      setData((prevData: any) => {
        const savedData = localStorage.getItem("noteflix_data");
        const currentData = savedData ? JSON.parse(savedData) : (prevData || {});

        if (!currentData.notes) {
          currentData.notes = [];
        }

        // Extend array if needed
        while (currentData.notes.length <= index) {
          currentData.notes.push(null);
        }

        // Update the note at the correct index
        currentData.notes[index] = note;

        // Update metadata/transcript if provided
        if (e.detail.metadata) {
          currentData.metadata = e.detail.metadata;
        }
        if (e.detail.transcript) {
          currentData.transcript = e.detail.transcript;
        }

        localStorage.setItem("noteflix_data", JSON.stringify(currentData));

        setLoading(false);
        return { ...currentData };
      });
    };

    // Listen for complete updates from streaming
    const handleNotesUpdate = async (e: CustomEvent) => {
      const completeData = e.detail;
      setData(completeData);
      setLoading(false);
      localStorage.setItem("noteflix_data", JSON.stringify(completeData));

      // 💾 SAVE TO SUPABASE LIBRARY
      const { data: { session } } = await supabase.auth.getSession();
      if (session && completeData.metadata?.video_id) {
        try {
          await supabase.from("lectures").upsert({
            user_id: session.user.id,
            video_id: completeData.metadata.video_id,
            title: completeData.metadata.title,
            metadata: completeData.metadata,
            transcript: completeData.transcript,
            notes_data: completeData
          }, { onConflict: 'user_id,video_id' });
          console.log("Lecture saved to library");
        } catch (err) {
          console.error("Error saving to library:", err);
        }
      }
    };

    window.addEventListener("noteStreamed", handleNoteStreamed as unknown as EventListener);
    window.addEventListener("notesUpdated", handleNotesUpdate as unknown as EventListener);

    // Poll for updates if still loading
    let interval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;

    if (loading && !localStorage.getItem("noteflix_data") && !videoIdFromUrl) {
      interval = setInterval(() => {
        const checkAgain = localStorage.getItem("noteflix_data");
        if (checkAgain) {
          try {
            const parsed = JSON.parse(checkAgain);
            setData(parsed);
            setLoading(false);
            if (interval) clearInterval(interval);
          } catch (e) {
            console.error("Failed to parse data", e);
          }
        }
      }, 500);

      timeout = setTimeout(() => {
        if (interval) clearInterval(interval);
        const hasData = localStorage.getItem("noteflix_data");
        if (!hasData) {
          router.push("/process");
        }
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("noteStreamed", handleNoteStreamed as unknown as EventListener);
      window.removeEventListener("notesUpdated", handleNotesUpdate as unknown as EventListener);
    };
  }, [router, videoIdFromUrl]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          transcript: data?.transcript || []
        }),
      });

      if (!response.ok) throw new Error("Chat failed");
      const result = await response.json();

      setChatMessages(prev => [...prev, { role: "assistant", content: result.answer }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process your question. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const filterGenericText = (text: any): string => {
    if (typeof text !== 'string') {
      if (text === null || text === undefined) return '';
      return String(text);
    }

    const genericPatterns = [
      /the speaker discusses?/gi,
      /the speaker is trying to convey/gi,
      /the instructor mentions?/gi,
      /in this video/gi,
      /according to the video/gi,
      /the presenter explains?/gi,
      /the lecturer discusses?/gi,
      /the speaker highlights?/gi,
      /the speaker talks about/gi,
    ];

    let filtered = text;
    genericPatterns.forEach(pattern => {
      filtered = filtered.replace(pattern, "");
    });

    return filtered.trim();
  };

  const generateExtra = async (type: "tldr" | "quiz" | "flashcards" | "interview", force: boolean = false) => {
    // Only allow supported types
    if (["quiz", "flashcards", "interview"].indexOf(type) === -1) {
      console.log("Feature disabled");
      return;
    }

    if (!force && extras[type]) return;

    setGenerating(type);
    try {
      // Ensure we have notes to generate from
      if (!data.notes || data.notes.length === 0) {
        alert("Please wait for notes to finish generating before creating a quiz.");
        return;
      }

      const notesText = data.notes
        .filter((n: any) => n) // Filter out nulls
        .map((n: any) =>
          `${n.title}\n${n.notes.explanation}\n${n.notes.bullet_notes.join("\n")}`
        ).join("\n\n");

      // Use the injected language logic
      const language = data.metadata.language || "English";

      // Extract existing items to avoid repetition
      let existingItems: string[] = [];
      if (extras[type]) {
        if (type === "quiz") {
          existingItems = extras.quiz.quiz?.map((q: any) => q.question) || [];
        } else if (type === "flashcards") {
          existingItems = extras.flashcards.flashcards?.map((f: any) => f.question) || [];
        } else if (type === "interview") {
          existingItems = extras.interview.questions?.map((q: any) => q.question) || [];
        }
      }

      // Add random seed and count
      const seed = force ? Math.floor(Math.random() * 1000) : 0;
      // Request one flashcard per section, default to 5 if sections not found
      const count = type === "flashcards" && data.sections ? data.sections.length : 5;

      const response = await fetch(`http://127.0.0.1:8000/generate-${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes_text: notesText,
          language,
          seed,
          count,
          existing_items: existingItems
        }),
      });

      if (!response.ok) throw new Error("Generation failed");
      const result = await response.json();

      setExtras((prev: any) => {
        if (type === "quiz" && force && prev.quiz) {
          return {
            ...prev,
            quiz: {
              ...result,
              quiz: [...(prev.quiz.quiz || []), ...(result.quiz || [])]
            }
          };
        }
        return { ...prev, [type]: result };
      });
      if (type === "flashcards") setFlashcardIndex(0);
    } catch (err) {
      alert(`Failed to generate ${type}`);
    } finally {
      setGenerating(null);
    }
  };

  const downloadContent = async () => {
    if (!data) return;

    try {
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF();
      let yPos = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const maxWidth = doc.internal.pageSize.width - 2 * margin;

      const addText = (text: string, fontSize: number, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        if (isBold) doc.setFont("helvetica", "bold");
        else doc.setFont("helvetica", "normal");

        const lines = doc.splitTextToSize(text, maxWidth);
        if (yPos + lines.length * (fontSize * 0.4) > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
        lines.forEach((line: string) => {
          doc.text(line, margin, yPos);
          yPos += fontSize * 0.4;
        });
      };

      addText(data.metadata.title || "Notes", 20, true);
      yPos += 10;

      if (outputTab === "notes") {
        if (editedNotes) {
          const parser = new DOMParser();
          const docHtml = parser.parseFromString(editedNotes, 'text/html');
          const body = docHtml.body;

          Array.from(body.children).forEach((node) => {
            const element = node as HTMLElement;
            const text = element.innerText || "";
            if (!text.trim()) return;

            if (element.tagName === 'H1') {
              yPos += 5;
              addText(text, 22, true);
              yPos += 8;
            } else if (element.tagName === 'H2') {
              yPos += 4;
              addText(text, 18, true);
              yPos += 6;
            } else if (element.tagName === 'H3') {
              yPos += 2;
              addText(text, 14, true);
              yPos += 5;
            } else if (element.tagName === 'P') {
              addText(text, 11);
              yPos += 5;
            } else if (element.tagName === 'UL' || element.tagName === 'OL') {
              Array.from(element.children).forEach((li) => {
                const liText = (li as HTMLElement).innerText;
                addText(`• ${liText}`, 11);
                yPos += 4;
              });
              yPos += 4;
            } else {
              addText(text, 11);
              yPos += 5;
            }
          });
        } else {
          data.notes?.forEach((section: any) => {
            if (!section) return;
            addText(section.title, 16, true);
            yPos += 5;

            if (section.notes?.explanation) {
              addText(filterGenericText(section.notes.explanation), 12);
              yPos += 5;
            }

            if (section.notes?.bullet_notes && section.notes.bullet_notes.length > 0) {
              section.notes.bullet_notes.forEach((point: string) => {
                addText(`• ${filterGenericText(point)}`, 12);
                yPos += 3;
              });
            }
            yPos += 5;
          });
        }
      } else if (outputTab === "quiz" && extras.quiz) {
        addText("Quiz Questions", 18, true);
        yPos += 10;
        extras.quiz.quiz?.forEach((q: any, i: number) => {
          addText(`Question ${i + 1}: ${q.question}`, 14, true);
          yPos += 5;
          q.options?.forEach((opt: string, j: number) => {
            addText(`${String.fromCharCode(65 + j)}. ${opt}`, 12);
            yPos += 3;
          });
          addText(`Answer: ${q.answer}`, 12, true);
          yPos += 8;
        });
      } else if (outputTab === "interview" && extras.interview) {
        addText("Interview Preparation", 18, true);
        yPos += 10;
        extras.interview.questions?.forEach((q: any, i: number) => {
          addText(`${i + 1}. Q: ${q.question}`, 13, true);
          yPos += 5;
          addText(`A: ${q.answer}`, 12);
          yPos += 8;
        });
      } else if (outputTab === "flashcards" && extras.flashcards) {
        extras.flashcards.flashcards?.forEach((card: any, i: number) => {
          if (i > 0) doc.addPage();

          const pageWidth = doc.internal.pageSize.width;
          const cardWidth = pageWidth - 40;
          const cardHeight = 100;
          const cardX = 20;
          const cardY = 40;

          doc.setDrawColor(100, 100, 100);
          doc.setFillColor(245, 245, 255);
          doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 5, 5, "FD");

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 100, 100);
          doc.text(`Flashcard ${i + 1}`, cardX + 10, cardY + 15);

          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          const qLines = doc.splitTextToSize(card.question, cardWidth - 20);
          const qY = cardY + (cardHeight / 2) - ((qLines.length * 8) / 2) + 5;
          doc.text(qLines, pageWidth / 2, qY, { align: "center" });

          let aY = cardY + cardHeight + 20;
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(80, 80, 80);
          doc.text("Answer:", 20, aY);

          aY += 10;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          const aLines = doc.splitTextToSize(card.answer, pageWidth - 40);
          doc.text(aLines, 20, aY);
        });
      }
      const fileName = outputTab === "notes"
        ? `${data.metadata.title || "notes"}.pdf`
        : `${data.metadata.title || "content"}_${outputTab}.pdf`;

      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const getDownloadButtonText = () => {
    switch (outputTab) {
      case "notes": return "Download Notes";
      case "quiz": return "Download Quiz";
      case "flashcards": return "Download Flashcards";
      case "interview": return "Download Interview Prep";
      default: return "Download";
    }
  };

  const convertNotesToHtml = () => {
    if (!data?.notes) return "";
    let html = "";
    if (data.metadata?.title) html += `<h1>${data.metadata.title}</h1>`;

    data.sections?.forEach((sectionMeta: any, idx: number) => {
      const section = data.notes[idx];
      if (!section) return;

      html += `<h2>${section.title}</h2>`;
      if (section.notes.explanation) {
        html += `<p>${section.notes.explanation}</p>`;
      }
      if (section.notes.bullet_notes && section.notes.bullet_notes.length > 0) {
        html += "<ul>";
        section.notes.bullet_notes.forEach((point: string) => {
          html += `<li>${point}</li>`;
        });
        html += "</ul>";
      }
    });
    return html;
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      if (!editedNotes) {
        setEditedNotes(convertNotesToHtml());
      }
    }
    setIsEditing(!isEditing);
  };

  const handleSaveNotes = async () => {
    setIsEditing(false);

    const updatedData = { ...data, editedNotes };
    setData(updatedData);
    localStorage.setItem("noteflix_data", JSON.stringify(updatedData));

    const { data: { session } } = await supabase.auth.getSession();
    if (session && data.metadata?.video_id) {
      await supabase.from("lectures").update({
        notes_data: updatedData
      }).eq("user_id", session.user.id).eq("video_id", data.metadata.video_id);

      await supabase.from("bookmarks").update({
        notes_data: updatedData
      }).eq("user_id", session.user.id).eq("video_id", data.metadata.video_id);
    }
  };

  const videoId = data?.metadata?.video_id || "";

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* 🧭 SIDEBAR */}
      <Sidebar />

      {/* 🧠 MAIN */}
      <div className="flex-1 relative z-10 transition-all duration-300 overflow-y-auto">
        {loading && !data ? (
          <div className="h-full flex items-center justify-center p-20">
            <div className="text-center">
              <Loader2 className="animate-spin text-purple-600 mx-auto mb-4" size={48} />
              <p className="text-foreground-muted animate-pulse">Loading your lecture knowledge...</p>
            </div>
          </div>
        ) : !data ? (
          <div className="h-full flex items-center justify-center p-20">
            <div className="text-center bg-card/50 backdrop-blur-xl border border-border p-12 rounded-[40px] shadow-xl">
              <div className="text-5xl mb-6">🔍</div>
              <h2 className="text-2xl font-bold mb-2">Lecture Not Found</h2>
              <p className="text-foreground-muted mb-8">We couldn't find the data for this video.</p>
              <button
                onClick={() => router.push("/process")}
                className="px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition shadow-lg"
              >
                Process a Video
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* 🌈 BACKGROUND BACKGROUNDS */}
            <div className="absolute inset-0 pointer-events-none fixed">
              <div className="absolute w-[800px] h-[800px] bg-purple-400/5 blur-[120px] rounded-full -top-40 -right-20" />
              <div className="absolute w-[600px] h-[600px] bg-blue-400/5 blur-[120px] rounded-full bottom-0 left-0" />
            </div>

            {/* Top Bar */}
            <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50 relative">
              <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/process" className="flex items-center gap-2 text-foreground-muted hover:text-purple-600 transition">
                  <ArrowLeft size={18} /> Back
                </Link>

                <h1 className="text-lg font-semibold text-foreground truncate max-w-2xl">
                  {data.metadata?.title || "Notes"}
                </h1>

                <div className="flex gap-3">
                  <button
                    onClick={toggleBookmark}
                    className={`p-2 rounded-lg border transition-all ${isBookmarked
                      ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 shadow-sm"
                      : "bg-card border-border text-foreground-muted hover:text-yellow-500"
                      }`}
                  >
                    <Star size={20} fill={isBookmarked ? "currentColor" : "none"} />
                  </button>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium transition shadow-lg flex items-center gap-2"
                  >
                    <Home size={16} />
                    Dashboard
                  </Link>
                </div>
              </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 py-6 flex gap-6 h-[calc(100vh-73px)] relative z-10">
              {/* LEFT COLUMN - Video & Chatbot */}
              <div className="w-1/2 flex flex-col h-full">
                <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 bg-card shadow-lg border border-border">
                  {videoId ? (
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <Sparkles className="text-gray-400" size={48} />
                    </div>
                  )}
                </div>

                {/* Chatbot */}
                <div className="flex-1 flex flex-col bg-card/50 backdrop-blur-xl rounded-2xl border border-border shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-purple-500/5 to-blue-500/5">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="text-purple-600" size={20} />
                      <h3 className="font-semibold text-foreground">AI Chat Assistant</h3>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center text-foreground-muted py-8">
                        <MessageSquare className="mx-auto mb-2 text-foreground-muted/50" size={32} />
                        <p className="text-sm">Ask me anything about this lecture!</p>
                      </div>
                    )}
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === "user" ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-foreground"}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg px-4 py-2">
                          <Loader2 className="animate-spin text-purple-600" size={16} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleChatSubmit} className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask a question about the lecture..."
                        className="flex-1 px-4 py-2 rounded-lg border border-border bg-card focus:ring-2 focus:ring-purple-500 outline-none text-foreground"
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !chatInput.trim()}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* RIGHT COLUMN - Notes & Actions */}
              <div className="w-1/2 flex flex-col h-full border-l border-border pl-6">
                {/* Output Tabs */}
                <div className="flex gap-1 border-b border-border mb-4">
                  {[
                    { id: "notes" as OutputTabType, label: "Notes", icon: BookOpen },
                    { id: "quiz" as OutputTabType, label: "Quiz", icon: FileQuestion },
                    { id: "flashcards" as OutputTabType, label: "Flashcards", icon: FileText },
                    { id: "interview" as OutputTabType, label: "Interview", icon: MessageSquare },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setOutputTab(tab.id)}
                      className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition relative ${outputTab === tab.id ? "text-purple-600" : "text-foreground-muted hover:text-foreground"}`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                      {outputTab === tab.id && (
                        <motion.div layoutId="outputTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Action Button */}
                <div className="mb-6">
                  {outputTab === "notes" && (
                    <button
                      onClick={handleEditToggle}
                      className={`w-full mb-3 px-4 py-3 rounded-xl border flex items-center justify-center gap-2 transition font-medium text-sm ${isEditing ? "bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500/20" : "bg-card border-purple-200/20 text-purple-600 hover:bg-purple-500/5"}`}
                    >
                      {isEditing ? <X size={16} /> : <Edit2 size={16} />}
                      {isEditing ? "Cancel Editing" : "Edit Notes"}
                    </button>
                  )}
                  <button
                    onClick={downloadContent}
                    disabled={outputTab !== "notes" && !extras[outputTab]}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={16} />
                    {getDownloadButtonText()}
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto pr-2">
                  {outputTab === "notes" && (
                    <div className="space-y-8">
                      {isEditing ? (
                        <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 border border-border shadow-lg">
                          <ReactQuill
                            theme="snow"
                            value={editedNotes || ""}
                            onChange={setEditedNotes}
                            className="bg-card rounded-lg h-[500px] mb-12 text-foreground"
                            modules={{
                              toolbar: [
                                [{ 'header': [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                [{ 'color': [] }, { 'background': [] }],
                                ['clean']
                              ]
                            }}
                          />
                          <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg border border-border text-foreground/80 hover:bg-muted flex items-center gap-2">
                              <X size={16} /> Cancel
                            </button>
                            <button onClick={handleSaveNotes} className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 flex items-center gap-2">
                              <Save size={16} /> Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {editedNotes ? (
                            <div className="ql-snow">
                              <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-8 border border-border shadow-lg ql-editor" dangerouslySetInnerHTML={{ __html: editedNotes }} />
                            </div>
                          ) : (
                            <>
                              {data.notes?.map((section: any, idx: number) => {
                                if (!section) return null;
                                return (
                                  <div key={idx}>
                                    <h2 className="text-3xl font-bold text-foreground mb-4 pb-2 border-b-2 border-purple-200/30">
                                      {section.title}
                                    </h2>
                                    {section.notes?.explanation && (
                                      <p className="text-foreground/80 mb-4 leading-relaxed text-lg">
                                        {filterGenericText(String(section.notes.explanation))}
                                      </p>
                                    )}
                                    {section.notes?.bullet_notes?.length > 0 && (
                                      <ul className="space-y-3 mb-6">
                                        {section.notes.bullet_notes.map((point: any, i: number) => (
                                          <li key={i} className="flex gap-3 text-foreground/80 text-lg">
                                            <span className="text-purple-600 mt-1 font-bold text-xl">•</span>
                                            <span>{filterGenericText(String(point))}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {outputTab === "quiz" && (
                    <div className="space-y-4">
                      {!extras.quiz ? (
                        <div className="text-center py-12 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
                          {generating === "quiz" ? (
                            <div className="flex flex-col items-center">
                              <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                              <p className="text-foreground-muted">Generating quiz...</p>
                            </div>
                          ) : (
                            <div onClick={() => generateExtra("quiz", true)} className="cursor-pointer group hover:bg-card/80 transition p-6 rounded-xl">
                              <FileQuestion className="text-purple-400 group-hover:text-purple-600 transition mx-auto mb-2" size={42} />
                              <p className="text-foreground-muted group-hover:text-purple-700">Click to generate quiz</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border shadow-lg">
                          <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold text-foreground">Quiz</h2>
                            {generating === "quiz" ? (
                              <div className="flex items-center gap-2 text-purple-600">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="text-sm font-medium">Adding...</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => generateExtra("quiz", true)}
                                className="px-4 py-2 rounded-lg bg-purple-600/10 text-purple-600 hover:bg-purple-600/20 text-sm font-semibold transition"
                              >
                                + Add More Questions
                              </button>
                            )}
                          </div>
                          <div className="grid gap-6">
                            {extras.quiz.quiz?.map((q: any, i: number) => (
                              <QuizQuestion key={i} index={i} data={q} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {outputTab === "flashcards" && (
                    <div className="space-y-4">
                      {!extras.flashcards ? (
                        <div className="text-center py-12 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
                          {generating === "flashcards" ? (
                            <div className="flex flex-col items-center">
                              <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                              <p className="text-foreground-muted">Generating flashcards...</p>
                            </div>
                          ) : (
                            <div onClick={() => generateExtra("flashcards", true)} className="cursor-pointer group hover:bg-card/80 transition p-6 rounded-xl">
                              <FileText className="text-purple-400 group-hover:text-purple-600 transition mx-auto mb-2" size={42} />
                              <p className="text-foreground-muted group-hover:text-purple-700">Click to generate flashcards</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold text-foreground">Flashcards</h2>
                            <div className="text-sm text-foreground-muted">
                              {flashcardIndex + 1} of {extras.flashcards.flashcards?.length}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button onClick={() => setFlashcardIndex(prev => Math.max(0, prev - 1))} disabled={flashcardIndex === 0} className="p-3 rounded-full bg-card shadow-md disabled:opacity-50 border border-border">
                              <ChevronLeft size={24} />
                            </button>
                            <div className="flex-1">
                              <Flashcard data={extras.flashcards.flashcards[flashcardIndex]} index={flashcardIndex} total={extras.flashcards.flashcards.length} />
                            </div>
                            <button onClick={() => setFlashcardIndex(prev => Math.min(extras.flashcards.flashcards.length - 1, prev + 1))} disabled={flashcardIndex === extras.flashcards.flashcards.length - 1} className="p-3 rounded-full bg-card shadow-md disabled:opacity-50 border border-border">
                              <ChevronRight size={24} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}


                  {outputTab === "interview" && (
                    <div className="space-y-4">
                      {!extras.interview ? (
                        <div className="text-center py-12 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
                          {generating === "interview" ? (
                            <div className="flex flex-col items-center">
                              <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                              <p className="text-foreground-muted">Generating interview questions...</p>
                            </div>
                          ) : (
                            <div onClick={() => generateExtra("interview", true)} className="cursor-pointer group hover:bg-card/80 transition p-6 rounded-xl">
                              <MessageSquare className="text-purple-400 group-hover:text-purple-600 transition mx-auto mb-2" size={42} />
                              <p className="text-foreground-muted group-hover:text-purple-700">Click to generate interview preparation</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border shadow-lg">
                          <h2 className="text-3xl font-bold text-foreground mb-6">Interview Preparation</h2>
                          <div className="space-y-6">
                            {extras.interview.questions?.map((item: any, i: number) => (
                              <div key={i} className="p-6 bg-muted/50 rounded-xl border border-border shadow-sm">
                                <h3 className="font-bold text-lg text-foreground mb-3 flex gap-3">
                                  <span className="text-purple-600">{i + 1}.</span>
                                  {item.question}
                                </h3>
                                <div className="pl-8 pt-4 border-t border-border mt-3 italic text-foreground/70">
                                  <p className="text-sm font-semibold text-purple-600 mb-1">Recommended Answer:</p>
                                  <p className="text-base leading-relaxed">{item.answer}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizQuestion({ index, data }: any) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleSelect = (option: string) => {
    if (selected) return;
    setSelected(option);
    setShowAnswer(true);
  };

  const getOptionClass = (opt: string) => {
    if (!showAnswer) return "bg-muted/50 border-border hover:bg-muted text-foreground/80";
    if (opt === data.answer) return "bg-green-500/10 border-green-500 text-green-600 font-medium";
    if (selected === opt && opt !== data.answer) return "bg-red-500/10 border-red-500 text-red-600";
    return "bg-muted/20 border-border text-foreground-muted opacity-60";
  };

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm transition-all hover:shadow-md">
      <h3 className="text-lg font-bold text-foreground mb-4 flex gap-3">
        <span className="bg-purple-600/10 text-purple-600 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm">
          Q{index + 1}
        </span>
        {data.question}
      </h3>

      <div className="space-y-3 pl-11">
        {data.options.map((opt: string, i: number) => {
          const label = String.fromCharCode(65 + i);
          const cleanOpt = opt.replace(/^[A-D]\)\s*/, "");

          return (
            <button
              key={i}
              onClick={() => handleSelect(label)}
              disabled={showAnswer}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${getOptionClass(label)}`}
            >
              <span className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 text-sm font-semibold transition-colors
                ${showAnswer && label === data.answer
                  ? "bg-green-500 border-green-500 text-white"
                  : showAnswer && selected === label && label !== data.answer
                    ? "bg-red-500 border-red-500 text-white"
                    : "border-border text-foreground-muted bg-muted/30"
                }
              `}>
                {label}
              </span>
              <span className="flex-1">{cleanOpt}</span>
              {showAnswer && label === data.answer && <CheckCircle2 size={20} className="text-green-600" />}
              {showAnswer && selected === label && label !== data.answer && <XCircle size={20} className="text-red-600" />}
            </button>
          )
        })}
      </div>

      {showAnswer && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="ml-11 mt-4 p-4 bg-blue-500/10 text-blue-600 rounded-lg text-sm border border-blue-500/20 flex gap-2 items-start"
        >
          <Info size={16} className="mt-0.5" />
          <div>
            <strong>Correct Answer: {data.answer}</strong>
          </div>
        </motion.div>
      )}
    </div>
  );
}
