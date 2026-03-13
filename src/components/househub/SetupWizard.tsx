import { useState, useRef, useMemo } from "react";
import {
  Member, House, CleanRecord, Purchase, ActivityLog,
  RotationEntry, Supply, buildRotation, fmtDate, now, DAY_LABELS,
} from "@/lib/househub";
import Avatar from "./Avatar";
import { houseService } from "@/services/houseService";
import { Plus, X, Check, ChevronRight } from "lucide-react";

interface SetupWizardProps {
  enterApp: (
    member:      Member,
    house:       House,
    members:     Member[],
    cleanRecs:   CleanRecord[],
    purchases:   Purchase[],
    log:         ActivityLog[],
    rotation:    RotationEntry[],
    supplyResps: { id: string; house_id: string; item_name: string; next_member_id: string }[],
  ) => void;
}

const SUGGESTED_SUPPLIES: Supply[] = [
  { id: "Water",         label: "Water",         icon: "💧", bg: "rgba(58,134,255,0.1)",  col: "#3A86FF" },
  { id: "Gas",           label: "Gas",           icon: "🔥", bg: "rgba(244,162,97,0.1)",  col: "#F4A261" },
  { id: "Soap & Sponge", label: "Soap & Sponge", icon: "🫧", bg: "rgba(42,157,143,0.1)",  col: "#2A9D8F" },
  { id: "Electricity",   label: "Electricity",   icon: "⚡", bg: "rgba(234,179,8,0.1)",   col: "#CA8A04" },
  { id: "Internet",      label: "Internet",      icon: "🌐", bg: "rgba(99,102,241,0.1)",  col: "#6366F1" },
  { id: "Groceries",     label: "Groceries",     icon: "🛍️", bg: "rgba(34,197,94,0.1)",   col: "#16A34A" },
  { id: "Toilet Paper",  label: "Toilet Paper",  icon: "🧻", bg: "rgba(249,115,22,0.1)",  col: "#EA580C" },
  { id: "Coffee",        label: "Coffee",        icon: "☕", bg: "rgba(120,53,15,0.1)",   col: "#92400E" },
];

const CLEANING_DAYS = [
  { value: 5, label: "Friday"    },
  { value: 6, label: "Saturday"  },
  { value: 0, label: "Sunday"    },
  { value: 1, label: "Monday"    },
  { value: 2, label: "Tuesday"   },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday"  },
];

const TOTAL_STEPS = 9;
const inputClass  = "w-full px-4 py-3.5 rounded-xl border border-border bg-card text-foreground text-base font-medium focus:outline-none focus:border-primary transition-colors";
const btnPrimary  = "w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none";

