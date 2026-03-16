import { Member, Purchase, ActivityLog, RotationEntry, CleanRecord, Supply, fmtDate } from "@/lib/househub";
import { ArrowRight, Sparkles } from "lucide-react";

interface HomeTabProps {
  lastCleanMbr:    Member | undefined;
  lastCleanRec:    CleanRecord | undefined;
  purchases:       Purchase[];
  actLog:          ActivityLog[];
  getMember:       (id: string) => Member | undefined;
  thisCleanMbr:    Member | undefined;
  thisRotation:    RotationEntry | null;
  nextBuyer:       Member | null;
  nextBuyerByItem: Record<string, Member | null>;
  isMyTurnClean:   boolean;
  user:            Member | null;
  setTab:          (tab: string) => void;
  cleaningEnabled:  boolean;
  activeSupplies:   Supply[];
  nextCleaningDate: Date;
}

const HomeTab = ({
  lastCleanMbr,
  lastCleanRec,
  purchases,
  thisCleanMbr,
  thisRotation,
  nextBuyerByItem,
  isMyTurnClean,
  user,
  setTab,
  cleaningEnabled,
  activeSupplies,
  nextCleaningDate,
}: HomeTabProps) => {
  const lastPurchase  = purchases[0];
  const mySupplyItems = activeSupplies.filter(s => nextBuyerByItem[s.label]?.id === user?.id);
  const isMyTurnBuy   = mySupplyItems.length > 0;

  return (
    <div className="flex flex-col gap-4">

      {/* Card 1 — Cleaning */}
      {cleaningEnabled && (
        <div
          className={`group rounded-2xl border p-6 transition-all duration-300 cursor-pointer
            hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]
            ${isMyTurnClean
              ? "bg-primary/5 border-primary/30 shadow-[0_0_0_3px_rgba(42,157,143,0.08)]"
              : "bg-card border-border shadow-sm hover:border-primary/20"
            }
          `}
          onClick={() => setTab("cleaning")}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧹</span>
              <h2 className="text-xl font-bold font-display text-foreground">Cleaning</h2>
            </div>
            <ArrowRight
              size={18}
              className="text-muted-foreground/40 transition-all duration-300 group-hover:text-primary group-hover:translate-x-1 mt-0.5"
            />
          </div>

          <p className="text-sm font-medium text-muted-foreground">
            Next:{" "}
            <span className="text-foreground font-semibold">
              {nextCleaningDate
                ? fmtDate(nextCleaningDate, { weekday: "long", month: "short", day: "numeric" })
                : "—"}
            </span>
          </p>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">
            Responsible:{" "}
            <span className="text-foreground font-semibold">{thisCleanMbr?.name ?? "—"}</span>
          </p>

          {lastCleanRec && lastCleanMbr && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Last cleaned by{" "}
              <span className="font-semibold">{lastCleanMbr.name}</span>
              {" — "}{fmtDate(lastCleanRec.date, { month: "short", day: "numeric" })}
            </p>
          )}

          {isMyTurnClean && (
            <div className="mt-3 flex items-center gap-1.5">
              <Sparkles size={13} className="text-primary" />
              <span className="text-xs font-bold text-primary">
                Your turn to clean this week
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card 2 — Supplies */}
      <div
        className={`group rounded-2xl border p-6 transition-all duration-300 cursor-pointer
          hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]
          ${isMyTurnBuy
            ? "bg-accent/5 border-accent/30 shadow-[0_0_0_3px_rgba(42,157,143,0.06)]"
            : "bg-card border-border shadow-sm hover:border-accent/20"
          }
        `}
        onClick={() => setTab("supplies")}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h2 className="text-xl font-bold font-display text-foreground">Supplies</h2>
          </div>
          <ArrowRight
            size={18}
            className="text-muted-foreground/40 transition-all duration-300 group-hover:text-accent group-hover:translate-x-1 mt-0.5"
          />
        </div>

        {/* Per-item next buyers */}
        <div className="flex flex-col gap-1.5 mb-2">
          {activeSupplies.map(s => {
            const buyer    = nextBuyerByItem[s.label];
            const isMyItem = buyer?.id === user?.id;
            return (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </span>
                <span className={`text-sm font-semibold transition-colors ${
                  isMyItem ? "text-accent" : "text-foreground"
                }`}>
                  {buyer?.name ?? "—"}
                  {isMyItem && (
                    <span className="ml-1 text-xs font-bold">← You</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {lastPurchase && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-1">
            Last:{" "}
            <span className="font-semibold">{lastPurchase.item_name}</span>
            {" — "}{fmtDate(lastPurchase.date, { month: "short", day: "numeric" })}
          </p>
        )}

        {isMyTurnBuy && (
          <div className="mt-3 flex items-center gap-1.5">
            <Sparkles size={13} className="text-accent" />
            <span className="text-xs font-bold text-accent">
              Your turn: {mySupplyItems.map(s => s.label).join(", ")}
            </span>
          </div>
        )}
      </div>

    </div>
  );
};

export default HomeTab;
