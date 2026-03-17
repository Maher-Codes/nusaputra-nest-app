import { useState, useEffect } from "react";
import { Member, CleanRecord, RotationEntry, fmtDate } from "@/lib/househub";
import { CheckCircle2, Clock } from "lucide-react";

interface CleaningTabProps {
  rotation:      RotationEntry[];
  myNextClean:   RotationEntry | undefined;
  user:          Member | null;
  getMember:     (id: string) => Member | undefined;
  isMyTurnClean: boolean;
  doClean:       () => void;
  cleanRecs:     CleanRecord[];
  nextCleaningDate: Date;
}

// Celebration messages shown after logging a clean
const CLEAN_MESSAGES = [
  { emoji: "🧹", msg: "Amazing work! The house thanks you!" },
  { emoji: "✨", msg: "Sparkling clean! You're a legend!" },
  { emoji: "🌟", msg: "Look at you go! Absolute hero!" },
  { emoji: "🏆", msg: "Champion cleaner right here!" },
  { emoji: "💪", msg: "That's what we're talking about!" },
];

const CleaningTab = ({
  rotation,
  myNextClean,
  user,
  getMember,
  isMyTurnClean,
  doClean,
  cleanRecs,
  nextCleaningDate,
}: CleaningTabProps) => {
  const [justDone,    setJustDone]   = useState(false);
  const [pressing,    setPressing]   = useState(false);
  const [celebration, setCelebration]= useState<{ emoji: string; msg: string } | null>(null);
  const [showConfetti,setConfetti]   = useState(false);

  const done =
    justDone ||
    (isMyTurnClean &&
      cleanRecs.some(
        r => r.member_id === user?.id &&
          Date.now() - new Date(r.date).getTime() < 7 * 86400000
      ));

  const handle = () => {
    if (pressing) return;
    setPressing(true);
    setTimeout(() => {
      setJustDone(true);
      doClean();
      const msg = CLEAN_MESSAGES[Math.floor(Math.random() * CLEAN_MESSAGES.length)];
      setCelebration(msg);
      setConfetti(true);
      setPressing(false);
      setTimeout(() => setConfetti(false), 2800);
      setTimeout(() => setCelebration(null), 4500);
    }, 180);
  };

  const nextClean = rotation[0];
  const nextMbr   = getMember(nextClean?.memberId ?? "");
  const lastClean = cleanRecs[0];
  const lastMbr   = getMember(lastClean?.member_id ?? "");

  return (
    <div className="flex flex-col gap-6 relative">

      {/* Confetti burst overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {Array.from({ length: 22 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-sm opacity-90"
              style={{
                left:       `${10 + Math.random() * 80}%`,
                top:        `-${10 + Math.random() * 10}%`,
                background: ["#770042","#D4A373","#550030","#FAF3E0","#33001C","#fff"][i % 6],
                animation:  `confetti-fall ${1.2 + Math.random() * 1.4}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
                transform:  `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* SECTION 1 — Next Cleaning */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Next Cleaning
        </h3>
        <div
          className={`rounded-2xl border p-5 transition-all duration-500 ${
            isMyTurnClean && !done
              ? "bg-primary/5 border-primary/40 shadow-[0_0_0_4px_rgba(119,0,66,0.07)]"
              : done
              ? "bg-emerald-50/50 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/30"
              : "bg-card shadow-sm border-border"
          }`}
        >
          <div className="flex items-start justify-between mb-1">
            <p className="font-display font-black text-2xl text-foreground">
              {nextCleaningDate ? fmtDate(nextCleaningDate, { weekday: "long" }) : "—"}
            </p>
            {done && (
              <CheckCircle2
                size={22}
                className="text-emerald-500 shrink-0 mt-0.5"
                style={{ animation: "pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
              />
            )}
          </div>
          <p className="text-sm text-foreground font-medium mb-1">
            Responsible:{" "}
            <span className="font-bold">{nextMbr?.name ?? "—"}</span>
          </p>

          {!isMyTurnClean && nextMbr && !done && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
              <Clock size={13} className="shrink-0" />
              Waiting for <span className="font-semibold text-foreground ml-1">{nextMbr.name}</span>
            </p>
          )}

          {/* Celebration message */}
          {celebration && (
            <div
              className="mt-3 flex items-center gap-2 animate-fade-up"
              style={{ animation: "slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
            >
              <span className="text-2xl">{celebration.emoji}</span>
              <p className="text-sm font-bold text-primary">
                {celebration.msg}
              </p>
            </div>
          )}

          {done && !celebration && (
            <p className="mt-3 text-sm font-bold text-primary flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Cleaning marked as done!
            </p>
          )}

          {isMyTurnClean && !done && (
            <button
              className={`mt-4 w-full py-3.5 rounded-xl font-bold shadow-md text-sm transition-all duration-200 select-none
                bg-primary text-primary-foreground
                hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5
                active:scale-[0.97] active:shadow-sm
                ${pressing ? "scale-[0.97] opacity-80" : ""}
              `}
              onClick={handle}
              disabled={pressing}
            >
              {pressing ? "Saving…" : "🧹 I cleaned the house"}
            </button>
          )}
        </div>
      </section>

      {/* SECTION 2 — Last Cleaning */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Last Cleaning
        </h3>
        {lastClean ? (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
            <p className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="text-lg">🧹</span>
              {lastMbr?.name ?? "—"}
              <span className="text-muted-foreground font-normal mx-0.5">—</span>
              <span className="font-normal text-muted-foreground text-sm">
                {fmtDate(lastClean.date, { month: "long", day: "numeric" })}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No cleaning recorded yet.</p>
        )}
      </section>

      {/* SECTION 3 — Upcoming rotation */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Upcoming Turns
        </h3>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {rotation.length > 0 ? (
            rotation.map((r, i) => {
              const m    = getMember(r.memberId);
              const isMe = r.memberId === user?.id;
              const isNext = i === 0;
              return (
                <div
                  key={`${r.memberId}-${i}`}
                  className={`flex items-center gap-3 px-5 py-3.5 border-b border-border/50 last:border-b-0 transition-colors duration-200
                    ${isNext ? "bg-primary/5" : "hover:bg-muted/40"}
                  `}
                >
                  <span className={`font-display font-bold w-5 shrink-0 text-sm ${isNext ? "text-primary" : "text-muted-foreground"}`}>
                    {i + 1}.
                  </span>
                  <span className="flex-1 font-medium text-foreground">
                    <span className={isMe ? "text-primary font-bold" : ""}>
                      {m?.name ?? "—"}
                    </span>
                    {isMe && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(You)</span>
                    )}
                    {isNext && !isMe && (
                      <span className="ml-2 text-xs font-bold text-primary">← next</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(r.date, { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground px-5 py-4">No upcoming schedule yet.</p>
          )}
        </div>
      </section>

      {/* Keyframe styles */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg) scale(1);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
        }
        @keyframes pop-in {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slide-up {
          0%   { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CleaningTab;
