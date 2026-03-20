import { useState, useMemo, useEffect } from "react";
import { 
  Member, CleanRecord, Purchase, Supply, ActivityLog, 
  MemberMonthlyStats, TopContributor,
  calculateMemberScore, filterRecordsByPeriod, buildHouseStats, fmtDate,
  MemberProfile, getDisplayName, House
} from "@/lib/househub";
import { 
  History, BarChart3, ChevronLeft, ChevronRight, 
  Crown, Share2, Download, Copy, CheckCircle2, 
  AlertCircle, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import Avatar from "./Avatar";
import ReportShareCard from "./ReportShareCard";
import { houseService } from "@/services/houseService";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

interface LogEntry {
  id: string;
  type: "clean" | "purchase";
  date: string;
  member_id: string;
  itemName?: string;
}

interface HistoryTabProps {
  user: Member | null;
  members: Member[];
  cleanRecs: CleanRecord[];
  purchases: Purchase[];
  activeSupplies: Supply[];
  topContributor: TopContributor | null;
  houseId: string;
  house: House;
  excludedMembers: Record<string, string[]>;
  memberProfiles: Record<string, MemberProfile>;
}

const HistoryTab = ({ user, members, cleanRecs, purchases, activeSupplies, topContributor, houseId, house, excludedMembers, memberProfiles }: HistoryTabProps) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<"activity" | "reports">("activity");
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [reportType, setReportType] = useState<"weekly" | "monthly">("monthly");
  const [isExporting, setIsExporting] = useState(false);

  // Period Navigation
  const navigatePeriod = (dir: number) => {
    const [y, m] = selectedPeriod.split("-").map(Number);
    const date = new Date(y, m - 1 + dir, 1);
    setSelectedPeriod(date.toISOString().slice(0, 7));
  };

  const isCurrentMonth = selectedPeriod === new Date().toISOString().slice(0, 7);
  
  // 📋 Activity Log Logic — Latest per item
  const activityLog = useMemo(() => {
    const logs: LogEntry[] = [];

    // Latest clean only
    if (cleanRecs.length > 0) {
      const latestClean = [...cleanRecs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      logs.push({
        type: "clean",
        date: latestClean.date,
        member_id: latestClean.member_id,
        id: latestClean.id,
      });
    }

    // Latest purchase per supply item
    const seenItems = new Set<string>();
    const sortedPurchases = [...purchases].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    for (const p of sortedPurchases) {
      if (!seenItems.has(p.item_name)) {
        seenItems.add(p.item_name);
        logs.push({
          type: "purchase",
          date: p.date,
          member_id: p.member_id,
          itemName: p.item_name,
          id: p.id,
        });
      }
    }

    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cleanRecs, purchases]);

  // 📊 Reports Logic
  const houseCreatedMonth = useMemo(() => {
    return house.created_at.slice(0, 7);
  }, [house.created_at]);

  const currentMonth = new Date().toISOString().slice(0, 7);

  type PeriodStatus = "future" | "before_start" | "current" | "has_data" | "no_data";

  const periodStatus = useMemo((): PeriodStatus => {
    if (selectedPeriod > currentMonth) return "future";
    if (selectedPeriod < houseCreatedMonth) return "before_start";
    if (selectedPeriod === currentMonth) return "current";
    const hasCleans = cleanRecs.some(r => r.date.startsWith(selectedPeriod));
    const hasPurchases = purchases.some(p => p.date.startsWith(selectedPeriod));
    return hasCleans || hasPurchases ? "has_data" : "no_data";
  }, [selectedPeriod, currentMonth, houseCreatedMonth, cleanRecs, purchases]);

  const weekRange = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      start: startOfWeek.toISOString().slice(0, 10),
      end: endOfWeek.toISOString().slice(0, 10),
      label: `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };
  }, []);

  const filteredCleans = useMemo(() => {
    if (reportType === "weekly") {
      return cleanRecs.filter(r => r.date >= weekRange.start && r.date <= weekRange.end);
    }
    return cleanRecs.filter(r => r.date.startsWith(selectedPeriod));
  }, [cleanRecs, reportType, selectedPeriod, weekRange]);

  const filteredPurchases = useMemo(() => {
    if (reportType === "weekly") {
      return purchases.filter(p => p.date >= weekRange.start && p.date <= weekRange.end);
    }
    return purchases.filter(p => p.date.startsWith(selectedPeriod));
  }, [purchases, reportType, selectedPeriod, weekRange]);

  const periodLabel = useMemo(() => {
    if (reportType === "weekly") return weekRange.label;
    const [y, m] = selectedPeriod.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedPeriod, reportType, weekRange]);

  // 🏆 Auto-trigger Top Contributor for PREVIOUS month
  useEffect(() => {
    if (!members.length || !houseId) return;
    
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthId = prevMonthDate.toISOString().slice(0, 7);
    
    if (topContributor?.month !== prevMonthId) {
      const stats = buildHouseStats(members, cleanRecs, purchases, activeSupplies, excludedMembers, prevMonthId, memberProfiles);
      if (stats.length > 0) {
        const top = stats[0];
        const contributor: TopContributor = {
          member_id: top.memberId,
          month: prevMonthId,
          score: top.overallScore
        };
        houseService.saveTopContributor(houseId, contributor);
      }
    }
  }, [members, cleanRecs, purchases, activeSupplies, topContributor, houseId]);

  // 📸 Export as Image
  const exportAsImage = async () => {
    const el = document.getElementById("report-share-card");
    if (!el) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
        logging: false,
        width: 380,
        windowWidth: 380,
      } as any);
      const img = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `NusaNest-Report.png`;
      link.href = img;
      link.click();
      toast.success("Report saved! 📸");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save image.");
    } finally {
      setIsExporting(false);
    }
  };

  // 📤 Share Report (Copy Summary to Clipboard)
  const shareReport = async () => {
    const lines: string[] = [];
    lines.push(`🏠 ${house.name.toUpperCase()} — ${periodLabel} Report`);
    lines.push(`Generated by NusaNest\n`);
    lines.push(`🧹 Cleaning:`);
    filteredCleans.forEach(r => {
      const name = getDisplayName(r.member_id, members, memberProfiles);
      lines.push(`  ✓ ${name} — ${new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    });
    activeSupplies.forEach(supply => {
      lines.push(`\n${supply.icon} ${supply.label}:`);
      filteredPurchases
        .filter(p => p.item_name === supply.label)
        .forEach(p => {
          const name = getDisplayName(p.member_id, members, memberProfiles);
          lines.push(`  ✓ ${name} — ${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        });
    });
    lines.push(`\nNusaNest · Universitas Nusa Putra`);
    await navigator.clipboard.writeText(lines.join('\n'));
    toast.success("Report copied to clipboard! 📋");
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Switcher */}
      <div className="flex bg-muted/30 p-1.5 rounded-2xl gap-1">
        <button
          onClick={() => setActiveSubTab("activity")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all font-bold text-sm ${
            activeSubTab === "activity" ? "bg-card shadow-md text-primary" : "text-muted-foreground hover:bg-card/50"
          }`}
        >
          <History size={16} /> {t('history.activity', "Activity")}
        </button>
        <button
          onClick={() => setActiveSubTab("reports")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all font-bold text-sm ${
            activeSubTab === "reports" ? "bg-card shadow-md text-primary" : "text-muted-foreground hover:bg-card/50"
          }`}
        >
          <BarChart3 size={16} /> {t('history.reports', "Reports")}
        </button>
      </div>

      {activeSubTab === "activity" ? (
        /* 📋 ACTIVITY LOG */
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('history.recent_activity', "Recent Activity")}</h2>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Latest Activity
            </span>
          </div>
          <div className="space-y-3">
            {activityLog.map((log, i) => {
              const mbr = members.find(m => m.id === log.member_id);
              return (
                <div key={log.id} className="bg-card border border-border shadow-sm rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 20}ms` }}>
                  <Avatar member={mbr} profile={memberProfiles[log.member_id]} name={getDisplayName(log.member_id, members, memberProfiles)} size={36} radius={10} fontSize={14} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground leading-tight">
                      {getDisplayName(log.member_id, members, memberProfiles).split(" ")[0]} 
                      <span className="text-muted-foreground font-medium ml-1">
                        {log.type === "clean" ? t('history.cleaned_house', "cleaned the house 🧹") : t('history.bought_item', { item: log.itemName, defaultValue: `bought ${log.itemName} 🛒` })}
                      </span>
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-1">
                      {fmtDate(log.date, { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })}
            {activityLog.length === 0 && (
              <div className="py-12 text-center opacity-50">
                <p className="text-sm font-medium">{t('history.no_activity', "No activity yet")}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Reports Sub-tab ── */
        <div className="flex flex-col gap-4">

          {/* Report Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            {(["monthly", "weekly"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
                style={{
                  backgroundColor: reportType === type ? "#770042" : "transparent",
                  color: reportType === type ? "white" : "#64748b",
                }}
              >
                {type === "monthly" ? "📆 Monthly" : "📅 Weekly"}
              </button>
            ))}
          </div>

          {/* Period Navigator — only show for monthly */}
          {reportType === "monthly" && (
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => navigatePeriod(-1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-primary/10"
                style={{ color: "#770042" }}
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <p className="font-display font-black text-base text-foreground">{periodLabel}</p>
                {periodStatus === "current" && (
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Current Period</p>
                )}
              </div>
              <button
                onClick={() => navigatePeriod(1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-primary/10"
                style={{ color: "#770042" }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Weekly period label */}
          {reportType === "weekly" && (
            <div className="text-center">
              <p className="font-display font-black text-base text-foreground">{periodLabel}</p>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">This Week</p>
            </div>
          )}

          {/* Smart period status messages */}
          {reportType === "monthly" && periodStatus === "future" && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 px-4">
              <span className="text-4xl">🔮</span>
              <p className="font-display font-black text-lg text-foreground">Not yet!</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This period hasn't started yet. Come back when we get there — NusaNest will have everything ready for you. 📅
              </p>
            </div>
          )}

          {reportType === "monthly" && periodStatus === "before_start" && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 px-4">
              <span className="text-4xl">📖</span>
              <p className="font-display font-black text-lg text-foreground">Before NusaNest</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your house joined NusaNest in{" "}
                <span className="font-bold text-primary">
                  {new Date(houseCreatedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                . There are no records before that date — this is where your story begins. 🏠
              </p>
            </div>
          )}

          {reportType === "monthly" && periodStatus === "no_data" && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 px-4">
              <span className="text-4xl">😴</span>
              <p className="font-display font-black text-lg text-foreground">Quiet month</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No cleaning or supply activity was recorded during this period. Nothing wrong — sometimes months are just quiet!
              </p>
            </div>
          )}

          {/* Report content — show when data exists or current period */}
          {(periodStatus === "has_data" || periodStatus === "current" || reportType === "weekly") && (
            <div className="flex flex-col gap-4">

              {/* ── Visible Report Card Preview ── */}
              <div
                className="rounded-2xl overflow-hidden shadow-lg"
                style={{ border: "1px solid rgba(119,0,66,0.15)" }}
              >
                {/* Card Header */}
                <div
                  className="relative overflow-hidden px-5 py-5"
                  style={{ background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)" }}
                >
                  <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, #D4A373, transparent)" }} />
                  <div className="absolute -bottom-3 -left-3 w-16 h-16 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, #ffffff, transparent)" }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🏠</span>
                      <span className="font-display font-black text-base" style={{ color: "#D4A373" }}>
                        NusaNest
                      </span>
                    </div>
                    <p className="text-white font-black text-sm">{house.name.toUpperCase()}</p>
                    <p className="text-white/50 text-[11px] font-medium mt-0.5">
                      {reportType === "weekly" ? "📅 Weekly" : "📆 Monthly"} · {periodLabel}
                    </p>
                  </div>
                </div>

                {/* Members Summary */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  borderBottom: "1px solid #f1f5f9",
                  backgroundColor: "#fafafa",
                  justifyItems: "center",
                }}>
                  {members.map((m, idx) => {
                    const memberCleans = filteredCleans.filter(r => r.member_id === m.id).length;
                    const memberPurchases = filteredPurchases.filter(p => p.member_id === m.id).length;
                    const displayName = getDisplayName(m.id, members, memberProfiles);
                    return (
                      <div key={m.id} style={{
                        padding: "12px 14px",
                        borderRight: idx < members.length - 1 ? "1px solid #f1f5f9" : "none",
                        width: "100%",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}>
                        <p style={{ fontWeight: 800, fontSize: "12px", color: "#770042", margin: 0, whiteSpace: "nowrap" }}>
                          {displayName}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <p style={{ fontWeight: 700, fontSize: "12px", color: "#94a3b8", margin: 0 }}>→</p>
                          <p style={{ fontWeight: 700, fontSize: "12px", color: "#94a3b8", margin: 0 }}>→</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <p style={{ fontSize: "11px", fontWeight: 600, color: "#770042", margin: 0 }}>Cleaned: {memberCleans}</p>
                          <p style={{ fontSize: "11px", fontWeight: 600, color: "#b8845a", margin: 0 }}>Bought: {memberPurchases}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cleaning */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">🧹 Cleaning</p>
                  {filteredCleans.length > 0 ? (
                    filteredCleans
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(r => (
                        <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                          <span className="text-green-500 text-xs">✓</span>
                          <p className="text-xs font-semibold text-foreground flex-1">
                            <span className="font-bold text-primary">
                              {getDisplayName(r.member_id, members, memberProfiles)}
                            </span> cleaned the house
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No cleaning this period</p>
                  )}
                </div>

                {/* Supply sections */}
                {activeSupplies.map((supply, idx) => {
                  const supplyPurchases = filteredPurchases
                    .filter(p => p.item_name === supply.label)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  return (
                    <div key={supply.id} className={`px-4 py-3 ${idx < activeSupplies.length - 1 ? "border-b border-slate-100" : ""}`}>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">
                        {supply.icon} {supply.label}
                      </p>
                      {supplyPurchases.length > 0 ? (
                        supplyPurchases.map(p => (
                          <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                            <span className="text-green-500 text-xs">✓</span>
                            <p className="text-xs font-semibold text-foreground flex-1">
                              <span className="font-bold text-primary">
                                {getDisplayName(p.member_id, members, memberProfiles)}
                              </span> bought {supply.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No purchases this period</p>
                      )}
                    </div>
                  );
                })}

                {/* Card footer */}
                <div
                  className="px-5 py-3 flex items-center justify-between"
                  style={{ background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)" }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Generated by NusaNest
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#D4A373" }}>
                    Universitas Nusa Putra
                  </p>
                </div>
              </div>

              {/* ── Save & Share Buttons ── */}
              <div className="flex gap-3">
                <button
                  onClick={exportAsImage}
                  disabled={isExporting}
                  className="flex-1 h-12 rounded-2xl font-display font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #770042 0%, #5a0032 100%)" }}
                >
                  {isExporting ? (
                    <span className="animate-pulse">Generating...</span>
                  ) : (
                    <>📸 Save as Image</>
                  )}
                </button>
                <button
                  onClick={shareReport}
                  disabled={isExporting}
                  className="flex-1 h-12 rounded-2xl font-display font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 border-2"
                  style={{ borderColor: "rgba(119,0,66,0.25)", color: "#770042" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(119,0,66,0.06)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                >
                  📤 Share
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Hidden card for image capture — always rendered when report is visible */}
      {(periodStatus === "has_data" || periodStatus === "current" || reportType === "weekly") && (
        <div style={{ position: "absolute", top: 0, left: 0, width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}>
          <ReportShareCard
            house={house}
            members={members}
            cleanRecs={filteredCleans}
            purchases={filteredPurchases}
            activeSupplies={activeSupplies}
            memberProfiles={memberProfiles}
            periodLabel={periodLabel}
            reportType={reportType}
          />
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
