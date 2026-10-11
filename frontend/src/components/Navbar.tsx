import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LogOut, User as UserIcon, Bell, Check, X } from 'lucide-react';
import { Badge } from './ui/Badge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      // Quiet fail if unauthorized or unauthenticated
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 px-6 py-3.5 backdrop-blur-md flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-900 border border-emerald-500/40 flex items-center justify-center font-black text-xl text-amber-400 shadow-lg shadow-emerald-950/40">
          PDS
        </div>
        <div>
          <h1 className="font-extrabold text-base text-white leading-tight">Smart Ration Distribution System</h1>
          <p className="text-[11px] text-slate-400">Department of Food & Public Distribution • ISO/IEC/IEEE 29148 Standard</p>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-4">
          {/* Notification Inbox Bell Icon */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs space-y-2 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-white text-sm">Notifications</h4>
                    {unreadCount > 0 && <Badge variant="saffron" size="sm">{unreadCount} New</Badge>}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-emerald-400 font-semibold hover:underline cursor-pointer">
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-slate-500 text-center py-6">No notifications received.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border transition-all ${
                          !n.isRead ? 'bg-slate-950 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h5 className="font-bold text-white text-xs">{n.title}</h5>
                          <span className="text-[10px] text-slate-500">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                  In-App Notification Channel Active (SMS fallback simulated)
                </div>
              </div>
            )}
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-800">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white">{user.name}</p>
              <Badge variant={user.role === 'ADMIN' ? 'saffron' : user.role === 'SHOPKEEPER' ? 'amber' : 'emerald'} size="sm">
                {user.role}
              </Badge>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
