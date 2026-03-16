import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Member, House, CleanRecord, Purchase, ActivityLog,
  RotationEntry, SupplyResponsibility, Supply, SUPPLIES,
  uid, now, nextSat, todayFull, buildRotation,
} from "@/lib/househub";
import HomeTab     from "./HomeTab";
import CleaningTab from "./CleaningTab";
import SuppliesTab from "./SuppliesTab";
import HistoryTab  from "./HistoryTab";
import { houseService } from "@/services/houseService";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Share2, Check, Menu } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import HouseSettingsScreen from "./HouseSettings";


interface DashboardProps {
  initialUser:                   Member;
  initialHouse:                  House;
  initialMembers:                Member[];
  initialCleanRecs:              CleanRecord[];
  initialPurchases:              Purchase[];
  initialLog:                    ActivityLog[];
  initialRotation:               RotationEntry[];
  initialSupplyResponsibilities: SupplyResponsibility[];
  initialCleaningEnabled:        boolean;
  initialCleaningRotationOrder:  string[];
  initialSuppliesRotationOrder:  string[];
  initialHouseSettings:          any;
  onLeaveHouse:                  () => void;
}

interface UndoAction {
  label:   string;
  execute: () => Promise<void>;
}

const MOTIVATIONAL_MESSAGES = [
  "Ready to make this home even better today?",
  "Teamwork makes the dream work — let's check the list.",
  "Small actions, big impact. You're doing great!",
  "Keep the house fair, keep the house happy.",
  "Organized living starts here. What's first?",
  "You've got this! Let's keep things moving smoothly.",
  "Your housemates appreciate everything you do! 🏠",
  "A little progress each day adds up to a big result.",
  "Fair share, happy house! Let's stay on top of it.",
  "Everything is easier when we do it together."
];

