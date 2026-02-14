"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Download, MessageSquare, Send,
  Loader2, Sparkles, FileQuestion, Zap, BookOpen, FileText, Home,
  CheckCircle2, XCircle, Info, Brain, ChevronLeft, ChevronRight, RotateCw
} from "lucide-react";

function Flashcard({ data, index, total }: any) {
  const [isFlipped, setIsFlipped] = useState(false);

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
          className="absolute inset-0 backface-hidden bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xl border-2 border-purple-100"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
            Answer
          </div>
          <p className="text-xl text-gray-800 leading-relaxed font-medium">
            {data.answer}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
import { useRouter } from "next/navigation";
import Link from "next/link";

type OutputTabType = "notes" | "quiz" | "flashcards" | "tldr" | "interview";

export default function NotesPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [outputTab, setOutputTab] = useState<OutputTabType>("notes");
  const [generating, setGenerating] = useState<string | null>(null);
  const [extras, setExtras] = useState<any>({
    tldr: null,
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

  useEffect(() => {
    // Check for existing data first
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
    const handleNotesUpdate = (e: CustomEvent) => {
      setData(e.detail);
      setLoading(false);
      localStorage.setItem("noteflix_data", JSON.stringify(e.detail));
    };

    window.addEventListener("noteStreamed", handleNoteStreamed as EventListener);
    window.addEventListener("notesUpdated", handleNotesUpdate as EventListener);

    // Poll for updates if still loading
    let interval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;

    if (loading && !saved) {
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
      window.removeEventListener("noteStreamed", handleNoteStreamed as EventListener);
      window.removeEventListener("notesUpdated", handleNotesUpdate as EventListener);
    };
  }, [router, loading]);

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
    if (["quiz", "flashcards", "tldr"].indexOf(type) === -1) {
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

      // Add random seed and count
      const seed = force ? Math.floor(Math.random() * 1000) : 0;
      // Request one flashcard per section, default to 5 if sections not found
      const count = type === "flashcards" && data.sections ? data.sections.length : 5;

      const response = await fetch(`http://127.0.0.1:8000/generate-${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes_text: notesText, language, seed, count }),
      });

      if (!response.ok) throw new Error("Generation failed");
      const result = await response.json();

      setExtras((prev: any) => ({ ...prev, [type]: result }));
      if (type === "flashcards") setFlashcardIndex(0);
    } catch (err) {
      alert(`Failed to generate ${type}`);
    } finally {
      setGenerating(null);
    }
  };

  const downloadContent = async () => {
    // ... (rest of downloadContent logic)
    if (!data) return;

    try {
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF();
      // ... (existing PDF logic)
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

      // ... (rest of render logic remains same, just ensuring we don't break it)
      if (outputTab === "notes") {
        data.notes?.forEach((section: any) => {
          if (!section) return; // Skip nulls
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
      } else if (outputTab === "flashcards" && extras.flashcards) {
        extras.flashcards.flashcards?.forEach((card: any, i: number) => {
          if (i > 0) doc.addPage();

          const pageWidth = doc.internal.pageSize.width;
          const pageHeight = doc.internal.pageSize.height;
          const cardWidth = pageWidth - 40;
          const cardHeight = 100;
          const cardX = 20;
          const cardY = 40;

          // Draw Card Border (Flashcard Look)
          doc.setDrawColor(100, 100, 100);
          doc.setFillColor(245, 245, 255);
          doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 5, 5, "FD");

          // Card Title
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 100, 100);
          doc.text(`Flashcard ${i + 1}`, cardX + 10, cardY + 15);

          // Question (Centered in Card)
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0); // Black text
          const qLines = doc.splitTextToSize(card.question, cardWidth - 20);
          // Simple vertical centering approximation
          const qY = cardY + (cardHeight / 2) - ((qLines.length * 8) / 2) + 5;
          doc.text(qLines, pageWidth / 2, qY, { align: "center" });

          // Answer Section Below Card
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
      // ... (rest of PDF logic)
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
      case "notes":
        return "Download Notes";
      case "quiz":
        return "Download Quiz";
      case "flashcards":
        return "Download Flashcards";
      case "tldr":
        return "Download TLDR";
      case "interview":
        return "Download Interview Questions";
      default:
        return "Download";
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[700px] h-[700px] bg-purple-400/30 blur-[160px] rounded-full -top-60 -left-40" />
          <div className="absolute w-[600px] h-[600px] bg-blue-400/30 blur-[160px] rounded-full bottom-0 right-0" />
        </div>
        <Loader2 className="animate-spin text-purple-600 relative z-10" size={48} />
      </div>
    );
  }

  const videoId = data.metadata?.video_id || "";

  return (
    <div className="min-h-screen bg-[#FDFDFD] relative overflow-hidden">
      {/* ... (background & header) */}
      <div className="absolute inset-0 pointer-events-none fixed">
        <div className="absolute w-[800px] h-[800px] bg-purple-100/50 blur-[120px] rounded-full -top-40 -right-20" />
        <div className="absolute w-[600px] h-[600px] bg-blue-100/50 blur-[120px] rounded-full bottom-0 left-0" />
      </div>

      {/* Top Bar */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/process" className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition">
            <ArrowLeft size={18} /> Back
          </Link>

          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-2xl">
            {data.metadata?.title || "Notes"}
          </h1>

          <div className="flex gap-3">
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
          {/* ... (Video Preview & Chatbot same as before) */}
          <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 bg-white shadow-lg border border-gray-200">
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
          <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            {/* ... (Chatbot UI) */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-purple-600" size={20} />
                <h3 className="font-semibold text-gray-900">AI Chat Assistant</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="mx-auto mb-2 text-gray-400" size={32} />
                  <p className="text-sm">Ask me anything about this lecture!</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === "user"
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                      }`}
                  >
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

            <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about the lecture..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-gray-900"
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
        <div className="w-1/2 flex flex-col h-full border-l border-gray-200 pl-6">
          {/* Output Tabs */}
          <div className="flex gap-1 border-b border-gray-200 mb-4">
            {[
              { id: "notes" as OutputTabType, label: "Notes", icon: BookOpen },
              { id: "quiz" as OutputTabType, label: "Quiz", icon: FileQuestion },
              { id: "flashcards" as OutputTabType, label: "Flashcards", icon: FileText },
              { id: "tldr" as OutputTabType, label: "TLDR", icon: Zap },
              { id: "interview" as OutputTabType, label: "Interview Questions", icon: MessageSquare },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setOutputTab(tab.id);
                  // REMOVED AUTO GENERATION: if (tab.id !== "notes" && !extras[tab.id]) { generateExtra(tab.id); }
                }}
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition relative ${outputTab === tab.id
                  ? "text-purple-600"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {outputTab === tab.id && (
                  <motion.div
                    layoutId="outputTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Action Button */}
          <div className="mb-6">
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
                {/* CHANGED TO MAP SECTIONS INSTEAD OF NOTES TO SHOW PENDING STATES CORRECTLY */}
                {data.sections && Array.isArray(data.sections) && data.sections.length > 0 ? (
                  data.sections.map((sectionMeta: any, idx: number) => {
                    // Try to find the corresponding note (indices should match)
                    const section = data.notes && data.notes.length > idx ? data.notes[idx] : null;

                    if (!section) {
                      return (
                        <div key={idx} className="border-b-2 border-purple-200 pb-4">
                          <h2 className="text-lg font-bold text-gray-500 mb-2 truncate">{sectionMeta.title || `Section ${idx + 1}`}</h2>
                          <div className="flex items-center gap-3">
                            <Loader2 className="animate-spin text-purple-600" size={20} />
                            <span className="text-gray-500 italic">Generating notes...</span>
                          </div>
                        </div>
                      );
                    }

                    const isError = section.notes && typeof section.notes.explanation === 'string' &&
                      (section.notes.explanation.includes("Unable to generate") || section.notes.explanation.includes("Groq failed"));

                    if (!section.notes || typeof section.notes !== 'object' || isError) {
                      return (
                        <div key={idx} className="border-b-2 border-purple-200 pb-4">
                          <h2 className="text-3xl font-bold text-gray-900 mb-4">{section.title || "Untitled"}</h2>
                          <div className="flex items-center gap-3 text-gray-500 italic">
                            <Loader2 className="animate-spin text-purple-600" size={16} />
                            Generating notes content...
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={idx}>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-purple-200">
                          {section.title}
                        </h2>

                        {section.notes.explanation &&
                          typeof section.notes.explanation === 'string' &&
                          String(section.notes.explanation).trim().length > 0 && (
                            <p className="text-gray-700 mb-4 leading-relaxed text-lg">
                              {filterGenericText(String(section.notes.explanation))}
                            </p>
                          )}
                        {section.notes.bullet_notes && Array.isArray(section.notes.bullet_notes) && section.notes.bullet_notes.length > 0 && (
                          <ul className="space-y-3 mb-6">
                            {section.notes.bullet_notes.map((point: any, i: number) => {
                              const pointText = typeof point === 'string' ? point : String(point);
                              return (
                                <li key={i} className="flex gap-3 text-gray-700 text-lg">
                                  <span className="text-purple-600 mt-1 font-bold text-xl">•</span>
                                  <span>{filterGenericText(pointText)}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {(!section.notes.explanation ||
                          typeof section.notes.explanation !== 'string' ||
                          !String(section.notes.explanation).trim()) &&
                          (!section.notes.bullet_notes || section.notes.bullet_notes.length === 0) && (
                            <div className="text-gray-500 italic mb-6 flex items-center gap-2">
                              <Loader2 className="animate-spin text-purple-600" size={16} />
                              <span>Generating AI notes for this section...</span>
                            </div>
                          )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                    <p>Initializing...</p>
                  </div>
                )}
              </div>
            )}

            {outputTab === "quiz" && (
              <div className="space-y-4">
                {!extras.quiz ? (
                  <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                    {generating === "quiz" ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                        <p className="text-gray-500">Generating quiz...</p>
                      </div>
                    ) : (
                      <div
                        onClick={() => generateExtra("quiz", true)}
                        className="cursor-pointer group hover:bg-white/80 transition p-6 rounded-xl"
                      >
                        <FileQuestion className="text-purple-400 group-hover:text-purple-600 transition mx-auto mb-2" size={42} />
                        <p className="text-gray-500 group-hover:text-purple-700">Click to generate quiz</p>
                        <button className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition">
                          Generate Quiz
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-bold text-gray-900">Quiz</h2>
                    </div>

                    <div className="space-y-8">
                      {extras.quiz.quiz?.map((q: any, i: number) => (
                        <QuizQuestion key={i} index={i} data={q} />
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                      <button
                        onClick={() => {
                          setExtras((prev: any) => ({ ...prev, quiz: null }));
                          generateExtra('quiz', true);
                        }}
                        className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
                      >
                        Load New Questions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {outputTab === "flashcards" && (
              <div className="space-y-4">
                {!extras.flashcards ? (
                  <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                    {generating === "flashcards" ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                        <p className="text-gray-500">Generating flashcards...</p>
                      </div>
                    ) : (
                      <div
                        onClick={() => generateExtra("flashcards", true)}
                        className="cursor-pointer group hover:bg-white/80 transition p-6 rounded-xl"
                      >
                        <FileText className="text-purple-400 group-hover:text-purple-600 transition mx-auto mb-2" size={42} />
                        <p className="text-gray-500 group-hover:text-purple-700">Click to generate flashcards</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateExtra("flashcards", true);
                          }}
                          className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                        >
                          Generate Flashcards
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-bold text-gray-900">Flashcards</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setExtras((prev: any) => ({ ...prev, flashcards: null }));
                            generateExtra('flashcards', true);
                          }}
                          className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                      <div className="w-full relative px-12">
                        {extras.flashcards.flashcards && extras.flashcards.flashcards.length > 0 && (
                          <Flashcard
                            key={flashcardIndex}
                            data={extras.flashcards.flashcards[flashcardIndex]}
                            index={flashcardIndex}
                            total={extras.flashcards.flashcards.length}
                          />
                        )}

                        {/* Navigation Buttons */}
                        <button
                          onClick={() => setFlashcardIndex(prev => Math.max(0, prev - 1))}
                          disabled={flashcardIndex === 0}
                          className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-lg border border-gray-100 text-gray-600 hover:text-purple-600 disabled:opacity-30 disabled:hover:text-gray-600 transition"
                        >
                          <ChevronLeft size={24} />
                        </button>

                        <button
                          onClick={() => setFlashcardIndex(prev => Math.min(extras.flashcards.flashcards.length - 1, prev + 1))}
                          disabled={flashcardIndex === extras.flashcards.flashcards.length - 1}
                          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-lg border border-gray-100 text-gray-600 hover:text-purple-600 disabled:opacity-30 disabled:hover:text-gray-600 transition"
                        >
                          <ChevronRight size={24} />
                        </button>
                      </div>

                      {/* Dots Indicator */}
                      <div className="flex gap-2 mt-2 flex-wrap justify-center">
                        {extras.flashcards.flashcards?.map((_: any, i: number) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === flashcardIndex ? "bg-purple-600 w-6" : "bg-purple-200"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {outputTab === "tldr" && (
              <div className="space-y-4">
                {!extras.tldr ? (
                  <div
                    onClick={() => generateExtra("tldr", true)}
                    className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100 cursor-pointer group hover:bg-white/80 transition"
                  >
                    {generating === "tldr" ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                        <p className="text-gray-500">Generating TLDR...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Zap className="text-gray-400 group-hover:text-yellow-500 transition mx-auto mb-2" size={32} />
                        <p className="text-gray-500 group-hover:text-gray-700">Click to generate TLDR</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateExtra("tldr", true);
                          }}
                          className="mt-4 px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow-md"
                        >
                          Generate TLDR
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">TLDR</h2>
                    <ul className="space-y-3">
                      {extras.tldr.tldr?.map((point: string, i: number) => (
                        <li key={i} className="text-gray-700 flex gap-3 text-lg">
                          <span className="text-purple-600 font-bold text-xl">•</span>
                          <span>{filterGenericText(point)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {outputTab === "interview" && (
              <div className="space-y-4">
                {!extras.interview ? (
                  <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                    {generating === "interview" ? (
                      <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                    ) : (
                      <MessageSquare className="text-gray-400 mx-auto mb-2" size={32} />
                    )}
                    <p className="text-gray-500">
                      {generating === "interview" ? "Generating interview questions..." : "Click to generate interview questions"}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Interview Questions</h2>
                    <ul className="space-y-3">
                      {extras.interview.questions?.map((q: string, i: number) => (
                        <li key={i} className="text-gray-700 flex gap-3 text-lg">
                          <span className="text-purple-600 font-bold">{i + 1}.</span>
                          <span>{filterGenericText(q)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div >
      </div >
    </div >
  );
}

function QuizQuestion({ index, data }: any) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleSelect = (option: string) => {
    if (selected) return; // Prevent changing answer
    setSelected(option);
    setShowAnswer(true);
  };

  const getOptionClass = (opt: string) => {
    if (!showAnswer) {
      return "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700";
    }
    if (opt === data.answer) {
      return "bg-green-100 border-green-500 text-green-900 font-medium";
    }
    if (selected === opt && opt !== data.answer) {
      return "bg-red-100 border-red-500 text-red-900";
    }
    return "bg-gray-50 border-gray-200 text-gray-400 opacity-60";
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex gap-3">
        <span className="bg-purple-100 text-purple-700 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm">
          Q{index + 1}
        </span>
        {data.question}
      </h3>

      <div className="space-y-3 pl-11">
        {data.options.map((opt: string, i: number) => {
          // Check if option starts with "A) " etc and strip it if needed, mainly for clean display
          const label = String.fromCharCode(65 + i);
          // Some LLMs include "A) " in the option text, causing double labeling. 
          // We'll just display the full text as returned by LLM to be safe, or we could strip.
          // For now, let's treat the option as the full answer text.
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
                    : "border-gray-300 text-gray-500"
                }
              `}>
                {label}
              </span>
              <span className="flex-1">{cleanOpt}</span>
              {showAnswer && label === data.answer && (
                <CheckCircle2 size={20} className="text-green-600" />
              )}
              {showAnswer && selected === label && label !== data.answer && (
                <XCircle size={20} className="text-red-600" />
              )}
            </button>
          )
        })}
      </div>

      {showAnswer && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="ml-11 mt-4 p-4 bg-blue-50 text-blue-900 rounded-lg text-sm border border-blue-100 flex gap-2 items-start"
        >
          <Info size={16} className="mt-0.5" />
          <div>
            <strong>Correct Answer: {data.answer}</strong>
            {/* We could ask LLM for explanation in future, for now just show answer */}
          </div>
        </motion.div>
      )}
    </div>
  );
}
