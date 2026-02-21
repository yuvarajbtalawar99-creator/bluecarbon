import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LiveMap } from "@/components/map/LiveMap";
import {
  Shield, Bell, ChevronDown, Search, Filter,
  CheckCircle2, XCircle, AlertTriangle, Leaf, MapPin,
  Users, Award, BarChart3, Download, FileText,
  Eye, UserCheck, Building2, ArrowLeft, TrendingUp,
  Clock, Globe, Activity, LogOut, Hexagon, Database,
  Cpu, Lock, Unlock, HelpCircle, Archive, Trash2,
  Trash, Save, Info, MoreHorizontal, Settings, ExternalLink,
  ChevronRight, Compass, RefreshCw, Snowflake, Wallet, Link2
} from "lucide-react";
import { RegisterOffsetDialog } from "@/components/admin/RegisterOffsetDialog";
import { CompanyDetailsDialog } from "@/components/admin/CompanyDetailsDialog";
import { AdminAuthOverlay } from "@/components/auth/AdminAuthOverlay";
import { authService, AuthSession } from "@/lib/auth/authService";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type TabType = "overview" | "projects" | "companies" | "verifiers" | "credits" | "analytics" | "audit" | "users";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [blockNumber, setBlockNumber] = useState(4891023);
  const [chainHealth, setChainHealth] = useState<'green' | 'yellow' | 'red'>('green');
  const [offsetOpen, setOffsetOpen] = useState(false);
  const [companyDetailsOpen, setCompanyDetailsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  // Stats aggregation
  const [stats, setStats] = useState({
    totalProjects: 0,
    carbonSequestered: 0,
    creditsIssued: 0,
    creditsRetired: 0,
    pendingVerifications: 0,
    // Dynamic trends
    projectsTrend: 0,
    seqTrend: 0,
    issuedTrend: 0,
    retiredTrend: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const activeSession = await authService.deviceLogin();
      if (activeSession && activeSession.user.role === 'admin') {
        setSession(activeSession);
      }
      setIsReady(true);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setBlockNumber(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    if (!session) return;
    setLoading(true);

    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .order('submitted_at', { ascending: false });

    const { data: logsData } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: creditsData } = await supabase
      .from('carbon_credits')
      .select('*');

    if (projectsData) {
      setProjectsList(projectsData);

      // Calculate this month's boundary for trends
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Total stats
      const totalSeq = projectsData.filter(p => p.status === 'verified').reduce((sum, p) => sum + (p.credits_issued || 0) * 1.0, 0);
      const totalIssued = projectsData.reduce((sum, p) => sum + (p.credits_issued || 0), 0);
      const pendingCount = projectsData.filter(p => p.status === 'pending').length;

      // This month's trends
      const thisMonthProjects = projectsData.filter(p => p.submitted_at >= startOfMonth);
      const projectsTrend = thisMonthProjects.length;
      const seqTrend = thisMonthProjects.filter(p => p.status === 'verified').reduce((sum, p) => sum + (p.credits_issued || 0), 0);
      const issuedTrend = thisMonthProjects.reduce((sum, p) => sum + (p.credits_issued || 0), 0);

      // Credits retired from carbon_credits table
      let creditsRetired = 0;
      let retiredTrend = 0;
      if (creditsData) {
        creditsRetired = creditsData.filter((c: any) => c.status === 'retired').reduce((sum: number, c: any) => sum + (c.amount || c.credits || 0), 0);
        retiredTrend = creditsData.filter((c: any) => c.status === 'retired' && c.created_at >= startOfMonth).reduce((sum: number, c: any) => sum + (c.amount || c.credits || 0), 0);
      }

      setStats({
        totalProjects: projectsData.length,
        carbonSequestered: totalSeq,
        creditsIssued: totalIssued,
        creditsRetired,
        pendingVerifications: pendingCount,
        projectsTrend,
        seqTrend,
        issuedTrend,
        retiredTrend,
      });
    }

    if (logsData) setLogs(logsData);
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      fetchData();
      const projectsSub = supabase.channel('projects_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchData).subscribe();
      const logsSub = supabase.channel('logs_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, fetchData).subscribe();
      return () => {
        supabase.removeChannel(projectsSub);
        supabase.removeChannel(logsSub);
      };
    }
  }, [session]);

  const handleLogout = () => {
    authService.logout();
    setSession(null);
    navigate("/");
  };

  if (!isReady) return null;
  if (!session) return <AdminAuthOverlay onAuthenticated={setSession} />;

  const TabButton = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all ${activeTab === id
        ? "bg-white/15 text-white font-medium"
        : "text-white/60 hover:bg-white/10 hover:text-white"
        }`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background font-sans flex text-foreground">
      <TooltipProvider>
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 gov-sidebar flex flex-col" style={{ background: "hsl(var(--gov-blue))" }}>
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-white" />
              <span className="text-white font-serif font-bold text-sm">Regulator Portal</span>
            </div>
            <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest">National Carbon Registry</div>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            <TabButton id="overview" label="Overview" icon={BarChart3} />
            <TabButton id="projects" label="Projects" icon={Leaf} />
            <TabButton id="companies" label="Companies" icon={Building2} />
            <TabButton id="verifiers" label="Verifiers" icon={UserCheck} />
            <TabButton id="credits" label="Credits" icon={Award} />
            <TabButton id="analytics" label="Analytics" icon={TrendingUp} />
            <TabButton id="audit" label="Audit Logs" icon={FileText} />
            <TabButton id="users" label="Users" icon={Users} />
          </nav>
          <div className="p-3 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-2 text-white/60 hover:text-white text-sm px-3 py-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="bg-white border-b border-border px-6 py-3 flex items-center gap-4">
            <div>
              <h1 className="font-serif text-lg font-semibold text-foreground capitalize">{activeTab} Dashboard</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Authorized Access · Registry Node #Ind-Admin-01</p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              {/* Blockchain Sync Status */}
              <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border ${chainHealth === 'green' ? 'bg-carbon-green-pale border-carbon-green/20' : 'bg-saffron-pale border-saffron/20'}`}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${chainHealth === 'green' ? 'bg-carbon-green' : 'bg-saffron'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${chainHealth === 'green' ? 'text-carbon-green' : 'text-saffron'}`}>Blockchain Synced</span>
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground">Block #{blockNumber.toLocaleString()}</div>
                </div>
                <div className="h-4 w-px bg-border mx-1" />
                <div className="flex flex-col text-[9px] font-mono text-muted-foreground">
                  <span>Lag: 1.2s</span>
                  <span>Nodes: 24/24</span>
                </div>
              </div>

              <button className="relative p-2 rounded-md hover:bg-muted group">
                <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                {stats.pendingVerifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
                )}
              </button>

              <div className="flex items-center gap-3 pl-2">
                <div className="text-right flex flex-col">
                  <span className="text-sm font-bold leading-tight">{session.user.name}</span>
                  <span className="text-[10px] text-gov-blue font-black uppercase tracking-tighter">Chief Regulator</span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white text-sm font-bold ring-2 ring-slate-100 shadow-lg">
                  {session.user.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-6">
            {activeTab === "overview" && <OverviewTab stats={stats} projects={projectsList} logs={logs} loading={loading} />}
            {activeTab === "projects" && <ProjectsTab projects={projectsList} loading={loading} onRefresh={fetchData} onOffsetOpen={() => setOffsetOpen(true)} />}
            {activeTab === "companies" && (
              <CompaniesTab
                onViewDetails={(company: any) => {
                  setSelectedCompany(company);
                  setCompanyDetailsOpen(true);
                }}
              />
            )}
            {activeTab === "verifiers" && <VerifiersTab />}
            {activeTab === "credits" && <CreditsTab />}
            {activeTab === "analytics" && <AnalyticsTab />}
            {activeTab === "audit" && <AuditTab logs={logs} loading={loading} />}
            {activeTab === "users" && <UsersTab />}
          </main>
        </div>
      </TooltipProvider>

      {/* Register Manual Offset Dialog */}
      <RegisterOffsetDialog
        open={offsetOpen}
        onOpenChange={setOffsetOpen}
        projects={projectsList}
        session={session}
        onSuccess={fetchData}
      />

      {/* Company Details Dialog */}
      <CompanyDetailsDialog
        open={companyDetailsOpen}
        onOpenChange={setCompanyDetailsOpen}
        company={selectedCompany}
        onAction={(action, id) => {
          toast.success(`${action} action triggered for ${id}`);
          setCompanyDetailsOpen(false);
        }}
      />
    </div>
  );
}

// --- TAB COMPONENTS ---

function OverviewTab({ stats, projects, logs, loading }: any) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          label="Total Projects"
          value={stats.totalProjects.toLocaleString()}
          trend={`+${stats.projectsTrend} this month`}
          icon={Leaf}
          color="text-carbon-green"
          tooltip="Count of all projects registered in the national database"
        />
        <KPICard
          label="Carbon Sequestered"
          value={stats.carbonSequestered >= 1000 ? `${(stats.carbonSequestered / 1000).toFixed(1)}K tCO2e` : `${stats.carbonSequestered.toLocaleString()} tCO2e`}
          trend={`+${stats.seqTrend >= 1000 ? (stats.seqTrend / 1000).toFixed(1) + 'K' : stats.seqTrend.toLocaleString()} this month`}
          icon={TrendingUp}
          color="text-gov-blue"
          tooltip="Verified carbon sequestration calculated using approved MRV methodologies"
        />
        <KPICard
          label="Credits Issued"
          value={stats.creditsIssued.toLocaleString()}
          trend={`+${stats.issuedTrend >= 1000 ? (stats.issuedTrend / 1000).toFixed(1) + 'K' : stats.issuedTrend.toLocaleString()} this month`}
          icon={Award}
          color="text-saffron"
          tooltip="Total carbon credits minted (On-chain + Off-chain)"
        />
        <KPICard
          label="Credits Retired"
          value={stats.creditsRetired.toLocaleString()}
          trend={`+${stats.retiredTrend >= 1000 ? (stats.retiredTrend / 1000).toFixed(1) + 'K' : stats.retiredTrend.toLocaleString()} this month`}
          icon={Activity}
          color="text-carbon-green-light"
          tooltip="Credits used and permanently removed from circulation to prevent double counting"
        />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">National Project Heatmap</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Real-time geospatial project density</p>
              </div>
              {/* <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <div className="w-2 h-2 rounded-full bg-carbon-green" /> Verified
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <div className="w-2 h-2 rounded-full bg-saffron" /> Pending
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <div className="w-2 h-2 rounded-full bg-red-500" /> Rejected
                </div>
              </div> */}
            </div>
            <div className="relative aspect-[16/7] bg-slate-900 group">
              <LiveMap projects={projects} height="100%" />
            </div>
          </div>

          {/* Approval Queue Table */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Project Approval Queue</h3>
              <button className="text-xs text-gov-blue font-bold hover:underline">Full Queue →</button>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-muted-foreground uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-5 py-3">Project ID</th>
                  <th className="px-5 py-3">Ecosystem</th>
                  <th className="px-5 py-3">Risk Score</th>
                  <th className="px-5 py-3">Sync Status</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.slice(0, 5).map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-gov-blue">{p.id}</td>
                    <td className="px-5 py-4 capitalize">{p.plantation_type || p.ecosystem}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${p.risk_score > 7 ? 'bg-red-500' : p.risk_score > 4 ? 'bg-saffron' : 'bg-carbon-green'}`} style={{ width: `${(p.risk_score || 3) * 10}%` }} />
                        </div>
                        <span className="text-[10px] font-bold">{(p.risk_score || 3.2).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-carbon-green font-bold text-[10px]">
                        <Database className="w-3 h-3" />
                        LOCKED
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${p.status === 'verified' ? 'bg-carbon-green-pale text-carbon-green' : 'bg-saffron-pale text-saffron'
                        }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Full Dossier"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Assign Verifier"><UserCheck className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {/* Audit Feed */}
          <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col h-full max-h-[500px]">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-slate-900">Immutable Audit Log</h3>
              <button className="text-xs text-gov-blue font-bold hover:underline flex items-center gap-1">
                <Database className="w-3 h-3" /> Export
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {logs.map((log: any, i: number) => (
                <div key={i} className="flex gap-3 relative pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    {log.log_type === 'approved' ? <CheckCircle2 className="w-4 h-4 text-carbon-green" /> : <Activity className="w-4 h-4 text-gov-blue" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-900 leading-tight mb-1">{log.action}</div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                      <span>{log.performed_by || 'System'}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-200" />
                      <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-border mt-auto shrink-0">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono bg-white p-2 rounded-lg border border-border">
                <Lock className="w-3 h-3 text-carbon-green" />
                <span className="truncate">Anchor: 0x4f...f82a</span>
              </div>
            </div>
          </div>

          {/* High Risk Alerts */}
          <div className="bg-red-50 rounded-2xl border border-red-100 p-5 space-y-4 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Priority Alerts
            </h3>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex items-start gap-3">
                <div className="p-1.5 bg-red-50 rounded-lg text-red-500 shrink-0"><Shield className="w-3.5 h-3.5" /></div>
                <div>
                  <h4 className="text-[11px] font-bold text-red-600">Failed Block Sync</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Verifier Node #V4 unresponsive for 2h.</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex items-start gap-3">
                <div className="p-1.5 bg-red-50 rounded-lg text-red-500 shrink-0"><MapPin className="w-3.5 h-3.5" /></div>
                <div>
                  <h4 className="text-[11px] font-bold text-red-600">Spatial Anomaly</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Project BC-KA-5850 overlaps with NGO site.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsTab({ projects, loading, onRefresh, onOffsetOpen }: any) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-border bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">National Project Registry</h2>
          <p className="text-[10px] text-muted-foreground uppercase font-black">Lifecycle Control · Immutable Record Set</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-gov-secondary text-[11px] py-2 px-4 shadow-none">Bulk Export Ledger</button>
          <button onClick={onOffsetOpen} className="btn-gov text-[11px] py-2 px-4 shadow-none">Register Manual Offset</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-white text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-5 py-4">Project Dossier</th>
              <th className="px-5 py-4">Agency / Developer</th>
              <th className="px-5 py-4">Spatial Stats</th>
              <th className="px-5 py-4">MRV Status</th>
              <th className="px-5 py-4">Blockchain Anchor</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {projects.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-50/80 group">
                <td className="px-5 py-5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono font-bold text-gov-blue">{p.id}</span>
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.state} · {p.ecosystem}</span>
                  </div>
                </td>
                <td className="px-5 py-5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center"><Building2 className="w-4 h-4 text-slate-400" /></div>
                    <span className="font-medium text-slate-600">Manual Sync Required</span>
                  </div>
                </td>
                <td className="px-5 py-5">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-900">{p.area}</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="flex items-center gap-1 text-carbon-green"><Compass className="w-3 h-3" /> GPS</span>
                      <span className="flex items-center gap-1 text-gov-blue text-[10px]"><Hexagon className="w-3 h-3" /> Area Lock</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-5">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-black tracking-tighter uppercase text-muted-foreground">
                      <span>Stage {p.verification_stage || 1}/3</span>
                      <span>{(p.risk_score || 3.2).toFixed(1)} Risk</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gov-blue" style={{ width: `${((p.verification_stage || 1) / 3) * 100}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-5 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-carbon-green font-bold text-[9px] uppercase">
                      <Database className="w-3 h-3" /> Confirmed
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">0x{Math.random().toString(16).substr(2, 8).toUpperCase()}</span>
                  </div>
                </td>
                <td className="px-5 py-5">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${p.status === 'verified' ? 'bg-carbon-green-pale text-carbon-green' : 'bg-saffron-pale text-saffron'
                    }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-5 text-right">
                  <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-xl border border-border hover:bg-slate-100 text-slate-600" title="Full Dossier"><ExternalLink className="w-4 h-4" /></button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-xl bg-slate-900 border border-slate-900 text-white hover:bg-slate-800" title="Manage"><Settings className="w-4 h-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Regulator Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={async () => {
                            const toastId = toast.loading(`Approving sync for ${p.id}...`);
                            const { error } = await supabase.from('projects').update({ sync_status: 'approved', last_synced_at: new Date().toISOString() }).eq('id', p.id);
                            toast.dismiss(toastId);
                            if (error) { toast.error(`Sync approval failed: ${error.message}`); }
                            else { toast.success(`${p.id} sync approved`); if (onRefresh) onRefresh(); }
                          }}
                        >
                          <RefreshCw className="w-4 h-4 text-carbon-green" />
                          <span>Approve Sync</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={async () => {
                            const nextStage = Math.min((p.verification_stage || 1) + 1, 3);
                            const toastId = toast.loading(`Moving ${p.id} to MRV Stage ${nextStage}...`);
                            const { error } = await supabase.from('projects').update({ verification_stage: nextStage }).eq('id', p.id);
                            toast.dismiss(toastId);
                            if (error) { toast.error(`Stage update failed: ${error.message}`); }
                            else { toast.success(`${p.id} moved to Stage ${nextStage}/3`); if (onRefresh) onRefresh(); }
                          }}
                        >
                          <ChevronRight className="w-4 h-4 text-gov-blue" />
                          <span>Move MRV Stage ({(p.verification_stage || 1)}/3 → {Math.min((p.verification_stage || 1) + 1, 3)}/3)</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer text-amber-600 focus:text-amber-700"
                          onClick={async () => {
                            const toastId = toast.loading(`Flagging ${p.id} for risk review...`);
                            const { error } = await supabase.from('projects').update({ status: 'flagged', risk_score: 8.0 }).eq('id', p.id);
                            toast.dismiss(toastId);
                            if (error) { toast.error(`Flag failed: ${error.message}`); }
                            else { toast.success(`${p.id} flagged for risk review`); if (onRefresh) onRefresh(); }
                          }}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Flag Risk</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700"
                          onClick={async () => {
                            const toastId = toast.loading(`Freezing project ${p.id}...`);
                            const { error } = await supabase.from('projects').update({ status: 'frozen' }).eq('id', p.id);
                            toast.dismiss(toastId);
                            if (error) { toast.error(`Freeze failed: ${error.message}`); }
                            else { toast.success(`${p.id} has been frozen`); if (onRefresh) onRefresh(); }
                          }}
                        >
                          <Snowflake className="w-4 h-4" />
                          <span>Freeze Project</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompaniesTab({ onViewDetails }: { onViewDetails: (c: any) => void }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const mockCompanies = [
    {
      id: "comp-1",
      name: "GreenMangrove Pvt Ltd",
      entity_id: "ENT-00921",
      type: "Developer",
      country: "India",
      state: "Karnataka",
      kyc_status: "Verified",
      risk_rating: "Low",
      wallet_address: "0xA3A...F92D",
      credits_held: 12400,
      status: "Active",
      cin: "U74999KA2021PTC145211",
      email: "compliance@greenmangrove.in"
    },
    {
      id: "comp-2",
      name: "Reliance Industries Ltd",
      entity_id: "ENT-01102",
      type: "Buyer",
      country: "India",
      state: "Maharashtra",
      kyc_status: "Verified",
      risk_rating: "Low",
      wallet_address: "0x9f1...E72A",
      credits_held: 84500,
      status: "Active",
      cin: "L17110MH1973PLC019786",
      email: "esg@ril.com"
    },
    {
      id: "comp-3",
      name: "Sunderbans Carbon Trust",
      entity_id: "ENT-00845",
      type: "Developer",
      country: "India",
      state: "West Bengal",
      kyc_status: "Under Review",
      risk_rating: "Medium",
      wallet_address: "0x4B2...C810",
      credits_held: 5600,
      status: "Active",
      cin: "U01100WB2022NPL250100",
      email: "verify@sunderbanstrust.org"
    },
    {
      id: "comp-4",
      name: "Tata Steel Ltd",
      entity_id: "ENT-01580",
      type: "Buyer",
      country: "India",
      state: "Jharkhand",
      kyc_status: "Verified",
      risk_rating: "Low",
      wallet_address: "0x2D1...A450",
      credits_held: 120000,
      status: "Active",
      cin: "L27100JH1907PLC000026",
      email: "sustainability@tatasteel.com"
    },
    {
      id: "comp-5",
      name: "Coastal Carbon Labs",
      entity_id: "ENT-00720",
      type: "Both",
      country: "India",
      state: "Gujarat",
      kyc_status: "Pending",
      risk_rating: "High",
      wallet_address: "0x7B9...D320",
      credits_held: 1200,
      status: "Suspended",
      cin: "U73100GJ2023PTC138541",
      email: "info@coastalcarbon.io"
    }
  ];

  const filtered = mockCompanies.filter(c =>
    (search === "" || c.name.toLowerCase().includes(search.toLowerCase()) || c.entity_id.toLowerCase().includes(search.toLowerCase())) &&
    (typeFilter === "all" || c.type.toLowerCase() === typeFilter.toLowerCase())
  );

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Analytics mini-cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Registered Companies", value: "1,240", icon: Building2, color: "text-gov-blue", trend: "+12 this month" },
          { label: "KYC Verified %", value: "94.2%", icon: Shield, color: "text-carbon-green", trend: "+2.1% improvement" },
          { label: "High Risk Entities", value: "18", icon: AlertTriangle, color: "text-red-500", trend: "3 new flags" },
          { label: "Corporate Credits", value: "2.4M", icon: Wallet, color: "text-saffron", trend: "8% market growth" },
          { label: "Active Buyers", value: "482", icon: UserCheck, color: "text-gov-blue-light", trend: "+5 last week" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-border shadow-sm group hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-white transition-all">
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
            </div>
            <div className="text-lg font-black text-slate-950">{stat.value}</div>
            <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{stat.trend}</div>
          </div>
        ))}
      </div>

      {/* Entity Master Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Entity & Corporate KYC Ledger</h2>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">National Oversight · Verification Tier 1</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-gov-blue transition-colors" />
              <input
                type="text"
                placeholder="Search entities..."
                className="pl-10 pr-4 py-2 bg-white border border-border rounded-xl text-xs w-64 focus:outline-none focus:ring-2 focus:ring-gov-blue/20 transition-all placeholder:text-muted-foreground/60"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="bg-white border border-border rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="developer">Developers</option>
              <option value="buyer">Buyers</option>
              <option value="both">Market Participants</option>
            </select>
            <button className="btn-gov text-[11px] py-2 px-6 shadow-none flex items-center gap-2">
              Onboard Entity
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-white text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Company & Identity</th>
                <th className="px-6 py-4">Status & KYC</th>
                <th className="px-6 py-4">Risk Rating</th>
                <th className="px-6 py-4">On-Chain Wallet</th>
                <th className="px-6 py-4">Credit Holdings</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-950 text-sm leading-tight">{c.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{c.entity_id} · <span className="font-bold text-gov-blue">{c.type}</span></span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'Active' ? 'bg-carbon-green' : 'bg-red-500'}`} />
                        <span className={`text-[10px] font-black uppercase ${c.status === 'Active' ? 'text-carbon-green' : 'text-red-500'}`}>{c.status}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-muted-foreground" />
                        <span className={`text-[9px] font-bold uppercase ${c.kyc_status === 'Verified' ? 'text-gov-blue' : 'text-saffron'}`}>{c.kyc_status}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${c.risk_rating === 'Low' ? 'bg-carbon-green-pale text-carbon-green' :
                      c.risk_rating === 'Medium' ? 'bg-saffron-pale text-saffron' : 'bg-red-50 text-red-600'
                      }`}>
                      {c.risk_rating}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground bg-slate-50 px-2 py-1.5 rounded-lg border border-border/50 w-28 group-hover:border-gov-blue/20 transition-all">
                      <Link2 className="w-3 h-3 text-gov-blue" />
                      {c.wallet_address}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 leading-none">{c.credits_held.toLocaleString()}</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold mt-1">tCO2e Held</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => onViewDetails(c)}
                      className="p-2 rounded-xl bg-white border border-border text-slate-400 hover:text-gov-blue hover:border-gov-blue hover:shadow-sm transition-all"
                      title="View Entity Master"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function VerifiersTab() {
  return (
    <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-4">
      <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
      <div>
        <h3 className="font-bold text-slate-900">Verifier Node Management</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Configure accreditation for independent verification agencies. Monitor node up-time and audit verifier-specific conflict of interest flags.</p>
      </div>
      <div className="flex justify-center pt-4">
        <button className="btn-gov py-2 px-6 shadow-none">Accredit New Agency</button>
      </div>
    </div>
  );
}

function CreditsTab() {
  return (
    <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-4">
      <Award className="w-12 h-12 text-slate-300 mx-auto" />
      <div>
        <h3 className="font-bold text-slate-900">Tokenized Credit Lifecycle</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Immutable tracking for all credits: Minting, Issuance, Transfer, and Retirement. Every credit batch is anchored to the national ledger with a unique Blockchain ID.</p>
      </div>
      <div className="flex justify-center pt-4 overflow-hidden rounded-xl border border-border p-1 bg-slate-50">
        <button className="px-6 py-2 text-xs font-bold text-gov-blue">Issuer Ledger</button>
        <button className="px-6 py-2 text-xs text-muted-foreground font-bold hover:text-slate-900">Retirement Vault</button>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-4">
      <TrendingUp className="w-12 h-12 text-slate-300 mx-auto" />
      <div>
        <h3 className="font-bold text-slate-900">Policy & Impact Analytics</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Macro insights for national climate goals. Forecast sequestration trends by ecosystem and identify regional leakage threats.</p>
      </div>
      <div className="flex justify-center pt-4">
        <button className="btn-gov py-2 px-6 shadow-none">Generate IPCC Report Fragment</button>
      </div>
    </div>
  );
}

function AuditTab({ logs, loading }: any) {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Immutable National Ledger</h3>
          <p className="text-[10px] text-muted-foreground uppercase font-black">All actions are cryptographically signed and anchored</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-gov-secondary text-[10px] py-1.5 px-3">Validate Sequence</button>
          <button className="btn-gov-secondary text-[10px] py-1.5 px-3">Export Signed PDF</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-white text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-5 py-4">Event #</th>
              <th className="px-5 py-4">Action & Context</th>
              <th className="px-5 py-4">Role / Authority</th>
              <th className="px-5 py-4">Timestamp (UTC)</th>
              <th className="px-5 py-4">Blockchain Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-5 py-4 font-mono text-muted-foreground">#{(log.id || 1000 + i).toString().padStart(6, '0')}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] text-muted-foreground">Resource: Registry/Projects/{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-[8px] flex items-center justify-center text-white font-black">{log.performed_by?.charAt(0) || 'A'}</div>
                    <span className="font-medium text-slate-600">{log.performed_by || 'System Admin'}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {new Date(log.created_at).toLocaleString('en-GB')}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-22 h-6 px-2 bg-slate-100 rounded text-[9px] font-mono flex items-center gap-1 border border-border group-hover:border-gov-blue/30 group-hover:bg-white transition-all">
                      <Database className="w-3 h-3 text-carbon-green" />
                      <span className="truncate">0x{Math.random().toString(16).substr(2, 6).toUpperCase()}...</span>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab() {
  return (
    <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-4">
      <Users className="w-12 h-12 text-slate-300 mx-auto" />
      <div>
        <h3 className="font-bold text-slate-900">Access Control & Role Matrix</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Manage administrative permissions and organizational roles. Monitor active sessions and enforce MFA requirements for the National Registry.</p>
      </div>
      <div className="flex justify-center pt-4">
        <button className="btn-gov py-2 px-6 shadow-none">Configure RBAC Matrix</button>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

function KPICard({ label, value, trend, icon: Icon, color, tooltip }: any) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all cursor-help group">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-slate-900 transition-colors">{label}</div>
              <div className="text-2xl font-black font-serif text-slate-950 tracking-tight">{value}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:scale-110 transition-all">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
          </div>
          <div className="text-[10px] text-carbon-green flex items-center gap-1 font-bold">
            <TrendingUp className="w-3 h-3" />{trend}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-slate-900 text-white border-0 py-2 px-3 text-[10px] max-w-[200px] rounded-lg">
        <p className="font-medium">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
