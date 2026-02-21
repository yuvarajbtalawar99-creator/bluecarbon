import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import indiaMap from "@/assets/india-map.jpg";
import {
  FlaskConical, CheckCircle2, XCircle, Clock,
  MapPin, Image, Video, ChevronRight, ArrowLeft,
  Layers, BarChart3, AlertTriangle, FileText,
  PenLine, Shield, Eye, Satellite, LogOut, User, Wallet, Globe
} from "lucide-react";
import { walletService } from "@/lib/blockchain/walletService";


const checklist = [
  { item: "GPS polygon valid & consistent", checked: true },
  { item: "Geo-tagged photos match location", checked: true },
  { item: "Drone survey coverage ≥ 80%", checked: false },
  { item: "Species identification correct", checked: true },
  { item: "Survival rate ≥ 70% (current: 82%)", checked: true },
  { item: "NDVI index confirms biomass growth", checked: false },
  { item: "No encroachment in boundary", checked: true },
  { item: "Community consent document attached", checked: true },
];

const evidence = [
  { type: "photo", label: "Site Photo 1", date: "12 Jan 2025", gps: "19.0760°N, 72.8777°E" },
  { type: "photo", label: "Site Photo 2", date: "12 Jan 2025", gps: "19.0762°N, 72.8780°E" },
  { type: "video", label: "Drone Survey", date: "15 Jan 2025", gps: "19.0755°N, 72.8770°E" },
  { type: "photo", label: "Root System", date: "18 Jan 2025", gps: "19.0758°N, 72.8775°E" },
];