const SetupWizard = ({ enterApp }: SetupWizardProps) => {
  const [step,        setStep]  = useState(0);
  const [houseName,   setHN]    = useState("");
  const [count,       setCount] = useState("");
  const [names,       setNames] = useState<string[]>([]);

  const [selectedSupplies, setSelectedSupplies] = useState<Supply[]>(SUGGESTED_SUPPLIES.slice(0, 3));
  const [customLabel,      setCustomLabel]       = useState("");
  const [customEmoji,      setCustomEmoji]       = useState("");
  const [showCustomForm,   setShowCustomForm]    = useState(false);

  const [cleaningEnabled,   setCleaningEnabled]   = useState(true);
  const [cleaningFrequency, setCleaningFrequency] = useState<"weekly"|"biweekly"|"monthly">("weekly");
  const [cleaningDay,       setCleaningDay]        = useState(6);
  const [rotationType,      setRotationType]       = useState<"round_robin"|"free_for_all">("round_robin");

  const [resp, setResp] = useState<Record<string, { last: string; next: string }>>({});

  const [code,         setCode]   = useState("");
  const [isGenerating, setIsGen]  = useState(false);
  const [copied,       setCopied] = useState(false);
  const [chosen,       setChosen] = useState<string | null>(null);
  const [error,        setError]  = useState<string | null>(null);

  const realHouseRef   = useRef<House | null>(null);
  const realMembersRef = useRef<Member[]>([]);

  const nextCleaningDate = useMemo(() => {
    const today = new Date();
    const d     = new Date(today);
    const diff  = (cleaningDay - today.getDay() + 7) % 7 || 7;
    d.setDate(today.getDate() + diff);
    return { date: d, label: fmtDate(d, { weekday: "long", month: "short", day: "numeric" }) };
  }, [cleaningDay]);

  const lastCleaningDate = useMemo(() => {
    const today = new Date();
    const d     = new Date(today);
    const diff  = (today.getDay() - cleaningDay + 7) % 7 || 7;
    d.setDate(today.getDate() - diff);
    return { date: d, label: fmtDate(d, { weekday: "long", month: "short", day: "numeric" }) };
  }, [cleaningDay]);

  const goNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const handleCount = () => {
    const n = parseInt(count);
    if (isNaN(n) || n < 2 || n > 20) return;
    setNames(Array(n).fill(""));
    goNext();
  };

  const toggleSupply = (s: Supply) =>
    setSelectedSupplies(prev =>
      prev.find(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]
    );

  const addCustomSupply = () => {
    if (!customLabel.trim()) return;
    const emoji = customEmoji.trim() || "📦";
    const id    = customLabel.trim();
    if (selectedSupplies.find(s => s.id === id)) return;
    setSelectedSupplies(prev => [...prev, { id, label: id, icon: emoji, bg: "rgba(100,100,100,0.08)", col: "#6B7280" }]);
    setCustomLabel(""); setCustomEmoji(""); setShowCustomForm(false);
  };

  const removeSupply = (id: string) =>
    setSelectedSupplies(prev => prev.filter(s => s.id !== id));

  const setRespField = (itemId: string, field: "last"|"next", val: string) =>
    setResp(prev => ({ ...prev, [itemId]: { last: prev[itemId]?.last ?? "", next: prev[itemId]?.next ?? "", [field]: val } }));

  const renderDropdown = (label: string, itemId: string, field: "last"|"next") => (
    <div className="mb-3">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">{label}</label>
      <select
        className={`${inputClass} cursor-pointer`}
        value={resp[itemId]?.[field] ?? ""}
        onChange={e => setRespField(itemId, field, e.target.value)}
      >
        <option value="" disabled>Select a person…</option>
        {names.filter(n => n.trim()).map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );

  const v0 = houseName.trim().length > 1;
  const v1 = parseInt(count) >= 2 && parseInt(count) <= 20;
  const v2 = names.length > 0 && names.every(n => n.trim().length > 0);
  const v3 = selectedSupplies.length > 0;
  const v6 = selectedSupplies.every(s => resp[s.id]?.last?.trim() && resp[s.id]?.next?.trim())
    && (!cleaningEnabled || (resp["__cleaning"]?.last?.trim() && resp["__cleaning"]?.next?.trim()));

  const handleFinish = async () => {
    setIsGen(true); setError(null);
    try {
      const generatedCode   = await houseService.generateUniqueHouseCode();
      const newHouse        = await houseService.createHouse(houseName, generatedCode);
      const insertedMembers = await houseService.insertMembers(newHouse.id, names);
      const getId           = (name: string) => insertedMembers.find(m => m.name === name.trim())?.id ?? null;
      const today           = new Date().toISOString().split("T")[0];

      if (cleaningEnabled) {
        const lastCleanerId = getId(resp["__cleaning"]?.last ?? "");
        if (lastCleanerId) await houseService.insertCleanRecord(newHouse.id, lastCleanerId, lastCleaningDate.date.toISOString().split("T")[0]);
      }

      for (const s of selectedSupplies) {
        const mid = getId(resp[s.id]?.last ?? "");
        if (mid) await houseService.insertPurchase(newHouse.id, mid, s.label, today);
      }

      const supplyItems = selectedSupplies
        .map(s => ({ item_name: s.label, next_member_id: getId(resp[s.id]?.next ?? "") }))
        .filter(x => x.next_member_id !== null) as { item_name: string; next_member_id: string }[];
      if (supplyItems.length > 0) await houseService.insertSupplyResponsibilities(newHouse.id, supplyItems);

      await houseService.saveHouseSettings(newHouse.id, {
        supplies:           selectedSupplies,
        cleaning_enabled:   cleaningEnabled,
        cleaning_frequency: cleaningFrequency,
        cleaning_day:       cleaningDay,
        rotation_type:      rotationType,
      });

      realHouseRef.current   = newHouse as House;
      realMembersRef.current = insertedMembers;
      setCode(generatedCode);
      setStep(7);
    } catch (err: any) {
      console.error("Setup failed:", err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally { setIsGen(false); }
  };

  const buildAndEnter = (selectedMember: Member) => {
    const house   = realHouseRef.current;
    const members = realMembersRef.current;
    if (!house || !members.length) return;

    const lastCleaner = cleaningEnabled ? members.find(m => m.name === resp["__cleaning"]?.last?.trim()) : null;
    const initClean: CleanRecord[] = lastCleaner
      ? [{ id: "init", member_id: lastCleaner.id, house_id: house.id, date: lastCleaningDate.date.toISOString().split("T")[0] }]
      : [];

    const today = new Date().toISOString().split("T")[0];
    const initPurchases: Purchase[] = selectedSupplies.reduce<Purchase[]>((acc, s, i) => {
      const m = members.find(x => x.name === resp[s.id]?.last?.trim());
      if (m) acc.push({ id: `init_p${i}`, member_id: m.id, house_id: house.id, item_name: s.label, date: today });
      return acc;
    }, []);

    const lastCleanerIdx = lastCleaner ? members.indexOf(lastCleaner) : 0;
    const rotation       = buildRotation(members, lastCleanerIdx);

    const initSupplyResps = selectedSupplies.reduce<{ id: string; house_id: string; item_name: string; next_member_id: string }[]>((acc, s, i) => {
      const m = members.find(x => x.name === resp[s.id]?.next?.trim());
      if (m) acc.push({ id: `sr_${i}`, house_id: house.id, item_name: s.label, next_member_id: m.id });
      return acc;
    }, []);

    enterApp(selectedMember, house, members, initClean, initPurchases, [], rotation, initSupplyResps);
  };

  const chooseMember = (m: Member) => { setChosen(m.id); setTimeout(() => buildAndEnter(m), 450); };
  const copyCode = () => { navigator.clipboard?.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Progress header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-6 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display font-black text-xl text-foreground">HouseHub</h1>
            <span className="text-xs font-bold text-muted-foreground">Step {step + 1} of {TOTAL_STEPS}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all duration-400"
                style={{ background: i < step ? "hsl(var(--primary)/0.4)" : i === step ? "hsl(var(--primary))" : "hsl(var(--muted))" }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-7 max-w-lg mx-auto w-full">

        {/* ── STEP 0 — House name ── */}
        {step === 0 && (
          <div className="flex flex-col gap-4 animate-fade-up">
            <div className="mb-2">
              <p className="text-4xl mb-3">🏠</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">Name your house</h2>
              <p className="text-muted-foreground text-sm">Give your house a memorable name that your housemates will recognise.</p>
            </div>
            <input type="text" className={inputClass} placeholder='"The Green House", "Apartment 4B"…'
              value={houseName} onChange={e => setHN(e.target.value)}
              onKeyDown={e => e.key === "Enter" && v0 && goNext()} autoFocus />
            <button className={btnPrimary} onClick={goNext} disabled={!v0}>Continue <ChevronRight size={16} className="inline ml-1" /></button>
          </div>
        )}

        {/* ── STEP 1 — Number of people ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-fade-up">
            <button className="w-fit text-sm font-bold text-muted-foreground hover:text-foreground" onClick={goBack}>← Back</button>
            <div className="mb-2">
              <p className="text-4xl mb-3">👥</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">How many housemates?</h2>
              <p className="text-muted-foreground text-sm">Including yourself — how many people live in <b>{houseName}</b>?</p>
            </div>
            <input type="number" className={inputClass} placeholder="e.g. 4" min={2} max={20}
              value={count} onChange={e => setCount(e.target.value)}
              onKeyDown={e => e.key === "Enter" && v1 && handleCount()} autoFocus />
            <div className="flex gap-2 flex-wrap">
              {[2,3,4,5,6,7,8].map(n => (
                <button key={n}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all duration-200 ${String(n) === count ? "bg-primary text-primary-foreground shadow-sm scale-105" : "bg-card text-foreground border border-border hover:bg-muted/30 active:scale-95"}`}
                  onClick={() => setCount(String(n))}>{n}</button>
              ))}
            </div>
            <button className={btnPrimary} onClick={handleCount} disabled={!v1}>Continue <ChevronRight size={16} className="inline ml-1" /></button>
          </div>
        )}

        {/* ── STEP 2 — Member names ── */}
        {step === 2 && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <button className="w-fit text-sm font-bold text-muted-foreground hover:text-foreground" onClick={goBack}>← Back</button>
            <div className="mb-1">
              <p className="text-4xl mb-3">✍️</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">Who lives there?</h2>
              <p className="text-muted-foreground text-sm">Enter each housemate's name.</p>
            </div>
            {names.map((n, i) => (
              <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase block mb-1.5">Person {i + 1}</label>
                <input type="text" className={inputClass} placeholder={`Name of person ${i + 1}`}
                  value={n} onChange={e => setNames(p => p.map((v, j) => j === i ? e.target.value : v))} />
              </div>
            ))}
            <button className={`${btnPrimary} mt-2`} onClick={goNext} disabled={!v2}>Continue <ChevronRight size={16} className="inline ml-1" /></button>
          </div>
        )}

        {/* ── STEP 3 — What do you share? ── */}
        {step === 3 && (
          <div className="flex flex-col gap-5 animate-fade-up">
            <button className="w-fit text-sm font-bold text-muted-foreground hover:text-foreground" onClick={goBack}>← Back</button>
            <div>
              <p className="text-4xl mb-3">🛒</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">What do you share?</h2>
              <p className="text-muted-foreground text-sm">Select everything your house buys together. Add your own items too — every house is different.</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {SUGGESTED_SUPPLIES.map(s => {
                const isOn = !!selectedSupplies.find(x => x.id === s.id);
                return (
                  <button key={s.id} onClick={() => toggleSupply(s)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all duration-200 active:scale-95 ${isOn ? "border-primary bg-primary/8 shadow-sm" : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"}`}>
                    <span className="text-2xl">{s.icon}</span>
                    <span className="font-semibold text-sm text-foreground flex-1">{s.label}</span>
                    {isOn && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Custom items added */}
            {selectedSupplies.filter(s => !SUGGESTED_SUPPLIES.find(x => x.id === s.id)).map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="text-xl">{s.icon}</span>
                <span className="font-semibold text-sm flex-1">{s.label}</span>
                <button onClick={() => removeSupply(s.id)} className="text-muted-foreground hover:text-destructive transition-colors"><X size={16} /></button>
              </div>
            ))}

            {showCustomForm ? (
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-muted/40 border border-border">
                <p className="text-sm font-bold text-foreground">Add your own item</p>
                <div className="flex gap-2">
                  <input className="w-16 px-3 py-2.5 rounded-xl border border-border bg-card text-center text-xl focus:outline-none focus:border-primary"
                    placeholder="📦" value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} maxLength={2} />
                  <input className={`${inputClass} flex-1`} placeholder="e.g. Trash bags, Bread…"
                    value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomSupply()} autoFocus />
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-all"
                    onClick={addCustomSupply} disabled={!customLabel.trim()}>Add item</button>
                  <button className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm active:scale-95 transition-all"
                    onClick={() => { setShowCustomForm(false); setCustomLabel(""); setCustomEmoji(""); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 font-semibold text-sm transition-all"
                onClick={() => setShowCustomForm(true)}>
                <Plus size={16} /> Add your own item
              </button>
            )}

            <button className={btnPrimary} onClick={goNext} disabled={!v3}>
              Continue with {selectedSupplies.length} item{selectedSupplies.length !== 1 ? "s" : ""} <ChevronRight size={16} className="inline ml-1" />
            </button>
          </div>
        )}

        {/* ── STEP 4 — Cleaning schedule ── */}
        {step === 4 && (
          <div className="flex flex-col gap-5 animate-fade-up">
            <button className="w-fit text-sm font-bold text-muted-foreground hover:text-foreground" onClick={goBack}>← Back</button>
            <div>
              <p className="text-4xl mb-3">🧹</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">Cleaning schedule?</h2>
              <p className="text-muted-foreground text-sm">Does your house rotate cleaning duties?</p>
            </div>

            <div className="flex gap-3">
              {[{ v: true, label: "✅ Yes, we rotate" }, { v: false, label: "❌ No schedule" }].map(opt => (
                <button key={String(opt.v)} onClick={() => setCleaningEnabled(opt.v)}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-sm border-2 transition-all duration-200 active:scale-95 ${cleaningEnabled === opt.v ? "border-primary bg-primary/8 text-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {cleaningEnabled && (
              <>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">How often?</label>
                  <div className="flex gap-2">
                    {[{ v: "weekly", label: "Weekly" }, { v: "biweekly", label: "Every 2 weeks" }, { v: "monthly", label: "Monthly" }].map(opt => (
                      <button key={opt.v} onClick={() => setCleaningFrequency(opt.v as any)}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs border-2 transition-all active:scale-95 ${cleaningFrequency === opt.v ? "border-primary bg-primary/8 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Which day?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CLEANING_DAYS.map(d => (
                      <button key={d.value} onClick={() => setCleaningDay(d.value)}
                        className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all active:scale-95 ${cleaningDay === d.value ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                        {d.label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button className={btnPrimary} onClick={goNext}>Continue <ChevronRight size={16} className="inline ml-1" /></button>
          </div>
        )}

        {/* ── STEP 5 — Rotation type ── */}
        {step === 5 && (
          <div className="flex flex-col gap-5 animate-fade-up">
            <button className="w-fit text-sm font-bold text-muted-foreground hover:text-foreground" onClick={goBack}>← Back</button>
            <div>
              <p className="text-4xl mb-3">🔄</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">How should turns work?</h2>
              <p className="text-muted-foreground text-sm">Choose how your house tracks who's responsible for buying supplies.</p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { v: "round_robin",  emoji: "🔄", title: "Round robin", desc: "Everyone takes turns in a fixed order. Fair and predictable." },
                { v: "free_for_all", emoji: "🤝", title: "Whoever needs it", desc: "No fixed order — anyone logs when they buy. Great for casual houses." },
              ].map(opt => (
                <button key={opt.v} onClick={() => setRotationType(opt.v as any)}
                  className={`p-5 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${rotationType === opt.v ? "border-primary bg-primary/8 shadow-sm" : "border-border bg-card hover:border-primary/40"}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{opt.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-foreground mb-1">{opt.title}</p>
                      <p className="text-sm text-muted-foreground">{opt.desc}</p>
                    </div>
                    {rotationType === opt.v && <Check size={18} className="text-primary shrink-0 mt-0.5" />}
                  </div>
                </button>
              ))}
            </div>
            <button className={btnPrimary} onClick={goNext}>Continue <ChevronRight size={16} className="inline ml-1" /></button>
          </div>
        )}

        {/* ── STEP 6 — Who bought what last? ── */}
        {step === 6 && (
          <div className="flex flex-col gap-5 animate-fade-up">
            <button className="w-fit text-sm font-bold text-muted-foreground hover:text-foreground" onClick={goBack}>← Back</button>
            <div>
              <p className="text-4xl mb-3">📋</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">Starting point</h2>
              <p className="text-muted-foreground text-sm">Tell us who last bought each item and who's next. This is how we start the rotation.</p>
            </div>

            {cleaningEnabled && (
              <div className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm">
                <h3 className="font-display font-bold text-lg text-foreground mb-4">🧹 Cleaning</h3>
                {renderDropdown(`Who cleaned last? (${lastCleaningDate.label})`, "__cleaning", "last")}
                {renderDropdown(`Who cleans next? (${nextCleaningDate.label})`, "__cleaning", "next")}
              </div>
            )}

            {selectedSupplies.map(s => (
              <div key={s.id} className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm">
                <h3 className="font-display font-bold text-lg text-foreground mb-4">{s.icon} {s.label}</h3>
                {renderDropdown(`Who bought ${s.label} last?`, s.id, "last")}
                {renderDropdown(`Who should buy ${s.label} next?`, s.id, "next")}
              </div>
            ))}

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-sm font-medium">⚠️ {error}</div>
            )}

            <button className={btnPrimary} onClick={handleFinish} disabled={!v6 || isGenerating}>
              {isGenerating ? "Setting up your house…" : "🎉 Generate House Code"}
            </button>
          </div>
        )}

        {/* ── STEP 7 — House code ── */}
        {step === 7 && (
          <div className="flex flex-col gap-4 text-center animate-fade-up">
            <div className="text-6xl" style={{ animation: "float 3s ease-in-out infinite" }}>🎉</div>
            <h2 className="font-display font-black text-2xl">Your house is ready!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">Share this code with your housemates:</p>
            <div className="rounded-3xl p-7 bg-primary shadow-lg">
              <p className="text-primary-foreground/60 text-xs font-bold tracking-widest uppercase mb-3">House Code</p>
              <p className="font-display font-black text-5xl text-primary-foreground tracking-[0.22em] mb-2">{code}</p>
              <p className="text-primary-foreground/40 text-xs">{houseName}</p>
            </div>
            <button className="w-full py-3.5 rounded-xl bg-card text-foreground font-bold border border-border shadow-sm hover:bg-muted/30 transition-all" onClick={copyCode}>
              {copied ? "✅ Copied!" : "📋 Copy code"}
            </button>
            <div className="rounded-2xl bg-muted/40 border border-border p-4 text-left">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Your setup summary</p>
              <div className="flex flex-col gap-1.5 text-sm">
                <p>🛒 <b>{selectedSupplies.length} shared items:</b> {selectedSupplies.map(s => `${s.icon} ${s.label}`).join(", ")}</p>
                <p>🧹 <b>Cleaning:</b> {cleaningEnabled ? `${cleaningFrequency === "weekly" ? "Every week" : cleaningFrequency === "biweekly" ? "Every 2 weeks" : "Monthly"} on ${DAY_LABELS[cleaningDay]}s` : "Not scheduled"}</p>
                <p>🔄 <b>Rotation:</b> {rotationType === "round_robin" ? "Round robin" : "Free for all"}</p>
              </div>
            </div>
            <button className={btnPrimary} onClick={() => setStep(8)}>Who are you? →</button>
          </div>
        )}

        {/* ── STEP 8 — Select your name ── */}
        {step === 8 && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <div className="mb-1">
              <p className="text-4xl mb-3">👋</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">Who are you?</h2>
              <p className="text-muted-foreground text-sm">Select your name to enter the dashboard:</p>
            </div>
            {realMembersRef.current.map((m, i) => (
              <button key={m.id}
                className={`w-full p-5 rounded-3xl border-2 bg-card text-left font-semibold flex items-center gap-4 transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:translate-x-1 animate-fade-up shadow-sm ${chosen === m.id ? "border-primary bg-primary/5" : "border-border"}`}
                style={{ animationDelay: `${i * 0.07}s` }}
                onClick={() => chooseMember(m)}>
                <Avatar name={m.name} size={50} radius={16} fontSize={20} />
                <div className="flex-1">
                  <div className="text-lg text-foreground">{m.name}</div>
                  <div className="font-normal text-xs text-muted-foreground mt-0.5">Joined {fmtDate(m.created_at, { month: "short", day: "numeric" })}</div>
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
