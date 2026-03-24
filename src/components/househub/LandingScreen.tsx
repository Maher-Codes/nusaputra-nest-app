import { useState, useEffect } from "react";
import { DoorOpen, ArrowRight, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LandingScreenProps {
  onSetup: () => void;
  onJoin:  () => void;
}


const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            entry.target.classList.remove("hidden-card");
          } else {
            // Remove revealed so it animates again next time
            entry.target.classList.remove("revealed");
            entry.target.classList.add("hidden-card");
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal-card").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
  // No dependency array — re-runs on every render so new cards are observed
};

const LandingScreen = ({ onSetup, onJoin }: LandingScreenProps) => {
  const { t } = useTranslation();
  const [openFaq,      setOpenFaq]      = useState<number | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstall,   setShowInstall]   = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const features = t('landing.features', { returnObjects: true }) as any[];
  const faqs = t('landing.faqs', { returnObjects: true }) as any[];
  const emojis = ["🏠", "🔑", "🧹", "🛒", "📋", "🔄"];
  
  const HOW_IT_WORKS = features.map((f, i) => ({ ...f, emoji: emojis[i] || "✨" }));
  const FAQS = faqs;

  useScrollReveal();

  useEffect(() => {
    const handleScroll = () => {
      const total    = document.documentElement.scrollHeight - window.innerHeight;
      const current  = window.scrollY;
      setScrollProgress(total > 0 ? (current / total) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setShowInstall(false);
  };

  const visibleSteps = showAllSteps ? HOW_IT_WORKS : HOW_IT_WORKS.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-background animate-fade-in relative overflow-x-hidden">
      {/* Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 z-50 h-0.5 bg-primary transition-all duration-100"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden" style={{
        background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)",
        padding: "60px 24px 80px 24px",
      }}>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #D4A373, transparent)" }} />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ffffff, transparent)" }} />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #D4A373, transparent)" }} />

        <div className="relative z-10 text-center max-w-md mx-auto">
          {/* University logo — full color, floating */}
          <div className="mb-5 flex justify-center"
            style={{ animation: "float 4s ease-in-out infinite" }}>
            <img
              src="/nusa-putra-logo.png"
              alt="Nusa Putra University"
              className="nusa-logo h-20 w-auto"
              style={{
                filter: "brightness(0) saturate(100%) invert(78%) sepia(30%) saturate(500%) hue-rotate(5deg) brightness(95%)",
                opacity: 0.95,
              }}
            />
          </div>

          {/* NusaNest title in gold */}
          <h1
            className="font-display font-black tracking-tight mb-3"
            style={{
              fontSize: "52px",
              color: "#D4A373",
              animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 0ms both",
            }}
          >
            <span style={{ fontSize: "62px" }}>N</span>usaNest
          </h1>

          {/* Subtitle in white */}
          <p
            className="font-medium text-lg"
            style={{
              color: "rgba(255,255,255,0.85)",
              animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 100ms both",
            }}
          >
            {t('landing.subtitle', "Student Living, Simplified")}
          </p>

          {/* University name in gold */}
          <p
            className="text-xs font-black uppercase tracking-[0.2em] mt-2"
            style={{
              color: "#D4A373",
              opacity: 0.8,
              animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 150ms both",
            }}
          >
            {t('landing.university', "Universitas Nusa Putra")}
          </p>

          {/* Tagline pills */}
          <div
            className="flex justify-center gap-2 flex-wrap mt-5"
            style={{ animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 200ms both" }}
          >
            {["🧹 Clean", "🛒 Fair", "🏠 Together"].map(tag => (
              <span key={tag} style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.9)",
                fontSize: "12px",
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: "99px",
                border: "1px solid rgba(255,255,255,0.2)",
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col px-6 py-10 max-w-md mx-auto w-full">

        {/* CTA heading */}
        <p className="font-display font-bold text-xl mb-5 text-foreground text-center"
          style={{ animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 200ms both" }}>
          {t('landing.cta_question', "What would you like to do?")}
        </p>

        <div className="flex flex-col gap-3 mb-auto">
          {/* Setup button */}
          <div style={{ animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 250ms both" }}>
            <button
              className="group w-full p-5 rounded-3xl text-left flex items-center gap-4 active:scale-[0.96] transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #770042 0%, #5a0032 100%)",
                boxShadow: "0 8px 24px rgba(119,0,66,0.3)",
              }}
              onClick={onSetup}
            >
              <div className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: "rgba(255,255,255,0.15)", width: "52px", height: "52px" }}>
                <Sparkles size={26} strokeWidth={2.5} color="white" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-white mb-0.5">
                  {t('landing.setup_house_title', "Set up a new house")}
                </div>
                <div className="font-medium text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {t('landing.setup_house_desc', "Create your house and invite housemates")}
                </div>
              </div>
              <ArrowRight color="rgba(255,255,255,0.6)" size={22}
                className="transition-all duration-300 group-hover:translate-x-1.5 group-hover:opacity-100" />
            </button>
          </div>

          {/* Join button */}
          <div style={{ animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 350ms both" }}>
            <button
              className="group w-full p-5 rounded-3xl border-2 text-left flex items-center gap-4 active:scale-[0.96] hover:shadow-md transition-all duration-200"
              style={{
                borderColor: "rgba(119,0,66,0.25)",
                backgroundColor: "white",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#770042"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(119,0,66,0.25)"}
              onClick={onJoin}
            >
              <div className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: "rgba(119,0,66,0.08)", width: "52px", height: "52px" }}>
                <DoorOpen size={26} strokeWidth={2.5} color="#770042" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold mb-0.5" style={{ color: "#770042" }}>
                  {t('landing.join_house_title', "Join existing house")}
                </div>
                <div className="font-medium text-sm text-muted-foreground">
                  {t('landing.join_house_desc', "Enter your 6-digit house code")}
                </div>
              </div>
              <ArrowRight size={22} color="#770042" className="opacity-40 transition-all duration-300 group-hover:translate-x-1.5 group-hover:opacity-100" />
            </button>
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className="mt-14">
          <div className="text-center mb-6">
            <p className="text-[15px] font-semibold text-primary leading-relaxed mb-1">
              {t('landing.how_it_works_title', "New to NusaNest?")}
            </p>
            <p className="text-sm font-bold text-secondary uppercase tracking-widest">
              {t('landing.how_it_works_subtitle', "Here's how it works")}
            </p>
          </div>

          {/* Step cards — repeat on scroll */}
          <div className="flex flex-col gap-3">
            {visibleSteps.map((item, i) => (
              <div
                key={i}
                className="reveal-card group flex items-start gap-4 p-4 rounded-3xl border-2 border-border bg-card cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-xl group-hover:-translate-y-1 group-hover:shadow-lg transition-all duration-300">
                  {item.emoji}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-bold text-[15px] text-foreground mb-1 transition-colors group-hover:text-primary">{item.title}</p>
                  <p className="text-[14px] font-medium text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            className="mt-4 w-full py-3 rounded-3xl border-2 border-dashed border-primary/30 text-primary font-semibold text-[14px] flex items-center justify-center gap-1.5 hover:bg-primary/5 hover:border-primary/50 active:scale-[0.98] transition-all duration-300"
            onClick={() => setShowAllSteps(v => !v)}
          >
            {showAllSteps
              ? <><ChevronUp size={14} /> {t('landing.show_less', "Show less")}</>
              : <><ChevronDown size={14} /> {t('landing.show_more', { count: features.length, defaultValue: `See all ${features.length} features` })}</>
            }
          </button>
        </div>

        {/* ── FAQ ── */}
        <div className="mt-12">
          <div className="text-center mb-6">
            <p className="text-[15px] font-semibold text-primary leading-relaxed mb-1">
              {t('landing.faq_title', "Got questions?")}
            </p>
            <p className="text-sm font-bold text-secondary uppercase tracking-widest">
              {t('landing.faq_subtitle', "Common answers")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={`reveal-card rounded-3xl border-2 overflow-hidden transition-all duration-300 ${
                    isOpen
                      ? "border-primary/40 bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 transition-all duration-200"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span className={`font-bold text-[15px] transition-colors duration-200 ${isOpen ? "text-primary" : "text-foreground"}`}>
                      {faq.q}
                    </span>
                    <ChevronDown
                      size={18}
                      className="shrink-0 transition-all"
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1)",
                        color: isOpen ? "hsl(var(--primary))" : "rgba(107, 114, 128, 0.4)"
                      }}
                    />
                  </button>
                  {/* Smooth accordion with max-height */}
                  <div
                    style={{
                      maxHeight: isOpen ? "200px" : "0px",
                      overflow: "hidden",
                      transition: "max-height 0.4s cubic-bezier(0.34, 1.2, 0.64, 1)"
                    }}
                  >
                    <div className="px-5 pb-5 text-[14px] font-medium text-muted-foreground leading-relaxed border-t border-primary/10 pt-3">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showInstall && (
          <div className="mx-auto max-w-md w-full px-6 pb-6 mt-10">
            <button
              onClick={handleInstall}
              className="w-full flex items-center gap-4 p-4 rounded-3xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-2xl">
                📲
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-sm text-foreground mb-0.5">{t('landing.install.title', "Install NusaNest")}</p>
                <p className="text-xs text-muted-foreground font-medium">{t('landing.install.desc', "Add to your home screen for the best experience")}</p>
              </div>
              <span className="text-primary font-bold text-sm">{t('landing.install.btn', "Install")}</span>
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-12 pt-8 border-t border-border/40 text-center reveal-card">

          <p className="text-[15px] font-semibold text-primary leading-relaxed mb-1">
            {t('landing.footer.main', "NusaNest keeps shared homes organized and fair.")}
          </p>
          <p className="text-[14px] font-medium text-muted-foreground leading-relaxed mb-4">
            {t('landing.footer.desc', "Cleaning schedules and supply responsibilities rotate clearly so everyone always knows whose turn it is.")}
          </p>
          <p className="text-[12px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-6">
            {t('landing.footer.copyright', "© 2025 NusaNest for Universitas Nusa Putra — International Student Living")}
          </p>
          <p className="text-sm font-bold text-secondary uppercase tracking-widest">
            {t('landing.footer.tagline', "Simple · Fair · Organized living.")}
          </p>
        </div>

      </div>
    </div>
  );
};

export default LandingScreen;
