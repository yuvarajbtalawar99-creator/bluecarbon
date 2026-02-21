import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  TreePine, Plus, MapPin, Camera, Clock, User, ChevronLeft,
  History, Building2, Navigation, Bell, ArrowLeft, Wifi,
  Battery, WifiOff, CheckCircle2, ChevronRight, Play, Square,
  Shield, XCircle, Leaf, Waves, AlertCircle, FileUp, Video, Smartphone, Phone, Globe
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { LiveMap } from "@/components/map/LiveMap";
import { authService, AuthSession } from "@/lib/auth/authService";
import { AuthOverlay } from "@/components/auth/AuthOverlay";
import { GPSStats, gpsService } from "@/lib/gps/gpsService";
import { offlineStorage } from "@/lib/gps/offlineStorage";



// Comprehensive Mock Data for Hackathon Demo
const MOCK_PROJECTS = [
  {
    id: "BC-MH-8821",
    name: "Konkan Coast Mangrove Belt",
    state: "Maharashtra",
    district: "Ratnagiri",
    taluk: "Lanja",
    village: "Kasheli",
    panchayat_name: "Kasheli Gram Panchayat",
    area: "12.5 ha",
    saplings_count: 15600,
    ecosystem: "Mangrove",
    status: "verified",
    credits_issued: 450,
    submitted_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
    evidence_photos: [{ name: "mangrove1.jpg", url: "#" }, { name: "mangrove2.jpg", url: "#" }]
  },
  {
    id: "BC-KA-4491",
    name: "Udupi Wetlands Restoration",
    state: "Karnataka",
    district: "Udupi",
    taluk: "Karkala",
    village: "Hebri",
    panchayat_name: "Hebri Panchayat",
    area: "8.2 ha",
    saplings_count: 9800,
    ecosystem: "Wetland",
    status: "monitoring",
    credits_issued: 0,
    submitted_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    evidence_photos: [{ name: "wetland1.jpg", url: "#" }]
  },
  {
    id: "BC-GJ-1102",
    name: "Kutch Saltmarsh Expansion",
    state: "Gujarat",
    district: "Kutch",
    taluk: "Mundra",
    village: "Luni",
    panchayat_name: "Luni Gram Panchayat",
    area: "25.0 ha",
    saplings_count: 32000,
    ecosystem: "Salt Marsh",
    status: "pending",
    credits_issued: 0,
    submitted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    evidence_photos: []
  }
];

// Static timeline removed - now calculated dynamically based on project status

class MapErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Map Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
          <AlertCircle className="w-8 h-8 mb-2 text-destructive" />
          <p className="text-xs font-semibold">Map Interface Error</p>
          <p className="text-[10px] opacity-70">The GPS map failed to initialize. Rest of the dashboard is active.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const ecosystems = [
  { id: "mangrove", label: "Mangrove", icon: TreePine, color: "text-carbon-green" },
  { id: "seagrass", label: "Seagrass", icon: Waves, color: "text-gov-blue-light" },
  { id: "saltmarsh", label: "Salt Marsh", icon: Leaf, color: "text-saffron" },
];

