import { Member, Purchase, ActivityLog, RotationEntry, CleanRecord, Supply, fmtDate, TravelMode, TravelIOU, TopContributor, MemberProfile, getDisplayName } from "@/lib/househub";
import { ArrowRight, Sparkles, Plane, Handshake, CheckCircle2, Clock } from "lucide-react";
import Avatar from "./Avatar";
import { houseService } from "@/services/houseService";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface HomeTabProps {
  lastCleanMbr:      Member | undefined;
  lastCleanRec:      CleanRecord | undefined;
  purchases:         Purchase[];
  actLog:            ActivityLog[];
  getMember:         (id: string) => Member | undefined;
  thisCleanMbr:      Member | undefined;
  thisRotation:      RotationEntry | null;
  nextBuyer:         Member | null;
  nextBuyerByItem:   Record<string, Member | null>;
  isMyTurnClean:     boolean;
  user:              Member | null;
  setTab:            (tab: string) => void;
  cleaningEnabled:    boolean;
  activeSupplies:     Supply[];
  nextCleaningDate:   Date;
  activeTravelModes:  TravelMode[];
  unsettledIOUs:      TravelIOU[];
  houseId:           string;
  topContributor:    TopContributor | null;
  memberProfiles:    Record<string, MemberProfile>;
  members:           Member[];
}

