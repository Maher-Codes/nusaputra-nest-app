import { useState, useCallback, useMemo } from "react";
import {
  Member, House, CleanRecord, Purchase, ActivityLog,
  RotationEntry, SupplyResponsibility, Supply, SUPPLIES,
  uid, now, nextSat, todayFull,
} from "@/lib/househub";
import HomeTab     from "./HomeTab";
import CleaningTab from "./CleaningTab";
import SuppliesTab from "./SuppliesTab";
import { houseService } from "@/services/houseService";
import { LogOut } from "lucide-react";

interface DashboardProps {
  initialUser:                    Member;
  initialHouse:                   House;
  initialMembers:                 Member[];
  initialCleanRecs:               CleanRecord[];
  initialPurchases:               Purchase[];
  initialLog:                     ActivityLog[];
  initialRotation:                RotationEntry[];
  initialSupplyResponsibilities:  SupplyResponsibility[];
  onLeaveHouse:                   () => void;
}

const Dashboard = ({
  initialUser,
  initialHouse,
  initialMembers,
  initialCleanRecs,
  initialPurchases,
  initialLog,
  initialRotation,
  initialSupplyResponsibilities,
  onLeaveHouse,
}: DashboardProps) => {

  const [tab,         setTab]        = useState("home");
  const [members]                    = useState(initialMembers);
  const [rotation,    setRotation]   = useState(initialRotation);
  const [cleanRecs,   setCleanRecs]  = useState(initialCleanRecs);
  const [purchases,   setPurchases]  = useState(initialPurchases);
  const [actLog,      setActLog]     = useState(initialLog);
  const [supplyResps, setSupplyResps]= useState(initialSupplyResponsibilities);
  const [user]                       = useState(initialUser);
  const [house]                      = useState(initialHouse);
  const [toast,       setToast]      = useState<{ msg: string; id: number } | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast({ msg, id: Date.now() });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const getMember = useCallback(
    (id: string) => members.find(m => m.id === id),
    [members]
  );

  // ── Cleaning derived state ─────────────────────────────────────────
  const thisRotation  = rotation[0] ?? null;
  const thisCleanMbr  = getMember(thisRotation?.memberId ?? "");
  const isMyTurnClean = thisRotation?.memberId === user?.id;
  const myNextClean   = rotation.find(r => r.memberId === user?.id);
  const lastCleanRec  = cleanRecs[0];
  const lastCleanMbr  = getMember(lastCleanRec?.member_id ?? "");

  // ── Supply derived state ───────────────────────────────────────────
  const nextBuyer = useMemo(() => {
    if (supplyResps.length > 0) {
      return getMember(supplyResps[0].next_member_id) ?? null;
    }
    if (!members.length) return null;
    const recentIds = purchases.slice(0, members.length).map(p => p.member_id);
    return members.find(m => !recentIds.includes(m.id)) ?? members[0];
  }, [supplyResps, members, purchases, getMember]);

  const lastBoughtMap = useMemo(() => {
    const map: Record<string, Purchase> = {};
    SUPPLIES.forEach(s => {
      const p = purchases.find(x => x.item_name === s.label);
      if (p) map[s.id] = p;
    });
    return map;
  }, [purchases]);

  // ── doClean ────────────────────────────────────────────────────────
  const doClean = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    const newRec: CleanRecord = {
      id: uid(), member_id: user.id, house_id: house.id, date: today,
    };
    setCleanRecs(prev => [newRec, ...prev]);

    setRotation(prev => {
      if (!prev.length) return prev;
      const rest    = prev.slice(1);
      const last    = prev[prev.length - 1];
      const cycled: RotationEntry = {
        memberId: prev[0].memberId,
        date:     nextSat(new Date(last.date.getTime() + 86400000)),
      };
      return [...rest, cycled];
    });

    setActLog(prev => [{
      id: uid(), member_id: user.id,
      action: `${user.name} cleaned the house`,
      icon: "🧹", created_at: now(),
    }, ...prev]);

    showToast("Cleaning marked as done! ✓");

    try {
      await houseService.insertCleanRecord(house.id, user.id, today);
    } catch (err) {
      console.error("Failed to save clean record:", err);
      showToast("Saved locally — sync failed, check connection.");
    }
  }, [user, house, showToast]);

  // ── doBuy ──────────────────────────────────────────────────────────
  const doBuy = useCallback(async (supply: Supply) => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    const newPurchase: Purchase = {
      id: uid(), member_id: user.id, house_id: house.id,
      item_name: supply.label, date: today,
    };
    setPurchases(prev => [newPurchase, ...prev]);

    const currentBuyerIdx = members.findIndex(m => m.id === user.id);
    const nextMember      = members[(currentBuyerIdx + 1) % members.length];

    setSupplyResps(prev =>
      prev.length > 0
        ? prev.map((r, i) => i === 0 ? { ...r, next_member_id: nextMember.id } : r)
        : [{ id: uid(), house_id: house.id, item_name: supply.label, next_member_id: nextMember.id }]
    );

    setActLog(prev => [{
      id: uid(), member_id: user.id,
      action: `${user.name} bought ${supply.label}`,
      icon: supply.icon, created_at: now(),
    }, ...prev]);

    showToast(`${supply.label} purchase saved! ✓`);

    try {
      await Promise.all([
        houseService.insertPurchase(house.id, user.id, supply.label, today),
        houseService.updateNextBuyer(house.id, supply.label, nextMember.id),
      ]);
    } catch (err) {
      console.error("Failed to save purchase:", err);
      showToast("Saved locally — sync failed, check connection.");
    }
  }, [user, house, members, showToast]);

  const tabs = [
    { id: "home",     l: "Home"     },
    { id: "cleaning", l: "Cleaning" },
    { id: "supplies", l: "Supplies" },
  ];

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">

      {/* Header */}
      <div className="px-5 pt-10 pb-6 bg-background">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-display font-black text-2xl text-foreground tracking-tight">
              HouseHub
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {todayFull()}
              </p>
              {/* Leave house button */}
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                title="Leave house"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
          <h2 className="font-display font-black text-4xl text-primary leading-tight mt-6">
            Hello, {user?.name.split(" ")[0]}
          </h2>
          <p className="text-muted-foreground text-base mt-2">
            Here's what needs to be done.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="max-w-xl mx-auto px-4 mt-2">
        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-sm transition-all ${
                tab === t.id
                  ? "bg-foreground text-background shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-xl mx-auto mt-8 px-4">
        {tab === "home" && (
          <HomeTab
            lastCleanMbr={lastCleanMbr}
            lastCleanRec={lastCleanRec}
            purchases={purchases}
            actLog={actLog}
            getMember={getMember}
            thisCleanMbr={thisCleanMbr}
            thisRotation={thisRotation}
            nextBuyer={nextBuyer}
            isMyTurnClean={isMyTurnClean}
            user={user}
            setTab={setTab}
          />
        )}
        {tab === "cleaning" && (
          <CleaningTab
            rotation={rotation}
            myNextClean={myNextClean}
            user={user}
            getMember={getMember}
            isMyTurnClean={isMyTurnClean}
            doClean={doClean}
            cleanRecs={cleanRecs}
          />
        )}
        {tab === "supplies" && (
          <SuppliesTab
            user={user}
            members={members}
            doBuy={doBuy}
            purchases={purchases}
            getMember={getMember}
            nextBuyer={nextBuyer}
            lastBoughtMap={lastBoughtMap}
          />
        )}
      </div>

      {/* Leave house confirmation dialog */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-fade-up">
            <h3 className="font-display font-black text-xl text-foreground mb-2">
              Leave house?
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              You'll be taken back to the home screen. You can rejoin anytime using the house code.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-xl bg-muted text-foreground font-bold text-sm hover:bg-muted/80 transition-all"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm hover:bg-destructive/90 transition-all"
                onClick={onLeaveHouse}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-5 py-3 rounded-full font-bold text-sm shadow-xl z-50 whitespace-nowrap animate-fade-up"
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
