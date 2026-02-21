import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Building2, Leaf, MapPin, Award, ShoppingCart,
  Filter, Search, TrendingUp, Download, Shield,
  CheckCircle2, CreditCard, ArrowRight, LogOut,
  BarChart3, FileText, Globe, Lock, Star, TreePine
} from "lucide-react";


const MOCK_CREDITS = [
  {
    id: "BC-WB-01",
    name: "Sundarbans Mangrove Restoration",
    state: "West Bengal",
    ecosystem: "Mangroves",
    price_inr: 1200,
    available_quantity: 45000,
    vintage: 2023,
    rating: 4.8,
    verifier_standard: "Verra",
    updated_at: new Date().toISOString()
  },
  {
    id: "BC-OR-05",
    name: "Bhitarkanika Blue Carbon Project",
    state: "Odisha",
    ecosystem: "Wetlands",
    price_inr: 1450,
    available_quantity: 12000,
    vintage: 2024,
    rating: 4.9,
    verifier_standard: "Gold Standard",
    updated_at: new Date().toISOString()
  },
  {
    id: "BC-KL-12",
    name: "Kerala Coastal Seagrass Conservation",
    state: "Kerala",
    ecosystem: "Seagrass",
    price_inr: 980,
    available_quantity: 8500,
    vintage: 2022,
    rating: 4.6,
    verifier_standard: "Verra",
    updated_at: new Date().toISOString()
  }
];

const MOCK_PORTFOLIO = [
  {
    id: 1,
    project_id: "BC-WB-01",
    name: "Sundarbans Mangrove Restoration",
    owned_quantity: 500,
    retired_quantity: 200,
    vintage: 2023,
    certificate_id: "CERT-882211",
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    project_id: "BC-GJ-03",
    name: "Gujarat Salt-Marsh Sequestration",
    owned_quantity: 300,
    retired_quantity: 300,
    vintage: 2022,
    certificate_id: "CERT-449190",
    updated_at: new Date().toISOString()
  }
];

