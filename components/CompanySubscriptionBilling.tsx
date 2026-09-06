import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Zap, 
  Search, 
  ChevronRight, 
  Sparkles, 
  ArrowUpRight, 
  Receipt, 
  Building2, 
  TrendingUp, 
  Check, 
  RotateCcw, 
  Printer, 
  Lock, 
  Unlock, 
  Coins, 
  PieChart, 
  Layers, 
  Copy, 
  X,
  Send,
  Plus
} from 'lucide-react';
import { 
  CompanyBranch, 
  CompanyBillingRecord, 
  CompanyBillingModel, 
  CompanySubscriptionPlan, 
  CompanyCommissionConfig, 
  Sale, 
  ShopSettings 
} from '../types';

interface Props {
  companies: CompanyBranch[];
  sales: Sale[];
  billingRecords?: CompanyBillingRecord[];
  shopSettings: ShopSettings;
  activeCompanyId: string;
  isAdmin: boolean;
  onSaveCompany: (company: CompanyBranch) => Promise<void>;
  onSaveBillingRecord?: (record: CompanyBillingRecord) => Promise<void>;
}

export const PRESET_PLANS = [
  {
    id: 'trial',
    name: '১৪ দিনের ফ্রি ট্রায়াল',
    nameEn: '14-Day Free Trial',
    cycle: 'trial' as const,
    fee: 0,
    days: 14,
    features: ['ফুল পিওএস ও সেলস মডিউল', 'আনলিমিটেড প্রোডাক্ট ও ইনভেন্টরি', 'কাস্টমার ও বাকি হিসাব', '১৪ দিনের প্রিমিয়াম ট্রায়াল'],
    badge: 'ফ্রি ট্রায়াল',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  {
    id: 'starter',
    name: 'স্টার্টার প্ল্যান (Starter)',
    nameEn: 'Starter Monthly',
    cycle: 'monthly' as const,
    fee: 1000,
    days: 30,
    features: ['সর্বোচ্চ ৫০০ প্রোডাক্ট', '২ জন স্টাফ অ্যাকাউন্ট', 'দৈনিক ও মাসিক সেলস রিপোর্ট', 'বারকোড ও স্লিপ প্রিন্টিং'],
    badge: 'জনপ্রিয়',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  {
    id: 'professional',
    name: 'প্রফেশনাল প্ল্যান (Pro)',
    nameEn: 'Professional Monthly',
    cycle: 'monthly' as const,
    fee: 2000,
    days: 30,
    features: ['আনলিমিটেড প্রোডাক্ট ও ক্যাটাগরি', '১০ জন পর্যন্ত স্টাফ ও ম্যানেজার', 'উন্নত ইনভেন্টরি ও লাভ-ক্ষতি রিপোর্ট', 'এসএমএস ও কাস্টমার ওয়ালেট ইন্টিগ্রেশন'],
    badge: 'সেরা ভ্যালু',
    badgeColor: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'enterprise_yearly',
    name: 'এন্টারপ্রাইজ বাৎসরিক (Enterprise)',
    nameEn: 'Enterprise Yearly',
    cycle: 'yearly' as const,
    fee: 20000,
    days: 365,
    features: ['আনলিমিটেড স্টাফ ও ব্রাঞ্চ অ্যাক্সেস', 'প্রায়োরিটি ২৪/৭ ভিআইপি সাপোর্ট', 'কাস্টম ব্র্যান্ডিং ও ডোমেইন সাপোর্ট', '২ মাস সম্পূর্ণ ফ্রি (বাৎসরিক সেভিং)'],
    badge: 'বাৎসরিক অফার',
    badgeColor: 'bg-amber-100 text-amber-800'
  }
];

export const CompanySubscriptionBilling: React.FC<Props> = ({
  companies,
  sales,
  billingRecords = [],
  shopSettings,
  activeCompanyId,
  isAdmin,
  onSaveCompany,
  onSaveBillingRecord
}) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'commission' | 'invoices' | 'settings'>('plans');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trial' | 'active' | 'expired' | 'commission'>('all');
  
  // Modals
  const [selectedCompany, setSelectedCompany] = useState<CompanyBranch | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<CompanyBillingRecord | null>(null);

  // Edit Plan Form State
  const [editBillingModel, setEditBillingModel] = useState<CompanyBillingModel>('subscription');
  const [selectedPreset, setSelectedPreset] = useState('starter');
  const [customPlanName, setCustomPlanName] = useState('');
  const [customCycle, setCustomCycle] = useState<'monthly' | 'quarterly' | 'yearly' | 'lifetime'>('monthly');
  const [customFee, setCustomFee] = useState<number>(1000);
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [customCommissionRate, setCustomCommissionRate] = useState<number>(2);
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed_per_sale'>('percentage');
  const [minCommissionPerSale, setMinCommissionPerSale] = useState<number>(0);

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('bKash');
  const [payTrxId, setPayTrxId] = useState('');
  const [payExtendCycle, setPayExtendCycle] = useState<'none' | '1_month' | '3_month' | '6_month' | '1_year'>('1_month');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Commission Settlement State
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<string>('Bank');
  const [settleTrxId, setSettleTrxId] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  // Feedback
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Helper to compute company statistics
  const getCompanyStats = (comp: CompanyBranch) => {
    // Total sales of this company
    const compSales = sales.filter(s => s.companyId === comp.id || (comp.isDefault && (!s.companyId || s.companyId === 'company-main')));
    const totalSalesVolume = compSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalOrdersCount = compSales.length;

    // Subscriptions
    const plan = comp.subscriptionPlan;
    const now = new Date();
    let isExpired = false;
    let daysRemaining = 0;
    
    if (plan?.expiryDate) {
      const expDate = new Date(plan.expiryDate);
      const diffMs = expDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) {
        isExpired = true;
      }
    }

    // Commission
    const commConfig = comp.commissionConfig;
    const commRate = commConfig?.rate ?? 2;
    const commType = commConfig?.type ?? 'percentage';

    let calculatedCommissionAccrued = 0;
    if (comp.billingModel === 'commission' || comp.billingModel === 'hybrid') {
      compSales.forEach(s => {
        if (s.commissionAmount !== undefined) {
          calculatedCommissionAccrued += s.commissionAmount;
        } else {
          if (commType === 'percentage') {
            const c = (s.total * commRate) / 100;
            calculatedCommissionAccrued += Math.round(c);
          } else {
            calculatedCommissionAccrued += commRate;
          }
        }
      });
    }

    const totalPaid = commConfig?.totalCommissionPaid || 0;
    const commissionDue = Math.max(0, calculatedCommissionAccrued - totalPaid);

    return {
      totalSalesVolume,
      totalOrdersCount,
      isExpired,
      daysRemaining,
      calculatedCommissionAccrued,
      totalPaid,
      commissionDue
    };
  };

  // High level aggregated stats
  const aggregateStats = useMemo(() => {
    let activeSubs = 0;
    let onTrial = 0;
    let expired = 0;
    let totalCommAccrued = 0;
    let totalCommDue = 0;
    let estimatedMonthlyRevenue = 0;

    companies.forEach(comp => {
      const { isExpired, daysRemaining, calculatedCommissionAccrued, commissionDue } = getCompanyStats(comp);
      if (comp.billingModel === 'subscription' || comp.billingModel === 'hybrid') {
        if (comp.subscriptionPlan?.cycle === 'trial' || comp.subscriptionPlan?.planId === 'trial') {
          if (!isExpired) onTrial++;
        } else if (!isExpired) {
          activeSubs++;
          if (comp.subscriptionPlan?.fee) {
            estimatedMonthlyRevenue += comp.subscriptionPlan.cycle === 'yearly' 
              ? Math.round(comp.subscriptionPlan.fee / 12) 
              : comp.subscriptionPlan.fee;
          }
        }
      }
      if (isExpired && comp.billingModel !== 'free') {
        expired++;
      }
      totalCommAccrued += calculatedCommissionAccrued;
      totalCommDue += commissionDue;
    });

    return {
      totalCompanies: companies.length,
      activeSubs,
      onTrial,
      expired,
      totalCommAccrued,
      totalCommDue,
      estimatedMonthlyRevenue
    };
  }, [companies, sales]);

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(comp => {
      const stats = getCompanyStats(comp);
      const matchesSearch = 
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comp.code && comp.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comp.adminEmail && comp.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;

      if (statusFilter === 'trial') {
        return comp.subscriptionPlan?.cycle === 'trial' || comp.subscriptionPlan?.planId === 'trial';
      }
      if (statusFilter === 'active') {
        return !stats.isExpired && (comp.billingModel === 'subscription' || comp.billingModel === 'hybrid');
      }
      if (statusFilter === 'expired') {
        return stats.isExpired;
      }
      if (statusFilter === 'commission') {
        return comp.billingModel === 'commission' || comp.billingModel === 'hybrid';
      }
      return true;
    });
  }, [companies, searchQuery, statusFilter, sales]);

  // Open Edit Plan Modal
  const handleOpenEditPlan = (comp: CompanyBranch) => {
    setSelectedCompany(comp);
    setEditBillingModel(comp.billingModel || 'subscription');
    
    const plan = comp.subscriptionPlan;
    if (plan) {
      setSelectedPreset(plan.planId || 'starter');
      setCustomPlanName(plan.planName || '');
      setCustomCycle(plan.cycle === 'trial' ? 'monthly' : plan.cycle);
      setCustomFee(plan.fee || 1000);
      setCustomExpiryDate(plan.expiryDate ? plan.expiryDate.split('T')[0] : '');
    } else {
      setSelectedPreset('starter');
      setCustomPlanName('স্টার্টার প্যাক');
      setCustomCycle('monthly');
      setCustomFee(1000);
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setCustomExpiryDate(d.toISOString().split('T')[0]);
    }

    const comm = comp.commissionConfig;
    setCustomCommissionRate(comm?.rate ?? 2);
    setCommissionType(comm?.type ?? 'percentage');
    setMinCommissionPerSale(comm?.minCommissionPerSale ?? 0);

    setIsPlanModalOpen(true);
  };

  // Save Plan Changes
  const handleSavePlanChanges = async () => {
    if (!selectedCompany) return;

    try {
      const now = new Date();
      let expiryISO = customExpiryDate ? new Date(customExpiryDate).toISOString() : new Date(now.getTime() + 30 * 86400000).toISOString();
      let planName = customPlanName;
      let fee = customFee;
      let cycle = customCycle;

      if (selectedPreset !== 'custom') {
        const preset = PRESET_PLANS.find(p => p.id === selectedPreset);
        if (preset) {
          planName = preset.name;
          fee = preset.fee;
          cycle = preset.cycle as any;
          const exp = new Date(now.getTime() + preset.days * 86400000);
          expiryISO = exp.toISOString();
        }
      }

      const updatedPlan: CompanySubscriptionPlan = {
        planId: selectedPreset as any,
        planName: planName || 'স্ট্যান্ডার্ড প্ল্যান',
        cycle: cycle,
        fee: fee,
        status: 'active',
        startDate: selectedCompany.subscriptionPlan?.startDate || now.toISOString(),
        expiryDate: expiryISO,
        autoRenew: true,
        lastPaymentDate: selectedCompany.subscriptionPlan?.lastPaymentDate
      };

      const updatedCommission: CompanyCommissionConfig = {
        type: commissionType,
        rate: customCommissionRate,
        minCommissionPerSale: minCommissionPerSale,
        totalCommissionAccrued: selectedCompany.commissionConfig?.totalCommissionAccrued || 0,
        totalCommissionPaid: selectedCompany.commissionConfig?.totalCommissionPaid || 0,
        commissionDue: selectedCompany.commissionConfig?.commissionDue || 0
      };

      const updatedCompany: CompanyBranch = {
        ...selectedCompany,
        billingModel: editBillingModel,
        subscriptionPlan: updatedPlan,
        commissionConfig: updatedCommission,
        updatedAt: now.toISOString()
      };

      await onSaveCompany(updatedCompany);
      setIsPlanModalOpen(false);
      alert('কোম্পানির সাবস্ক্রিপশন ও বিলিং পলিসি সফলভাবে আপডেট করা হয়েছে!');
    } catch (err: any) {
      alert('প্ল্যান সংরক্ষণ ব্যর্থ হয়েছে: ' + err.message);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (comp: CompanyBranch) => {
    setSelectedCompany(comp);
    setPayAmount(comp.subscriptionPlan?.fee || 1000);
    setPayMethod('bKash');
    setPayTrxId('');
    setPayExtendCycle('1_month');
    setPayNotes(`সাবস্ক্রিপশন ফি নবায়ন: ${comp.name}`);
    setIsPaymentModalOpen(true);
  };

  // Submit Payment / Collect Fee
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (payAmount <= 0) {
      alert('পরিশোধের পরিমাণ ০ এর বেশি হতে হবে!');
      return;
    }

    try {
      setIsSubmittingPay(true);
      const now = new Date();
      
      // Calculate new expiry date based on extension
      let currentExp = selectedCompany.subscriptionPlan?.expiryDate 
        ? new Date(selectedCompany.subscriptionPlan.expiryDate) 
        : new Date();
      
      // If already expired, start from today
      if (currentExp.getTime() < now.getTime()) {
        currentExp = new Date();
      }

      if (payExtendCycle === '1_month') {
        currentExp.setMonth(currentExp.getMonth() + 1);
      } else if (payExtendCycle === '3_month') {
        currentExp.setMonth(currentExp.getMonth() + 3);
      } else if (payExtendCycle === '6_month') {
        currentExp.setMonth(currentExp.getMonth() + 6);
      } else if (payExtendCycle === '1_year') {
        currentExp.setFullYear(currentExp.getFullYear() + 1);
      }

      const updatedPlan: CompanySubscriptionPlan = {
        ...(selectedCompany.subscriptionPlan || {
          planId: 'starter',
          planName: 'স্টার্টার প্ল্যান',
          cycle: 'monthly',
          fee: payAmount,
          startDate: now.toISOString()
        }),
        status: 'active',
        expiryDate: currentExp.toISOString(),
        lastPaymentDate: now.toISOString()
      };

      const updatedCompany: CompanyBranch = {
        ...selectedCompany,
        subscriptionPlan: updatedPlan,
        updatedAt: now.toISOString()
      };

      await onSaveCompany(updatedCompany);

      // Create Billing Record
      const invoiceRecord: CompanyBillingRecord = {
        id: `INV-SUB-${Date.now()}`,
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        type: 'subscription',
        planName: updatedPlan.planName,
        cycle: payExtendCycle,
        amount: payAmount,
        paidAmount: payAmount,
        dueAmount: 0,
        status: 'paid',
        paymentMethod: payMethod,
        trxId: payTrxId.trim(),
        notes: payNotes,
        createdAt: now.toISOString(),
        paidAt: now.toISOString(),
        createdByName: 'Master Admin'
      };

      if (onSaveBillingRecord) {
        await onSaveBillingRecord(invoiceRecord);
      }

      setIsPaymentModalOpen(false);
      setActiveInvoice(invoiceRecord);
      alert('পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে এবং সাবস্ক্রিপশন মেয়াদ বৃদ্ধি করা হয়েছে!');
    } catch (err: any) {
      alert('পেমেন্ট গ্রহণ ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Open Commission Settlement Modal
  const handleOpenCommissionSettlement = (comp: CompanyBranch) => {
    setSelectedCompany(comp);
    const stats = getCompanyStats(comp);
    setSettleAmount(stats.commissionDue > 0 ? stats.commissionDue : 0);
    setSettleMethod('Bank');
    setSettleTrxId('');
    setSettleNotes(`কমিশন নিষ্পত্তি: ${comp.name}`);
    setIsCommissionModalOpen(true);
  };

  // Submit Commission Settlement
  const handleSubmitCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (settleAmount <= 0) {
      alert('সেটেলমেন্ট অ্যামাউন্ট প্রদান করুন!');
      return;
    }

    try {
      setIsSubmittingSettle(true);
      const now = new Date();
      const currentPaid = selectedCompany.commissionConfig?.totalCommissionPaid || 0;
      const newTotalPaid = currentPaid + settleAmount;

      const updatedComm: CompanyCommissionConfig = {
        ...(selectedCompany.commissionConfig || { type: 'percentage', rate: 2 }),
        totalCommissionPaid: newTotalPaid,
        lastSettlementDate: now.toISOString()
      };

      const updatedCompany: CompanyBranch = {
        ...selectedCompany,
        commissionConfig: updatedComm,
        updatedAt: now.toISOString()
      };

      await onSaveCompany(updatedCompany);

      const stats = getCompanyStats(selectedCompany);
      const record: CompanyBillingRecord = {
        id: `INV-COMM-${Date.now()}`,
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        type: 'commission_settlement',
        amount: settleAmount,
        paidAmount: settleAmount,
        dueAmount: Math.max(0, stats.commissionDue - settleAmount),
        status: 'paid',
        paymentMethod: settleMethod,
        trxId: settleTrxId.trim(),
        notes: settleNotes,
        salesCount: stats.totalOrdersCount,
        totalSalesVolume: stats.totalSalesVolume,
        commissionRate: selectedCompany.commissionConfig?.rate,
        createdAt: now.toISOString(),
        paidAt: now.toISOString(),
        createdByName: 'Master Admin'
      };

      if (onSaveBillingRecord) {
        await onSaveBillingRecord(record);
      }

      setIsCommissionModalOpen(false);
      setActiveInvoice(record);
      alert('কমিশন নিষ্পত্তি সফল হয়েছে!');
    } catch (err: any) {
      alert('কমিশন নিষ্পত্তি ব্যর্থ: ' + err.message);
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  // Extend Trial Quickly
  const handleExtendTrial = async (comp: CompanyBranch, days: number) => {
    if (!confirm(`${comp.name} কোম্পানির জন্য ফ্রি ট্রায়াল আরও ${days} দিন বৃদ্ধি করতে চান?`)) return;

    try {
      const now = new Date();
      let currentExp = comp.subscriptionPlan?.expiryDate ? new Date(comp.subscriptionPlan.expiryDate) : now;
      if (currentExp.getTime() < now.getTime()) currentExp = now;
      currentExp.setDate(currentExp.getDate() + days);

      const updatedPlan: CompanySubscriptionPlan = {
        ...(comp.subscriptionPlan || {
          planId: 'trial',
          planName: '১৪ দিনের ফ্রি ট্রায়াল',
          cycle: 'trial',
          fee: 0,
          startDate: now.toISOString()
        }),
        cycle: 'trial',
        status: 'active',
        expiryDate: currentExp.toISOString()
      };

      await onSaveCompany({
        ...comp,
        subscriptionPlan: updatedPlan,
        updatedAt: now.toISOString()
      });

      alert(`ফ্রি ট্রায়াল সফলভাবে ${days} দিন বৃদ্ধি করা হয়েছে!`);
    } catch (err: any) {
      alert('ট্রায়াল বৃদ্ধি ব্যর্থ: ' + err.message);
    }
  };

  // Suspend or Reactivate
  const handleToggleStatus = async (comp: CompanyBranch) => {
    const isSuspended = comp.status === 'inactive' || comp.subscriptionPlan?.status === 'suspended';
    const actionName = isSuspended ? 'পুনরায় সক্রিয় (Reactivate)' : 'স্থগিত (Suspend)';
    if (!confirm(`${comp.name} কোম্পানিটিকে ${actionName} করতে চান?`)) return;

    try {
      const now = new Date().toISOString();
      const updatedStatus = isSuspended ? 'active' : 'inactive';
      const updatedPlanStatus = isSuspended ? 'active' : 'suspended';

      await onSaveCompany({
        ...comp,
        status: updatedStatus as any,
        subscriptionPlan: comp.subscriptionPlan ? {
          ...comp.subscriptionPlan,
          status: updatedPlanStatus as any
        } : undefined,
        updatedAt: now
      });
      alert(`কোম্পানিটি ${actionName} করা হয়েছে।`);
    } catch (err: any) {
      alert('স্ট্যাটাস পরিবর্তনে সমস্যা: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-[32px] shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-black uppercase tracking-widest">
              <Sparkles size={13} className="text-amber-300" />
              SaaS Multi-Company Billing Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              কোম্পানি সাবস্ক্রিপশন ও সেলস কমিশন হাব
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 font-medium leading-relaxed">
              নতুন যুক্ত হওয়া কোম্পানি ও ব্রাঞ্চের জন্য সাবস্ক্রিপশন ফি (মাসিক/বাৎসরিক), বিক্রির উপর অটো-কমিশন পলিসি, পেমেন্ট রিসিট ও ট্রায়াল মেয়াদ স্বয়ংক্রিয়ভাবে নিয়ন্ত্রণ করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'plans' ? 'bg-white text-indigo-950 shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              <CreditCard size={15} />
              সাবস্ক্রিপশন প্ল্যানস
            </button>
            <button
              onClick={() => setActiveTab('commission')}
              className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'commission' ? 'bg-white text-indigo-950 shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              <Coins size={15} />
              কমিশন লেজার
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'invoices' ? 'bg-white text-indigo-950 shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              <Receipt size={15} />
              পেমেন্ট ইনভয়েস ({billingRecords.length})
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 size={13} className="text-indigo-600" /> মোট কোম্পানি
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{aggregateStats.totalCompanies} টি</div>
          <div className="text-[10px] text-slate-500 font-bold">নিবন্ধিত ব্রাঞ্চ ও শপ</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-600" /> অ্যাক্টিভ সাবস্ক্রিপশন
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">{aggregateStats.activeSubs} টি</div>
          <div className="text-[10px] text-emerald-600 font-bold">চলমান পেইড ক্লায়েন্ট</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={13} className="text-amber-500" /> ফ্রি ট্রায়ালে আছে
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">{aggregateStats.onTrial} টি</div>
          <div className="text-[10px] text-amber-600 font-bold">১৪ দিনের ট্রায়াল পিরিয়ড</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle size={13} className="text-rose-500" /> মেয়াদোত্তীর্ণ / ডিউ
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">{aggregateStats.expired} টি</div>
          <div className="text-[10px] text-rose-500 font-bold">রিনিউ বা পেমেন্ট প্রয়োজন</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign size={13} className="text-indigo-600" /> সম্ভাব্য মাসিক রেভিনিউ
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">৳{aggregateStats.estimatedMonthlyRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-indigo-600 font-bold">সাবস্ক্রিপশন ফি থেকে</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Coins size={13} className="text-purple-600" /> বকেয়া কমিশন
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600">৳{aggregateStats.totalCommDue.toLocaleString()}</div>
          <div className="text-[10px] text-purple-600 font-bold">আদায়যোগ্য সেলস কমিশন</div>
        </div>
      </div>

      {/* Preset Plan Highlights Banner */}
      <div className="bg-indigo-50/70 border border-indigo-100 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap size={20} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-indigo-950">নতুন কোম্পানির ডিফল্ট অনবোর্ডিং পলিসি</h4>
            <p className="text-[11px] text-indigo-700 font-medium">নতুন সাইন-আপকৃত যেকোনো কোম্পানি স্বয়ংক্রিয়ভাবে ১৪ দিনের সম্পূর্ণ ফ্রি ট্রায়াল বা আপনার নির্ধারিত কমিশন প্ল্যানে যুক্ত হয়।</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 bg-white text-indigo-800 text-[10px] font-black rounded-lg border border-indigo-200">
            🎁 ট্রায়াল: ১৪ দিন
          </span>
          <span className="px-2.5 py-1 bg-white text-indigo-800 text-[10px] font-black rounded-lg border border-indigo-200">
            🏷️ স্ট্যান্ডার্ড কমিশন: ২%
          </span>
          <span className="px-2.5 py-1 bg-white text-indigo-800 text-[10px] font-black rounded-lg border border-indigo-200">
            💎 স্টার্টার প্ল্যান: ৳১,০০০/মাস
          </span>
        </div>
      </div>

      {/* Main Content Area Based on Tab */}
      {activeTab === 'plans' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Controls bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="কোম্পানি, কোড বা ইমেইল খুঁজুন..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                সকল ({companies.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                সক্রিয় পেইড ({aggregateStats.activeSubs})
              </button>
              <button
                onClick={() => setStatusFilter('trial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statusFilter === 'trial' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                ট্রায়াল ({aggregateStats.onTrial})
              </button>
              <button
                onClick={() => setStatusFilter('expired')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statusFilter === 'expired' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                মেয়াদ শেষ ({aggregateStats.expired})
              </button>
              <button
                onClick={() => setStatusFilter('commission')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statusFilter === 'commission' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                কমিশন মডেল
              </button>
            </div>
          </div>

          {/* Table of Companies */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">কোম্পানির নাম ও কোড</th>
                  <th className="py-3.5 px-4">বিলিং মডেল</th>
                  <th className="py-3.5 px-4">প্ল্যান ও ফি</th>
                  <th className="py-3.5 px-4">মেয়াদ ও স্ট্যাটাস</th>
                  <th className="py-3.5 px-4">মোট সেলস ও কমিশন</th>
                  <th className="py-3.5 px-4 text-right">একশন ও অপারেশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      কোনো কোম্পানি পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map(comp => {
                    const stats = getCompanyStats(comp);
                    const plan = comp.subscriptionPlan;
                    const comm = comp.commissionConfig;
                    const isMain = comp.isDefault || comp.id === 'company-main';

                    return (
                      <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs"
                              style={{ backgroundColor: comp.headerBgColor || '#1e1e5f' }}
                            >
                              {comp.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black text-slate-900 flex items-center gap-1.5">
                                {comp.name}
                                {isMain && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-black">
                                    প্রধান শাখা
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {comp.code || 'N/A'} • {comp.adminEmail || comp.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isMain || comp.billingModel === 'free' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">
                              <ShieldCheck size={11} className="text-slate-500" /> ফ্রি / সিস্টেম ওনার
                            </span>
                          ) : comp.billingModel === 'commission' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black">
                              <Coins size={11} /> কমিশন মডেল ({comm?.rate ?? 2}%)
                            </span>
                          ) : comp.billingModel === 'hybrid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">
                              <Zap size={11} /> হাইব্রিড (ফি + কমিশন)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black">
                              <CreditCard size={11} /> ফিক্সড সাবস্ক্রিপশন
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">
                            {plan?.planName || (isMain ? 'মাস্টার লাইসেন্স' : '১৪ দিনের ফ্রি ট্রায়াল')}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {isMain || comp.billingModel === 'free' ? 'ফি প্রযোজ্য নয়' : `৳${(plan?.fee || 0).toLocaleString()} / ${plan?.cycle === 'yearly' ? 'বাৎসরিক' : plan?.cycle === 'trial' ? '১৪ দিন' : 'মাসিক'}`}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isMain || comp.billingModel === 'free' ? (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <Check size={12} /> লাইফটাইম অ্যাক্টিভ
                            </span>
                          ) : stats.isExpired ? (
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-black flex items-center gap-1 w-fit">
                                <AlertCircle size={10} /> মেয়াদ শেষ ({Math.abs(stats.daysRemaining)} দিন পূর্বে)
                              </span>
                              <div className="text-[9px] text-slate-400 font-mono">
                                এক্সপায়ারি: {plan?.expiryDate ? new Date(plan.expiryDate).toLocaleDateString('bn-BD') : 'N/A'}
                              </div>
                            </div>
                          ) : plan?.cycle === 'trial' || plan?.planId === 'trial' ? (
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black flex items-center gap-1 w-fit">
                                <Clock size={10} /> ট্রায়াল বাকি: {stats.daysRemaining} দিন
                              </span>
                              <div className="text-[9px] text-slate-400 font-mono">
                                মেয়াদ: {plan?.expiryDate ? new Date(plan.expiryDate).toLocaleDateString('bn-BD') : 'N/A'}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1 w-fit">
                                <CheckCircle2 size={10} /> অ্যাক্টিভ ({stats.daysRemaining} দিন বাকি)
                              </span>
                              <div className="text-[9px] text-slate-400 font-mono">
                                পরবর্তী বিল: {plan?.expiryDate ? new Date(plan.expiryDate).toLocaleDateString('bn-BD') : 'N/A'}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900">
                            ৳{stats.totalSalesVolume.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            {stats.totalOrdersCount} টি অর্ডার
                            {(comp.billingModel === 'commission' || comp.billingModel === 'hybrid') && (
                              <span className="text-purple-600 font-bold ml-1">
                                • কমিশন বকেয়া: ৳{stats.commissionDue.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Collect Payment / Renew */}
                            {!isMain && (
                              <button
                                onClick={() => handleOpenPayment(comp)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black rounded-lg text-[10px] transition-all flex items-center gap-1"
                                title="পেমেন্ট সংগ্রহ ও রিনিউ"
                              >
                                <DollarSign size={11} /> পেমেন্ট / রিনিউ
                              </button>
                            )}

                            {/* Settle commission */}
                            {(comp.billingModel === 'commission' || comp.billingModel === 'hybrid') && (
                              <button
                                onClick={() => handleOpenCommissionSettlement(comp)}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-black rounded-lg text-[10px] transition-all flex items-center gap-1"
                                title="কমিশন নিষ্পত্তি"
                              >
                                <Coins size={11} /> কমিশন
                              </button>
                            )}

                            {/* Quick Extend Trial if trial */}
                            {plan?.cycle === 'trial' && (
                              <button
                                onClick={() => handleExtendTrial(comp, 7)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-black rounded-lg text-[10px] transition-all"
                                title="+৭ দিন ট্রায়াল বাড়ান"
                              >
                                +৭ দিন
                              </button>
                            )}

                            {/* Edit Plan */}
                            <button
                              onClick={() => handleOpenEditPlan(comp)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-black rounded-lg text-[10px] transition-all"
                              title="প্ল্যান পরিবর্তন"
                            >
                              প্ল্যান পরিবর্তন
                            </button>

                            {/* Suspend / Unsuspend */}
                            {!isMain && (
                              <button
                                onClick={() => handleToggleStatus(comp)}
                                className={`p-1.5 rounded-lg text-[10px] transition-all ${comp.status === 'inactive' ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'}`}
                                title={comp.status === 'inactive' ? 'কোম্পানি সক্রিয় করুন' : 'স্থগিত করুন'}
                              >
                                {comp.status === 'inactive' ? <Lock size={12} /> : <Unlock size={12} />}
                              </button>
                            )}
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
      )}

      {/* Commission Ledger Tab */}
      {activeTab === 'commission' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Coins className="text-purple-600" size={18} />
                কোম্পানি সেলস কমিশন লেজার ও রিয়েলটাইম নিষ্পত্তি
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                যেসব কোম্পানিতে বিক্রির উপর নির্দিষ্ট হারে কমিশন পলিসি চালু আছে, তাদের মোট বিক্রয় ও প্রদেয় কমিশন হিসাব।
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">মোট আদায়যোগ্য কমিশন</span>
              <span className="text-2xl font-black text-purple-700">৳{aggregateStats.totalCommDue.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies
              .filter(c => c.billingModel === 'commission' || c.billingModel === 'hybrid' || (c.commissionConfig && (c.commissionConfig.rate || 0) > 0))
              .map(comp => {
                const stats = getCompanyStats(comp);
                const comm = comp.commissionConfig;

                return (
                  <div key={comp.id} className="p-5 rounded-2xl border border-purple-100 bg-purple-50/30 space-y-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs"
                          style={{ backgroundColor: comp.headerBgColor || '#1e1e5f' }}
                        >
                          {comp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{comp.name}</h4>
                          <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                            কমিশন রেট: {comm?.rate ?? 2}% {comm?.type === 'fixed_per_sale' ? '(ফিক্সড)' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-purple-100/60 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">মোট বিক্রয় ভলিউম</div>
                        <div className="font-black text-slate-900">৳{stats.totalSalesVolume.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">মোট অর্ডার সংখ্যা</div>
                        <div className="font-black text-slate-900">{stats.totalOrdersCount} টি</div>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold">মোট অর্জিত কমিশন</div>
                        <div className="font-black text-indigo-600">৳{stats.calculatedCommissionAccrued.toLocaleString()}</div>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold">পরিশোধিত কমিশন</div>
                        <div className="font-black text-emerald-600">৳{stats.totalPaid.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">বর্তমান বকেয়া</span>
                        <span className="text-base font-black text-rose-600">৳{stats.commissionDue.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => handleOpenCommissionSettlement(comp)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Coins size={13} /> নিষ্পত্তি করুন
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {companies.filter(c => c.billingModel === 'commission' || c.billingModel === 'hybrid').length === 0 && (
            <div className="py-12 text-center text-slate-400 font-bold space-y-2">
              <Coins size={36} className="mx-auto text-slate-300" />
              <p>বর্তমানে কোনো কোম্পানিতে কমিশন পলিসি সক্রিয় নেই।</p>
              <p className="text-xs text-slate-400">সাবস্ক্রিপশন প্ল্যান ট্যাব থেকে যেকোনো কোম্পানির বিলিং মডেল পরিবর্তন করে কমিশন সেট করতে পারেন।</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Invoices & History Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Receipt className="text-indigo-600" size={18} />
                সাবস্ক্রিপশন পেমেন্ট হিস্ট্রি ও অফিশিয়াল ইনভয়েস
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                কোম্পানিগুলোর নিকট হতে সংগৃহীত সাবস্ক্রিপশন ফি ও কমিশন সেটেলমেন্টের রেকর্ড।
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full">
              মোট রেকর্ড: {billingRecords.length} টি
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">ইনভয়েস নং ও তারিখ</th>
                  <th className="py-3 px-4">কোম্পানির নাম</th>
                  <th className="py-3 px-4">পেমেন্ট টাইপ</th>
                  <th className="py-3 px-4">মেথড ও ট্রানজেকশন ID</th>
                  <th className="py-3 px-4">পরিমাণ</th>
                  <th className="py-3 px-4 text-right">রসিদ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {billingRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      এখনো কোনো পেমেন্ট রেকর্ড সংরক্ষণ করা হয়নি।
                    </td>
                  </tr>
                ) : (
                  billingRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-indigo-700">{rec.id}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(rec.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {rec.companyName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${rec.type === 'subscription' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {rec.type === 'subscription' ? 'সাবস্ক্রিপশন ফি' : 'কমিশন সেটেলমেন্ট'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{rec.paymentMethod || 'ক্যাশ'}</div>
                        {rec.trxId && (
                          <div className="text-[10px] text-slate-400 font-mono">Trx: {rec.trxId}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                        ৳{rec.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setActiveInvoice(rec)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-bold rounded-lg text-xs transition-all inline-flex items-center gap-1"
                        >
                          <Printer size={12} /> ভিউ ইনভয়েস
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT COMPANY SUBSCRIPTION & BILLING PLAN */}
      {/* ------------------------------------------------------------- */}
      {isPlanModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shadow-xs"
                  style={{ backgroundColor: selectedCompany.headerBgColor || '#1e1e5f' }}
                >
                  {selectedCompany.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {selectedCompany.name} - বিলিং ও সাবস্ক্রিপশন পলিসি
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">প্ল্যান, ফি, ট্রায়াল বা সেলস কমিশন নির্ধারণ করুন</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPlanModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Billing Model Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  বিলিং মডেল নির্বাচন করুন:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditBillingModel('subscription')}
                    className={`p-3 rounded-xl border text-center transition-all ${editBillingModel === 'subscription' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-black' : 'border-slate-200 text-slate-600 font-bold hover:bg-slate-50'}`}
                  >
                    <CreditCard size={18} className="mx-auto mb-1 text-indigo-600" />
                    <span className="text-xs block">সাবস্ক্রিপশন ফি</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditBillingModel('commission')}
                    className={`p-3 rounded-xl border text-center transition-all ${editBillingModel === 'commission' ? 'border-purple-600 bg-purple-50 text-purple-700 font-black' : 'border-slate-200 text-slate-600 font-bold hover:bg-slate-50'}`}
                  >
                    <Coins size={18} className="mx-auto mb-1 text-purple-600" />
                    <span className="text-xs block">কমিশন মডেল</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditBillingModel('hybrid')}
                    className={`p-3 rounded-xl border text-center transition-all ${editBillingModel === 'hybrid' ? 'border-amber-600 bg-amber-50 text-amber-700 font-black' : 'border-slate-200 text-slate-600 font-bold hover:bg-slate-50'}`}
                  >
                    <Zap size={18} className="mx-auto mb-1 text-amber-600" />
                    <span className="text-xs block">ফি + কমিশন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditBillingModel('free')}
                    className={`p-3 rounded-xl border text-center transition-all ${editBillingModel === 'free' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-black' : 'border-slate-200 text-slate-600 font-bold hover:bg-slate-50'}`}
                  >
                    <ShieldCheck size={18} className="mx-auto mb-1 text-emerald-600" />
                    <span className="text-xs block">সম্পূর্ণ ফ্রি</span>
                  </button>
                </div>
              </div>

              {/* If Subscription or Hybrid: Choose Plan Preset or Custom */}
              {(editBillingModel === 'subscription' || editBillingModel === 'hybrid') && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                    সাবস্ক্রিপশন প্যাকেজ প্রিসেট:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PRESET_PLANS.map(preset => (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedPreset === preset.id ? 'border-indigo-600 bg-indigo-50/60 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">{preset.name}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black ${preset.badgeColor}`}>
                            {preset.badge}
                          </span>
                        </div>
                        <div className="text-sm font-black text-indigo-700 mt-1">
                          {preset.fee === 0 ? 'সম্পূর্ণ বিনামূল্যে' : `৳${preset.fee.toLocaleString()} / ${preset.cycle === 'yearly' ? 'বছর' : 'মাস'}`}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          মেয়াদ: {preset.days} দিন
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Custom fields */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">প্ল্যানের নাম</label>
                      <input
                        type="text"
                        value={customPlanName}
                        onChange={e => {
                          setCustomPlanName(e.target.value);
                          setSelectedPreset('custom');
                        }}
                        placeholder="প্ল্যানের নাম"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">ফি এর পরিমাণ (৳)</label>
                      <input
                        type="number"
                        value={customFee}
                        onChange={e => {
                          setCustomFee(Number(e.target.value));
                          setSelectedPreset('custom');
                        }}
                        placeholder="ফি"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">মেয়াদ শেষ হওয়ার নির্দিষ্ট তারিখ (Expiry Date)</label>
                      <input
                        type="date"
                        value={customExpiryDate}
                        onChange={e => setCustomExpiryDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* If Commission or Hybrid: Set Commission Percentage */}
              {(editBillingModel === 'commission' || editBillingModel === 'hybrid') && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="text-xs font-black text-purple-800 uppercase tracking-wider block">
                    সেলস কমিশন কনফিগারেশন:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">কমিশনের ধরন</label>
                      <select
                        value={commissionType}
                        onChange={e => setCommissionType(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      >
                        <option value="percentage">শতাংশ বা পারসেন্টেজ (%)</option>
                        <option value="fixed_per_sale">নির্দিষ্ট ফি প্রতি অর্ডার (৳)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        {commissionType === 'percentage' ? 'কমিশন রেট (%)' : 'প্রতি অর্ডারে ফি (৳)'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={customCommissionRate}
                        onChange={e => setCustomCommissionRate(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-purple-700 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSavePlanChanges}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-xs"
              >
                প্ল্যান সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: COLLECT PAYMENT / RENEW SUBSCRIPTION */}
      {/* ------------------------------------------------------------- */}
      {isPaymentModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSubmitPayment} className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <DollarSign className="text-emerald-600" size={18} />
                  পেমেন্ট সংগ্রহ ও সাবস্ক্রিপশন রিনিউ
                </h3>
                <p className="text-xs text-slate-500 font-medium">কোম্পানি: {selectedCompany.name}</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">পরিশোধের পরিমাণ (৳)</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">পেমেন্ট মেথড</label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="bKash">বিকাশ (bKash)</option>
                    <option value="Nagad">নগদ (Nagad)</option>
                    <option value="Rocket">রকেট (Rocket)</option>
                    <option value="Bank">ব্যাংক ট্রান্সফার</option>
                    <option value="Cash">ক্যাশ গ্রহণ</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">মেয়াদ বৃদ্ধি (Extension)</label>
                  <select
                    value={payExtendCycle}
                    onChange={e => setPayExtendCycle(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-emerald-700"
                  >
                    <option value="1_month">+১ মাস (৩০ দিন)</option>
                    <option value="3_month">+৩ মাস (৯০ দিন)</option>
                    <option value="6_month">+৬ মাস (১৮০ দিন)</option>
                    <option value="1_year">+১ বছর (৩৬৫ দিন)</option>
                    <option value="none">মেয়াদ অপরিবর্তিত রাখুন</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">ট্রানজেকশন ID (TrxID) / স্লিপ নং</label>
                <input
                  type="text"
                  value={payTrxId}
                  onChange={e => setPayTrxId(e.target.value)}
                  placeholder="e.g. 9J82KLS89"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">নোট বা মন্তব্য</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. জানুয়ারি মাসের সাবস্ক্রিপশন ফি"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmittingPay}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check size={14} /> পেমেন্ট কনফার্ম ও রিনিউ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: COMMISSION SETTLEMENT */}
      {/* ------------------------------------------------------------- */}
      {isCommissionModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSubmitCommission} className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Coins className="text-purple-600" size={18} />
                  কমিশন সেটেলমেন্ট ও নিষ্পত্তি
                </h3>
                <p className="text-xs text-slate-500 font-medium">কোম্পানি: {selectedCompany.name}</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsCommissionModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-100 text-xs flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-purple-700 font-bold block">মোট প্রদেয় কমিশন বকেয়া:</span>
                  <span className="text-base font-black text-purple-900">
                    ৳{getCompanyStats(selectedCompany).commissionDue.toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded font-black">
                  কমিশন রেট: {selectedCompany.commissionConfig?.rate ?? 2}%
                </span>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">আদায়কৃত সেটেলমেন্ট অ্যামাউন্ট (৳)</label>
                <input
                  type="number"
                  required
                  value={settleAmount}
                  onChange={e => setSettleAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">পেমেন্ট মেথড</label>
                  <select
                    value={settleMethod}
                    onChange={e => setSettleMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="Bank">ব্যাংক ট্রান্সফার</option>
                    <option value="bKash">বিকাশ (bKash)</option>
                    <option value="Nagad">নগদ (Nagad)</option>
                    <option value="Cash">ক্যাশ আদায়</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">TrxID / ভাউচার নং</label>
                  <input
                    type="text"
                    value={settleTrxId}
                    onChange={e => setSettleTrxId(e.target.value)}
                    placeholder="e.g. TR-998822"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={e => setSettleNotes(e.target.value)}
                  placeholder="e.g. সেলস কমিশন পূর্ণাঙ্গ নিষ্পত্তি"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCommissionModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmittingSettle}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check size={14} /> কমিশন সেটেল করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PRINTABLE OFFICIAL BILLING INVOICE / RECEIPT */}
      {/* ------------------------------------------------------------- */}
      {activeInvoice && (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="text-indigo-600" size={20} />
                <h3 className="text-base font-black text-slate-900">অফিশিয়াল বিলিং রসিদ / ইনভয়েস</h3>
              </div>
              <button 
                onClick={() => setActiveInvoice(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Invoice Card */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-5 font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">{shopSettings.name || 'REST BAZER'}</h2>
                  <p className="text-[11px] text-slate-500 font-medium">{shopSettings.address || 'Savar, Dhaka, Bangladesh'}</p>
                  <p className="text-[11px] text-slate-500 font-medium">মোবাইল: {shopSettings.phone || '017XXXXXXXX'}</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                    PAID / পরিশোধিত
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-700 mt-1">{activeInvoice.id}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(activeInvoice.createdAt).toLocaleDateString('bn-BD')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">বিল প্রাপক (Company):</span>
                  <span className="font-black text-slate-800 text-sm block">{activeInvoice.companyName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">বিলিং টাইপ:</span>
                  <span className="font-bold text-slate-700">
                    {activeInvoice.type === 'subscription' ? 'সফটওয়্যার সাবস্ক্রিপশন ফি' : 'সেলস কমিশন সেটেলমেন্ট'}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                <div className="bg-slate-100 p-2.5 font-black text-slate-600 flex justify-between">
                  <span>বিবরণ</span>
                  <span>পরিমাণ</span>
                </div>
                <div className="p-3 flex justify-between border-b border-slate-100">
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {activeInvoice.planName || (activeInvoice.type === 'subscription' ? 'সাবস্ক্রিপশন রিনিউ ফি' : 'সেলস কমিশন নিষ্পত্তি')}
                    </span>
                    {activeInvoice.cycle && (
                      <span className="text-[10px] text-slate-400 block">মেয়াদ: {activeInvoice.cycle}</span>
                    )}
                    {activeInvoice.notes && (
                      <span className="text-[10px] text-slate-500 block italic">{activeInvoice.notes}</span>
                    )}
                  </div>
                  <span className="font-black text-slate-900">৳{activeInvoice.amount.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 flex justify-between font-black text-slate-900 text-sm">
                  <span>মোট পরিশোধিত</span>
                  <span className="text-emerald-600">৳{activeInvoice.paidAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-500">
                <div>
                  <span className="font-bold text-slate-700">মেথড: </span> {activeInvoice.paymentMethod}
                </div>
                {activeInvoice.trxId && (
                  <div>
                    <span className="font-bold text-slate-700">TrxID: </span> {activeInvoice.trxId}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Printer size={14} /> প্রিন্ট ইনভয়েস
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
