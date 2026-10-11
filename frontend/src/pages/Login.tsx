import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Store, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRoleTab, setSelectedRoleTab] = useState<'BENEFICIARY' | 'SHOPKEEPER' | 'ADMIN'>('BENEFICIARY');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        const role = res.data.data.user.role;
        if (role === 'BENEFICIARY') navigate('/beneficiary');
        else if (role === 'SHOPKEEPER') navigate('/shopkeeper');
        else if (role === 'ADMIN') navigate('/admin');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'BENEFICIARY' | 'SHOPKEEPER' | 'ADMIN', demoEmail: string) => {
    setSelectedRoleTab(role);
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link to="/" className="inline-flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-900 border border-emerald-500/40 flex items-center justify-center font-black text-2xl text-amber-400 shadow-xl shadow-emerald-950/50">
            PDS
          </div>
        </Link>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Smart Ration Distribution</h2>
        <p className="text-xs text-slate-400">Department of Food & Public Distribution • Portal Login</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl space-y-6">

          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => fillDemo('BENEFICIARY', 'beneficiary@gmail.com')}
              className={`py-2 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedRoleTab === 'BENEFICIARY' ? 'bg-emerald-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Beneficiary
            </button>

            <button
              type="button"
              onClick={() => fillDemo('SHOPKEEPER', 'shopkeeper1@pds.gov.in')}
              className={`py-2 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedRoleTab === 'SHOPKEEPER' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              FPS Dealer
            </button>

            <button
              type="button"
              onClick={() => fillDemo('ADMIN', 'admin@pds.gov.in')}
              className={`py-2 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedRoleTab === 'ADMIN' ? 'bg-indigo-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email Address / User ID"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@pds.gov.in"
              icon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Secret Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant={selectedRoleTab === 'SHOPKEEPER' ? 'saffron' : 'primary'}
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to {selectedRoleTab.charAt(0) + selectedRoleTab.slice(1).toLowerCase()} Portal
            </Button>
          </form>

          <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Don't have a ration card?</span>
            <Link to="/register" className="font-bold text-emerald-400 hover:underline">
              Apply Online →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
