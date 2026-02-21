import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Building2,
    Shield,
    CreditCard,
    TreePine,
    AlertTriangle,
    Link2,
    FileText,
    UserCheck,
    Globe,
    Wallet,
    CheckCircle2,
    XCircle,
    Activity,
    History,
    Download,
    ExternalLink,
    Leaf,
    Database,
} from "lucide-react";

interface CompanyDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    company: any;
    onAction: (action: string, companyId: string) => void;
}

export function CompanyDetailsDialog({
    open,
    onOpenChange,
    company,
    onAction,
}: CompanyDetailsDialogProps) {
    if (!company) return null;

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "active":
            case "verified":
                return "bg-carbon-green-pale text-carbon-green border-carbon-green/20";
            case "pending":
            case "under review":
                return "bg-saffron-pale text-saffron border-saffron/20";
            case "suspended":
                return "bg-slate-100 text-slate-600 border-slate-200";
            case "rejected":
                return "bg-red-50 text-red-600 border-red-100";
            default:
                return "bg-slate-100 text-slate-600 border-slate-200";
        }
    };

    const getRiskColor = (risk: string) => {
        switch (risk.toLowerCase()) {
            case "low":
                return "text-carbon-green bg-carbon-green-pale";
            case "medium":
                return "text-saffron bg-saffron-pale";
            case "high":
                return "text-red-600 bg-red-50";
            default:
                return "text-slate-600 bg-slate-100";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 border-b border-border bg-slate-50/50">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold font-serif text-slate-950">
                                    {company.name}
                                </DialogTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {company.entity_id}
                                    </span>
                                    <Badge variant="outline" className={getStatusColor(company.status)}>
                                        {company.status}
                                    </Badge>
                                    <Badge variant="outline" className={getStatusColor(company.kyc_status)}>
                                        KYC: {company.kyc_status}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                Risk Rating
                            </div>
                            <div
                                className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${getRiskColor(
                                    company.risk_rating || "Low"
                                )}`}
                            >
                                {company.risk_rating || "Low"}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="profile" className="flex-1 flex flex-col">
                    <div className="border-b border-border bg-white px-6">
                        <TabsList className="bg-transparent h-12 gap-6">
                            {[
                                { value: "profile", label: "Profile", icon: UserCheck },
                                { value: "kyc", label: "Compliance", icon: Shield },
                                { value: "wallet", label: "Wallet & Trades", icon: Wallet },
                                { value: "projects", label: "Portfolio", icon: TreePine },
                                { value: "risk", label: "Risk Monitor", icon: AlertTriangle },
                                { value: "blockchain", label: "Anchor", icon: Link2 },
                            ].map((tab) => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-gov-blue data-[state=active]:text-gov-blue rounded-none px-0 h-12 text-xs font-bold uppercase tracking-widest gap-2 bg-transparent border-0"
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-6">
                            {/* --- PROFILE TAB --- */}
                            <TabsContent value="profile" className="m-0 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <SectionLabel label="General Information" />
                                        <DataRow label="Legal Name" value={company.name} />
                                        <DataRow label="Entity ID" value={company.entity_id} />
                                        <DataRow label="Entity Type" value={company.type} />
                                        <DataRow label="Jurisdiction" value={company.country} />
                                        <DataRow
                                            label="Headquarters"
                                            value={company.state || "Maharashtra, India"}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <SectionLabel label="Identification & Contact" />
                                        <DataRow label="Tax ID / Registration" value={company.cin || "U12345MH2023PTC123"} />
                                        <DataRow label="Primary Email" value={company.email || "compliance@company.com"} />
                                        <DataRow label="Primary Phone" value={company.phone || "+91 22 4567 8900"} />
                                        <div className="pt-2">
                                            <Label>On-Chain Wallet Address</Label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <code className="text-[10px] bg-slate-50 border border-border px-2 py-1 rounded-md flex-1 font-mono truncate">
                                                    {company.wallet_address || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"}
                                                </code>
                                                <button className="p-1.5 rounded-lg border border-border hover:bg-slate-50 text-gov-blue">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* --- KYC TAB --- */}
                            <TabsContent value="kyc" className="m-0 space-y-6">
                                <div className="bg-slate-50 border border-border rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${getStatusColor(company.kyc_status)}`}>
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900 uppercase">Verification Status: {company.kyc_status}</div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">Last renewed: Oct 24, 2025 · Expiring in 324 days</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn-gov-secondary text-[10px] py-1.5 px-3 h-auto">View Docs</button>
                                        <button className="btn-gov text-[10px] py-1.5 px-3 h-auto">Run Screener</button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <SectionLabel label="Compliance Checklist" />
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: "CIN / Incorporation Certificate", status: "Verified" },
                                            { label: "Board Resolution for Registry", status: "Verified" },
                                            { label: "Director KYC (DIN Verification)", status: "Verified" },
                                            { label: "Beneficial Ownership (UBO)", status: "Under Review" },
                                            { label: "Sanctions & PEP Check", status: "Clean" },
                                            { label: "Address Proof Verification", status: "Verified" },
                                        ].map((item) => (
                                            <div key={item.label} className="border border-border p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <span className="text-xs font-medium text-slate-700">{item.label}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Verified' || item.status === 'Clean' ? 'bg-carbon-green' : 'bg-saffron'}`} />
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{item.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* --- WALLET TAB --- */}
                            <TabsContent value="wallet" className="m-0 space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <StatBox label="Total Credits Held" value={`${(company.credits_held || 12400).toLocaleString()} tCO2e`} icon={Leaf} color="text-carbon-green" />
                                    <StatBox label="Credits Retired" value="5,200 tCO2e" icon={Activity} color="text-gov-blue" />
                                    <StatBox label="Active Orders" value="3" icon={History} color="text-saffron" />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <SectionLabel label="Transaction History (Ledger)" />
                                        <button className="text-[10px] font-bold text-gov-blue flex items-center gap-1">
                                            <Download className="w-3 h-3" /> Export Statements
                                        </button>
                                    </div>
                                    <div className="border border-border rounded-xl overflow-hidden text-[11px]">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-border font-black uppercase text-[9px] tracking-widest text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3">Tx ID</th>
                                                    <th className="px-4 py-3">Type</th>
                                                    <th className="px-4 py-3">Amount</th>
                                                    <th className="px-4 py-3">Date</th>
                                                    <th className="px-4 py-3">Link</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {[
                                                    { id: 'TX-4921', type: 'Purchase', amount: '+1,200', date: 'Oct 12, 2025', network: 'Polygon' },
                                                    { id: 'TX-4850', type: 'Retirement', amount: '-500', date: 'Sep 28, 2025', network: 'Polygon' },
                                                    { id: 'TX-4721', type: 'Purchase', amount: '+3,000', date: 'Aug 15, 2025', network: 'Polygon' },
                                                ].map((tx) => (
                                                    <tr key={tx.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-mono font-bold">{tx.id}</td>
                                                        <td className="px-4 py-3">{tx.type}</td>
                                                        <td className={`px-4 py-3 font-bold ${tx.amount.startsWith('+') ? 'text-carbon-green' : 'text-gov-blue'}`}>{tx.amount}</td>
                                                        <td className="px-4 py-3 text-muted-foreground">{tx.date}</td>
                                                        <td className="px-4 py-3"><ExternalLink className="w-3 h-3 text-slate-300" /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* --- PROJECTS TAB --- */}
                            <TabsContent value="projects" className="m-0 space-y-6">
                                <div className="space-y-4">
                                    <SectionLabel label="Project Participation" />
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { name: "Sunderbans Blue Carbon V2", role: "Owner/Developer", area: "1,200 Ha", credits: "45,000" },
                                            { name: "Gujarat Coastal Restoration", role: "Investor", area: "450 Ha", credits: "12,000" },
                                        ].map((proj) => (
                                            <div key={proj.name} className="border border-border p-4 rounded-xl space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <h4 className="text-sm font-bold text-slate-900">{proj.name}</h4>
                                                    <Badge variant="outline" className="text-[9px] uppercase font-black">{proj.role}</Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                    <div className="text-muted-foreground">Allocated Area: <span className="text-slate-900 font-bold">{proj.area}</span></div>
                                                    <div className="text-muted-foreground">Total Credits: <span className="text-slate-900 font-bold">{proj.credits}</span></div>
                                                </div>
                                                <Separator />
                                                <button className="w-full text-[10px] font-bold text-gov-blue flex items-center justify-center gap-1 hover:underline">
                                                    View Project Dossier <ExternalLink className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* --- RISK TAB --- */}
                            <TabsContent value="risk" className="m-0 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-slate-50 rounded-xl border border-border p-5 text-center space-y-2">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground">AI Compliance Rating</div>
                                        <div className="text-4xl font-black text-carbon-green">8.8<span className="text-lg text-slate-300">/10</span></div>
                                        <div className="text-[10px] font-bold text-carbon-green underline">TOP 5% IN SECTOR</div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-lg border border-炭-100 flex items-center gap-3">
                                            <div className="p-1.5 rounded-md bg-carbon-green-pale text-carbon-green"><CheckCircle2 className="w-4 h-4" /></div>
                                            <div className="text-[11px] font-medium">No Sanctions detected (Refinitiv World-Check)</div>
                                        </div>
                                        <div className="p-3 rounded-lg border border-saffron/20 bg-saffron-pale/30 flex items-center gap-3">
                                            <div className="p-1.5 rounded-md bg-saffron-pale text-saffron"><AlertTriangle className="w-4 h-4" /></div>
                                            <div className="text-[11px] font-medium">Occasional high-volume purchase from unusual Geo</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <SectionLabel label="Live Monitoring Flags" />
                                    <div className="space-y-2">
                                        {[
                                            { label: "Beneficial Owner Geography Mismatch", status: "Low Risk", color: "text-carbon-green" },
                                            { label: "Transaction Velocity Anomaly", status: "Monitor", color: "text-saffron" },
                                            { label: "IP Address Log Conflict", status: "Resolved", color: "text-slate-400" },
                                            { label: "Document Expiry Reminder", status: "Attention", color: "text-red-500" },
                                        ].map((flag) => (
                                            <div key={flag.label} className="flex items-center justify-between p-3 border border-border rounded-xl">
                                                <span className="text-xs font-semibold text-slate-700">{flag.label}</span>
                                                <span className={`text-[9px] font-black uppercase ${flag.color}`}>{flag.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* --- BLOCKCHAIN TAB --- */}
                            <TabsContent value="blockchain" className="m-0 space-y-6">
                                <div className="bg-slate-900 rounded-xl p-6 text-white space-y-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <Database className="w-24 h-24" />
                                    </div>

                                    <div className="space-y-2 relative z-10">
                                        <div className="flex items-center gap-2 text-carbon-green">
                                            <Link2 className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">National Identity Anchor Enabled</span>
                                        </div>
                                        <h3 className="text-lg font-bold">Immutable Entity ID: BCI-ENT-{company.id?.substring(0, 8).toUpperCase() || 'MOCK8921'}</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 relative z-10">
                                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
                                            <div className="text-[9px] text-slate-400 uppercase font-black">DID / Entity Hash</div>
                                            <div className="text-[10px] font-mono truncate">0xDID:{Math.random().toString(16).substr(2, 40)}</div>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
                                            <div className="text-[9px] text-slate-400 uppercase font-black">IPFS KYC Root</div>
                                            <div className="text-[10px] font-mono truncate">Qm{Math.random().toString(36).substr(2, 44)}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-carbon-green" />
                                            Synchronized with Polygon Mainnet
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-500">Last Sync: Oct 25, 14:32:01 UTC</span>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 border-t border-border bg-slate-50 flex flex-row gap-3">
                        <button onClick={() => onAction('Approve KYC', company.id)} className="btn-gov text-[11px] h-10 px-6 flex-1 flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Approve KYC
                        </button>
                        <button onClick={() => onAction('Flag', company.id)} className="btn-gov-secondary text-[11px] h-10 px-6 flex-1 flex items-center justify-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-saffron" /> Flag Entity
                        </button>
                        <button onClick={() => onAction('Suspend', company.id)} className="btn-gov-secondary text-[11px] h-10 px-6 flex-1 flex items-center justify-center gap-2 text-red-600 hover:text-red-700">
                            <XCircle className="w-4 h-4" /> Suspend
                        </button>
                    </DialogFooter>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

// --- Helpers ---
function SectionLabel({ label }: { label: string }) {
    return (
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {label}
        </h4>
    );
}

function SectionDescription({ children }: { children: React.ReactNode }) {
    return <p className="text-[11px] text-muted-foreground">{children}</p>;
}

function DataRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <span className="text-[11px] font-bold text-slate-900">{value}</span>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">{children}</label>;
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
    return (
        <div className="border border-border p-4 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
                <div className="p-1 px-1.5 rounded bg-slate-50 border border-slate-100"><Icon className={`w-3 h-3 ${color}`} /></div>
                <span className="text-[10px] font-black uppercase tracking-tight text-muted-foreground">{label}</span>
            </div>
            <div className="text-lg font-black text-slate-950">{value}</div>
        </div>
    )
}

function DialogFooter({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={`mt-auto ${className}`}>
            {children}
        </div>
    )
}
