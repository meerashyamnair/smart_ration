import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users, Store, FileText, AlertCircle, TrendingUp, ShieldCheck,
  Package, Plus, Settings, CheckCircle2, UserCheck, Search, Filter, RefreshCw
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BENEFICIARIES' | 'SHOPS' | 'COMMODITIES' | 'ENTITLEMENTS' | 'USERS' | 'AUDIT'>('OVERVIEW');

  // Overview Stats
  const [stats, setStats] = useState<any>(null);
  const [periodDays, setPeriodDays] = useState('30');
  const [loading, setLoading] = useState(true);

  // Beneficiary Management
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [benSearch, setBenSearch] = useState('');
  const [benCategoryFilter, setBenCategoryFilter] = useState('');
  const [selectedBen, setSelectedBen] = useState<any>(null);
  const [editCategory, setEditCategory] = useState('BPL');
  const [editMembers, setEditMembers] = useState(1);
  const [editCardStatus, setEditCardStatus] = useState('ACTIVE');
  const [isBenModalOpen, setIsBenModalOpen] = useState(false);

  // Shops & Assignment
  const [shops, setShops] = useState<any[]>([]);
  const [isNewShopModalOpen, setIsNewShopModalOpen] = useState(false);
  const [newShopCode, setNewShopCode] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [newShopDistrict, setNewShopDistrict] = useState('Central');
  const [newShopPincode, setNewShopPincode] = useState('');
  const [newShopContact, setNewShopContact] = useState('');

  // Commodities Master Data
  const [commodities, setCommodities] = useState<any[]>([]);
  const [isCommodityModalOpen, setIsCommodityModalOpen] = useState(false);
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('KG');
  const [itemPrice, setItemPrice] = useState('');

  // Entitlement Policy Rules
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [effectiveMonthYear, setEffectiveMonthYear] = useState('10-2026');
  const [isEntitlementModalOpen, setIsEntitlementModalOpen] = useState(false);
  const [entCategory, setEntCategory] = useState('BPL');
  const [entItemId, setEntItemId] = useState('');
  const [quotaMember, setQuotaMember] = useState('5');
  const [quotaFlat, setQuotaFlat] = useState('0');
  const [subsidizedPrice, setSubsidizedPrice] = useState('3');

  // User Accounts & Audit Logs
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, [periodDays]);

  useEffect(() => {
    if (activeTab === 'BENEFICIARIES') fetchBeneficiaries();
    if (activeTab === 'SHOPS') fetchShops();
    if (activeTab === 'COMMODITIES') fetchCommodities();
    if (activeTab === 'ENTITLEMENTS') fetchEntitlements();
    if (activeTab === 'USERS') fetchUsers();
    if (activeTab === 'AUDIT') fetchAuditLogs();
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/dashboard-stats?periodDays=${periodDays}`);
      if (res.data.success) setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBeneficiaries = async () => {
    try {
      const res = await api.get(`/admin/beneficiaries?search=${benSearch}&category=${benCategoryFilter}`);
      if (res.data.success) setBeneficiaries(res.data.data);
    } catch (err) {
      console.error('Failed to fetch beneficiaries', err);
    }
  };

  const fetchShops = async () => {
    try {
      const res = await api.get('/admin/shops');
      if (res.data.success) setShops(res.data.data);
    } catch (err) {
      console.error('Failed to fetch shops', err);
    }
  };

  const fetchCommodities = async () => {
    try {
      const res = await api.get('/admin/commodities');
      if (res.data.success) {
        setCommodities(res.data.data);
        if (res.data.data.length > 0 && !entItemId) setEntItemId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch commodities', err);
    }
  };

  const fetchEntitlements = async () => {
    try {
      const res = await api.get(`/admin/entitlements?monthYear=${effectiveMonthYear}`);
      if (res.data.success) setEntitlements(res.data.data);
    } catch (err) {
      console.error('Failed to fetch entitlements', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) setUsers(res.data.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data.success) setAuditLogs(res.data.data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    }
  };

  const handleUpdateBeneficiaryStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBen) return;
    try {
      const res = await api.patch(`/admin/beneficiaries/${selectedBen.id}/status`, {
        status: editCardStatus,
        category: editCategory,
        familyMembersCount: Number(editMembers)
      });
      if (res.data.success) {
        setActionMsg('Beneficiary eligibility status updated successfully.');
        setIsBenModalOpen(false);
        fetchBeneficiaries();
      }
    } catch (err: any) {
      setActionMsg(err.response?.data?.message || 'Update failed.');
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/shops', {
        shopCode: newShopCode,
        shopName: newShopName,
        address: newShopAddress,
        district: newShopDistrict,
        pincode: newShopPincode,
        contactNumber: newShopContact
      });
      if (res.data.success) {
        setIsNewShopModalOpen(false);
        fetchShops();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Shop creation failed.');
    }
  };

  const handleCreateCommodity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/commodities', {
        itemCode,
        name: itemName,
        unit: itemUnit,
        standardPricePerUnit: Number(itemPrice)
      });
      if (res.data.success) {
        setIsCommodityModalOpen(false);
        fetchCommodities();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Commodity creation failed.');
    }
  };

  const handleUpdateEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/entitlements', {
        category: entCategory,
        rationItemId: entItemId,
        quotaPerMember: Number(quotaMember),
        quotaFlatPerCard: Number(quotaFlat),
        subsidizedPricePerUnit: Number(subsidizedPrice),
        effectiveMonthYear
      });
      if (res.data.success) {
        setIsEntitlementModalOpen(false);
        fetchEntitlements();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Entitlement rule update failed.');
    }
  };

  const handleToggleUserStatus = async (userId: string, newStatus: string) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Status toggle failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Central PDS Administration Portal</h2>
          <p className="text-xs text-slate-400">Public Distribution System Governance, Master Data, Entitlement Policy & Security Auditing</p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'OVERVIEW', label: 'Overview' },
            { id: 'BENEFICIARIES', label: 'Beneficiaries' },
            { id: 'SHOPS', label: 'FPS Shops' },
            { id: 'COMMODITIES', label: 'Commodities' },
            { id: 'ENTITLEMENTS', label: 'Policy Rules' },
            { id: 'USERS', label: 'Users' },
            { id: 'AUDIT', label: 'Audit Logs' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-1.5 px-3 rounded-lg font-bold transition-all ${
                activeTab === tab.id ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {actionMsg && <Alert type="info">{actionMsg}</Alert>}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Key Performance Indicators
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Period:</span>
              <select
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                className="py-1.5 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Total Beneficiaries</p>
                  <h3 className="text-2xl font-black text-white">{stats.totalBeneficiaries}</h3>
                </div>
              </Card>

              <Card className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Active FPS Shops</p>
                  <h3 className="text-2xl font-black text-white">{stats.activeShops} / {stats.totalShops}</h3>
                </div>
              </Card>

              <Card className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Period Distribution</p>
                  <h3 className="text-2xl font-black text-white">₹{stats.totalRationDistributedAmount.toFixed(2)}</h3>
                  <p className="text-[10px] text-slate-500">{stats.recentPeriodTransactions} Transactions</p>
                </div>
              </Card>

              <Card className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Open Grievances</p>
                  <h3 className="text-2xl font-black text-white">{stats.unresolvedComplaints}</h3>
                </div>
              </Card>
            </div>
          )}

          {/* Low Stock Alerts & Commodity Overview Grid */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Warnings */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" /> Low-Stock Inventory Alerts
                  </h4>
                  <Badge variant="amber">{stats.lowStockAlertsCount} Alert(s)</Badge>
                </div>
                {stats.lowStockItems.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">All Fair Price Shops have healthy stock levels (&ge; 100 units).</p>
                ) : (
                  <div className="space-y-2">
                    {stats.lowStockItems.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                        <div>
                          <p className="font-semibold text-white">{item.shopName} ({item.shopCode})</p>
                          <p className="text-slate-400">{item.itemName}</p>
                        </div>
                        <span className="font-mono font-bold text-rose-400">{item.quantityAvailable} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Commodity Stock Aggregate */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h4 className="font-bold text-white text-base border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" /> Network Stock Reserves Overview
                </h4>
                <div className="space-y-2">
                  {stats.commodityStock.map((cs: any) => (
                    <div key={cs.rationItemId} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                      <span className="font-semibold text-white">{cs.name}</span>
                      <span className="font-mono font-bold text-emerald-400">{cs.totalStock.toFixed(2)} {cs.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. BENEFICIARIES TAB */}
      {activeTab === 'BENEFICIARIES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Beneficiary Eligibility Directory
            </h3>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={benSearch}
                onChange={(e) => setBenSearch(e.target.value)}
                placeholder="Search name, card #..."
                className="py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              />
              <select
                value={benCategoryFilter}
                onChange={(e) => setBenCategoryFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              >
                <option value="">All Categories</option>
                <option value="BPL">BPL</option>
                <option value="AAY">AAY</option>
                <option value="APL">APL</option>
              </select>
              <Button variant="secondary" size="sm" onClick={fetchBeneficiaries}>Search</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Beneficiary</th>
                  <th className="py-3 px-4">Ration Card No</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Family Size</th>
                  <th className="py-3 px-4">Assigned FPS Shop</th>
                  <th className="py-3 px-4">Card Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {beneficiaries.map((ben) => (
                  <tr key={ben.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {ben.user?.name}
                      <span className="block text-xs font-normal text-slate-400">{ben.user?.email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold text-xs">{ben.rationCard?.rationCardNumber}</td>
                    <td className="py-3.5 px-4"><Badge variant="emerald">{ben.rationCard?.category}</Badge></td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{ben.rationCard?.familyMembersCount} Members</td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs">{ben.rationCard?.rationShop?.shopName}</td>
                    <td className="py-3.5 px-4"><Badge variant={ben.rationCard?.status === 'ACTIVE' ? 'emerald' : 'amber'}>{ben.rationCard?.status}</Badge></td>
                    <td className="py-3.5 px-4 text-center">
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedBen(ben);
                        setEditCategory(ben.rationCard.category);
                        setEditMembers(ben.rationCard.familyMembersCount);
                        setEditCardStatus(ben.rationCard.status);
                        setIsBenModalOpen(true);
                      }}>
                        Edit Eligibility
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SHOPS TAB */}
      {activeTab === 'SHOPS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" /> Fair Price Shop Master Directory
            </h3>
            <Button variant="saffron" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsNewShopModalOpen(true)}>
              Register FPS Shop
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Shop Code</th>
                  <th className="py-3 px-4">Shop Name</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4">Dealer / Operator</th>
                  <th className="py-3 px-4 text-right">Beneficiaries</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{shop.shopCode}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{shop.shopName}</td>
                    <td className="py-3.5 px-4 text-slate-300">{shop.district}</td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs">{shop.shopkeepers?.[0]?.user?.name || 'Unassigned'}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">{shop._count?.rationCards || 0}</td>
                    <td className="py-3.5 px-4 text-center"><Badge variant="emerald">{shop.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. COMMODITIES TAB */}
      {activeTab === 'COMMODITIES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" /> Commodity Master Catalog
            </h3>
            <Button variant="saffron" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsCommodityModalOpen(true)}>
              Add Commodity Master
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Commodity Name</th>
                  <th className="py-3 px-4">Measurement Unit</th>
                  <th className="py-3 px-4 text-right">Standard Price</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {commodities.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{item.itemCode}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{item.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{item.unit}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-bold">₹{item.standardPricePerUnit.toFixed(2)} / {item.unit}</td>
                    <td className="py-3.5 px-4 text-center"><Badge variant="emerald">{item.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. ENTITLEMENT RULES TAB */}
      {activeTab === 'ENTITLEMENTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" /> Configurable Category Entitlement Rules
            </h3>
            <Button variant="saffron" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsEntitlementModalOpen(true)}>
              Configure Policy Rule
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Card Category</th>
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4 text-right">Per Member Quota</th>
                  <th className="py-3 px-4 text-right">Flat Card Quota</th>
                  <th className="py-3 px-4 text-right">Subsidized Price</th>
                  <th className="py-3 px-4 text-center">Effective Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entitlements.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3.5 px-4"><Badge variant="emerald">{rule.category}</Badge></td>
                    <td className="py-3.5 px-4 font-semibold text-white">{rule.rationItem?.name}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">{rule.quotaPerMember} {rule.rationItem?.unit}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-400">{rule.quotaFlatPerCard} {rule.rationItem?.unit}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">₹{rule.subsidizedPricePerUnit.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">{rule.effectiveMonthYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. USERS TAB */}
      {activeTab === 'USERS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-lg border-b border-slate-800 pb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" /> User Account Activation & Deactivation Controls
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-center">Toggle Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3.5 px-4 font-semibold text-white">{u.name}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">{u.email}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{u.phone}</td>
                    <td className="py-3.5 px-4"><Badge variant="blue">{u.role}</Badge></td>
                    <td className="py-3.5 px-4"><Badge variant={u.status === 'ACTIVE' ? 'emerald' : 'amber'}>{u.status}</Badge></td>
                    <td className="py-3.5 px-4 text-center">
                      {u.status === 'ACTIVE' ? (
                        <Button variant="ghost" size="sm" onClick={() => handleToggleUserStatus(u.id, 'SUSPENDED')}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant="primary" size="sm" onClick={() => handleToggleUserStatus(u.id, 'ACTIVE')}>
                          Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. AUDIT LOGS TAB */}
      {activeTab === 'AUDIT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-lg border-b border-slate-800 pb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Security & Administrative Audit Logs
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Affected</th>
                  <th className="py-3 px-4">Audit Metadata JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3 px-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-4 font-bold text-white">{log.user?.name || log.userId || 'SYSTEM'}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{log.action}</td>
                    <td className="py-3 px-4 text-amber-400">{log.entityAffected}</td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{log.detailsJson}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Beneficiary Modal */}
      {isBenModalOpen && selectedBen && (
        <Modal isOpen={isBenModalOpen} onClose={() => setIsBenModalOpen(false)} title="Update Beneficiary Eligibility">
          <form onSubmit={handleUpdateBeneficiaryStatus} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Ration Category</label>
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white">
                <option value="BPL">BPL - Below Poverty Line</option>
                <option value="AAY">AAY - Antyodaya Anna Yojana</option>
                <option value="APL">APL - Above Poverty Line</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Family Members Count</label>
              <input type="number" min="1" value={editMembers} onChange={(e) => setEditMembers(Number(e.target.value))} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Ration Card Status</label>
              <select value={editCardStatus} onChange={(e) => setEditCardStatus(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white">
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsBenModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* New Shop Modal */}
      {isNewShopModalOpen && (
        <Modal isOpen={isNewShopModalOpen} onClose={() => setIsNewShopModalOpen(false)} title="Register Fair Price Shop">
          <form onSubmit={handleCreateShop} className="space-y-3 text-xs">
            <input type="text" placeholder="Shop Code (e.g. FPS_DELHI_002)" value={newShopCode} onChange={(e) => setNewShopCode(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" required />
            <input type="text" placeholder="Shop Name" value={newShopName} onChange={(e) => setNewShopName(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" required />
            <input type="text" placeholder="Address" value={newShopAddress} onChange={(e) => setNewShopAddress(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" required />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="District" value={newShopDistrict} onChange={(e) => setNewShopDistrict(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" required />
              <input type="text" placeholder="Pincode" value={newShopPincode} onChange={(e) => setNewShopPincode(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" required />
            </div>
            <input type="text" placeholder="Contact Number" value={newShopContact} onChange={(e) => setNewShopContact(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" required />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsNewShopModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="saffron">Register Shop</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Commodity Modal */}
      {isCommodityModalOpen && (
        <Modal isOpen={isCommodityModalOpen} onClose={() => setIsCommodityModalOpen(false)} title="Add Master Commodity">
          <form onSubmit={handleCreateCommodity} className="space-y-3 text-xs">
            <input type="text" placeholder="Item Code (e.g. SUGAR_M30)" value={itemCode} onChange={(e) => setItemCode(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" required />
            <input type="text" placeholder="Commodity Name" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" required />
            <input type="text" placeholder="Unit (e.g. KG, LITER)" value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" required />
            <input type="number" step="0.5" placeholder="Standard Price Per Unit" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" required />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsCommodityModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="saffron">Add Commodity</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Entitlement Rule Modal */}
      {isEntitlementModalOpen && (
        <Modal isOpen={isEntitlementModalOpen} onClose={() => setIsEntitlementModalOpen(false)} title="Configure Entitlement Policy Rule">
          <form onSubmit={handleUpdateEntitlement} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Card Category</label>
              <select value={entCategory} onChange={(e) => setEntCategory(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white">
                <option value="BPL">BPL</option>
                <option value="AAY">AAY</option>
                <option value="APL">APL</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Commodity</label>
              <select value={entItemId} onChange={(e) => setEntItemId(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white">
                {commodities.map(c => <option key={c.id} value={c.id}>{c.name} ({c.itemCode})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Quota / Member</label>
                <input type="number" step="0.5" value={quotaMember} onChange={(e) => setQuotaMember(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">Flat Card Quota</label>
                <input type="number" step="0.5" value={quotaFlat} onChange={(e) => setQuotaFlat(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
              </div>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Subsidized Price / Unit (₹)</label>
              <input type="number" step="0.25" value={subsidizedPrice} onChange={(e) => setSubsidizedPrice(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsEntitlementModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Entitlement Policy</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

