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
  const [appData, setAppData] = useState<{
    user:                   Member;
    house:                  House;
    members:                Member[];
    cleanRecs:              CleanRecord[];
    purchases:              Purchase[];
    log:                    ActivityLog[];
    rotation:               RotationEntry[];
    supplyResponsibilities: SupplyResponsibility[];
  } | null>(null);

  // ── On mount: check for a saved session ───────────────────────────
  useEffect(() => {
    const savedCode     = localStorage.getItem(SK_CODE);
    const savedMemberId = localStorage.getItem(SK_MEMBER_ID);

    if (savedCode && savedMemberId) {
      // Returning user — restore their session silently, skip splash+landing
      restoreSession(savedCode, savedMemberId);
    } else {
      // New user — show splash then landing
      const t = setTimeout(() => setScreen("landing"), 2200);
      return () => clearTimeout(t);
    }
  }, []);

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

      const [members, cleanRecs, purchases, supplyResps] = await Promise.all([
        houseService.getMembers(house.id),
        houseService.getCleanRecords(house.id),
        houseService.getPurchases(house.id),
        houseService.getSupplyResponsibilities(house.id),
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

      setAppData({
        user:                   member,
        house:                  house as House,
        members,
        cleanRecs,
        purchases,
        log:                    [],
        rotation,
        supplyResponsibilities: supplyResps,
      });
      setScreen("app");

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
    member:          Member,
    houseData:       House,
    membersData:     Member[],
    initClean:       CleanRecord[],
    initPurchases:   Purchase[],
    initLog:         ActivityLog[],
    initRotation:    RotationEntry[],
    initSupplyResps: SupplyResponsibility[] = [],
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
  if (screen === "setup")   return <SetupWizard   enterApp={enterApp} />;
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
        onLeaveHouse={leaveHouse}
      />
    );
  }

  return null;
};

export default Index;
