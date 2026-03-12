import { useMemo } from "react";
import { Member, Purchase, ActivityLog, RotationEntry, SUPPLIES, fmtDate } from "@/lib/househub";
import Avatar from "./Avatar";

interface HomeTabProps {
  lastCleanMbr: Member | undefined;
  lastCleanRec: { cleaning_date: string } | undefined;
  purchases: Purchase[];
  actLog: ActivityLog[];
  getMember: (id: string) => Member | undefined;
  thisCleanMbr: Member | undefined;
  thisRotation: RotationEntry | null;
  nextBuyer: Member | null;
  isMyTurnClean: boolean;
  user: Member | null;
  setTab: (tab: string) => void;
}

const HomeTab = ({ lastCleanMbr, lastCleanRec, purchases, getMember, thisCleanMbr, thisRotation, nextBuyer, isMyTurnClean, user, setTab }: HomeTabProps) => {
  const lastBuys = useMemo(() => {
    const seen = new Set<string>();
    return purchases.filter(p => { if (seen.has(p.item_id)) return false; seen.add(p.item_id); return true; }).slice(0, 4);
  }, [purchases]);

  return (
    <div className="flex flex-col gap-4">
      {/* This week cleaning card */}
      <div
        className={`rounded-2xl border shadow-warm p-5 transition-all hover:shadow-warm-md animate-fade-up ${isMyTurnClean ? "bg-gradient-to-br from-forest/10 to-forest/5 border-forest/20" : "bg-card border-border"}`}
        style={{ animationDelay: ".06s" }}
      >
        <div className="flex justify-between items-start mb-3.5">
          <div>
            <p className="text-xs font-bold text-ink-4 tracking-widest uppercase mb-2.5">🧹 Next Cleaning</p>
            <div className="flex items-center gap-3.5">
              {thisCleanMbr && <Avatar name={thisCleanMbr.name} size={54} radius={17} fontSize={22} />}
              <div>
                <h2 className="font-display font-black text-3xl leading-none">{thisCleanMbr?.name || "—"}</h2>
                {thisRotation && (
                  <p className="text-forest font-bold text-sm mt-1.5">
                    {fmtDate(thisRotation.date, { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                )}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mt-1.5 ${isMyTurnClean ? "bg-forest/10 text-forest" : "bg-cream-2 text-ink-3"}`}>
                  {isMyTurnClean ? "⚡ Your turn!" : "⏳ Waiting"}
                </span>
              </div>
            </div>
          </div>
        </div>
        {isMyTurnClean && (
          <button className="w-full py-3.5 rounded-xl bg-forest font-bold text-cream shadow-[0_4px_20px_hsla(217,91%,53%,.3)] hover:bg-forest-2 active:scale-[0.96] transition-all" onClick={() => setTab("cleaning")}>Go to Cleaning →</button>
        )}
      </div>

      {/* Last cleaning */}
      {lastCleanRec && (
        <div className="rounded-2xl border shadow-warm p-4 flex items-center gap-3.5 bg-gradient-to-br from-sage/10 to-sage/5 border-sage/20 transition-all hover:shadow-warm-md animate-fade-up" style={{ animationDelay: ".1s" }}>
          <div className="w-11 h-11 rounded-xl bg-sage/15 flex items-center justify-center text-xl">🧹</div>
          <div className="flex-1">
            <p className="text-xs font-bold text-ink-4 tracking-wider uppercase mb-0.5">Last Cleaning</p>
            <p className="font-bold text-sm">{lastCleanMbr?.name} cleaned the house</p>
            <p className="text-ink-3 text-xs mt-0.5">{fmtDate(lastCleanRec.cleaning_date, { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
        </div>
      )}

      {/* Next buyer */}
      <div className="rounded-2xl border shadow-warm p-4 flex items-center gap-3.5 bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20 transition-all hover:shadow-warm-md animate-fade-up" style={{ animationDelay: ".13s" }}>
        <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center text-2xl">🛒</div>
        <div className="flex-1">
          <p className="text-xs font-bold text-ink-4 tracking-wider uppercase mb-1">Next to buy supplies</p>
          <p className="font-display font-black text-xl">{nextBuyer?.name || "—"}</p>
        </div>
        {nextBuyer?.id === user?.id && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gold/12 text-gold">⚡ That's you!</span>}
        <button className="px-4 py-2 rounded-xl bg-cream-2 text-foreground font-bold text-sm border border-border hover:bg-cream-3 transition-all" onClick={() => setTab("supplies")}>Log →</button>
      </div>

      {/* Last supply purchases - no timestamps */}
      {lastBuys.length > 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-warm p-5 animate-fade-up" style={{ animationDelay: ".16s" }}>
          <p className="text-xs font-bold text-ink-4 tracking-wider uppercase mb-3.5">🛒 Last Supply Purchases</p>
          {lastBuys.map((p, i) => {
            const m = getMember(p.member_id);
            const s = SUPPLIES.find(x => x.id === p.item_id) || SUPPLIES[0];
            return (
              <div key={p.id} className="flex items-center gap-3.5 py-3 border-b border-border last:border-b-0 animate-fade-up" style={{ animationDelay: `${0.18 + i * 0.05}s` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: s.bg }}>{s.icon}</div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{s.label}</p>
                  <p className="text-ink-3 text-xs mt-0.5">Last bought by {m?.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomeTab;