export default function ProjectDeveloper() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [landProofFile, setLandProofFile] = useState<File | null>(null);
  const [evidencePhotos, setEvidencePhotos] = useState<File[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [gpsStats, setGpsStats] = useState<GPSStats | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  const speciesList: Record<string, string[]> = {
    mangrove: ["Rhizophora mucronata", "Avicennia marina", "Sonneratia alba", "Ceriops tagal"],
    agroforestry: ["Teak", "Mango", "Cashew", "Coconut"],
    tree_plantation: ["Neem", "Banyan", "Peepal", "Gulmohar"],
    wetland: ["Saltmarsh Grass", "Glasswort", "Sea Lavender"],
    grassland: ["Elephant Grass", "Vetiver", "Lemon Grass"]
  };

  const handleLogout = () => {
    authService.logout();
    setSession(null);
    toast.success("Logged out successfully");
  };

  // Silent Device Login check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const existingSession = await authService.deviceLogin();
        if (existingSession) {
          setSession(existingSession);
        }
      } catch (err) {
        console.error("Device login error:", err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Dynamic Timeline Calculation for any project
  const getProjectTimeline = (p: any) => {
    if (!p) return [];

    const status = p.status;
    const submittedDate = new Date(p.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return [
      { step: "GPS Survey", done: true, date: submittedDate },
      { step: "Evidence Uploaded", done: true, date: submittedDate },
      { step: "Monitoring (Active)", done: status === 'monitoring' || status === 'verified', date: status === 'monitoring' || status === 'verified' ? "Active" : "Pending" },
      { step: "Reporting", done: status === 'monitoring' || status === 'verified', date: status === 'monitoring' || status === 'verified' ? "Quarterly" : "Pending" },
      { step: "Verification", done: status === 'verified' || status === 'monitoring', date: status === 'verified' || status === 'monitoring' ? "Passed" : "In Progress" },
      { step: "Credits Issued", done: status === 'verified' || status === 'monitoring', date: status === 'verified' || status === 'monitoring' ? `${p.credits_issued} Issued` : "Pending" },
    ];
  };

  const dynamicTimeline = getProjectTimeline(projectsList[0]);

  const fetchProjects = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('developer_id', session.user.id)
        .order('submitted_at', { ascending: false });

      if (data && data.length > 0) {
        setProjectsList(data);
      } else {
        setProjectsList(MOCK_PROJECTS);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setProjectsList(MOCK_PROJECTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;

    fetchProjects();

    const subscription = supabase
      .channel('developer_projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchProjects())
      .subscribe();

    // Background sync check
    const syncInterval = setInterval(async () => {
      const count = await offlineStorage.getUnsyncedCount();
      setUnsyncedCount(count);

      if (count > 0 && navigator.onLine) {
        // In a real app, logic to actually sync would go here
        // For now, we simulate sync success if online
        console.log(`Simulating sync for ${count} items...`);
        const points = await offlineStorage.getUnsyncedPoints();
        await offlineStorage.markAsSynced(points.map(p => p.timestamp));
        setUnsyncedCount(0);
      }
    }, 10000);

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(syncInterval);
    };
  }, [session]);

  const handleStartProject = async () => {
    const id = `BC-${Math.random().toString(36).substr(2, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProject = {
      id,
      name: "New Mangrove Plantation",
      state: "Maharashtra",
      area: "5.0 ha",
      ecosystem: "Mangrove",
      status: "pending"
    };

    const { error } = await supabase.from('projects').insert([newProject]);

    if (error) {
      toast.error("Failed to start project. Check Supabase connection.");
    } else {
      toast.success("New project started successfully!");
    }
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({
    initiator_type: "farmer",
    name: "",
    plantation_type: "mangrove",
    lat: 19.0760,
    lng: 72.8777,
    gps_accuracy: 2.1,
    state: "State",
    district: "",
    taluk: "",
    village: "",
    panchayat_name: "",
    land_type: "panchayat",
    species: [],
    saplings_count: 0,
    area: "",
    plantation_date: new Date().toISOString().split('T')[0],
    monitoring_frequency: "monthly",
    maintenance_responsibility: "farmer",
    declaration: false
  });

  const nextStep = async () => {
    if (step === 2 && !formData.name) {
      toast.error("Please enter a plantation name");
      return;
    }
    if (step === 3) {
      const toastId = toast.loading("Capturing precise GPS location...");
      try {
        const pos = await gpsService.getCurrentPosition();
        handleInputChange("lat", pos.coords.latitude);
        handleInputChange("lng", pos.coords.longitude);
        handleInputChange("gps_accuracy", pos.coords.accuracy);
        toast.success("Location locked", { id: toastId });
      } catch (err) {
        toast.error("Failed to capture GPS. Using default coordinates.", { id: toastId });
      }
    }
    setStep(s => Math.min(s + 1, 8));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.declaration) {
      toast.error("Please confirm the declaration.");
      return;
    }

    // Simulate "Uploading..." state for a real feel
    const toastId = toast.loading("Uploading evidence & registering plantation...");

    // Prune the 'declaration' field as it's not in the database schema
    const { declaration, ...dataToInsert } = formData;

    // Safety check for state substring to prevent crash
    const statePrefix = (formData.state || "IN").substring(0, 2).toUpperCase();
    const projectId = `BC-${statePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { error } = await supabase.from('projects').insert([{
      ...dataToInsert,
      id: projectId,
      status: 'pending',
      developer_id: session?.user?.id,
      gps_accuracy: Math.min(parseFloat(dataToInsert.gps_accuracy) || 0, 999.99),
      area: parseFloat(dataToInsert.area) || 0,
      lat: parseFloat(parseFloat(dataToInsert.lat).toFixed(6)),
      lng: parseFloat(parseFloat(dataToInsert.lng).toFixed(6)),
      land_proof_url: landProofFile ? `https://storage.supabase.com/proofs/${landProofFile.name}` : null,
      evidence_photos: evidencePhotos.map(f => ({ name: f.name, url: `https://storage.supabase.com/evidence/${f.name}` }))
    }]);

    toast.dismiss(toastId);

    if (error) {
      console.error("Supabase Submission Error:", error);
      toast.error(`Submission failed: ${error.message}${error.details ? " - " + error.details : ""}`);
    } else {
      toast.success("Plantation submitted for verification!");
      setIsFormOpen(false);
      setStep(1);
      setLandProofFile(null);
      setEvidencePhotos([]);
      fetchProjects();
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen bg-gov-blue/5 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 border-4 border-gov-blue/20 border-t-gov-blue rounded-full animate-spin" />
        <p className="text-sm font-serif text-gov-blue font-semibold animate-pulse">Authenticating Device...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthOverlay onAuthenticated={setSession} />;
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col max-w-sm mx-auto relative">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-sm h-[90vh] overflow-y-auto p-0 flex flex-col gap-0 border-none sm:rounded-3xl">
          <div className="bg-gov-blue p-6 text-white shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="icon" className="text-white -ml-2" onClick={() => (step === 1 ? setIsFormOpen(false) : prevStep())}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <DialogTitle className="text-lg font-serif">New Plantation Registry</DialogTitle>
            </div>
            <div className="flex gap-1.5 mt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? "bg-saffron" : "bg-white/20"}`} />
              ))}
            </div>
            <div className="text-[10px] uppercase tracking-wider mt-2 opacity-70">Step {step} of 8: {
              step === 1 ? "Initiator" :
                step === 2 ? "Basic Details" :
                  step === 3 ? "Location" :
                    step === 4 ? "Land Info" :
                      step === 5 ? "Plantation Plan" :
                        step === 6 ? "Evidence" :
                          step === 7 ? "Monitoring" : "Submission"
            }</div>
          </div>

          <div className="p-6 flex-1 bg-white">
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Who is initiating this plantation?</h3>
                {["farmer", "ngo", "panchayat"].map(type => (
                  <button
                    key={type}
                    onClick={() => handleInputChange("initiator_type", type)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${formData.initiator_type === type ? "border-gov-blue bg-gov-blue-pale" : "border-border hover:border-gov-blue/30"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${formData.initiator_type === type ? "bg-gov-blue text-white" : "bg-muted text-muted-foreground"}`}>
                        {type === "farmer" ? <User className="w-5 h-5" /> : type === "ngo" ? <History className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </div>
                      <span className="capitalize font-medium">{type === "panchayat" ? "Panchayat / Govt Body" : type === "ngo" ? "NGO / FPO" : "Farmer"}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.initiator_type === type ? "border-gov-blue" : "border-border"}`}>
                      {formData.initiator_type === type && <div className="w-2.5 h-2.5 rounded-full bg-gov-blue" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Plantation Name</Label>
                  <Input
                    placeholder="e.g. Ratnagiri Mangrove Phase-2"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plantation Type</Label>
                  <Select value={formData.plantation_type} onValueChange={(v) => handleInputChange("plantation_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mangrove">Mangrove</SelectItem>
                      <SelectItem value="agroforestry">Agroforestry</SelectItem>
                      <SelectItem value="tree_plantation">Tree Plantation</SelectItem>
                      <SelectItem value="wetland">Wetland / Saltmarsh</SelectItem>
                      <SelectItem value="grassland">Grassland</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="p-3 bg-carbon-green-pale rounded-lg border border-carbon-green/20 flex items-center gap-2 mb-4">
                  <Navigation className="w-4 h-4 text-carbon-green" />
                  <div className="flex-1">
                    <div className="text-[10px] text-carbon-green font-bold uppercase">GPS Auto-Captured</div>
                    <div className="text-xs font-mono">{formData.lat.toFixed(4)}°N, {formData.lng.toFixed(4)}°E (±{formData.gps_accuracy}m)</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      placeholder="Enter state"
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>District</Label>
                    <Input placeholder="Enter district" value={formData.district} onChange={(e) => handleInputChange("district", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Taluk</Label>
                    <Input placeholder="Enter taluk" value={formData.taluk} onChange={(e) => handleInputChange("taluk", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Village</Label>
                    <Input placeholder="Enter village" value={formData.village} onChange={(e) => handleInputChange("village", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Panchayat Name</Label>
                  <Input placeholder="Gram Panchayat" value={formData.panchayat_name} onChange={(e) => handleInputChange("panchayat_name", e.target.value)} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <Label>Land Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["private", "panchayat", "forest", "crz"].map(type => (
                    <button
                      key={type}
                      onClick={() => handleInputChange("land_type", type)}
                      className={`p-3 rounded-lg border text-xs capitalize ${formData.land_type === type ? "border-gov-blue bg-gov-blue-pale text-gov-blue" : "border-border"
                        }`}
                    >
                      {type} Land
                    </button>
                  ))}
                </div>
                <div className="mt-6">
                  <Label>Land Ownership Proof</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setLandProofFile(file);
                    }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`mt-2 border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${landProofFile ? "border-carbon-green bg-carbon-green-pale/30" : "border-border hover:bg-muted/50"
                      }`}
                  >
                    {landProofFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-carbon-green" />
                        <div className="text-xs font-medium text-foreground">{landProofFile.name}</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setLandProofFile(null); }}
                          className="text-[10px] text-rejected hover:underline"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <>
                        <FileUp className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <div className="text-xs font-medium">Upload Patta / RTC / Consent</div>
                        <div className="text-[10px] text-muted-foreground mt-1">PDF or Image (Max 5MB)</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Species</Label>
                  <Select
                    value={formData.species?.[0] || ""}
                    onValueChange={(v) => handleInputChange("species", [v])}
                  >
                    <SelectTrigger><SelectValue placeholder="Select species" /></SelectTrigger>
                    <SelectContent>
                      {(speciesList[formData.plantation_type] || []).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Saplings</Label>
                  <Input
                    type="number"
                    placeholder="2500"
                    value={formData.saplings_count || ""}
                    onChange={(e) => handleInputChange("saplings_count", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plantation Area (Hectares)</Label>
                  <Input placeholder="e.g. 5.2" value={formData.area} onChange={(e) => handleInputChange("area", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Plantation Date</Label>
                  <Input type="date" value={formData.plantation_date} onChange={(e) => handleInputChange("plantation_date", e.target.value)} />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6 text-center">
                <input
                  type="file"
                  multiple
                  ref={photoInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setEvidencePhotos(prev => [...prev, ...files]);
                  }}
                />
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1].map((idx) => {
                    const photo = evidencePhotos[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => !photo && photoInputRef.current?.click()}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-all cursor-pointer ${photo ? "border-carbon-green bg-carbon-green-pale/30" : "border-border hover:border-carbon-green group"
                          }`}
                      >
                        {photo ? (
                          <>
                            <div className="w-full h-full relative p-2">
                              <img
                                src={URL.createObjectURL(photo)}
                                alt="Evidence"
                                className="w-full h-full object-cover rounded-lg"
                                onLoad={(e) => URL.revokeObjectURL((e.target as any).src)}
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); setEvidencePhotos(prev => prev.filter((_, i) => i !== idx)); }}
                                className="absolute -top-1 -right-1 bg-rejected text-white rounded-full p-1 shadow-lg"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <Camera className="w-10 h-10 text-muted-foreground group-hover:text-carbon-green" />
                            <div className="text-[10px] font-bold text-muted-foreground group-hover:text-carbon-green">Photo {idx + 1} (Live)</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {evidencePhotos.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">+ {evidencePhotos.length - 2} more photos selected</div>
                )}
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="p-4 bg-muted/30 rounded-xl border border-border flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50"
                >
                  <Video className="w-8 h-8 text-gov-blue" />
                  <div className="text-xs font-medium text-foreground">Add More Evidence</div>
                  <div className="text-[10px] text-muted-foreground">Photos or 10-30s video</div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  <Shield className="w-3 h-3 inline mr-1 text-carbon-green" />
                  GPS & Timestamp will be automatically locked to files.
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Monitoring Frequency</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["monthly", "quarterly", "half-yearly"].map(freq => (
                      <button
                        key={freq}
                        onClick={() => handleInputChange("monitoring_frequency", freq)}
                        className={`p-3 rounded-lg border text-xs capitalize ${formData.monitoring_frequency === freq ? "border-gov-blue bg-gov-blue-pale" : "border-border"
                          }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Maintenance Responsibility</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["farmer", "ngo", "panchayat"].map(res => (
                      <button
                        key={res}
                        onClick={() => handleInputChange("maintenance_responsibility", res)}
                        className={`p-3 rounded-lg border text-xs capitalize ${formData.maintenance_responsibility === res ? "border-gov-blue bg-gov-blue-pale" : "border-border"
                          }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 8 && (
              <div className="space-y-6 py-4 text-center">
                <div className="w-20 h-20 bg-carbon-green-pale rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-carbon-green" />
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground">Ready to Submit</h3>
                <p className="text-xs text-muted-foreground">
                  Your project <span className="text-foreground font-bold">{formData.name || "Untitled Plantation"}</span> will be recorded on the National Registry.
                </p>
                <div className="bg-muted/30 p-4 rounded-xl text-left border border-border">
                  <div className="flex items-start gap-3">
                    <Checkbox id="terms" checked={formData.declaration} onCheckedChange={(v) => handleInputChange("declaration", v)} className="mt-1" />
                    <Label htmlFor="terms" className="text-[11px] leading-tight text-muted-foreground cursor-pointer">
                      I confirm this plantation is real, verifiable, and maintained for at least 5–10 years. I agree to the MRV guidelines.
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border shrink-0 bg-white">
            {step < 8 ? (
              <Button className="btn-green w-full rounded-xl py-6" onClick={nextStep}>
                Continue
              </Button>
            ) : (
              <Button className="btn-gov w-full rounded-xl py-6" onClick={handleSubmit}>
                Submit for Verification
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>



      {/* App Header */}
      <header className="gov-header px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1 rounded text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-white font-serif font-semibold text-sm">Admin · Project Developer</div>

          </div>
          <div className="flex items-center gap-1 text-xs bg-carbon-green/20 text-carbon-green-pale px-2 py-0.5 rounded-full border border-carbon-green/30">
            <div className="w-1.5 h-1.5 rounded-full bg-carbon-green animate-pulse" />
            Online
          </div>
          <Bell className="w-5 h-5 text-white/70" />
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24 bg-background">

        {/* Live GPS Map */}
        <div className="mx-4 mt-4 relative z-0 rounded-2xl overflow-hidden border border-border shadow-gov" style={{ height: 200 }}>
          <MapErrorBoundary>
            <LiveMap
              projectId={projectsList[0]?.id || 'NEW'}
              projects={projectsList}
              isRecording={isRecording}
              onStatsUpdate={setGpsStats}
            />
          </MapErrorBoundary>

          {/* Map Controls Overlays */}
          <div className="absolute bottom-4 left-4 z-30">
            <Button
              size="sm"
              className={`rounded-full shadow-lg ${isRecording ? "bg-red-500 hover:bg-red-600" : "bg-carbon-green hover:bg-carbon-green-dark"}`}
              onClick={() => setIsRecording(!isRecording)}
            >
              {isRecording ? (
                <><Square className="w-3.5 h-3.5 mr-2 fill-current" /> Stop GPS</>
              ) : (
                <><Play className="w-3.5 h-3.5 mr-2 fill-current" /> Start GPS</>
              )}
            </Button>
          </div>
        </div>

        <div className="mx-4 mt-2 flex items-center gap-2 text-[10px]">
          <Navigation className={`w-3.5 h-3.5 ${isRecording ? "text-carbon-green animate-pulse" : "text-muted-foreground"}`} />
          <span className={`${isRecording ? "text-carbon-green font-bold" : "text-muted-foreground"}`}>
            {isRecording ? `GPS Active · ±${gpsStats?.accuracy?.toFixed(1) || '0.0'}m` : "GPS Standby"}
          </span>
          {gpsStats?.lastLat && (
            <span className="ml-auto text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              {gpsStats.lastLat.toFixed(4)}°N, {gpsStats.lastLng?.toFixed(4)}°E
            </span>
          )}
        </div>

        {/* Greeting */}
        <div className="px-4 pt-4 pb-2">
          <h2 className="font-serif text-lg font-semibold text-foreground">Hello, {session?.user?.name?.split(' ')[0] || "Developer"} 👋</h2>
          <p className="text-xs text-muted-foreground">
            You have {projectsList.length} active projects ·
            {projectsList.filter(p => p.status === 'pending').length} needs attention
          </p>
        </div>

        <div className="px-4 mb-4">
          <button
            onClick={() => {
              setStep(1);
              setIsFormOpen(true);
            }}
            className="btn-green w-full flex items-center justify-center gap-2 py-4 text-base rounded-xl shadow-gov"
          >
            <Plus className="w-5 h-5" />
            Start New Plantation
          </button>
        </div>

        {/* Offline sync notice */}
        {unsyncedCount > 0 && (
          <div className="mx-4 mb-4 flex items-center gap-2 p-2 rounded-lg bg-saffron-pale border border-saffron/20 text-xs">
            <WifiOff className="w-4 h-4 text-saffron flex-shrink-0" />
            <span className="text-saffron">{unsyncedCount} points pending sync · Will upload automatically</span>
          </div>
        )}

        {/* Project Cards */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-foreground">My Projects</h3>
            <span className="text-xs text-gov-blue">View all →</span>
          </div>
          <div className="space-y-3">
            {projectsList.length === 0 && !loading && (
              <div className="text-center py-6 text-muted-foreground text-xs italic">No projects found.</div>
            )}
            {projectsList.map((p) => (
              <div key={p.id} className="stat-card rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs text-muted-foreground">{p.id}</div>
                    <div className="font-semibold text-sm text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.area}</div>
                  </div>
                  <span className={
                    p.status === "verified" ? "status-verified" :
                      p.status === "pending" ? "status-pending" :
                        "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-gov-blue-pale text-gov-blue"
                  }>
                    {p.status === "verified" ? "✓ Verified" :
                      p.status === "pending" ? "⏳ Under Review" : "📡 Monitoring"}
                  </span>
                </div>

                {/* Mini Status Progress */}
                <div className="flex gap-1.5 mb-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${(i <= 2) || (i <= 4 && (p.status === 'monitoring' || p.status === 'verified')) || (i <= 6 && p.status === 'verified')
                        ? "bg-carbon-green" : "bg-muted"
                        }`}
                    />
                  ))}
                </div>
                {p.status === "verified" && (
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-[10px] text-carbon-green font-semibold">
                      <Leaf className="w-3 h-3" />
                      {p.credits_issued} Credits
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gov-blue font-bold px-1.5 py-0.5 rounded bg-gov-blue-pale border border-gov-blue/20">
                      <Shield className="w-2.5 h-2.5" />
                      BLC-CERTIFIED
                    </div>
                  </div>
                )}
                {(p.status === "monitoring" || p.status === "verified") && p.status !== "verified" && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-gov-blue font-bold px-1.5 py-0.5 rounded bg-gov-blue-pale border border-gov-blue/20 w-fit">
                    <Shield className="w-2.5 h-2.5" />
                    B-PROOF ANCHORED
                  </div>
                )}
                <button
                  onClick={() => {
                    toast.info(`Retrieving blockchain record for ${p.id}...`);
                    setSelectedProject(p);
                  }}
                  className="mt-3 w-full text-xs text-gov-blue flex items-center justify-center gap-1 py-1.5 border border-gov-blue/30 rounded-lg hover:bg-gov-blue-pale transition-colors font-medium shadow-sm"
                >
                  View Full Audit Trail <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>


      </div>

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-sm h-[90vh] overflow-y-auto p-0 flex flex-col gap-0 border-none sm:rounded-3xl">
          {selectedProject && (
            <>
              <div className="bg-gov-blue p-6 text-white shrink-0 relative">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5 text-white" />
                </button>
                <div className="text-xs font-medium text-white/70 mb-1">{selectedProject.id}</div>
                <h2 className="text-xl font-bold font-serif">{selectedProject.name}</h2>
                <div className="mt-4 flex gap-2">
                  <span className="px-2 py-1 bg-white/20 rounded text-[10px] font-medium backdrop-blur-sm">
                    {selectedProject.plantation_type || selectedProject.ecosystem}
                  </span>
                  <span className="px-2 py-1 bg-white/20 rounded text-[10px] font-medium backdrop-blur-sm uppercase">
                    {selectedProject.status}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-6 flex-1">
                {/* Location */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Location & Site
                  </h4>
                  <div className="bg-muted/30 rounded-xl p-3 border border-border">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                      <div>
                        <div className="text-[10px] text-muted-foreground">State</div>
                        <div className="text-xs font-medium">{selectedProject.state}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">District</div>
                        <div className="text-xs font-medium">{selectedProject.district}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Panchayat</div>
                        <div className="text-xs font-medium">{selectedProject.panchayat_name}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Village</div>
                        <div className="text-xs font-medium">{selectedProject.village}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Area</div>
                        <div className="text-xs font-medium">{selectedProject.area} Ha</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Saplings</div>
                        <div className="text-xs font-medium">{selectedProject.saplings_count}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Camera className="w-3 h-3" /> Evidence Photos
                  </h4>
                  {selectedProject.evidence_photos && Array.isArray(selectedProject.evidence_photos) && selectedProject.evidence_photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedProject.evidence_photos.map((photo: any, i: number) => (
                        <div key={i} className="aspect-square rounded-xl bg-muted overflow-hidden border border-border">
                          {/* For demo, we show a placeholder since real URLs aren't uploaded yet */}
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground bg-gov-blue-pale/30">
                            Photo {i + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No evidence photos uploaded.</div>
                  )}
                </div>

                {/* Detailed Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Real-time Tracking
                  </h4>
                  <div className="relative pt-2 pl-2">
                    {getProjectTimeline(selectedProject).map((t, i) => (
                      <div key={t.step} className={`chain-link ${t.done ? "verified" : ""}`} style={{ paddingLeft: "1.5rem" }}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${t.done ? "text-carbon-green" : "text-muted-foreground"}`}>
                            {t.done ? <CheckCircle2 className="inline w-3 h-3 mr-1" /> : null}
                            {t.step}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{t.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Registry info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Blockchain Proof & Registry
                  </h4>
                  <div className="bg-gov-blue-pale border border-gov-blue/20 rounded-xl p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gov-blue/70">Blockchain Status</span>
                        <span className="text-[10px] font-bold text-gov-blue uppercase">Anchored on Polygon</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gov-blue/70">Transaction Hash</span>
                        <span className="text-[10px] font-mono font-bold text-gov-blue">0x7a2...f89c</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gov-blue/10">
                        <span className="text-xs font-medium text-gov-blue">Submission Date</span>
                        <span className="text-xs text-gov-blue font-bold">{new Date(selectedProject.submitted_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gov-blue">Carbon Credits</span>
                        <span className="text-xs text-gov-blue font-bold">{selectedProject.credits_issued || 0} tCO2e</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full mt-2 h-7 text-[10px] text-gov-blue hover:bg-gov-blue/10 hover:text-gov-blue font-bold gap-1 border border-gov-blue/10"
                        onClick={() => toast.info("Opening Polygonscan (Demo)...")}
                      >
                        <Globe className="w-2.5 h-2.5" /> Verify on Explorer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-white mt-auto sticky bottom-0">
                <Button variant="outline" className="w-full rounded-xl" onClick={() => setSelectedProject(null)}>
                  Close Details
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Details Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-sm p-0 border-none sm:rounded-3xl overflow-hidden">
          <div className="bg-gov-blue p-8 text-white text-center relative">
            <div className="absolute top-4 right-4 bg-white/10 p-2 rounded-full backdrop-blur-sm border border-white/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-md">
              <User className="w-10 h-10 text-white" />
            </div>
            <DialogTitle className="text-xl font-serif mb-1">{session?.user?.name || "Project Developer"}</DialogTitle>
            <p className="text-xs text-white/70 uppercase tracking-widest font-medium">Verified Profiler</p>
          </div>

          <div className="p-6 bg-white space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Device ID</span>
                </div>
                <span className="text-xs font-mono font-bold text-foreground">{(session?.deviceId || "DEV-UNKNOWN").substring(0, 12)}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-carbon-green-pale border border-carbon-green/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-carbon-green" />
                  <span className="text-xs font-bold text-carbon-green">Developer ID</span>
                </div>
                <span className="text-xs font-mono font-bold text-carbon-green">{session?.user?.developerId || "N/A"}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Mobile</span>
                </div>
                <span className="text-xs font-bold text-foreground">+91 {session?.user?.phoneNumber}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Place</span>
                </div>
                <span className="text-xs font-bold text-foreground">{session?.user?.place || "Not Set"}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <Navigation className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Pincode</span>
                </div>
                <span className="text-xs font-bold text-foreground">{session?.user?.pincode || "Not Set"}</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-12 rounded-xl text-rejected border-rejected/30 hover:bg-rejected/5 hover:text-rejected flex items-center gap-2 mt-4"
              onClick={handleLogout}
            >
              <History className="w-4 h-4" />
              Logout from Device
            </Button>
          </div>

          <div className="p-4 bg-muted/30 border-t border-border flex justify-center">
            <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setIsProfileOpen(false)}>
              Close Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registry Timeline Dialog (for Bottom Nav) */}
      <Dialog open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <DialogContent className="max-w-sm p-0 border-none sm:rounded-3xl overflow-hidden">
          <div className="bg-gov-blue p-6 text-white text-center">
            <Clock className="w-12 h-12 text-saffron mx-auto mb-4 animate-pulse" />
            <DialogTitle className="text-xl font-serif mb-2">Registry Tracking</DialogTitle>
            <p className="text-xs text-white/70">Real-time status of your latest plantation</p>
          </div>

          <div className="p-6 bg-white min-h-[300px]">
            {!projectsList[0] && !loading ? (
              <div className="text-center py-10 text-muted-foreground text-sm italic">
                No active projects found. Submit a project to start tracking!
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-xs font-bold text-gov-blue uppercase">Latest Project</span>
                  <span className="text-xs font-mono font-medium text-muted-foreground">{projectsList[0]?.id}</span>
                </div>

                <div className="relative pl-2">
                  {getProjectTimeline(projectsList[0]).map((t, i) => (
                    <div key={t.step} className={`chain-link ${t.done ? "verified" : ""}`} style={{ paddingLeft: "1.5rem" }}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${t.done ? "text-carbon-green" : "text-muted-foreground"}`}>
                          {t.done ? <CheckCircle2 className="inline w-3.5 h-3.5 mr-1" /> : null}
                          {t.step}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{t.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-muted/30 border-t border-border">
            <Button className="w-full rounded-xl bg-gov-blue hover:bg-gov-blue/90" onClick={() => setIsTimelineOpen(false)}>
              Close Tracker
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white border-t border-border px-4 py-2 flex justify-around items-center">
        <button className="flex flex-col items-center gap-0.5 text-gov-blue">
          <TreePine className="w-5 h-5" />
          <span className="text-xs font-medium">Projects</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-gov-blue">
          <MapPin className="w-5 h-5" />
          <span className="text-xs">Map</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-gov-blue">
          <Camera className="w-5 h-5" />
          <span className="text-xs">Evidence</span>
        </button>
        <button
          onClick={() => setIsTimelineOpen(true)}
          className={`flex flex-col items-center gap-0.5 ${isTimelineOpen ? "text-gov-blue" : "text-muted-foreground hover:text-gov-blue"}`}
        >
          <Clock className="w-5 h-5" />
          <span className={`text-xs ${isTimelineOpen ? "font-medium" : ""}`}>Timeline</span>
        </button>
        <button
          onClick={() => {
            setIsTimelineOpen(false);
            setIsProfileOpen(true);
          }}
          className={`flex flex-col items-center gap-0.5 ${isProfileOpen ? "text-gov-blue" : "text-muted-foreground hover:text-gov-blue"}`}
        >
          <User className="w-5 h-5" />
          <span className={`text-xs ${isProfileOpen ? "font-medium" : ""}`}>Profile</span>
        </button>
      </nav>
    </div>
  );
}
