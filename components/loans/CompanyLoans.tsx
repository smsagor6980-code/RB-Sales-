import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  Eye, 
  Paperclip, 
  Bell, 
  ShieldAlert, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Check,
  Building,
  CreditCard,
  Percent,
  Lock
} from 'lucide-react';
import { CompanyLoan, LoanPayment, ShopSettings, Staff } from '../../types';
import { formatBDT, exportLoansToCSV, recalculateLoanStatus } from './loanUtils';
import { LoanFormModal } from './LoanFormModal';
import { LoanPaymentModal } from './LoanPaymentModal';
import { LoanStatementModal } from './LoanStatementModal';
import { LoanDetailsModal } from './LoanDetailsModal';

interface CompanyLoansProps {
  companyLoans: CompanyLoan[];
  onUpdateLoan: (loan: CompanyLoan) => void;
  onDeleteLoan: (id: string) => void;
  onAddExpense?: (expense: { amount: number; category: string; description: string; date: string }) => void;
  shopSettings?: ShopSettings;
  isAdmin?: boolean;
  currentStaff?: Staff | null;
}

export const CompanyLoans: React.FC<CompanyLoansProps> = ({
  companyLoans = [],
  onUpdateLoan,
  onDeleteLoan,
  onAddExpense,
  shopSettings,
  isAdmin = true,
  currentStaff
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed' | 'closed'>('all');
  const [providerTypeFilter, setProviderTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'reports'>('cards');
  const [reportTab, setReportTab] = useState<'loan_wise' | 'monthly' | 'yearly' | 'interest'>('loan_wise');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<CompanyLoan | null>(null);
  const [paymentLoan, setPaymentLoan] = useState<CompanyLoan | null>(null);
  const [statementLoan, setStatementLoan] = useState<CompanyLoan | null>(null);
  const [detailsLoan, setDetailsLoan] = useState<CompanyLoan | null>(null);

  // Auto-audit and update overdue statuses based on current date
  const loansWithStatus = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return companyLoans.map(loan => {
      const recalc = recalculateLoanStatus(loan);
      return {
        ...loan,
        ...recalc
      };
    });
  }, [companyLoans]);

  // Key 6 KPI Metrics
  const metrics = useMemo(() => {
    let totalLoanPrincipal = 0;
    let totalPaidAmount = 0;
    let totalOutstanding = 0;
    let totalInterestPaid = 0;
    let upcomingInstallmentsTotal = 0;
    let overdueTotal = 0;
    let overdueCount = 0;
    let activeLoansCount = 0;

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    loansWithStatus.forEach(l => {
      totalLoanPrincipal += Number(l.principalAmount) || 0;
      totalPaidAmount += Number(l.totalPaidAmount) || 0;
      totalOutstanding += Number(l.remainingLoan) || 0;
      totalInterestPaid += Number(l.totalInterestPaid) || 0;

      if (l.status === 'active') {
        activeLoansCount++;
        // upcoming in 7 days
        if (l.nextPaymentDate && l.nextPaymentDate >= today && l.nextPaymentDate <= sevenDaysLater) {
          upcomingInstallmentsTotal += Number(l.nextPaymentAmount) || Number(l.installmentAmount) || 0;
        } else if (l.nextPaymentDate && l.nextPaymentDate >= today) {
          upcomingInstallmentsTotal += Number(l.nextPaymentAmount) || Number(l.installmentAmount) || 0;
        }
      }

      if (l.status === 'overdue' || (l.dueDate && today > l.dueDate && l.remainingLoan > 0)) {
        overdueCount++;
        overdueTotal += Number(l.remainingLoan) || 0;
      }
    });

    return {
      totalLoanPrincipal,
      totalPaidAmount,
      totalOutstanding,
      totalInterestPaid,
      upcomingInstallmentsTotal,
      overdueTotal,
      overdueCount,
      activeLoansCount
    };
  }, [loansWithStatus]);

  // Filtering loans
  const filteredLoans = useMemo(() => {
    return loansWithStatus.filter(l => {
      const matchSearch = 
        (l.providerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.loanIdNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.bankAccountNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.id || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchProvider = providerTypeFilter === 'all' || l.providerType === providerTypeFilter;

      return matchSearch && matchStatus && matchProvider;
    });
  }, [loansWithStatus, searchQuery, statusFilter, providerTypeFilter]);

  // Reminder & Overdue Loans
  const reminderLoans = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return loansWithStatus.filter(l => {
      if (l.status === 'completed' || l.status === 'closed') return false;
      if (l.status === 'overdue') return true;
      if (l.nextPaymentDate && l.nextPaymentDate <= sevenDaysLater) return true;
      return false;
    });
  }, [loansWithStatus]);

  // Monthly Report Calculations
  const monthlyReport = useMemo(() => {
    const monthsMap: Record<string, { month: string; principalPaid: number; interestPaid: number; penaltyPaid: number; totalPaid: number; count: number }> = {};
    
    loansWithStatus.forEach(loan => {
      (loan.payments || []).forEach(p => {
        if (!p.paymentDate) return;
        const monthKey = p.paymentDate.slice(0, 7); // YYYY-MM
        if (!monthsMap[monthKey]) {
          monthsMap[monthKey] = {
            month: monthKey,
            principalPaid: 0,
            interestPaid: 0,
            penaltyPaid: 0,
            totalPaid: 0,
            count: 0
          };
        }
        monthsMap[monthKey].principalPaid += Number(p.principalPaid) || 0;
        monthsMap[monthKey].interestPaid += Number(p.interestPaid) || 0;
        monthsMap[monthKey].penaltyPaid += Number(p.penaltyPaid) || 0;
        monthsMap[monthKey].totalPaid += Number(p.amount) || 0;
        monthsMap[monthKey].count += 1;
      });
    });

    return Object.values(monthsMap).sort((a, b) => b.month.localeCompare(a.month));
  }, [loansWithStatus]);

  // Yearly Report Calculations
  const yearlyReport = useMemo(() => {
    const yearsMap: Record<string, { year: string; principalPaid: number; interestPaid: number; penaltyPaid: number; totalPaid: number; count: number }> = {};
    
    loansWithStatus.forEach(loan => {
      (loan.payments || []).forEach(p => {
        if (!p.paymentDate) return;
        const yearKey = p.paymentDate.slice(0, 4); // YYYY
        if (!yearsMap[yearKey]) {
          yearsMap[yearKey] = {
            year: yearKey,
            principalPaid: 0,
            interestPaid: 0,
            penaltyPaid: 0,
            totalPaid: 0,
            count: 0
          };
        }
        yearsMap[yearKey].principalPaid += Number(p.principalPaid) || 0;
        yearsMap[yearKey].interestPaid += Number(p.interestPaid) || 0;
        yearsMap[yearKey].penaltyPaid += Number(p.penaltyPaid) || 0;
        yearsMap[yearKey].totalPaid += Number(p.amount) || 0;
        yearsMap[yearKey].count += 1;
      });
    });

    return Object.values(yearsMap).sort((a, b) => b.year.localeCompare(a.year));
  }, [loansWithStatus]);

  // Handlers
  const handleSaveLoan = (loan: CompanyLoan) => {
    onUpdateLoan(loan);
  };

  const handleSavePayment = (updatedLoan: CompanyLoan, newPayment: LoanPayment) => {
    onUpdateLoan(updatedLoan);

    // Optionally record installment as an expense if interest or loan payment is tracked in expenses
    if (onAddExpense && newPayment.amount > 0) {
      onAddExpense({
        amount: newPayment.amount,
        category: 'কোম্পানি ঋণ কিস্তি পরিশোধ',
        description: `ঋণ কিস্তি #${newPayment.installmentNo || 1} - ${updatedLoan.providerName} (${updatedLoan.loanIdNumber || updatedLoan.id})`,
        date: newPayment.paymentDate || new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleCloseLoan = (loanId: string, reason: string) => {
    const target = loansWithStatus.find(l => l.id === loanId);
    if (!target) return;
    const updated: CompanyLoan = {
      ...target,
      status: 'closed',
      closedDate: new Date().toISOString().split('T')[0],
      closureReason: reason,
      updatedAt: new Date().toISOString()
    };
    onUpdateLoan(updated);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`আপনি কি নিশ্চিত যে "${name}" ঋণের সম্পূর্ণ রেকর্ড মুছে ফেলতে চান?`)) {
      onDeleteLoan(id);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 p-6 sm:p-7 rounded-3xl text-white shadow-xl shadow-amber-950/20 border border-amber-600/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
            <Landmark size={32} className="text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                কোম্পানি লোন ম্যানেজমেন্ট (Company Loan 💰)
              </h1>
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                {loansWithStatus.length}টি ঋণ তালিকাভুক্ত
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-100/90 font-medium mt-1">
              কোম্পানির যাবতীয় ব্যাংক লোন, এনজিও ঋণ, কিস্তির সময়সূচি, সুদ ও স্টেটমেন্ট হিসাব
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 z-10 w-full md:w-auto">
          <button
            onClick={() => exportLoansToCSV(loansWithStatus)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold transition-all"
          >
            <Download size={15} />
            <span>Excel এক্সপোর্ট</span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => {
                setEditingLoan(null);
                setIsFormOpen(true);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02]"
            >
              <Plus size={18} />
              <span>নতুন ঋণ যোগ করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 Key Dashboard KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Loan */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">মোট ঋণ (গৃহীত)</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Landmark size={16} />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900">{formatBDT(metrics.totalLoanPrincipal)}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">কোম্পানির মোট নেওয়া আসল</p>
        </div>

        {/* 2. Paid Amount */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">পরিশোধিত টাকা</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-700">{formatBDT(metrics.totalPaidAmount)}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">আসল + সুদ সহ পরিশোধ</p>
        </div>

        {/* 3. Outstanding */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider">বাকি ঋণ (Due)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingDown size={16} />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-amber-900">{formatBDT(metrics.totalOutstanding)}</p>
          <p className="text-[10px] text-amber-700 font-medium mt-0.5">মোট বর্তমান বকেয়া ঋণ</p>
        </div>

        {/* 4. Interest Paid */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-rose-600 uppercase tracking-wider">পরিশোধিত সুদ</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Percent size={16} />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-rose-700">{formatBDT(metrics.totalInterestPaid)}</p>
          <p className="text-[10px] text-rose-500 font-medium mt-0.5">এখন পর্যন্ত দেওয়া সুদ</p>
        </div>

        {/* 5. Upcoming Installment */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider">আসন্ন কিস্তি</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-blue-800">{formatBDT(metrics.upcomingInstallmentsTotal)}</p>
          <p className="text-[10px] text-blue-600 font-medium mt-0.5">সামনে প্রদেয় কিস্তির যোগফল</p>
        </div>

        {/* 6. Overdue Amount */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-rose-600 uppercase tracking-wider">ওভারডিউ (Overdue)</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-rose-800">{formatBDT(metrics.overdueTotal)}</p>
          <p className="text-[10px] text-rose-600 font-medium mt-0.5">{metrics.overdueCount} টি ঋণে বিলম্ব</p>
        </div>
      </div>

      {/* Reminder & Overdue Alert Banner (If Any) */}
      {reminderLoans.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl">
              <Bell size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-amber-900">
                কিস্তির রিমাইন্ডার ও ওভারডিউ অ্যালার্ট ({reminderLoans.length}টি ঋণ)
              </h3>
              <p className="text-xs text-amber-700">
                নিকটবর্তী কিস্তির তারিখ অথবা বকেয়া কিস্তির তথ্য এক নজরে চেক করুন।
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reminderLoans.slice(0, 2).map(rl => (
              <span key={rl.id} className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded-lg text-[10px] font-bold">
                {rl.providerName}: {rl.nextPaymentDate || 'Due'} ({formatBDT(rl.nextPaymentAmount || rl.installmentAmount)})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Filter & Navigation Tabs Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সকল ({loansWithStatus.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              চলমান / Active ({loansWithStatus.filter(l => l.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                statusFilter === 'overdue'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              বিলম্বিত / Overdue ({loansWithStatus.filter(l => l.status === 'overdue').length})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                statusFilter === 'completed'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              পরিশোধিত ({loansWithStatus.filter(l => l.status === 'completed').length})
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                statusFilter === 'closed'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ক্লোজড ({loansWithStatus.filter(l => l.status === 'closed').length})
            </button>
          </div>

          {/* View Mode Toggle: Cards / Table / Reports */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              কার্ড ভিউ
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              টেবিল ভিউ
            </button>
            <button
              onClick={() => setViewMode('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'reports' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 size={13} />
              <span>রিপোর্টস</span>
            </button>
          </div>
        </div>

        {/* Search & Provider Type Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-2 relative">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ব্যাংক, এনজিও, ঋণদাতার নাম, Loan ID বা একাউন্ট নম্বর দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <select
              value={providerTypeFilter}
              onChange={(e) => setProviderTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">সকল ঋণদাতা (All Providers)</option>
              <option value="bank">বাণিজ্যিক ব্যাংক (Banks)</option>
              <option value="ngo">এনজিও / সমিতি (NGOs)</option>
              <option value="company">কোম্পানি / কর্পোরেট</option>
              <option value="financial_institution">আর্থিক প্রতিষ্ঠান (NBFI)</option>
              <option value="individual">ব্যক্তিগত ঋণ (Personal)</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: Cards View */}
      {viewMode === 'cards' && (
        <div>
          {filteredLoans.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
              <Landmark size={48} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-black text-slate-700">কোনো ঋণের তথ্য পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-400 mt-1">
                নতুন ঋণ যোগ করতে উপরের &quot;নতুন ঋণ যোগ করুন&quot; বাটনে ক্লিক করুন।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLoans.map((loan) => {
                const paidPercent = loan.totalPayable > 0 
                  ? Math.min(100, Math.round((loan.totalPaidAmount / loan.totalPayable) * 100))
                  : 0;

                return (
                  <div
                    key={loan.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                              {loan.loanIdNumber || loan.id}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 capitalize">
                              {loan.providerType}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-slate-900 mt-1 truncate">
                            {loan.providerName}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {loan.status === 'completed' && (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                              পরিশোধিত ✓
                            </span>
                          )}
                          {loan.status === 'overdue' && (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px] font-black animate-pulse">
                              ওভারডিউ ⚠️
                            </span>
                          )}
                          {loan.status === 'active' && (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black">
                              চলমান
                            </span>
                          )}
                          {loan.status === 'closed' && (
                            <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full text-[10px] font-black">
                              ক্লোজড
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amounts Breakdown */}
                      <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">মোট প্রদেয়</span>
                          <span className="font-black text-slate-800">{formatBDT(loan.totalPayable)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">বর্তমান বকেয়া (Due)</span>
                          <span className="font-black text-amber-800">{formatBDT(loan.remainingLoan)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">প্রতি কিস্তি</span>
                          <span className="font-black text-emerald-700">{formatBDT(loan.installmentAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">সুদের হার</span>
                          <span className="font-bold text-slate-700">{loan.interestRate}% ({loan.interestType})</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>পরিশোধের অগ্রগতি</span>
                          <span>{paidPercent}% ({formatBDT(loan.totalPaidAmount)})</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              loan.status === 'completed'
                                ? 'bg-emerald-500'
                                : loan.status === 'overdue'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${paidPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Next Payment info */}
                      {loan.status !== 'completed' && loan.status !== 'closed' && (
                        <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-600 bg-amber-50/60 px-3 py-1.5 rounded-xl border border-amber-200/60">
                          <span className="text-[10px] text-amber-800">পরবর্তী কিস্তি:</span>
                          <span className="text-amber-950 font-black">{loan.nextPaymentDate || 'N/A'}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setPaymentLoan(loan)}
                        disabled={loan.status === 'completed' || loan.status === 'closed'}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-colors shadow-xs"
                      >
                        <Plus size={13} />
                        <span>কিস্তি দিন</span>
                      </button>

                      <button
                        onClick={() => setStatementLoan(loan)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                        title="স্টেটমেন্ট প্রিন্ট"
                      >
                        <FileText size={15} />
                      </button>

                      <button
                        onClick={() => setDetailsLoan(loan)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                        title="বিস্তারিত দেখুন"
                      >
                        <Eye size={15} />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={() => {
                              setEditingLoan(loan);
                              setIsFormOpen(true);
                            }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                            title="এডিট"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(loan.id, loan.providerName)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
                <tr>
                  <th className="py-3 px-4">Loan ID</th>
                  <th className="py-3 px-4">ঋণ প্রদানকারী</th>
                  <th className="py-3 px-4">গৃহীত ঋণ (আসল)</th>
                  <th className="py-3 px-4">সুদ (%)</th>
                  <th className="py-3 px-4">মোট প্রদেয়</th>
                  <th className="py-3 px-4">পরিশোধিত</th>
                  <th className="py-3 px-4">বাকি (Due)</th>
                  <th className="py-3 px-4">প্রতি কিস্তি</th>
                  <th className="py-3 px-4">পরবর্তী কিস্তি</th>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-center">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 font-medium">
                      কোনো ঋণের তথ্য পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{loan.loanIdNumber || loan.id}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{loan.providerName}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{loan.providerType} • {loan.loanType}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{formatBDT(loan.principalAmount)}</td>
                      <td className="py-3 px-4 text-slate-600">{loan.interestRate}% ({loan.interestType})</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{formatBDT(loan.totalPayable)}</td>
                      <td className="py-3 px-4 font-black text-emerald-700">{formatBDT(loan.totalPaidAmount)}</td>
                      <td className="py-3 px-4 font-black text-amber-800">{formatBDT(loan.remainingLoan)}</td>
                      <td className="py-3 px-4 font-bold text-slate-700">{formatBDT(loan.installmentAmount)}</td>
                      <td className="py-3 px-4 text-slate-700">{loan.nextPaymentDate || 'N/A'}</td>
                      <td className="py-3 px-4">
                        {loan.status === 'completed' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">পরিশোধিত</span>}
                        {loan.status === 'overdue' && <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-black">ওভারডিউ</span>}
                        {loan.status === 'active' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black">চলমান</span>}
                        {loan.status === 'closed' && <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-black">ক্লোজড</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPaymentLoan(loan)}
                            disabled={loan.status === 'completed' || loan.status === 'closed'}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-[10px] font-black transition-colors"
                          >
                            পেমেন্ট
                          </button>
                          <button
                            onClick={() => setStatementLoan(loan)}
                            className="p-1 text-slate-500 hover:text-slate-900"
                            title="স্টেটমেন্ট"
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            onClick={() => setDetailsLoan(loan)}
                            className="p-1 text-slate-500 hover:text-slate-900"
                            title="ডিটেইলস"
                          >
                            <Eye size={15} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingLoan(loan);
                                setIsFormOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-900"
                              title="এডিট"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Reports & Analytics */}
      {viewMode === 'reports' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">ঋণ সংক্রান্ত বিস্তারিত রিপোর্টস</h2>
              <p className="text-xs text-slate-400">প্রতিটি ঋণ, মাসিক ও বার্ষিক পরিশোধ এবং সুদের সমন্বিত রিপোর্ট</p>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setReportTab('loan_wise')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${reportTab === 'loan_wise' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
              >
                ঋণ-ভিত্তিক রিপোর্ট
              </button>
              <button
                onClick={() => setReportTab('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${reportTab === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
              >
                মাসিক রিপোর্ট
              </button>
              <button
                onClick={() => setReportTab('yearly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${reportTab === 'yearly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
              >
                বার্ষিক রিপোর্ট
              </button>
              <button
                onClick={() => setReportTab('interest')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${reportTab === 'interest' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
              >
                সুদের রিপোর্ট
              </button>
            </div>
          </div>

          {/* Sub-report: Loan-wise */}
          {reportTab === 'loan_wise' && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">ঋণদাতা / Loan ID</th>
                    <th className="py-2.5 px-3">ঋণের আসল</th>
                    <th className="py-2.5 px-3">মোট প্রদেয়</th>
                    <th className="py-2.5 px-3">আসল পরিশোধ</th>
                    <th className="py-2.5 px-3">সুদ পরিশোধ</th>
                    <th className="py-2.5 px-3">জরিমানা</th>
                    <th className="py-2.5 px-3">মোট পরিশোধ</th>
                    <th className="py-2.5 px-3">বাকি ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loansWithStatus.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{l.providerName}</span>
                        <span className="text-[10px] text-slate-400">{l.loanIdNumber || l.id}</span>
                      </td>
                      <td className="py-2.5 px-3">{formatBDT(l.principalAmount)}</td>
                      <td className="py-2.5 px-3 font-bold">{formatBDT(l.totalPayable)}</td>
                      <td className="py-2.5 px-3 text-slate-700">{formatBDT(l.totalPrincipalPaid)}</td>
                      <td className="py-2.5 px-3 text-rose-600">{formatBDT(l.totalInterestPaid)}</td>
                      <td className="py-2.5 px-3 text-amber-600">{formatBDT(l.totalPenaltyPaid)}</td>
                      <td className="py-2.5 px-3 font-black text-emerald-700">{formatBDT(l.totalPaidAmount)}</td>
                      <td className="py-2.5 px-3 font-black text-amber-900">{formatBDT(l.remainingLoan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-report: Monthly */}
          {reportTab === 'monthly' && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">মাস (Month)</th>
                    <th className="py-2.5 px-3">কিস্তির সংখ্যা</th>
                    <th className="py-2.5 px-3">আসল পরিশোধ</th>
                    <th className="py-2.5 px-3">সুদ পরিশোধ</th>
                    <th className="py-2.5 px-3">জরিমানা</th>
                    <th className="py-2.5 px-3">মাসে মোট পরিশোধিত টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyReport.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">কোনো মাসিক পেমেন্ট রেকর্ড নেই</td>
                    </tr>
                  ) : (
                    monthlyReport.map((m) => (
                      <tr key={m.month} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-black text-slate-800">{m.month}</td>
                        <td className="py-2.5 px-3">{m.count} টি</td>
                        <td className="py-2.5 px-3 font-bold text-slate-700">{formatBDT(m.principalPaid)}</td>
                        <td className="py-2.5 px-3 font-bold text-rose-600">{formatBDT(m.interestPaid)}</td>
                        <td className="py-2.5 px-3 text-amber-600">{formatBDT(m.penaltyPaid)}</td>
                        <td className="py-2.5 px-3 font-black text-emerald-700">{formatBDT(m.totalPaid)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-report: Yearly */}
          {reportTab === 'yearly' && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">বছর (Year)</th>
                    <th className="py-2.5 px-3">মোট কিস্তি</th>
                    <th className="py-2.5 px-3">আসল পরিশোধ</th>
                    <th className="py-2.5 px-3">সুদ পরিশোধ</th>
                    <th className="py-2.5 px-3">জরিমানা</th>
                    <th className="py-2.5 px-3">বছরে মোট পরিশোধিত টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {yearlyReport.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">কোনো বার্ষিক পেমেন্ট রেকর্ড নেই</td>
                    </tr>
                  ) : (
                    yearlyReport.map((y) => (
                      <tr key={y.year} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-black text-slate-800">{y.year}</td>
                        <td className="py-2.5 px-3">{y.count} টি</td>
                        <td className="py-2.5 px-3 font-bold text-slate-700">{formatBDT(y.principalPaid)}</td>
                        <td className="py-2.5 px-3 font-bold text-rose-600">{formatBDT(y.interestPaid)}</td>
                        <td className="py-2.5 px-3 text-amber-600">{formatBDT(y.penaltyPaid)}</td>
                        <td className="py-2.5 px-3 font-black text-emerald-700">{formatBDT(y.totalPaid)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-report: Interest */}
          {reportTab === 'interest' && (
            <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-rose-100">
                  <span className="text-slate-500 font-bold block">মোট প্রাক্কলিত সুদ</span>
                  <span className="text-base font-black text-rose-700">
                    {formatBDT(loansWithStatus.reduce((s, l) => s + (l.totalInterest || 0), 0))}
                  </span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-rose-100">
                  <span className="text-slate-500 font-bold block">ইতিমধ্যে পরিশোধিত সুদ</span>
                  <span className="text-base font-black text-emerald-700">
                    {formatBDT(metrics.totalInterestPaid)}
                  </span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-rose-100">
                  <span className="text-slate-500 font-bold block">ভবিষ্যতে প্রদেয় অবশিষ্ট সুদ</span>
                  <span className="text-base font-black text-amber-900">
                    {formatBDT(Math.max(0, loansWithStatus.reduce((s, l) => s + (l.totalInterest || 0), 0) - metrics.totalInterestPaid))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <LoanFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLoan(null);
        }}
        onSave={handleSaveLoan}
        initialData={editingLoan}
        currentStaffName={currentStaff?.name}
        currentStaffId={currentStaff?.id}
      />

      <LoanPaymentModal
        isOpen={!!paymentLoan}
        onClose={() => setPaymentLoan(null)}
        loan={paymentLoan}
        onSavePayment={handleSavePayment}
        currentStaffName={currentStaff?.name}
        currentStaffId={currentStaff?.id}
      />

      <LoanStatementModal
        isOpen={!!statementLoan}
        onClose={() => setStatementLoan(null)}
        loan={statementLoan}
        shopSettings={shopSettings}
      />

      <LoanDetailsModal
        isOpen={!!detailsLoan}
        onClose={() => setDetailsLoan(null)}
        loan={detailsLoan}
        onOpenEdit={(l) => {
          setDetailsLoan(null);
          setEditingLoan(l);
          setIsFormOpen(true);
        }}
        onOpenPayment={(l) => {
          setDetailsLoan(null);
          setPaymentLoan(l);
        }}
        onOpenStatement={(l) => {
          setDetailsLoan(null);
          setStatementLoan(l);
        }}
        onCloseLoan={handleCloseLoan}
      />

    </div>
  );
};
