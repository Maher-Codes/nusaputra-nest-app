import { useState } from "react";
import { Member, Supply } from "@/lib/househub";
import { 
  X, Plane, Calendar, User, ShoppingBag, 
  CheckCircle2, ChevronRight, ChevronLeft, 
  ArrowRight, Info
} from "lucide-react";
import { houseService } from "@/services/houseService";
import { toast } from "sonner";
import Avatar from "./Avatar";
import { useTranslation } from "react-i18next";

interface TravelModeModalProps {
  isOpen:          boolean;
  onClose:         () => void;
  houseId:         string;
  currentMemberId: string;
  members:         Member[];
  activeSupplies:  Supply[];
}

export const TravelModeModal = ({
  isOpen,
  onClose,
  houseId,
  currentMemberId,
  members,
  activeSupplies,
}: TravelModeModalProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [travellerId, setTravellerId] = useState(currentMemberId);
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split("T")[0]);
  const [returnDate, setReturnDate] = useState("");
  const [supplyDecisions, setSupplyDecisions] = useState<Record<string, "skip" | "cover">>({});
  const [coverAssignments, setCoverAssignments] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const traveller = members.find(m => m.id === travellerId);

  const handleActivate = async () => {
    setIsSubmitting(true);
    try {
      await houseService.activateTravelMode(houseId, {
        house_id: houseId,
        member_id: travellerId,
        departure_date: departureDate,
        return_date: returnDate,
        status: "active",
        supply_decisions: supplyDecisions,
        cover_assignments: coverAssignments,
        created_by: currentMemberId,
      });
      toast.success(t('travel.success'));
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t('travel.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col bg-white overflow-hidden"
      style={{
        borderRadius: "20px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)",
        maxHeight: "90vh",
      }}
    >
      {/* Hero Strip */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)",
          padding: "24px 24px 52px 24px",
        }}
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
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", zIndex: 20 }}
        >
          <X size={15} color="white" />
        </button>

        {/* Title content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">✈️</span>
            <span
              className="text-lg font-display font-black tracking-tight"
              style={{ color: "#D4A373" }}
            >
              {t('travel.title')}
            </span>
          </div>
          <p className="text-white font-bold text-sm leading-snug">
            Going somewhere? We've got you covered. 🌍
          </p>
          <p className="text-white/50 text-xs font-medium mt-0.5">
            Your turns will be paused while you're away — fair and automatic.
          </p>
        </div>
      </div>

      {/* Floating plane icon overlapping the strip */}
      <div
        className="flex justify-center shrink-0 relative z-10"
        style={{ marginTop: "-28px" }}
      >
        <div
          className="p-[3px] shadow-lg"
          style={{
            background: "linear-gradient(135deg, #D4A373 0%, #f5d9a8 50%, #D4A373 100%)",
            borderRadius: "18px",
          }}
        >
          <div
            className="p-[3px] bg-white flex items-center justify-center"
            style={{ borderRadius: "15px", width: "52px", height: "52px" }}
          >
            <span style={{ fontSize: "26px" }}>✈️</span>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div
        className="overflow-y-auto px-5 py-4"
        style={{ maxHeight: "calc(90vh - 240px)" }}
      >
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <section>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">
                {t('travel.who')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setTravellerId(m.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                      travellerId === m.id 
                        ? "border-blue-500 bg-blue-500/5 text-blue-600" 
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <Avatar name={m.name} size={32} fontSize={12} radius={8} />
                    <span className="font-bold text-sm truncate">{m.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">
                {t('travel.dates')}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase ml-1">{t('travel.departure')}</p>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full bg-muted/50 border-2 border-transparent focus:border-blue-500/30 rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase ml-1">{t('travel.return')}</p>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full bg-muted/50 border-2 border-transparent focus:border-blue-500/30 rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex gap-3">
              <Info className="text-blue-500 shrink-0" size={20} />
              <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                 {t('travel.supplies_desc')}
              </p>
            </div>

            <section className="space-y-4">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                {t('travel.decisions')}
              </label>
              {activeSupplies.map(s => {
                const decision = supplyDecisions[s.id] || "skip";
                return (
                  <div key={s.id} className="p-4 rounded-2xl border border-border bg-card/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: s.bg }}>{s.icon}</div>
                      <p className="font-bold text-sm">{s.label}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSupplyDecisions(prev => ({ ...prev, [s.id]: "skip" }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                          decision === "skip" ? "bg-blue-500 border-blue-500 text-white" : "border-border text-muted-foreground hover:border-border/80"
                        }`}
                      >
                        {t('travel.skip')}
                      </button>
                      <button
                        onClick={() => setSupplyDecisions(prev => ({ ...prev, [s.id]: "cover" }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                          decision === "cover" ? "bg-gold border-gold text-white" : "border-border text-muted-foreground hover:border-border/80"
                        }`}
                      >
                        {t('travel.cover')}
                      </button>
                    </div>
                    
                    {decision === "cover" && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mb-2 ml-1">{t('travel.who_covers')}</p>
                        <div className="flex flex-wrap gap-2">
                          {members.filter(m => m.id !== travellerId).map(m => (
                            <button
                              key={m.id}
                              onClick={() => setCoverAssignments(prev => ({ ...prev, [s.id]: m.id }))}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                                coverAssignments[s.id] === m.id
                                  ? "bg-gold/10 border-gold text-gold"
                                  : "border-border text-muted-foreground hover:border-border/80"
                              }`}
                            >
                              <Avatar name={m.name} size={18} fontSize={8} radius={4} />
                              <span className="text-[11px] font-bold">{m.name.split(" ")[0]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-primary/5 rounded-3xl p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-4xl mb-4 animate-bounce">
                ✈️
              </div>
              <h3 className="text-xl font-display font-black text-foreground mb-2">{t('travel.ready')}</h3>
              <div className="space-y-1 text-sm text-muted-foreground font-medium">
                <p><span className="text-foreground font-bold">{traveller?.name}</span></p>
                <p>Departing: <span className="text-foreground font-bold">{new Date(departureDate).toDateString()}</span></p>
                <p>Returning: <span className="text-foreground font-bold">{returnDate ? new Date(returnDate).toDateString() : "TBD"}</span></p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest block ml-1">{t('travel.plan')}</p>
              <div className="grid grid-cols-1 gap-2">
                {activeSupplies.map(s => {
                  const dec = supplyDecisions[s.id] || "skip";
                  const cover = members.find(m => m.id === coverAssignments[s.id]);
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2">
                        <span>{s.icon}</span>
                        <span className="text-sm font-bold">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${dec === "cover" ? "bg-gold text-white" : "bg-blue-500 text-white"}`}>
                          {dec === "cover" ? t('travel.cover') : t('travel.skip')}
                        </span>
                        {dec === "cover" && cover && (
                          <div className="flex items-center gap-1.5">
                            <ArrowRight size={12} className="text-muted-foreground" />
                            <Avatar name={cover.name} size={20} fontSize={8} radius={5} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer action bar */}
      <div
        className="shrink-0 px-5 py-4 flex gap-3"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        {step > 1 && (
          <button
            onClick={prevStep}
            className="flex-1 px-6 py-4 rounded-2xl border-2 font-display font-bold text-sm transition-all flex items-center justify-center gap-2"
            style={{ borderColor: "rgba(119,0,66,0.25)", color: "#770042" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(119,0,66,0.08)"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
          >
            <ChevronLeft size={18} /> {t('common.back')}
          </button>
        )}
        
        {step < 3 ? (
          <button
            onClick={nextStep}
            disabled={step === 1 && (!travellerId || !departureDate || !returnDate)}
            className="flex-1 px-6 py-4 rounded-2xl text-white font-display font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale transition-all shadow-lg"
            style={{ background: "linear-gradient(135deg, #770042 0%, #5a0032 100%)" }}
          >
            {t('common.next')} <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleActivate}
            disabled={isSubmitting}
            className="flex-1 px-6 py-4 rounded-2xl text-white font-display font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
            style={{ background: "linear-gradient(135deg, #770042 0%, #5a0032 100%)" }}
          >
            {isSubmitting ? t('travel.activating') : t('travel.activate')}
          </button>
        )}
      </div>
    </div>
  );
};
