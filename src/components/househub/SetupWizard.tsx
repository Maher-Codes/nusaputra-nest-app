import { useState, useRef, useMemo } from "react";
import {
  Member, House, CleanRecord, Purchase, ActivityLog,
  RotationEntry, buildRotation, fmtDate, now,
} from "@/lib/househub";
import Avatar from "./Avatar";
import { houseService } from "@/services/houseService";

interface SetupWizardProps {
  enterApp: (
    member: Member,
    house: House,
    members: Member[],
    cleanRecs: CleanRecord[],
    purchases: Purchase[],
    log: ActivityLog[],
    rotation: RotationEntry[]
  ) => void;
}

const STEPS = 6;

const SetupWizard = ({ enterApp }: SetupWizardProps) => {
  const [step, setStep]           = useState(0);
  const [houseName, setHN]        = useState("");
  const [count, setCount]         = useState("");
  const [names, setNames]         = useState<string[]>([]);
  const [resp, setResp]           = useState({
    cleanedLast:    "",
    cleanNext:      "",
    waterLast:      "",
    waterNext:      "",
    gasLast:        "",
    gasNext:        "",
    soapSpongeLast: "",
    soapSpongeNext: "",
  });
  const [code, setCode]           = useState("");
  const [isGenerating, setIsGen]  = useState(false);
  const [copied, setCopied]       = useState(false);
  const [chosen, setChosen]       = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // ── These refs hold the REAL Supabase-inserted data so buildAndEnter
  //    can use real UUIDs instead of fake local ones. ──────────────────
  const realHouseRef   = useRef<House | null>(null);
  const realMembersRef = useRef<Member[]>([]);

  // ── Saturday helpers ───────────────────────────────────────────────
  const saturdays = useMemo(() => {
    const today      = new Date();
    const dayOfWeek  = today.getDay();
    const lastSat    = new Date(today);
    lastSat.setDate(today.getDate() - (dayOfWeek === 6 ? 7 : dayOfWeek + 1));
    const nextSatDt  = new Date(today);
    nextSatDt.setDate(today.getDate() + (dayOfWeek === 6 ? 7 : 6 - dayOfWeek));
    return {
      last:      lastSat.toISOString().split("T")[0],
      next:      nextSatDt.toISOString().split("T")[0],
      lastLabel: fmtDate(lastSat,   { month: "long", day: "numeric" }),
      nextLabel: fmtDate(nextSatDt, { month: "long", day: "numeric" }),
    };
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────
  const goNext = () => setStep(s => Math.min(s + 1, STEPS - 1));
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const handleCount = () => {
    const n = parseInt(count);
    if (isNaN(n) || n < 2 || n > 20) return;
    setNames(Array(n).fill(""));
    goNext();
  };

  // ── Main setup: saves everything to Supabase ───────────────────────
  const handleFinish = async () => {
    setIsGen(true);
    setError(null);
    try {
      // 1. Create house — get real UUID back
      const generatedCode = await houseService.generateUniqueHouseCode();
      const newHouse      = await houseService.createHouse(houseName, generatedCode);

      // 2. Insert members — get real UUIDs back
      const insertedMembers = await houseService.insertMembers(newHouse.id, names);

      // Helper: name → real Supabase member_id
      const getId = (name: string) =>
        insertedMembers.find(m => m.name === name.trim())?.id ?? null;

      const today = new Date().toISOString().split("T")[0];

      // 3. Insert last cleaning record
      const lastCleanerId = getId(resp.cleanedLast);
      if (lastCleanerId) {
        await houseService.insertCleanRecord(newHouse.id, lastCleanerId, saturdays.last);
      }

      // 4. Insert last purchase history (one row per supply)
      const purchaseItems: { item_name: string; name: string }[] = [
        { item_name: "Water",         name: resp.waterLast      },
        { item_name: "Gas",           name: resp.gasLast        },
        { item_name: "Soap & Sponge", name: resp.soapSpongeLast },
      ];
      for (const p of purchaseItems) {
        const mid = getId(p.name);
        if (mid) await houseService.insertPurchase(newHouse.id, mid, p.item_name, today);
      }

      // 5. Insert supply responsibilities (next buyer per supply)
      const supplyItems = [
        { item_name: "Water",         name: resp.waterNext      },
        { item_name: "Gas",           name: resp.gasNext        },
        { item_name: "Soap & Sponge", name: resp.soapSpongeNext },
      ].filter(s => getId(s.name) !== null)
       .map(s => ({ item_name: s.item_name, next_member_id: getId(s.name)! }));

      if (supplyItems.length > 0) {
        await houseService.insertSupplyResponsibilities(newHouse.id, supplyItems);
      }

      // 6. Store real data in refs so buildAndEnter can use them
      realHouseRef.current   = newHouse as House;
      realMembersRef.current = insertedMembers;

      // 7. Advance UI to code screen
      setCode(generatedCode);
      setStep(4);

    } catch (err: any) {
      console.error("Setup failed:", err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsGen(false);
    }
  };

  // ── Enter dashboard with real DB data ─────────────────────────────
  const buildAndEnter = (selectedMember: Member) => {
    const house   = realHouseRef.current;
    const members = realMembersRef.current;

    if (!house || !members.length) return;

    // Build initial clean record for dashboard (from wizard answer)
    const lastCleaner  = members.find(m => m.name === resp.cleanedLast.trim());
    const initClean: CleanRecord[] = lastCleaner
      ? [{ id: "init", member_id: lastCleaner.id, house_id: house.id, date: saturdays.last }]
      : [];

    // Build initial purchases for dashboard
    const today = new Date().toISOString().split("T")[0];
    const initPurchases: Purchase[] = [
      { item_name: "Water",         name: resp.waterLast      },
      { item_name: "Gas",           name: resp.gasLast        },
      { item_name: "Soap & Sponge", name: resp.soapSpongeLast },
    ].reduce<Purchase[]>((acc, p, i) => {
      const m = members.find(x => x.name === p.name.trim());
      if (m) acc.push({ id: `init_p${i}`, member_id: m.id, house_id: house.id, item_name: p.item_name, date: today });
      return acc;
    }, []);

    // Build rotation starting from last cleaner
    const lastCleanerIdx = lastCleaner ? members.indexOf(lastCleaner) : 0;
    const rotation       = buildRotation(members, lastCleanerIdx);

    const initLog: ActivityLog[] = [];

    enterApp(selectedMember, house, members, initClean, initPurchases, initLog, rotation);
  };

  const chooseMember = (m: Member) => {
    setChosen(m.id);
    setTimeout(() => buildAndEnter(m), 450);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Validation ─────────────────────────────────────────────────────
  const v0 = houseName.trim().length > 1;
  const v1 = parseInt(count) >= 2 && parseInt(count) <= 20;
  const v2 = names.length > 0 && names.every(n => n.trim().length > 0);
  const v3 = Object.values(resp).every(val => val.trim() !== "");

  // ── Style helpers ──────────────────────────────────────────────────
  const stepTitles = [
    "House name",
    "Number of people",
    "Enter all names",
    "House Responsibilities Setup",
    "Your house code 🎉",
    "Select your name",
  ];
  const inputClass  = "w-full px-5 py-3.5 rounded-xl border-2 border-border bg-background font-sans text-base outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_rgba(42,157,143,0.1)] focus:bg-card placeholder:text-muted-foreground/60";
  const selectClass = "w-full px-5 py-3.5 rounded-xl border-2 border-border bg-background font-sans text-base outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_rgba(42,157,143,0.1)] cursor-pointer";
  const btnPrimary  = "w-full py-4 rounded-xl bg-primary font-bold text-primary-foreground shadow-md hover:translate-y-[-2px] active:scale-[0.98] transition-all disabled:opacity-40";

  const renderDropdown = (label: string, field: keyof typeof resp) => (
    <div key={field} className="mb-4 animate-fade-up">
      <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase block mb-1.5">
        {label}
      </label>
      <select
        className={selectClass}
        value={resp[field]}
        onChange={e => setResp(p => ({ ...p, [field]: e.target.value }))}
      >
        <option value="">— Select a person —</option>
        {names.filter(n => n.trim()).map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header / progress */}
      <div className="bg-primary/5 border-b border-border/40 px-6 py-10 pb-8">
        <div className="max-w-lg mx-auto">
          <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-2">
            Step {step + 1} of {STEPS}
          </p>
          <h2 className="font-display font-extrabold text-2xl text-foreground mb-4">
            {stepTitles[step]}
          </h2>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS) * 100}%` }}
            />
          </div>
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: STEPS }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: i < step
                    ? "hsl(var(--primary) / 0.4)"
                    : i === step
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted))",
                  transform: i === step ? "scale(1.4)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-7 max-w-lg mx-auto w-full">

        {/* STEP 0 — House name */}
        {step === 0 && (
          <div className="flex flex-col gap-4 animate-fade-up">
            <p className="text-muted-foreground text-sm">Give your house a memorable name.</p>
            <input
              type="text"
              className={inputClass}
              placeholder='"Student House A"'
              value={houseName}
              onChange={e => setHN(e.target.value)}
              onKeyDown={e => e.key === "Enter" && v0 && goNext()}
              autoFocus
            />
            <button className={btnPrimary} onClick={goNext} disabled={!v0}>Next →</button>
          </div>
        )}

        {/* STEP 1 — Number of people */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-fade-up">
            <button className="w-fit text-sm font-bold text-muted-foreground hover:text-foreground transition-colors" onClick={goBack}>← Back</button>
            <p className="text-muted-foreground text-sm">How many people live in <b>{houseName}</b>?</p>
            <input
              type="number"
              className={inputClass}
              placeholder="e.g. 4"
              min={2} max={20}
              value={count}
              onChange={e => setCount(e.target.value)}
              onKeyDown={e => e.key === "Enter" && v1 && handleCount()}
              autoFocus
            />
            <div className="flex gap-2 flex-wrap">
              {[2, 3, 4, 5, 6, 7, 8].map(n => (
                <button
                  key={n}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all ${String(n) === count ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-foreground border border-border hover:bg-muted/30"}`}
                  onClick={() => setCount(String(n))}
                >{n}</button>
              ))}
            </div>
            <button className={btnPrimary} onClick={handleCount} disabled={!v1}>Next →</button>
          </div>
        )}

        {/* STEP 2 — Member names */}
        {step === 2 && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <button className="w-fit text-sm font-bold text-muted-foreground hover:text-foreground transition-colors" onClick={goBack}>← Back</button>
            <p className="text-muted-foreground text-sm">Enter the name of each housemate:</p>
            {names.map((n, i) => (
              <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase block mb-1.5">Person {i + 1}</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder={`Name of person ${i + 1}`}
                  value={n}
                  onChange={e => setNames(p => p.map((v, j) => j === i ? e.target.value : v))}
                />
              </div>
            ))}
            <button className={`${btnPrimary} mt-1`} onClick={goNext} disabled={!v2}>Next →</button>
          </div>
        )}

        {/* STEP 3 — Responsibility setup */}
        {step === 3 && (
          <div className="flex flex-col gap-5 animate-fade-up">
            <button className="w-fit text-sm font-bold text-muted-foreground hover:text-foreground transition-colors" onClick={goBack}>← Back</button>

            <div className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm">
              <h3 className="font-display font-bold text-lg text-foreground mb-4">🧹 Cleaning</h3>
              {renderDropdown(`Who cleaned last week? (${saturdays.lastLabel})`, "cleanedLast")}
              {renderDropdown(`Who will clean next? (${saturdays.nextLabel})`, "cleanNext")}
            </div>

            <div className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm">
              <h3 className="font-display font-bold text-lg text-foreground mb-4">💧 Water</h3>
              {renderDropdown("Who bought water last time?", "waterLast")}
              {renderDropdown("Who should buy water next?", "waterNext")}
            </div>

            <div className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm">
              <h3 className="font-display font-bold text-lg text-foreground mb-4">🔥 Gas</h3>
              {renderDropdown("Who bought gas last time?", "gasLast")}
              {renderDropdown("Who should buy gas next?", "gasNext")}
            </div>

            <div className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm">
              <h3 className="font-display font-bold text-lg text-foreground mb-4">🫧 Soap & Sponge</h3>
              {renderDropdown("Who bought soap & sponge last time?", "soapSpongeLast")}
              {renderDropdown("Who should buy soap & sponge next?", "soapSpongeNext")}
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <button
              className={btnPrimary}
              onClick={handleFinish}
              disabled={!v3 || isGenerating}
            >
              {isGenerating ? "Setting up your house..." : "Generate House Code →"}
            </button>
          </div>
        )}

        {/* STEP 4 — Show house code */}
        {step === 4 && (
          <div className="flex flex-col gap-4 text-center animate-fade-up">
            <div className="text-6xl animate-float">🎉</div>
            <h2 className="font-display font-black text-2xl">Your house is ready!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Share this code with your housemates so they can join <b>{houseName}</b>:
            </p>
            <div className="rounded-3xl p-7 bg-primary shadow-lg">
              <p className="text-primary-foreground/60 text-xs font-bold tracking-widest uppercase mb-3">House Code</p>
              <p className="font-display font-black text-5xl text-primary-foreground tracking-[0.22em] mb-2">{code}</p>
              <p className="text-primary-foreground/40 text-xs">{houseName}</p>
            </div>
            <button
              className="w-full py-3.5 rounded-xl bg-card text-foreground font-bold border border-border shadow-sm hover:bg-muted/30 transition-all"
              onClick={copyCode}
            >
              {copied ? "✅ Copied!" : "📋 Copy code"}
            </button>
            <button className={btnPrimary} onClick={() => setStep(5)}>
              Continue →
            </button>
          </div>
        )}

        {/* STEP 5 — Select your name */}
        {step === 5 && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <p className="text-muted-foreground text-sm mb-1">Select your name to enter the dashboard:</p>
            {realMembersRef.current.map((m, i) => (
              <button
                key={m.id}
                className={`w-full p-5 rounded-3xl border-2 bg-card text-left font-semibold flex items-center gap-4 transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:translate-x-1 animate-fade-up shadow-sm ${chosen === m.id ? "border-primary bg-primary/5" : "border-border"}`}
                style={{ animationDelay: `${i * 0.07}s` }}
                onClick={() => chooseMember(m)}
              >
                <Avatar name={m.name} size={50} radius={16} fontSize={20} />
                <div className="flex-1">
                  <div className="text-lg text-foreground">{m.name}</div>
                  <div className="font-normal text-xs text-muted-foreground mt-0.5">
                    Joined {fmtDate(m.created_at, { month: "short", day: "numeric" })}
                  </div>
                </div>
                {chosen === m.id && <span className="text-primary text-xl">✓</span>}
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default SetupWizard;