const Dashboard = ({
  initialUser,
  initialHouse,
  initialMembers,
  initialCleanRecs,
  initialPurchases,
  initialLog,
  initialRotation,
  initialSupplyResponsibilities,
  initialCleaningEnabled,
  initialCleaningRotationOrder,
  initialSuppliesRotationOrder,
  initialHouseSettings,
  onLeaveHouse,
}: DashboardProps) => {

  const [tab,          setTab]         = useState("home");
  const motivationalMessage = useMemo(() => 
    MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)], 
  []);
  const [members,      setMembers]     = useState(initialMembers);
  const [rotation,     setRotation]    = useState(initialRotation);
  const [cleanRecs,    setCleanRecs]   = useState(initialCleanRecs);
  const [purchases,    setPurchases]   = useState(initialPurchases);
  const [actLog,       setActLog]      = useState(initialLog);
  const [supplyResps,  setSupplyResps] = useState(initialSupplyResponsibilities);
  const [activeSupplies, setActiveSupplies] = useState<Supply[]>(SUPPLIES); // Fallback until fetched
  const [user]                         = useState(initialUser);
  const [house]                        = useState(initialHouse);
  const [cleaningEnabled]              = useState(initialCleaningEnabled);
  const [cleaningRotationOrder, setCleaningRotationOrder] = useState(initialCleaningRotationOrder);
  const [suppliesRotationOrder, setSuppliesRotationOrder] = useState(initialSuppliesRotationOrder);
  const [houseSettingsData, setHouseSettingsData] = useState(initialHouseSettings);

  const [toast,        setToast]       = useState<{ msg: string; id: number } | null>(null);
  const [undoAction,   setUndoAction]  = useState<UndoAction | null>(null);
  const [showLeave,    setShowLeave]   = useState(false);
  const [shared,       setShared]      = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tabAnim,      setTabAnim]     = useState(false);
  const undoTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────
  const getMember = useCallback(
    (id: string) => members.find(m => m.id === id),
    [members]
  );

  const showToast = useCallback((msg: string, undo?: UndoAction) => {
    setToast({ msg, id: Date.now() });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (undo) {
      setUndoAction(undo);
      undoTimer.current = setTimeout(() => { setUndoAction(null); setToast(null); }, 5000);
    } else {
      setUndoAction(null);
      undoTimer.current = setTimeout(() => setToast(null), 3200);
    }
  }, []);

  const dismissToast = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setToast(null); setUndoAction(null);
  };

  const switchTab = (id: string) => {
    if (id === tab) return;
    setTabAnim(true);
    setTimeout(() => { setTab(id); setTabAnim(false); }, 120);
  };

  // ── Share — native share sheet with pre-written message ──────────────
  const shareCode = async () => {
    const url     = "https://gethousehub.vercel.app";
    const message =
      `Hey! 👋 It's ${user.name} — I've set up our house on HouseHub, an app that keeps track of who cleans and who buys shared supplies, so everything stays fair.\n\n` +
      `Here's the link: ${url}\n` +
      `Our house code is: *${house.house_code}*\n\n` +
      `To join:\n1. Open the link above\n2. Tap "Join existing house"\n3. Enter the code: *${house.house_code}*\n4. Select your name\n\n` +
      `That's it! Welcome to the HouseHub 🏠`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Join our house on HouseHub", text: message });
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      } catch {
        // user dismissed — no error needed
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard?.writeText(message).catch(() => {});
      setShared(true);
      setTimeout(() => setShared(false), 2500);
      showToast("📋 Message copied — paste it in WhatsApp!");
    }
  };

  // ── Cleaning derived state ────────────────────────────────────────────
  const cleaningDay = houseSettingsData?.cleaning_day ?? 6;

  const getNextCleaningDate = (fromDay: number): Date => {
    const today = new Date();
    const diff  = (fromDay - today.getDay() + 7) % 7 || 7;
    const next  = new Date(today);
    next.setDate(today.getDate() + diff);
    return next;
  };

  const nextCleaningDate = getNextCleaningDate(cleaningDay);

  const thisRotation  = rotation[0] ?? null;
  const thisCleanMbr  = getMember(thisRotation?.memberId ?? "");
  const isMyTurnClean = thisRotation?.memberId === user?.id;
  const myNextClean   = rotation.find(r => r.memberId === user?.id);
  const lastCleanRec  = cleanRecs[0];
  const lastCleanMbr  = getMember(lastCleanRec?.member_id ?? "");

  // ── Retrieve Active (Custom) Supplies ────────────────────────────────
  useEffect(() => {
    houseService.getHouseSettings(house.id).then(settings => {
      if (settings?.supplies) setActiveSupplies(settings.supplies);
    }).catch(console.error);
  }, [house.id]);

  // ── Supply derived state ──────────────────────────────────────────────
  const nextBuyer = useMemo(() => {
    if (supplyResps.length > 0) return getMember(supplyResps[0].next_member_id) ?? null;
    if (!members.length) return null;
    const recentIds = purchases.slice(0, members.length).map(p => p.member_id);
    return members.find(m => !recentIds.includes(m.id)) ?? members[0];
  }, [supplyResps, members, purchases, getMember]);

  const nextBuyerByItem = useMemo(() => {
    const map: Record<string, Member | null> = {};
    activeSupplies.forEach(s => {
      const resp = supplyResps.find(r => r.item_name === s.label);
      map[s.id]  = resp ? (getMember(resp.next_member_id) ?? null) : null;
    });
    return map;
  }, [supplyResps, getMember, activeSupplies]);

  const lastBoughtMap = useMemo(() => {
    const map: Record<string, Purchase> = {};
    activeSupplies.forEach(s => {
      const p = purchases.find(x => x.item_name === s.label);
      if (p) map[s.id] = p;
    });
    return map;
  }, [purchases, activeSupplies]);

  // ── doClean ───────────────────────────────────────────────────────────
  const doClean = useCallback(async () => {
    if (!user) return;
    const today  = new Date().toISOString().split("T")[0];
    const tempId = uid();
    const prevCleanRecs = cleanRecs;
    const prevRotation  = rotation;

    const newRec: CleanRecord = { id: tempId, member_id: user.id, house_id: house.id, date: today };
    setCleanRecs(prev => [newRec, ...prev]);
    
    const excludedFromCleaning = houseSettingsData?.excluded_members?.["cleaning"] ?? [];
    const activeForCleaning    = cleaningRotationOrder.filter(id => !excludedFromCleaning.includes(id));
    const orderedMembers       = activeForCleaning
      .map(id => members.find(m => m.id === id))
      .filter(Boolean) as Member[];

    const lastCleanerIdx = orderedMembers.findIndex(m => m.id === user.id);
    const newRotation = buildRotation(orderedMembers, Math.max(0, lastCleanerIdx));
    setRotation(newRotation);

    // Notify the next cleaner if it's them on this device
    const newNextCleaner = members.find(m => m.id === newRotation[0]?.memberId);
    if (newNextCleaner?.id === user.id) {
      notificationService.showLocal(
        "🧹 It's your turn to clean!",
        `The house needs cleaning. You're up next!`
      );
    }

    setActLog(prev => [{ id: uid(), member_id: user.id, action: `${user.name} cleaned the house`, icon: "🧹", created_at: now() }, ...prev]);

    let realId: string | null = null;
    try {
      const { data, error } = await supabase.from("clean_records").insert({ house_id: house.id, member_id: user.id, date: today }).select().single();
      if (error) throw error;
      realId = data.id;
      setCleanRecs(prev => prev.map(r => r.id === tempId ? { ...r, id: realId! } : r));
    } catch (err) { console.error("Failed to save clean record:", err); }

    showToast("🧹 Cleaning logged!", {
      label: "Undo",
      execute: async () => {
        setCleanRecs(prevCleanRecs);
        setRotation(prevRotation);
        if (realId) { try { await supabase.from("clean_records").delete().eq("id", realId); } catch (e) { console.error(e); } }
      },
    });
  }, [user, house, cleanRecs, rotation, members, cleaningRotationOrder, houseSettingsData, showToast]);

  // ── doBuy ─────────────────────────────────────────────────────────────
  const doBuy = useCallback(async (supply: Supply) => {
    if (!user) return;
    const today          = new Date().toISOString().split("T")[0];
    const tempId         = uid();
    const currentResp    = supplyResps.find(r => r.item_name === supply.label);
    const currentBuyerId = currentResp?.next_member_id ?? user.id;

    // Use suppliesRotationOrder (user-defined) instead of raw members insertion order
    const rotationOrder  = suppliesRotationOrder.length ? suppliesRotationOrder : members.map(m => m.id);
    
    const excludedFromItem = houseSettingsData?.excluded_members?.[supply.label] ?? [];
    const activeForItem    = rotationOrder.filter(id => !excludedFromItem.includes(id));

    if (activeForItem.length === 0) return; // safety check

    const currentBuyerIdx = activeForItem.indexOf(currentBuyerId);
    const nextBuyerId     = activeForItem[(currentBuyerIdx + 1) % activeForItem.length];
    const nextMember      = members.find(m => m.id === nextBuyerId) ?? members[0];

    const prevPurchases  = purchases;
    const prevResps      = supplyResps;

    setPurchases(prev => [{ id: tempId, member_id: user.id, house_id: house.id, item_name: supply.label, date: today }, ...prev]);
    setSupplyResps(prev => prev.map(r => r.item_name === supply.label ? { ...r, next_member_id: nextMember.id } : r));

    // Notify the next buyer if it's them on this device
    if (nextMember.id === user.id) {
      notificationService.showLocal(
        `${supply.icon} It's your turn to buy ${supply.label}!`,
        `${user.name} just bought it — you're next.`
      );
    }

    setActLog(prev => [{ id: uid(), member_id: user.id, action: `${user.name} bought ${supply.label}`, icon: supply.icon, created_at: now() }, ...prev]);

    let realId: string | null = null;
    try {
      const { data, error } = await supabase.from("purchases").insert({ house_id: house.id, member_id: user.id, item_name: supply.label, date: today }).select().single();
      if (error) throw error;
      realId = data.id;
      setPurchases(prev => prev.map(p => p.id === tempId ? { ...p, id: realId! } : p));
      await houseService.updateNextBuyer(house.id, supply.label, nextMember.id);
    } catch (err) { console.error("Failed to save purchase:", err); }

    showToast(`${supply.icon} ${supply.label} saved!`, {
      label: "Undo",
      execute: async () => {
        setPurchases(prevPurchases);
        setSupplyResps(prevResps);
        if (realId) {
          try {
            await supabase.from("purchases").delete().eq("id", realId);
            if (currentResp) await houseService.updateNextBuyer(house.id, supply.label, currentBuyerId);
          } catch (e) { console.error(e); }
        }
      },
    });
  }, [user, house, members, supplyResps, suppliesRotationOrder, purchases, houseSettingsData, showToast]);

  // ── Real-time subscriptions ───────────────────────────────────────────
  useEffect(() => {
    // Ask for notification permission after a short delay
    // so it doesn't interrupt the user immediately on load
    const permTimeout = setTimeout(() => {
      notificationService.requestPermission();
    }, 4000);

    houseService.getHouseSettings(house.id).then(s => setHouseSettingsData(s));


    const cleanSub = supabase.channel("clean_records_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clean_records", filter: `house_id=eq.${house.id}` }, async payload => {
        const rec = payload.new as CleanRecord;
        setCleanRecs(prev => prev.find(r => r.id === rec.id) ? prev : [rec, ...prev]);
        
        // Check if current user is now next to clean
        const updatedRotation = rotation; // rotation state at this point
        const nextCleanerId = updatedRotation[0]?.memberId;
        if (nextCleanerId === user.id && rec.member_id !== user.id) {
          await notificationService.showLocal(
            "🧹 It's your turn to clean!",
            "Your housemate just cleaned — you're up next!"
          );
        }
      }).subscribe();

    const purchaseSub = supabase.channel("purchases_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "purchases", filter: `house_id=eq.${house.id}` }, async payload => {
        const p = payload.new as Purchase;
        setPurchases(prev => prev.find(x => x.id === p.id) ? prev : [p, ...prev]);

        // Check if current user is now next for this item
        const resp = supplyResps.find(r => r.item_name === p.item_name);
        if (resp?.next_member_id === user.id && p.member_id !== user.id) {
          const supply = SUPPLIES.find(s => s.label === p.item_name);
          await notificationService.showLocal(
            `${supply?.icon ?? '🛒'} Your turn to buy ${p.item_name}!`,
            `Your housemate just bought it — you're next.`
          );
        }
      }).subscribe();

    const respSub = supabase.channel("supply_resps_changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "supply_responsibilities", filter: `house_id=eq.${house.id}` }, payload => {
        const updated = payload.new as SupplyResponsibility;
        setSupplyResps(prev => prev.map(r => r.id === updated.id ? updated : r));
      }).subscribe();

    return () => {
      clearTimeout(permTimeout);
      supabase.removeChannel(cleanSub);
      supabase.removeChannel(purchaseSub);
      supabase.removeChannel(respSub);
    };
  }, [house.id, rotation, user.id, supplyResps]);

  // ── Tabs — cleaning tab hidden when cleaningEnabled is false ──────────
  const tabs = [
    { id: "home",     label: "Home",     emoji: "🏠" },
    ...(cleaningEnabled ? [{ id: "cleaning", label: "Cleaning", emoji: "🧹" }] : []),
    { id: "supplies", label: "Supplies", emoji: "🛒" },
    { id: "history",  label: "History",  emoji: "📋" },
  ];

  // If cleaning tab was the active tab and cleaning got disabled, fall back to home
  useEffect(() => {
    if (!cleaningEnabled && tab === "cleaning") setTab("home");
  }, [cleaningEnabled, tab]);

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">

      {/* ── Header ── */}
      <div className="px-5 pt-10 pb-6 bg-background">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="font-display font-black text-2xl text-foreground tracking-tight">HouseHub</h1>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 rounded-xl bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-90"
            >
              <Menu size={18} />
            </button>
          </div>

          <div className="mt-7">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{todayFull()}</p>
            <h2 className="font-display font-black text-4xl text-primary leading-tight">
              Hello, {user?.name.split(" ")[0]} 👋
            </h2>
            <p className="text-muted-foreground text-base mt-2 animate-fade-up font-medium leading-relaxed" 
               style={{ animationDelay: "0.15s" }}>
              {motivationalMessage}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="max-w-xl mx-auto px-4 mt-1">
        <div className="flex gap-2 p-1 bg-muted/60 rounded-2xl border border-border/50 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`flex-1 min-w-[72px] py-2.5 px-2 rounded-xl font-bold text-sm transition-all duration-250 flex items-center justify-center gap-1.5
                ${tab === t.id
                  ? "bg-background text-foreground shadow-md scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50 active:scale-95"
                }`}
              onClick={() => switchTab(t.id)}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              <span className="text-xs">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div
        className="max-w-xl mx-auto mt-6 px-4 transition-all duration-150"
        style={{ opacity: tabAnim ? 0 : 1, transform: tabAnim ? "translateY(6px)" : "translateY(0)" }}
      >
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
            nextBuyerByItem={nextBuyerByItem}
            isMyTurnClean={isMyTurnClean}
            user={user}
            setTab={switchTab}
            cleaningEnabled={cleaningEnabled}
            activeSupplies={activeSupplies}
            nextCleaningDate={nextCleaningDate}
          />
        )}
        {tab === "cleaning" && cleaningEnabled && (
          <CleaningTab
            rotation={rotation}
            myNextClean={myNextClean}
            user={user}
            getMember={getMember}
            isMyTurnClean={isMyTurnClean}
            doClean={doClean}
            cleanRecs={cleanRecs}
            nextCleaningDate={nextCleaningDate}
          />
        )}
        {tab === "supplies" && (
          <SuppliesTab
            user={user}
            members={members}
            doBuy={doBuy}
            purchases={purchases}
            getMember={getMember}
            nextBuyerByItem={nextBuyerByItem}
            activeSupplies={activeSupplies}
            suppliesRotationOrder={suppliesRotationOrder}
          />
        )}
        {tab === "history" && (
          <HistoryTab
            user={user}
            members={members}
            cleanRecs={cleanRecs}
            purchases={purchases}
            activeSupplies={activeSupplies}
          />
        )}
      </div>

      {/* ── Leave confirmation dialog ── */}
      {showLeave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowLeave(false)}
        >
          <div
            className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-border animate-fade-up"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display font-black text-xl text-foreground mb-2">Leave house?</h3>
            <p className="text-muted-foreground text-sm mb-6">
              You'll be taken back to the home screen. You can rejoin anytime using the house code <b>{house.house_code}</b>.
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl bg-muted text-foreground font-bold text-sm hover:bg-muted/80 transition-all"
                onClick={() => setShowLeave(false)}>Cancel</button>
              <button className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm hover:bg-destructive/90 transition-all"
                onClick={onLeaveHouse}>Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast + Undo ── */}
      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-foreground text-background pl-5 pr-3 py-3 rounded-full font-bold text-sm shadow-2xl z-50 whitespace-nowrap"
          style={{ animation: "slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
          <span>{toast.msg}</span>
          {undoAction && (
            <button
              className="ml-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 active:scale-95 transition-all"
              onClick={async () => { dismissToast(); await undoAction.execute(); }}
            >
              Undo
            </button>
          )}
          <button
            className="ml-1 w-6 h-6 rounded-full flex items-center justify-center text-background/60 hover:text-background transition-colors"
            onClick={dismissToast}
          >✕</button>
        </div>
      )}


      {sidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            style={{ animation: "fade-in 0.2s ease both" }}
            onClick={() => setSidebarOpen(false)}
          />

          {/* Panel */}
          <div
            className="fixed top-0 right-0 z-50 h-full w-72 bg-card border-l border-border shadow-2xl flex flex-col"
            style={{ animation: "slide-in-sidebar 0.3s cubic-bezier(0.34,1.2,0.64,1) both" }}
          >
            {/* Header */}
            <div className="px-6 pt-10 pb-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-black text-lg text-foreground">{house.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">Code: {house.house_code}</p>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-xl hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                >✕</button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 px-4 py-6 flex flex-col gap-2">

              {/* House Settings */}
              <button
                onClick={() => { setSidebarOpen(false); setShowSettings(true); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-muted/60 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl group-hover:bg-primary/20 transition-all">⚙️</div>
                <div>
                  <p className="font-bold text-sm text-foreground">House Settings</p>
                  <p className="text-xs text-muted-foreground">Edit members, supplies & schedule</p>
                </div>
              </button>

              {/* Share House */}
              <button
                onClick={() => { setSidebarOpen(false); shareCode(); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-muted/60 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl group-hover:bg-blue-500/20 transition-all">📤</div>
                <div>
                  <p className="font-bold text-sm text-foreground">Share House</p>
                  <p className="text-xs text-muted-foreground">Invite housemates via WhatsApp</p>
                </div>
              </button>

              {/* Leave House */}
              <button
                onClick={() => { setSidebarOpen(false); setShowLeave(true); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-destructive/8 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-xl group-hover:bg-destructive/20 transition-all">🚪</div>
                <div>
                  <p className="font-bold text-sm text-destructive">Leave House</p>
                  <p className="text-xs text-muted-foreground">Return to the home screen</p>
                </div>
              </button>

            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                HouseHub · {members.length} members
              </p>
            </div>

          </div>
        </>
      )}

      <style>{`
        @keyframes slide-up { from { opacity:0; transform: translate(-50%, 16px); } to { opacity:1; transform: translate(-50%, 0); } }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slide-in-sidebar {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      {showSettings && houseSettingsData && (
        <HouseSettingsScreen
          house={house}
          members={members}
          houseSettings={houseSettingsData}
          cleaningRotationOrder={cleaningRotationOrder}
          suppliesRotationOrder={suppliesRotationOrder}
          onClose={() => setShowSettings(false)}
          onMembersChange={(newMembers) => setMembers(newMembers)}
          onSettingsChange={(newSettings) => setHouseSettingsData(newSettings)}
          onCleaningOrderChange={setCleaningRotationOrder}
          onSuppliesOrderChange={setSuppliesRotationOrder}
        />
      )}
    </div>
  );
};


export default Dashboard;
