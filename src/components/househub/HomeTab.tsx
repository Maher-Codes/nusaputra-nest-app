import { useMemo } from "react";
import { Member, Purchase, ActivityLog, RotationEntry, SUPPLIES, fmtDate } from "@/lib/househub";

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
  const lastPurchase = purchases[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Card 1: Cleaning */}
      <div className="rounded-xl shadow-sm border p-6 bg-card transition-all">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold font-display text-foreground mb-1">Cleaning</h2>
            <p className="text-sm font-medium text-muted-foreground">
              Next: {thisRotation ? fmtDate(thisRotation.date, { weekday: "long" }) : "—"}
            </p>
            <p className="text-sm font-medium text-muted-foreground mt-0.5">
              Responsible: <span className="text-foreground font-semibold">{thisCleanMbr?.name || "—"}</span>
            </p>
            {isMyTurnClean && (
              <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                Your turn to clean
              </span>
            )}
          </div>
        </div>
        <button 
          className="w-full py-3 rounded-lg bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
          onClick={() => setTab("cleaning")}
        >
          View Cleaning Details
        </button>
      </div>

      {/* Card 2: Supplies */}
      <div className="rounded-xl shadow-sm border p-6 bg-card transition-all mt-2">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold font-display text-foreground mb-1">Supplies</h2>
            <p className="text-sm font-medium text-muted-foreground mt-0.5">
              Next buyer: <span className="text-foreground font-semibold">{nextBuyer?.name || "—"}</span>
            </p>
            {lastPurchase && (
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Last purchase: {lastPurchase.item_name} — {fmtDate(lastPurchase.purchase_date, { month: "long", day: "numeric" })}
              </p>
            )}
            {nextBuyer?.id === user?.id && (
              <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold bg-accent/15 text-accent">
                Your turn to buy supplies
              </span>
            )}
          </div>
        </div>
        <button 
          className="w-full py-3 rounded-lg bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
          onClick={() => setTab("supplies")}
        >
          View Supplies
        </button>
      </div>
    </div>
  );
};

export default HomeTab;
