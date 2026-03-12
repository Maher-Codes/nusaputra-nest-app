import { useState } from "react";
import { Member, Purchase, Supply, SUPPLIES } from "@/lib/househub";

interface SuppliesTabProps {
  user: Member | null;
  doBuy: (supply: Supply) => void;
  purchases: Purchase[];
  getMember: (id: string) => Member | undefined;
  nextBuyer: Member | null;
  lastBoughtMap: Record<string, Purchase>;
}

const SuppliesTab = ({ user, doBuy, purchases, getMember, nextBuyer, lastBoughtMap }: SuppliesTabProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const isMyTurn = nextBuyer?.id === user?.id;

  const handle = (s: Supply | null) => {
    if (!s) { setConfirmed(true); return; }
    setSelected(s.id);
    setTimeout(() => { doBuy(s); setConfirmed(true); }, 500);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-display font-bold italic text-xs text-ink-3 uppercase tracking-widest animate-fade-up" style={{ animationDelay: ".03s" }}>🛒 My Responsibility</p>

      {isMyTurn ? (
        <div className="rounded-2xl border p-5 bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20 animate-fade-up" style={{ animationDelay: ".06s" }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2 text-gold">⚡ It's your turn to buy</p>
          <h2 className="font-display font-black text-xl mb-1.5">What did you buy for the house?</h2>
          <p className="text-ink-3 text-sm leading-relaxed">Tap what you bought below — we'll save it instantly.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3.5 animate-fade-up" style={{ animationDelay: ".06s" }}>
          <span className="text-3xl">⏳</span>
          <div>
            <p className="font-bold text-sm">Not your turn yet</p>
            <p className="text-ink-3 text-sm mt-0.5"><b>{nextBuyer?.name}</b> is next to buy supplies.</p>
          </div>
        </div>
      )}

      {!confirmed ? (
        <>
          <p className="font-display font-bold text-xl px-0.5 animate-fade-up" style={{ animationDelay: ".1s" }}>What did you buy for the house?</p>
          {SUPPLIES.map((s, i) => {
            const lb = lastBoughtMap[s.id];
            const lbM = lb ? getMember(lb.member_id) : null;
            return (
              <button
                key={s.id}
                className={`w-full p-5 rounded-2xl border-2 bg-card flex items-center gap-4 font-bold text-base transition-all duration-200 hover:border-forest hover:bg-forest/5 hover:translate-x-1.5 hover:shadow-warm-md animate-fade-up ${selected === s.id ? "border-forest bg-forest/5" : "border-border"}`}
                style={{ animationDelay: `${0.14 + i * 0.07}s` }}
                onClick={() => handle(s)}
              >
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: s.bg, width: 52, height: 52 }}>{s.icon}</div>
                <div className="flex-1 text-left">
                  <div className="text-base mb-0.5">{s.label}</div>
                  {lb ? (
                    <div className="font-normal text-xs text-ink-3">Last bought by {lbM?.name}</div>
                  ) : (
                    <div className="font-semibold text-xs text-rust">Never recorded</div>
                  )}
                </div>
                {selected === s.id && <span className="text-forest text-xl">✓</span>}
              </button>
            );
          })}
          <button
            className="w-full p-5 rounded-2xl border-2 border-dashed border-border bg-card flex items-center gap-4 font-semibold text-ink-3 transition-all duration-200 hover:border-forest hover:bg-forest/5 hover:translate-x-1.5 animate-fade-up"
            style={{ animationDelay: ".42s" }}
            onClick={() => handle(null)}
          >
            <div className="w-13 h-13 rounded-2xl bg-cream-2 flex items-center justify-center text-2xl" style={{ width: 52, height: 52 }}>🤷</div>
            <div>Nothing today</div>
          </button>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-warm text-center p-12 animate-pop">
          <div className="text-6xl mb-4">{selected ? SUPPLIES.find(s => s.id === selected)?.icon : "👍"}</div>
          <h2 className="font-display font-black text-3xl mb-2 text-forest">{selected ? "Logged!" : "No problem!"}</h2>
          <p className="text-ink-3 text-sm mb-7 leading-relaxed">
            {selected ? `${SUPPLIES.find(s => s.id === selected)?.label} has been recorded for ${user?.name}.` : "Come back whenever you have something to log."}
          </p>
          <button className="w-full py-3.5 rounded-xl bg-cream-2 text-foreground font-bold border border-border hover:bg-cream-3 transition-all" onClick={() => { setSelected(null); setConfirmed(false); }}>Log something else →</button>
        </div>
      )}

      {!confirmed && (
        <>
          <p className="font-display font-bold italic text-xs text-ink-3 uppercase tracking-widest mt-1 animate-fade-up" style={{ animationDelay: ".4s" }}>📊 Supply Status</p>
          <div className="grid grid-cols-2 gap-2.5">
            {SUPPLIES.map((s, i) => {
              const lb = lastBoughtMap[s.id];
              const lbM = lb ? getMember(lb.member_id) : null;
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-border bg-card shadow-warm p-4 transition-all hover:shadow-warm-md animate-fade-up"
                  style={{ animationDelay: `${0.42 + i * 0.05}s` }}
                >
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <p className="font-bold text-sm mb-1">{s.label}</p>
                  {lb ? (
                    <p className="text-ink-3 text-xs">Last bought by {lbM?.name}</p>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rust/12 text-rust">Not recorded</span>
                  )}
                </div>
              );
            })}
          </div>

          {purchases.length > 0 && (
            <>
              <p className="font-display font-bold italic text-xs text-ink-3 uppercase tracking-widest mt-1 animate-fade-up" style={{ animationDelay: ".56s" }}>🕓 Purchase History</p>
              <div className="rounded-2xl border border-border bg-card shadow-warm p-5 animate-fade-up" style={{ animationDelay: ".58s" }}>
                {purchases.slice(0, 6).map((p, i) => {
                  const m = getMember(p.member_id);
                  const s = SUPPLIES.find(x => x.id === p.item_id) || SUPPLIES[0];
                  return (
                    <div key={p.id} className="flex items-center gap-3.5 py-3 border-b border-border last:border-b-0 animate-fade-up" style={{ animationDelay: `${0.6 + i * 0.04}s` }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: s.bg }}>{s.icon}</div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{s.label}</p>
                        <p className="text-ink-3 text-xs mt-0.5">Last bought by {m?.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SuppliesTab;
