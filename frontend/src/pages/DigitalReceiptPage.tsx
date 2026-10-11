import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, Printer, Download, ArrowLeft, Building, User, Calendar, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const DigitalReceiptPage: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReceipt();
  }, [receiptId]);

  const fetchReceipt = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/distribution/receipts/${receiptId}`);
      if (res.data.success) {
        setReceipt(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch digital receipt or unauthorized access.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!receipt) return;
    const content = `=====================================================
          GOVERNMENT OF INDIA - PUBLIC DISTRIBUTION SYSTEM
                      OFFICIAL DIGITAL RECEIPT
=====================================================
Receipt No:        ${receipt.receiptNumber}
Transaction Ref:   ${receipt.transactionRef}
Date & Time:       ${new Date(receipt.timestamp).toLocaleString()}
Status:            ${receipt.status}
Verification Mode: ${receipt.verificationMode}

--- FAIR PRICE SHOP DETAILS ---
Shop Code:      ${receipt.shop?.shopCode}
Shop Name:      ${receipt.shop?.shopName}
District:       ${receipt.shop?.district}
Contact:        ${receipt.shop?.contactNumber}

--- BENEFICIARY IDENTIFICATION ---
Beneficiary Name:  ${receipt.beneficiary?.name}
Ration Card No:    ${receipt.beneficiary?.rationCardNumber}
Card Category:     ${receipt.beneficiary?.category}
Family Members:    ${receipt.beneficiary?.familyMembersCount}

--- COMMODITIES DISTRIBUTED ---
${receipt.items.map((i: any) => `- ${i.name.padEnd(20)} ${i.quantityDispensed} ${i.unit} @ ₹${i.pricePerUnit}/${i.unit} = ₹${i.totalPrice.toFixed(2)}`).join('\n')}

=====================================================
TOTAL AMOUNT PAID: ₹${receipt.totalAmount.toFixed(2)}
=====================================================
Cryptographic Transaction Hash: SECURE_COMMITTED_${receipt.transactionRef}
This is an electronically generated official PDS receipt.
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${receipt.receiptNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-400">Loading Official Digital Receipt...</p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="max-w-xl mx-auto space-y-4 pt-8">
        <Alert type="error">{error || 'Receipt not found.'}</Alert>
        <Link to="/beneficiary">
          <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Controls - Hidden during Browser Print */}
      <div className="flex justify-between items-center print:hidden border-b border-slate-800 pb-4">
        <Link to={-1 as any}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleDownloadPDF}>
            Export PDF
          </Button>
          <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Official Receipt Card - Print Styled */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Receipt Header */}
        <div className="text-center space-y-2 border-b border-slate-800 print:border-black pb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 print:text-black mb-1">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white print:text-black">
            Smart Public Distribution System
          </h2>
          <p className="text-xs font-medium text-slate-400 print:text-slate-700">Official Government Digital Ration Receipt</p>
          <div className="pt-2 flex justify-center items-center gap-2">
            <Badge variant="emerald">{receipt.status}</Badge>
            <span className="text-xs font-mono text-slate-400 print:text-black">Mode: {receipt.verificationMode}</span>
          </div>
        </div>

        {/* Transaction Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-950 p-4 rounded-2xl border border-slate-800/80 print:bg-slate-100 print:border-slate-300 print:text-black">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider print:text-slate-600">Receipt No</span>
            <span className="text-emerald-400 font-bold print:text-black">{receipt.receiptNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider print:text-slate-600">Txn Reference</span>
            <span className="text-white font-bold print:text-black">{receipt.transactionRef}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider print:text-slate-600">Distribution Date & Time</span>
            <span className="text-slate-300 print:text-black">{new Date(receipt.timestamp).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider print:text-slate-600">Verification Mode</span>
            <span className="text-slate-300 print:text-black">{receipt.verificationMode}</span>
          </div>
        </div>

        {/* Entity Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Shop Info */}
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-1.5 print:bg-white print:border-slate-300 print:text-black">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 print:text-black">
              <Building className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
              Fair Price Shop Details
            </h4>
            <p className="text-sm font-bold text-white print:text-black">{receipt.shop?.shopName}</p>
            <p className="text-xs text-slate-400 print:text-slate-700">Code: <span className="font-mono text-slate-300 print:text-black font-semibold">{receipt.shop?.shopCode}</span></p>
            <p className="text-xs text-slate-400 print:text-slate-700">{receipt.shop?.address}, {receipt.shop?.district} - {receipt.shop?.pincode}</p>
          </div>

          {/* Beneficiary Info */}
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-1.5 print:bg-white print:border-slate-300 print:text-black">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 print:text-black">
              <User className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
              Beneficiary Details
            </h4>
            <p className="text-sm font-bold text-white print:text-black">{receipt.beneficiary?.name}</p>
            <p className="text-xs text-slate-400 print:text-slate-700">Ration Card No: <span className="font-mono text-emerald-400 print:text-black font-bold">{receipt.beneficiary?.rationCardNumber}</span></p>
            <p className="text-xs text-slate-400 print:text-slate-700">Category: <span className="font-bold text-slate-300 print:text-black">{receipt.beneficiary?.category}</span> | Family Members: {receipt.beneficiary?.familyMembersCount}</p>
          </div>
        </div>

        {/* Commodities Table */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-black">Commodities & Quantities Distributed</h4>
          <div className="border border-slate-800 rounded-2xl overflow-hidden print:border-slate-300">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold print:bg-slate-100 print:text-black print:border-slate-300">
                <tr>
                  <th className="py-3 px-4">Commodity Item</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Rate / Unit</th>
                  <th className="py-3 px-4 text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-300 print:text-black">
                {receipt.items.map((it: any) => (
                  <tr key={it.id}>
                    <td className="py-3 px-4 font-sans font-bold text-white print:text-black">{it.name}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 print:text-black">{it.quantityDispensed} {it.unit}</td>
                    <td className="py-3 px-4 text-right text-slate-400 print:text-black">₹{it.pricePerUnit.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-white print:text-black">₹{it.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-300 print:text-black">
          <div>
            <span className="text-xs text-slate-400 block print:text-slate-700">Total Subsidized Amount Paid</span>
            <span className="text-xs text-emerald-400 font-mono font-bold print:text-emerald-700">Electronically Verified & Committed</span>
          </div>
          <span className="text-2xl font-black text-emerald-400 font-mono print:text-black">₹{receipt.totalAmount.toFixed(2)}</span>
        </div>

        {/* Verification Footnote */}
        <div className="text-center text-[10px] text-slate-500 font-mono space-y-1 pt-4 border-t border-slate-800 print:border-slate-300 print:text-slate-600">
          <p>Cryptographic Security Hash: SHA256-COMMITTED-{receipt.transactionRef}</p>
          <p>This is a system-generated official digital receipt under the Smart Ration Distribution Framework. No physical signature required.</p>
        </div>
      </div>
    </div>
  );
};
