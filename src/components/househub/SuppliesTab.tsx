import { useState } from "react";
import { Member, Purchase, Supply, SUPPLIES, fmtDate } from "@/lib/househub";

interface SuppliesTabProps {
  user:          Member | null;
  members:       Member[];                    // full list for rotation display
  doBuy:         (supply: Supply) => void;
  purchases:     Purchase[];
  getMember:     (id: string) => Member | undefined;
  nextBuyer:     Member | null;
  lastBoughtMap: Record<string, Purchase>;
}

const SuppliesTab = ({
  user,
  members,
  doBuy,
  purchases,
  getMember,
  nextBuyer,
  lastBoughtMap,
}: SuppliesTabProps) => {
  const [showForm,       setShowForm]       = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<string>("");

  const isMyTurn = nextBuyer?.id === user?.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupply) return;
    const supply = SUPPLIES.find(s => s.id === selectedSupply);
    if (supply) {
      doBuy(supply);
      setShowForm(false);
      setSelectedSupply("");
    }
  };

  // ── Full rotation list ─────────────────────────────────────────────
  // Starting from nextBuyer, wrap around the members array
  const rotationList: Member[] = (() => {
    if (!members.length || !nextBuyer) return members;
    const startIdx = members.findIndex(m => m.id === nextBuyer.id);
    if (startIdx === -1) return members;
    return [...members.slice(startIdx), ...members.slice(0, startIdx)];
  })();

  return (
    <div className="flex flex-col gap-6">

      {/* SECTION 1 — Current Turn */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Current Turn
        </h3>
        <div className={`rounded-xl border p-5 transition-all ${
          isMyTurn ? "bg-accent/10 border-accent/30" : "bg-card shadow-sm"
        }`}>
          <p className="font-display font-black text-2xl text-foreground mb-1">
            {nextBuyer?.name || "—"}
          </p>

          {isMyTurn && !showForm && (
            <button
              className="mt-4 w-full py-3 rounded-lg bg-accent text-accent-foreground font-bold shadow-sm hover:bg-accent/90 transition-colors"
              onClick={() => setShowForm(true)}
            >
              I bought supplies
            </button>
          )}

          {isMyTurn && showForm && (
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <select
                className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                value={selectedSupply}
                onChange={e => setSelectedSupply(e.target.value)}
                required
              >
                <option value="" disabled>Select an item...</option>
                {SUPPLIES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-accent text-accent-foreground font-bold text-sm"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg bg-muted text-muted-foreground font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Not your turn — show whose turn it is */}
          {!isMyTurn && nextBuyer && (
            <p className="text-sm text-muted-foreground mt-2">
              Waiting for <span className="font-semibold text-foreground">{nextBuyer.name}</span> to buy supplies.
            </p>
          )}
        </div>
      </section>

      {/* SECTION 2 — Last bought per supply item */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Last Bought
        </h3>
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {SUPPLIES.map((s, i) => {
            const last = lastBoughtMap[s.id];
            const buyer = last ? getMember(last.member_id) : null;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between px-5 py-3 border-b border-border/50 last:border-b-0"
              >
                <span className="text-foreground font-medium flex items-center gap-2">
                  <span>{s.icon}</span>
                  <span className="font-semibold">{s.label}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {buyer
                    ? `${buyer.name} — ${fmtDate(last!.date, { month: "short", day: "numeric" })}`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3 — Purchase History */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Purchase History
        </h3>
        {purchases.length > 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {purchases.slice(0, 8).map(p => {
              const m = getMember(p.member_id);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-5 py-3 border-b border-border/50 last:border-b-0"
                >
                  <span className="font-medium text-foreground">
                    <span className="font-bold">{m?.name ?? "—"}</span>
                    <span className="text-muted-foreground mx-1">—</span>
                    {p.item_name}
                  </span>
                  {/* DB column is date, not purchase_date */}
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(p.date, { month: "short", day: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No purchases recorded yet.</p>
        )}
      </section>

      {/* SECTION 4 — Full rotation order */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Buying Rotation
        </h3>
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {rotationList.map((m, i) => {
            const isMe   = m.id === user?.id;
            const isNext = m.id === nextBuyer?.id;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-b-0"
              >
                <span className="font-display font-bold text-muted-foreground w-5 shrink-0">
                  {i + 1}.
                </span>
                <span className={`font-medium flex-1 ${isNext ? "text-accent font-bold" : "text-foreground"}`}>
                  {m.name}
                  {isMe   && <span className="ml-1.5 text-xs text-muted-foreground">(You)</span>}
                  {isNext && <span className="ml-2 text-xs font-bold text-accent">← next</span>}
                </span>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};

export default SuppliesTab;
