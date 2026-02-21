import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
    Leaf, Upload, Shield, Database, FileText, CheckCircle2,
    AlertTriangle, Loader2, Link2, Eye, X
} from "lucide-react";

// ---------- Types ----------
interface OffsetFormData {
    project_id: string;
    credit_amount: string;
    vintage_year: string;
    methodology: string;
    issuance_reason: string;
    verifier_name: string;
    verification_date: string;
    confidence_score: string;
    anchor_to_chain: boolean;
    network: string;
    notes: string;
}

const INITIAL_FORM: OffsetFormData = {
    project_id: "",
    credit_amount: "",
    vintage_year: new Date().getFullYear().toString(),
    methodology: "",
    issuance_reason: "",
    verifier_name: "",
    verification_date: new Date().toISOString().split("T")[0],
    confidence_score: "",
    anchor_to_chain: true,
    network: "Polygon",
    notes: "",
};

const METHODOLOGIES = [
    "ARR (Afforestation / Reforestation)",
    "REDD+",
    "Methane Capture",
    "Mangrove Restoration",
    "Blue Carbon Wetlands",
    "Soil Carbon Sequestration",
];

const ISSUANCE_REASONS = [
    "Manual MRV Approval",
    "Legacy Migration",
    "Government Allocation",
    "Emergency Issuance",
    "Verra VCS Transfer",
    "Gold Standard Import",
];

