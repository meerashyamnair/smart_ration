import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, QrCode, Search, PhoneCall, Award, ArrowRight, Building2, CheckCircle, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const LandingPage: React.FC = () => {
  const [familyMembers, setFamilyMembers] = useState(4);
  const [category, setCategory] = useState('BPL');
  const [shopSearch, setShopSearch] = useState('');

  // Sample entitlement calculation preview
  const getCalculatedQuota = () => {
    if (category === 'BPL') {
      return { rice: familyMembers * 5, wheat: familyMembers * 3, sugar: 1, totalCost: (familyMembers * 5 * 3) + (familyMembers * 3 * 2) + (1 * 13.5) };
    } else if (category === 'AAY') {
      return { rice: 20, wheat: 15, sugar: 1, totalCost: (20 * 1) + (15 * 1) + (1 * 13.5) };
    } else {
      return { rice: familyMembers * 2, wheat: familyMembers * 2, sugar: 0, totalCost: (familyMembers * 2 * 15) + (familyMembers * 2 * 10) };
    }
  };

  const quota = getCalculatedQuota();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Government Tricolor Stripe */}
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-white to-emerald-600"></div>

      {/* Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-900 border border-emerald-500/40 flex items-center justify-center font-black text-xl text-amber-400 shadow-lg">
              PDS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-white leading-tight">Smart Ration Distribution System</h1>
                <Badge variant="saffron" size="sm">Govt of India</Badge>
              </div>
              <p className="text-[11px] text-slate-400">Department of Food & Public Distribution • ISO/IEC/IEEE 29148 Standard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
            <Link to="/register">
              <Button variant="saffron" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>Register Card</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 overflow-hidden border-b border-slate-800/60">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Transparent • Automated • QR Verified Ration Distribution
            </div>

            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Digitizing Public Rationing for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400">Every Citizen</span>
            </h2>

            <p className="text-slate-300 text-base leading-relaxed">
              Empowering beneficiaries with instant digital ration cards, real-time monthly entitlement checks, transparent Fair Price Shop stock tracking, and queue time-slot reservations.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/login">
                <Button variant="primary" size="lg" icon={<QrCode className="w-5 h-5" />}>
                  Access Beneficiary Card
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="lg">
                  Apply New Ration Card
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
              <div>
                <h4 className="text-2xl font-black text-white font-mono">80.2 Cr+</h4>
                <p className="text-xs text-slate-400">Target Citizens</p>
              </div>
              <div>
                <h4 className="text-2xl font-black text-amber-400 font-mono">5.4 Lakh+</h4>
                <p className="text-xs text-slate-400">Fair Price Shops</p>
              </div>
              <div>
                <h4 className="text-2xl font-black text-emerald-400 font-mono">100%</h4>
                <p className="text-xs text-slate-400">Digital Audit Trail</p>
              </div>
            </div>
          </div>

          {/* Entitlement Calculator Widget Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="font-bold text-white text-lg">Monthly Entitlement Calculator</h3>
                <p className="text-xs text-slate-400">Calculate subsidized food grain quota per family</p>
              </div>
              <Badge variant="emerald">Live Quota API</Badge>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Card Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {['BPL', 'AAY', 'APL'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-3 rounded-lg border font-bold transition-all ${
                        category === cat
                          ? 'bg-emerald-700 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {cat} Card
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Family Members Count: <span className="text-emerald-400 font-mono text-sm">{familyMembers}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={familyMembers}
                  onChange={(e) => setFamilyMembers(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 mt-4">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Subsidized Rice (Fine Boiled):</span>
                  <span className="font-mono font-bold text-white text-sm">{quota.rice} KG</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Subsidized Wheat Grain:</span>
                  <span className="font-mono font-bold text-white text-sm">{quota.wheat} KG</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Refined Sugar:</span>
                  <span className="font-mono font-bold text-white text-sm">{quota.sugar} KG</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-2 font-bold text-emerald-400 text-sm">
                  <span>Estimated Total Amount:</span>
                  <span className="font-mono text-base">₹{quota.totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Services Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h3 className="text-3xl font-extrabold text-white tracking-tight">Core PDS Public Services</h3>
          <p className="text-slate-400 text-sm mt-2">Designed for Citizens, Fair Price Shop Dealers, and State Administrators</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3 hover:border-emerald-600/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800">
              <QrCode className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-lg">Digital QR Ration Card</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cryptographically signed QR codes eliminate physical paper card tampering and support instant shopkeeper terminal verification.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3 hover:border-amber-600/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-800">
              <Building2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-lg">Stock & Inventory Engine</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time shop stock levels automatically update upon dispensing, featuring automated low-inventory alerts.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3 hover:border-blue-600/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-950 text-blue-400 flex items-center justify-center border border-blue-800">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-lg">Grievance & Queue Booking</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Reserve collection time slots to avoid overcrowding, and file tracked grievances with official administrator resolution.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500 space-y-2">
        <p className="font-medium text-slate-400">Smart Ration Distribution System • National Public Distribution System (PDS)</p>
        <p>Built in accordance with ISO/IEC/IEEE 29148 SRS standard requirements.</p>
      </footer>
    </div>
  );
};
