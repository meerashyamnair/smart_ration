import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { UserCheck, ShieldCheck, ArrowRight, CreditCard, Users, Home, Lock, Mail, Phone } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    rationCardNumber: '',
    category: 'BPL',
    familyMembersCount: 4,
    fpsShopId: '',
    address: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        ...formData,
        familyMembersCount: Number(formData.familyMembersCount),
        fpsShopId: formData.fpsShopId || 'FPS_DELHI_001' // Default seed shop if unselected
      });

      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate('/beneficiary');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-2">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-900 border border-emerald-500/40 flex items-center justify-center font-black text-xl text-amber-400 shadow-xl">
            PDS
          </div>
        </Link>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Digital Ration Card Registration</h2>
        <p className="text-xs text-slate-400">Self-Service Beneficiary Enrollment • National Public Distribution System</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl space-y-6">

          {error && <Alert type="error">{error}</Alert>}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name (Head of Family)"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ramesh Sharma"
                icon={<UserCheck className="w-4 h-4" />}
              />

              <Input
                label="Email Address"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="ramesh@example.com"
                icon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Mobile Phone Number"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+919876543210"
                icon={<Phone className="w-4 h-4" />}
              />

              <Input
                label="Create Password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
              />
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ration Card Details</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Ration Card Number"
                  type="text"
                  required
                  value={formData.rationCardNumber}
                  onChange={(e) => handleChange('rationCardNumber', e.target.value)}
                  placeholder="RC_DELHI_109284"
                  icon={<CreditCard className="w-4 h-4" />}
                />

                <Select
                  label="Category Scheme"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  options={[
                    { value: 'BPL', label: 'BPL (Below Poverty Line)' },
                    { value: 'AAY', label: 'AAY (Antyodaya Anna Yojana)' },
                    { value: 'APL', label: 'APL (Above Poverty Line)' }
                  ]}
                />

                <Input
                  label="Family Members Count"
                  type="number"
                  min="1"
                  max="15"
                  required
                  value={formData.familyMembersCount}
                  onChange={(e) => handleChange('familyMembersCount', e.target.value)}
                  icon={<Users className="w-4 h-4" />}
                />

                <Select
                  label="Fair Price Shop Code"
                  value={formData.fpsShopId}
                  onChange={(e) => handleChange('fpsShopId', e.target.value)}
                  options={[
                    { value: 'FPS_DELHI_001', label: 'FPS_DELHI_001 (Central Fair Price Shop)' },
                    { value: 'FPS_DELHI_002', label: 'FPS_DELHI_002 (North Delhi FPS)' }
                  ]}
                />
              </div>

              <Input
                label="Permanent Residential Address"
                type="text"
                required
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="H.No 12, Ward 4, Sector 12, RK Puram, New Delhi"
                icon={<Home className="w-4 h-4" />}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
              icon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
            >
              Generate Digital Ration Card
            </Button>
          </form>

          <div className="border-t border-slate-800 pt-4 text-center text-xs text-slate-400">
            <span>Already registered? </span>
            <Link to="/login" className="font-bold text-emerald-400 hover:underline">
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