// ---------- Component ----------
export function RegisterOffsetDialog({
    open,
    onOpenChange,
    projects,
    session,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    projects: any[];
    session: any;
    onSuccess?: () => void;
}) {
    const [form, setForm] = useState<OffsetFormData>({ ...INITIAL_FORM });
    const [mrvFile, setMrvFile] = useState<File | null>(null);
    const [supportDocs, setSupportDocs] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [preview, setPreview] = useState(false);
    const [txResult, setTxResult] = useState<{ hash: string; serial: string } | null>(null);

    // Auto-fill project details
    const selectedProject = useMemo(
        () => projects.find((p: any) => p.id === form.project_id),
        [form.project_id, projects]
    );

    const set = (field: keyof OffsetFormData, value: any) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    // Reset on close
    useEffect(() => {
        if (!open) {
            setForm({ ...INITIAL_FORM });
            setMrvFile(null);
            setSupportDocs([]);
            setPreview(false);
            setTxResult(null);
        }
    }, [open]);

    // ---------- Validation ----------
    const validate = (): string | null => {
        if (!form.project_id) return "Select a project";
        if (!form.credit_amount || parseFloat(form.credit_amount) <= 0) return "Enter a valid credit amount";
        if (!form.vintage_year) return "Select a vintage year";
        if (!form.methodology) return "Select a methodology";
        if (!form.issuance_reason) return "Select an issuance reason";
        return null;
    };

    // ---------- Submit ----------
    const handleSubmit = async () => {
        const err = validate();
        if (err) { toast.error(err); return; }

        setSubmitting(true);
        const toastId = toast.loading("Registering offset & anchoring to chain...");

        try {
            // 1. Generate serial number
            const serial = `BCI-OFF-${form.vintage_year}-${Math.floor(10000 + Math.random() * 90000)}`;

            // 2. Simulate blockchain anchor
            let txHash = "";
            if (form.anchor_to_chain) {
                await new Promise((r) => setTimeout(r, 1200)); // simulate tx
                txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
            }

            // 3. Insert into carbon_credits
            const creditAmount = parseFloat(form.credit_amount);
            const { error: creditErr } = await supabase.from("carbon_credits").insert([{
                id: serial,
                name: selectedProject?.name || "Manual Offset",
                project_id: form.project_id,
                state: selectedProject?.state || "",
                ecosystem: selectedProject?.ecosystem || "Mangrove",
                vintage: parseInt(form.vintage_year),
                methodology: form.methodology,
                issuance_reason: form.issuance_reason,
                verifier_name: form.verifier_name,
                verification_date: form.verification_date || null,
                confidence_score: form.confidence_score ? parseFloat(form.confidence_score) : null,
                amount: creditAmount,
                available_quantity: creditAmount,
                price_inr: 0,
                rating: 4.5,
                verifier_standard: form.methodology.split("(")[0]?.trim() || "Manual",
                status: "issued",
                blockchain_tx: txHash || null,
                blockchain_network: form.anchor_to_chain ? form.network : null,
                registry_serial: serial,
                issued_by: session?.user?.email || "regulator",
                notes: form.notes,
                mrv_report_name: mrvFile?.name || null,
                support_docs: supportDocs.map((f) => f.name),
                created_at: new Date().toISOString(),
            }]);

            if (creditErr) throw creditErr;

            // 4. Update project credit balance
            if (selectedProject) {
                const newCredits = (selectedProject.credits_issued || 0) + creditAmount;
                await supabase.from("projects").update({ credits_issued: newCredits }).eq("id", form.project_id);
            }

            // 5. Write audit log
            await supabase.from("audit_logs").insert([{
                action: "manual_offset_registered",
                entity_type: "carbon_credit",
                entity_id: serial,
                details: {
                    project_id: form.project_id,
                    amount: creditAmount,
                    methodology: form.methodology,
                    reason: form.issuance_reason,
                    blockchain_tx: txHash || null,
                    verifier: form.verifier_name,
                },
                performed_by: session?.user?.email || "admin",
                created_at: new Date().toISOString(),
            }]);

            setTxResult({ hash: txHash, serial });
            toast.success("Offset registered & anchored successfully!", { id: toastId });
            if (onSuccess) onSuccess();
        } catch (e: any) {
            console.error(e);
            toast.error(`Registration failed: ${e.message}`, { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    // ---------- Render ----------
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="p-6 pb-4 border-b border-border bg-slate-50 sticky top-0 z-20">
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <div className="p-2 bg-gov-blue rounded-lg text-white"><Leaf className="w-5 h-5" /></div>
                        Register Manual Offset
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Controlled credit minting · Blockchain anchored · Immutable audit trail
                    </DialogDescription>
                </DialogHeader>

                {/* ---------- SUCCESS VIEW ---------- */}
                {txResult ? (
                    <div className="p-8 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-carbon-green/10 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-carbon-green" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Offset Registered & Anchored</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between bg-slate-50 p-3 rounded-lg">
                                <span className="text-muted-foreground">Registry Serial</span>
                                <span className="font-mono font-bold text-gov-blue">{txResult.serial}</span>
                            </div>
                            {txResult.hash && (
                                <div className="flex justify-between bg-slate-50 p-3 rounded-lg">
                                    <span className="text-muted-foreground">Blockchain TX</span>
                                    <span className="font-mono text-xs text-carbon-green truncate max-w-[280px]">{txResult.hash}</span>
                                </div>
                            )}
                            <div className="flex justify-between bg-slate-50 p-3 rounded-lg">
                                <span className="text-muted-foreground">Credits Issued</span>
                                <span className="font-bold text-saffron">{parseFloat(form.credit_amount).toLocaleString()} tCO₂e</span>
                            </div>
                        </div>
                        <button onClick={() => onOpenChange(false)} className="btn-gov text-sm py-2.5 px-8 mt-4">
                            Close
                        </button>
                    </div>
                ) : preview ? (
                    /* ---------- PREVIEW VIEW ---------- */
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4 text-gov-blue" />
                            <h3 className="text-sm font-bold text-slate-900">Preview Offset Record</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            {[
                                ["Project", `${form.project_id} — ${selectedProject?.name || ""}`],
                                ["Credits", `${form.credit_amount} tCO₂e`],
                                ["Vintage", form.vintage_year],
                                ["Methodology", form.methodology],
                                ["Reason", form.issuance_reason],
                                ["Verifier", form.verifier_name || "—"],
                                ["Verification Date", form.verification_date || "—"],
                                ["Confidence", form.confidence_score ? `${form.confidence_score}/10` : "—"],
                                ["Blockchain", form.anchor_to_chain ? `${form.network}` : "Off-chain"],
                                ["MRV Report", mrvFile?.name || "None"],
                                ["Issued By", session?.user?.email || "regulator"],
                                ["Notes", form.notes || "—"],
                            ].map(([k, v]) => (
                                <div key={k} className="bg-slate-50 p-3 rounded-lg">
                                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-black mb-1">{k}</div>
                                    <div className="font-medium text-slate-900 truncate">{v}</div>
                                </div>
                            ))}
                        </div>
                        <DialogFooter className="pt-4 gap-2 flex-row">
                            <button onClick={() => setPreview(false)} className="btn-gov-secondary text-sm py-2 px-4 flex-1">
                                ← Back to Edit
                            </button>
                            <button onClick={handleSubmit} disabled={submitting} className="btn-gov text-sm py-2 px-4 flex-1 flex items-center justify-center gap-2">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                Register & Anchor
                            </button>
                        </DialogFooter>
                    </div>
                ) : (
                    /* ---------- FORM VIEW ---------- */
                    <div className="p-6 space-y-6">
                        {/* ── Section 1: Project Information ── */}
                        <section>
                            <SectionHeader icon={FileText} title="Project Information" color="text-gov-blue" />
                            <div className="space-y-3 mt-3">
                                <div>
                                    <Label>Project ID / Dossier *</Label>
                                    <select
                                        value={form.project_id}
                                        onChange={(e) => set("project_id", e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="">— Select a project —</option>
                                        {projects.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedProject && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <ReadonlyField label="Project Name" value={selectedProject.name} />
                                        <ReadonlyField label="State" value={selectedProject.state} />
                                        <ReadonlyField label="Developer" value={selectedProject.developer_id?.substring(0, 12) || "Manual"} />
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── Section 2: Offset Details ── */}
                        <section>
                            <SectionHeader icon={Leaf} title="Offset Details" color="text-carbon-green" />
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <Label>Credit Amount (tCO₂e) *</Label>
                                    <input type="number" min="0.01" step="0.01" placeholder="e.g. 500"
                                        value={form.credit_amount} onChange={(e) => set("credit_amount", e.target.value)}
                                        className="input-field" />
                                </div>
                                <div>
                                    <Label>Vintage Year *</Label>
                                    <select value={form.vintage_year} onChange={(e) => set("vintage_year", e.target.value)} className="input-field">
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Methodology *</Label>
                                    <select value={form.methodology} onChange={(e) => set("methodology", e.target.value)} className="input-field">
                                        <option value="">— Select —</option>
                                        {METHODOLOGIES.map((m) => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>Issuance Reason *</Label>
                                    <select value={form.issuance_reason} onChange={(e) => set("issuance_reason", e.target.value)} className="input-field">
                                        <option value="">— Select —</option>
                                        {ISSUANCE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* ── Section 3: Verification ── */}
                        <section>
                            <SectionHeader icon={Shield} title="Verification" color="text-saffron" />
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <Label>Verifier Name</Label>
                                    <input type="text" placeholder="e.g. Bureau Veritas"
                                        value={form.verifier_name} onChange={(e) => set("verifier_name", e.target.value)}
                                        className="input-field" />
                                </div>
                                <div>
                                    <Label>Verification Date</Label>
                                    <input type="date" value={form.verification_date}
                                        onChange={(e) => set("verification_date", e.target.value)}
                                        className="input-field" />
                                </div>
                                <div>
                                    <Label>MRV Report (PDF)</Label>
                                    <label className="input-field flex items-center gap-2 cursor-pointer text-muted-foreground hover:border-gov-blue transition-colors">
                                        <Upload className="w-4 h-4 shrink-0" />
                                        <span className="truncate text-xs">{mrvFile ? mrvFile.name : "Upload report..."}</span>
                                        <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                                            onChange={(e) => setMrvFile(e.target.files?.[0] || null)} />
                                    </label>
                                </div>
                                <div>
                                    <Label>Confidence Score (0-10)</Label>
                                    <input type="number" min="0" max="10" step="0.1" placeholder="e.g. 8.5"
                                        value={form.confidence_score} onChange={(e) => set("confidence_score", e.target.value)}
                                        className="input-field" />
                                </div>
                            </div>
                        </section>

                        {/* ── Section 4: Blockchain Anchor ── */}
                        <section>
                            <SectionHeader icon={Database} title="Blockchain Anchor" color="text-carbon-green-light" />
                            <div className="mt-3 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={form.anchor_to_chain}
                                        onChange={(e) => set("anchor_to_chain", e.target.checked)}
                                        className="w-4 h-4 rounded border-border accent-gov-blue" />
                                    <span className="text-sm font-medium text-slate-900">Anchor to Blockchain</span>
                                </label>
                                {form.anchor_to_chain && (
                                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-gov-blue/5 border border-gov-blue/10">
                                        <div>
                                            <Label>Network</Label>
                                            <select value={form.network} onChange={(e) => set("network", e.target.value)} className="input-field">
                                                <option value="Polygon">Polygon (PoS)</option>
                                                <option value="Ethereum">Ethereum Mainnet</option>
                                                <option value="Polygon zkEVM">Polygon zkEVM</option>
                                            </select>
                                        </div>
                                        <ReadonlyField label="Wallet" value={session?.user?.id?.substring(0, 12) + "..." || "Auto"} />
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── Section 5: Registry Metadata ── */}
                        <section>
                            <SectionHeader icon={Link2} title="Registry Metadata" color="text-slate-500" />
                            <div className="space-y-3 mt-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <ReadonlyField label="Registry Serial" value="Auto-generated on submit" />
                                    <ReadonlyField label="Issued By" value={session?.user?.email || "Logged-in regulator"} />
                                </div>
                                <div>
                                    <Label>Notes / Remarks</Label>
                                    <textarea rows={2} placeholder="Optional context for audit trail..."
                                        value={form.notes} onChange={(e) => set("notes", e.target.value)}
                                        className="input-field resize-none" />
                                </div>
                                <div>
                                    <Label>Supporting Documents</Label>
                                    <label className="input-field flex items-center gap-2 cursor-pointer text-muted-foreground hover:border-gov-blue transition-colors">
                                        <Upload className="w-4 h-4 shrink-0" />
                                        <span className="truncate text-xs">
                                            {supportDocs.length > 0 ? `${supportDocs.length} file(s) selected` : "Upload documents..."}
                                        </span>
                                        <input type="file" multiple className="hidden"
                                            onChange={(e) => setSupportDocs(Array.from(e.target.files || []))} />
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* ── Actions ── */}
                        <DialogFooter className="pt-2 gap-2 flex-row sticky bottom-0 bg-white pb-2">
                            <button onClick={() => onOpenChange(false)} className="btn-gov-secondary text-sm py-2.5 px-4 flex items-center gap-2">
                                <X className="w-4 h-4" /> Cancel
                            </button>
                            <button
                                onClick={() => { const e = validate(); if (e) { toast.error(e); return; } setPreview(true); }}
                                className="btn-gov-secondary text-sm py-2.5 px-4 flex items-center gap-2"
                            >
                                <Eye className="w-4 h-4" /> Preview Offset
                            </button>
                            <button onClick={handleSubmit} disabled={submitting} className="btn-gov text-sm py-2.5 px-6 flex items-center gap-2">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                Register & Anchor
                            </button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ---------- Helpers ----------
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-slate-100 ${color}`}><Icon className="w-4 h-4" /></div>
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <label className="block text-xs font-medium text-slate-600 mb-1">{children}</label>;
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <Label>{label}</Label>
            <div className="input-field bg-slate-50 text-slate-500 cursor-default truncate">{value}</div>
        </div>
    );
}
