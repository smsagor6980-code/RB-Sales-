import React, { useState, useMemo } from 'react';
import { 
  Lock, KeyRound, Shield, ShieldCheck, ShieldAlert, UserCheck, UserX, 
  UserPlus, Users, Building2, Store, Plus, Check, Edit, Trash2, 
  Search, Filter, AlertTriangle, Smartphone, Mail, Eye, EyeOff, 
  Save, RefreshCw, Sparkles, ExternalLink, ArrowRight, CheckCircle2, 
  X, HelpCircle, Power, Clock, MapPin, Phone
} from 'lucide-react';
import { 
  ShopSettings, 
  AuthSecuritySettings, 
  DEFAULT_AUTH_SETTINGS, 
  Customer, 
  CompanyBranch, 
  Staff 
} from '../types';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface AuthSecurityManagerProps {
  shopSettings: ShopSettings;
  onUpdateShopSettings: (settings: ShopSettings) => void;
  customers: Customer[];
  onUpdateCustomers: (customers: Customer[]) => void;
  companies: CompanyBranch[];
  onSaveCompany?: (company: CompanyBranch) => Promise<void> | void;
  onDeleteCompany?: (companyId: string) => Promise<void> | void;
  onNavigateToCompanies?: () => void;
  isAdmin?: boolean;
}

