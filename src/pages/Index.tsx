import { useNavigate } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";
import {
  Leaf, Shield, Building2, FlaskConical,
  Wifi, Globe, Lock, BarChart3, ChevronRight,
  TreePine, MapPin, Award, Layers
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const roles = [
  {
    id: "developer",
    icon: Leaf,
    label: "Project Developer",

    desc: "Farmer · NGO · Panchayat",
    color: "carbon-green",
    bgClass: "bg-carbon-green",
    borderClass: "border-carbon-green",
    textClass: "text-carbon-green",
    path: "/developer",
    features: ["GPS Tracking", "Evidence Upload", "Offline Mode"],
  },
  {
    id: "admin",
    icon: Shield,
    label: "Admin",

    desc: "National Authority · Regulator",
    color: "gov-blue",
    bgClass: "bg-gov-blue",
    borderClass: "border-gov-blue",
    textClass: "text-gov-blue",
    path: "/admin",
    features: ["National Overview", "Project Approval", "Audit Logs"],
  },
  {
    id: "verifier",
    icon: FlaskConical,
    label: "Independent Verifier",

    desc: "Accredited · Third-Party",
    color: "saffron",
    bgClass: "bg-saffron",
    borderClass: "border-saffron",
    textClass: "text-saffron",
    path: "/verifier",
    features: ["Evidence Review", "NDVI Analysis", "Digital Signature"],
  },
  {
    id: "corporate",
    icon: Building2,
    label: "Corporate / Company",

    desc: "Buyer · ESG Compliance",
    color: "gov-blue-light",
    bgClass: "bg-gov-blue-light",
    borderClass: "border-gov-blue-light",
    textClass: "text-gov-blue-light",
    path: "/corporate",
    features: ["Credit Marketplace", "Portfolio", "Certificates"],
  },
];


export default function Index() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: "Active Projects", value: "0", icon: TreePine },
    { label: "Carbon Sequestered", value: "0 tCO₂e", icon: Leaf },
    { label: "Credits Issued", value: "0", icon: Award },
    { label: "States Covered", value: "0", icon: MapPin },
  ]);

  useEffect(() => {
    async function fetchStats() {
      try {
        // 1. Active Projects Count
        const { count: projectCount, error: projectError } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true });

        if (projectError) console.error('Error fetching projects:', projectError);

        // 2. Credits Issued & Carbon Sequestered
        const { data: creditsData, error: creditsError } = await supabase
          .from('projects')
          .select('credits_issued, state');

        if (creditsError) console.error('Error fetching credits:', creditsError);

        let totalCredits = 0;
        let uniqueStates = new Set();

        if (creditsData) {
          creditsData.forEach(p => {
            totalCredits += (p.credits_issued || 0);
            if (p.state) uniqueStates.add(p.state);
          });
        }

        const formatNumber = (num: number) => {
          if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
          if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
          return num.toString();
        };

        setStats([
          { label: "Active Projects", value: (projectCount || 0).toLocaleString(), icon: TreePine },
          { label: "Carbon Sequestered", value: `${formatNumber(totalCredits)} tCO₂e`, icon: Leaf },
          { label: "Credits Issued", value: formatNumber(totalCredits), icon: Award },
          { label: "States Covered", value: uniqueStates.size.toString(), icon: MapPin },
        ]);

      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans">
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'red', color: 'white', padding: '2px 5px', fontSize: '10px' }}>
        DEBUG index.tsx
      </div>
      {/* Top gov strip */}
      <div className="bg-gov-blue text-xs text-white/80 py-1 px-4 flex items-center justify-between">
        <span>Government of India</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> EN</span>
          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Secure · Blockchain-Verified</span>
        </div>
      </div>

      {/* Header */}
      <header className="gov-header">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-white font-serif text-xl font-bold leading-tight">
              National Blue Carbon Registry
            </h1>
            <p className="text-white/70 text-xs">
              Admin–MRV Platform v2.0
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-white/60">
            <Wifi className="w-3 h-3 text-carbon-green" />
            <span>Live · Block #4,891,023</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-64 md:h-96 overflow-hidden">
        <img
          src={heroBanner}
          alt="Mangrove coastline of India - Blue Carbon project zones"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="animate-fade-up">
            <span className="inline-block bg-saffron text-white text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-wide uppercase">
              Blockchain · MRV · NDC Compliant
            </span>
            <h2 className="text-white font-serif text-3xl md:text-5xl font-bold mb-2">
              India's Blue Carbon Future
            </h2>
            <p className="text-white/80 text-sm md:text-base max-w-xl">
              Transparent measurement, reporting & verification of mangrove, seagrass and saltmarsh carbon credits
            </p>
          </div>
        </div>
      </section>

      {/* National Stats Bar */}
      <div className="bg-gov-blue text-white py-4">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold font-serif text-carbon-green-pale">{s.value}</div>
              <div className="text-xs text-white/70 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Selection */}
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h3 className="font-serif text-2xl font-semibold text-foreground">Select Your Role</h3>
          <p className="text-muted-foreground text-sm mt-1">Choose your dashboard</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map((role, i) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => navigate(role.path)}
                className="animate-fade-up stat-card text-left group hover:border-gov-blue hover:shadow-elevated transition-all duration-200 cursor-pointer"
                style={{ animationDelay: `${i * 80}ms` }}
                aria-label={`Enter ${role.label} dashboard`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${role.bgClass} bg-opacity-10`}
                  style={{ background: `hsl(var(--${role.color === 'gov-blue-light' ? 'gov-blue' : role.color}-pale, var(--gov-blue-pale)))` }}>
                  <Icon className={`w-6 h-6 ${role.textClass}`} />
                </div>
                <div className="text-xs text-muted-foreground mb-0.5">{role.desc}</div>
                <h4 className="font-serif font-semibold text-foreground text-base mb-0.5">{role.label}</h4>

                <ul className="space-y-1 mb-4">
                  {role.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-carbon-green flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-1 text-sm font-semibold text-gov-blue group-hover:gap-2 transition-all">
                  Enter Dashboard <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Trust bar */}
        <div className="mt-10 p-4 rounded-lg bg-gov-blue-pale border border-gov-blue/20 flex flex-wrap items-center justify-center gap-6 text-xs text-gov-blue">
          <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> ISO 27001 Certified</span>
          <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> IPFS Evidence Storage</span>
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> WCAG 2.1 AA Accessible</span>
          <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Paris Agreement Aligned</span>
          <span className="flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5" /> Verra VCS · Gold Standard</span>
        </div>
      </main>

      <footer className="border-t border-border bg-muted/50 py-6 text-center text-xs text-muted-foreground">
        <p>Ministry of Environment, Forest & Climate Change · Government of India</p>

      </footer>
    </div>
  );
}
