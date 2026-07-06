import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Sparkles, Quote as QuoteIcon } from "lucide-react";
import { articles } from "../data/quotes";
import { Article, Quote, MasterType } from "../types";

interface MeditativeBlogProps {
  onClose: () => void;
}

// Custom Scroll-Driven Character / Word Reveal component
interface ScrollRevealTextProps {
  text: string;
  mode: "chars" | "words";
  className?: string;
}

function ScrollRevealText({ text, mode, className }: ScrollRevealTextProps) {
  const items = mode === "chars" ? [...text] : text.split(" ");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: mode === "chars" ? 0.04 : 0.08, // Unhurried, deliberate pace
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 12,
      filter: "blur(5px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1], // Incredibly smooth, premium custom cubic bezier
      },
    },
  };

  return (
    <motion.span
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-12%" }}
      className={`inline-block ${className}`}
    >
      {items.map((item, i) => (
        <motion.span
          key={i}
          variants={itemVariants}
          className="inline-block whitespace-pre-wrap"
          style={{ marginRight: mode === "words" ? "0.32em" : "0.01em" }}
        >
          {item}
        </motion.span>
      ))}
    </motion.span>
  );
}

export default function MeditativeBlog({ onClose }: MeditativeBlogProps) {
  const [selectedArticleId, setSelectedArticleId] = useState<string>("lao-tzu");
  const [activeArticle, setActiveArticle] = useState<Article>(articles[0]);

  useEffect(() => {
    const found = articles.find((a) => a.id === selectedArticleId);
    if (found) {
      setActiveArticle(found);
    }
  }, [selectedArticleId]);

  // Map category to aesthetic traits
  const getThemeDetails = (type: MasterType) => {
    switch (type) {
      case "monk":
        return {
          bg: "bg-[#08080a] text-zinc-200",
          gradient: "from-[#141517] via-[#08080a] to-[#030304]",
          accent: "text-zinc-400 border-zinc-800",
          accentBg: "bg-zinc-900/40 border-zinc-800/40",
          label: "寂 — Zen Stillness & Sabi",
          symbol: "禅",
          desc: "A misty, raked-sand zen garden. Bamboo shadows, still water, and absolute focus.",
          glow: "rgba(161, 161, 170, 0.04)",
        };
      case "samurai":
        return {
          bg: "bg-[#050605] text-stone-200",
          gradient: "from-[#0a110d] via-[#050605] to-[#020302]",
          accent: "text-emerald-500 border-emerald-950",
          accentBg: "bg-emerald-950/10 border-emerald-900/20",
          label: "武 — Samurai Steel & Cedar Forests",
          symbol: "武",
          desc: "Ancient mountain range and towering red cedar grove under misty wind gusts.",
          glow: "rgba(16, 185, 129, 0.02)",
        };
      case "taoist":
        return {
          bg: "bg-[#030305] text-slate-200",
          gradient: "from-[#0d0a1a] via-[#030305] to-[#010102]",
          accent: "text-indigo-400 border-indigo-950/40",
          accentBg: "bg-indigo-950/15 border-indigo-900/20",
          label: "道 — The Boundless Fluid Tao",
          symbol: "道",
          desc: "An infinite celestial sky. Swirling mists, star dust, and quiet cosmic streams.",
          glow: "rgba(129, 140, 248, 0.03)",
        };
    }
  };

  const theme = getThemeDetails(activeArticle.type);

  return (
    <div id="meditativeSatoriScroll" className="fixed inset-0 z-50">
      {/* PRINCIPAL VIEW: SCROLL GARDEN (Now direct and seamless) */}
      <motion.div
        key="garden-scroll"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.0 }}
        className={`fixed inset-0 overflow-y-auto flex flex-col font-sans transition-all duration-700 ${theme.bg}`}
        style={{
          backgroundImage: `radial-gradient(circle at 50% 15%, ${theme.glow}, transparent 60%)`,
        }}
      >
        {/* Animated Environmental Mist Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            className={`absolute top-0 left-0 right-0 h-full bg-gradient-to-b ${theme.gradient} opacity-96 transition-all duration-1000`}
          />
          <motion.div
            animate={{
              x: ["-4%", "4%"],
              y: ["-2%", "2%"],
            }}
            transition={{
              repeat: Infinity,
              repeatType: "mirror",
              duration: 20,
              ease: "easeInOut",
            }}
            className="absolute -inset-[10%] opacity-[0.16] bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.02),transparent_45%)] pointer-events-none"
          />
        </div>

        {/* STICKY HEADER */}
        <header className="sticky top-0 z-50 w-full bg-black/40 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors cursor-pointer group"
            aria-label="Return to landing page"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Return to Portfolio</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded font-mono">
                Satori Scroll
              </span>
              <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">
                A MEDITATIVE EXPEDITION
              </span>
            </div>
          </div>
        </header>

        {/* MAIN LAYOUT */}
        <div className="relative flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-12 flex flex-col lg:flex-row gap-12">
          {/* LEFT SIDE PANEL: DISCOVERY SECTOR */}
          <div className="w-full lg:w-[320px] lg:shrink-0 space-y-8 flex flex-col">
            {/* Visual Stamp representing category */}
            <div className="hidden lg:flex justify-center items-center w-28 h-28 rounded-2xl border border-white/10 bg-white/[0.02] mx-auto relative group overflow-hidden shadow-2xl">
              <span className="text-5xl font-serif text-white/10 group-hover:text-white/20 transition-all group-hover:scale-110 duration-500">
                {theme.symbol}
              </span>
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="space-y-4">
              <h1 className="text-lg font-serif text-white tracking-wide border-b border-white/10 pb-2">
                The Master Scrolls
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Choose a philosophical path of ancient wisdom. Let your mind unhurriedly follow the calligraphy strokes and English insights.
              </p>
            </div>

            {/* Master Selector List */}
            <nav className="space-y-2" aria-label="Master scrolls selection">
              {articles.map((art) => {
                const isActive = art.id === selectedArticleId;
                const artTheme = getThemeDetails(art.type);
                return (
                  <button
                    key={art.id}
                    onClick={() => setSelectedArticleId(art.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all duration-500 flex items-center justify-between cursor-pointer ${
                      isActive
                        ? "bg-white/[0.03] border-orange-500/30 text-white shadow-[0_4px_24px_rgba(249,115,22,0.05)] scale-[1.02]"
                        : "bg-transparent border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-serif font-bold text-orange-400 w-6 text-center">
                        {artTheme.symbol}
                      </span>
                      <div className="text-left">
                        <span className="block text-xs font-medium tracking-wide uppercase">
                          {art.master.split(" — ")[0]}
                        </span>
                        <span className="block text-[10px] text-zinc-500 font-mono italic">
                          {artTheme.label.split(" — ")[1] || artTheme.label}
                        </span>
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[9px] font-mono text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded bg-orange-500/5">
                        ACTIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Path description block */}
            <div className="hidden lg:block bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-orange-400 block">
                {theme.label}
              </span>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {theme.desc}
              </p>
            </div>
          </div>

          {/* RIGHT SIDE PANEL: THE FOG-TO-INK SCROLL */}
          <div className="flex-1 space-y-12">
            {/* Article Header Card */}
            <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-8 space-y-4 relative overflow-hidden">
              <span className="text-[10px] font-mono text-orange-400 tracking-widest uppercase block">
                {activeArticle.era} · {activeArticle.type.toUpperCase()} PATH
              </span>
              <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight leading-tight">
                {activeArticle.title}
              </h2>
              <p className="text-sm md:text-base text-zinc-400 italic">
                “{activeArticle.subtitle}”
              </p>
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/[0.01] rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Quotes List with scroll reveals */}
            <div className="space-y-16">
              {activeArticle.quotes.map((q, idx) => (
                <motion.article
                  key={q.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-12%" }}
                  className="group relative pl-0 md:pl-8 space-y-6 border-b border-white/[0.04] pb-12 overflow-hidden"
                >
                  {/* Floating Watermark Quote Stamp */}
                  <div className="absolute top-0 right-0 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity duration-700 pointer-events-none select-none">
                    <QuoteIcon className="w-24 h-24 text-white" />
                  </div>

                  {/* Header Line */}
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-orange-400/40 group-hover:text-orange-400 transition-colors duration-300">
                      Quote {String(idx + 1).padStart(2, "0")} / 10
                    </span>
                    <div className="h-px bg-white/[0.06] flex-1" />
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {q.source}
                    </span>
                  </div>

                  {/* ORIGINAL LANGUAGE - GRACEFUL CHARACTER-BY-CHARACTER RENDER ON SCROLL */}
                  <div className="space-y-3">
                    <ScrollRevealText
                      text={q.original}
                      mode="chars"
                      className="text-xl md:text-2xl font-serif text-white leading-relaxed tracking-wide font-normal block"
                    />
                  </div>

                  {/* TRANSLATION - WORD-BY-WORD RENDER ON SCROLL */}
                  <div className="pl-4 border-l-2 border-orange-500/20 py-1">
                    <ScrollRevealText
                      text={q.english}
                      mode="words"
                      className="text-xs md:text-sm text-zinc-300 leading-relaxed italic block"
                    />
                  </div>

                  {/* INSIGHT */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-8%" }}
                    transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.03] rounded-xl p-4 transition-all duration-300"
                  >
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-orange-400 uppercase tracking-widest mb-1.5">
                      <Sparkles className="w-3 h-3 text-orange-400 animate-pulse" />
                      <span>The Insight</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {q.insight}
                    </p>
                  </motion.div>
                </motion.article>
              ))}
            </div>

            {/* End of Scroll Section */}
            <div className="text-center py-12 space-y-4">
              <span className="inline-block text-2xl font-serif text-white/20 select-none animate-pulse">円相</span>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                You have completed this scroll's path.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 border border-[#2b2b35] hover:border-white bg-[#0e0e11] hover:bg-white hover:text-black rounded-full font-sans text-xs tracking-widest uppercase text-white transition-all duration-300 cursor-pointer"
              >
                Return to Garden
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