export default function CorporateMarketplace() {
  const navigate = useNavigate();
  const [creditsList, setCreditsList] = useState<any[]>([]);
  const [userPortfolio, setUserPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats calculation
  const stats = {
    owned: userPortfolio.reduce((acc, p) => acc + (p.owned_quantity || 0), 0),
    retired: userPortfolio.reduce((acc, p) => acc + (p.retired_quantity || 0), 0),
    invested: userPortfolio.reduce((acc, p) => acc + ((p.owned_quantity || 0) * 1200), 0), // Defaulting to 1200 for mock calculation
    target: "2035"
  };

  const fetchData = async () => {
    setLoading(true);

    try {
      // Fetch credits from carbon_credits table
      const { data: creditsData } = await supabase
        .from('carbon_credits')
        .select('*')
        .order('price_inr', { ascending: true });

      // Fetch portfolio
      const { data: portfolioData } = await supabase
        .from('user_portfolio')
        .select('*, projects(name, vintage)')
        .order('updated_at', { ascending: false });

      if (creditsData && creditsData.length > 0) {
        setCreditsList(creditsData);
      } else {
        setCreditsList(MOCK_CREDITS);
      }

      if (portfolioData && portfolioData.length > 0) {
        setUserPortfolio(portfolioData.map(p => ({
          ...p,
          name: p.projects?.name,
          vintage: p.projects?.vintage
        })));
      } else {
        setUserPortfolio(MOCK_PORTFOLIO);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setCreditsList(MOCK_CREDITS);
      setUserPortfolio(MOCK_PORTFOLIO);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const creditsSubscription = supabase
      .channel('credits_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carbon_credits' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(creditsSubscription);
    };
  }, []);

  const handleBuy = async (credit: any) => {
    const { error } = await supabase
      .from('user_portfolio')
      .insert([{
        project_id: credit.id,
        owned_quantity: 100,
        certificate_id: `CERT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      }]);

    if (error) {
      // If DB fails, we still simulate it locally for "workability"
      toast.info("Database insert restricted. Simulating purchase locally.");
      const newPortfolioItem = {
        id: Date.now(),
        project_id: credit.id,
        name: credit.name,
        owned_quantity: 100,
        retired_quantity: 0,
        vintage: credit.vintage,
        certificate_id: `CERT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        updated_at: new Date().toISOString()
      };
      setUserPortfolio([newPortfolioItem, ...userPortfolio]);
      toast.success(`Purchased 100 tCO2e of ${credit.name}`);
    } else {
      toast.success("Credits purchased successfully!");
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans flex">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-gov-blue" />
            <span className="text-gov-blue font-serif font-bold text-sm">Corporate Portal</span>
          </div>
          <div className="text-muted-foreground text-xs">Reliance Industries Ltd.</div>
          <div className="mt-1 text-xs text-muted-foreground">CIN: L17110MH1973PLC019786</div>
          <div className="mt-2 flex items-center gap-1 text-xs text-carbon-green">
            <CheckCircle2 className="w-3 h-3" /> KYC Verified · Wallet Connected
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { label: "Marketplace", icon: ShoppingCart, active: true },
            { label: "My Portfolio", icon: Award, active: false },
            { label: "ESG Reports", icon: BarChart3, active: false },
            { label: "Certificates", icon: FileText, active: false },
            { label: "Transactions", icon: CreditCard, active: false },
            { label: "Account", icon: Building2, active: false },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all ${item.active
                  ? "bg-gov-blue text-white font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-gov-blue-pale hover:text-gov-blue"
                  }`}>
                <Icon className="w-4 h-4" />
                {item.label}
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
        <header className="bg-white border-b border-border px-6 py-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-serif text-lg font-semibold text-foreground">Blue Carbon Credit Marketplace</h1>
              <p className="text-xs text-muted-foreground">Blockchain-verified credits · IPFS evidence · NDC compliant</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-xs bg-gov-blue-pale text-gov-blue px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Wallet: 0x9f1b...e72a
              </div>
              <div className="text-xs text-muted-foreground border border-border rounded px-2 py-1.5">
                Balance: <span className="font-semibold text-foreground">₹{(1240000 - stats.invested).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* ESG Summary Bar */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Credits Owned", value: `${stats.owned.toLocaleString('en-IN')} tCO₂e`, icon: Leaf, color: "text-carbon-green" },
              { label: "Credits Retired", value: `${stats.retired.toLocaleString('en-IN')} tCO₂e`, icon: Award, color: "text-gov-blue" },
              { label: "Total Invested", value: `₹${(stats.invested / 100000).toFixed(1)}L`, icon: CreditCard, color: "text-saffron" },
              { label: "Net Zero Target", value: stats.target, icon: Globe, color: "text-carbon-green-light" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="stat-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-gov-blue-pale">
                      <Icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <div className="text-xl font-bold font-serif text-foreground">{s.value}</div>
                </div>
              );
            })}
          </div>

          {/* Marketplace */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-lg font-semibold text-foreground">Verified Carbon Credits</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 bg-white text-xs text-muted-foreground">
                  <Search className="w-3 h-3" />
                  <input className="outline-none w-36 bg-transparent placeholder:text-muted-foreground" placeholder="Search projects..." />
                </div>
                <button className="flex items-center gap-1 text-xs text-gov-blue border border-gov-blue/30 rounded-md px-2.5 py-1.5 hover:bg-gov-blue-pale">
                  <Filter className="w-3 h-3" /> Ecosystem
                </button>
                <button className="flex items-center gap-1 text-xs text-gov-blue border border-gov-blue/30 rounded-md px-2.5 py-1.5 hover:bg-gov-blue-pale">
                  <MapPin className="w-3 h-3" /> State
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {creditsList.length === 0 && !loading && (
                <div className="col-span-2 text-center py-10 text-muted-foreground text-xs italic">No credits available in the marketplace yet.</div>
              )}
              {creditsList.map((c) => (
                <div key={c.id} className="stat-card hover:shadow-elevated transition-all cursor-pointer group border hover:border-gov-blue">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-mono text-xs text-gov-blue mb-0.5">{c.id}</div>
                      <div className="font-serif font-semibold text-foreground">{c.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />{c.state}
                        <span className="mx-1">·</span>
                        <TreePine className="w-3 h-3" />{c.ecosystem}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Per tCO₂e</div>
                      <div className="text-xl font-bold font-serif text-gov-blue">₹{c.price_inr.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span>{c.available_quantity.toLocaleString('en-IN')} credits available</span>
                    <span>Vintage: {c.vintage}</span>
                    <span className="flex items-center gap-0.5 text-saffron">
                      <Star className="w-3 h-3 fill-saffron" />{c.rating}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="status-verified">{c.verifier_standard}</span>
                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-gov-blue-pale text-gov-blue">
                      <Shield className="w-2.5 h-2.5 mr-1" />IPFS Verified
                    </span>
                  </div>

                  {/* Credit Selector */}
                  <div className="border border-border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">Quantity (tCO₂e)</label>
                        <input
                          type="number"
                          defaultValue="100"
                          min="1"
                          max={c.available_quantity}
                          className="w-full border border-border rounded px-2 py-1.5 text-sm text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">Total (INR)</label>
                        <div className="border border-border rounded px-2 py-1.5 text-sm font-semibold text-foreground bg-gov-blue-pale">
                          ₹{(c.price_inr * 100).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleBuy(c)}
                      className="btn-gov w-full text-sm py-2 flex items-center justify-center gap-2 rounded-lg group-hover:opacity-100"
                    >
                      <ShoppingCart className="w-4 h-4" /> Buy Credits
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carbon Portfolio */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-foreground mb-3">My Carbon Portfolio</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-gov-blue-pale flex items-center justify-between">
                <span className="font-semibold text-sm text-gov-blue">Owned Credits</span>
                <button
                  onClick={() => toast.success("ESG Report generation started. Your PDF will be ready in a moment.")}
                  className="flex items-center gap-1 text-xs text-gov-blue hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Download ESG Report (PDF)
                </button>
              </div>
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Owned (tCO₂e)</th>
                    <th>Retired (tCO₂e)</th>
                    <th>Vintage</th>
                    <th>Certificate ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userPortfolio.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-muted-foreground text-xs italic">No credits in your portfolio yet.</td>
                    </tr>
                  )}
                  {userPortfolio.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                      <td>
                        <div className="font-medium text-foreground text-sm">{p.name || 'Project Name'}</div>
                        <div className="font-mono text-xs text-gov-blue">{p.project_id}</div>
                      </td>
                      <td className="text-carbon-green font-semibold">{p.owned_quantity} tCO₂e</td>
                      <td className="text-muted-foreground">{p.retired_quantity} tCO₂e</td>
                      <td>{p.vintage || '2024'}</td>
                      <td className="font-mono text-xs text-muted-foreground">{p.certificate_id}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toast.success(`Viewing certificate ${p.certificate_id}`)}
                            className="text-xs text-gov-blue border border-gov-blue/30 rounded px-2 py-1 hover:bg-gov-blue-pale flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Certificate
                          </button>
                          <button
                            onClick={() => toast.info(`Retirement request for ${p.owned_quantity} tCO2e initiated.`)}
                            className="text-xs text-saffron border border-saffron/30 rounded px-2 py-1 hover:bg-saffron-pale"
                          >
                            Retire
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Trust signals */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: "Blockchain Immutable", desc: "All transactions on-chain" },
                { icon: Lock, label: "IPFS Evidence", desc: "Tamper-proof file storage" },
                { icon: Globe, label: "Paris Agreement", desc: "NDC & GHG Protocol aligned" },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.label} className="flex items-center gap-3 p-3 rounded-lg bg-gov-blue-pale border border-gov-blue/15">
                    <Icon className="w-5 h-5 text-gov-blue flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-gov-blue">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
