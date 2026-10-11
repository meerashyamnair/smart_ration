import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { QrCode, CheckCircle, AlertTriangle, Printer, ShoppingCart, Users, Calendar, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';

export const ShopkeeperTerminal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TERMINAL' | 'QUEUE'>('TERMINAL');

  // Terminal State
  const [qrToken, setQrToken] = useState('CARD_RC_DELHI_100293_SEED_TOKEN');
  const [manualReference, setManualReference] = useState('');
  const [scanMode, setScanMode] = useState<'QR' | 'MANUAL'>('QR');
  const [verifiedData, setVerifiedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dispenseQty, setDispenseQty] = useState<{ [key: string]: number }>({});
  const [receipt, setReceipt] = useState<any>(null);
  const [stockInfo, setStockInfo] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Shopkeeper Queue Manager State
  const [queueDate, setQueueDate] = useState(new Date().toISOString().split('T')[0]);
  const [shopQueue, setShopQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  useEffect(() => {
    fetchStock();
    fetchQueue();
  }, [queueDate]);

  const fetchStock = async () => {
    try {
      const res = await api.get('/shopkeeper/stock');
      if (res.data.success) setStockInfo(res.data.data);
    } catch (err) {
      console.error('Failed to load shop stock', err);
    }
  };

  const fetchQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await api.get(`/queue/shop-queue?date=${queueDate}`);
      if (res.data.success) setShopQueue(res.data.data.queue);
    } catch (err) {
      console.error('Failed to load shop queue', err);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    setVerifiedData(null);
    setReceipt(null);

    const payload = scanMode === 'QR' ? { qrToken } : { manualReference };

    try {
      const res = await api.post('/distribution/verify-qr', payload);
      if (res.data.success) {
        setVerifiedData(res.data.data);
        const initialQty: { [key: string]: number } = {};
        res.data.data.entitlements.forEach((ent: any) => {
          initialQty[ent.rationItemId] = ent.remainingQuota;
        });
        setDispenseQty(initialQty);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. QR Token / Card Reference invalid or card inactive.');
    } finally {
      setLoading(false);
    }
  };

  const executeDispense = async () => {
    if (!verifiedData) return;
    setShowConfirmModal(false);
    setError('');
    setLoading(true);

    const items = Object.entries(dispenseQty).map(([rationItemId, quantity]) => ({
      rationItemId,
      quantity: Number(quantity)
    })).filter(i => i.quantity > 0);

    try {
      const res = await api.post('/distribution/dispense', {
        beneficiaryId: verifiedData.beneficiary.id,
        verificationMode: scanMode === 'QR' ? 'QR_CODE' : 'MANUAL_OVERRIDE',
        idempotencyKey: `FRONTEND_TXN_${Date.now()}`,
        items
      });
      if (res.data.success) {
        setReceipt(res.data.data);
        fetchStock();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Dispensing failed. Check stock availability or quota limits.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, status: string) => {
    try {
      await api.patch(`/queue/status/${bookingId}`, { status });
      fetchQueue();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Compute total payable amount for modal confirmation
  const totalPayable = verifiedData ? verifiedData.entitlements.reduce((acc: number, ent: any) => {
    const qty = dispenseQty[ent.rationItemId] || 0;
    return acc + (qty * ent.subsidizedPricePerUnit);
  }, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Fair Price Shop Dealer Terminal</h2>
          <p className="text-xs text-slate-400">QR & Manual Reference Verification, Atomic Stock Dispensing & Daily Queue Manager</p>
        </div>

        <div className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('TERMINAL')}
            className={`py-2 px-4 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'TERMINAL' ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dispensing Terminal
          </button>
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`py-2 px-4 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'QUEUE' ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily Queue Manager
          </button>
        </div>
      </div>

      {activeTab === 'TERMINAL' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Verification Scanner Form */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                Beneficiary Verification
              </h3>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setScanMode('QR')}
                  className={`py-1 px-2.5 rounded font-bold transition-all ${scanMode === 'QR' ? 'bg-emerald-700 text-white' : 'text-slate-400'}`}
                >
                  QR Scan
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('MANUAL')}
                  className={`py-1 px-2.5 rounded font-bold transition-all ${scanMode === 'MANUAL' ? 'bg-emerald-700 text-white' : 'text-slate-400'}`}
                >
                  Manual Ref
                </button>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              {scanMode === 'QR' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Scan / Enter QR Token
                  </label>
                  <input
                    type="text"
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    placeholder="CARD_..."
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Enter Ration Card No / Reference
                  </label>
                  <input
                    type="text"
                    value={manualReference}
                    onChange={(e) => setManualReference(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    placeholder="RC_DELHI_100293"
                    required
                  />
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
                {scanMode === 'QR' ? 'Verify QR Code' : 'Verify Ration Card Reference'}
              </Button>
            </form>

            {error && <Alert type="error">{error}</Alert>}

            {/* Current Shop Stock Mini Table */}
            {stockInfo && (
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shop Inventory Stock</h4>
                <div className="space-y-2">
                  {stockInfo.stocks.map((st: any) => (
                    <div key={st.id} className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-300 font-semibold">{st.rationItem?.name}</span>
                      <span className={`font-mono font-bold ${st.quantityAvailable < 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {st.quantityAvailable} {st.rationItem?.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Verification Result & Checkout */}
          <div className="lg:col-span-2 space-y-6">
            {receipt ? (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                  <CheckCircle className="w-6 h-6" />
                  <span>Transaction Successful! Digital Receipt Issued</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span>Ref: {receipt.transactionRef}</span>
                    <span className="text-emerald-400">{new Date(receipt.timestamp).toLocaleString()}</span>
                  </div>
                  <p>Beneficiary: {receipt.beneficiary?.user?.name}</p>
                  <p>Ration Card: {receipt.beneficiary?.rationCard?.rationCardNumber}</p>
                  <div className="space-y-1 pt-2">
                    {receipt.items.map((it: any) => (
                      <div key={it.id} className="flex justify-between text-slate-400">
                        <span>{it.rationItem?.name} x {it.quantityDispensed} {it.rationItem?.unit}</span>
                        <span>₹{it.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-white text-sm">
                    <span>Total Amount Paid:</span>
                    <span className="text-emerald-400">₹{receipt.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <Button variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                  Print Digital Receipt
                </Button>
              </div>
            ) : verifiedData ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-lg">{verifiedData.beneficiary.name}</h3>
                    <p className="text-xs text-slate-400">Ration Card: <span className="font-mono text-emerald-400">{verifiedData.beneficiary.rationCardNumber}</span> | Family Members: {verifiedData.beneficiary.familyMembersCount}</p>
                  </div>
                  <Badge variant="emerald">{verifiedData.beneficiary.category}</Badge>
                </div>

                {verifiedData.verificationMeta?.shopMismatchWarning && (
                  <Alert type="warning">
                    {verifiedData.verificationMeta.shopMismatchWarning}
                  </Alert>
                )}

                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Monthly Entitlement Quota & Dispense Entry</h4>
                <div className="space-y-3">
                  {verifiedData.entitlements.map((ent: any) => (
                    <div key={ent.rationItemId} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950 p-3.5 rounded-xl border border-slate-800 gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{ent.name}</p>
                        <p className="text-xs text-slate-400">
                          Quota: <span className="font-mono text-slate-200">{ent.monthlyQuota} {ent.unit}</span> | Drawn: <span className="font-mono text-amber-400">{ent.alreadyDrawn} {ent.unit}</span> | Available Stock: <span className="font-mono text-emerald-400">{ent.stockAvailable} {ent.unit}</span>
                        </p>
                        <p className="text-xs text-emerald-400 font-semibold mt-0.5">Subsidized Price: ₹{ent.subsidizedPricePerUnit} / {ent.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Dispense:</span>
                        <input
                          type="number"
                          min="0"
                          max={ent.remainingQuota}
                          step="0.5"
                          value={dispenseQty[ent.rationItemId] ?? 0}
                          onChange={(e) => setDispenseQty({ ...dispenseQty, [ent.rationItemId]: Number(e.target.value) })}
                          className="w-24 py-1.5 px-2 bg-slate-900 border border-slate-700 rounded-lg text-right text-sm font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-xs text-slate-400 font-bold">{ent.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="saffron"
                  size="lg"
                  className="w-full"
                  isLoading={loading}
                  icon={<ShoppingCart className="w-5 h-5" />}
                  onClick={() => setShowConfirmModal(true)}
                >
                  Review & Confirm Distribution
                </Button>
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl p-12 text-center text-slate-500 space-y-2">
                <QrCode className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-400">Scan QR token or enter ration card reference to calculate monthly quota and dispense stock.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Daily Queue Manager Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Daily Shop Queue Reservations
            </h3>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Filter Date:</span>
              <input
                type="date"
                value={queueDate}
                onChange={(e) => setQueueDate(e.target.value)}
                className="py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          {queueLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading queue bookings...</div>
          ) : shopQueue.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">No queue reservations for date {queueDate}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Token #</th>
                    <th className="py-3 px-4">Time Slot</th>
                    <th className="py-3 px-4">Beneficiary Name</th>
                    <th className="py-3 px-4">Ration Card No</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {shopQueue.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4 font-mono font-black text-amber-400 text-base">#{b.tokenNumber}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 text-xs">{b.timeSlot}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{b.beneficiary?.user?.name}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 text-xs">{b.beneficiary?.rationCard?.rationCardNumber}</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={b.status === 'BOOKED' ? 'emerald' : b.status === 'COMPLETED' ? 'blue' : 'slate'}
                          size="sm"
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {b.status === 'BOOKED' && (
                          <div className="flex justify-center gap-2">
                            <Button variant="primary" size="sm" onClick={() => handleStatusUpdate(b.id, 'COMPLETED')}>
                              Complete
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusUpdate(b.id, 'MISSED')}>
                              Missed
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Distribution Confirmation Modal */}
      {showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirm Ration Distribution & Stock Deduction"
        >
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Beneficiary:</span>
                <span className="text-white font-bold">{verifiedData?.beneficiary?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Card Number:</span>
                <span className="text-emerald-400 font-bold">{verifiedData?.beneficiary?.rationCardNumber}</span>
              </div>
              <div className="space-y-1 pt-2">
                <p className="text-slate-400 uppercase tracking-wider font-bold mb-1">Items to Dispense:</p>
                {verifiedData?.entitlements.map((ent: any) => {
                  const qty = dispenseQty[ent.rationItemId] || 0;
                  if (qty <= 0) return null;
                  return (
                    <div key={ent.rationItemId} className="flex justify-between text-slate-300">
                      <span>{ent.name} ({qty} {ent.unit} @ ₹{ent.subsidizedPricePerUnit})</span>
                      <span className="font-bold">₹{(qty * ent.subsidizedPricePerUnit).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm text-white font-bold">
                <span>Total Amount Due:</span>
                <span className="text-emerald-400">₹{totalPayable.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              This action will atomically deduct shop stock inventory, log a security audit event, record the transaction, and issue a digital receipt.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
              <Button variant="saffron" isLoading={loading} onClick={executeDispense}>
                Confirm & Issue Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
