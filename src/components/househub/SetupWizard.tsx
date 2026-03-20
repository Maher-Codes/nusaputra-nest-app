import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Member, House, CleanRecord, Purchase, SupplyResponsibility,
  ActivityLog, RotationEntry, buildRotation, fmtDate, DAY_LABELS,
  Supply
} from "@/lib/househub";
import Avatar from "./Avatar";
import { houseService } from "@/services/houseService";
import { Plus, X, Check, ChevronRight } from "lucide-react";

interface SetupWizardProps {
  enterApp: (
    member:               Member,
    house:                House,
    members:              Member[],
    cleanRecs:            CleanRecord[],
    purchases:            Purchase[],
    log:                  ActivityLog[],
    rotation:             RotationEntry[],
    supplyResps:          SupplyResponsibility[],
    cleaningEnabled:      boolean,
    cleaningRotationOrder: string[],
    suppliesRotationOrder: string[],
  ) => void;
}

const SUGGESTED_SUPPLIES: Supply[] = [
  { id: "Water",         label: "Water",         icon: "💧", bg: "rgba(58,134,255,0.1)",  col: "#3A86FF" },
  { id: "Gas",           label: "Gas",           icon: "🔥", bg: "rgba(244,162,97,0.1)",  col: "#F4A261" },
  { id: "Soap & Sponge", label: "Soap & Sponge", icon: "🫧", bg: "rgba(212, 163, 115, 0.1)",  col: "#D4A373" },
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

const EMOJI_PICKER = [
  { category: "Food & Kitchen",      emojis: ["🍞","🥛","🥚","🧃","🍳","🫖","☕","🍵","🧂","🫙"] },
  { category: "Cleaning & Home",     emojis: ["🧹","🧺","🧻","🧼","🪣","🧽","🪴","🕯️","🪟","🚿"] },
  { category: "Shopping & Supplies", emojis: ["🛍️","📦","🧴","🪥","💊","🩹","🔋","🕹️","🖨️","📱"] },
  { category: "Drinks & Food",       emojis: ["💧","🧊","🍶","🧋","🥤","🍷","🍺","🫗","🍕","🥗"] },
  { category: "Tools & Other",       emojis: ["🔧","🪛","🔑","🧲","💡","🔦","🪜","🗑️","📮","🎁"] },
];

// Step layout (0-indexed):
// 0  — House name
// 1  — Number of people
// 2  — Member names
// 3  — Cleaning rotation order  (skipped if !cleaningEnabled)
// 4  — Supplies rotation order
// 5  — What do you share?
// 6  — Cleaning schedule
// 7  — Starting point (who bought/cleaned last)
// 8  — House code reveal
// 9  — Who are you?
// 10 — Profile personalization (Optional)
const TOTAL_STEPS = 10;

const inputClass  = "w-full px-4 py-3.5 rounded-xl border border-border bg-card text-foreground text-base font-medium focus:outline-none focus:border-primary transition-colors";
const btnPrimary  = "w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-md hover:bg-primary/95 hover:translate-y-[-1px] active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none";
const btnOutline  = "w-fit px-4 py-2 rounded-xl border-2 border-secondary/40 text-secondary text-xs font-bold cursor-pointer hover:bg-secondary/5 transition-all active:scale-95";

const ordinal = (n: number) => {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

const swapItems = (arr: string[], i: number, j: number): string[] => {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

const isValidName = (value: string) => /^[a-zA-Z\s\-']+$/.test(value);

const MEMBER_PLACEHOLDERS = [
  "e.g. Mohammed",
  "e.g. Mostafa",
  "e.g. Ahmed",
  "e.g. Omar",
  "e.g. Khalid",
  "e.g. Ibrahim",
  "e.g. Yusuf",
  "e.g. Abdullah",
  "e.g. Hassan",
  "e.g. Ali",
];

const SetupWizard = ({ enterApp }: SetupWizardProps) => {
  const { t, i18n } = useTranslation();
  const [step,        setStep]  = useState(0);
  const [houseName,   setHN]    = useState("");
  const [count,       setCount] = useState("");
  const [names,       setNames] = useState<string[]>([]);

  // Rotation order state — arrays of names (converted to IDs on save)
  const [cleaningRotationOrder, setCleaningRotationOrder] = useState<string[]>([]);
  const [suppliesRotationOrder, setSuppliesRotationOrder] = useState<string[]>([]);

  const [selectedSupplies, setSelectedSupplies] = useState<Supply[]>(SUGGESTED_SUPPLIES.slice(0, 3));
  const [customLabel,      setCustomLabel]       = useState("");
  const [customEmoji,      setCustomEmoji]       = useState("📦");
  const [showCustomForm,   setShowCustomForm]    = useState(false);

  const [cleaningEnabled,   setCleaningEnabled]   = useState(true);
  const [cleaningFrequency, setCleaningFrequency] = useState<"weekly"|"biweekly"|"monthly">("weekly");
  const [cleaningDay,       setCleaningDay]        = useState(6);

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
    return { date: d, label: d.toLocaleDateString(i18n.language, { weekday: "long", month: "short", day: "numeric" }) };
  }, [cleaningDay, i18n.language]);

  const lastCleaningDate = useMemo(() => {
    const today = new Date();
    const d     = new Date(today);
    const diff  = (today.getDay() - cleaningDay + 7) % 7 || 7;
    d.setDate(today.getDate() - diff);
    return { date: d, label: d.toLocaleDateString(i18n.language, { weekday: "long", month: "short", day: "numeric" }) };
  }, [cleaningDay, i18n.language]);

  // ── Navigation ─────────────────────────────────────────────────────────
  const goNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => {
    setStep(s => {
      if (s === 4 && !cleaningEnabled) return 2;
      return Math.max(s - 1, 0);
    });
  };

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCount = () => {
    const n = parseInt(count);
    if (isNaN(n) || n < 2 || n > 20) return;
    setNames(Array(n).fill(""));
    goNext();
  };

  // After completing member names (step 2), initialize both rotation orders
  const handleNamesComplete = () => {
    const validNames = names.filter(n => n.trim());
    setCleaningRotationOrder([...validNames]);
    setSuppliesRotationOrder([...validNames]);
    // Go to step 3 (cleaning rotation) or skip to step 4 if cleaning disabled
    setStep(cleaningEnabled ? 3 : 4);
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
        <option value="" disabled>{t('common.select_person', "Select a person…")}</option>
        {names.filter(n => n.trim()).map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );

  // ── Rotation order step UI (shared for both cleaning + supplies) ─────────
  const renderRotationStep = (
    title: string,
    subtitle: string,
    note: string,
    order: string[],
    setOrder: (o: string[]) => void,
    onContinue: () => void,
  ) => (
    <div className="flex flex-col gap-4 animate-fade-up">
      <div className="flex justify-between items-start">
        <button className={btnOutline} onClick={goBack}>← {t('common.back', "Back")}</button>
        <img src="/nusa-putra-logo.png" alt="Nusa Putra" className="nusa-logo h-10 w-auto opacity-80" />
      </div>
      <div className="mb-1">
        <p className="text-4xl mb-3">🔄</p>
        <h2 className="font-display font-black text-2xl text-foreground mb-1">{title}</h2>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-2">
        {order.map((name, i) => (
          <div
            key={name}
            className="flex items-center gap-3 p-3.5 rounded-3xl border-2 border-border bg-card shadow-sm"
          >
            {/* Position number */}
            <span
              className="text-sm font-black w-8 shrink-0 text-center"
              style={{ color: "hsl(var(--primary))" }}
            >
              {ordinal(i + 1)}
            </span>

            {/* Avatar */}
            <Avatar name={name} size={40} radius={12} fontSize={16} />

            {/* Name */}
            <span className="flex-1 font-semibold text-sm text-foreground">{name}</span>

            {/* Up / Down buttons */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                className="w-8 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all active:scale-90 disabled:opacity-25 disabled:pointer-events-none border border-border bg-muted/60 hover:bg-muted"
                disabled={i === 0}
                onClick={() => setOrder(swapItems(order, i, i - 1))}
                aria-label="Move up"
              >▲</button>
              <button
                className="w-8 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all active:scale-90 disabled:opacity-25 disabled:pointer-events-none border border-border bg-muted/60 hover:bg-muted"
                disabled={i === order.length - 1}
                onClick={() => setOrder(swapItems(order, i, i + 1))}
                aria-label="Move down"
              >▼</button>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl px-4 py-3">
        🔁 {note}
      </p>

      <button className={btnPrimary} onClick={onContinue}>
        {t('setup.confirm_order', "Confirm order")} <ChevronRight size={16} className="inline ml-1" />
      </button>
    </div>
  );

  // ── Validation ──────────────────────────────────────────────────────────
  const v0 = houseName.trim().length > 1;
  const v1 = parseInt(count) >= 2 && parseInt(count) <= 20;
  const v2 = names.length > 0 && names.every(n => n.trim().length > 0 && isValidName(n));
  const v3 = selectedSupplies.length > 0;
  const v6 = selectedSupplies.every(s => resp[s.id]?.last?.trim() && resp[s.id]?.next?.trim())
    && (!cleaningEnabled || (resp["__cleaning"]?.last?.trim() && resp["__cleaning"]?.next?.trim()));

  // ── handleFinish — creates house in DB ────────────────────────────────
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

      // Convert rotation order names → real member IDs
      const cleaningRotationIds = cleaningRotationOrder
        .map(name => insertedMembers.find(m => m.name === name)?.id)
        .filter(Boolean) as string[];

      const suppliesRotationIds = suppliesRotationOrder
        .map(name => insertedMembers.find(m => m.name === name)?.id)
        .filter(Boolean) as string[];

      await houseService.saveHouseSettings(newHouse.id, {
        supplies:                selectedSupplies,
        cleaning_enabled:        cleaningEnabled,
        cleaning_frequency:      cleaningFrequency,
        cleaning_day:            cleaningDay,
        rotation_type:           "round_robin",
        cleaning_rotation_order: cleaningRotationIds,
        supplies_rotation_order: suppliesRotationIds,
      });

      realHouseRef.current   = newHouse as House;
      realMembersRef.current = insertedMembers;
      setCode(generatedCode);
      setStep(8); // house code reveal step
    } catch (err: any) {
      console.error("Setup failed:", err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally { setIsGen(false); }
  };

  // ── buildAndEnter — enters dashboard after selecting member ───────────
  const buildAndEnter = (selectedMember: Member) => {
    const house   = realHouseRef.current;
    const members = realMembersRef.current;
    if (!house || !members.length) return;

    const getId = (name: string) => members.find(m => m.name === name.trim())?.id ?? null;

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

    // Build rotation using cleaning rotation order
    const cleaningRotationIds = cleaningRotationOrder
      .map(name => getId(name))
      .filter(Boolean) as string[];

    const orderedMembers = cleaningRotationIds.length
      ? cleaningRotationIds.map(id => members.find(m => m.id === id)).filter(Boolean) as Member[]
      : members;

    const lastCleanerIdx = lastCleaner ? orderedMembers.findIndex(m => m.id === lastCleaner.id) : 0;
    const rotation = buildRotation(orderedMembers, Math.max(0, lastCleanerIdx));

    const initSupplyResps = selectedSupplies.reduce<{ id: string; house_id: string; item_name: string; next_member_id: string }[]>((acc, s, i) => {
      const m = members.find(x => x.name === resp[s.id]?.next?.trim());
      if (m) acc.push({ id: `sr_${i}`, house_id: house.id, item_name: s.label, next_member_id: m.id });
      return acc;
    }, []);

    const suppliesRotationIds = suppliesRotationOrder
      .map(name => getId(name))
      .filter(Boolean) as string[];

    enterApp(
      selectedMember, house, members, initClean, initPurchases, [],
      rotation, initSupplyResps, cleaningEnabled,
      cleaningRotationIds.length ? cleaningRotationIds : members.map(m => m.id),
      suppliesRotationIds.length ? suppliesRotationIds : members.map(m => m.id),
    );
  };

  const chooseMember = (m: Member | null) => { 
    if (!m) return;
    setChosen(m.id); 
    // Enter immediately after selecting member
    setTimeout(() => {
      buildAndEnter(m);
    }, 450); 
  };

  const copyCode = () => { navigator.clipboard?.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Progress header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-6 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display font-black text-xl text-primary">NusaNest</h1>
            <span className="text-xs font-bold text-muted-foreground">{t('setup.step_count', { current: step + 1, total: TOTAL_STEPS, defaultValue: `Step ${step + 1} of ${TOTAL_STEPS}` })}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-400"
                style={{ 
                  background: i < step ? "hsl(var(--primary))" : i === step ? "hsl(var(--primary))" : "hsl(var(--muted))",
                  opacity: i <= step ? 1 : 0.3
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-7 max-w-lg mx-auto w-full">

        {/* ── STEP 0 — House name ── */}
        {step === 0 && (
          <div className="flex flex-col gap-4 animate-fade-up">
            <div className="flex justify-end">
              <img src="/nusa-putra-logo.png" alt="Nusa Putra" className="nusa-logo h-10 w-auto opacity-80" />
            </div>
            <div className="mb-2">
              <p className="text-4xl mb-3">🏠</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">{t('setup.steps.house_name.title', "Name your NusaNest")}</h2>
              <p className="text-muted-foreground text-sm font-medium">{t('setup.steps.house_name.desc', "Give your house a memorable name that your housemates will recognise.")}</p>
            </div>
            <input type="text" className={inputClass} placeholder={t('setup.steps.house_name.placeholder', 'e.g. House 07')}
              value={houseName} onChange={e => {
                const raw = e.target.value;
                const formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
                setHN(formatted);
              }}
              onKeyDown={e => e.key === "Enter" && v0 && goNext()} autoFocus />
            <button className={btnPrimary} onClick={goNext} disabled={!v0}>{t('common.next', "Continue")} <ChevronRight size={16} className="inline ml-1" /></button>
          </div>
        )}

        {/* ── STEP 1 — Number of people ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-fade-up">
            <div className="flex justify-between items-start">
              <button className={btnOutline} onClick={goBack}>← {t('common.back', "Back")}</button>
              <img src="/nusa-putra-logo.png" alt="Nusa Putra" className="nusa-logo h-10 w-auto opacity-80" />
            </div>
            <div className="mb-2">
              <p className="text-4xl mb-3">👥</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">{t('setup.steps.member_count.title', "How many housemates?")}</h2>
              <p className="text-muted-foreground text-sm">{t('setup.steps.member_count.desc', { house: houseName, defaultValue: `Including yourself — how many people live in ${houseName}?` })}</p>
            </div>
            <input type="number" className={inputClass} placeholder={t('setup.steps.member_count.placeholder', "e.g. 4")} min={2} max={20}
              value={count} onChange={e => setCount(e.target.value)}
              onKeyDown={e => e.key === "Enter" && v1 && handleCount()} autoFocus />
            <div className="flex gap-2 flex-wrap">
              {[2,3,4,5,6,7,8].map(n => (
                <button key={n}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all duration-200 ${String(n) === count ? "bg-primary text-primary-foreground shadow-sm scale-105" : "bg-card text-foreground border border-border hover:bg-muted/30 active:scale-95"}`}
                  onClick={() => setCount(String(n))}>{n}</button>
              ))}
            </div>
            <button className={btnPrimary} onClick={handleCount} disabled={!v1}>{t('common.next', "Continue")} <ChevronRight size={16} className="inline ml-1" /></button>
          </div>
        )}

        {/* ── STEP 2 — Member names ── */}
        {step === 2 && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <div className="flex justify-between items-start mb-2">
              <button className={btnOutline} onClick={goBack}>← {t('common.back', "Back")}</button>
              <img src="/nusa-putra-logo.png" alt="Nusa Putra" className="nusa-logo h-10 w-auto opacity-80" />
            </div>
            <div className="mb-1">
              <p className="text-4xl mb-3">✍️</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">{t('setup.steps.member_names.title', "Who lives there?")}</h2>
              <p className="text-muted-foreground text-sm">{t('setup.steps.member_names.desc', "Enter each housemate's name.")}</p>
            </div>
            {names.map((n, i) => {
              const placeholder = MEMBER_PLACEHOLDERS[i] || `e.g. Housemate ${i + 1}`;
              const valid = n.length === 0 || isValidName(n);

              return (
                <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase block mb-1.5">{t('setup.steps.member_names.label', { index: i + 1, defaultValue: `Person ${i + 1}` })}</label>
                  <input type="text" className={`${inputClass} ${!valid ? "border-destructive focus:border-destructive" : ""}`} placeholder={placeholder}
                    value={n} onChange={e => {
                      const raw = e.target.value.replace(/[0-9,\.]/g, '');
                      const formatted = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
                      setNames(p => p.map((v, j) => j === i ? formatted : v));
                    }} />
                  {!valid && (
                    <p className="text-destructive text-[10px] font-bold mt-1.5 animate-fade-down uppercase tracking-wider">
                      ⚠️ {t('setup.steps.member_names.error', "Names should only contain letters — e.g. Mohammed, Sara")}
                    </p>
                  )}
                </div>
              );
            })}
            <button className={`${btnPrimary} mt-2`} onClick={handleNamesComplete} disabled={!v2}>{t('common.next', "Continue")} <ChevronRight size={16} className="inline ml-1" /></button>
          </div>
        )}

        {/* ── STEP 3 — Cleaning rotation order (only if cleaningEnabled) ── */}
        {step === 3 && cleaningEnabled && renderRotationStep(
          t('setup.steps.cleaning_rotation.title', "What is the cleaning rotation order?"),
          t('setup.steps.cleaning_rotation.subtitle', "Set the order for cleaning turns. The house follows this exact sequence."),
          t('setup.steps.cleaning_rotation.note', "This order repeats forever. After the last person it goes back to the first."),
          cleaningRotationOrder,
          setCleaningRotationOrder,
          goNext,
        )}

        {/* ── STEP 4 — Supplies rotation order (always shown) ── */}
        {step === 4 && renderRotationStep(
          t('setup.steps.supplies_rotation.title', "What is the supplies rotation order?"),
          t('setup.steps.supplies_rotation.subtitle', "Set the order for buying shared supplies. This applies to all items equally."),
          t('setup.steps.supplies_rotation.note', "This order applies to all shared items. After the last person it goes back to the first."),
          suppliesRotationOrder,
          setSuppliesRotationOrder,
          goNext,
        )}

        {/* ── STEP 5 — What do you share? ── */}
        {step === 5 && (
          <div className="flex flex-col gap-5 animate-fade-up">
            <div className="flex justify-between items-start">
              <button className={btnOutline} onClick={goBack}>← {t('common.back', "Back")}</button>
              <img src="/nusa-putra-logo.png" alt="Nusa Putra" className="nusa-logo h-10 w-auto opacity-80" />
            </div>
            <div>
              <p className="text-4xl mb-3">🛒</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">{t('setup.steps.share_items.title', "What do you share?")}</h2>
              <p className="text-muted-foreground text-sm font-medium">{t('setup.steps.share_items.desc', "Select everything your house buys together. Add your own items too — every house is different.")}</p>
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
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-muted/40 border border-border">
                <p className="text-sm font-bold text-foreground">{t('setup.steps.share_items.add_custom', "Add your own item")}</p>

                {/* Emoji picker grid */}
                <div className="overflow-x-auto">
                  {EMOJI_PICKER.map(row => (
                    <div key={row.category} className="flex gap-1.5 mb-1.5 flex-wrap">
                      {row.emojis.map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setCustomEmoji(em)}
                          className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all duration-150 active:scale-90 shrink-0"
                          style={{
                            background: customEmoji === em ? "hsla(var(--primary) / 0.15)" : "transparent",
                            border: customEmoji === em ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                          }}
                          aria-label={em}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                <input className={`${inputClass}`} placeholder={t('setup.steps.share_items.custom_placeholder', "e.g. Trash bags, Bread…")}
                  value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustomSupply()} autoFocus />

                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                    onClick={addCustomSupply} disabled={!customLabel.trim()}>{t('setup.steps.share_items.add_btn', "Add item")}</button>
                  <button className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm active:scale-95 transition-all"
                    onClick={() => { setShowCustomForm(false); setCustomLabel(""); setCustomEmoji("📦"); }}>{t('common.cancel', "Cancel")}</button>
                </div>
              </div>
            ) : (
              <button className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 font-semibold text-sm transition-all"
                onClick={() => setShowCustomForm(true)}>
                <Plus size={16} /> {t('setup.steps.share_items.add_custom', "Add your own item")}
              </button>
            )}

            <button className={btnPrimary} onClick={goNext} disabled={!v3}>
              {t('setup.steps.share_items.continue_count', { count: selectedSupplies.length, defaultValue: `Continue with ${selectedSupplies.length} items` })} <ChevronRight size={16} className="inline ml-1" />
            </button>
          </div>
        )}

        {/* ── STEP 6 — Cleaning schedule ── */}
        {step === 6 && (
          <div className="flex flex-col gap-5 animate-fade-up">
            <div className="flex justify-between items-start">
              <button className={btnOutline} onClick={goBack}>← {t('common.back', "Back")}</button>
              <img src="/nusa-putra-logo.png" alt="Nusa Putra" className="nusa-logo h-10 w-auto opacity-80" />
            </div>
            <div>
              <p className="text-4xl mb-3">🧹</p>
              <h2 className="font-display font-black text-2xl text-foreground mb-1">{t('setup.steps.cleaning_schedule.title', "Cleaning schedule?")}</h2>
              <p className="text-muted-foreground text-sm font-medium">{t('setup.steps.cleaning_schedule.desc', "Does your house rotate cleaning duties?")}</p>
            </div>

            <div className="flex gap-3">
              {[{ v: true, label: t('setup.steps.cleaning_schedule.yes', "✅ Yes, we rotate") }, { v: false, label: t('setup.steps.cleaning_schedule.no', "❌ No schedule") }].map(opt => (
                <button key={String(opt.v)} onClick={() => setCleaningEnabled(opt.v)}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-sm border-2 transition-all duration-200 active:scale-[0.95] ${cleaningEnabled === opt.v ? "border-primary bg-primary/8 text-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {cleaningEnabled && (
              <>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">{t('setup.steps.cleaning_schedule.frequency', "How often?")}</label>
                  <div className="flex gap-2">
                    {[{ v: "weekly", label: t('settings.cleaning.freq_options.weekly', "Weekly") }, { v: "biweekly", label: t('settings.cleaning.freq_options.biweekly', "Every 2 weeks") }, { v: "monthly", label: t('settings.cleaning.freq_options.monthly', "Monthly") }].map(opt => (
                      <button key={opt.v} onClick={() => setCleaningFrequency(opt.v as any)}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs border-2 transition-all active:scale-[0.95] ${cleaningFrequency === opt.v ? "border-primary bg-primary/8 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">{t('setup.steps.cleaning_schedule.day', "Which day?")}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CLEANING_DAYS.map(d => (
                      <button key={d.value} onClick={() => setCleaningDay(d.value)}
                        className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all active:scale-[0.95] ${cleaningDay === d.value ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                        {t(`common.days_short.${d.value}`, d.label.slice(0, 3))}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button className={btnPrimary} onClick={goNext}>{t('common.next', "Continue")} <ChevronRight size={16} className="inline ml-1" /></button>
          </div>
        )}


        {/* ── STEP 7 — Who bought what last? ── */}
        {step === 7 && (
          <div className="flex flex-col gap-5 animate-fade-up">
            <div className="flex justify-between items-start">
              <button className={btnOutline} onClick={goBack}>← {t('common.back', "Back")}</button>
              <img src="/nusa-putra-logo.png" alt="Nusa Putra" className="nusa-logo h-10 w-auto opacity-80" />
            </div>
            <div>

              <h2 className="font-display font-black text-2xl text-foreground mb-1">{t('setup.steps.starting_point.title', "Starting point")}</h2>
              <p className="text-muted-foreground text-sm font-medium">{t('setup.steps.starting_point.desc', "Tell us who last bought each item and who's next. This is how we start the rotation.")}</p>
            </div>

            {cleaningEnabled && (
              <div className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm">
                <h3 className="font-display font-bold text-lg text-foreground mb-4">🧹 {t('cleaning.title', "Cleaning")}</h3>
                {renderDropdown(t('setup.steps.starting_point.last_cleaned', { date: lastCleaningDate.label, defaultValue: `Who cleaned last? (${lastCleaningDate.label})` }), "__cleaning", "last")}
                {renderDropdown(t('setup.steps.starting_point.next_cleaner', { date: nextCleaningDate.label, defaultValue: `Who cleans next? (${nextCleaningDate.label})` }), "__cleaning", "next")}
              </div>
            )}

            {selectedSupplies.map(s => (
              <div key={s.id} className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm">
                <h3 className="font-display font-bold text-lg text-foreground mb-4">{s.icon} {s.label}</h3>
                {renderDropdown(t('setup.steps.starting_point.last_bought', { item: s.label, defaultValue: `Who bought ${s.label} last?` }), s.id, "last")}
                {renderDropdown(t('setup.steps.starting_point.next_buyer', { item: s.label, defaultValue: `Who should buy ${s.label} next?` }), s.id, "next")}
              </div>
            ))}

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-sm font-medium">⚠️ {error}</div>
            )}

            <button className={btnPrimary} onClick={handleFinish} disabled={!v6 || isGenerating}>
              {isGenerating ? t('setup.steps.starting_point.setting_up', "Setting up your NusaNest…") : t('setup.steps.starting_point.generate_btn', "🎉 Generate House Code")}
            </button>
          </div>
        )}

        {/* ── STEP 8 — House code ── */}
        {step === 8 && (
          <div className="flex flex-col gap-4 text-center animate-fade-up">
            <div className="text-6xl" style={{ animation: "float 3s ease-in-out infinite" }}>🎉</div>
            <h2 className="font-display font-black text-2xl text-primary">{t('setup.steps.house_code.title', "Your NusaNest is Ready!")}</h2>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed">{t('setup.steps.house_code.desc', "Share this code with your housemates:")}</p>
            <div className="rounded-3xl p-7 bg-primary shadow-lg">
              <p className="text-primary-foreground/60 text-xs font-bold tracking-widest uppercase mb-3">{t('join.code_label', "House Code")}</p>
              <p className="font-display font-black text-5xl text-primary-foreground tracking-[0.22em] mb-2">{code}</p>
              <p className="text-primary-foreground/40 text-xs">{houseName}</p>
            </div>
            <button className="w-full py-3.5 rounded-xl bg-card text-foreground font-bold border border-border shadow-sm hover:bg-muted/30 transition-all" onClick={copyCode}>
              {copied ? t('setup.steps.house_code.copied', "✅ Copied!") : t('setup.steps.house_code.copy_btn', "📋 Copy code")}
            </button>
            <div className="rounded-2xl bg-muted/40 border border-border p-4 text-left">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">{t('setup.steps.house_code.summary_title', "Your NusaNest summary")}</p>
              <div className="flex flex-col gap-1.5 text-sm font-medium">
                <p>🛒 <b>{t('setup.steps.house_code.items_summary', { count: selectedSupplies.length, defaultValue: `${selectedSupplies.length} shared items:` })}</b> {selectedSupplies.map(s => `${s.icon} ${s.label}`).join(", ")}</p>
                <p>🧹 <b>{t('setup.steps.house_code.cleaning_summary', "Cleaning:")}</b> {cleaningEnabled ? `${t(`setup.steps.house_code.cleaning_freq.${cleaningFrequency}`, cleaningFrequency)} ${t('setup.steps.house_code.cleaning_on', { day: CLEANING_DAYS.find(d => d.value === cleaningDay)?.label, defaultValue: `on ${CLEANING_DAYS.find(d => d.value === cleaningDay)?.label}s` })}` : t('setup.steps.house_code.cleaning_none', "Not scheduled")}</p>
                {cleaningEnabled && <p>🔄 <b>{t('setup.steps.house_code.cleaning_order', "Cleaning order:")}</b> {cleaningRotationOrder.join(" → ")}</p>}
                <p>🔄 <b>{t('setup.steps.house_code.supplies_order', "Supplies order:")}</b> {suppliesRotationOrder.join(" → ")}</p>
              </div>
            </div>
            <button className={btnPrimary} onClick={() => setStep(9)}>{t('setup.steps.house_code.who_are_you', "Who are you? →")}</button>
          </div>
        )}

        {/* ── STEP 9 — Select your name ── */}
        {step === 9 && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <div className="mb-1">
              <p className="text-4xl mb-3">👋</p>
              <h2 className="font-display font-black text-2xl text-primary mb-1">{t('setup.steps.who_are_you.title', "Who are you?")}</h2>
              <p className="text-muted-foreground text-sm font-medium">{t('setup.steps.who_are_you.desc', "Select your name to enter your NusaNest:")}</p>
            </div>
            {realMembersRef.current.map((m, i) => (
              <button key={m.id}
                className={`w-full p-5 rounded-3xl border-2 bg-card text-left font-semibold flex items-center gap-4 transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:translate-x-1 animate-fade-up shadow-sm ${chosen === m.id ? "border-primary bg-primary/5" : "border-border"}`}
                style={{ animationDelay: `${i * 0.07}s` }}
                onClick={() => chooseMember(m)}>
                <Avatar name={m.name} size={50} radius={16} fontSize={20} />
                <div className="flex-1">
                  <div className="text-lg text-foreground">{m.name}</div>
                  <div className="font-normal text-xs text-muted-foreground mt-0.5">{t('setup.steps.who_are_you.joined_on', { date: new Date(m.created_at).toLocaleDateString(i18n.language, { month: "short", day: "numeric" }), defaultValue: `Joined ${new Date(m.created_at).toLocaleDateString()}` })}</div>
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
