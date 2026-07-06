import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Sparkles } from "lucide-react";
import { ChatMessage } from "../types";

// Dynamic Typewriter Component for realistic, alive typing feeling
interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export function Typewriter({ text, speed = 10, onComplete }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    
    if (!text) return;

    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span className="transition-all duration-150">{displayedText}</span>;
}

export default function AiConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Welcome, traveler. I am Walizen's living assistant, channeling the spirits of Dōgen, Musashi, and Zatoichi. Whether you seek a simple wooden gate landing site, an immersive WebGL stream, or a grand full-stack temple, let us speak of your vision.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      if (response.ok && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: `reply-${Date.now()}`,
            role: "assistant",
            content: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        throw new Error(data.error || "Communication blocked by mountain clouds.");
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "The stream is temporarily blocked. Please send your word directly to our master at ceo@walizen.com.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const presets = [
    { label: "Brochure Plan", prompt: "Explain the features and pricing of 'The Simple Wooden Gate' brochure plan." },
    { label: "WebGL Stream", prompt: "Explain 'The Flowing Stream' immersive WebGL package and custom pricing." },
    { label: "Full-Stack Temple", prompt: "Explain 'The Grand Market Temple' e-commerce full-stack system capabilities." },
    { label: "Zen Koan", prompt: "Give me an inspiring Zen koan or samurai story about digital creations." },
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        id="aiConciergeTrigger"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#0a0b0d] hover:bg-[#121418] border border-white/10 text-white px-5 py-3.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group"
        aria-label="Toggle Walizen Assistant"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <MessageSquare className="w-4.5 h-4.5 text-zinc-300 group-hover:text-emerald-400 transition-colors" />
        <span className="font-sans text-xs tracking-widest uppercase font-medium">Speak with Walizen</span>
      </button>

      {/* Sleek Floating Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 w-[calc(100vw-48px)] sm:w-[390px] h-[550px] max-h-[80vh] bg-[#0c0d0f]/95 border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] flex flex-col z-50 backdrop-blur-xl overflow-hidden"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.03) 0%, transparent 70%)"
            }}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <span className="text-orange-400 text-xs font-serif font-bold">W</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-widest uppercase font-mono">Walizen Concierge</h3>
                  <span className="text-[10px] text-zinc-500 block italic leading-none mt-0.5">Dōgen · Musashi · Zatoichi</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[8px] text-emerald-400 font-mono tracking-wider uppercase">ONLINE</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-full cursor-pointer"
                  aria-label="Close Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none bg-[#07080a]/30">
              {messages.map((msg, idx) => {
                const isLatestAssistantMessage = msg.role === "assistant" && idx === messages.length - 1;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all duration-300 ${
                        msg.role === "user"
                          ? "bg-white/[0.03] text-zinc-100 rounded-tr-none border border-white/10 shadow-md"
                          : "bg-black/40 text-zinc-300 rounded-tl-none border border-white/5 shadow-sm"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="text-[9px] text-orange-400 font-mono tracking-widest uppercase mb-1 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>WALIZEN SPIRIT</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {isLatestAssistantMessage ? (
                          <Typewriter text={msg.content} speed={10} />
                        ) : (
                          msg.content
                        )}
                      </p>
                    </div>
                    <span className="text-[8px] text-zinc-600 font-mono mt-1 px-1.5">
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex flex-col items-start max-w-[85%] mr-auto">
                  <div className="p-3 bg-black/40 text-orange-400 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2 shadow-md">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                    </span>
                    <span className="text-[9px] font-mono tracking-widest uppercase animate-pulse">
                      Writing Insight...
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Presets Row */}
            <div className="px-4 py-2 border-t border-white/5 bg-black/10 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(preset.prompt)}
                  className="bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/5 rounded-full px-3 py-1.5 text-[10px] font-sans font-medium transition-all whitespace-nowrap cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                  handleSendMessage(input);
                }
              }}
              className="p-3 bg-black/20 border-t border-white/5 flex gap-2 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your query here..."
                className="flex-1 bg-white/[0.02] border border-white/10 text-white placeholder-zinc-600 text-xs sm:text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500/40 transition-colors"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-black p-2.5 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                aria-label="Send messenger"
              >
                <Send className="w-3.5 h-3.5 text-black" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
