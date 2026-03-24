import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Member, MemberProfile, getDisplayName } from "@/lib/househub";
import { houseService } from "@/services/houseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Globe, CheckCircle2, X } from "lucide-react";
import Avatar from "./Avatar";
import { toast } from "sonner";

interface MyProfileProps {
  member: Member;
  houseId: string;
  houseCode: string;
  totalCleans: number;
  totalPurchases: number;
  memberProfiles: Record<string, MemberProfile>;
  members: Member[];
  onBack: () => void;
}

const MyProfile = ({ member, houseId, houseCode, totalCleans, totalPurchases, memberProfiles, members, onBack }: MyProfileProps) => {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [nickname, setNickname] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [reminders, setReminders] = useState({
    cleaning: true,
    supplies: true,
    travel: true,
    reports: true,
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await houseService.getMemberProfile(houseId, member.id);
        if (data) {
          setProfile(data);
          setNickname(data.nickname || "");
          setSelectedLanguage(data.language || i18n.language);
          setReminders(data.reminders || {
            cleaning: true,
            supplies: true,
            travel: true,
            reports: true,
          });
        } else {
          setNickname(member.name.split(" ")[0]);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [houseId, member]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newProfile: MemberProfile = {
        id: member.id,
        nickname,
        language: selectedLanguage as any,
        avatar_type: "color",
        avatar_color: "#770042",
        avatar_flag: "",
        reminders,
        updated_at: new Date().toISOString(),
      };

      await houseService.saveMemberProfile(houseId, newProfile);
      setProfile(newProfile);

      if (selectedLanguage !== i18n.language) {
        i18n.changeLanguage(selectedLanguage);
      }

      toast.success(t('profile.updated'));
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-white py-16"
        style={{ borderRadius: "20px" }}
      >
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium text-sm mt-3">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-white overflow-hidden"
      style={{
        borderRadius: "20px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)",
        maxHeight: "90vh",
      }}
    >

      {/* ── Hero Strip ── */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)",
          padding: "28px 24px 60px 24px",
        }}
      >
        {/* Decorative circles for visual depth */}
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #D4A373, transparent)" }}
        />
        <div
          className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ffffff, transparent)" }}
        />

        {/* Close button */}
        <button
          onClick={onBack}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-20"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <X size={15} color="white" />
        </button>

        {/* System branding — NO personal info here */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏠</span>
            <span
              className="text-lg font-display font-black tracking-tight"
              style={{ color: "#D4A373" }}
            >
              NusaNest
            </span>
          </div>
          <p className="text-white font-black text-base leading-snug mb-1">
            Organized. Fair. Together.
          </p>
          <p className="text-white/55 text-xs font-medium leading-relaxed max-w-[280px]">
            Every turn tracked. Every housemate respected.
            A smarter way to share your home. 🤝
          </p>
        </div>
      </div>

      {/* ── Avatar — overlaps the hero, gold ring fully visible ── */}
      <div
        className="flex justify-center shrink-0 relative z-10"
        style={{ marginTop: "-44px" }}
      >
        {/* Gold gradient ring — sits OUTSIDE the strip */}
        <div
          className="p-[3px] shadow-xl"
          style={{
            background: "linear-gradient(135deg, #D4A373 0%, #f5d9a8 50%, #D4A373 100%)",
            borderRadius: "26px",
          }}
        >
          {/* White gap between ring and avatar */}
          <div
            className="p-[3px] bg-white"
            style={{ borderRadius: "23px" }}
          >
            <Avatar
              member={member}
              name={getDisplayName(member.id, members, memberProfiles)}
              size={76}
              radius={18}
              fontSize={28}
            />
          </div>
        </div>
      </div>

      {/* ── Member name below avatar ── */}
      <div className="text-center mt-2 mb-1 shrink-0 px-6">
        <h2 className="text-lg font-display font-black text-foreground tracking-tight">
          {getDisplayName(member.id, members, memberProfiles)}
        </h2>
        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
          {t('dashboard.house_code')}:
          <span className="font-black text-primary ml-1">{houseCode}</span>
        </p>
      </div>

      {/* ── Scrollable content ── */}
      <div
        className="overflow-y-auto px-5 py-3 space-y-3"
        style={{ maxHeight: "calc(90vh - 320px)" }}
      >

        {/* Activity Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          <div
            className="rounded-2xl p-4 flex flex-col items-center gap-1"
            style={{ background: "linear-gradient(135deg, #770042 0%, #5a0032 100%)" }}
          >
            <span className="text-2xl font-display font-black text-white">{totalCleans}</span>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider text-center">
              🧹 {t('profile.total_cleans')}
            </span>
          </div>
          <div
            className="rounded-2xl p-4 flex flex-col items-center gap-1"
            style={{ background: "linear-gradient(135deg, #D4A373 0%, #b8845a 100%)" }}
          >
            <span className="text-2xl font-display font-black text-white">{totalPurchases}</span>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider text-center">
              🛒 {t('profile.total_purchases')}
            </span>
          </div>
        </div>

        {/* Nickname Card */}
        <div className="bg-slate-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <User size={13} className="text-primary" />
            </div>
            <h3 className="text-[11px] font-display font-black text-primary uppercase tracking-[0.12em]">
              {t('profile.nickname')}
            </h3>
          </div>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 15))}
            placeholder={member.name}
            className="h-10 text-sm font-bold rounded-xl border-2 border-border/40 focus-visible:border-primary focus-visible:ring-0 bg-white"
          />
          <p className="text-[10px] text-muted-foreground/50 text-right font-bold uppercase tracking-wider mt-1.5">
            {nickname.length} / 15
          </p>
        </div>

        {/* Language Card */}
        <div className="bg-slate-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Globe size={13} className="text-primary" />
            </div>
            <h3 className="text-[11px] font-display font-black text-primary uppercase tracking-[0.12em]">
              {t('profile.language')}
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { code: 'en', label: 'English',         flag: '🇺🇸', sub: 'Left to Right' },
              { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩', sub: 'Kiri ke Kanan' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  selectedLanguage === lang.code
                    ? "border-primary bg-primary shadow-sm"
                    : "border-border/30 bg-white hover:border-primary/30"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold leading-tight ${
                    selectedLanguage === lang.code ? "text-white" : "text-foreground"
                  }`}>
                    {lang.label}
                  </p>
                  <p className={`text-[10px] font-medium ${
                    selectedLanguage === lang.code ? "text-white/60" : "text-muted-foreground"
                  }`}>
                    {lang.sub}
                  </p>
                </div>
                {selectedLanguage === lang.code && (
                  <CheckCircle2 size={15} className="text-white shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Reminders Card */}
        <div className="bg-slate-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bell size={13} className="text-primary" />
            </div>
            <h3 className="text-[11px] font-display font-black text-primary uppercase tracking-[0.12em]">
              {t('profile.reminders')}
            </h3>
          </div>
          <div className="space-y-0.5">
            {[
              { key: 'cleaning', emoji: '🧹', label: t('profile.cleaning_reminders') },
              { key: 'supplies', emoji: '🛒', label: t('profile.supplies_reminders') },
              { key: 'travel',   emoji: '✈️', label: t('profile.travel_alerts') },
              { key: 'reports',  emoji: '🚨', label: t('profile.report_notifications') },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between px-2 py-2.5 rounded-xl hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{item.emoji}</span>
                  <span className="text-sm font-semibold text-foreground/80">{item.label}</span>
                </div>
                <Switch
                  checked={(reminders as any)[item.key]}
                  onCheckedChange={(val) =>
                    setReminders(prev => ({ ...prev, [item.key]: val }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-1.5 pt-1 pb-2">
          <img
            src="/nusa-putra-logo.png"
            alt="Nusa Putra"
            className="h-5 w-auto"
          />
          <p className="text-[9px] text-center uppercase font-black tracking-[0.18em]" style={{ color: "#770042", opacity: 0.6 }}>
            NusaNest v1.2 · Universitas Nusa Putra
          </p>
        </div>

      </div>

      {/* ── Save Bar — Cancel and Save on same line ── */}
      <div
        className="shrink-0 px-5 py-4 flex gap-3"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <Button
          variant="outline"
          size="lg"
          onClick={onBack}
          className="flex-1 h-11 rounded-2xl font-display font-bold text-sm border-2"
        >
          {t('common.cancel')}
        </Button>
        <Button
          size="lg"
          disabled={isSaving}
          onClick={handleSave}
          className="flex-[2] h-11 rounded-2xl font-display font-black text-sm shadow-md"
          style={{
            background: isSaving
              ? undefined
              : "linear-gradient(135deg, #770042 0%, #5a0032 100%)",
          }}
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </div>

    </div>
  );
};

export default MyProfile;
