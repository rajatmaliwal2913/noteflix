"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, Download, FileQuestion, FileText, Home,
  MessageSquare, Send, Sparkles, Zap, ChevronLeft, ChevronRight,
  Edit2, Save, X, Loader2, CheckCircle2, XCircle, Info, Brain, RotateCw,
  Star, Search, Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import YouTube from "react-youtube";
import { API_URL } from "@/lib/api";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";


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

function NoteContent({ text, videoId }: { text: string; videoId: string }) {
  if (!text) return null;

  const parts = String(text).split(/(\[\[VISUAL:\d+\]\])/g);

  return (
    <>
      {parts.map((part, i) => {
        const visualMatch = part.match(/\[\[VISUAL:(\d+)\]\]/);
        if (visualMatch) {
          const timestamp = visualMatch[1];
          const imageUrl = `${API_URL}/static/visuals/${videoId}/frame_${timestamp}.jpg`;
          return (
            <div key={i} className="my-6 rounded-2xl overflow-hidden border border-border shadow-md bg-muted/10" style={{ width: '100%' }}>
              <img
                src={imageUrl}
                alt={`Visual at ${timestamp}s`}
                className="w-full h-auto object-cover"
                style={{ maxHeight: '500px', display: 'block' }}
                onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
              />
            </div>
          );
        }
        const filteredPart = filterGenericText(part);
        if (!filteredPart) return null;
        return <span key={i} dangerouslySetInnerHTML={{ __html: filteredPart }} />;
      })}
    </>
  );
}

function SavedNotesRenderer({ html, videoId, onRemove }: { html: string; videoId: string; onRemove: (timestamp: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const processedHtml = String(html).replace(/\[\[VISUAL:(\d+)\]\]/g, (match, timestamp) => {
    const url = `${API_URL}/static/visuals/${videoId}/frame_${timestamp}.jpg`;
    return `
      <div class="visual-card" data-visual-ts="${timestamp}" style="position:relative; width:100%; margin:24px 0; border-radius:16px; overflow:hidden; border:1px solid var(--border, #e5e7eb); box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <img src="${url}" alt="Snapshot at ${timestamp}s" style="width:100%; height:auto; max-height:500px; object-fit:cover; display:block;" />
        <button class="visual-delete-btn" data-delete-ts="${timestamp}" style="position:absolute; top:12px; right:12px; width:36px; height:36px; background:rgba(220,38,38,0.9); color:white; border:none; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; z-index:99; box-shadow:0 2px 8px rgba(0,0,0,0.3);" title="Delete Snapshot">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
        <div style="position:absolute; bottom:0; left:0; right:0; padding:10px 14px; background:linear-gradient(to top, rgba(0,0,0,0.6), transparent); color:white; font-size:11px; opacity:0; transition:opacity 0.2s;" class="visual-overlay">
          Visual Snapshot • ${Math.floor(Number(timestamp) / 60)}:${(Number(timestamp) % 60).toString().padStart(2, '0')}
        </div>
      </div>
    `;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMouseOver = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest('.visual-card');
      if (card) {
        const btn = card.querySelector('.visual-delete-btn') as HTMLElement;
        const overlay = card.querySelector('.visual-overlay') as HTMLElement;
        if (btn) btn.style.opacity = '1';
        if (overlay) overlay.style.opacity = '1';
      }
    };
    const handleMouseOut = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest('.visual-card');
      if (card) {
        const btn = card.querySelector('.visual-delete-btn') as HTMLElement;
        const overlay = card.querySelector('.visual-overlay') as HTMLElement;
        if (btn) btn.style.opacity = '0';
        if (overlay) overlay.style.opacity = '0';
      }
    };

    const handleClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.visual-delete-btn') as HTMLElement;
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const ts = btn.getAttribute('data-delete-ts');
        if (ts && window.confirm('Remove this snapshot?')) {
          onRemove(ts);
        }
      }
    };

    el.addEventListener('mouseover', handleMouseOver);
    el.addEventListener('mouseout', handleMouseOut);
    el.addEventListener('click', handleClick);

    return () => {
      el.removeEventListener('mouseover', handleMouseOver);
      el.removeEventListener('mouseout', handleMouseOut);
      el.removeEventListener('click', handleClick);
    };
  }, [processedHtml, onRemove]);

  return (
    <div
      ref={containerRef}
      className="ql-editor"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}