const HomeTab = ({
  lastCleanMbr,
  lastCleanRec,
  purchases,
  actLog,
  getMember,
  thisCleanMbr,
  thisRotation,
  nextBuyerByItem,
  isMyTurnClean,
  user,
  setTab,
  cleaningEnabled,
  activeSupplies,
  nextCleaningDate,
  activeTravelModes,
  unsettledIOUs,
  houseId,
  topContributor,
  memberProfiles,
  members,
}: HomeTabProps) => {
  const { t } = useTranslation();
  const lastPurchase  = purchases[0];
  const mySupplyItems = activeSupplies.filter(s => nextBuyerByItem[s.label]?.id === user?.id);
  const isMyTurnBuy   = mySupplyItems.length > 0;

  const handleSettle = async (iouId: string) => {
    try {
      await houseService.settleIOU(houseId, iouId);
      toast.success(t('home.iou.settled_success', "IOU marked as settled! 🤝"));
    } catch (err) {
      toast.error(t('home.iou.settled_error', "Failed to settle IOU"));
    }
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Travel Banners */}
      {activeTravelModes.length > 0 && (
        <div className="space-y-2">
          {activeTravelModes.map(tm => {
            const traveller = getMember(tm.member_id);
            const isMe = tm.member_id === user?.id;
            return (
              <div 
                key={tm.id}
                className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-500"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg shadow-sm">✈️</div>
                  <div>
                    <p className="font-bold text-sm text-blue-700">
                      {isMe ? t('home.travel.you_are_travelling', "You are on travel") : t('home.travel.member_is_travelling', { name: getDisplayName(tm.member_id, members, memberProfiles).split(" ")[0], defaultValue: `${getDisplayName(tm.member_id, members, memberProfiles).split(" ")[0]} is on travel` })}
                    </p>
                    <p className="text-[10px] font-bold text-blue-600/70 uppercase tracking-widest leading-none mt-0.5">
                      {t('common.until', "Until")} {fmtDate(tm.return_date, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                {isMe && (
                  <button 
                    onClick={() => houseService.endTravelMode(houseId, tm.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 active:scale-95 transition-all"
                  >
                    {t('common.i_am_back', "I'm back")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Travel IOUs Section */}
      {unsettledIOUs.length > 0 && (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-6 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 mb-4">
            <Handshake className="text-gold" size={20} />
            <h2 className="text-xl font-bold font-display text-foreground">{t('home.iou.title', "Travel IOUs")}</h2>
          </div>
          <div className="space-y-3">
            {unsettledIOUs.map(iou => {
              const traveler = getMember(iou.traveler_member_id);
              const cover = getMember(iou.cover_member_id);
              const isTraveler = iou.traveler_member_id === user?.id;
              const isCover = iou.cover_member_id === user?.id;

              return (
                <div key={iou.id} className="bg-card border border-gold/20 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{iou.supply_item_icon}</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {isTraveler 
                          ? (isCover ? t('home.iou.you_owe_yourself', "You owe yourself (error)") : t('home.iou.you_owe', { name: getDisplayName(iou.cover_member_id, members, memberProfiles).split(" ")[0], defaultValue: `You owe ${getDisplayName(iou.cover_member_id, members, memberProfiles).split(" ")[0]}` }))
                          : (isCover ? t('home.iou.member_owes_you', { name: getDisplayName(iou.traveler_member_id, members, memberProfiles).split(" ")[0], defaultValue: `${getDisplayName(iou.traveler_member_id, members, memberProfiles).split(" ")[0]} owes you` }) : t('home.iou.member_owes_member', { traveller: getDisplayName(iou.traveler_member_id, members, memberProfiles).split(" ")[0], cover: getDisplayName(iou.cover_member_id, members, memberProfiles).split(" ")[0], defaultValue: `${getDisplayName(iou.traveler_member_id, members, memberProfiles).split(" ")[0]} owes ${getDisplayName(iou.cover_member_id, members, memberProfiles).split(" ")[0]}` }))
                        }
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {t('home.iou.for_item', { item: iou.supply_item_label, period: iou.period, defaultValue: `For ${iou.supply_item_label} — ${iou.period}` })}
                      </p>
                    </div>
                  </div>
                  {isTraveler && (
                    <button
                      onClick={() => handleSettle(iou.id)}
                      className="px-3 py-1.5 rounded-lg bg-gold text-white text-[10px] font-black uppercase tracking-wider hover:bg-gold/90 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={12} /> {t('common.settle', "Settle")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card 1 — Cleaning */}
      {cleaningEnabled && (
        <div
          className={`group rounded-2xl border p-6 transition-all duration-300 cursor-pointer
            hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]
            ${isMyTurnClean
              ? "bg-primary/5 border-primary/30 shadow-[0_0_0_3px_rgba(119,0,66,0.08)]"
              : "bg-card border-border shadow-sm hover:border-primary/20"
            }
          `}
          onClick={() => setTab("cleaning")}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧹</span>
              <h2 className="text-xl font-bold font-display text-foreground">{t('home.cleaning.title', "Cleaning")}</h2>
            </div>
            <ArrowRight
              size={18}
              className="text-muted-foreground/40 transition-all duration-300 group-hover:text-primary group-hover:translate-x-1 mt-0.5"
            />
          </div>

          <p className="text-sm font-medium text-muted-foreground">
            {t('home.cleaning.next', "Next:")}{" "}
            <span className="text-foreground font-semibold">
              {nextCleaningDate
                ? fmtDate(nextCleaningDate, { weekday: "long", month: "short", day: "numeric" })
                : "—"}
            </span>
          </p>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">
            {t('home.cleaning.responsible', "Responsible:")}{" "}
            <span className="text-foreground font-semibold">{getDisplayName(thisRotation?.memberId ?? "", members, memberProfiles)}</span>
          </p>

          {lastCleanRec && lastCleanMbr && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {t('home.cleaning.last_cleaned', { name: getDisplayName(lastCleanRec.member_id, members, memberProfiles), defaultValue: `Last cleaned by ${getDisplayName(lastCleanRec.member_id, members, memberProfiles)}` })}
              {" — "}{fmtDate(lastCleanRec.date, { month: "short", day: "numeric" })}
            </p>
          )}

          {isMyTurnClean && (
            <div className="mt-3 flex items-center gap-1.5">
              <Sparkles size={13} className="text-primary" />
              <span className="text-xs font-bold text-primary">
                {t('home.cleaning.your_turn', "Your turn to clean this week")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card 2 — Supplies */}
      <div
        className={`group rounded-2xl border p-6 transition-all duration-300 cursor-pointer
          hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]
          ${isMyTurnBuy
            ? "bg-accent/5 border-accent/30 shadow-[0_0_0_3px_rgba(212,163,115,0.06)]"
            : "bg-card border-border shadow-sm hover:border-accent/20"
          }
        `}
        onClick={() => setTab("supplies")}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h2 className="text-xl font-bold font-display text-foreground">{t('home.supplies.title', "Supplies")}</h2>
          </div>
          <ArrowRight
            size={18}
            className="text-muted-foreground/40 transition-all duration-300 group-hover:text-accent group-hover:translate-x-1 mt-0.5"
          />
        </div>

        {/* Per-item next buyers */}
        <div className="flex flex-col gap-1.5 mb-2">
          {activeSupplies.map(s => {
            const buyer    = nextBuyerByItem[s.label];
            const isMyItem = buyer?.id === user?.id;
            return (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </span>
                <span className={`text-sm font-semibold transition-colors ${
                  isMyItem ? "text-accent" : "text-foreground"
                }`}>
                  {getDisplayName(buyer?.id ?? "", members, memberProfiles)}
                  {isMyItem && (
                    <span className="ml-1 text-xs font-bold">← {t('common.you', "You")}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {lastPurchase && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-1">
            {t('home.supplies.last', "Last:")}{" "}
            <span className="font-semibold">{lastPurchase.item_name}</span>
            {" — "}{fmtDate(lastPurchase.date, { month: "short", day: "numeric" })}
          </p>
        )}

        {isMyTurnBuy && (
          <div className="mt-3 flex items-center gap-1.5">
            <Sparkles size={13} className="text-accent" />
            <span className="text-xs font-bold text-accent">
              {t('home.supplies.your_turn', { items: mySupplyItems.map(s => s.label).join(", "), defaultValue: `Your turn: ${mySupplyItems.map(s => s.label).join(", ")}` })}
            </span>
          </div>
        )}
      </div>

    </div>
  );
};

export default HomeTab;