export const AuthSecurityManager: React.FC<AuthSecurityManagerProps> = ({
  shopSettings,
  onUpdateShopSettings,
  customers = [],
  onUpdateCustomers,
  companies = [],
  onSaveCompany,
  onDeleteCompany,
  onNavigateToCompanies,
  isAdmin = true
}) => {
  // Current Auth Settings
  const authConfig: AuthSecuritySettings = useMemo(() => {
    return {
      ...DEFAULT_AUTH_SETTINGS,
      ...(shopSettings.authSettings || {})
    };
  }, [shopSettings.authSettings]);

  const [activeTab, setActiveTab] = useState<'policy' | 'customers' | 'offices'>('policy');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Local state for policy settings
  const [localPolicy, setLocalPolicy] = useState<AuthSecuritySettings>(authConfig);

  React.useEffect(() => {
    setLocalPolicy(authConfig);
  }, [authConfig]);

  const handleSavePolicy = () => {
    const updatedSettings: ShopSettings = {
      ...shopSettings,
      authSettings: localPolicy
    };
    onUpdateShopSettings(updatedSettings);
    showToast("অথ ও সিকিউরিটি সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!");
  };

  // ==========================================
  // CUSTOMER CONTROLS STATE & LOGIC
  // ==========================================
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'all' | 'active' | 'blocked' | 'pending'>('all');
  const [customerBranchFilter, setCustomerBranchFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // New Customer Form State
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    password: '',
    companyId: companies[0]?.id || 'company-main',
    type: 'retail' as 'retail' | 'wholesale' | 'distributor',
    initialBalance: 0,
    status: 'active' as 'active' | 'blocked' | 'pending'
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = customerSearch.toLowerCase().trim();
      const matchesSearch = !q || 
        c.name.toLowerCase().includes(q) || 
        c.phone.toLowerCase().includes(q) || 
        (c.email && c.email.toLowerCase().includes(q));

      const matchesStatus = customerStatusFilter === 'all' || 
        (customerStatusFilter === 'active' && (c.status === 'active' || !c.status) && c.canLogin !== false) ||
        (customerStatusFilter === 'blocked' && (c.status === 'blocked' || c.status === 'suspended' || c.canLogin === false)) ||
        (customerStatusFilter === 'pending' && (c.status === 'pending' || c.isApproved === false));

      const matchesBranch = customerBranchFilter === 'all' || c.companyId === customerBranchFilter;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [customers, customerSearch, customerStatusFilter, customerBranchFilter]);

  const handleUpdateCustomerStatus = async (customer: Customer, newStatus: 'active' | 'blocked' | 'pending', canLogin?: boolean) => {
    const updatedCustomer: Customer = {
      ...customer,
      status: newStatus,
      canLogin: canLogin !== undefined ? canLogin : (newStatus === 'active'),
      isApproved: newStatus === 'active'
    };

    const updatedList = customers.map(c => c.id === customer.id ? updatedCustomer : c);
    onUpdateCustomers(updatedList);

    if (db) {
      try {
        await setDoc(doc(db, 'customers', customer.id), updatedCustomer, { merge: true });
      } catch (err) {
        console.error("Error updating customer in DB:", err);
      }
    }

    const statusLabel = newStatus === 'active' ? 'সক্রিয়' : newStatus === 'blocked' ? 'ব্লক' : 'পেন্ডিং';
    showToast(`${customer.name}-এর স্ট্যাটাস "${statusLabel}" করা হয়েছে!`);
  };

  const handleSetCustomerPassword = async () => {
    if (!selectedCustomer) return;
    if (!newPasswordValue || newPasswordValue.length < 6) {
      alert("পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।");
      return;
    }

    const updatedCustomer: Customer = {
      ...selectedCustomer,
      plainPassword: newPasswordValue.trim()
    };

    const updatedList = customers.map(c => c.id === selectedCustomer.id ? updatedCustomer : c);
    onUpdateCustomers(updatedList);

    if (db) {
      try {
        await setDoc(doc(db, 'customers', selectedCustomer.id), { plainPassword: newPasswordValue.trim() }, { merge: true });
      } catch (err) {
        console.error("Error updating customer password:", err);
      }
    }

    setShowPasswordModal(false);
    setNewPasswordValue('');
    showToast(`${selectedCustomer.name}-এর পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!`);
  };

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      alert("কাস্টমারের নাম এবং মোবাইল নম্বর আবশ্যক।");
      return;
    }

    setIsSavingCustomer(true);
    try {
      const newCustId = `cust-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const branchName = companies.find(c => c.id === newCustomerForm.companyId)?.name || 'প্রধান শাখা';

      const newCust: Customer = {
        id: newCustId,
        uid: newCustId,
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim().toLowerCase() || undefined,
        address: newCustomerForm.address.trim() || undefined,
        companyId: newCustomerForm.companyId,
        branchName: branchName,
        dueAmount: 0,
        type: newCustomerForm.type,
        status: newCustomerForm.status,
        canLogin: newCustomerForm.status === 'active',
        isApproved: newCustomerForm.status === 'active',
        plainPassword: newCustomerForm.password.trim() || undefined,
        walletBalance: Number(newCustomerForm.initialBalance) || 0,
        totalPurchase: 0,
        totalPaid: 0,
        dateAdded: new Date().toISOString()
      };

      const updatedList = [newCust, ...customers];
      onUpdateCustomers(updatedList);

      if (db) {
        await setDoc(doc(db, 'customers', newCustId), newCust, { merge: true });
      }

      setShowAddCustomerModal(false);
      setNewCustomerForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        password: '',
        companyId: companies[0]?.id || 'company-main',
        type: 'retail',
        initialBalance: 0,
        status: 'active'
      });
      showToast(`নতুন গ্রাহক "${newCust.name}" সফলভাবে তৈরি করা হয়েছে!`);
    } catch (err) {
      console.error("Error creating customer:", err);
      alert("গ্রাহক তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // ==========================================
  // NEW OFFICE / BRANCH MODAL & LOGIC
  // ==========================================
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState<CompanyBranch | null>(null);
  const [isSavingOffice, setIsSavingOffice] = useState(false);

  const [officeForm, setOfficeForm] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    adminName: '',
    adminPhone: '',
    adminEmail: '',
    invoicePrefix: '',
    currency: '৳',
    status: 'active' as 'active' | 'inactive',
    isDefault: false
  });

  const handleOpenNewOfficeModal = () => {
    setEditingOffice(null);
    const count = companies.length + 1;
    setOfficeForm({
      name: '',
      code: `OFF-${count < 10 ? '0' + count : count}`,
      phone: '',
      email: '',
      address: '',
      adminName: '',
      adminPhone: '',
      adminEmail: '',
      invoicePrefix: `INV-B${count}-`,
      currency: '৳',
      status: 'active',
      isDefault: false
    });
    setShowOfficeModal(true);
  };

  const handleOpenEditOfficeModal = (comp: CompanyBranch) => {
    setEditingOffice(comp);
    setOfficeForm({
      name: comp.name || '',
      code: comp.code || '',
      phone: comp.phone || '',
      email: comp.email || '',
      address: comp.address || '',
      adminName: comp.adminName || '',
      adminPhone: comp.adminPhone || '',
      adminEmail: comp.adminEmail || '',
      invoicePrefix: comp.invoicePrefix || '',
      currency: comp.currency || '৳',
      status: comp.status || 'active',
      isDefault: comp.isDefault || false
    });
    setShowOfficeModal(true);
  };

  const handleSaveOfficeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officeForm.name.trim() || !officeForm.code.trim()) {
      alert("অফিসের নাম এবং অফিস কোড আবশ্যক।");
      return;
    }

    setIsSavingOffice(true);
    try {
      const officeId = editingOffice ? editingOffice.id : `branch-${Date.now()}`;
      const now = new Date().toISOString();

      const officeData: CompanyBranch = {
        id: officeId,
        name: officeForm.name.trim(),
        code: officeForm.code.trim().toUpperCase(),
        phone: officeForm.phone.trim(),
        email: officeForm.email.trim().toLowerCase(),
        address: officeForm.address.trim(),
        adminName: officeForm.adminName.trim(),
        adminPhone: officeForm.adminPhone.trim(),
        adminEmail: officeForm.adminEmail.trim().toLowerCase(),
        invoicePrefix: officeForm.invoicePrefix.trim() || `INV-${officeForm.code.trim().toUpperCase()}-`,
        currency: officeForm.currency || '৳',
        status: officeForm.status,
        isDefault: officeForm.isDefault,
        createdAt: editingOffice?.createdAt || now,
        updatedAt: now,
        headerTitle: officeForm.name.trim(),
        headerSubtitle: 'শাখা অফিস ও বিক্রয় কেন্দ্র',
        headerBgColor: editingOffice?.headerBgColor || '#1e1e5f',
        headerTextColor: editingOffice?.headerTextColor || '#ffffff',
        headerSubtitleColor: editingOffice?.headerSubtitleColor || '#fcd34d'
      };

      if (onSaveCompany) {
        await onSaveCompany(officeData);
      } else if (db) {
        await setDoc(doc(db, 'companies', officeId), officeData, { merge: true });
      }

      setShowOfficeModal(false);
      showToast(editingOffice ? `অফিস "${officeData.name}" আপডেট করা হয়েছে!` : `নতুন অফিস "${officeData.name}" সফলভাবে যুক্ত করা হয়েছে!`);
    } catch (err) {
      console.error("Error saving office:", err);
      alert("অফিস সংরক্ষণ করতে সমস্যা হয়েছে।");
    } finally {
      setIsSavingOffice(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[200] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-amber-400/50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={22} className="text-amber-400 shrink-0" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 rounded-[40px] text-white border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={12} /> Master Security & Admin Hub
              </span>
              {localPolicy.maintenanceMode && (
                <span className="px-3 py-1 bg-rose-500 text-white font-black text-[10px] rounded-full uppercase tracking-widest animate-pulse flex items-center gap-1">
                  <Power size={11} /> রক্ষণাবেক্ষণ মোড সক্রিয়
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              সাইন আপ, লগইন, কাস্টমার ও অফিস কন্ট্রোল
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-bold max-w-2xl leading-relaxed">
              গ্রাহক রেজিস্ট্রেশন, স্টাফ সাইন আপ, পাসওয়ার্ড ও অ্যাক্সেস পলিসি, গ্রাহক একাউন্ট স্ট্যাটাস এবং নতুন শাখা/অফিস তৈরি ও নিয়ন্ত্রণ করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenNewOfficeModal}
              className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <Plus size={16} /> নতুন অফিস যোগ করুন
            </button>
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="px-5 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
            >
              <UserPlus size={16} /> কাস্টমার অ্যাকাউন্ট তৈরি
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">রেজিস্ট্রেশন স্ট্যাটাস</span>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${localPolicy.allowCustomerRegistration ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
              <span className="text-sm font-black text-white">
                {localPolicy.allowCustomerRegistration ? 'উন্মুক্ত (Active)' : 'বন্ধ (Disabled)'}
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">অ্যাডমিন অনুমোদন মোড</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-black text-amber-300">
                {localPolicy.requireCustomerApproval ? 'বাধ্যতামূলক (Required)' : 'অটো অ্যাক্টিভ'}
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">মোট কাস্টমার</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-black text-white">{customers.length} জন</span>
              <span className="text-[10px] text-emerald-400 font-bold">
                ({customers.filter(c => c.status === 'active' || !c.status).length} সক্রিয়)
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">শাখা ও অফিস সংখ্যা</span>
            <div className="flex items-center gap-2 mt-1">
              <Building2 size={16} className="text-indigo-400" />
              <span className="text-sm font-black text-white">{companies.length} টি শাখা</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex bg-white p-2 rounded-[28px] border-2 border-slate-100 shadow-xs overflow-x-auto no-scrollbar gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('policy')}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'policy'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Lock size={16} /> ১. সাইন আপ ও লগইন নীতিমালা (Policy)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'customers'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users size={16} /> ২. কাস্টমার অ্যাকাউন্ট ও অ্যাক্সেস কন্ট্রোল
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
            {customers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('offices')}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'offices'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 size={16} /> ৩. নতুন অফিস ও শাখা কন্ট্রোল (Offices)
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-black">
            {companies.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SIGN UP & LOGIN POLICY                                             */}
      {/* ========================================================================= */}
      {activeTab === 'policy' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          <div className="bg-white p-8 rounded-[36px] border-2 border-slate-100 shadow-xs space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <ShieldCheck className="text-indigo-600" size={22} /> সাইন আপ ও লগইন অ্যাক্সেস রুলস
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  কোন কোন ব্যবহারকারী কীভাবে সাইন আপ বা লগইন করতে পারবে তা সম্পূর্ণ নিয়ন্ত্রণ করুন
                </p>
              </div>

              <button
                type="button"
                onClick={handleSavePolicy}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <Save size={16} /> সেটিংস সংরক্ষণ করুন
              </button>
            </div>

            {/* Grid of Toggle Switches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Allow Customer Registration */}
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900 block">
                    গ্রাহক স্বয়ংক্রিয় রেজিস্ট্রেশন (Customer Sign Up)
                  </span>
                  <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                    বন্ধ রাখলে কোনো নতুন ভিজিটর নিজে নিজে একাউন্ট খুলতে পারবে না। কেবল অ্যাডমিন কাস্টমার যুক্ত করতে পারবে।
                  </p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${localPolicy.allowCustomerRegistration ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {localPolicy.allowCustomerRegistration ? 'চালু রয়েছে' : 'বন্ধ রয়েছে'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLocalPolicy({ ...localPolicy, allowCustomerRegistration: !localPolicy.allowCustomerRegistration })}
                  className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center shrink-0 ${localPolicy.allowCustomerRegistration ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform transform ${localPolicy.allowCustomerRegistration ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>

              {/* 2. Require Customer Approval */}
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900 block">
                    নতুন গ্রাহকের অ্যাডমিন অনুমোদন বাধ্যবাধকতা
                  </span>
                  <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                    চালু রাখলে নতুন গ্রাহক সাইন আপ করার পর 'Pending' থাকবে এবং অ্যাডমিন প্যানেল থেকে অনুমোদন দিলে তবেই লগইন করতে পারবে।
                  </p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${localPolicy.requireCustomerApproval ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                    {localPolicy.requireCustomerApproval ? 'অনুমোদন প্রয়োজন' : 'স্বয়ংক্রিয় অনুমোদন'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLocalPolicy({ ...localPolicy, requireCustomerApproval: !localPolicy.requireCustomerApproval })}
                  className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center shrink-0 ${localPolicy.requireCustomerApproval ? 'bg-amber-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform transform ${localPolicy.requireCustomerApproval ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>

              {/* 3. Allow Staff Registration */}
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900 block">
                    স্টাফ ও বিক্রয় প্রতিনিধির অনলাইন সাইন আপ
                  </span>
                  <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                    বন্ধ রাখলে লগইন পেজে 'স্টাফ রেজিস্ট্রেশন' অপশন বন্ধ থাকবে। অ্যাডমিন কেবল Settings থেকে স্টাফ যোগ করবেন।
                  </p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${localPolicy.allowStaffRegistration ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    {localPolicy.allowStaffRegistration ? 'স্টাফ সাইন আপ উন্মুক্ত' : 'কেবল অ্যাডমিন কর্তৃক স্টাফ তৈরি'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLocalPolicy({ ...localPolicy, allowStaffRegistration: !localPolicy.allowStaffRegistration })}
                  className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center shrink-0 ${localPolicy.allowStaffRegistration ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform transform ${localPolicy.allowStaffRegistration ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>

              {/* 4. Customer Login Enabled */}
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900 block">
                    গ্রাহক লগইন অনুমতি (Customer Login Access)
                  </span>
                  <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                    বন্ধ রাখলে ওয়েবসাইটের গ্রাহকরা একাউন্টে লগইন বা প্রোফাইলে ঢুকতে পারবে না (অ্যাডমিন ছাড়া)।
                  </p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${localPolicy.customerLoginEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {localPolicy.customerLoginEnabled ? 'লগইন চালু' : 'লগইন সাময়িক বন্ধ'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLocalPolicy({ ...localPolicy, customerLoginEnabled: !localPolicy.customerLoginEnabled })}
                  className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center shrink-0 ${localPolicy.customerLoginEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform transform ${localPolicy.customerLoginEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>

            {/* Maintenance Mode Special Panel */}
            <div className={`p-6 sm:p-8 rounded-[32px] border-2 transition-all ${
              localPolicy.maintenanceMode 
                ? 'bg-rose-50 border-rose-300 shadow-xl' 
                : 'bg-slate-900 text-white border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Power size={20} className={localPolicy.maintenanceMode ? 'text-rose-600 animate-pulse' : 'text-amber-400'} />
                    <span className="text-sm font-black uppercase tracking-wider">
                      সিস্টেম রক্ষণাবেক্ষণ মোড (System Maintenance Mode)
                    </span>
                  </div>
                  <p className={`text-xs font-bold leading-relaxed max-w-2xl ${localPolicy.maintenanceMode ? 'text-rose-800' : 'text-slate-300'}`}>
                    এটি চালু করলে কেবল মূল সিস্টেম অ্যাডমিন ছাড়া অন্য সকল সাধারণ ব্যবহারকারীর লগইন স্থগিত থাকবে এবং তাদের রক্ষণাবেক্ষণ বার্তা দেখানো হবে।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !localPolicy.maintenanceMode;
                    if (next && !window.confirm("আপনি কি নিশ্চিতভাবে রক্ষণাবেক্ষণ মোড চালু করতে চান? এতে সাধারণ ব্যবহারকারীরা লগইন করতে পারবেন না।")) {
                      return;
                    }
                    setLocalPolicy({ ...localPolicy, maintenanceMode: next });
                  }}
                  className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                    localPolicy.maintenanceMode
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                  }`}
                >
                  {localPolicy.maintenanceMode ? 'রক্ষণাবেক্ষণ মোড বন্ধ করুন' : 'রক্ষণাবেক্ষণ মোড চালু করুন'}
                </button>
              </div>

              {localPolicy.maintenanceMode && (
                <div className="mt-6 pt-4 border-t border-rose-200 space-y-2">
                  <label className="text-[11px] font-black text-rose-900 uppercase tracking-wider">
                    ব্যবহারকারীদের জন্য প্রদর্শনযোগ্য বার্তা (Maintenance Notice)
                  </label>
                  <textarea
                    rows={2}
                    value={localPolicy.maintenanceMessage || ''}
                    onChange={(e) => setLocalPolicy({ ...localPolicy, maintenanceMessage: e.target.value })}
                    className="w-full p-3 rounded-xl bg-white border border-rose-200 text-slate-900 font-bold text-xs outline-none focus:border-rose-500"
                    placeholder="রক্ষণাবেক্ষণ সংক্রান্ত বার্তা..."
                  />
                </div>
              )}
            </div>

            {/* Custom Messages & Branch Default */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  রেজিস্ট্রেশন বন্ধ থাকলে নোটিস বার্তা (Disabled Sign Up Notice)
                </label>
                <textarea
                  rows={2}
                  value={localPolicy.registrationDisabledNotice || ''}
                  onChange={(e) => setLocalPolicy({ ...localPolicy, registrationDisabledNotice: e.target.value })}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs outline-none focus:border-indigo-500"
                  placeholder="রেজিস্ট্রেশন বন্ধ থাকলে গ্রাহক যে বার্তাটি দেখবে..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  নতুন ব্যবহারকারীদের ডিফল্ট শাখা/অফিস
                </label>
                <select
                  value={localPolicy.defaultBranchForNewUsers || 'company-main'}
                  onChange={(e) => setLocalPolicy({ ...localPolicy, defaultBranchForNewUsers: e.target.value })}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs outline-none focus:border-indigo-500"
                >
                  {companies.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} ({comp.code || 'Main'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 font-bold">
                  নতুন কোনো গ্রাহক বা কর্মী স্বয়ংক্রিয়ভাবে এই অফিসে অন্তর্ভুক্ত হবে
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleSavePolicy}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Save size={16} /> সমস্ত পলিসি সেটিংস সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOMER ACCOUNT CONTROLS                                          */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-xs">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Users className="text-indigo-600" size={20} /> কাস্টমার অ্যাকাউন্ট ও লগইন অ্যাক্সেস কন্ট্রোল
              </h3>
              <p className="text-xs font-bold text-slate-400">
                কাস্টমারদের স্ট্যাটাস (সক্রিয়/ব্লক/পেন্ডিং), পাসওয়ার্ড রিসেট ও লগইন অনুমতি পরিচালনা করুন
              </p>
            </div>

            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <UserPlus size={16} /> নতুন কাস্টমার তৈরি করুন
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="নাম, মোবাইল বা ইমেইল দিয়ে খুঁজুন..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-xs outline-none focus:border-indigo-500 shadow-xs"
              />
            </div>

            <select
              value={customerStatusFilter}
              onChange={(e) => setCustomerStatusFilter(e.target.value as any)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-black text-xs outline-none focus:border-indigo-500 shadow-xs"
            >
              <option value="all">সব স্ট্যাটাস ({customers.length})</option>
              <option value="active">সক্রিয় কাস্টমার (Active)</option>
              <option value="blocked">ব্লক / স্থগিত (Blocked)</option>
              <option value="pending">অনুমোদনের অপেক্ষায় (Pending)</option>
            </select>

            <select
              value={customerBranchFilter}
              onChange={(e) => setCustomerBranchFilter(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-black text-xs outline-none focus:border-indigo-500 shadow-xs"
            >
              <option value="all">সকল শাখা / অফিস</option>
              {companies.map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-[36px] border-2 border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="p-4 pl-6">কাস্টমার তথ্য</th>
                    <th className="p-4">মোবাইল ও ইমেইল</th>
                    <th className="p-4">অফিস / ব্রাঞ্চ</th>
                    <th className="p-4 text-center">স্ট্যাটাস</th>
                    <th className="p-4 text-center">লগইন পারমিশন</th>
                    <th className="p-4 text-right pr-6">অ্যাডমিন অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                        কোনো কাস্টমার পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => {
                      const isBlocked = cust.status === 'blocked' || cust.status === 'suspended' || cust.canLogin === false;
                      const isPending = cust.status === 'pending' || cust.isApproved === false;
                      const branchName = companies.find(c => c.id === cust.companyId)?.name || cust.branchName || 'প্রধান শাখা';

                      return (
                        <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                                {cust.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-black text-slate-900 block">{cust.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {cust.id.slice(0, 12)}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 font-mono text-slate-800">
                                <Smartphone size={12} className="text-slate-400" />
                                {cust.phone}
                              </div>
                              {cust.email && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                  <Mail size={11} />
                                  {cust.email}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase inline-flex items-center gap-1">
                              <Building2 size={11} className="text-indigo-500" /> {branchName}
                            </span>
                          </td>

                          <td className="p-4 text-center">
                            {isBlocked ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-black text-[10px] uppercase">
                                🚫 ব্লকড (Blocked)
                              </span>
                            ) : isPending ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-black text-[10px] uppercase">
                                ⏳ অপেক্ষারত (Pending)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px] uppercase">
                                ✅ সক্রিয় (Active)
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleUpdateCustomerStatus(cust, isBlocked ? 'active' : 'blocked', isBlocked ? true : false)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-xs ${
                                !isBlocked
                                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                              }`}
                              title="কাস্টমারের লগইন সক্ষম বা বন্ধ করুন"
                            >
                              {!isBlocked ? 'লগইন অনুমোদিত' : 'লগইন স্থগিত'}
                            </button>
                          </td>

                          <td className="p-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Quick Approve or Block */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCustomerStatus(cust, 'active', true)}
                                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all"
                                  title="অ্যাকাউন্ট অনুমোদন দিন"
                                >
                                  <Check size={15} />
                                </button>
                              )}

                              {!isBlocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCustomerStatus(cust, 'blocked', false)}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                                  title="কাস্টমার ব্লক করুন"
                                >
                                  <UserX size={15} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCustomerStatus(cust, 'active', true)}
                                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all"
                                  title="আনব্লক করুন"
                                >
                                  <UserCheck size={15} />
                                </button>
                              )}

                              {/* Password Management */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(cust);
                                  setNewPasswordValue(cust.plainPassword || '');
                                  setShowPasswordModal(true);
                                }}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                                title="পাসওয়ার্ড সেট বা পরিবর্তন করুন"
                              >
                                <KeyRound size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NEW OFFICE & BRANCH CONTROLS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'offices' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          {/* Header & Add Office Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-[36px] border-2 border-slate-100 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="text-indigo-600" size={24} />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  অফিস ও ব্রাঞ্চ ম্যানেজমেন্ট (Office & Branches)
                </h3>
              </div>
              <p className="text-xs font-bold text-slate-400">
                নতুন অফিস বা শাখা তৈরি করুন, ম্যানেজার নির্ধারণ করুন এবং আউটলেট সক্রিয় বা নিষ্ক্রিয় করুন
              </p>
            </div>

            <div className="flex items-center gap-3">
              {onNavigateToCompanies && (
                <button
                  type="button"
                  onClick={onNavigateToCompanies}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
                >
                  <ExternalLink size={15} /> ফুল কোম্পানি প্যানেল
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenNewOfficeModal}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Plus size={16} /> নতুন অফিস তৈরি করুন
              </button>
            </div>
          </div>

          {/* Offices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((comp) => {
              const isActive = comp.status === 'active';
              const isDefault = comp.isDefault;

              return (
                <div
                  key={comp.id}
                  className={`bg-white rounded-[32px] p-6 border-2 transition-all flex flex-col justify-between space-y-6 ${
                    isDefault ? 'border-amber-400/80 shadow-md shadow-amber-400/10' : 'border-slate-100 shadow-xs'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header with Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-900 leading-snug">{comp.name}</h4>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            কোড: {comp.code || 'MAIN'}
                          </span>
                        </div>
                      </div>

                      {isDefault && (
                        <span className="px-2.5 py-1 bg-amber-400 text-slate-950 text-[9px] font-black uppercase rounded-full tracking-wider">
                          প্রধান শাখা
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
                      {comp.address && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{comp.address}</span>
                        </div>
                      )}
                      {comp.phone && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span className="font-mono">{comp.phone}</span>
                        </div>
                      )}
                      {comp.adminName && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Users size={13} className="text-indigo-500 shrink-0" />
                          <span>ম্যানেজার: {comp.adminName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-400">ইনভয়েস প্রিফিক্স:</span>
                        <span className="font-mono font-black text-slate-800">{comp.invoicePrefix || 'INV-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {isActive ? 'সক্রিয় শাখা' : 'স্থগিত শাখা'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditOfficeModal(comp)}
                        className="p-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl transition-all"
                        title="অফিস এডিট করুন"
                      >
                        <Edit size={14} />
                      </button>

                      {!isDefault && onDeleteCompany && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`আপনি কি "${comp.name}" অফিসটি মুছে ফেলতে চান?`)) {
                              onDeleteCompany(comp.id);
                              showToast(`অফিস "${comp.name}" মুছে ফেলা হয়েছে।`);
                            }
                          }}
                          className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                          title="অফিস মুছুন"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT OFFICE                                                  */}
      {/* ========================================================================= */}
      {showOfficeModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[36px] max-w-xl w-full p-8 shadow-2xl border border-slate-100 space-y-6 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingOffice ? 'অফিস / শাখা তথ্য পরিবর্তন' : 'নতুন অফিস / শাখা তৈরি করুন'}
                  </h3>
                  <p className="text-xs font-bold text-slate-400">শাখার নাম, কোড ও ম্যানেজারের তথ্য প্রদান করুন</p>
                </div>
              </div>
              <button onClick={() => setShowOfficeModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveOfficeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">অফিসের নাম *</label>
                  <input
                    type="text"
                    required
                    value={officeForm.name}
                    onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
                    placeholder="উদাঃ মিরপুর শাখা, চট্টগ্রাম আউটলেট"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">শাখা কোড (Branch Code) *</label>
                  <input
                    type="text"
                    required
                    value={officeForm.code}
                    onChange={(e) => setOfficeForm({ ...officeForm, code: e.target.value.toUpperCase() })}
                    placeholder="উদাঃ BR-02, HQ-01"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">অফিস মোবাইল</label>
                  <input
                    type="text"
                    value={officeForm.phone}
                    onChange={(e) => setOfficeForm({ ...officeForm, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">অফিস ইমেইল</label>
                  <input
                    type="email"
                    value={officeForm.email}
                    onChange={(e) => setOfficeForm({ ...officeForm, email: e.target.value })}
                    placeholder="branch@restbazer.com"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase">শাখার ঠিকানা</label>
                <input
                  type="text"
                  value={officeForm.address}
                  onChange={(e) => setOfficeForm({ ...officeForm, address: e.target.value })}
                  placeholder="রোড, এলাকা, জেলা"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">অফিস ম্যানেজার নাম</label>
                  <input
                    type="text"
                    value={officeForm.adminName}
                    onChange={(e) => setOfficeForm({ ...officeForm, adminName: e.target.value })}
                    placeholder="ম্যানেজারের নাম"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">ম্যানেজার মোবাইল</label>
                  <input
                    type="text"
                    value={officeForm.adminPhone}
                    onChange={(e) => setOfficeForm({ ...officeForm, adminPhone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">ইনভয়েস প্রিফিক্স</label>
                  <input
                    type="text"
                    value={officeForm.invoicePrefix}
                    onChange={(e) => setOfficeForm({ ...officeForm, invoicePrefix: e.target.value.toUpperCase() })}
                    placeholder="উদাঃ INV-DHK-"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">স্ট্যাটাস</label>
                  <select
                    value={officeForm.status}
                    onChange={(e) => setOfficeForm({ ...officeForm, status: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOfficeModal(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingOffice}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-md"
                >
                  {isSavingOffice ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  {editingOffice ? 'আপডেট করুন' : 'অফিস সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CUSTOMER WITH ACCOUNT CREDENTIALS                             */}
      {/* ========================================================================= */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[36px] max-w-lg w-full p-8 shadow-2xl border border-slate-100 space-y-6 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">নতুন কাস্টমার তৈরি করুন (অ্যাকাউন্ট সহ)</h3>
                  <p className="text-xs font-bold text-slate-400">লগইন ক্রেডেনশিয়াল সহ সরাসরি কাস্টমার যুক্ত করুন</p>
                </div>
              </div>
              <button onClick={() => setShowAddCustomerModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase">গ্রাহকের নাম *</label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  placeholder="কাস্টমারের পূর্ণ নাম"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">মোবাইল নম্বর *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">ইমেইল (ঐচ্ছিক)</label>
                  <input
                    type="email"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    placeholder="customer@email.com"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase">লগইন পাসওয়ার্ড (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={newCustomerForm.password}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, password: e.target.value })}
                  placeholder="অন্তত ৬ অক্ষরের পাসওয়ার্ড"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 font-bold">কাস্টমার এই পাসওয়ার্ড দিয়ে ওয়েবসাইটে সরাসরি লগইন করতে পারবে</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">শাখা / অফিস নির্ধারণ</label>
                  <select
                    value={newCustomerForm.companyId}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, companyId: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                  >
                    {companies.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase">অ্যাকাউন্ট স্ট্যাটাস</label>
                  <select
                    value={newCustomerForm.status}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, status: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="pending">অনুমোদনের অপেক্ষায় (Pending)</option>
                    <option value="blocked">ব্লকড (Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase">ঠিকানা</label>
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  placeholder="গ্রাহকের ঠিকানা"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-md"
                >
                  {isSavingCustomer ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  কাস্টমার তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET CUSTOMER PASSWORD                                            */}
      {/* ========================================================================= */}
      {showPasswordModal && selectedCustomer && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <KeyRound size={20} className="text-amber-500" />
                <div>
                  <h4 className="text-sm font-black text-slate-900">কাস্টমার পাসওয়ার্ড সেট করুন</h4>
                  <span className="text-[11px] text-slate-400 font-bold">{selectedCustomer.name} ({selectedCustomer.phone})</span>
                </div>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">নতুন পাসওয়ার্ড</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? "text" : "password"}
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="অন্তত ৬ অক্ষরের পাসওয়ার্ড..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleSetCustomerPassword}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
                >
                  <Save size={14} /> পাসওয়ার্ড সংরক্ষণ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