function Flashcard({ data, index, total }: any) {
  const [isFlipped, setIsFlipped] = useState(false);

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
        { }
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

        { }
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

function NotesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoIdFromUrl = searchParams.get("v");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [stableVideoId, setStableVideoId] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("noteflix_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed);
        setLoading(false);
        if (parsed?.metadata?.video_id && !stableVideoId) {
          setStableVideoId(parsed.metadata.video_id);
        }
      } catch (e) { }
    }
    setHydrated(true);
  }, []);
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
  const [processingStatus, setProcessingStatus] = useState("");

  const [flashcardIndex, setFlashcardIndex] = useState(0);

  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant", content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
  const quillRef = useRef<any>(null);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleCaptureFrame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoIdFromUrl, data, isEditing, isSnapshotLoading]);

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

      if (videoIdFromUrl) {
        setStableVideoId(videoIdFromUrl);
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
            if (lectureData.notes_data?.metadata?.video_id) {
              setStableVideoId(lectureData.notes_data.metadata.video_id);
            }
            return;
          }
        }
      }

      const saved = localStorage.getItem("noteflix_data");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData(parsed);
          setLoading(false);
          if (parsed?.metadata?.video_id) {
            setStableVideoId(parsed.metadata.video_id);
          }
        } catch (e) {
          console.error("Failed to parse saved data", e);
        }
      }
    }

    loadInitialData();

    const handleSectionsReady = (e: CustomEvent) => {
      const count = e.detail.count;
      setData((prevData: any) => {

        const savedData = localStorage.getItem("noteflix_data");
        const currentData = savedData ? JSON.parse(savedData) : (prevData ? { ...prevData } : {});
        if (!currentData.notes || currentData.notes.length === 0) {
          currentData.notes = new Array(count).fill(null);
          localStorage.setItem("noteflix_data", JSON.stringify(currentData));
        }
        setLoading(false);
        return currentData;
      });
    };

    const handleNoteStreamed = (e: CustomEvent) => {
      const { note, index } = e.detail;
      setData((prevData: any) => {
        const savedData = localStorage.getItem("noteflix_data");
        const currentData = savedData ? JSON.parse(savedData) : (prevData || {});

        if (!currentData.notes) {
          currentData.notes = [];
        }

        while (currentData.notes.length <= index) {
          currentData.notes.push(null);
        }

        currentData.notes[index] = note;

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

    const handleNotesUpdate = async (e: CustomEvent) => {
      const completeData = e.detail;
      setData(completeData);
      setLoading(false);
      localStorage.setItem("noteflix_data", JSON.stringify(completeData));

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

    const handleProcessingStatus = (e: CustomEvent) => {
      setProcessingStatus(e.detail.message);
    };

    window.addEventListener("sectionsReady", handleSectionsReady as unknown as EventListener);
    window.addEventListener("noteStreamed", handleNoteStreamed as unknown as EventListener);
    window.addEventListener("notesUpdated", handleNotesUpdate as unknown as EventListener);
    window.addEventListener("processingStatus", handleProcessingStatus as unknown as EventListener);

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
      window.removeEventListener("sectionsReady", handleSectionsReady as unknown as EventListener);
      window.removeEventListener("noteStreamed", handleNoteStreamed as unknown as EventListener);
      window.removeEventListener("notesUpdated", handleNotesUpdate as unknown as EventListener);
      window.removeEventListener("processingStatus", handleProcessingStatus as unknown as EventListener);
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
      const response = await fetch(`${API_URL}/chat`, {
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

  const handleCaptureFrame = async () => {
    if (!playerRef.current || isSnapshotLoading) return;

    setIsSnapshotLoading(true);
    const player = playerRef.current.getInternalPlayer();
    const timestamp = await player.getCurrentTime();

    try {
      const response = await fetch(`${API_URL}/capture-frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          video_id: videoId,
          timestamp: timestamp
        }),
      });

      if (!response.ok) throw new Error("Capture failed");
      const result = await response.json();
      const imageUrl = `${API_URL}/static/visuals/${videoId}/frame_${Math.floor(timestamp)}.jpg`;

      const visualTag = `\n[[VISUAL:${Math.floor(timestamp)}]]\n`;
      let newEditedContent = editedNotes || convertNotesToHtml();

      if (isEditing && quillRef.current) {
        const editor = quillRef.current.getEditor();
        const selection = editor.getSelection();
        const insertIndex = selection ? selection.index : editor.getLength();
        editor.insertEmbed(insertIndex, 'image', imageUrl);
        editor.setSelection(insertIndex + 1);
        newEditedContent = editor.root.innerHTML;
      } else {

        newEditedContent = (newEditedContent || "") + visualTag;
      }

      const savedHtml = transformImagesToTags(newEditedContent);
      const updatedData = { ...data, editedNotes: savedHtml };

      setEditedNotes(transformTagsToImages(newEditedContent));
      setData(updatedData);
      localStorage.setItem("noteflix_data", JSON.stringify(updatedData));

      await updateDatabase(updatedData);

      if (!isEditing) {
        alert("Snapshot captured and saved!");
      }
    } catch (err) {
      console.error("Capture error:", err);
      alert("Failed to capture snapshot");
    } finally {
      setIsSnapshotLoading(false);
    }
  };

  const handleRemoveVisual = async (timestamp: string) => {
    if (!window.confirm("Are you sure you want to remove this visual?")) return;

    let updatedContent = "";

    if (editedNotes) {
      const tagRegex = new RegExp(`\\[\\[VISUAL:${timestamp}\\]\\]`, 'g');
      const imgRegex = new RegExp(`<img[^>]*src="[^"]*\/static\/visuals\/[^"]*\/frame_${timestamp}\.jpg"[^>]*>`, 'g');
      updatedContent = editedNotes.replace(tagRegex, "").replace(imgRegex, "");
      setEditedNotes(updatedContent);

      const updatedData = { ...data, editedNotes: transformImagesToTags(updatedContent) };
      setData(updatedData);
      localStorage.setItem("noteflix_data", JSON.stringify(updatedData));
      await updateDatabase(updatedData);
      return;
    }

    const updatedSections = data.notes?.map((section: any) => {
      if (!section) return null;
      let newExplanation = section.notes.explanation || "";
      const regex = new RegExp(`\\[\\[VISUAL:${timestamp}\\]\\]`, 'g');
      newExplanation = newExplanation.replace(regex, "");

      const newBullets = section.notes.bullet_notes?.map((b: string) => b.replace(regex, ""));

      return {
        ...section,
        notes: {
          ...section.notes,
          explanation: newExplanation,
          bullet_notes: newBullets
        }
      };
    });

    const updatedData = { ...data, notes: updatedSections };
    setData(updatedData);
    localStorage.setItem("noteflix_data", JSON.stringify(updatedData));
    await updateDatabase(updatedData);
  };

  const generateExtra = async (type: "tldr" | "quiz" | "flashcards" | "interview", force: boolean = false) => {

    if (["quiz", "flashcards", "interview"].indexOf(type) === -1) {
      console.log("Feature disabled");
      return;
    }

    if (!force && extras[type]) return;

    setGenerating(type);
    try {

      if (!data.notes || data.notes.length === 0) {
        alert("Please wait for notes to finish generating before creating a quiz.");
        return;
      }

      const notesText = data.notes
        .filter((n: any) => n)
        .map((n: any) =>
          `${n.title}\n${n.notes.explanation}\n${n.notes.bullet_notes.join("\n")}`
        ).join("\n\n");

      const language = data.metadata.language || "English";

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

      const seed = force ? Math.floor(Math.random() * 1000) : 0;

      const count = type === "flashcards" && data.sections ? data.sections.length : 5;

      const response = await fetch(`${API_URL}/generate-${type}`, {
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

  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to fetch image for PDF", e);
      return null;
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

      const addText = async (text: string, fontSize: number, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        if (isBold) doc.setFont("helvetica", "bold");
        else doc.setFont("helvetica", "normal");

        const segments = text.split(/(\[\[VISUAL:\d+\]\])/g);

        for (const segment of segments) {
          const visualMatch = segment.match(/\[\[VISUAL:(\d+)\]\]/);
          if (visualMatch) {
            const timestamp = visualMatch[1];
            const imageUrl = `${API_URL}/static/visuals/${videoId}/frame_${timestamp}.jpg`;
            const base64 = await fetchImageAsBase64(imageUrl);

            if (base64) {
              const imgWidth = 120;
              const imgHeight = 67;

              if (yPos + imgHeight > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
              }

              const xPos = margin + (maxWidth - imgWidth) / 2;
              doc.addImage(base64, 'JPEG', xPos, yPos, imgWidth, imgHeight);
              yPos += imgHeight + 5;
            }
            continue;
          }

          const lines = doc.splitTextToSize(segment, maxWidth);
          if (yPos + lines.length * (fontSize * 0.4) > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
          }
          lines.forEach((line: string) => {
            if (!line.trim()) return;
            doc.text(line, margin, yPos);
            yPos += fontSize * 0.4;
          });
        }
      };

      await addText(data.metadata.title || "Notes", 20, true);
      yPos += 10;

      if (outputTab === "notes") {
        if (editedNotes) {
          const parser = new DOMParser();
          const docHtml = parser.parseFromString(editedNotes, 'text/html');
          const body = docHtml.body;

          const nodes = Array.from(body.children);
          for (const node of nodes) {
            const element = node as HTMLElement;
            const text = element.innerText || "";
            if (!text.trim() && !element.innerHTML.includes("[[VISUAL:")) continue;

            if (element.tagName === 'H1') {
              yPos += 5;
              await addText(text, 22, true);
              yPos += 8;
            } else if (element.tagName === 'H2') {
              yPos += 4;
              await addText(text, 18, true);
              yPos += 6;
            } else if (element.tagName === 'H3') {
              yPos += 2;
              await addText(text, 14, true);
              yPos += 5;
            } else if (element.tagName === 'P') {
              await addText(element.innerHTML.replace(/<[^>]*>/g, ""), 11);
              yPos += 5;
            } else if (element.tagName === 'UL' || element.tagName === 'OL') {
              const listItems = Array.from(element.children);
              for (const li of listItems) {
                const liText = (li as HTMLElement).innerText;
                await addText(`• ${liText}`, 11);
                yPos += 4;
              }
              yPos += 4;
            } else {
              await addText(text, 11);
              yPos += 5;
            }
          }
        } else {
          for (const section of (data.notes || [])) {
            if (!section) continue;
            await addText(section.title, 16, true);
            yPos += 5;

            if (section.notes?.explanation) {
              await addText(filterGenericText(section.notes.explanation), 12);
              yPos += 5;
            }

            if (section.notes?.bullet_notes && section.notes.bullet_notes.length > 0) {
              for (const point of section.notes.bullet_notes) {
                await addText(`• ${filterGenericText(point)}`, 12);
                yPos += 3;
              }
            }
            yPos += 5;
          }
        }
      } else if (outputTab === "quiz" && extras.quiz) {
        await addText("Quiz Questions", 18, true);
        yPos += 10;
        for (let i = 0; i < extras.quiz.quiz?.length; i++) {
          const q = extras.quiz.quiz[i];
          await addText(`Question ${i + 1}: ${q.question}`, 14, true);
          yPos += 5;
          for (let j = 0; j < q.options?.length; j++) {
            const opt = q.options[j];
            await addText(`${String.fromCharCode(65 + j)}. ${opt}`, 12);
            yPos += 3;
          }
          await addText(`Answer: ${q.answer}`, 12, true);
          yPos += 8;
        }
      } else if (outputTab === "interview" && extras.interview) {
        await addText("Interview Preparation", 18, true);
        yPos += 10;
        for (let i = 0; i < extras.interview.questions?.length; i++) {
          const q = extras.interview.questions[i];
          await addText(`${i + 1}. Q: ${q.question}`, 13, true);
          yPos += 5;
          await addText(`A: ${q.answer}`, 12);
          yPos += 8;
        }
      } else if (outputTab === "flashcards" && extras.flashcards) {
        for (let i = 0; i < extras.flashcards.flashcards?.length; i++) {
          const card = extras.flashcards.flashcards[i];
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
        }
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

  const transformTagsToImages = (html: string) => {
    if (!html) return "";

    return html.replace(/\[\[VISUAL:(\d+)\]\]/g, (match, timestamp) => {
      const url = `${API_URL}/static/visuals/${videoId}/frame_${timestamp}.jpg`;
      return `<img src="${url}" style="max-width: 100%; border-radius: 12px; margin: 12px 0; display: block; cursor: grab;" />`;
    });
  };

  const transformImagesToTags = (html: string) => {
    if (!html) return "";

    return html.replace(/<img[^>]*src="[^"]*\/static\/visuals\/[^"]*\/frame_(\d+)\.jpg"[^>]*>/g, '[[VISUAL:$1]]');
  };

  const convertNotesToHtml = () => {
    if (!data?.notes) return "";
    let html = "";
    if (data.metadata?.title) html += `<h1>${data.metadata.title}</h1>`;

    data.notes?.forEach((section: any) => {
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

  useEffect(() => {
    if (data?.editedNotes && !editedNotes) {
      setEditedNotes(transformTagsToImages(data.editedNotes));
    }
  }, [data, hydrated, transformTagsToImages]);

  const updateDatabase = async (updatedData: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && updatedData.metadata?.video_id) {
      const video_id = updatedData.metadata.video_id;

      await supabase.from("lectures").update({
        notes_data: updatedData
      }).eq("user_id", session.user.id).eq("video_id", video_id);

      await supabase.from("bookmarks").update({
        notes_data: updatedData
      }).eq("user_id", session.user.id).eq("video_id", video_id);
    }
  };

  const handleEditToggle = () => {
    if (!isEditing) {

      let contentToLoad = editedNotes || data?.editedNotes || convertNotesToHtml();
      setEditedNotes(transformTagsToImages(contentToLoad));
    }
    setIsEditing(!isEditing);
  };

  const handleSaveNotes = async () => {
    setIsEditing(false);

    const savedHtml = transformImagesToTags(editedNotes || "");
    const updatedData = { ...data, editedNotes: savedHtml };

    setData(updatedData);
    localStorage.setItem("noteflix_data", JSON.stringify(updatedData));

    await updateDatabase(updatedData);
  };

  const videoId = stableVideoId || data?.metadata?.video_id || "";

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      { }
      <Sidebar />

      { }
      <div className="flex-1 relative z-10 transition-all duration-300 overflow-y-auto">
        {loading && !data ? (
          <div className="h-full flex items-center justify-center p-20">
            <div className="text-center">
              <Loader2 className="animate-spin text-purple-600 mx-auto mb-4" size={48} />
              <p className="text-foreground-muted animate-pulse">{processingStatus || "Loading your lecture knowledge..."}</p>
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
                <div className="flex flex-col gap-4 mb-4">
                  <div className="relative rounded-2xl overflow-hidden bg-card shadow-lg border border-border group">
                    {videoId ? (
                      <YouTube
                        videoId={videoId}
                        ref={playerRef}
                        className="w-full aspect-video"
                        opts={{
                          width: '100%',
                          height: '100%',
                          playerVars: {
                            autoplay: 0,
                          },
                        }}
                      />
                    ) : (
                      <div className="w-full h-full aspect-video flex items-center justify-center bg-gray-100">
                        <Sparkles className="text-gray-400" size={48} />
                      </div>
                    )}
                  </div>

                  {videoId && (
                    <div className="flex items-center justify-between px-2 bg-muted/20 p-3 rounded-xl border border-border">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-foreground">Visual Capture Controls</p>
                        <p className="text-[10px] text-foreground-muted italic">Click button or press <b>Alt + S</b> to snap important moments</p>
                      </div>
                      <button
                        onClick={handleCaptureFrame}
                        disabled={isSnapshotLoading}
                        className="relative overflow-hidden group/btn px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500" />
                        {isSnapshotLoading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} className="fill-current text-yellow-300" />}
                        <span className="font-semibold text-sm">
                          {isSnapshotLoading ? "Capturing..." : "Capture Frame"}
                        </span>
                      </button>
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
                    <div className="space-y-3">
                      <button
                        onClick={handleEditToggle}
                        className={`w-full px-4 py-3 rounded-xl border flex items-center justify-center gap-2 transition font-medium text-sm ${isEditing ? "bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500/20" : "bg-card border-purple-200/20 text-purple-600 hover:bg-purple-500/5"}`}
                      >
                        {isEditing ? <X size={16} /> : <Edit2 size={16} />}
                        {isEditing ? "Cancel Editing" : "Edit Notes"}
                      </button>

                      {isEditing && (
                        <button
                          onClick={handleCaptureFrame}
                          disabled={isSnapshotLoading}
                          className="w-full px-4 py-3 rounded-xl bg-purple-600/10 border border-purple-200/20 text-purple-600 hover:bg-purple-600/20 transition font-medium text-sm flex items-center justify-center gap-2"
                        >
                          {isSnapshotLoading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} className="text-yellow-500" />}
                          Insert Snapshot at Playhead
                        </button>
                      )}
                    </div>
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
                            // @ts-ignore
                            ref={quillRef}
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

                          {/* Snapshot Management in Edit Mode */}
                          <div className="mt-12 pt-8 border-t border-border">
                            <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                              <Zap size={18} className="text-purple-600" />
                              Snapshots in this lecture
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {(() => {
                                // Extract timestamps from editedNotes or raw notes
                                const content = editedNotes || convertNotesToHtml();
                                const snapshots = Array.from(content.matchAll(/\[\[VISUAL:(\d+)\]\]/g)).map(m => m[1]);
                                // Also check for img tags if in Quill
                                const imgSnapshots = Array.from(content.matchAll(/frame_(\d+)\.jpg/g)).map(m => m[1]);
                                const uniqueSnapshots = Array.from(new Set([...snapshots, ...imgSnapshots]));

                                if (uniqueSnapshots.length === 0) {
                                  return <p className="text-foreground-muted text-sm italic col-span-full">No snapshots captured yet.</p>;
                                }

                                return uniqueSnapshots.map(ts => (
                                  <div key={ts} className="group relative aspect-video rounded-xl border border-border overflow-hidden bg-muted">
                                    <img
                                      src={`${API_URL}/static/visuals/${videoId}/frame_${ts}.jpg`}
                                      alt="Snapshot"
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        onClick={() => handleRemoveVisual(ts)}
                                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
                                        title="Delete Snapshot"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded backdrop-blur-sm">
                                      {Math.floor(Number(ts) / 60)}:{(Number(ts) % 60).toString().padStart(2, '0')}
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {editedNotes ? (
                            <div className="ql-snow">
                              <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-8 border border-border shadow-lg">
                                <SavedNotesRenderer html={editedNotes} videoId={videoId} onRemove={handleRemoveVisual} />
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Overall generating indicator when no notes exist yet */}
                              {(!data.notes || data.notes.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-16 px-8">
                                  <div className="relative mb-8">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-xl shadow-purple-500/20">
                                      <Loader2 className="animate-spin text-white" size={36} />
                                    </div>
                                    <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-400/20 to-blue-400/20 animate-pulse" />
                                  </div>
                                  <h3 className="text-2xl font-bold text-foreground mb-3">Generating Your Notes</h3>
                                  <p className="text-foreground-muted text-center text-lg mb-4 max-w-md">
                                    {processingStatus || "AI is analyzing the lecture and creating structured notes for you..."}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                                    <Sparkles size={16} className="animate-pulse" />
                                    <span>Please wait, this may take a moment</span>
                                    <span className="inline-flex">
                                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                                    </span>
                                  </div>
                                </div>
                              )}
                              {data.notes?.map((section: any, idx: number) => {
                                if (!section) {
                                  return (
                                    <div key={idx} className="bg-card/50 backdrop-blur-xl rounded-2xl p-8 border border-border shadow-lg animate-pulse">
                                      <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                                          <Loader2 className="animate-spin text-purple-500" size={16} />
                                        </div>
                                        <div className="text-lg font-semibold text-foreground/60">Chapter {idx + 1}</div>
                                      </div>
                                      <div className="space-y-3">
                                        <div className="h-4 bg-gradient-to-r from-purple-200/20 to-blue-200/20 rounded-full w-3/4" />
                                        <div className="h-4 bg-gradient-to-r from-purple-200/20 to-blue-200/20 rounded-full w-1/2" />
                                        <div className="h-4 bg-gradient-to-r from-purple-200/20 to-blue-200/20 rounded-full w-5/6" />
                                      </div>
                                      <p className="text-sm text-purple-500/80 mt-4 font-medium flex items-center gap-2">
                                        <Sparkles size={14} className="animate-pulse" />
                                        Generating notes...
                                      </p>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={idx}>
                                    <h2 className="text-3xl font-bold text-foreground mb-4 pb-2 border-b-2 border-purple-200/30">
                                      {section.title}
                                    </h2>
                                    <div className="text-foreground/80 mb-6 leading-relaxed text-lg">
                                      <NoteContent text={String(section.notes.explanation)} videoId={videoId} />
                                    </div>
                                    {section.notes?.bullet_notes?.length > 0 && (
                                      <ul className="space-y-4 mb-8">
                                        {section.notes.bullet_notes.map((point: any, i: number) => (
                                          <li key={i} className="flex flex-col gap-2">
                                            <div className="flex gap-3 text-foreground/80 text-lg">
                                              <span className="text-purple-600 mt-1 font-bold text-xl inline-block shrink-0">•</span>
                                              <div className="flex-1">
                                                <NoteContent text={String(point)} videoId={videoId} />
                                              </div>
                                            </div>
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

export default function NotesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-purple-600" size={40} />
          <p className="text-foreground-muted animate-pulse">Loading workspace...</p>
        </div>
      </div>
    }>
      <NotesPageContent />
    </Suspense>
  );
}
