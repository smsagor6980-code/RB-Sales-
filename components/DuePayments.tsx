import React, { useState, useMemo } from 'react';
import { Customer, Sale, Collection, Staff, RankConfig, CustomerLoan, CustomerLoanRepayment } from '../types';
import { 
  DollarSign, Search, AlertCircle, Check, X, History, User, 
  Calendar, Calculator, TrendingUp, Wallet, ArrowRight,
  ChevronRight, Receipt, ArrowDownLeft, Trash2, Info, Clock,
  CheckCircle2, AlertTriangle, Users, Phone, Plus, Printer,
  FileText, HandCoins, ArrowUpRight, ShieldCheck, BadgePercent,
  CreditCard, Sparkles, Building2, MapPin
} from 'lucide-react';

interface DuePaymentsProps {
  customers: Customer[];
  sales: Sale[];
  collections: Collection[];
  onCollection: (collection: Collection, customer: Customer) => void;
  customerLoans?: CustomerLoan[];
  onUpdateCustomerLoans?: (data: CustomerLoan[]) => void;
  onDeleteCustomerLoan?: (id: string) => void;
  isAdmin: boolean;
  currentStaff?: Staff | null;
  rankConfigs: RankConfig[];
  shopSettings?: any;
}

const DuePayments: React.FC<DuePaymentsProps> = ({ 
  customers, 
  sales, 
  collections, 
  onCollection, 
  customerLoans = [],
  onUpdateCustomerLoans,
  onDeleteCustomerLoan,
  isAdmin, 
  currentStaff,
  rankConfigs,
  shopSettings
}) => {
  // Main Tab State: Sales Due vs Customer Advance & Loans
  const [mainTab, setMainTab] = useState<'sales_due' | 'customer_loans'>('customer_loans');
  
  // Sales Due States
  const [searchTerm, setSearchTerm] = useState('');
  const [collectionModal, setCollectionModal] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<'products' | 'collections'>('products');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');

  // Loan Management States
  const [loanSearchTerm, setLoanSearchTerm] = useState('');
  const [loanFilter, setLoanFilter] = useState<'all' | 'active' | 'advance' | 'loan' | 'repaid' | 'overdue'>('all');
  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [repayLoanModal, setRepayLoanModal] = useState<CustomerLoan | null>(null);
  const [viewLoanDetailsModal, setViewLoanDetailsModal] = useState<CustomerLoan | null>(null);

  // New Loan Form State
  const [newLoanCustomerSearch, setNewLoanCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState('');
  const [customCustomerAddress, setCustomCustomerAddress] = useState('');
  const [loanType, setLoanType] = useState<'advance' | 'loan'>('advance');
  const [loanAmount, setLoanAmount] = useState('');
  const [disbursedMethod, setDisbursedMethod] = useState('Cash');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanDueDate, setLoanDueDate] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');

  // Loan Repayment Form State
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState('Cash');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayNote, setRepayNote] = useState('');

  const today = new Date().toLocaleDateString('en-CA');

  // Sales Due Stats
  const stats = useMemo(() => {
    let filteredCusts = customers;
    let filteredCols = collections;
    
    if (!isAdmin && currentStaff) {
      filteredCusts = customers.filter(c => c.addedBy === currentStaff.id);
      filteredCols = collections.filter(col => col.addedBy === currentStaff.id);
    }

    const totalDue = filteredCusts.reduce((sum, c) => sum + (c.dueAmount || 0), 0);
    const totalTodayCollected = filteredCols
      .filter(col => col.date === today)
      .reduce((sum, col) => sum + col.amount, 0);
    const dueCustomersCount = filteredCusts.filter(c => (c.dueAmount || 0) > 1).length;

    return { totalDue, totalTodayCollected, dueCustomersCount };
  }, [customers, collections, today, isAdmin, currentStaff]);

  // Customer Loans Stats
  const loanStats = useMemo(() => {
    let base = customerLoans;
    if (!isAdmin && currentStaff) {
      base = customerLoans.filter(l => l.addedBy === currentStaff.id);
    }

    const totalDisbursed = base.reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalOutstanding = base.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
    const totalRepaid = totalDisbursed - totalOutstanding;
    const activeLoansCount = base.filter(l => (l.remainingAmount || 0) > 0).length;
    const repaidLoansCount = base.filter(l => (l.remainingAmount || 0) <= 0 || l.status === 'repaid').length;
    
    const overdueCount = base.filter(l => {
      if ((l.remainingAmount || 0) <= 0) return false;
      if (!l.dueDate) return false;
      return new Date(l.dueDate) < new Date(today);
    }).length;

    return { totalDisbursed, totalOutstanding, totalRepaid, activeLoansCount, repaidLoansCount, overdueCount };
  }, [customerLoans, today, isAdmin, currentStaff]);

  // Filtered Customer Loans
  const filteredCustomerLoans = useMemo(() => {
    let base = customerLoans;
    if (!isAdmin && currentStaff) {
      base = customerLoans.filter(l => l.addedBy === currentStaff.id);
    }

    return base.filter(l => {
      // Search
      const term = loanSearchTerm.toLowerCase();
      const matchSearch = 
        (l.customerName || '').toLowerCase().includes(term) ||
        (l.customerPhone || '').includes(term) ||
        (l.loanNo || '').toLowerCase().includes(term) ||
        (l.purpose || '').toLowerCase().includes(term);

      if (!matchSearch) return false;

      // Filter
      if (loanFilter === 'all') return true;
      if (loanFilter === 'active') return (l.remainingAmount || 0) > 0 && l.status !== 'cancelled';
      if (loanFilter === 'advance') return l.type === 'advance';
      if (loanFilter === 'loan') return l.type === 'loan';
      if (loanFilter === 'repaid') return (l.remainingAmount || 0) <= 0 || l.status === 'repaid';
      if (loanFilter === 'overdue') {
        return (l.remainingAmount || 0) > 0 && l.dueDate && new Date(l.dueDate) < new Date(today);
      }
      return true;
    }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [customerLoans, loanSearchTerm, loanFilter, today, isAdmin, currentStaff]);

  // Filtered Due Customers
  const dueCustomers = useMemo(() => {
    let base = customers;
    if (!isAdmin && currentStaff) {
      base = customers.filter(c => c.addedBy === currentStaff.id);
    }

    return base.filter(c => 
      (c.dueAmount || 0) > 0.1 && 
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm))
    ).sort((a, b) => b.dueAmount - a.dueAmount);
  }, [customers, searchTerm, isAdmin, currentStaff]);

  const activeCustomer = customers.find(c => c.id === collectionModal);
  const historyCustomer = customers.find(c => c.id === historyModal);

  const customerCollections = useMemo(() => {
    if (!historyModal) return [];
    let base = collections.filter(col => col.customerId === historyModal);
    if (!isAdmin && currentStaff) {
      base = base.filter(col => col.addedBy === currentStaff.id);
    }
    return base.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [collections, historyModal, isAdmin, currentStaff]);

  const productDueRecords = useMemo(() => {
    if (!historyCustomer) return [];

    const customerSales = sales.filter(s => s.customerId === historyCustomer.id);

    interface RawItem {
      date: string;
      invoiceNo: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      cost: number;
    }

    const items: RawItem[] = [];
    customerSales.forEach(sale => {
      if (!sale || !sale.items) return;
      const itemsTotal = sale.items.reduce((sum, item) => sum + (item.total || 0), 0);
      const scaleFactor = itemsTotal > 0 ? (sale.total / itemsTotal) : 1;

      sale.items.forEach(item => {
        items.push({
          date: sale.date,
          invoiceNo: sale.invoiceNo,
          productName: item.productName || 'Unknown Product',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          cost: (item.total || 0) * scaleFactor,
        });
      });
    });

    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalPurchase = historyCustomer.totalPurchase || 0;
    const dueAmount = historyCustomer.dueAmount || 0;
    let remainingPaid = Math.max(0, totalPurchase - dueAmount);

    const records = items.map(item => {
      let allocatedPaid = 0;
      if (remainingPaid >= item.cost) {
        allocatedPaid = item.cost;
        remainingPaid -= item.cost;
      } else if (remainingPaid > 0) {
        allocatedPaid = remainingPaid;
        remainingPaid = 0;
      }

      const itemDue = Math.max(0, item.cost - allocatedPaid);

      return {
        date: item.date,
        invoiceNo: item.invoiceNo,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        cost: item.cost,
        paid: allocatedPaid,
        due: itemDue,
      };
    });

    const recordsDueSum = records.reduce((sum, r) => sum + r.due, 0);
    const diff = dueAmount - recordsDueSum;
    if (diff > 1) {
      records.push({
        date: historyCustomer.dateAdded || 'N/A',
        invoiceNo: 'N/A',
        productName: 'পূর্বের বকেয়া হিসাব (Previous Due Balance)',
        quantity: 1,
        unitPrice: diff,
        cost: diff,
        paid: 0,
        due: diff,
      });
    }

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, historyCustomer]);

  // Handle Sales Due Collection
  const handleCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionModal || !activeCustomer) return;
    const collectAmount = parseFloat(amount);
    if (isNaN(collectAmount) || collectAmount <= 0) return;

    onCollection({
      id: Date.now().toString(), 
      customerId: activeCustomer.id, 
      customerName: activeCustomer.name,
      amount: collectAmount, 
      paymentMethod: method, 
      date: today, 
      notes: note,
      addedBy: currentStaff?.id
    }, {
      ...activeCustomer, 
      dueAmount: Math.max(0, activeCustomer.dueAmount - collectAmount), 
      totalPaid: (activeCustomer.totalPaid || 0) + collectAmount
    });
    setCollectionModal(null);
    setAmount('');
    setNote('');
  };

  // Handle New Loan / Advance Creation
  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(loanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("অনুগ্রহ করে সঠিক টাকার পরিমাণ প্রদান করুন।");
      return;
    }

    let customerName = customCustomerName.trim();
    let customerPhone = customCustomerPhone.trim();
    let customerAddress = customCustomerAddress.trim();
    let custId = selectedCustomerId;

    if (selectedCustomerId) {
      const selected = customers.find(c => c.id === selectedCustomerId);
      if (selected) {
        customerName = selected.name;
        customerPhone = selected.phone;
        customerAddress = selected.address || '';
        custId = selected.id;
      }
    }

    if (!customerName) {
      alert("অনুগ্রহ করে কাস্টমারের নাম নির্বাচন অথবা টাইপ করুন।");
      return;
    }

    const loanNo = `${loanType === 'advance' ? 'ADV' : 'LN'}-${Date.now().toString().slice(-6)}`;
    const parsedInstallment = parseFloat(installmentAmount) || 0;

    const newLoan: CustomerLoan = {
      id: `CLOAN-${Date.now()}`,
      loanNo,
      customerId: custId || `WALK-IN-${Date.now()}`,
      customerName,
      customerPhone,
      customerAddress,
      type: loanType,
      amount: parsedAmount,
      remainingAmount: parsedAmount,
      installmentAmount: parsedInstallment > 0 ? parsedInstallment : undefined,
      date: loanDate || today,
      dueDate: loanDueDate || undefined,
      disbursedMethod,
      purpose: loanPurpose || `${loanType === 'advance' ? 'পণ্য সরবরাহ/ব্যবসার অগ্রিম প্রদান' : 'ব্যবসায়িক ঋণ/লোন প্রদান'}`,
      status: 'active',
      repayments: [],
      notes: '',
      addedBy: currentStaff?.id,
      approvedByName: currentStaff?.name || 'Admin'
    };

    if (onUpdateCustomerLoans) {
      onUpdateCustomerLoans([newLoan]);
    }

    alert(`সফলভাবে ${loanType === 'advance' ? 'অগ্রিম' : 'লোন'} এন্ট্রি করা হয়েছে! নম্বর: #${loanNo}`);
    setShowNewLoanModal(false);
    
    // Reset Form
    setSelectedCustomerId('');
    setCustomCustomerName('');
    setCustomCustomerPhone('');
    setCustomCustomerAddress('');
    setLoanAmount('');
    setLoanDueDate('');
    setInstallmentAmount('');
    setLoanPurpose('');
  };

  // Handle Loan Repayment Collection
  const handleRepayLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayLoanModal) return;

    const parsedRepay = parseFloat(repayAmount);
    if (isNaN(parsedRepay) || parsedRepay <= 0) {
      alert("অনুগ্রহ করে সঠিক আদায়ের পরিমাণ দিন।");
      return;
    }

    const newRemaining = Math.max(0, (repayLoanModal.remainingAmount || 0) - parsedRepay);
    const isFullyPaid = newRemaining <= 0.01;

    const newRepayment: CustomerLoanRepayment = {
      id: `REPAY-${Date.now()}`,
      loanId: repayLoanModal.id,
      amount: parsedRepay,
      date: repayDate || today,
      paymentMethod: repayMethod,
      notes: repayNote || `${repayLoanModal.type === 'advance' ? 'অগ্রিম সমন্বয়/পরিশোধ' : 'লোন কিস্তি আদায়'}`,
      collectedBy: currentStaff?.id,
      collectedByName: currentStaff?.name || 'Staff'
    };

    const updatedLoan: CustomerLoan = {
      ...repayLoanModal,
      remainingAmount: newRemaining,
      status: isFullyPaid ? 'repaid' : 'active',
      repayments: [newRepayment, ...(repayLoanModal.repayments || [])]
    };

    if (onUpdateCustomerLoans) {
      onUpdateCustomerLoans([updatedLoan]);
    }

    // Also record in general collection ledger if matched to customer
    const matchedCustomer = customers.find(c => c.id === repayLoanModal.customerId);
    if (matchedCustomer) {
      onCollection({
        id: `COL-LOAN-${Date.now()}`,
        customerId: matchedCustomer.id,
        customerName: matchedCustomer.name,
        amount: parsedRepay,
        paymentMethod: repayMethod,
        date: repayDate || today,
        notes: `[লোন/অগ্রিম আদায়: #${repayLoanModal.loanNo || repayLoanModal.id}] ${repayNote}`,
        addedBy: currentStaff?.id
      }, matchedCustomer);
    }

    alert(`সফলভাবে ৳${parsedRepay.toLocaleString()} আদায় করা হয়েছে!${isFullyPaid ? ' লোনটি সম্পূর্ণ পরিশোধিত হয়েছে।' : ` অবশিষ্ট পাওনা: ৳${newRemaining.toLocaleString()}`}`);
    setRepayLoanModal(null);
    setRepayAmount('');
    setRepayNote('');
  };

  const handlePrintLoanReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header & Master Tab Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
             <div className="bg-rose-500 p-2.5 rounded-2xl text-white shadow-lg"><Receipt size={24}/></div>
             Due & Loan Management
          </h2>
          <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">কাস্টমার বকেয়া, অগ্রিম ও লোন/ধার হিসাব খাতা।</p>
        </div>

        {/* Master Navigation Pill */}
        <div className="bg-slate-100 p-1.5 rounded-[24px] flex items-center gap-1 border-2 border-slate-200/60 shadow-inner w-full md:w-auto">
          <button
            onClick={() => setMainTab('customer_loans')}
            className={`flex-1 md:flex-initial px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              mainTab === 'customer_loans'
                ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <HandCoins size={16}/> কাস্টমার অগ্রিম ও লোন
            {loanStats.activeLoansCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${mainTab === 'customer_loans' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                {loanStats.activeLoansCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab('sales_due')}
            className={`flex-1 md:flex-initial px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              mainTab === 'sales_due'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText size={16}/> বিক্রয় বকেয়া লেজার
            {stats.dueCustomersCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${mainTab === 'sales_due' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
                {stats.dueCustomersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CUSTOMER ADVANCE & LOANS SECTION */}
      {/* ========================================================================= */}
      {mainTab === 'customer_loans' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Top KPI Cards for Loans */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[36px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <HandCoins size={14} className="text-blue-500"/> মোট বিতরণকৃত লোন/অগ্রিম
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">৳{loanStats.totalDisbursed.toLocaleString()}</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase mt-1">সর্বমোট অনুমোদিত ও প্রদানকৃত</p>
            </div>

            <div className="bg-white p-6 rounded-[36px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500"/> মোট আদায়কৃত কিস্তি
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">৳{loanStats.totalRepaid.toLocaleString()}</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase mt-1">{loanStats.repaidLoansCount}টি লোন সম্পূর্ণ পরিশোধিত</p>
            </div>

            <div className="bg-white p-6 rounded-[36px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-500"/> বর্তমান লোন বকেয়া
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">৳{loanStats.totalOutstanding.toLocaleString()}</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase mt-1">{loanStats.activeLoansCount}টি সক্রিয় লোন চলমান</p>
            </div>

            <div className="bg-white p-6 rounded-[36px] border-2 border-slate-100 shadow-sm relative overflow-hidden group flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500"/> কুইক অ্যাকশন
                </p>
                <div className="text-xs font-black text-slate-700">নতুন লোন ও কিস্তি জমা</div>
              </div>
              <button
                onClick={() => setShowNewLoanModal(true)}
                className="mt-3 w-full bg-primary text-white py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16}/> নতুন অগ্রিম / লোন দিন
              </button>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white p-5 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
              {[
                { id: 'all', label: 'সকল লোন ও অগ্রিম' },
                { id: 'active', label: 'চলমান লোন' },
                { id: 'advance', label: 'অগ্রিম (Advance)' },
                { id: 'loan', label: 'ঋণ/লোন (Loan)' },
                { id: 'overdue', label: `মেয়াদোত্তীর্ণ (${loanStats.overdueCount})` },
                { id: 'repaid', label: 'পরিশোধিত' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setLoanFilter(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    loanFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[260px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input
                type="text"
                placeholder="কাস্টমারের নাম, ফোন বা লোন নং..."
                value={loanSearchTerm}
                onChange={e => setLoanSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>
          </div>

          {/* Customer Loans Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCustomerLoans.map(loan => {
              const totalAmount = loan.amount || 0;
              const remaining = loan.remainingAmount || 0;
              const paid = totalAmount - remaining;
              const percentPaid = totalAmount > 0 ? Math.min(100, Math.round((paid / totalAmount) * 100)) : 0;
              const isOverdue = remaining > 0 && loan.dueDate && new Date(loan.dueDate) < new Date(today);
              const isFullyPaid = remaining <= 0 || loan.status === 'repaid';

              return (
                <div 
                  key={loan.id} 
                  className="bg-white p-7 rounded-[40px] border-2 border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Customer & Badge */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-13 h-13 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md flex-shrink-0 ${
                          loan.type === 'advance' ? 'bg-indigo-600' : 'bg-primary'
                        }`}>
                          {loan.customerName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-900 text-base uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                            {loan.customerName}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                            <Phone size={10}/> {loan.customerPhone || 'ফোন নম্বর নেই'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                          loan.type === 'advance' 
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {loan.type === 'advance' ? 'অগ্রিম (Advance)' : 'ঋণ/লোন (Loan)'}
                        </span>

                        {isFullyPaid ? (
                          <span className="px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            পরিশোধিত
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            মেয়াদোত্তীর্ণ
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            চলমান
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Loan Meta Box */}
                    <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 mb-5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">লোন নং ও তারিখ</span>
                        <span className="font-mono font-black text-slate-800">#{loan.loanNo || loan.id.slice(-6)} • {loan.date}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">মূল পরিমাণ</span>
                        <span className="font-black text-slate-900">৳{totalAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">আদায়কৃত জমা</span>
                        <span className="font-black text-emerald-600">৳{paid.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">অবশিষ্ট বকেয়া</span>
                        <span className="text-lg font-black text-rose-600">৳{remaining.toLocaleString()}</span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                          <span>পরিশোধ অগ্রগতি</span>
                          <span>{percentPaid}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${isFullyPaid ? 'bg-emerald-500' : 'bg-primary'}`} 
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Extra details (Purpose & Installment) */}
                    <div className="text-[11px] text-slate-500 space-y-1 mb-6 px-1">
                      {loan.installmentAmount && (
                        <p className="font-bold flex items-center gap-1 text-slate-700">
                          <CreditCard size={12} className="text-primary"/> প্রস্তাবিত কিস্তি: <span className="text-primary font-black">৳{loan.installmentAmount.toLocaleString()}</span>
                        </p>
                      )}
                      {loan.dueDate && (
                        <p className={`font-bold flex items-center gap-1 ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                          <Clock size={12}/> মেয়াদ: {loan.dueDate} {isOverdue && '(সময় পার হয়েছে)'}
                        </p>
                      )}
                      {loan.purpose && (
                        <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                          কারণ: {loan.purpose}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {!isFullyPaid ? (
                      <button
                        onClick={() => {
                          setRepayLoanModal(loan);
                          setRepayAmount(loan.installmentAmount ? String(Math.min(loan.installmentAmount, remaining)) : String(remaining));
                        }}
                        className="flex-1 bg-emerald-600 text-white py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/10 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <DollarSign size={16}/> কিস্তি / টাকা আদায়
                      </button>
                    ) : (
                      <div className="flex-1 bg-emerald-50 text-emerald-700 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center border border-emerald-200">
                        সম্পূর্ণ পরিশোধিত 
                      </div>
                    )}

                    <button
                      onClick={() => setViewLoanDetailsModal(loan)}
                      className="p-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl transition-all font-black text-xs"
                      title="বিস্তারিত ও ভাউচার প্রিন্ট"
                    >
                      <FileText size={18}/>
                    </button>

                    {isAdmin && onDeleteCustomerLoan && (
                      <button
                        onClick={() => {
                          if (confirm(`আপনি কি নিশ্চিত যে "${loan.customerName}"-এর এই লোন এন্ট্রিটি মুছে ফেলতে চান?`)) {
                            onDeleteCustomerLoan(loan.id);
                          }
                        }}
                        className="p-3.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={18}/>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCustomerLoans.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
              <HandCoins size={56} className="text-slate-300 mx-auto mb-4"/>
              <h4 className="text-lg font-black text-slate-700 uppercase">কোনো অগ্রিম বা লোন রেকর্ড পাওয়া যায়নি</h4>
              <p className="text-slate-400 text-xs font-bold mt-1">নতুন লোন এন্ট্রি করতে উপরের "নতুন অগ্রিম / লোন দিন" বাটনে ক্লিক করুন।</p>
              <button
                onClick={() => setShowNewLoanModal(true)}
                className="mt-6 bg-primary text-white py-3.5 px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all inline-flex items-center gap-2"
              >
                <Plus size={16}/> নতুন লোন যোগ করুন
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SALES DUE MANAGEMENT SECTION (Original functionality preserved) */}
      {/* ========================================================================= */}
      {mainTab === 'sales_due' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             <div className="bg-white p-7 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertTriangle size={14} className="text-rose-400"/> {isAdmin ? 'মোট বিক্রয় বকেয়া' : 'আপনার কাস্টমার বকেয়া'}</p>
                <h3 className="text-3xl font-black text-rose-600 tracking-tighter">৳{stats.totalDue.toLocaleString()}</h3>
                <p className="text-[9px] font-black text-slate-300 uppercase mt-2">{stats.dueCustomersCount} জন কাস্টমারের কাছে পাওনা</p>
             </div>
             <div className="bg-white p-7 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400"/> আজকের বিক্রয় বকেয়া আদায়</p>
                <h3 className="text-3xl font-black text-emerald-600 tracking-tighter">৳{stats.totalTodayCollected.toLocaleString()}</h3>
                <p className="text-[9px] font-black text-slate-300 uppercase mt-2">গত ২৪ ঘণ্টায় সংগ্রহ</p>
             </div>
             <div className="bg-white p-7 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Users size={14} className="text-primary/40"/> কাস্টমার ফিল্টার</p>
                <div className="relative mt-1">
                   <input type="text" placeholder="কাস্টমার খুঁজুন..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 font-black text-xs outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dueCustomers.map(customer => (
              <div key={customer.id} className="bg-white p-6 rounded-[40px] border-2 border-slate-50 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between">
                 <div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-[24px] bg-slate-50 text-slate-400 flex items-center justify-center font-black text-2xl border-2 border-slate-100 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shadow-sm">
                          {customer.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="font-black text-slate-900 text-base uppercase tracking-tight truncate">{customer.name}</div>
                           <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1.5"><Phone size={10}/> {customer.phone}</div>
                        </div>
                        <button onClick={() => { setHistoryModal(customer.id); setHistoryTab('products'); }} className="p-3 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all" title="Payment History">
                           <History size={20}/>
                        </button>
                    </div>
                    <div className="bg-rose-50 p-6 rounded-[32px] border-2 border-rose-100 mb-6 group-hover:bg-rose-600 transition-all duration-500">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest group-hover:text-white/60">বাকি পরিমাণ</p>
                        <div className="text-3xl font-black text-rose-700 tracking-tightest group-hover:text-white transition-all">৳{customer.dueAmount.toLocaleString()}</div>
                    </div>
                 </div>
                 <button onClick={() => { setCollectionModal(customer.id); setAmount(''); }} className="w-full bg-emerald-600 text-white py-4 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/10 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <DollarSign size={18}/> আদায় করুন
                 </button>
              </div>
            ))}
          </div>

          {dueCustomers.length === 0 && (
            <div className="text-center py-16 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3"/>
              <p className="font-black text-slate-700 uppercase">কোনো কাস্টমারের বকেয়া নেই</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NEW CUSTOMER LOAN / ADVANCE MODAL */}
      {/* ========================================================================= */}
      {showNewLoanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                  <HandCoins className="text-primary" size={24}/> নতুন কাস্টমার অগ্রিম / লোন এন্ট্রি
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-1">কাস্টমারকে অগ্রিম বা লোন প্রদান করে হিসাব সংরক্ষণ করুন।</p>
              </div>
              <button onClick={() => setShowNewLoanModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                <X size={22}/>
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-5">
              {/* Loan Type Selection */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">লেনদেনের ধরন নির্বাচন করুন</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLoanType('advance')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      loanType === 'advance'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-black shadow-md'
                        : 'border-slate-100 bg-slate-50 text-slate-600 font-bold hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs uppercase font-black flex items-center gap-1.5 text-indigo-700">
                      <Sparkles size={14}/> অগ্রিম প্রদান (Advance)
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">পণ্য সরবরাহ বা ডেলিভারির বিপরীতে দেওয়া টাকা</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoanType('loan')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      loanType === 'loan'
                        ? 'border-primary bg-primary/5 text-primary font-black shadow-md'
                        : 'border-slate-100 bg-slate-50 text-slate-600 font-bold hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs uppercase font-black flex items-center gap-1.5 text-primary">
                      <HandCoins size={14}/> ঋণ / লোন প্রদান (Loan)
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">ব্যবসায়িক ধার বা কিস্তিভিত্তিক ঋণ</div>
                  </button>
                </div>
              </div>

              {/* Customer Selection */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">কাস্টমার নির্বাচন করুন</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    if (e.target.value) {
                      const found = customers.find(c => c.id === e.target.value);
                      if (found) {
                        setCustomCustomerName(found.name);
                        setCustomCustomerPhone(found.phone);
                        setCustomCustomerAddress(found.address || '');
                      }
                    }
                  }}
                  className="w-full border-2 border-slate-200 rounded-2xl p-3.5 font-black text-xs outline-none focus:border-primary transition-all bg-white"
                >
                  <option value="">-- নিবন্ধিত কাস্টমার তালিকা থেকে বেছে নিন --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - বর্তমান বকেয়া: ৳{(c.dueAmount || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Manual Customer Info (if walk-in or new) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">কাস্টমারের নাম *</label>
                  <input
                    type="text"
                    required
                    placeholder="কাস্টমারের পূর্ণ নাম"
                    value={customCustomerName}
                    onChange={e => setCustomCustomerName(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-2xl p-3.5 font-bold text-xs outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">ফোন নম্বর</label>
                  <input
                    type="text"
                    placeholder="০১৭১xxxxxxxx"
                    value={customCustomerPhone}
                    onChange={e => setCustomCustomerPhone(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-2xl p-3.5 font-bold text-xs outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Loan Amount & Disbursed Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">প্রদত্ত পরিমাণ (টাকা) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="৳ 0.00"
                    value={loanAmount}
                    onChange={e => setLoanAmount(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-2xl p-3.5 font-black text-lg text-primary outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">প্রদানের মাধ্যম</label>
                  <select
                    value={disbursedMethod}
                    onChange={e => setDisbursedMethod(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-2xl p-3.5 font-black text-xs outline-none focus:border-primary transition-all bg-white"
                  >
                    <option value="Cash">নগদ (Cash)</option>
                    <option value="bKash">বিকাশ (bKash)</option>
                    <option value="Nagad">নগদ (Nagad)</option>
                    <option value="Bank">ব্যাংক ট্রান্সফার (Bank)</option>
                  </select>
                </div>
              </div>

              {/* Dates & Installment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">প্রদানের তারিখ</label>
                  <input
                    type="date"
                    required
                    value={loanDate}
                    onChange={e => setLoanDate(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-2xl p-3 font-bold text-xs outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">পরিশোধের শেষ তারিখ (ঐচ্ছিক)</label>
                  <input
                    type="date"
                    value={loanDueDate}
                    onChange={e => setLoanDueDate(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-2xl p-3 font-bold text-xs outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">কিস্তির পরিমাণ (ঐচ্ছিক)</label>
                  <input
                    type="number"
                    placeholder="৳ প্রতি কিস্তি"
                    value={installmentAmount}
                    onChange={e => setInstallmentAmount(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-2xl p-3 font-bold text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Purpose / Note */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">উদ্দেশ্য / বিবরণ</label>
                <input
                  type="text"
                  placeholder="যেমন: পণ্য সাপ্লাইয়ের অগ্রিম, জরুরি ব্যবসার কাজে লোন ইত্যাদি..."
                  value={loanPurpose}
                  onChange={e => setLoanPurpose(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-2xl p-3.5 font-bold text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/25 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18}/> লোন / অগ্রিম সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LOAN REPAYMENT / INSTALLMENT COLLECTION MODAL */}
      {/* ========================================================================= */}
      {repayLoanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black uppercase text-slate-900">কিস্তি / টাকা আদায়</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{repayLoanModal.customerName} (#{repayLoanModal.loanNo || repayLoanModal.id.slice(-6)})</p>
              </div>
              <button onClick={() => setRepayLoanModal(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
            </div>

            {/* Loan Status Box */}
            <div className="bg-rose-50 p-5 rounded-[24px] border border-rose-100 mb-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider">বর্তমান অবশিষ্ট লোন বকেয়া</p>
                <h4 className="text-2xl font-black text-rose-700 tracking-tight">৳{(repayLoanModal.remainingAmount || 0).toLocaleString()}</h4>
              </div>
              {repayLoanModal.installmentAmount && (
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase">কিস্তির পরিমাণ</p>
                  <p className="text-sm font-black text-slate-700">৳{repayLoanModal.installmentAmount.toLocaleString()}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleRepayLoanSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">আদায়ের পরিমাণ (টাকা) *</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  max={repayLoanModal.remainingAmount}
                  className="w-full border-2 border-slate-200 rounded-2xl p-3.5 font-black text-xl text-emerald-600 outline-none focus:border-emerald-500" 
                  value={repayAmount} 
                  onChange={e => setRepayAmount(e.target.value)} 
                />
                
                {/* Quick amount chips */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {repayLoanModal.installmentAmount && repayLoanModal.installmentAmount <= repayLoanModal.remainingAmount && (
                    <button 
                      type="button" 
                      onClick={() => setRepayAmount(String(repayLoanModal.installmentAmount))} 
                      className="px-3 py-1 bg-primary/10 text-primary rounded-xl text-[10px] font-black"
                    >
                      ১ কিস্তি (৳{repayLoanModal.installmentAmount})
                    </button>
                  )}
                  {[500, 1000, 5000].map(val => (
                    val <= repayLoanModal.remainingAmount && (
                      <button key={val} type="button" onClick={() => setRepayAmount(String(val))} className="px-3 py-1 bg-slate-100 rounded-xl text-[10px] font-black text-slate-600">
                        ৳{val}
                      </button>
                    )
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setRepayAmount(String(repayLoanModal.remainingAmount))} 
                    className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black"
                  >
                    সম্পূর্ণ পরিশোধ
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">পেমেন্ট মেথড</label>
                  <select 
                    className="w-full border-2 border-slate-200 rounded-2xl p-3 font-black text-xs outline-none bg-white" 
                    value={repayMethod} 
                    onChange={e => setRepayMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">আদায়ের তারিখ</label>
                  <input 
                    type="date" 
                    required 
                    value={repayDate} 
                    onChange={e => setRepayDate(e.target.value)} 
                    className="w-full border-2 border-slate-200 rounded-2xl p-3 font-bold text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">নোট / মন্তব্য (ঐচ্ছিক)</label>
                <input 
                  type="text" 
                  placeholder="যেমন: সেপ্টেম্বর মাসের কিস্তি..." 
                  value={repayNote} 
                  onChange={e => setRepayNote(e.target.value)} 
                  className="w-full border-2 border-slate-200 rounded-2xl p-3 font-bold text-xs outline-none"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-900/15 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18}/> টাকা জমা গ্রহণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LOAN DETAILS & PRINTABLE VOUCHER MODAL */}
      {/* ========================================================================= */}
      {viewLoanDetailsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-xl font-black uppercase text-slate-900">লোন ও অগ্রিম হিসাব বিবরণী</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">ভাউচার নং: #{viewLoanDetailsModal.loanNo || viewLoanDetailsModal.id.slice(-6)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrintLoanReceipt} 
                  className="p-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl font-black text-xs flex items-center gap-1.5 transition-all"
                >
                  <Printer size={16}/> প্রিন্ট ভাউচার
                </button>
                <button onClick={() => setViewLoanDetailsModal(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X size={20}/>
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar">
              {/* Header Info Banner */}
              <div className="p-6 bg-slate-50 rounded-[30px] border border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">গ্রাহকের তথ্য</span>
                    <h4 className="text-lg font-black text-slate-900 uppercase">{viewLoanDetailsModal.customerName}</h4>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 flex items-center gap-1"><Phone size={12}/> {viewLoanDetailsModal.customerPhone || 'ফোন নম্বর নেই'}</p>
                    {viewLoanDetailsModal.customerAddress && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={11}/> {viewLoanDetailsModal.customerAddress}</p>}
                  </div>

                  <div className="text-left sm:text-right">
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border inline-block ${
                      viewLoanDetailsModal.type === 'advance' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {viewLoanDetailsModal.type === 'advance' ? 'অগ্রিম হিসাব' : 'ঋণ/লোন হিসাব'}
                    </span>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-2">ইস্যুর তারিখ: <span className="text-slate-800">{viewLoanDetailsModal.date}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-center">
                  <div className="p-3 bg-white rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase">মোট লোন</p>
                    <p className="text-base font-black text-slate-800">৳{(viewLoanDetailsModal.amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase">পরিশোধিত</p>
                    <p className="text-base font-black text-emerald-600">৳{((viewLoanDetailsModal.amount || 0) - (viewLoanDetailsModal.remainingAmount || 0)).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-rose-600 uppercase">অবশিষ্ট বকেয়া</p>
                    <p className="text-base font-black text-rose-600">৳{(viewLoanDetailsModal.remainingAmount || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Repayments History Table */}
              <div>
                <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-3 flex items-center gap-1.5">
                  <History size={14} className="text-primary"/> কিস্তি ও টাকা আদায়ের ইতিহাস
                </h5>

                {viewLoanDetailsModal.repayments && viewLoanDetailsModal.repayments.length > 0 ? (
                  <div className="space-y-2.5">
                    {viewLoanDetailsModal.repayments.map((rep, idx) => (
                      <div key={rep.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-black text-emerald-600 uppercase">৳{rep.amount.toLocaleString()} জমা</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{rep.date} • {rep.paymentMethod} {rep.collectedByName ? `• আদায়কারী: ${rep.collectedByName}` : ''}</div>
                          {rep.notes && <p className="text-[10px] text-slate-500 font-medium mt-0.5">নোট: {rep.notes}</p>}
                        </div>
                        <span className="px-2.5 py-1 bg-white text-[9px] font-black text-slate-500 rounded-lg border">
                          কিস্তি #{viewLoanDetailsModal.repayments.length - idx}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed text-slate-400 font-bold text-xs">
                    এখনো কোনো কিস্তি বা টাকা জমা দেওয়া হয়নি।
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SALES DUE COLLECTION MODAL (Preserved) */}
      {/* ========================================================================= */}
      {collectionModal && activeCustomer && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase">বিক্রয় বকেয়া আদায়</h3>
              <button onClick={() => setCollectionModal(null)}><X /></button>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl mb-6">
              <p className="text-[10px] font-black text-rose-500 uppercase">মোট বকেয়া</p>
              <p className="text-2xl font-black text-rose-700">৳{activeCustomer.dueAmount}</p>
            </div>
            <form onSubmit={handleCollect} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">আদায়ের পরিমাণ</label>
                <input type="number" required className="w-full border-2 rounded-2xl p-4 font-black text-lg outline-none focus:ring-4 focus:ring-primary/5" value={amount} onChange={e => setAmount(e.target.value)} />
                <div className="flex gap-2 mt-2">
                  {[500, 1000, 5000].map(v => (
                    <button key={v} type="button" onClick={() => setAmount(v > activeCustomer.dueAmount ? activeCustomer.dueAmount.toString() : v.toString())} className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black">৳{v}</button>
                  ))}
                  <button type="button" onClick={() => setAmount(activeCustomer.dueAmount.toString())} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black">Full</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">মেথড</label>
                <select className="w-full border-2 rounded-2xl p-4 font-black text-sm outline-none bg-white" value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">সংগ্রহ করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SALES DUE HISTORY MODAL (Preserved) */}
      {/* ========================================================================= */}
      {historyModal && historyCustomer && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div>
                <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">লেনদেন ও বাকির বিস্তারিত</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{historyCustomer.name} - এর হিসাব বিবরণী</p>
              </div>
              <button onClick={() => setHistoryModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X /></button>
            </div>

            {/* TAB HEADERS */}
            <div className="flex border-b-2 border-slate-100 mb-6 shrink-0">
              <button 
                onClick={() => setHistoryTab('products')} 
                className={`flex-1 pb-3 text-xs sm:text-sm font-black uppercase tracking-wider border-b-4 transition-all ${
                  historyTab === 'products' 
                    ? 'border-rose-500 text-rose-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                পণ্য অনুযায়ী রেকর্ড
              </button>
              <button 
                onClick={() => setHistoryTab('collections')} 
                className={`flex-1 pb-3 text-xs sm:text-sm font-black uppercase tracking-wider border-b-4 transition-all ${
                  historyTab === 'collections' 
                    ? 'border-emerald-500 text-emerald-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                টাকা সংগ্রহ/জমা ইতিহাস
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {historyTab === 'products' ? (
                <>
                  {productDueRecords.map((rec, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 rounded-[28px] border-2 border-slate-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-200 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-mono text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">
                            {rec.date}
                          </span>
                          <span className="font-mono text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">
                            মেমো নং: {rec.invoiceNo}
                          </span>
                          {rec.due > 0 ? (
                            <span className="text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-lg uppercase">
                              বাকি আছে
                            </span>
                          ) : (
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-lg uppercase">
                              পরিশোধিত
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-slate-800 text-sm tracking-tight">{rec.productName}</h4>
                        {rec.invoiceNo !== 'N/A' && (
                          <p className="text-[10px] text-slate-400 font-bold mt-1">
                            পরিমাণ: {rec.quantity} • দর: ৳{rec.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-5 sm:justify-end shrink-0 border-t-2 border-slate-100 sm:border-t-0 pt-3 sm:pt-0">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ক্রয় মূল্য</p>
                          <p className="font-black text-slate-700 text-xs sm:text-sm">৳{rec.cost.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">জমা</p>
                          <p className="font-black text-emerald-600 text-xs sm:text-sm">৳{rec.paid.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">বাকি</p>
                          <p className={`font-black text-xs sm:text-sm ${rec.due > 0 ? 'text-rose-600' : 'text-slate-400'}`}>৳{rec.due.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {productDueRecords.length === 0 && (
                    <div className="text-center py-12 text-slate-400 font-black uppercase text-[10px] tracking-widest bg-slate-50 rounded-[28px] border-2 border-dashed border-slate-100">
                      কোনো বাকি পণ্যের রেকর্ড পাওয়া যায়নি
                    </div>
                  )}
                </>
              ) : (
                <>
                  {customerCollections.map(col => (
                    <div key={col.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-[24px] border-2 border-slate-100/50 hover:border-slate-200 transition-all">
                      <div>
                        <div className="text-xs font-black text-emerald-600 uppercase tracking-wider">৳{col.amount.toLocaleString()} সংগ্রহ করা হয়েছে</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{col.date} • {col.paymentMethod}</div>
                        {col.notes && <p className="text-[10.5px] text-slate-500 font-semibold mt-1">নোট: {col.notes}</p>}
                      </div>
                      <div className="bg-white px-3 py-1 rounded-xl border text-[9px] font-black text-slate-400 tracking-widest uppercase">RECEIPT</div>
                    </div>
                  ))}
                  {customerCollections.length === 0 && (
                    <div className="text-center py-12 text-slate-400 font-black uppercase text-[10px] tracking-widest bg-slate-50 rounded-[28px] border-2 border-dashed border-slate-100">
                      কোনো সংগ্রহের রেকর্ড পাওয়া যায়নি
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuePayments;
