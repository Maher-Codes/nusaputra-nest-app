import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Member, House, CleanRecord, Purchase, ActivityLog,
  RotationEntry, SupplyResponsibility, Supply, SUPPLIES,
  uid, now, nextSat, todayFull, buildRotation, TravelMode, TravelIOU, TopContributor,
  MemberProfile, getDisplayName
} from "@/lib/househub";
import HomeTab     from "./HomeTab";
import CleaningTab from "./CleaningTab";
import SuppliesTab from "./SuppliesTab";
import HistoryTab  from "./HistoryTab";
import Avatar from "./Avatar";
import { houseService } from "@/services/houseService";
import { db } from "@/lib/firebase";
import { onValue, ref, push, set, remove } from "firebase/database";
import { LogOut, Share2, Check, Menu, Bell, AlertTriangle, X } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import HouseSettingsScreen from "./HouseSettings";
import { ReportModal } from "./ReportModal";
import { NotificationDrawer } from "./NotificationDrawer";
import { TravelModeModal } from "./TravelModeModal";
import { ReportNotification } from "@/lib/househub";
import MyProfile from "./MyProfile";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";


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

// Motivational messages moved inside component for translation

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
  const { t } = useTranslation();

  const MESSAGES = [
    'home.motivation_1',
    'home.motivation_2',
    'home.motivation_3',
    'home.motivation_4',
    'home.motivation_5',
    'home.motivation_6',
    'home.motivation_7',
    'home.motivation_8',
    'home.motivation_9',
    'home.motivation_10',
    'home.motivation_11',
    'home.motivation_12',
  ];

  const [visible, setVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setVisible(false);

      // After fade out completes (300ms), change message and fade back in
      setTimeout(() => {
        setMessageIndex(prev => (prev + 1) % MESSAGES.length);
        setVisible(true);
      }, 300);

    }, 10000); // change every 10 seconds

    return () => clearInterval(interval);
  }, []);
  const [members,      setMembers]     = useState(initialMembers);
  // const [rotation,     setRotation]    = useState(initialRotation); // Replaced by useMemo
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
  const [memberProfiles, setMemberProfiles] = useState<Record<string, MemberProfile>>({});

  const [toast,        setToast]       = useState<{ msg: string; id: number } | null>(null);
  const [undoAction,   setUndoAction]  = useState<UndoAction | null>(null);
  const [showLeave,    setShowLeave]   = useState(false);
  const [shared,       setShared]      = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tabAnim,      setTabAnim]     = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [travelModalOpen, setTravelModalOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTravelModes, setActiveTravelModes] = useState<TravelMode[]>([]);
  const [unsettledIOUs, setUnsettledIOUs] = useState<TravelIOU[]>([]);
  const [notifications, setNotifications] = useState<ReportNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [topContributor, setTopContributor] = useState<TopContributor | null>(null);
  const undoTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fix 1 — restore language immediately on mount (before Firebase listener fires)
  useEffect(() => {
    async function restoreLanguage() {
      try {
        const profile = await houseService.getMemberProfile(house.id, user.id);
        if (profile?.language) {
          i18n.changeLanguage(profile.language);
        }
      } catch {
        // Silently fail — default language stays
      }
    }
    restoreLanguage();
  }, []); // Empty deps — runs once on mount only

  // Watch for profile language changes from real-time listener
  useEffect(() => {
    const myProfile = memberProfiles[user.id];
    if (myProfile?.language) {
      i18n.changeLanguage(myProfile.language);
    }
  }, [memberProfiles, user.id]);

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
    const url     = "https://nusanest.vercel.app";
    const message =
      `Hey! 👋 It's ${user.name} — I've set up our house on NusaNest, the student living app for Universitas Nusa Putra.\n\n` +
      `Here's the link: ${url}\n` +
      `Our house code is: *${house.house_code}*\n\n` +
      `To join:\n1. Open the link above\n2. Tap "Join existing house"\n3. Enter the code: *${house.house_code}*\n4. Select your name\n\n` +
      `That's it! Welcome to the NusaNest 🏠`;

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
      showToast(t('dashboard.share_copied', "📋 Message copied — paste it in WhatsApp!"));
    }
  };

  // ── Cleaning derived state ────────────────────────────────────────────
  const nextCleaningDate = useMemo(() => {
    const day   = houseSettingsData?.cleaning_day ?? 6;
    const today = new Date();
    const diff  = (day - today.getDay() + 7) % 7 || 7;
    const next  = new Date(today);
    next.setDate(today.getDate() + diff);
    return next;
  }, [houseSettingsData?.cleaning_day]);

  const rotation = useMemo(() => {
    const excludedFromCleaning = houseSettingsData?.excluded_members?.["cleaning"] ?? [];
    const currentlyTraveling   = activeTravelModes.map(t => t.member_id);
    const allSkip = Array.from(new Set([...excludedFromCleaning, ...currentlyTraveling]));

    const activeForCleaning = cleaningRotationOrder.filter(id => !allSkip.includes(id));
    if (!activeForCleaning.length) return [];

    const masterOrder = cleaningRotationOrder.map(id => members.find(m => m.id === id)).filter(Boolean) as Member[];
    const lastCleanerId = cleanRecs[0]?.member_id;
    const lastCleanerIdx = masterOrder.findIndex(m => m.id === lastCleanerId);

    return buildRotation(masterOrder, Math.max(0, lastCleanerIdx), allSkip);
  }, [cleanRecs, cleaningRotationOrder, activeTravelModes, members]);

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
      if (!resp) {
        map[s.id] = null;
        return;
      }
      
      const nextId = resp.next_member_id;
      const isTraveling = activeTravelModes.some(t => t.member_id === nextId);
      
      if (isTraveling) {
        // If they are traveling, the system should have already advanced them 
        // to cover person (in service) or we should visually show it's the cover person.
        // Actually next_member_id in DB is updated by service on activateTravelMode.
        map[s.id] = getMember(nextId) ?? null;
      } else {
        map[s.id] = getMember(nextId) ?? null;
      }
    });
    return map;
  }, [supplyResps, getMember, activeSupplies, activeTravelModes]);

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
    
    // Rotation is now reactive to cleanRecs via useMemo

    // Notify next cleaner (handled by useEffect on cleanRecs change)
    setActLog(prev => [{ id: uid(), member_id: user.id, action: `${user.name} cleaned the house`, icon: "🧹", created_at: now() }, ...prev]);

    let realId: string | null = null;
    try {
      const recsRef = ref(db, `clean_records/${house.id}`);
      const newRecRef = push(recsRef);
      realId = newRecRef.key;
      await set(newRecRef, {
        id: realId,
        house_id: house.id,
        member_id: user.id,
        date: today,
        created_at: new Date().toISOString()
      });
      setCleanRecs(prev => prev.map(r => r.id === tempId ? { ...r, id: realId! } : r));
    } catch (err) { console.error("Failed to save clean record:", err); }

    showToast(t('dashboard.cleaning_logged', "🧹 Cleaning logged!"), {
      label: t('common.undo', "Undo"),
      execute: async () => {
        setCleanRecs(prevCleanRecs);
        if (realId) { try { await remove(ref(db, `clean_records/${house.id}/${realId}`)); } catch (e) { console.error(e); } }
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
    let nextBuyerId     = activeForItem[(currentBuyerIdx + 1) % activeForItem.length];

    // If next person is traveling, find the next one after them (Skip or Cover handles by service)
    // But actually, we should check if they chose "skip" or "cover" in their TravelMode.
    // Simplifying: we'll follow the same logic as activateTravelMode handover.
    const travelingMembers = activeTravelModes.map(t => t.member_id);
    let potentialNextIdx = (currentBuyerIdx + 1) % activeForItem.length;
    while (travelingMembers.includes(activeForItem[potentialNextIdx]) && potentialNextIdx !== currentBuyerIdx) {
      const tMode = activeTravelModes.find(t => t.member_id === activeForItem[potentialNextIdx]);
      const sId = activeSupplies.find(s => s.label === supply.label)?.id;
      if (tMode && sId && tMode.supply_decisions[sId] === "cover") {
        // If cover, use the cover assignment
        nextBuyerId = tMode.cover_assignments[sId] || nextBuyerId;
        break; 
      } else {
        // If skip, keep moving
        potentialNextIdx = (potentialNextIdx + 1) % activeForItem.length;
        nextBuyerId = activeForItem[potentialNextIdx];
      }
    }

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
      const purchasesRef = ref(db, `purchases/${house.id}`);
      const newPurchaseRef = push(purchasesRef);
      realId = newPurchaseRef.key;
      await set(newPurchaseRef, {
        id: realId,
        house_id: house.id,
        member_id: user.id,
        item_name: supply.label,
        date: today,
        created_at: new Date().toISOString()
      });
      setPurchases(prev => prev.map(p => p.id === tempId ? { ...p, id: realId! } : p));
      await houseService.updateNextBuyer(house.id, supply.label, nextMember.id);
    } catch (err) { console.error("Failed to save purchase:", err); }

    showToast(t('dashboard.supply_saved', { icon: supply.icon, label: supply.label, defaultValue: `${supply.icon} ${supply.label} saved!` }), {
      label: t('common.undo', "Undo"),
      execute: async () => {
        setPurchases(prevPurchases);
        setSupplyResps(prevResps);
        if (realId) {
          try {
            await remove(ref(db, `purchases/${house.id}/${realId}`));
            if (currentResp) await houseService.updateNextBuyer(house.id, supply.label, currentBuyerId);
          } catch (e) { console.error(e); }
        }
      },
    });
  }, [user, house, members, supplyResps, suppliesRotationOrder, purchases, houseSettingsData, showToast]);

  const fetchNotifications = useCallback(async () => {
    try {
      const notifs = await houseService.getNotificationsForMember(house.id, user.id);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (err) {
      console.error(err);
    }
  }, [house.id, user.id]);

  // ── Real-time subscriptions ───────────────────────────────────────────
  useEffect(() => {
    // Ask for notification permission after a short delay
    // so it doesn't interrupt the user immediately on load
    const permTimeout = setTimeout(() => {
      notificationService.requestPermission();
    }, 4000);

    houseService.getHouseSettings(house.id).then(s => setHouseSettingsData(s));

    // Firebase Clean Records Listener
    const cleanRecsRef = ref(db, `clean_records/${house.id}`);
    const unsubscribeClean = onValue(cleanRecsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const recs = Object.values(data) as CleanRecord[];
        const sortedRecs = recs.sort((a, b) => b.date.localeCompare(a.date));
        setCleanRecs(sortedRecs);

        const latestRec = sortedRecs[0];
        // Check if current user is now next to clean
        const nextCleanerId = rotation[0]?.memberId;
        if (nextCleanerId === user.id && latestRec && latestRec.member_id !== user.id) {
          await notificationService.showLocal(
            "🧹 It's your turn to clean!",
            "Your housemate just cleaned — you're up next!"
          );
        }
      }
    });

    // Firebase Purchases Listener
    const purchasesRef = ref(db, `purchases/${house.id}`);
    const unsubscribePurchases = onValue(purchasesRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const items = Object.values(data) as Purchase[];
        const sortedPurchases = items.sort((a, b) => b.date.localeCompare(a.date));
        setPurchases(sortedPurchases);

        const latestPurchase = sortedPurchases[0];
        if (latestPurchase && latestPurchase.member_id !== user.id) {
          const resp = supplyResps.find(r => r.item_name === latestPurchase.item_name);
          if (resp?.next_member_id === user.id) {
            const supply = activeSupplies.find(s => s.label === latestPurchase.item_name);
            await notificationService.showLocal(
              `${supply?.icon ?? '🛒'} Your turn to buy ${latestPurchase.item_name}!`,
              `Your housemate just bought it — you're next.`
            );
          }
        }
      }
    });

    // Firebase Supply Responsibilities Listener
    const respsRef = ref(db, `supply_responsibilities/${house.id}`);
    const unsubscribeResps = onValue(respsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSupplyResps(Object.values(data) as SupplyResponsibility[]);
      }
    });

    // Firebase Notifications Listener
    const notifsRef = ref(db, `report_notifications/${house.id}`);
    const unsubscribeNotifs = onValue(notifsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allNotifs = Object.values(data) as ReportNotification[];
        const filtered = allNotifs
          .filter(n => n.member_id === user.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        
        const prevUnread = notifications.filter(n => !n.read).length;
        const newUnread  = filtered.filter(n => !n.read).length;

        if (newUnread > prevUnread) {
          const newest = filtered.find(n => !n.read);
          if (newest) {
            notificationService.showLocal("New Notification", newest.message);
          }
        }

        setNotifications(filtered);
        setUnreadCount(newUnread);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    // Firebase Travel Modes Listener
    const travelModesRef = ref(db, `travel_modes/${house.id}`);
    const unsubscribeTravel = onValue(travelModesRef, (snapshot) => {
      const today = new Date().toISOString().split("T")[0];
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allModes = Object.values(data) as TravelMode[];
        const filtered = allModes.filter(t => t.status === "active" && t.return_date >= today);
        
        // Auto-return check: if any was active but now returned (date passed)
        const expired = allModes.filter(t => t.status === "active" && t.return_date < today);
        expired.forEach(t => houseService.endTravelMode(house.id, t.id));

        setActiveTravelModes(filtered);
      } else {
        setActiveTravelModes([]);
      }
    });

    // Firebase Travel IOUs Listener
    const iousRef = ref(db, `travel_ious/${house.id}`);
    const unsubscribeIOUs = onValue(iousRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allIOUs = Object.values(data) as TravelIOU[];
        setUnsettledIOUs(allIOUs.filter(iou => !iou.settled));
      } else {
        setUnsettledIOUs([]);
      }
    });

    // Firebase Top Contributor Listener
    const topRef = ref(db, `house_settings/${house.id}/top_contributor`);
    const unsubscribeTop = onValue(topRef, (snapshot) => {
      if (snapshot.exists()) {
        setTopContributor(snapshot.val() as TopContributor);
      } else {
        setTopContributor(null);
      }
    });

    // Firebase Member Profiles Listener
    const profilesRef = ref(db, `member_profiles/${house.id}`);
    const unsubscribeProfiles = onValue(profilesRef, (snapshot) => {
      if (snapshot.exists()) {
        const profiles = snapshot.val();
        setMemberProfiles(profiles);
        
        // Fix A - Place 1: Apply language on initial load
        const myProfile = profiles[user.id];
        if (myProfile?.language) {
          i18n.changeLanguage(myProfile.language);
        }
      } else {
        setMemberProfiles({});
      }
    });

    // Travel Mode Return Check
    const myTravel = activeTravelModes.find(t => t.member_id === user.id);
    if (myTravel && myTravel.return_date) {
      const today = new Date().toISOString().split("T")[0];
      if (today >= myTravel.return_date) {
        showToast(t('dashboard.welcome_back', "Welcome back? Your travel ended! 🏠"), {
          label: t('common.i_am_back', "I'm Back"),
          execute: async () => {
            await houseService.endTravelMode(house.id, myTravel.id);
          }
        });
      }
    }

    return () => {
      clearTimeout(permTimeout);
      unsubscribeClean();
      unsubscribePurchases();
      unsubscribeResps();
      unsubscribeNotifs();
      unsubscribeTravel();
      unsubscribeIOUs();
      unsubscribeTop();
      unsubscribeProfiles();
    };
  }, [house.id, rotation, user.id, supplyResps, activeSupplies, notifications, activeTravelModes, showToast]);

  // ── Tabs — cleaning tab hidden when cleaningEnabled is false ──────────
  const tabs = [
    { id: "home",     label: t('tabs.home', "Home"),     emoji: "🏠" },
    ...(cleaningEnabled ? [{ id: "cleaning", label: t('tabs.cleaning', "Cleaning"), emoji: "🧹" }] : []),
    { id: "supplies", label: t('tabs.supplies', "Supplies"), emoji: "🛒" },
    { id: "history",  label: t('tabs.history', "History"),  emoji: "📋" },
  ];

  // If cleaning tab was the active tab and cleaning got disabled, fall back to home
  useEffect(() => {
    if (!cleaningEnabled && tab === "cleaning") setTab("home");
  }, [cleaningEnabled, tab]);

  const myCleanCount = cleanRecs.filter(r => r.member_id === user.id).length;
  const myPurchaseCount = purchases.filter(p => p.member_id === user.id).length;

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">

      {/* ── Header ── */}
      <div className="px-5 pt-10 pb-6 sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border/40">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/nusa-putra-logo.png" 
                alt="Nusa Putra University" 
                className="nusa-logo h-9 w-auto"
              />
              <h1 className="font-display font-black text-2xl text-primary tracking-tight">NusaNest</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNotifDrawerOpen(true)}

                className="p-2.5 rounded-xl bg-card border-2 border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-90 relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-background">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2.5 rounded-xl bg-card border-2 border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-90"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 pb-2">
        <div className="max-w-xl mx-auto">
          <div className="mt-2">
            <p className="text-[11px] font-bold text-secondary uppercase tracking-[0.2em] mb-1">{todayFull()}</p>
            <h2 className="font-display font-black text-4xl text-foreground leading-tight">
              {t('dashboard.hello', "Hello,")} <span className="text-primary">{getDisplayName(user.id, members, memberProfiles).split(" ")[0]}</span> 👋
            </h2>
            <p className="text-muted-foreground text-base mt-2 font-medium leading-relaxed transition-opacity duration-300" 
               style={{ opacity: visible ? 1 : 0 }}>
              {t(MESSAGES[messageIndex])}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="max-w-xl mx-auto px-4 mt-6">
        <div className="flex gap-2 p-1.5 bg-card rounded-2xl border-2 border-border overflow-x-auto scrollbar-hide shadow-sm">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`flex-1 min-w-[80px] py-3 px-2 rounded-xl font-bold text-sm transition-all duration-300 flex flex-col items-center justify-center gap-1
                ${tab === t.id
                  ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5 active:scale-95"
                }`}
              onClick={() => switchTab(t.id)}
            >
              <span className={`text-lg leading-none transition-transform duration-300 ${tab === t.id ? "scale-110" : ""}`}>{t.emoji}</span>
              <span className="text-[10px] uppercase tracking-wider">{t.label}</span>
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
            activeTravelModes={activeTravelModes}
            unsettledIOUs={unsettledIOUs}
            houseId={house.id}
            topContributor={topContributor}
            memberProfiles={memberProfiles}
            members={members}
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
            activeTravelModes={activeTravelModes}
            topContributor={topContributor}
            memberProfiles={memberProfiles}
            members={members}
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
            activeTravelModes={activeTravelModes}
            topContributor={topContributor}
            memberProfiles={memberProfiles}
          />
        )}
        {tab === "history" && (
          <HistoryTab
            user={user}
            members={members}
            cleanRecs={cleanRecs}
            purchases={purchases}
            activeSupplies={activeSupplies}
            topContributor={topContributor}
            houseId={house.id}
            house={house}
            excludedMembers={houseSettingsData?.excluded_members || {}}
            memberProfiles={memberProfiles}
          />
        )}
      </div>

      {/* ── Leave confirmation dialog ── */}
      {showLeave && (
        <>
          <div 
            className="fixed inset-0 z-[61] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowLeave(false)}
          />
          <div className="fixed inset-0 z-[62] flex items-center justify-center p-4">
            <div 
              className="w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-300"
            >
              <div className="flex flex-col bg-white overflow-hidden" style={{ borderRadius: "20px", boxShadow: "0 25px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)" }}>
                {/* Hero Strip */}
                <div 
                  className="relative shrink-0 overflow-hidden"
                  style={{ 
                    background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)",
                    padding: "24px 24px 40px 24px" 
                  }}
                >
                  <div 
                    className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, #D4A373, transparent)" }}
                  />
                  <div 
                    className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, #ffffff, transparent)" }}
                  />
                  
                  <button 
                    onClick={() => setShowLeave(false)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)", zIndex: 20 }}
                  >
                    <X size={15} color="white" />
                  </button>

                  <div className="relative z-10 text-center">
                    <span className="text-3xl mb-2 block">🚪</span>
                    <h3 className="text-xl font-display font-black text-white">{t('dashboard.leave_house_title', 'Leave House?')}</h3>
                  </div>
                </div>

                <div className="p-6 text-center">
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3 mb-6 text-left">
                    <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      {t('dashboard.leave_house_desc', {
                        code: house.house_code,
                        defaultValue: `You can rejoin anytime using the house code ${house.house_code}.`
                      })}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLeave(false)}
                      className="flex-1 h-11 rounded-2xl font-display font-bold text-sm transition-colors"
                      style={{ border: "2px solid rgba(119,0,66,0.25)", color: "#770042" }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(119,0,66,0.08)"}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={onLeaveHouse}
                      className="flex-1 h-11 rounded-2xl font-display font-black text-sm text-white shadow-lg active:scale-95 transition-all"
                      style={{ backgroundColor: "#770042" }}
                    >
                      {t('dashboard.leave', 'Leave')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
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
            className="fixed top-0 right-0 z-50 h-full w-72 bg-card flex flex-col"
            style={{
              animation: "slide-in-sidebar 0.3s cubic-bezier(0.34,1.2,0.64,1) both",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
            }}
          >

            {/* ── Header — personal identity ── */}
            <div
              className="shrink-0 px-5 pt-10 pb-5 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)" }}
            >
              {/* Decorative circles */}
              <div
                className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10"
                style={{ background: "radial-gradient(circle, #D4A373, transparent)" }}
              />
              <div
                className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-10"
                style={{ background: "radial-gradient(circle, #ffffff, transparent)" }}
              />

              {/* Close button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.15)", zIndex: 20 }}
              >
                <span style={{ color: "white", fontSize: "14px", fontWeight: 900 }}>✕</span>
              </button>

              {/* Member identity */}
              <div className="relative z-10 flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="p-[2px] rounded-[14px] shrink-0"
                  style={{ background: "linear-gradient(135deg, #D4A373, #f5d9a8, #D4A373)" }}
                >
                  <div className="p-[2px] bg-white/20 rounded-[12px]">
                    <Avatar
                      member={user}
                      profile={memberProfiles[user.id]}
                      size={44}
                      radius={12}
                      fontSize={16}
                    />
                  </div>
                </div>

                {/* Name + house info */}
                <div className="min-w-0 flex-1">
                  <p className="font-display font-black text-white text-base leading-tight truncate">
                    {getDisplayName(user.id, members, memberProfiles)}
                  </p>
                  <p
                    className="text-[11px] font-bold mt-0.5 truncate"
                    style={{ color: "#D4A373" }}
                  >
                    🏠 {house.name.toUpperCase()} · {house.house_code}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Menu Items ── */}
            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">

              {/* House Settings — icon rotates on hover */}
              <button
                onClick={() => { setSidebarOpen(false); setShowSettings(true); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 text-left group hover:bg-primary/8 active:scale-[0.97]"
                style={{ transition: "background 0.2s ease, transform 0.15s ease" }}
                onMouseDown={(e) => e.currentTarget.style.animation = "row-press 0.2s ease both"}
                onMouseUp={(e) => e.currentTarget.style.animation = ""}
              >
                <div
                  className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0 transition-all duration-200 group-hover:bg-primary/20"
                  style={{ transition: "transform 0.3s ease, background 0.2s ease" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "scale(1.1) rotate(30deg)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "scale(1) rotate(0deg)"}
                >
                  ⚙️
                </div>
                <div
                  className="min-w-0 transition-transform duration-200"
                  style={{ transition: "transform 0.2s ease" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(0)"}
                >
                  <p className="font-bold text-[14px] text-foreground leading-tight">
                    {t('dashboard.sidebar.settings', "House Settings")}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">
                    {t('dashboard.sidebar.settings_desc', "Members, supplies & schedule")}
                  </p>
                </div>
              </button>

              {/* My Profile — avatar glows gold on hover */}
              <button
                onClick={() => { setSidebarOpen(false); setShowProfile(true); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 text-left group hover:bg-primary/8 active:scale-[0.97]"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-visible transition-all duration-200"
                  style={{ transition: "box-shadow 0.25s ease, transform 0.2s ease" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 2px #D4A373";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  <Avatar member={user} profile={memberProfiles[user.id]} size={36} radius={10} fontSize={14} />
                </div>
                <div
                  className="min-w-0"
                  style={{ transition: "transform 0.2s ease" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(0)"}
                >
                  <p className="font-bold text-[14px] text-foreground leading-tight">
                    {t('dashboard.sidebar.profile', "My Profile")}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">
                    {t('dashboard.sidebar.profile_desc', "Nickname, language & reminders")}
                  </p>
                </div>
              </button>

              {/* Share NusaNest — icon bounces up on hover */}
              <button
                onClick={() => { setSidebarOpen(false); shareCode(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 text-left group hover:bg-primary/8 active:scale-[0.97]"
              >
                <div
                  className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0 transition-all duration-200 group-hover:bg-primary/20"
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.animation = "icon-bounce-up 0.4s ease both"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.animation = ""}
                >
                  📤
                </div>
                <div
                  className="min-w-0"
                  style={{ transition: "transform 0.2s ease" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(0)"}
                >
                  <p className="font-bold text-[14px] text-foreground leading-tight">
                    {t('dashboard.sidebar.share', "Share NusaNest")}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">
                    {t('dashboard.sidebar.share_desc', "Invite housemates via WhatsApp")}
                  </p>
                </div>
              </button>

              {/* Travel Mode — icon flies right on hover */}
              <button
                onClick={() => { setSidebarOpen(false); setTravelModalOpen(true); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 text-left group hover:bg-primary/8 active:scale-[0.97]"
              >
                <div
                  className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0 transition-all duration-200 group-hover:bg-primary/20 relative"
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.animation = "icon-fly 0.4s ease both"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.animation = ""}
                >
                  ✈️
                  {activeTravelModes.length > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-card"
                      style={{ backgroundColor: "#D4A373" }}
                    />
                  )}
                </div>
                <div
                  className="min-w-0"
                  style={{ transition: "transform 0.2s ease" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(0)"}
                >
                  <p className="font-bold text-[14px] text-foreground leading-tight">
                    {t('dashboard.sidebar.travel', "Travel Mode")}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">
                    {t('dashboard.sidebar.travel_desc', "Pause your turns while away")}
                  </p>
                </div>
              </button>

              {/* Divider before danger zone */}
              <div className="my-1 mx-3 h-px bg-border/60" />

              {/* Report A Problem — icon pulses on hover */}
              <button
                onClick={() => { setSidebarOpen(false); setReportModalOpen(true); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 text-left group hover:bg-red-500/8 active:scale-[0.97]"
              >
                <div
                  className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-lg shrink-0 transition-all duration-200 group-hover:bg-red-500/20"
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.animation = "icon-pulse 0.6s ease infinite"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.animation = ""}
                >
                  🚨
                </div>
                <div
                  className="min-w-0"
                  style={{ transition: "transform 0.2s ease" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(0)"}
                >
                  <p className="font-bold text-[14px] text-red-600 leading-tight">
                    {t('dashboard.sidebar.report', "Report A Problem")}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">
                    {t('dashboard.sidebar.report_desc', "Anonymously report house issues")}
                  </p>
                </div>
              </button>

              {/* Leave House — icon slides right on hover like a door opening */}
              <button
                onClick={() => { setSidebarOpen(false); setShowLeave(true); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 text-left group hover:bg-red-500/8 active:scale-[0.97]"
              >
                <div
                  className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-lg shrink-0 transition-all duration-200 group-hover:bg-red-500/20"
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.animation = "icon-fly 0.35s ease both"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.animation = ""}
                >
                  🚪
                </div>
                <div
                  className="min-w-0"
                  style={{ transition: "transform 0.2s ease" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateX(0)"}
                >
                  <p className="font-bold text-[14px] text-red-600 leading-tight">
                    {t('dashboard.sidebar.leave', "Leave House")}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">
                    {t('dashboard.sidebar.leave_desc', "Return to the entry screen")}
                  </p>
                </div>
              </button>

            </div>

            {/* ── Footer ── */}
            <div
              className="shrink-0 px-5 py-4 flex items-center gap-3"
              style={{
                borderTop: "1px solid rgba(119,0,66,0.12)",
                background: "rgba(119,0,66,0.04)",
              }}
            >
              {/* Logo — full color, not grayscale */}
              <img
                src="/nusa-putra-logo.png"
                alt="Nusa Putra"
                className="h-7 w-auto shrink-0"
                style={{ opacity: 0.85 }}
              />
              <div className="min-w-0">
                <p
                  className="text-[11px] font-black uppercase tracking-[0.15em] truncate"
                  style={{ color: "#D4A373" }}
                >
                  NusaNest
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#770042' }}>
                  {members.length} {members.length === 1 ? 'MEMBER' : 'MEMBERS'} LIVING TOGETHER
                </p>
              </div>
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
        @keyframes icon-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.85); }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes icon-bounce-up {
          0%   { transform: translateY(0); }
          40%  { transform: translateY(-5px); }
          70%  { transform: translateY(2px); }
          100% { transform: translateY(0); }
        }
        @keyframes icon-fly {
          0%   { transform: translateX(0); }
          40%  { transform: translateX(5px); }
          70%  { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
        @keyframes icon-pulse {
          0%   { transform: scale(1); opacity: 1; }
          50%  { transform: scale(1.15); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes row-press {
          0%   { transform: scale(1); }
          50%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes text-slide {
          0%   { transform: translateX(0); }
          100% { transform: translateX(3px); }
        }
      `}</style>

      {showSettings && houseSettingsData && (
        <>
          {/* Dark overlay */}
          <div
            className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowSettings(false)}
          />
          {/* Centered modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full animate-in fade-in zoom-in-95 duration-200"
              style={{ maxWidth: "480px" }}
            >
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
                onSuppliesOrderChange={(order) => setHouseSettingsData(prev => prev ? {...prev, supplies_rotation_order: order} : null)}
                memberProfiles={memberProfiles}
              />
            </div>
          </div>
        </>
      )}

      {reportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 z-[-1] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setReportModalOpen(false)}
          />
          <div 
            className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-300"
          >
            <ReportModal
              isOpen={reportModalOpen}
              onClose={() => setReportModalOpen(false)}
              houseId={house.id}
              currentMemberId={user.id}
              members={members}
            />
          </div>
        </div>
      )}

      {notifDrawerOpen && (
        <>
          {/* Dark overlay */}
          <div
            className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setNotifDrawerOpen(false)}
          />

          {/* Centered modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full animate-in fade-in zoom-in-95 duration-200"
              style={{ maxWidth: "440px" }}
            >
              <NotificationDrawer
                isOpen={notifDrawerOpen}
                onClose={() => setNotifDrawerOpen(false)}
                notifications={notifications}
                houseId={house.id}
                onRefresh={fetchNotifications}
              />
            </div>
          </div>
        </>
      )}

      {travelModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 z-[-1] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setTravelModalOpen(false)}
          />
          <div 
            className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-300"
          >
            <TravelModeModal
              isOpen={travelModalOpen}
              onClose={() => setTravelModalOpen(false)}
              houseId={house.id}
              currentMemberId={user.id}
              members={members}
              activeSupplies={activeSupplies}
            />
          </div>
        </div>
      )}

      {showProfile && (
        <>
          {/* Dark overlay — clicking it closes the modal */}
          <div
            className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowProfile(false)}
          />

          {/* Centered modal container */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full animate-in fade-in zoom-in-95 duration-200"
              style={{ maxWidth: "440px" }}
            >
              <MyProfile
                member={user}
                houseId={house.id}
                houseCode={house.house_code}
                totalCleans={myCleanCount}
                totalPurchases={myPurchaseCount}
                memberProfiles={memberProfiles}
                members={members}
                onBack={() => setShowProfile(false)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};


export default Dashboard;
