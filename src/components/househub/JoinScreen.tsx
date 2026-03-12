import { useState, useRef } from "react";
import { Member, House, CleanRecord, Purchase, ActivityLog, RotationEntry, buildRotation, fmtDate } from "@/lib/househub";
import Avatar from "./Avatar";

interface JoinScreenProps {
  enterApp: (member: Member, house: House, members: Member[], cleanRecs: CleanRecord[], purchases: Purchase[], log: ActivityLog[], rotation: RotationEntry[]) => void;
  onBack: () => void;
}

const DEMO = {
  code: "483912",
  house: { id: "h1", name: "Sunset Student House", code: "483912", created_at: "2025-01-05T10:00:00Z" },
  members: [
    { id: "m1", name: "Maher", joined_at: "2025-01-05T10:00:00Z" },
    { id: "m2", name: "Ahmed", joined_at: "2025-01-05T10:00:00Z" },
    { id: "m3", name: "Ali", joined_at: "2025-01-06T09:00:00Z" },
    { id: "m4", name: "Youssef", joined_at: "2025-01-07T08:00:00Z" },
  ],
  purchases: [
    { id: "p1", member_id: "m2", item_id: "gas", item_name: "Gas", purchase_date: "2025-03-07T10:00:00Z" },
    { id: "p2", member_id: "m3", item_id: "water", item_name: "Water", purchase_date: "2025-03-06T14:00:00Z" },
    { id: "p3", member_id: "m1", item_id: "soap", item_name: "Soap", purchase_date: "2025-03-04T11:00:00Z" },
    { id: "p4", member_id: "m4", item_id: "sponge", item_name: "Sponge", purchase_date: "2025-03-02T09:00:00Z" },
  ],
  log: [
    { id: "l1", member_id: "m1", action: "Maher cleaned the house", icon: "🧹", created_at: "2025-03-09T11:00:00Z" },
    { id: "l2", member_id: "m2", action: "Ahmed bought Gas", icon: "🔥", created_at: "2025-03-07T10:00:00Z" },
    { id: "l3", member_id: "m3", action: "Ali bought Water", icon: "💧", created_at: "2025-03-06T14:00:00Z" },
  ],
  cleanRecs: [{ id: "cr1", member_id: "m1", house_id: "h1", cleaning_date: "2025-03-09T11:00:00Z", completed: true }],
};

const JoinScreen = ({ enterApp, onBack }: JoinScreenProps) => {
  const [step, setStep] = useState<"code" | "name">("code");
  const [digits, setDig] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigit = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const n = [...digits]; n[idx] = val; setDig(n); setError("");
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const verify = () => {
    const code = digits.join("");
    if (code === DEMO.code) { setError(""); setStep("name"); }
    else { setError(`Wrong code. Hint: try ${DEMO.code}`); setDig(["", "", "", "", "", ""]); setTimeout(() => refs.current[0]?.focus(), 50); }
  };

  const choose = (m: Member) => {
    setChosen(m.id);
    const rot = buildRotation(DEMO.members, DEMO.members.indexOf(DEMO.members.find(x => x.id === "m1")!));
    setTimeout(() => enterApp(m, DEMO.house, DEMO.members, DEMO.cleanRecs, DEMO.purchases, DEMO.log, rot), 450);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-gradient-to-br from-forest via-forest-2 to-forest-3 px-6 pt-12 pb-8">
        <div className="max-w-md mx-auto">
          <button className="bg-transparent border-none text-cream/50 text-sm font-bold cursor-pointer pb-4 block" onClick={onBack}>← Back</button>
          <h2 className="font-display font-extrabold text-3xl text-cream mb-1.5">
            {step === "code" ? "Enter house code" : "✅ Code verified!"}
          </h2>
          <p className="text-cream/55 text-sm">
            {step === "code" ? "Your housemate shared a 6-digit code with you." : "Select your name to load your dashboard."}
          </p>
        </div>
      </div>

      <div className="flex-1 px-6 py-7 max-w-md mx-auto w-full">
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
                  className={`w-12 h-16 rounded-xl border-2 bg-cream font-display text-2xl font-bold text-forest text-center outline-none transition-all focus:border-forest focus:shadow-[0_0_0_4px_hsla(217,91%,53%,.1)] focus:scale-105 ${d ? "border-forest/35 bg-card" : "border-border"}`}
                  ref={el => { refs.current[i] = el; }}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKey(i, e)}
                  onFocus={e => e.target.select()}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {error && (
              <div className="animate-pop bg-rust/10 border-2 border-rust/25 rounded-xl px-4 py-3 text-rust font-bold text-sm text-center">
                {error}
              </div>
            )}
            <button className="w-full py-4 rounded-xl bg-forest font-bold text-cream shadow-[0_4px_20px_hsla(217,91%,53%,.3)] hover:bg-forest-2 active:scale-[0.96] transition-all disabled:opacity-40" onClick={verify} disabled={!digits.every(d => d)}>Verify Code →</button>
            <p className="text-ink-4 text-xs text-center">Ask your housemate for the 6-digit code 😊</p>
          </div>
        )}

        {step === "name" && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <p className="text-ink-3 text-sm mb-1">Select your name from the list:</p>
            {DEMO.members.map((m, i) => (
              <button
                key={m.id}
                className={`w-full p-5 rounded-xl border-2 bg-card text-left font-semibold flex items-center gap-4 transition-all duration-200 hover:border-forest hover:bg-forest/5 hover:translate-x-1 animate-fade-up ${chosen === m.id ? "border-forest bg-forest/5" : "border-border"}`}
                style={{ animationDelay: `${i * 0.07}s` }}
                onClick={() => choose(m)}
              >
                <Avatar name={m.name} size={50} radius={16} fontSize={20} />
                <div className="flex-1">
                  <div className="text-lg">{m.name}</div>
                  <div className="font-normal text-xs text-ink-3 mt-0.5">Joined {fmtDate(m.joined_at, { month: "short", day: "numeric" })}</div>
                </div>
                {chosen === m.id && <span className="text-forest text-xl">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinScreen;
