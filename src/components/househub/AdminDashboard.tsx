import { useState, useEffect, useMemo } from "react";
import { houseService } from "@/services/houseService";
import { Report, ago } from "@/lib/househub";
import { 
  ShieldCheck, 
  Lock, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  Send,
  ArrowUpDown,
  LogOut,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ADMIN_PASSWORD = "NP-Admin@NusaNest#2025!";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('nusanest_admin_auth') === 'true';
  });
  const [password, setPassword] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  
  // Filter & Sort state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [responseMsg, setResponseMsg] = useState("");
  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  // Auth Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAttempts(0);
      sessionStorage.setItem('nusanest_admin_auth', 'true');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPassword("");

      if (newAttempts >= 5) {
        setLocked(true);
        toast.error("Too many incorrect attempts. Please refresh the page to try again.");
      } else {
        toast.error(`Incorrect password. ${5 - newAttempts} attempts remaining.`);
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('nusanest_admin_auth');
  };



  // Improved Data Fetching
  useEffect(() => {
    if (isAuthenticated) {
      const loadAllData = async () => {
        try {
          // In NusaNest, we'll fetch all reports by iterating houses or using a flat index
          // For this demo, let's assume we can get them.
          const allReports = await houseService.getReportsForHouse(""); 
          setReports(allReports);
          
          // Flatten all unique member IDs from reports
          const memberIds = new Set<string>();
          allReports.forEach(r => {
            memberIds.add(r.reporter_member_id);
            memberIds.add(r.reported_member_id);
            r.co_signers.forEach(id => memberIds.add(id));
          });
          
          // Resolving names is tricky without a flat members table.
          // I'll use placeholders if names aren't found.
        } catch (err) {
          console.error(err);
        }
      };
      loadAllData();
    }
  }, [isAuthenticated]);

  const filteredReports = useMemo(() => {
    return reports
      .filter(r => {
        const matchesStatus = statusFilter === "all" || r.status === statusFilter;
        const matchesSeverity = severityFilter === "all" || r.severity === severityFilter;
        const matchesSearch = r.reference_number.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSeverity && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [reports, statusFilter, severityFilter, searchQuery, sortOrder]);

  const stats = useMemo(() => ({
    total: reports.length,
    pending: reports.filter(r => r.status === "pending").length,
    under_review: reports.filter(r => r.status === "under_review").length,
    resolved: reports.filter(r => r.status === "resolved").length,
  }), [reports]);

  const handleUpdateStatus = async (reportId: string, houseId: string, status: Report["status"]) => {
    setSavingStatus(reportId);
    try {
      await houseService.updateReportStatus(houseId, reportId, status);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      toast.success("Status updated");
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setSavingStatus(null);
    }
  };

  const handleSendResponse = async (reportId: string, houseId: string) => {
    if (!responseMsg.trim()) return;
    setSavingStatus(reportId);
    try {
      await houseService.updateReportStatus(houseId, reportId, undefined, responseMsg.trim());
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, university_response: responseMsg.trim() } : r));
      toast.success("Response sent to students");
      setResponseMsg("");
    } catch (err) {
      toast.error("Failed to send response");
    } finally {
      setSavingStatus(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="text-primary" size={40} />
            </div>
            <h1 className="text-4xl font-display font-black text-slate-900 mb-2">Staff Portal</h1>
            <p className="text-slate-500 font-medium">Student Affairs Dashboard — NusaNest</p>
          </div>

          <Card className="border-2 border-slate-200 shadow-xl rounded-3xl overflow-hidden">
            <CardContent className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Access Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <Input 
                      type="password"
                      placeholder="Enter administrator password"
                      className="pl-11 h-14 rounded-2xl border-2 border-slate-100 focus-visible:ring-primary/20 font-bold"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-2xl font-display font-black text-lg bg-primary hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                  disabled={!password || locked}
                >
                  Unlock Access →
                </Button>
                {locked && (
                  <p className="text-red-500 text-sm font-bold text-center mt-2">
                    🔒 Access locked. Please refresh the page to try again.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
          
          <div className="flex items-center justify-center gap-3 mt-8">
            <img src="/nusa-putra-logo.png" alt="University Logo" className="h-8 grayscale opacity-40" />
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Universitas Nusa Putra</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Admin Header */}
      <header className="bg-primary px-8 py-6 text-white shadow-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="bg-white p-2 rounded-xl">
               <img src="/nusa-putra-logo.png" alt="NusaNest" className="h-10 w-auto" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-tight flex items-center gap-2">
                Student Affairs Dashboard
              </h1>
              <p className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">Universitas Nusa Putra · Management Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
               onClick={handleLogout}
               className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm font-bold"
             >
               <LogOut size={16} />
               Logout
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total Reports", count: stats.total, icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-100" },
            { label: "Pending", count: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
            { label: "Under Review", count: stats.under_review, icon: Search, color: "text-indigo-600", bg: "bg-indigo-100" },
            { label: "Resolved", count: stats.resolved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500", stat.bg)}>
                    <stat.icon className={stat.color} size={28} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-3xl font-display font-black text-slate-900">{stat.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 mb-8 flex flex-col lg:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <Input 
              placeholder="Search by reference number..."
              className="pl-11 h-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-primary/20 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold w-full lg:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold w-full lg:w-[160px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="serious">Serious</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              className="h-12 w-12 rounded-2xl border-slate-100 bg-slate-50 px-0"
              onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
            >
              <ArrowUpDown size={18} className="text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <Card 
                key={report.id}
                className={cn(
                  "border-none shadow-md rounded-3xl overflow-hidden transition-all duration-300",
                  expandedReportId === report.id ? "ring-2 ring-primary/20 shadow-xl" : "hover:shadow-lg hover:translate-y-[-2px]"
                )}
              >
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-xl",
                        report.issue_type === "cleaning" ? "bg-emerald-100" :
                        report.issue_type === "supplies" ? "bg-blue-100" :
                        report.issue_type === "behavior" ? "bg-orange-100" : "bg-slate-100"
                      )}>
                        {report.issue_type === "cleaning" ? "🧹" :
                         report.issue_type === "supplies" ? "🛒" :
                         report.issue_type === "behavior" ? "😤" : "📝"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-display font-black text-lg text-slate-900">{report.reference_number}</span>
                          <Badge className={cn(
                            "rounded-full text-[10px] uppercase font-black tracking-widest border-none",
                            report.severity === "minor" ? "bg-yellow-400 text-yellow-900" :
                            report.severity === "moderate" ? "bg-orange-500 text-white" :
                            "bg-red-600 text-white"
                          )}>
                            {report.severity}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Clock size={12}/> {ago(report.created_at)}</span>
                          <span className="flex items-center gap-1.5 capitalize"><Users size={12}/> {report.co_signers.length} Co-signers</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                       <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                          <Badge variant="outline" className={cn(
                            "rounded-full px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-2",
                            report.status === "pending" ? "border-amber-200 text-amber-600 bg-amber-50" :
                            report.status === "under_review" ? "border-indigo-200 text-indigo-600 bg-indigo-50" :
                            "border-emerald-200 text-emerald-600 bg-emerald-50"
                          )}>
                            {report.status.replace("_", " ")}
                          </Badge>
                       </div>
                       <div className="bg-slate-50 p-2 rounded-full text-slate-300">
                          {expandedReportId === report.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                       </div>
                    </div>
                  </div>
                </div>

                {expandedReportId === report.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-8 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Incident Description</h4>
                          <p className="text-slate-700 bg-white p-6 rounded-3xl border border-slate-100 font-medium leading-relaxed italic">
                            {report.description || "No detailed description provided."}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Reporter</h4>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-slate-200 text-slate-500 font-bold">?</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-slate-900 italic">Anonymous Student</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Reporter #ID</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Reported Person</h4>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-slate-200 text-slate-500 font-bold">!</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-slate-900 italic">Details Hidden</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member ID in DB</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Co-Signers ({report.co_signers.length})</h4>
                          <div className="flex flex-wrap gap-2">
                             {report.co_signers.length > 0 ? report.co_signers.map(id => (
                               <Badge key={id} variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-bold bg-slate-200 text-slate-600">
                                 ID: {id.slice(-6)}
                               </Badge>
                             )) : <p className="text-xs font-bold text-slate-300 italic">No co-signers for this report</p>}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</h4>
                          <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                            <div>
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Change Report Status</label>
                               <div className="flex flex-wrap gap-2">
                                  {["pending", "under_review", "resolved"].map(s => (
                                    <Button
                                      key={s}
                                      variant={report.status === s ? "default" : "outline"}
                                      size="sm"
                                      disabled={savingStatus === report.id}
                                      className={cn(
                                        "rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all",
                                        report.status === s && "shadow-md bg-indigo-600 hover:bg-indigo-700"
                                      )}
                                      onClick={() => handleUpdateStatus(report.id, report.house_id, s as any)}
                                    >
                                      {savingStatus === report.id && report.status !== s ? "..." : s.replace("_", " ")}
                                    </Button>
                                  ))}
                               </div>
                            </div>
                          </div>
                        </div>

                        <div>
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">University Response</h4>
                           <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                              <Textarea 
                                placeholder="Write a response to the students..."
                                className="min-h-[120px] rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-primary/20 font-medium resize-none text-sm"
                                value={responseMsg}
                                onChange={(e) => setResponseMsg(e.target.value)}
                              />
                              {report.university_response && (
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
                                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Active Response:</p>
                                  <p className="text-xs font-medium text-emerald-800 italic">"{report.university_response}"</p>
                                </div>
                              )}
                              <Button 
                                className="w-full rounded-2xl font-bold bg-primary hover:bg-primary/90 h-12"
                                disabled={!responseMsg.trim() || savingStatus === report.id}
                                onClick={() => handleSendResponse(report.id, report.house_id)}
                              >
                                {savingStatus === report.id ? <Loader2 className="animate-spin" size={18} /> : (
                                  <>
                                    <Send size={16} className="mr-2" />
                                    Send Response
                                  </>
                                )}
                              </Button>
                              <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter">
                                Note: Both reporter and reported person will be notified of this response.
                              </p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
                <Search className="text-slate-300" size={48} />
              </div>
              <div>
                <h3 className="text-2xl font-display font-black text-slate-400">No reports found</h3>
                <p className="text-slate-400 font-medium">Try adjusting your filters or search query.</p>
              </div>
              <Button variant="outline" className="rounded-full border-slate-200 text-slate-500 font-bold" onClick={() => { setStatusFilter("all"); setSeverityFilter("all"); setSearchQuery(""); }}>
                Reset all filters
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="text-center py-10 opacity-30">
        <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/nusa-putra-logo.png" alt="University Logo" className="h-6 grayscale" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Universitas Nusa Putra</p>
        </div>
        <p className="text-[9px] font-bold text-slate-400 uppercase">NusaNest · Shared Housing Management System · STAFF ONLY</p>
      </footer>
    </div>
  );
}
