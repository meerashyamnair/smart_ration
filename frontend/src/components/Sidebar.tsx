import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QrCode, ShoppingBag, LayoutDashboard, Calendar, AlertCircle, Users, Store, BarChart2 } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between min-h-[calc(100vh-73px)]">
      <nav className="space-y-1">
        {user.role === 'BENEFICIARY' && (
          <>
            <NavLink
              to="/beneficiary"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <QrCode className="w-4 h-4" />
              <span>Digital Ration Card</span>
            </NavLink>

            <NavLink
              to="/queue"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Calendar className="w-4 h-4" />
              <span>Queue Booking</span>
            </NavLink>

            <NavLink
              to="/complaints"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <AlertCircle className="w-4 h-4" />
              <span>File Grievance</span>
            </NavLink>
          </>
        )}

        {user.role === 'SHOPKEEPER' && (
          <>
            <NavLink
              to="/shopkeeper"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Dispensing Terminal</span>
            </NavLink>
          </>
        )}

        {user.role === 'ADMIN' && (
          <>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin Dashboard</span>
            </NavLink>

            <NavLink
              to="/admin/reports"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <BarChart2 className="w-4 h-4" />
              <span>Reports & Analytics</span>
            </NavLink>

            <NavLink
              to="/complaints"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <AlertCircle className="w-4 h-4" />
              <span>Grievance Desk</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-slate-400">
        <p className="font-semibold text-slate-300">Phase 1 Architecture</p>
        <p className="mt-1 text-[11px] text-slate-500">Node.js + Prisma + PostgreSQL + React + Vite</p>
      </div>
    </aside>
  );
};
