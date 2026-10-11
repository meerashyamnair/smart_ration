import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Access Restricted</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            You do not have the necessary security credentials or role permissions to access this Public Distribution System administrative desk.
          </p>
        </div>

        <Link to="/login" className="block pt-2">
          <Button variant="primary" size="md" className="w-full" icon={<ArrowLeft className="w-4 h-4" />}>
            Return to Portal Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
};
