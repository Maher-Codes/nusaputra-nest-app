import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Member, avatarColor, Report } from "@/lib/househub";
import { houseService } from "@/services/houseService";
import { 
  ChevronLeft, 
  ChevronRight,
  X,
  AlertTriangle,
  Info,
  Camera,
  Handshake,
  CheckCircle2,
  Loader2,
  User,
  Trash2,
  Package,
  UserCircle,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  ShieldAlert,
  FileText,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  houseId: string;
  currentMemberId: string;
  members: Member[];
}

type IssueType = "cleaning" | "supplies" | "behavior" | "other";
type Severity = "minor" | "moderate" | "serious";
type Duration = "once" | "few_times" | "ongoing";

const ISSUE_TYPES: { id: IssueType; nameKey: string; icon: any; emoji: string }[] = [
  { id: "cleaning", nameKey: "report.types.cleaning", icon: Sparkles, emoji: "🧹" },
  { id: "supplies", nameKey: "report.types.supplies", icon: ShoppingBag, emoji: "🛒" },
  { id: "behavior", nameKey: "report.types.behavior", icon: ShieldAlert, emoji: "😤" },
  { id: "other", nameKey: "report.types.other", icon: FileText, emoji: "📝" },
];

const SEVERITIES: { id: Severity; nameKey: string; emoji: string; color: string }[] = [
  { id: "minor", nameKey: "report.severities.minor", emoji: "🟡", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { id: "moderate", nameKey: "report.severities.moderate", emoji: "🟠", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  { id: "serious", nameKey: "report.severities.serious", emoji: "🔴", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
];

const DURATIONS: { id: Duration; nameKey: string }[] = [
  { id: "once", nameKey: "report.durations.once" },
  { id: "few_times", nameKey: "report.durations.few_times" },
  { id: "ongoing", nameKey: "report.durations.ongoing" },
];

export const ReportModal = ({ isOpen, onClose, houseId, currentMemberId, members }: ReportModalProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for next, -1 for back

  // Form state
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [reportedMemberId, setReportedMemberId] = useState<string | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [description, setDescription] = useState("");
  const [coSignerRequests, setCoSignerRequests] = useState<string[]>([]);

  const otherMembers = useMemo(() => 
    members.filter(m => m.id !== currentMemberId), 
  [members, currentMemberId]);

  const coSignCandidates = useMemo(() => 
    members.filter(m => m.id !== currentMemberId && m.id !== reportedMemberId),
  [members, currentMemberId, reportedMemberId]);

  const nextStep = () => {
    setDirection(1);
    setStep(s => s + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (!issueType || !reportedMemberId || !severity || !duration) return;

    setLoading(true);
    try {
      const report: Omit<Report, "id" | "created_at" | "reference_number"> = {
        house_id: houseId,
        reporter_member_id: currentMemberId,
        reported_member_id: reportedMemberId,
        issue_type: issueType,
        severity: severity,
        description: description.trim(),
        duration: duration,
        co_signers: [], // Always empty on creation
        co_signer_requests: coSignerRequests,
        status: "pending",
        university_response: "",
      };

      const refNum = await houseService.submitReport(houseId, report);
      toast.success(t('report.success', { ref: refNum }));
      onClose();
      // Reset form
      setStep(1);
      setIssueType(null);
      setReportedMemberId(null);
      setSeverity(null);
      setDuration(null);
      setDescription("");
      setCoSignerRequests([]);
    } catch (err) {
      console.error(err);
      toast.error(t('report.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast(t('report.skip_toast'));
    onClose();
  };

  const canProceedStep2 = reportedMemberId && severity && duration;

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

        {/* Step progress dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: step === s ? "16px" : "6px",
                height: "6px",
                backgroundColor: step >= s ? "#D4A373" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>

        {/* Title content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">🚨</span>
            <span
              className="text-lg font-display font-black tracking-tight"
              style={{ color: "#D4A373" }}
            >
              {t('report.title') || "Report A Problem"}
            </span>
          </div>
          <p className="text-white font-bold text-sm leading-snug">
            {step === 1 && t('report.step_1')}
            {step === 2 && t('report.step_2')}
            {step === 3 && t('report.step_3')}
            {step === 4 && t('report.step_4')}
            {step === 5 && t('report.step_5')}
          </p>
          <p className="text-white/50 text-xs font-medium mt-0.5">
            Anonymous. Safe. Your identity is never revealed. 🤝
          </p>
        </div>
      </div>

      {/* Floating alert icon overlapping the strip */}
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
            <span style={{ fontSize: "26px" }}>🚨</span>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div 
        className="flex-1 overflow-y-auto px-6 py-6"
        style={{ maxHeight: "calc(90vh - 240px)" }}
      >
        {/* Step 1: Issue Type */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
            {ISSUE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => { setIssueType(type.id); nextStep(); }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                  {type.emoji}
                </div>
                <span className="font-bold text-foreground">{t(type.nameKey)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">{t('report.which_housemate')}</h4>
              <div className="grid grid-cols-3 gap-2">
                {otherMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setReportedMemberId(m.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                      reportedMemberId === m.id 
                        ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
                        : "border-border hover:border-primary/20 hover:bg-muted"
                    )}
                  >
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                      <AvatarFallback style={{ backgroundColor: avatarColor(m.name), color: "#fff" }}>
                        {m.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-bold text-center line-clamp-1">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">{t('report.severity_label')}</h4>
              <div className="flex flex-wrap gap-2">
                {SEVERITIES.map((sev) => (
                  <button
                    key={sev.id}
                    onClick={() => setSeverity(sev.id)}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-xs font-bold transition-all border-2",
                      severity === sev.id 
                        ? cn("border-primary bg-primary text-primary-foreground shadow-md scale-105") 
                        : "border-border text-muted-foreground hover:border-primary/20"
                    )}
                  >
                    {sev.emoji} {t(sev.nameKey)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">{t('report.duration_label')}</h4>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((dur) => (
                  <button
                    key={dur.id}
                    onClick={() => setDuration(dur.id)}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-xs font-bold transition-all border-2",
                      duration === dur.id 
                        ? "border-primary bg-primary text-primary-foreground shadow-md scale-105" 
                        : "border-border text-muted-foreground hover:border-primary/20"
                    )}
                  >
                    {t(dur.nameKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Description */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <p className="text-muted-foreground text-sm font-medium">{t('report.optional_desc')}</p>
            <div className="relative">
               <Textarea
                placeholder={t('report.placeholder_desc')}
                className="min-h-[160px] rounded-2xl border-2 border-border p-4 focus-visible:ring-primary/20 resize-none font-medium"
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="absolute bottom-3 right-4 text-[10px] font-bold text-muted-foreground">
                {description.length} / 200
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Solidarity Check */}
         {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <p className="text-muted-foreground text-sm font-medium">
              {t('report.cosign_desc')}
            </p>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {coSignCandidates.map((m) => (
                <div 
                  key={m.id}
                  onClick={() => {
                    if (coSignerRequests.includes(m.id)) {
                      setCoSignerRequests(prev => prev.filter(id => id !== m.id));
                    } else {
                      setCoSignerRequests(prev => [...prev, m.id]);
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                    coSignerRequests.includes(m.id) 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-primary/20 hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback style={{ backgroundColor: avatarColor(m.name), color: "#fff" }}>
                        {m.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-foreground text-sm">{m.name}</span>
                  </div>
                  <Checkbox 
                    checked={coSignerRequests.includes(m.id)}
                    className="rounded-full h-6 w-6 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              ))}
               {coSignCandidates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User size={40} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">{t('report.no_candidates')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Resolution Reminder */}
        {step === 5 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-primary/5 border-2 border-primary/20 rounded-3xl p-6 text-center shadow-inner">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle className="text-primary" size={32} />
              </div>
              <p className="text-foreground font-medium leading-relaxed italic text-sm">
                {t('report.resolution_reminder')}
              </p>
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
            disabled={loading}
            className="flex-1 h-11 rounded-2xl border-2 font-display font-bold text-sm transition-all flex items-center justify-center gap-2"
            style={{ borderColor: "rgba(119,0,66,0.25)", color: "#770042" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(119,0,66,0.08)"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
          >
            <ChevronLeft size={18} /> {t('common.back')}
          </button>
        )}
        
        {step < 5 ? (
          <button 
            className="flex-[2] h-11 rounded-2xl text-white font-display font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #770042 0%, #5a0032 100%)" }}
            disabled={step === 2 && !canProceedStep2}
            onClick={nextStep}
          >
            {t('common.next')} <ChevronRight size={18} />
          </button>
        ) : (
          <button 
            className="flex-[2] h-11 rounded-2xl text-white font-display font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #770042 0%, #5a0032 100%)" }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                <span>{t('report.submitting')}</span>
              </div>
            ) : (
              t('report.submit_btn')
            )}
          </button>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};
