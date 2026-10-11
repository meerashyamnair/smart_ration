import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Send, CheckCircle2, Clock, Filter, MessageSquare, ShieldCheck, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';

export const ComplaintsPage: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [category, setCategory] = useState('Short Weight');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Admin Filter & Resolution Modal State
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState('RESOLVED');
  const [adminNotes, setAdminNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const endpoint = user?.role === 'ADMIN' ? '/complaints/all' : '/complaints/my-complaints';
      const res = await api.get(endpoint);
      if (res.data.success) setComplaints(res.data.data);
    } catch (err) {
      console.error('Failed to fetch complaints', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await api.post('/complaints/submit', {
        fpsShopId: user?.beneficiary?.rationCard?.rationShopId || 'fps-1',
        category,
        subject,
        description,
        transactionRef: transactionRef || undefined
      });

      if (res.data.success) {
        setMessage(`Grievance ticket created! Ticket Ref: #${res.data.data.ticketId}`);
        setSubject('');
        setDescription('');
        setTransactionRef('');
        fetchComplaints();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const openResolveModal = (ticket: any) => {
    setSelectedTicket(ticket);
    setAdminStatus(ticket.status === 'SUBMITTED' ? 'UNDER_REVIEW' : 'RESOLVED');
    setAdminNotes(ticket.adminResponse || '');
    setIsResolveModalOpen(true);
  };

  const handleAdminResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setIsResolving(true);

    try {
      const res = await api.patch(`/complaints/${selectedTicket.id}/resolve`, {
        status: adminStatus,
        adminResponse: adminNotes
      });

      if (res.data.success) {
        setIsResolveModalOpen(false);
        fetchComplaints();
      }
    } catch (err: any) {
      console.error('Failed to update ticket status', err);
    } finally {
      setIsResolving(false);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Grievance & Complaint Portal</h2>
          <p className="text-xs text-slate-400">File & track public distribution grievances with administrative resolution</p>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Beneficiary Submission Form */}
        {user?.role === 'BENEFICIARY' && (
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" /> Lodge a Grievance
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Grievance Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'Short Weight', label: 'Short Weight / Ration Under-Quantity' },
                  { value: 'Quality Issue', label: 'Substandard Quality / Contamination' },
                  { value: 'Shop Closed', label: 'FPS Shop Unauthorized Closure' },
                  { value: 'Overcharging', label: 'Overcharging above Subsidized Rate' },
                  { value: 'Behavioral Misconduct', label: 'Dealer Misconduct or Harassment' }
                ]}
              />

              <Input
                label="Subject Summary"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of issue"
                required
              />

              <Input
                label="Transaction Ref (Optional)"
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="TXN_1791028374..."
              />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Detailed Incident Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Provide date, time, quantity deficit, and incident details..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {error && <Alert type="error">{error}</Alert>}
              {message && <Alert type="success">{message}</Alert>}

              <Button
                type="submit"
                variant="saffron"
                size="lg"
                className="w-full"
                isLoading={loading}
                icon={<Send className="w-4 h-4" />}
              >
                Submit Grievance Ticket
              </Button>
            </form>
          </div>
        )}

        {/* Complaints List / Registry */}
        <div className={user?.role === 'BENEFICIARY' ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" /> Grievance Ticket Registry
              </h3>
              <span className="text-xs text-slate-400 font-mono">Showing {filteredComplaints.length} tickets</span>
            </div>

            <div className="space-y-4">
              {filteredComplaints.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p>No grievance tickets found for current filters.</p>
                </div>
              ) : (
                filteredComplaints.map((c) => (
                  <div key={c.id} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 transition-all hover:border-slate-700">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">{c.ticketId}</span>
                        <span className="text-xs text-slate-400">• {c.category}</span>
                      </div>
                      <Badge
                        variant={
                          c.status === 'SUBMITTED'
                            ? 'amber'
                            : c.status === 'UNDER_REVIEW'
                            ? 'blue'
                            : c.status === 'RESOLVED'
                            ? 'emerald'
                            : 'rose'
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm">{c.subject}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{c.description}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-900 pt-2">
                      <span>FPS Shop: <strong className="text-slate-300">{c.fpsShop?.shopName}</strong></span>
                      <span>Filed: {new Date(c.createdAt).toLocaleString()}</span>
                    </div>

                    {/* Official Resolution Response */}
                    {c.adminResponse && (
                      <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg text-xs text-emerald-300 space-y-1">
                        <span className="font-bold uppercase text-[10px] text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Official Administrative Resolution Note:
                        </span>
                        <p className="leading-relaxed">{c.adminResponse}</p>
                      </div>
                    )}

                    {/* Admin Action Button */}
                    {user?.role === 'ADMIN' && (
                      <div className="pt-2 flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => openResolveModal(c)}>
                          Manage Ticket & Add Resolution
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Ticket Resolution Modal */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title={`Resolve Grievance #${selectedTicket?.ticketId}`}
      >
        {selectedTicket && (
          <form onSubmit={handleAdminResolve} className="space-y-4 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <p className="font-bold text-white text-sm">{selectedTicket.subject}</p>
              <p className="text-slate-400">{selectedTicket.description}</p>
            </div>

            <Select
              label="Update Ticket Status"
              value={adminStatus}
              onChange={(e) => setAdminStatus(e.target.value)}
              options={[
                { value: 'UNDER_REVIEW', label: 'UNDER_REVIEW (Under Official Inspection)' },
                { value: 'RESOLVED', label: 'RESOLVED (Grievance Resolved & Action Taken)' },
                { value: 'REJECTED', label: 'REJECTED (Invalid or Duplicate Claim)' }
              ]}
            />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Official Resolution Notes & Administrative Remarks
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                placeholder="Detail inspector findings, dealer warnings, or stock compensation..."
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsResolveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isResolving}>
                Save Resolution Note
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
