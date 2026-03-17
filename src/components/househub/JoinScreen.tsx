import { useState, useRef } from "react";
import {
  Member, House, CleanRecord, Purchase, SupplyResponsibility,
  ActivityLog, RotationEntry, buildRotation, fmtDate,
} from "@/lib/househub";
import Avatar from "./Avatar";
import { houseService } from "@/services/houseService";

interface JoinScreenProps {
  enterApp: (
    member: Member,
    house: House,
    members: Member[],
    cleanRecs: CleanRecord[],
    purchases: Purchase[],
    log: ActivityLog[],
    rotation: RotationEntry[],
    supplyResponsibilities: SupplyResponsibility[],
    cleaningEnabled: boolean,
    cleaningRotationOrder: string[],
    suppliesRotationOrder: string[],
  ) => void;
  onBack: () => void;
}

const JoinScreen = ({ enterApp, onBack }: JoinScreenProps) => {
  const [step, setStep]     = useState<"code" | "name">("code");
  const [digits, setDig]    = useState(["", "", "", "", "", ""]);
  const [error, setError]   = useState("");
  const [loading, setLoad]  = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Real DB data stored after successful code verification
  const [currentHouse,    setCurrentHouse]    = useState<House | null>(null);
  const [dbMembers,       setDbMembers]       = useState<Member[]>([]);
  const [dbCleanRecs,     setDbCleanRecs]     = useState<CleanRecord[]>([]);
  const [dbPurchases,     setDbPurchases]     = useState<Purchase[]>([]);
  const [dbSupplyResps,   setDbSupplyResps]   = useState<SupplyResponsibility[]>([]);
  const [dbHouseSettings, setDbHouseSettings] = useState<any>(null);

  // ── Digit input handlers ───────────────────────────────────────────
  const handleDigit = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const n = [...digits];
    n[idx] = val;
    setDig(n);
    setError("");
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  // ── Verify the house code and load all data ────────────────────────
  const verify = async () => {
    const code = digits.join("");
    setError("");
    setLoad(true);

    try {
      // 1. Find the house
      const house = await houseService.getHouseByCode(code);

      if (!house) {
        setError("House not found. Please check the code and try again.");
        setDig(["", "", "", "", "", ""]);
        setTimeout(() => refs.current[0]?.focus(), 50);
        return;
      }

      // 2. Load all house data in parallel using correct table names
      const [members, cleanRecs, purchases, supplyResps, houseSettings] = await Promise.all([
        houseService.getMembers(house.id),
        houseService.getCleanRecords(house.id),
        houseService.getPurchases(house.id),
        houseService.getSupplyResponsibilities(house.id),
        houseService.getHouseSettings(house.id),
      ]);

      // 3. Handle legacy houses missing house_settings
      if (!houseSettings) {
        await houseService.saveHouseSettings(house.id, {
          supplies: [
            { id: "Water", label: "Water", icon: "💧", bg: "rgba(58,134,255,0.1)", col: "#3A86FF" },
            { id: "Gas", label: "Gas", icon: "🔥", bg: "rgba(244,162,97,0.1)", col: "#F4A261" },
            { id: "Soap & Sponge", label: "Soap & Sponge", icon: "🫧", bg: "rgba(212, 163, 115, 0.1)", col: "#D4A373" }
          ],
          cleaning_enabled: true,
          cleaning_frequency: "weekly",
          cleaning_day: 6,
          rotation_type: "round_robin",
        });
      }

      // 4. Store everything in state
      setCurrentHouse(house as House);
      setDbMembers(members);
      setDbCleanRecs(cleanRecs);
      setDbPurchases(purchases);
      setDbSupplyResps(supplyResps);
      setDbHouseSettings(houseSettings);

      setStep("name");

    } catch (err) {
      console.error("[JoinScreen] Error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoad(false);
    }
  };

  // ── Choose a member and enter the dashboard ────────────────────────
  const choose = (m: Member) => {
    setChosen(m.id);
    if (!currentHouse) return;

    // Build rotation from the most recent clean record
    // Most recent cleaner is dbCleanRecs[0] (sorted newest first by houseService)
    const lastCleanerId  = dbCleanRecs[0]?.member_id ?? null;
    const lastCleanerIdx = lastCleanerId
      ? dbMembers.findIndex(x => x.id === lastCleanerId)
      : 0;

    const rotation = buildRotation(
      dbMembers,
      Math.max(0, lastCleanerIdx)
    );

    // Extract rotation orders from house settings, fall back to DB insertion order
    const cleaningRotationOrder: string[] = dbHouseSettings?.cleaning_rotation_order?.length
      ? dbHouseSettings.cleaning_rotation_order
      : dbMembers.map((x: Member) => x.id);

    const suppliesRotationOrder: string[] = dbHouseSettings?.supplies_rotation_order?.length
      ? dbHouseSettings.supplies_rotation_order
      : dbMembers.map((x: Member) => x.id);

    setTimeout(
      () => enterApp(m, currentHouse, dbMembers, dbCleanRecs, dbPurchases, [], rotation, dbSupplyResps, dbHouseSettings?.cleaning_enabled ?? true, cleaningRotationOrder, suppliesRotationOrder),
      450
    );
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div className="bg-background border-b border-border/40 px-6 pt-12 pb-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <img 
              src="/src/assets/nusa-putra-logo.png" 
              alt="Nusa Putra University" 
              className="nusa-logo h-10 w-auto"
            />
            <button
              className="px-4 py-2 rounded-xl border-2 border-secondary/40 text-secondary text-xs font-bold cursor-pointer hover:bg-secondary/5 transition-all active:scale-95"
              onClick={onBack}
            >
              ← Back
            </button>
          </div>
          <h2 className="font-display font-extrabold text-3xl text-primary mb-1.5">
            {step === "code" ? "Join Your NusaNest" : "✅ Code verified!"}
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            {step === "code"
              ? "Enter the 6-digit code shared by your housemate."
              : "Select your name to load your dashboard."}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-7 max-w-md mx-auto w-full">

        {/* STEP: Enter code */}
        {step === "code" && (
          <div className="flex flex-col gap-5 animate-fade-up">
            <div className="flex gap-2.5 justify-center">
              {digits.map((d, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  className={`w-12 h-16 rounded-xl border-2 bg-background font-display text-2xl font-bold text-primary text-center outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_hsla(330,100%,23%,0.1)] focus:scale-105 ${
                    d ? "border-primary/35 bg-card" : "border-border"
                  }`}
                  ref={el => { refs.current[i] = el; }}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKey(i, e)}
                  onFocus={e => e.target.select()}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && (
              <div className="animate-pop bg-destructive/10 border-2 border-destructive/25 rounded-xl px-4 py-3 text-destructive font-bold text-sm text-center">
                {error}
              </div>
            )}

            <button
              className="w-full py-4 rounded-xl bg-primary font-bold text-primary-foreground shadow-md hover:translate-y-[-2px] active:scale-[0.98] transition-all disabled:opacity-40"
              onClick={verify}
              disabled={!digits.every(d => d) || loading}
            >
              {loading ? "Verifying..." : "Join House →"}
            </button>

            <p className="text-muted-foreground/60 text-[11px] text-center font-bold uppercase tracking-widest">
              NusaNest for Universitas Nusa Putra
            </p>
          </div>
        )}

        {/* STEP: Select name */}
        {step === "name" && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <p className="text-muted-foreground text-sm mb-1">
              Select your name from the list:
            </p>

            {dbMembers.length > 0 ? (
              dbMembers.map((m, i) => (
                <button
                  key={m.id}
                  className={`w-full p-5 rounded-3xl border-2 bg-card text-left font-semibold flex items-center gap-4 transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:translate-x-1 animate-fade-up shadow-sm ${
                    chosen === m.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                  onClick={() => choose(m)}
                >
                  <Avatar name={m.name || "Unknown"} size={50} radius={16} fontSize={20} />
                  <div className="flex-1">
                    <div className="text-lg text-foreground">{m.name || "Unknown"}</div>
                    <div className="font-normal text-xs text-muted-foreground mt-0.5">
                      {/* DB column is created_at, not joined_at */}
                      Joined {fmtDate(m.created_at || new Date().toISOString(), { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  {chosen === m.id && <span className="text-primary text-xl">✓</span>}
                </button>
              ))
            ) : (
              <p className="text-muted-foreground text-sm text-center mt-4">
                No members found for this house.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default JoinScreen;
