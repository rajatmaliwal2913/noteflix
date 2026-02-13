"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Download, MessageSquare, Send,
  Loader2, Sparkles, FileQuestion, Zap, BookOpen, FileText, Home
} from "lucide-react";
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

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{role: "user" | "assistant", content: string}>>([]);
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

  const generateExtra = async (type: "tldr" | "quiz" | "flashcards" | "interview") => {
    if (extras[type]) return;
    
    setGenerating(type);
    try {
      const notesText = data.notes.map((n: any) => 
        `${n.title}\n${n.notes.explanation}\n${n.notes.bullet_notes.join("\n")}`
      ).join("\n\n");

      const response = await fetch(`http://127.0.0.1:8000/generate-${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes_text: notesText }),
      });

      if (!response.ok) throw new Error("Generation failed");
      const result = await response.json();
      
      setExtras((prev: any) => ({ ...prev, [type]: result }));
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
        if (isBold) {
          doc.setFont(undefined, "bold");
        } else {
          doc.setFont(undefined, "normal");
        }
        
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
        data.notes?.forEach((section: any) => {
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
        addText("Flashcards", 18, true);
        yPos += 10;
        extras.flashcards.flashcards?.forEach((card: any, i: number) => {
          addText(`Card ${i + 1}`, 14, true);
          yPos += 5;
          addText(`Q: ${card.question}`, 12);
          yPos += 3;
          addText(`A: ${card.answer}`, 12);
          yPos += 8;
        });
      } else if (outputTab === "tldr" && extras.tldr) {
        addText("TLDR Summary", 18, true);
        yPos += 10;
        extras.tldr.tldr?.forEach((point: string) => {
          addText(`• ${filterGenericText(point)}`, 12);
          yPos += 5;
        });
      } else if (outputTab === "interview" && extras.interview) {
        addText("Interview Questions", 18, true);
        yPos += 10;
        extras.interview.questions?.forEach((q: string, i: number) => {
          addText(`${i + 1}. ${filterGenericText(q)}`, 12);
          yPos += 5;
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
      {/* Background glow */}
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
            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium transition shadow-lg">
              + New
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 flex gap-6 h-[calc(100vh-73px)] relative z-10">
        {/* LEFT COLUMN - Video & Chatbot */}
        <div className="w-1/2 flex flex-col h-full">
          {/* Video Preview */}
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
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === "user"
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
                  if (tab.id !== "notes" && !extras[tab.id]) {
                    generateExtra(tab.id);
                  }
                }}
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition relative ${
                  outputTab === tab.id
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
                {data.notes && Array.isArray(data.notes) && data.notes.length > 0 ? (
                  data.notes.map((section: any, idx: number) => {
                    if (!section) {
                      return (
                        <div key={idx} className="border-b-2 border-purple-200 pb-4">
                          <div className="flex items-center gap-3">
                            <Loader2 className="animate-spin text-purple-600" size={20} />
                            <span className="text-gray-500 italic">Generating notes...</span>
                          </div>
                        </div>
                      );
                    }
                    
                    if (!section.notes || typeof section.notes !== 'object') {
                      return (
                        <div key={idx} className="border-b-2 border-purple-200 pb-4">
                          <h2 className="text-3xl font-bold text-gray-900 mb-4">{section.title || "Untitled"}</h2>
                          <div className="text-gray-500 italic">Generating notes...</div>
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
                    <p>Generating AI notes... This may take a few seconds.</p>
                  </div>
                )}
              </div>
            )}

            {outputTab === "quiz" && (
              <div className="space-y-4">
                {!extras.quiz ? (
                  <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                    {generating === "quiz" ? (
                      <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                    ) : (
                      <FileQuestion className="text-gray-400 mx-auto mb-2" size={32} />
                    )}
                    <p className="text-gray-500">
                      {generating === "quiz" ? "Generating quiz..." : "Click to generate quiz"}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Quiz</h2>
                    <div className="space-y-6">
                      {extras.quiz.quiz?.map((q: any, i: number) => (
                        <div key={i} className="border-l-4 border-purple-500 pl-4">
                          <p className="text-gray-900 font-medium mb-3 text-lg">{q.question}</p>
                          <div className="space-y-2">
                            {q.options?.map((opt: string, j: number) => (
                              <div key={j} className="text-gray-700 text-base">
                                {String.fromCharCode(65 + j)}. {opt}
                              </div>
                            ))}
                          </div>
                          <p className="text-purple-600 text-base mt-3 font-medium">Answer: {q.answer}</p>
                        </div>
                      ))}
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
                      <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                    ) : (
                      <FileText className="text-gray-400 mx-auto mb-2" size={32} />
                    )}
                    <p className="text-gray-500">
                      {generating === "flashcards" ? "Generating flashcards..." : "Click to generate flashcards"}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 shadow-lg">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Flashcards</h2>
                    <div className="space-y-4">
                      {extras.flashcards.flashcards?.map((card: any, i: number) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-5 bg-gray-50 hover:shadow-md transition">
                          <p className="text-gray-900 font-medium mb-2 text-lg">Q: {card.question}</p>
                          <p className="text-gray-600 text-base">A: {card.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {outputTab === "tldr" && (
              <div className="space-y-4">
                {!extras.tldr ? (
                  <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                    {generating === "tldr" ? (
                      <Loader2 className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                    ) : (
                      <Zap className="text-gray-400 mx-auto mb-2" size={32} />
                    )}
                    <p className="text-gray-500">
                      {generating === "tldr" ? "Generating TLDR..." : "Click to generate TLDR"}
                    </p>
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
        </div>
      </div>
    </div>
  );
}
