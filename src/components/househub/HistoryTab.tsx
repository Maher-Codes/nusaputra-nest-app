import { useState, useMemo } from "react";
import { Member, CleanRecord, Purchase, Supply, fmtDate } from "@/lib/househub";
import { ShoppingBag, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";

interface HistoryTabProps {
  user:      Member;
  members:   Member[];
  cleanRecs: CleanRecord[];
  purchases: Purchase[];
  activeSupplies: Supply[];
}

const HistoryTab = ({ user, members, cleanRecs, purchases, activeSupplies }: HistoryTabProps) => {
  const [selectedMember, setSelectedMember] = useState<string>(user.id);
  const [showAllCleans,  setShowAllCleans]   = useState(false);
  const [showAllBuys,    setShowAllBuys]     = useState(false);

  const viewed = members.find(m => m.id === selectedMember) ?? user;

  // Filter records for the viewed member
  const myCleans    = useMemo(() =>
    cleanRecs.filter(r => r.member_id === selectedMember)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [cleanRecs, selectedMember]
  );

  const myPurchases = useMemo(() =>
    purchases.filter(p => p.member_id === selectedMember)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [purchases, selectedMember]
  );

  // Stats
  const totalCleans    = myCleans.length;
  const totalPurchases = myPurchases.length;
  const lastClean      = myCleans[0];
  const lastPurchase   = myPurchases[0];

  // Purchases breakdown by item
  const purchasesByItem = useMemo(() => {
    const map: Record<string, number> = {};
    activeSupplies.forEach(s => { map[s.label] = 0; });
    myPurchases.forEach(p => {
      if (map[p.item_name] !== undefined) map[p.item_name]++;
    });
    return map;
  }, [myPurchases]);

  const visibleCleans    = showAllCleans ? myCleans    : myCleans.slice(0, 4);
  const visiblePurchases = showAllBuys   ? myPurchases : myPurchases.slice(0, 4);

  const isOwnHistory = selectedMember === user.id;

  return (
    <div className="flex flex-col gap-6">

      {/* Member selector */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          View History For
        </h3>
        <div className="flex gap-2 flex-wrap">
          {members.map(m => {
            const isActive = m.id === selectedMember;
            return (
              <button
                key={m.id}
                onClick={() => { setSelectedMember(m.id); setShowAllCleans(false); setShowAllBuys(false); }}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-md scale-[1.04]"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground active:scale-95"
                  }
                `}
              >
                {m.name}
                {m.id === user.id && (
                  <span className="ml-1 text-xs opacity-70">(You)</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Stats row */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          {isOwnHistory ? "Your Stats" : `${viewed.name}'s Stats`}
        </h3>
        <div className="grid grid-cols-2 gap-3">

          {/* Cleans stat */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🧹</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Cleans</span>
            </div>
            <p className="font-display font-black text-3xl text-primary">{totalCleans}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {lastClean
                ? `Last: ${fmtDate(lastClean.date, { month: "short", day: "numeric" })}`
                : "No cleans yet"}
            </p>
          </div>

          {/* Purchases stat */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🛒</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Purchases</span>
            </div>
            <p className="font-display font-black text-3xl text-accent">{totalPurchases}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {lastPurchase
                ? `Last: ${lastPurchase.item_name}`
                : "No purchases yet"}
            </p>
          </div>

        </div>

        {/* Per-item purchase breakdown */}
        {totalPurchases > 0 && (
          <div className="mt-3 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {activeSupplies.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors duration-200"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(purchasesByItem[s.label] ?? 0, 8) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ background: s.col, opacity: 0.7 + i * 0.04 }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-foreground w-4 text-right">
                    {purchasesByItem[s.label] ?? 0}×
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cleaning history */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Cleaning Record
        </h3>
        {myCleans.length > 0 ? (
          <>
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              {visibleCleans.map((r, i) => {
                const isFirst = i === 0;
                const daysAgo = Math.floor((Date.now() - new Date(r.date).getTime()) / 86400000);
                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between px-5 py-3.5 border-b border-border/50 last:border-b-0 transition-colors duration-200
                      ${isFirst ? "bg-primary/5" : "hover:bg-muted/30"}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{isFirst ? "✨" : "🧹"}</span>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {fmtDate(r.date, { weekday: "long", month: "short", day: "numeric" })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`}
                        </p>
                      </div>
                    </div>
                    {isFirst && (
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 shadow-sm">
                        Latest
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {myCleans.length > 4 && (
              <button
                className="mt-2 w-full py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-muted/70 hover:text-foreground active:scale-98 transition-all duration-200"
                onClick={() => setShowAllCleans(v => !v)}
              >
                {showAllCleans
                  ? <><ChevronUp size={15} /> Show less</>
                  : <><ChevronDown size={15} /> Show all {myCleans.length} cleans</>
                }
              </button>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <CalendarDays size={32} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              {isOwnHistory ? "You haven't logged any cleans yet." : `${viewed.name} hasn't logged any cleans yet.`}
            </p>
          </div>
        )}
      </section>

      {/* Purchase history */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Purchase Record
        </h3>
        {myPurchases.length > 0 ? (
          <>
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              {visiblePurchases.map((p, i) => {
                const sup     = activeSupplies.find(s => s.label === p.item_name);
                const isFirst = i === 0;
                const daysAgo = Math.floor((Date.now() - new Date(p.date).getTime()) / 86400000);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-5 py-3.5 border-b border-border/50 last:border-b-0 transition-colors duration-200
                      ${isFirst ? "bg-accent/5" : "hover:bg-muted/30"}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{sup?.icon ?? "🛒"}</span>
                      <div>
                        <p className="text-sm font-bold text-foreground">{p.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(p.date, { weekday: "long", month: "short", day: "numeric" })}
                          {" · "}
                          {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`}
                        </p>
                      </div>
                    </div>
                    {isFirst && (
                      <span className="text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full border border-secondary/20 shadow-sm">
                        Latest
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {myPurchases.length > 4 && (
              <button
                className="mt-2 w-full py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-muted/70 hover:text-foreground active:scale-98 transition-all duration-200"
                onClick={() => setShowAllBuys(v => !v)}
              >
                {showAllBuys
                  ? <><ChevronUp size={15} /> Show less</>
                  : <><ChevronDown size={15} /> Show all {myPurchases.length} purchases</>
                }
              </button>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <ShoppingBag size={32} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              {isOwnHistory ? "You haven't logged any purchases yet." : `${viewed.name} hasn't made any purchases yet.`}
            </p>
          </div>
        )}
      </section>

    </div>
  );
};

export default HistoryTab;
