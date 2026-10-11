import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart2, Download, Filter, Calendar, Building, Package, AlertTriangle, CheckCircle, RefreshCw, Database
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const ReportsAndAnalyticsPage: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedShop, setSelectedShop] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Dropdown list options
  const [shops, setShops] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);

  useEffect(() => {
    fetchOptions();
    fetchReport();
  }, []);

  const fetchOptions = async () => {
    try {
      const [shopsRes, commRes] = await Promise.all([
        api.get('/admin/shops'),
        api.get('/admin/commodities')
      ]);
      if (shopsRes.data.success) setShops(shopsRes.data.data);
      if (commRes.data.success) setCommodities(commRes.data.data);
    } catch (err) {
      console.error('Failed to load filter options', err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (selectedShop) params.append('shopId', selectedShop);
    if (selectedCommodity) params.append('commodityId', selectedCommodity);
    if (selectedStatus) params.append('status', selectedStatus);

    try {
      const res = await api.get(`/admin/reports?${params.toString()}`);
      if (res.data.success) {
        setReportData(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate report data.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/admin/reports/export-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PDS_Analytics_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export CSV report.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-emerald-400" /> Administrative Reports & Analytics
          </h2>
          <p className="text-xs text-slate-400">Database-backed aggregations, commodity distribution trends, shop performance & complaint statistics</p>
        </div>

        <Button variant="saffron" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
          Export Sanitized CSV
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-400" /> Custom Report Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Fair Price Shop</label>
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white"
            >
              <option value="">All Shops</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.shopName} ({s.shopCode})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Commodity</label>
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white"
            >
              <option value="">All Commodities</option>
              {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Txn Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={() => {
            setStartDate(''); setEndDate(''); setSelectedShop(''); setSelectedCommodity(''); setSelectedStatus('');
            fetchReport();
          }}>
            Reset Filters
          </Button>
          <Button variant="primary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={fetchReport}>
            Apply Filters
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold">Generating Database Aggregations & Analytics...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Data Source Provenance Badge */}
          <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" /> Data Source: <strong className="text-emerald-400 font-mono">Real-Time Database Committed Transactions</strong>
            </span>
            <span className="text-slate-500 font-mono text-[10px]">Generated At: {new Date(reportData.reportMeta.generatedAt).toLocaleString()}</span>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 space-y-1">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Transactions</span>
              <p className="text-3xl font-black text-white">{reportData.data.summary.totalTransactions}</p>
            </Card>
            <Card className="p-5 space-y-1">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Subsidized Value</span>
              <p className="text-3xl font-black text-emerald-400 font-mono">₹{reportData.data.summary.totalSubsidizedAmount.toFixed(2)}</p>
            </Card>
            <Card className="p-5 space-y-1">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Low Stock Inventory Alerts</span>
              <p className="text-3xl font-black text-amber-400">{reportData.data.summary.lowStockCount}</p>
            </Card>
          </div>

          {/* Commodity Distribution Breakdown Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" /> Quantities Distributed by Commodity Master
            </h3>
            {reportData.data.quantitiesByCommodity.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No distribution transactions recorded for the selected filter criteria.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Commodity Item</th>
                      <th className="py-3 px-4 text-right">Total Dispenses</th>
                      <th className="py-3 px-4 text-right">Total Quantity Distributed</th>
                      <th className="py-3 px-4 text-right">Aggregate Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {reportData.data.quantitiesByCommodity.map((c: any) => (
                      <tr key={c.rationItemId} className="hover:bg-slate-800/40 transition-all">
                        <td className="py-3.5 px-4 font-sans font-semibold text-white">{c.name}</td>
                        <td className="py-3.5 px-4 text-right text-slate-300">{c.dispenseCount}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400">{c.totalQuantityDispensed.toFixed(2)} {c.unit}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-white">₹{c.totalValue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Shop-Wise Comparison & Complaint Volume Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shop Comparisons */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-400" /> Fair Price Shop Distribution Comparisons
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                      <th className="py-2.5 px-3">Shop Code</th>
                      <th className="py-2.5 px-3">Shop Name</th>
                      <th className="py-2.5 px-3 text-right">Txn Count</th>
                      <th className="py-2.5 px-3 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reportData.data.shopComparisons.map((sc: any) => (
                      <tr key={sc.shopId}>
                        <td className="py-3 px-3 font-bold text-purple-400">{sc.shopCode}</td>
                        <td className="py-3 px-3 font-sans font-semibold text-white">{sc.shopName}</td>
                        <td className="py-3 px-3 text-right text-slate-300">{sc.transactionCount}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">₹{sc.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Complaint Volume & Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Grievance & Complaint Volume Status
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1 font-semibold">Submitted</span>
                  <span className="text-2xl font-black text-amber-400">{reportData.data.complaintStats.SUBMITTED}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1 font-semibold">Under Review</span>
                  <span className="text-2xl font-black text-cyan-400">{reportData.data.complaintStats.UNDER_REVIEW}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1 font-semibold">Resolved</span>
                  <span className="text-2xl font-black text-emerald-400">{reportData.data.complaintStats.RESOLVED}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1 font-semibold">Rejected</span>
                  <span className="text-2xl font-black text-rose-400">{reportData.data.complaintStats.REJECTED}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Failed / Rejected Distribution Transactions */}
          {reportData.data.failedTransactions.length > 0 && (
            <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Recorded Failed / Rejected Distribution Attempts
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                      <th className="py-2.5 px-3">Txn Ref</th>
                      <th className="py-2.5 px-3">FPS Shop</th>
                      <th className="py-2.5 px-3">Beneficiary</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reportData.data.failedTransactions.map((ft: any) => (
                      <tr key={ft.id}>
                        <td className="py-3 px-3 text-rose-400 font-bold">{ft.transactionRef}</td>
                        <td className="py-3 px-3 font-sans text-white">{ft.shopName}</td>
                        <td className="py-3 px-3 font-sans text-slate-300">{ft.beneficiaryName}</td>
                        <td className="py-3 px-3"><Badge variant="amber">{ft.status}</Badge></td>
                        <td className="py-3 px-3 text-slate-400">{new Date(ft.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
