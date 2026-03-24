import { useState } from "react";
import { Member, Purchase, Supply, TravelMode, TopContributor, MemberProfile, getDisplayName } from "@/lib/househub";
import { CheckCircle2 } from "lucide-react";
import Avatar from "./Avatar";
import { useTranslation } from "react-i18next";

interface SuppliesTabProps {
  user:                  Member | null;
  members:               Member[];
  doBuy:                 (supply: Supply) => void;
  purchases:             Purchase[];
  getMember:             (id: string) => Member | undefined;
  nextBuyerByItem:       Record<string, Member | null>;
  activeSupplies:        Supply[];
  suppliesRotationOrder: string[];
  activeTravelModes:     TravelMode[];
  topContributor:        TopContributor | null;
  memberProfiles:        Record<string, MemberProfile>;
}

// Celebration messages moved to locale

const SuppliesTab = ({
  user,
  members,
  doBuy,
  purchases,
  getMember,
  nextBuyerByItem,
  activeSupplies,
  suppliesRotationOrder,
  activeTravelModes,
  topContributor,
  memberProfiles,
}: SuppliesTabProps) => {
  const { t } = useTranslation();
  const [confirmingItem, setConfirmingItem] = useState<string | null>(null);
  const [celebrationMap, setCelebrationMap] = useState<Record<string, { emoji: string; msg: string } | null>>({});
  const [pressingItem,   setPressingItem]   = useState<string | null>(null);

  const handleConfirm = (supply: Supply) => {
    if (pressingItem) return;
    setPressingItem(supply.id);
      setTimeout(() => {
        doBuy(supply);
        
        // Get random message from locale
        const messagesObj = t('supplies.messages', { returnObjects: true }) as any;
        const itemMessages = messagesObj[supply.label] || [t('supplies.purchase_saved')];
        const randomIndex = Math.floor(Math.random() * itemMessages.length);
        
        const emojis: Record<string, string> = { "Water": "💧", "Gas": "🔥", "Soap & Sponge": "🫧" };
        const emoji = emojis[supply.label] || "🛒";
        
        setCelebrationMap(prev => ({ 
          ...prev, 
          [supply.id]: { emoji, msg: itemMessages[randomIndex] } 
        }));
        setConfirmingItem(null);
        setPressingItem(null);
        setTimeout(() => {
          setCelebrationMap(prev => ({ ...prev, [supply.id]: null }));
        }, 4000);
      }, 180);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* SECTION 1 — Per-item responsibility cards */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          {t('supplies.next_buyer', "Next Buyer — Per Item")}
        </h3>
        <div className="flex flex-col gap-3">
          {activeSupplies.map(s => {
            const nextBuyer    = nextBuyerByItem[s.label];
            const isMyTurn     = nextBuyer?.id === user?.id;
            const isConfirming = confirmingItem === s.id;
            const isPressing   = pressingItem   === s.id;
            const celebration  = celebrationMap[s.id];

            // ── Upcoming turns for this supply item ──────────────────
            const nextBuyerId = nextBuyer?.id;
            const startIdx = suppliesRotationOrder.indexOf(nextBuyerId ?? "");
            const upcomingTurns: Member[] = startIdx === -1
              ? members
              : [
                  ...suppliesRotationOrder.slice(startIdx),
                  ...suppliesRotationOrder.slice(0, startIdx),
                ].map(id => members.find(m => m.id === id)).filter(Boolean) as Member[];

            return (
              <div
                key={s.id}
                className={`rounded-2xl border transition-all duration-400 ${
                  celebration
                    ? "bg-primary/5 border-primary/20 shadow-md"
                    : isMyTurn
                    ? "bg-accent/10 border-accent/40 shadow-sm"
                    : "bg-card border-border shadow-sm hover:shadow-md hover:border-border/80"
                }`}
                style={{ transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)" }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-transform duration-300 relative ${
                        isMyTurn ? "scale-110" : ""
                      }`}
                      style={{ background: s.bg }}
                    >
                      {s.icon}
                      {activeTravelModes.some(t => t.member_id === nextBuyer?.id) && (
                        <span className="absolute -top-1 -right-1 text-[10px] bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-blue-500">✈️</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base leading-tight">{s.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {t('supplies.next', "Next")}:{" "}
                        <span className={`font-semibold ${isMyTurn ? "text-accent" : "text-foreground"}`}>
                          {getDisplayName(nextBuyerId ?? "", members, memberProfiles)}
                          {isMyTurn && ` (${t('common.you', "You")})`}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Action button — only shown if it's your turn and not celebrating */}
                  {isMyTurn && !celebration && !isConfirming && (
                    <button
                      className="px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200
                        bg-accent text-accent-foreground
                        hover:bg-accent/90 hover:shadow-md hover:-translate-y-0.5
                        active:scale-95"
                      onClick={() => setConfirmingItem(s.id)}
                    >
                      {t('supplies.i_bought_it', "I bought it")}
                    </button>
                  )}

                  {/* Checkmark when celebrating */}
                  {celebration && (
                    <CheckCircle2
                      size={22}
                      className="text-primary shrink-0"
                      style={{ animation: "pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
                    />
                  )}
                </div>

                {/* Confirm row */}
                {isMyTurn && isConfirming && !celebration && (
                  <div
                    className="px-4 pb-4 flex gap-2"
                    style={{ animation: "slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
                  >
                    <button
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
                        bg-accent text-accent-foreground
                        hover:bg-accent/90 active:scale-95
                        ${isPressing ? "opacity-70 scale-95" : ""}
                      `}
                      onClick={() => handleConfirm(s)}
                      disabled={!!isPressing}
                    >
                      {isPressing ? t('common.saving', "Saving…") : `✓ ${t('supplies.confirm_item', { item: s.label, defaultValue: `Confirm ${s.label}` })}`}
                    </button>
                    <button
                      className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm
                        hover:bg-muted/80 active:scale-95 transition-all duration-200"
                      onClick={() => setConfirmingItem(null)}
                    >
                      {t('common.cancel', "Cancel")}
                    </button>
                  </div>
                )}

                {/* Celebration message */}
                {celebration && (
                  <div
                    className="px-4 pb-4 flex items-center gap-2"
                    style={{ animation: "slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
                  >
                    <span className="text-xl">{celebration.emoji}</span>
                    <p className="text-sm font-bold text-primary">
                      {celebration.msg}
                    </p>
                  </div>
                )}

                {/* ── Upcoming Turns list ── */}
                {upcomingTurns.length > 0 && (
                  <div className="border-t border-border/50">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-2">
                      {t('supplies.upcoming_turns', "Upcoming Turns")}
                    </p>
                    {upcomingTurns.map((m, i) => {
                      const isMe   = m.id === user?.id;
                      const isNext = i === 0;
                      return (
                        <div
                          key={`${s.id}-${m.id}-${i}`}
                          className={`flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 transition-colors duration-200
                            ${isNext ? "bg-primary/5" : "hover:bg-muted/40"}`}
                        >
                          <span className={`font-display font-bold w-5 shrink-0 text-sm ${isNext ? "text-primary" : "text-muted-foreground"}`}>
                            {i + 1}.
                          </span>
                          <Avatar 
                            member={m} 
                            profile={memberProfiles[m.id]}
                            name={getDisplayName(m.id, members, memberProfiles)}
                            size={24} 
                            fontSize={10} 
                            radius={6} 
                            isTravelling={activeTravelModes.some(t => t.member_id === m.id)}
                            isTopContributor={m.id === topContributor?.member_id && topContributor?.month === new Date().toISOString().slice(0, 7)}
                          />
                          <span className="flex-1 font-medium text-foreground">
                            <span className={isMe ? "text-primary font-bold" : ""}>
                              {getDisplayName(m.id, members, memberProfiles)}
                            </span>
                            {isMe && (
                              <span className="ml-1.5 text-xs text-muted-foreground">({t('common.you', "You")})</span>
                            )}
                            {isNext && (
                              <span className="ml-2 text-xs font-bold text-primary">← {t('cleaning.next_tag', "next")}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <style>{`
        @keyframes pop-in {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.25); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slide-up {
          0%   { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SuppliesTab;
