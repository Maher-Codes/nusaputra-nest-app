import { useState, useMemo, useEffect } from "react";
import { 
  Member, CleanRecord, Purchase, Supply, ActivityLog, 
  MemberMonthlyStats, TopContributor,
  calculateMemberScore, filterRecordsByPeriod, buildHouseStats, fmtDate,
  MemberProfile, getDisplayName
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
  excludedMembers: Record<string, string[]>;
  memberProfiles: Record<string, MemberProfile>;
}

const HistoryTab = ({ user, members, cleanRecs, purchases, activeSupplies, topContributor, houseId, excludedMembers, memberProfiles }: HistoryTabProps) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<"activity" | "reports">("activity");
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [expandedMember, setExpandedMember] = useState<string | null>(user?.id || null);

  // Period Navigation
  const navigatePeriod = (dir: number) => {
    const [y, m] = selectedPeriod.split("-").map(Number);
    const date = new Date(y, m - 1 + dir, 1);
    setSelectedPeriod(date.toISOString().slice(0, 7));
  };

  const isCurrentMonth = selectedPeriod === new Date().toISOString().slice(0, 7);
  const monthName = new Date(selectedPeriod + "-01").toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });

  // 📋 Activity Log Logic
  const activityLog = useMemo(() => {
    const logs: LogEntry[] = [];
    cleanRecs.forEach(r => logs.push({ type: "clean", date: r.date, member_id: r.member_id, id: r.id }));
    purchases.forEach(p => logs.push({ type: "purchase", date: p.date, member_id: p.member_id, itemName: p.item_name, id: p.id }));
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);
  }, [cleanRecs, purchases]);

  // 📊 Reports Logic
  const houseStats = useMemo(() => {
    return buildHouseStats(members, cleanRecs, purchases, activeSupplies, excludedMembers, selectedPeriod, memberProfiles);
  }, [members, cleanRecs, purchases, activeSupplies, excludedMembers, selectedPeriod, memberProfiles]);

  // 🏆 Auto-trigger Top Contributor for PREVIOUS month
  useEffect(() => {
    if (!members.length || !houseId) return;
    
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthId = prevMonthDate.toISOString().slice(0, 7);
    
    // Check if the saved top contributor is outdated or missing
    if (topContributor?.month !== prevMonthId) {
      const stats = buildHouseStats(members, cleanRecs, purchases, activeSupplies, excludedMembers, prevMonthId, memberProfiles);
      if (stats.length > 0) {
        const top = stats[0];
        const contributor: TopContributor = {
          member_id: top.memberId,
          month: prevMonthId,
          score: top.overallScore
        };
        // Auto-save to Firebase
        houseService.saveTopContributor(houseId, contributor);
      }
    }
  }, [members, cleanRecs, purchases, activeSupplies, topContributor, houseId]);

  // 📸 Export as Image
  const exportAsImage = async (stats: MemberMonthlyStats) => {
    const el = document.getElementById("report-share-card");
    if (!el) return;
    
    // Temporary show for capture
    el.style.position = "static";
    el.style.left = "0";
    el.style.zIndex = "100";
    
    try {
      // Small delay for DOM layout
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(el, { 
        backgroundColor: "#fff", 
        scale: 2,
        useCORS: true,
        logging: false
      });
      const img = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `NusaNest-Report-${stats.memberName}-${selectedPeriod}.png`;
      link.href = img;
      link.click();
      toast.success(t('history.save_png_success', "Report saved to gallery! 📸"));
    } catch (err) {
      console.error(err);
      toast.error(t('history.save_png_error', "Failed to generate image"));
    } finally {
      el.style.position = "fixed";
      el.style.left = "-1000px";
    }
  };

  const copySummary = (stats: MemberMonthlyStats) => {
    const summary = `${t('history.summary_title', "🏠 NusaNest Report")} (${monthName})\n${t('common.member', "Member")}: ${stats.memberName}\n${t('history.cleaning_stats', "Cleaning")}: ${stats.cleaning.completed}/${Math.round(stats.cleaning.expected)}\n${t('history.supplies_stats', "Supplies")}: ${stats.supplies.map(s => `${s.itemLabel} (${s.completed}/${Math.round(s.expected)})`).join(", ")}\n${t('history.overall_score', "⭐ Overall Score")}: ${stats.overallScore}%\n${t('history.rank_label', "🏆 Rank")}: #${stats.rank}`;
    navigator.clipboard.writeText(summary);
    toast.success(t('history.summary_copied', "Summary copied to clipboard! 📋"));
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
            <span className="text-[10px] font-bold text-muted-foreground/40">{t('history.records_count', { count: activityLog.length, defaultValue: `${activityLog.length} Records` })}</span>
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
        /* 📊 PERFORMANCE REPORTS */
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
            <button onClick={() => navigatePeriod(-1)} className="p-2 rounded-full hover:bg-card active:scale-90 transition-all shadow-sm">
              <ChevronLeft size={20} className="text-primary" />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50 mb-0.5">{t('history.period', "Reporting Period")}</p>
              <h3 className="font-display font-black text-lg text-primary">{monthName}</h3>
            </div>
            <button 
              onClick={() => navigatePeriod(1)} 
              className="p-2 rounded-full hover:bg-card active:scale-90 transition-all shadow-sm disabled:opacity-30" 
              disabled={isCurrentMonth}
            >
              <ChevronRight size={20} className="text-primary" />
            </button>
          </div>

          {/* House Leaderboard */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">{t('history.leaderboard', "House Leaderboard")}</h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {houseStats.map((stats, i) => {
                const isTop = i === 0;
                const isExpanded = expandedMember === stats.memberId;
                const scoreColor = stats.overallScore >= 90 ? "bg-emerald-500" : stats.overallScore >= 70 ? "bg-blue-500" : stats.overallScore >= 50 ? "bg-gold" : "bg-red-500";
                
                return (
                  <div key={stats.memberId} className={`border-b border-border/50 last:border-b-0 transition-all ${isExpanded ? "bg-muted/30" : ""}`}>
                    {/* Compact Record */}
                    <div 
                      className="p-4 flex items-center gap-4 cursor-pointer"
                      onClick={() => setExpandedMember(isExpanded ? null : stats.memberId)}
                    >
                      <div className="relative">
                        <Avatar 
                          member={members.find(m => m.id === stats.memberId)}
                          profile={memberProfiles[stats.memberId]}
                          name={stats.memberName}
                          size={40} 
                          radius={12} 
                          isTopContributor={isTop && topContributor?.month === selectedPeriod} 
                        />
                        {isTop && <Crown size={14} className="absolute -top-1.5 -left-1.5 text-gold drop-shadow-sm fill-gold" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-bold text-foreground truncate mr-2">{stats.memberName}</p>
                          <p className={`text-xs font-black ${scoreColor.replace('bg-', 'text-')}`}>{stats.overallScore}%</p>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${scoreColor} rounded-full transition-all duration-700`} style={{ width: `${stats.overallScore}%` }} />
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${isTop ? "bg-gold text-white" : "bg-muted text-muted-foreground"}`}>
                        #{stats.rank}
                      </div>
                    </div>

                    {/* Expanded Insights */}
                    {isExpanded && (
                      <div className="px-4 pb-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="bg-white dark:bg-slate-900 border border-border/50 rounded-2xl p-3 shadow-sm">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">🧹 {t('history.cleaning_stats', "Cleaning")}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-black text-foreground">{stats.cleaning.completed} / {Math.round(stats.cleaning.expected)}</span>
                              {stats.cleaning.completed >= stats.cleaning.expected ? <CheckCircle2 className="text-emerald-500" size={16} /> : <AlertCircle className="text-red-500" size={16} />}
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-1">{t('history.turns_completed', "Turns completed")}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-border/50 rounded-2xl p-3 shadow-sm">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">🛒 {t('history.shopping_stats', "Shopping")}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-black text-foreground">{stats.supplies.reduce((acc, s) => acc + s.completed, 0)} items</span>
                              {stats.supplies.every(s => !s.missed) ? <CheckCircle2 className="text-emerald-500" size={16} /> : <AlertCircle className="text-red-500" size={16} />}
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-1">{t('history.items_restocked', "Items restocked")}</p>
                          </div>
                        </div>

                        {/* Supply Breakdown */}
                        <div className="space-y-2 mb-6">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('history.supply_breakdown', "Supply Breakdown")}</p>
                          {stats.supplies.map(s => (
                            <div key={s.itemId} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-border/30">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <span>{s.itemIcon}</span>
                                <span>{s.itemLabel}</span>
                              </div>
                              <span className={`text-sm font-bold ${!s.missed ? "text-emerald-600" : "text-red-500"}`}>
                                {s.completed} / {Math.round(s.expected)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Export Actions */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => exportAsImage(stats)}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
                          >
                            <Download size={14} /> {t('history.save_png', "Save PNG")}
                          </button>
                          <button 
                            onClick={() => copySummary(stats)}
                            className="p-3 bg-card border border-border rounded-xl text-foreground hover:bg-muted active:scale-90 transition-all shadow-sm"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Empty State */}
          {houseStats.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-3xl">📭</div>
              <h4 className="font-bold text-foreground">{t('history.no_data', "No data for this month")}</h4>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">{t('history.no_data_desc', "Activity records will appear here as members clean and shop.")}</p>
            </div>
          )}
        </div>
      )}

      {/* Hidden Card for Export */}
      {expandedMember && houseStats.find(s => s.memberId === expandedMember) && (
        <div style={{ pointerEvents: 'none' }}>
          <ReportShareCard 
            stats={houseStats.find(s => s.memberId === expandedMember)!} 
            monthName={monthName}
          />
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