export default function VerifierDashboard() {
  const navigate = useNavigate();
  const [assignedList, setAssignedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Find the currently selected project object
  const selectedProject = assignedList.find(p => p.id === selectedProjectId);

  const connectWallet = async () => {
    const account = await walletService.connect();
    if (account) setWalletAddress(account);
  };

  const fetchAssigned = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .in('status', ['pending', 'under_review'])
      .order('submitted_at', { ascending: false });

    if (data) {
      setAssignedList(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssigned();

    const subscription = supabase
      .channel('verifier_projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchAssigned())
      .subscribe();

    walletService.getAccount().then(setWalletAddress);
    walletService.onAccountChange(setWalletAddress);

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleApprove = async () => {
    if (!selectedProjectId) return;
    if (!walletAddress) {
      toast.error("Please connect your wallet to sign the approval.");
      return;
    }

    toast.info("Signing proof on blockchain...");

    // Simulate a short delay for "blockchain transaction"
    setTimeout(async () => {
      const { error } = await supabase
        .from('projects')
        .update({
          status: 'verified',
          credits_issued: 100,
          // In a real app we'd store the tx hash and verifier wallet here
        })
        .eq('id', selectedProjectId);

      if (error) {
        toast.error("Failed to approve project.");
      } else {
        toast.success("Project approved and securely signed!");
        fetchAssigned();
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background font-sans flex">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col border-r border-border" style={{ background: "hsl(213 85% 96%)" }}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-gov-blue" />
            <span className="text-gov-blue font-serif font-bold text-sm">Verifier Panel</span>
          </div>
          <div className="text-muted-foreground text-xs">Verifier · Dr. V. Nair</div>
          {walletAddress ? (
            <div className="mt-2 text-[10px] font-mono text-gov-blue font-bold bg-white/60 border border-gov-blue/20 rounded-md px-1.5 py-1 flex items-center gap-1.5 overflow-hidden">
              <Shield className="w-3 h-3 text-carbon-green flex-shrink-0" />
              <span className="truncate">{walletAddress}</span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="mt-2 w-full text-[10px] font-bold text-white bg-gov-blue hover:bg-gov-blue/90 rounded px-2 py-1.5 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Wallet className="w-3 h-3" /> Connect Wallet
            </button>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { label: "Assigned Projects", icon: FileText, active: true, badge: assignedList.length.toString() },
            { label: "Evidence Review", icon: Image, active: false },
            { label: "Map Analysis", icon: MapPin, active: false },
            { label: "Decisions", icon: PenLine, active: false },
            { label: "Reports", icon: BarChart3, active: false },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all ${item.active
                  ? "bg-gov-blue text-white font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-gov-blue-pale hover:text-gov-blue"
                  }`}>
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="bg-saffron text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={() => navigate("/")} className="w-full flex items-center gap-2 text-muted-foreground hover:text-gov-blue text-sm px-3 py-2">
            <LogOut className="w-4 h-4" /> Back to Portal
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-border px-6 py-3 flex items-center gap-4">
          <div>
            <h1 className="font-serif text-lg font-semibold text-foreground">Independent Verification Panel</h1>
            <p className="text-xs text-muted-foreground">
              {assignedList.length} projects assigned ·
              {assignedList.filter(p => p.status === 'under_review').length} urgent · IPFS verified evidence
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-xs text-muted-foreground">Accredited by Admin · Cert #VR-2024-0891</div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <div className="w-7 h-7 rounded-full bg-saffron flex items-center justify-center text-white text-xs font-bold">VN</div>
              Dr. V. Nair
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Assigned list */}
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gov-blue" /> Assigned to Me
              </h3>
              <div className="space-y-3">
                {assignedList.length === 0 && !loading && (
                  <div className="text-center py-10 text-muted-foreground text-xs italic">No projects assigned for review.</div>
                )}
                {assignedList.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`stat-card rounded-lg cursor-pointer hover:shadow-elevated transition-all ${selectedProjectId === p.id ? "border-gov-blue ring-1 ring-gov-blue" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-mono text-xs text-gov-blue">{p.id}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${p.status === "under_review" ? "bg-saffron-pale text-saffron" : "bg-gov-blue-pale text-gov-blue"}`}>
                        {p.status === "under_review" ? "🟡 Urgency: Med" : "🟢 Urgency: Low"}
                      </span>
                    </div>
                    <div className="font-medium text-sm text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{p.plantation_type || p.ecosystem} · {p.area}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Submitted: {new Date(p.submitted_at).toLocaleDateString()}
                    </div>
                    <div className="mt-2">
                      <span className={p.status === "under_review" ? "status-pending" : "inline-flex text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"}>
                        {p.status === "under_review" ? "In Review" : "Pending Start"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Center: Project Review */}
            <div className="col-span-2 space-y-4">
              {/* Map */}
              <div className="map-card">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-gov-blue-pale">
                  <div>
                    <h3 className="font-semibold text-sm text-gov-blue">{selectedProject?.id || "SELECT A PROJECT"} · GPS Trail & Geo-fence</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedProject?.name || "No Project Selected"} · {selectedProject?.area || "0.0 ha"} · {selectedProject?.state || "India"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 text-xs text-gov-blue border border-gov-blue/30 px-2 py-1 rounded hover:bg-white">
                      <Satellite className="w-3 h-3" /> NDVI
                    </button>
                    <button className="flex items-center gap-1 text-xs text-gov-blue border border-gov-blue/30 px-2 py-1 rounded hover:bg-white">
                      <Layers className="w-3 h-3" /> Layers
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <img src={indiaMap} alt="GPS trail and geo-fence boundary" className="w-full h-48 object-cover" />
                  <div className="absolute bottom-2 left-2 bg-white/90 rounded text-xs px-2 py-1 text-foreground border border-border">
                    <span className="text-carbon-green font-semibold">GPS Trail: 847 points</span> · Geo-fence: ✓ Valid
                  </div>
                </div>
              </div>

              {/* Evidence Gallery */}
              <div className="stat-card">
                <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                  <Image className="w-4 h-4 text-gov-blue" /> Evidence Gallery · IPFS Verified
                </h3>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {evidence.map((e, i) => (
                    <div key={i} className="rounded-lg border border-border overflow-hidden hover:border-gov-blue transition-colors cursor-pointer">
                      <div className="h-16 bg-gov-blue-pale flex items-center justify-center">
                        {e.type === "video" ? <Video className="w-6 h-6 text-gov-blue" /> : <Image className="w-6 h-6 text-gov-blue" />}
                      </div>
                      <div className="p-1.5">
                        <div className="text-xs font-medium text-foreground truncate">{e.label}</div>
                        <div className="text-xs text-muted-foreground">{e.date}</div>
                        <div className="text-xs text-carbon-green truncate">{e.gps}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 text-carbon-green" />
                  All files verified on IPFS · Hash: QmXf3...9cA2
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="stat-card">
                <h3 className="font-semibold text-sm text-foreground mb-3">Verification Checklist</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {checklist.map((c, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded ${c.checked ? "bg-carbon-green-pale" : "bg-saffron-pale"}`}>
                      {c.checked
                        ? <CheckCircle2 className="w-4 h-4 text-carbon-green flex-shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-saffron flex-shrink-0" />}
                      <span className={c.checked ? "text-carbon-green" : "text-saffron"}>{c.item}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>Checklist completion: 6/8 items passed</span>
                  <span className="text-saffron font-medium">⚠ 2 items need review</span>
                </div>

                {/* Decision */}
                <div className="border border-border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-gov-blue" /> Verification Decision
                  </h4>
                  <textarea
                    className="w-full border border-border rounded p-2 text-xs text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    rows={2}
                    placeholder="State your reason for approval or rejection..."
                    defaultValue={`GPS boundary for ${selectedProject?.id || 'project'} is valid. Evidence photos match location. Requesting additional drone footage for NDVI confirmation.`}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleApprove}
                      disabled={!selectedProjectId}
                      className="flex-1 flex items-center justify-center gap-2 btn-green text-sm py-2.5 rounded-lg disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve & Sign
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg border border-rejected/40 text-rejected bg-destructive/5 hover:bg-destructive/10 font-semibold">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    🔏 Decision will be cryptographically signed with your wallet · Immutable on blockchain
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
