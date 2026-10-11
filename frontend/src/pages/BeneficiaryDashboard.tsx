import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, ShoppingBag, ShieldCheck, Printer, History, Edit3, UserCheck, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Alert } from '../components/ui/Alert';

export const BeneficiaryDashboard: React.FC = () => {
  const [card, setCard] = useState<any>(null);
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    fetchBeneficiaryData();
  }, []);

  const fetchBeneficiaryData = async () => {
    setLoading(true);
    try {
      const [cardRes, entRes, txnsRes] = await Promise.all([
        api.get('/beneficiary/ration-card'),
        api.get('/beneficiary/entitlements'),
        api.get('/beneficiary/transactions')
      ]);

      if (cardRes.data.success) {
        setCard(cardRes.data.data);
        setEditPhone(cardRes.data.data.user?.phone || '');
        setEditAddress(cardRes.data.data.address || '');
      }
      if (entRes.data.success) setEntitlements(entRes.data.data);
      if (txnsRes.data.success) setTransactions(txnsRes.data.data);
    } catch (err) {
      console.error('Failed to load beneficiary dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMsg('');

    try {
      const res = await api.patch('/beneficiary/profile', {
        phone: editPhone,
        address: editAddress
      });
      if (res.data.success) {
        setUpdateMsg('Profile updated successfully!');
        fetchBeneficiaryData();
        setTimeout(() => setIsEditModalOpen(false), 1500);
      }
    } catch (err: any) {
      setUpdateMsg(err.response?.data?.message || 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const openReceipt = async (txnId: string) => {
    try {
      const res = await api.get(`/beneficiary/transactions/${txnId}/receipt`);
      if (res.data.success) {
        setSelectedReceipt(res.data.data);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load transaction receipt', err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-semibold">Loading Beneficiary Profile & Quota Balance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Beneficiary Portal</h2>
            {card && <Badge variant="emerald">{card.category} Card</Badge>}
          </div>
          <p className="text-xs text-slate-400 mt-1">National Public Distribution System • Personal Ration Quota</p>
        </div>

        <Button variant="outline" size="sm" icon={<Edit3 className="w-4 h-4" />} onClick={() => setIsEditModalOpen(true)}>
          Edit Contact Info
        </Button>
      </div>

      {card && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Digital Ration Card Visual */}
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
                <div>
                  <span className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase block">Digital PDS Card</span>
                  <h3 className="font-extrabold text-white text-lg">{card.user?.name}</h3>
                </div>
                <Badge variant="saffron" size="sm">{card.status}</Badge>
              </div>

              {/* Cryptographic QR Token Display */}
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 my-2">
                <QRCodeSVG value={card.qrToken} size={150} level="H" includeMargin={true} />
                <p className="mt-3 text-xs font-mono text-emerald-400 tracking-wider font-bold">{card.rationCardNumber}</p>
                <span className="text-[10px] text-slate-500 mt-0.5">Opaque Signed Reference Token</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-4 mt-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Family Size:</span>
                <span className="font-semibold text-white">{card.familyMembersCount} Members</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Shop:</span>
                <span className="font-semibold text-white truncate max-w-[180px]">{card.fpsShop?.shopName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shop Code:</span>
                <span className="font-mono text-cyan-400">{card.fpsShop?.shopCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono text-slate-300">{card.user?.phone}</span>
              </div>
            </div>
          </div>

          {/* Active Monthly Entitlements */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-lg">Active Monthly Entitlement Balance</h3>
                <p className="text-xs text-slate-400">Quota calculation cycle: October 2026</p>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" /> Active Quota
              </span>
            </div>

            {entitlements.length === 0 ? (
              <Alert type="info" title="No Entitlements Found">
                There are no active entitlement rules configured for your card category this month.
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold tracking-wider">
                      <th className="py-3 px-3">Commodity</th>
                      <th className="py-3 px-3 text-right">Eligible Quota</th>
                      <th className="py-3 px-3 text-right">Claimed</th>
                      <th className="py-3 px-3 text-right">Remaining</th>
                      <th className="py-3 px-3 text-right">Subsidized Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {entitlements.map((ent) => (
                      <tr key={ent.id} className="hover:bg-slate-800/40 transition-all">
                        <td className="py-3.5 px-3 font-semibold text-white flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-emerald-400" />
                          {ent.item?.name}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-300">
                          {ent.totalEligibleQuota} {ent.item?.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-amber-400">
                          {ent.claimedQuantity} {ent.item?.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400 text-base">
                          {ent.remainingQuantity} {ent.item?.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-400 text-xs">
                          ₹{ent.subsidizedPricePerUnit} / {ent.item?.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Distribution Transaction History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-lg">Distribution Transaction History</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Total Completed: {transactions.length}</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium">No past transactions found for this ration card.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">FPS Shop</th>
                  <th className="py-3 px-4">Items Claimed</th>
                  <th className="py-3 px-4 text-right">Total Subsidized Amount</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{txn.transactionRef}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-300 font-mono">
                      {new Date(txn.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{txn.rationShop?.shopName}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {txn.items.map((i: any) => `${i.rationItem?.name} (${i.quantityDispensed} ${i.rationItem?.unit})`).join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                      ₹{txn.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Button variant="outline" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => openReceipt(txn.id)}>
                        Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Permitted Profile Information"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <Alert type="info">
            Note: Entitlement category, family count, and eligibility status can only be updated by a State PDS Administrator.
          </Alert>

          {updateMsg && (
            <Alert type={updateMsg.includes('successfully') ? 'success' : 'error'}>{updateMsg}</Alert>
          )}

          <Input
            label="Mobile Phone Number"
            type="text"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            required
          />

          <Input
            label="Residential Address"
            type="text"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Digital Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Official Digital PDS Receipt"
        size="lg"
      >
        {selectedReceipt && (
          <div className="space-y-4 font-sans">
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-4 font-mono text-xs text-slate-300">
              <div className="text-center pb-3 border-b border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Government of India • PDS Receipt</span>
                <h4 className="font-bold text-white text-base">{selectedReceipt.shopName}</h4>
                <p className="text-slate-500">Shop Code: {selectedReceipt.shopCode}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Receipt No:</span>
                  <span className="text-emerald-400 font-bold">{selectedReceipt.receiptNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Transaction Ref:</span>
                  <span className="text-white font-bold">{selectedReceipt.transactionRef}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Beneficiary:</span>
                  <span className="text-white">{selectedReceipt.beneficiaryName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ration Card No:</span>
                  <span className="text-white">{selectedReceipt.rationCardNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Verification Mode:</span>
                  <span className="text-amber-400">{selectedReceipt.verificationMode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date & Time:</span>
                  <span className="text-slate-300">{new Date(selectedReceipt.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2">
                <p className="font-bold text-white text-xs uppercase">Ration Item Breakdown</p>
                {selectedReceipt.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span>{it.name} x {it.quantity} {it.unit} @ ₹{it.price}/{it.unit}</span>
                    <span className="font-bold text-white">₹{it.total.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-emerald-400 text-sm">
                  <span>Total Subsidized Amount:</span>
                  <span>₹{selectedReceipt.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link to={`/receipts/${selectedReceipt.transactionRef}`}>
                <Button variant="outline" size="sm">
                  View Full Receipt Page
                </Button>
              </Link>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsReceiptModalOpen(false)}>
                  Close
                </Button>
                <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
