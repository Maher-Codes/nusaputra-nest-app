import { useState, useEffect, useCallback } from "react";
import {
  Member, House, CleanRecord, Purchase,
  ActivityLog, RotationEntry, SupplyResponsibility,
  buildRotation,
} from "@/lib/househub";
import SplashScreen  from "@/components/househub/SplashScreen";
import LandingScreen from "@/components/househub/LandingScreen";
import SetupWizard   from "@/components/househub/SetupWizard";
import JoinScreen    from "@/components/househub/JoinScreen";
import Dashboard     from "@/components/househub/Dashboard";
import { houseService } from "@/services/houseService";

// ── Session storage keys ───────────────────────────────────────────
const SK_CODE      = "hh_house_code";
const SK_MEMBER_ID = "hh_member_id";

type Screen = "splash" | "landing" | "setup" | "join" | "app";

const Index = () => {
  const [screen,  setScreen]  = useState<Screen>("splash");
  const [splashFinished, setSplashFinished] = useState(false);
  const [appData, setAppData] = useState<{
    user:                   Member;
    house:                  House;
    members:                Member[];
    cleanRecs:              CleanRecord[];
    purchases:              Purchase[];
    log:                    ActivityLog[];
    rotation:               RotationEntry[];
    supplyResponsibilities: SupplyResponsibility[];
    cleaningEnabled:        boolean;
    cleaningRotationOrder:  string[];
    suppliesRotationOrder:  string[];
    initialHouseSettings:   any;
  } | null>(null);

  // ── On mount: check for a saved session ───────────────────────────
  useEffect(() => {
    // Start splash timer (minimum 2.5 seconds for brand presence)
    const splashTimer = setTimeout(() => {
      setSplashFinished(true);
    }, 2500);

    const savedCode     = localStorage.getItem(SK_CODE);
    const savedMemberId = localStorage.getItem(SK_MEMBER_ID);

    if (savedCode && savedMemberId) {
      // Returning user — fetch data silently
      restoreSession(savedCode, savedMemberId);
    } else {
      // New user — will go to landing after splash timer
    }

    return () => clearTimeout(splashTimer);
  }, []);

  // ── Move to next screen only when splash is done ─────────────────
  useEffect(() => {
    if (!splashFinished) return;

    if (appData) {
      setScreen("app");
    } else if (!localStorage.getItem(SK_CODE)) {
      setScreen("landing");
    }
  }, [splashFinished, appData]);

  // ── Restore session from Supabase using saved house code + member id
  const restoreSession = async (code: string, memberId: string) => {
    try {
      const house = await houseService.getHouseByCode(code);

      if (!house) {
        // House no longer exists — clear and go to landing
        clearSession();
        setScreen("landing");
        return;
      }

      const [members, cleanRecs, purchases, supplyResps, houseSettings] = await Promise.all([
        houseService.getMembers(house.id),
        houseService.getCleanRecords(house.id),
        houseService.getPurchases(house.id),
        houseService.getSupplyResponsibilities(house.id),
        houseService.getHouseSettings(house.id),
      ]);

      const member = members.find(m => m.id === memberId);

      if (!member) {
        // Member not found — clear and go to landing
        clearSession();
        setScreen("landing");
        return;
      }

      // Rebuild rotation from the most recent clean record
      const lastCleanerIdx = cleanRecs[0]
        ? members.findIndex(m => m.id === cleanRecs[0].member_id)
        : 0;
      const rotation = buildRotation(members, Math.max(0, lastCleanerIdx));

      const cleaningRotationOrder: string[] = houseSettings?.cleaning_rotation_order?.length
        ? houseSettings.cleaning_rotation_order
        : members.map(m => m.id); // fallback for legacy houses

      const suppliesRotationOrder: string[] = houseSettings?.supplies_rotation_order?.length
        ? houseSettings.supplies_rotation_order
        : members.map(m => m.id); // fallback for legacy houses

      setAppData({
        user:                   member,
        house:                  house as House,
        members,
        cleanRecs,
        purchases,
        log:                    [],
        rotation,
        supplyResponsibilities: supplyResps,
        cleaningEnabled:        houseSettings?.cleaning_enabled ?? true,
        cleaningRotationOrder,
        suppliesRotationOrder,
        initialHouseSettings:   houseSettings,
      });
      // Data is ready, but we don't setScreen("app") here anymore. 
      // The second useEffect handles the transition after splashFinished.

    } catch (err) {
      console.error("Session restore failed:", err);
      clearSession();
      setScreen("landing");
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────
  const saveSession  = (houseCode: string, memberId: string) => {
    localStorage.setItem(SK_CODE,      houseCode);
    localStorage.setItem(SK_MEMBER_ID, memberId);
  };

  const clearSession = () => {
    localStorage.removeItem(SK_CODE);
    localStorage.removeItem(SK_MEMBER_ID);
  };

  // ── enterApp — called by SetupWizard and JoinScreen ───────────────
  const enterApp = useCallback((
    member:               Member,
    houseData:            House,
    membersData:          Member[],
    initClean:            CleanRecord[],
    initPurchases:        Purchase[],
    initLog:              ActivityLog[],
    initRotation:         RotationEntry[],
    initSupplyResps:      SupplyResponsibility[] = [],
    cleaningEnabled:      boolean = true,
    cleaningRotationOrder: string[] = [],
    suppliesRotationOrder: string[] = [],
    initialHouseSettings:  any = {},
  ) => {
    // Persist session so refresh goes straight back to dashboard
    saveSession(houseData.house_code, member.id);

    setAppData({
      user:                   member,
      house:                  houseData,
      members:                membersData,
      cleanRecs:              initClean,
      purchases:              initPurchases,
      log:                    initLog,
      rotation:               initRotation,
      supplyResponsibilities: initSupplyResps,
      cleaningEnabled:        cleaningEnabled,
      cleaningRotationOrder:  cleaningRotationOrder.length ? cleaningRotationOrder : membersData.map(m => m.id),
      suppliesRotationOrder:  suppliesRotationOrder.length ? suppliesRotationOrder : membersData.map(m => m.id),
      initialHouseSettings:   initialHouseSettings,
    });
    setScreen("app");
  }, []);

  // ── leaveHouse — wipes session, returns to landing ─────────────────
  const leaveHouse = useCallback(() => {
    clearSession();
    setAppData(null);
    setScreen("landing");
  }, []);

  // ── Screen routing ─────────────────────────────────────────────────
  if (screen === "splash")  return <SplashScreen />;
  if (screen === "landing") return <LandingScreen onSetup={() => setScreen("setup")} onJoin={() => setScreen("join")} />;
  if (screen === "setup")   return <SetupWizard   enterApp={enterApp} onBack={() => setScreen("landing")} />;
  if (screen === "join")    return <JoinScreen    enterApp={enterApp} onBack={() => setScreen("landing")} />;

  if (screen === "app" && appData) {
    return (
      <Dashboard
        initialUser={appData.user}
        initialHouse={appData.house}
        initialMembers={appData.members}
        initialCleanRecs={appData.cleanRecs}
        initialPurchases={appData.purchases}
        initialLog={appData.log}
        initialRotation={appData.rotation}
        initialSupplyResponsibilities={appData.supplyResponsibilities}
        initialCleaningEnabled={appData.cleaningEnabled}
        initialCleaningRotationOrder={appData.cleaningRotationOrder}
        initialSuppliesRotationOrder={appData.suppliesRotationOrder}
        initialHouseSettings={appData.initialHouseSettings}
        onLeaveHouse={leaveHouse}
      />
    );
  }

  return null;
};

export default Index;
