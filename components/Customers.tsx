import React, { useState, useMemo } from 'react';
import { Customer, Sale, Collection, CustomerReward, RankConfig, Staff, CustomerLoan, CustomerLoanRepayment } from '../types';
import html2pdf from 'html2pdf.js';
import InvoiceContent from './InvoiceContent';
import CustomerLedgerContent, { LedgerEntry } from './CustomerLedgerContent';
import { 
  Plus, Edit, Trash2, Search, X, User, Users, Gift, 
  Target, Trophy, Save, Check, DollarSign, History,
  Phone, MapPin, Mail, Calendar, ArrowUpRight, ArrowDownRight,
  TrendingUp, Star, AlertCircle, ShoppingBag, Eye, Award,
  Medal, Crown, Sparkles, Zap, ShieldCheck, Receipt, FileText, Printer,
  Download, ExternalLink, Building2, Clock, HandCoins, CreditCard,
  Filter, CheckCircle2, ChevronRight, ChevronDown, Layers, Activity,
  BadgePercent, SlidersHorizontal, RefreshCw, MessageCircle, AlertTriangle,
  Camera, Palette, Image as ImageIcon, Upload, RotateCcw
} from 'lucide-react';

export const PROFILE_COLOR_PRESETS = [
  { name: 'রয়্যাল ব্লু', hex: '#2563eb', bg: 'bg-blue-600' },
  { name: 'এমারেল্ড গ্রিন', hex: '#059669', bg: 'bg-emerald-600' },
  { name: 'ইন্ডিগো', hex: '#4f46e5', bg: 'bg-indigo-600' },
  { name: 'রোজ রেড', hex: '#e11d48', bg: 'bg-rose-600' },
  { name: 'অ্যাম্বার গোল্ড', hex: '#d97706', bg: 'bg-amber-600' },
  { name: 'টিল ওশান', hex: '#0d9488', bg: 'bg-teal-600' },
  { name: 'পার্পল ভায়োলেট', hex: '#7c3aed', bg: 'bg-purple-600' },
  { name: 'সানসেট অরেঞ্জ', hex: '#ea580c', bg: 'bg-orange-600' },
  { name: 'ডার্ক স্লেট', hex: '#334155', bg: 'bg-slate-700' },
  { name: 'সায়ান স্কাই', hex: '#0891b2', bg: 'bg-cyan-600' }
];

export const NAME_COLOR_PRESETS = [
  { name: 'গোল্ডেন ইয়েলো', hex: '#facc15' },
  { name: 'নিয়ন সাইয়ান', hex: '#38bdf8' },
  { name: 'এমারেল্ড গ্রিন', hex: '#4ade80' },
  { name: 'হট পিংক', hex: '#f43f5e' },
  { name: 'সানসেট অরেঞ্জ', hex: '#fb923c' },
  { name: 'পার্পল ভায়োলেট', hex: '#c084fc' },
  { name: 'রয়্যাল ব্লু', hex: '#60a5fa' },
  { name: 'লাইম গ্রিন', hex: '#a3e635' },
  { name: 'ক্রিমসন রেড', hex: '#ef4444' },
  { name: 'ক্লাসিক হোয়াইট', hex: '#ffffff' }
];

export const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

interface CustomersProps {
  customers: Customer[];
  onUpdate: (customers: Customer[]) => void;
  onDelete?: (id: string) => void;
  sales: Sale[];
  collections: Collection[];
  onCollection: (collection: Collection, customer: Customer) => void;
  rankConfigs: RankConfig[];
  customerLoans?: CustomerLoan[];
  onUpdateCustomerLoans?: (data: CustomerLoan[]) => void;
  onDeleteCustomerLoan?: (id: string) => void;
  isAdmin: boolean;
  currentStaff?: Staff | null;
  shopSettings: any;
}

const RANK_ICONS: Record<string, any> = {
  'Bronze': Medal,
  'Silver': ShieldCheck,
  'Gold': Trophy,
  'Platinum': Crown,
  'Diamond': Sparkles
};

const RANK_COLORS: Record<string, any> = {
  'Bronze': { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' },
  'Silver': { color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-300', bar: 'bg-slate-500', badge: 'bg-slate-200 text-slate-800' },
  'Gold': { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300', bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800' },
  'Platinum': { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800' },
  'Diamond': { color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', bar: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-800' }
};

const Customers: React.FC<CustomersProps> = ({ 
  customers, 
  onUpdate, 
  onDelete, 
  sales, 
  collections, 
  onCollection, 
  rankConfigs, 
  customerLoans = [],
  onUpdateCustomerLoans,
  onDeleteCustomerLoan,
  isAdmin, 
  currentStaff, 
  shopSettings 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showProfile, setShowProfile] = useState<string | null>(null);
  const [profileViewTab, setProfileViewTab] = useState<'overview' | 'invoices' | 'collections' | 'loans' | 'ledger' | 'settings'>('overview');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'retail' | 'wholesale' | 'distributor'>('all');
  const [dueFilter, setDueFilter] = useState<'all' | 'with_due' | 'paid'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Invoice Preview & Print states
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);
  
  // Ledger Statement Print state
  const [showLedgerPrintModal, setShowLedgerPrintModal] = useState(false);

  // In-Profile Quick Payment Collection state
  const [showQuickCollectionModal, setShowQuickCollectionModal] = useState(false);
  const [collectionAmount, setCollectionAmount] = useState('');
  const [collectionMethod, setCollectionMethod] = useState('Cash');
  const [collectionNotes, setCollectionNotes] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);

  // Quick Loan / Repayment from Customer Profile
  const [showQuickLoanModal, setShowQuickLoanModal] = useState(false);
  const [showQuickRepayModal, setShowQuickRepayModal] = useState<CustomerLoan | null>(null);
  const [quickLoanType, setQuickLoanType] = useState<'advance' | 'loan'>('advance');
  const [quickLoanAmount, setQuickLoanAmount] = useState('');
  const [quickLoanMethod, setQuickLoanMethod] = useState('Cash');
  const [quickLoanPurpose, setQuickLoanPurpose] = useState('');
  const [quickRepayAmount, setQuickRepayAmount] = useState('');
  const [quickRepayMethod, setQuickRepayMethod] = useState('Cash');
  const [quickRepayNote, setQuickRepayNote] = useState('');

  // Expanded Invoice items in Purchases tab
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Filter for Invoices tab in Profile
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  // Global KPIs for customer dashboard
  const kpiData = useMemo(() => {
    const totalCustomersCount = customers.length;
    const totalSalesDue = customers.reduce((sum, c) => sum + (c.dueAmount || 0), 0);
    const totalLoanOutstanding = customerLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
    const retailCount = customers.filter(c => c.type === 'retail').length;
    const wholesaleCount = customers.filter(c => c.type === 'wholesale').length;
    const distributorCount = customers.filter(c => c.type === 'distributor').length;
    const customersWithDue = customers.filter(c => (c.dueAmount || 0) > 0).length;

    return {
      totalCustomersCount,
      totalSalesDue,
      totalLoanOutstanding,
      retailCount,
      wholesaleCount,
      distributorCount,
      customersWithDue
    };
  }, [customers, customerLoans]);

  // Filtered customer list for main table
  const displayCustomers = useMemo(() => {
    let filtered = customers;
    if (!isAdmin && currentStaff) {
      filtered = customers.filter(c => c.addedBy === currentStaff.id);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.type === typeFilter);
    }

    if (dueFilter === 'with_due') {
      filtered = filtered.filter(c => (c.dueAmount || 0) > 0);
    } else if (dueFilter === 'paid') {
      filtered = filtered.filter(c => (c.dueAmount || 0) <= 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c => 
        (c.name || '').toLowerCase().includes(q) || 
        (c.phone || '').includes(q) ||
        (c.address || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [customers, isAdmin, currentStaff, search, typeFilter, dueFilter]);

  const canEditExisting = isAdmin || ['Admin', 'Owner', 'Manager'].includes(currentStaff?.designation || '');
  const canAddNew = true;

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', nameColor: '', phone: '', email: '', address: '', dueAmount: 0, type: 'retail', status: 'active',
    imageUrl: '', photoUrl: '', profileColor: '#2563eb',
    dateAdded: new Date().toISOString().split('T')[0],
    targets: { monthly: 10000, yearly: 100000, lifetime: 500000 }
  });

  const resetForm = () => {
    setFormData({ 
      name: '', nameColor: '', phone: '', email: '', address: '', dueAmount: 0, type: 'retail', status: 'active',
      imageUrl: '', photoUrl: '', profileColor: '#2563eb',
      dateAdded: new Date().toISOString().split('T')[0],
      targets: { monthly: 10000, yearly: 100000, lifetime: 500000 }
    });
    setEditingId(null);
  };

  const handleModalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageFile(file);
      setFormData(prev => ({ ...prev, imageUrl: base64, photoUrl: base64 }));
    } catch (err) {
      console.error("Error compressing image:", err);
      alert("ছবি আপলোড করতে সমস্যা হয়েছে।");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      if (!canEditExisting) {
        alert("আপনার কাস্টমার তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র এডমিন এটি করতে পারবেন।");
        return;
      }
      const existing = customers.find(c => c.id === editingId);
      if (existing) {
        onUpdate([{ 
          ...existing, 
          ...formData,
          nameColor: formData.nameColor || undefined,
          imageUrl: formData.imageUrl || formData.photoUrl || existing.imageUrl || existing.photoUrl,
          photoUrl: formData.imageUrl || formData.photoUrl || existing.imageUrl || existing.photoUrl,
          profileColor: formData.profileColor || existing.profileColor || '#2563eb'
        } as Customer]);
      }
    } else {
      const newCustomer: Customer = {
        ...formData as Customer,
        id: `CUST-${Date.now()}`,
        nameColor: formData.nameColor || undefined,
        imageUrl: formData.imageUrl || formData.photoUrl || undefined,
        photoUrl: formData.imageUrl || formData.photoUrl || undefined,
        profileColor: formData.profileColor || '#2563eb',
        dateAdded: formData.dateAdded || new Date().toISOString(),
        totalPurchase: 0,
        totalPaid: 0,
        rewards: [],
        addedBy: currentStaff?.id
      };
      onUpdate([newCustomer]);
    }
    setShowModal(false);
    resetForm();
  };

  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === showProfile) || null;
  }, [customers, showProfile]);

  // Settings Tab local form state for active customer
  const [settingsName, setSettingsName] = useState('');
  const [settingsNameColor, setSettingsNameColor] = useState('');
  const [settingsPhone, setSettingsPhone] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsAddress, setSettingsAddress] = useState('');
  const [settingsType, setSettingsType] = useState<'retail' | 'wholesale' | 'distributor'>('retail');
  const [settingsImageUrl, setSettingsImageUrl] = useState('');
  const [settingsProfileColor, setSettingsProfileColor] = useState('#2563eb');
  const [settingsTargets, setSettingsTargets] = useState({ monthly: 10000, yearly: 100000, lifetime: 500000 });
  const [settingsToast, setSettingsToast] = useState<string | null>(null);

  // Sync settings local state whenever activeCustomer changes
  React.useEffect(() => {
    if (activeCustomer) {
      setSettingsName(activeCustomer.name || '');
      setSettingsNameColor(activeCustomer.nameColor || '');
      setSettingsPhone(activeCustomer.phone || '');
      setSettingsEmail(activeCustomer.email || '');
      setSettingsAddress(activeCustomer.address || '');
      setSettingsType(activeCustomer.type || 'retail');
      setSettingsImageUrl(activeCustomer.imageUrl || activeCustomer.photoUrl || '');
      setSettingsProfileColor(activeCustomer.profileColor || '#2563eb');
      setSettingsTargets(activeCustomer.targets || { monthly: 10000, yearly: 100000, lifetime: 500000 });
      setSettingsToast(null);
    }
  }, [activeCustomer]);

  const handleSettingsImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageFile(file);
      setSettingsImageUrl(base64);
    } catch (err) {
      console.error("Error compressing image:", err);
      alert("ছবি লোড করতে সমস্যা হয়েছে। অন্য ছবি চেষ্টা করুন।");
    }
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeCustomer) return;

    if (!settingsName.trim()) {
      alert("কাস্টমারের নাম প্রদান করা আবশ্যক।");
      return;
    }

    const updatedCustomer: Customer = {
      ...activeCustomer,
      name: settingsName.trim(),
      nameColor: settingsNameColor.trim() || undefined,
      phone: settingsPhone.trim(),
      email: settingsEmail.trim(),
      address: settingsAddress.trim(),
      type: settingsType,
      imageUrl: settingsImageUrl || undefined,
      photoUrl: settingsImageUrl || undefined,
      profileColor: settingsProfileColor || '#2563eb',
      targets: settingsTargets
    };

    onUpdate([updatedCustomer]);
    setSettingsToast("কাস্টমার প্রোফাইল (নাম, কালার ও ছবি) সফলভাবে আপডেট করা হয়েছে!");
    setTimeout(() => setSettingsToast(null), 3500);
  };

  const getCustomerRankInfo = (lifetimeSpent: number) => {
    const sortedRanks = [...(rankConfigs || [])].sort((a, b) => a.minAmount - b.minAmount);
    let current = sortedRanks[0] || { id: 'default', name: 'Bronze', minAmount: 0, level: 1 };
    let next = sortedRanks[1] || null;

    for (let i = sortedRanks.length - 1; i >= 0; i--) {
      if (lifetimeSpent >= sortedRanks[i].minAmount) {
        current = sortedRanks[i];
        next = sortedRanks[i + 1] || null;
        break;
      }
    }

    const colors = RANK_COLORS[current.name] || RANK_COLORS['Bronze'];
    const progressToNext = next ? Math.min(100, Math.round((lifetimeSpent / (next.minAmount || 1)) * 100)) : 100;
    const remainingToNext = next ? Math.max(0, next.minAmount - lifetimeSpent) : 0;

    return { 
      current: { ...current, ...colors, icon: RANK_ICONS[current.name] || Medal },
      next,
      progressToNext,
      remainingToNext
    };
  };

  // Specific Customer's Sales
  const customerSales = useMemo(() => {
    if (!activeCustomer) return [];
    return sales
      .filter(s => s && s.customerId === activeCustomer.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [activeCustomer, sales]);

  // Specific Customer's Collections (Payments received)
  const customerCollections = useMemo(() => {
    if (!activeCustomer) return [];
    return collections
      .filter(c => c && c.customerId === activeCustomer.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [activeCustomer, collections]);

  // Specific Customer's Loans & Advances
  const activeCustomerLoans = useMemo(() => {
    if (!activeCustomer) return [];
    return customerLoans
      .filter(l => l && l.customerId === activeCustomer.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [customerLoans, activeCustomer]);

  const activeCustomerTotalLoanOutstanding = useMemo(() => {
    return activeCustomerLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
  }, [activeCustomerLoans]);

  // Financial calculations for Active Customer
  const customerFinancialSummary = useMemo(() => {
    if (!activeCustomer) {
      return {
        totalPurchased: 0,
        totalPaidOnSales: 0,
        currentSalesDue: 0,
        totalCollectionsReceived: 0,
        totalLoanDisbursed: 0,
        totalLoanRepaid: 0,
        totalLoanOutstanding: 0,
        totalInvoicesCount: 0,
        avgOrderValue: 0,
        paymentHealthRate: 100,
        netTotalOutstanding: 0
      };
    }

    const totalPurchased = customerSales.reduce((sum, s) => sum + (s.total || 0), 0) || (activeCustomer.totalPurchase || 0);
    const totalPaidOnSales = customerSales.reduce((sum, s) => sum + (s.paid || 0), 0);
    const currentSalesDue = activeCustomer.dueAmount !== undefined ? activeCustomer.dueAmount : customerSales.reduce((sum, s) => sum + (s.due || 0), 0);
    const totalCollectionsReceived = customerCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalLoanDisbursed = activeCustomerLoans.reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalLoanRepaid = activeCustomerLoans.reduce((sum, l) => {
      const repSum = (l.repayments || []).reduce((rSum, r) => rSum + (r.amount || 0), 0);
      return sum + repSum;
    }, 0);
    const totalLoanOutstanding = activeCustomerTotalLoanOutstanding;
    const totalInvoicesCount = customerSales.length;
    const avgOrderValue = totalInvoicesCount > 0 ? Math.round(totalPurchased / totalInvoicesCount) : 0;
    const paymentHealthRate = totalPurchased > 0 
      ? Math.min(100, Math.max(0, Math.round(((totalPurchased - currentSalesDue) / totalPurchased) * 100))) 
      : 100;
    const netTotalOutstanding = currentSalesDue + totalLoanOutstanding;

    return {
      totalPurchased,
      totalPaidOnSales,
      currentSalesDue,
      totalCollectionsReceived,
      totalLoanDisbursed,
      totalLoanRepaid,
      totalLoanOutstanding,
      totalInvoicesCount,
      avgOrderValue,
      paymentHealthRate,
      netTotalOutstanding
    };
  }, [activeCustomer, customerSales, customerCollections, activeCustomerLoans, activeCustomerTotalLoanOutstanding]);

  // Target progress
  const profileStats = useMemo(() => {
    if (!activeCustomer) return { monthly: 0, yearly: 0, lifetime: 0 };
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7);
    const currentYear = today.toISOString().substring(0, 4);
    
    return {
      monthly: customerSales.filter(s => s.date && s.date.startsWith(currentMonth)).reduce((sum, s) => sum + (s.total || 0), 0),
      yearly: customerSales.filter(s => s.date && s.date.startsWith(currentYear)).reduce((sum, s) => sum + (s.total || 0), 0),
      lifetime: customerFinancialSummary.totalPurchased
    };
  }, [activeCustomer, customerSales, customerFinancialSummary.totalPurchased]);

  const targetProgress = useMemo(() => {
    if (!activeCustomer) return { m: 0, y: 0, l: 0 };
    const t = activeCustomer.targets || { monthly: 10000, yearly: 100000, lifetime: 500000 };
    return {
      m: Math.min(100, Math.round((profileStats.monthly / (t.monthly || 1)) * 100)),
      y: Math.min(100, Math.round((profileStats.yearly / (t.yearly || 1)) * 100)),
      l: Math.min(100, Math.round((profileStats.lifetime / (t.lifetime || 1)) * 100))
    };
  }, [activeCustomer, profileStats]);

  // Dynamic Full Running Balance Ledger Entries (Sales = Debit, Collections/Payments = Credit, Loans = Debit, Repayments = Credit)
  const ledgerData = useMemo(() => {
    if (!activeCustomer) return { entries: [], totalDebit: 0, totalCredit: 0, closingBalance: 0 };

    interface RawEntry {
      id: string;
      date: string;
      timestamp: number;
      type: 'sale' | 'collection' | 'loan_disbursed' | 'loan_repaid';
      refNo: string;
      description: string;
      debit: number;
      credit: number;
    }

    const rawList: RawEntry[] = [];

    // 1. Sales Invoices (Debit = Total bill, Credit = Instant paid at sale)
    customerSales.forEach(sale => {
      const ts = new Date(sale.date || 0).getTime() || 0;
      rawList.push({
        id: `sale-${sale.id}`,
        date: sale.date || 'N/A',
        timestamp: ts,
        type: 'sale',
        refNo: sale.invoiceNo || sale.id.slice(-6),
        description: `বিক্রয় চালান #${sale.invoiceNo} (${sale.items?.length || 0}টি পণ্য)`,
        debit: sale.total || 0,
        credit: 0
      });

      if ((sale.paid || 0) > 0) {
        rawList.push({
          id: `sale-paid-${sale.id}`,
          date: sale.date || 'N/A',
          timestamp: ts + 1,
          type: 'collection',
          refNo: sale.invoiceNo || sale.id.slice(-6),
          description: `ইনভয়েস পরিশোধ (${sale.paymentMethod || 'Cash'})`,
          debit: 0,
          credit: sale.paid
        });
      }
    });

    // 2. Collections from collection table (Credit)
    customerCollections.forEach(col => {
      const ts = new Date(col.date || 0).getTime() || 0;
      rawList.push({
        id: `col-${col.id}`,
        date: col.date || 'N/A',
        timestamp: ts,
        type: 'collection',
        refNo: col.id.slice(-6),
        description: `বকেয়া জমা আদায় (${col.paymentMethod || 'Cash'})${col.notes ? ` - ${col.notes}` : ''}`,
        debit: 0,
        credit: col.amount || 0
      });
    });

    // 3. Customer Loans & Advances
    activeCustomerLoans.forEach(loan => {
      const ts = new Date(loan.date || 0).getTime() || 0;
      rawList.push({
        id: `loan-${loan.id}`,
        date: loan.date || 'N/A',
        timestamp: ts,
        type: 'loan_disbursed',
        refNo: loan.loanNo || loan.id.slice(-6),
        description: `${loan.type === 'advance' ? 'অগ্রিম গ্রহণ' : 'ঋণ গ্রহণ'}: ${loan.purpose || ''}`,
        debit: loan.amount || 0,
        credit: 0
      });

      (loan.repayments || []).forEach(rep => {
        const repTs = new Date(rep.date || 0).getTime() || 0;
        rawList.push({
          id: `rep-${rep.id}`,
          date: rep.date || 'N/A',
          timestamp: repTs,
          type: 'loan_repaid',
          refNo: loan.loanNo || loan.id.slice(-6),
          description: `কিস্তি পরিশোধ (${rep.paymentMethod || 'Cash'})`,
          debit: 0,
          credit: rep.amount || 0
        });
      });
    });

    // Sort ascending by date for accurate running balance
    rawList.sort((a, b) => a.timestamp - b.timestamp);

    let running = 0;
    let sumDebit = 0;
    let sumCredit = 0;

    const entries: LedgerEntry[] = rawList.map(item => {
      running += item.debit - item.credit;
      sumDebit += item.debit;
      sumCredit += item.credit;
      return {
        id: item.id,
        date: item.date,
        type: item.type,
        refNo: item.refNo,
        description: item.description,
        debit: item.debit,
        credit: item.credit,
        balance: running
      };
    });

    return {
      entries,
      totalDebit: sumDebit,
      totalCredit: sumCredit,
      closingBalance: running
    };
  }, [activeCustomer, customerSales, customerCollections, activeCustomerLoans]);

  // Filtered sales in the Purchases Tab
  const filteredCustomerSales = useMemo(() => {
    let list = customerSales;
    if (invoiceStatusFilter === 'paid') {
      list = list.filter(s => (s.due || 0) <= 0);
    } else if (invoiceStatusFilter === 'due') {
      list = list.filter(s => (s.due || 0) > 0);
    } else if (invoiceStatusFilter === 'delivered') {
      list = list.filter(s => s.status === 'delivered' || s.deliveryStatus === 'delivered');
    } else if (invoiceStatusFilter === 'undelivered') {
      list = list.filter(s => s.status === 'undelivered' || s.deliveryStatus === 'undelivered' || s.isUndeliveredChallan);
    } else if (invoiceStatusFilter === 'partial') {
      list = list.filter(s => s.status === 'partial' || s.deliveryStatus === 'partial');
    }

    if (invoiceSearchQuery.trim()) {
      const q = invoiceSearchQuery.toLowerCase();
      list = list.filter(s => 
        (s.invoiceNo || '').toLowerCase().includes(q) ||
        (s.date || '').includes(q) ||
        (s.paymentMethod || '').toLowerCase().includes(q) ||
        (s.items || []).some(item => (item.productName || '').toLowerCase().includes(q))
      );
    }

    return list;
  }, [customerSales, invoiceStatusFilter, invoiceSearchQuery]);

  // Print Invoice Handler
  const handlePrintSale = (sale: Sale) => {
    setSelectedSaleForPrint(sale);
    setShowInvoicePreview(true);
  };

  const handlePrintAction = () => {
    const printContent = document.getElementById('history-printable-receipt');
    if (!printContent) return;
    const WinPrint = window.open('', '', 'width=900,height=800');
    if (WinPrint) {
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');
      WinPrint.document.write('<html><head><title>Invoice</title>');
      WinPrint.document.write(styles);
      WinPrint.document.write('<style>');
      WinPrint.document.write(`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff !important; }
        }
      `);
      WinPrint.document.write('</style></head><body style="background: white; padding: 20px;">');
      WinPrint.document.write('<div class="invoice-container">');
      WinPrint.document.write(printContent.innerHTML);
      WinPrint.document.write('</div></body></html>');
      WinPrint.document.close();
      WinPrint.focus();
      setTimeout(() => { WinPrint.print(); WinPrint.close(); }, 500);
    }
  };

  const handleDownloadInvoice = () => {
    const previewElement = document.getElementById('history-printable-receipt');
    const hiddenElement = document.getElementById('hidden-download-invoice');
    const element = previewElement || hiddenElement;

    if (!element) {
      console.warn('Invoice content not ready for download.');
      return;
    }

    const opt = {
      margin: 10,
      filename: `Invoice_${selectedSaleForPrint?.invoiceNo || 'Sale'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  // Print Ledger Statement Handler
  const handlePrintLedgerStatement = () => {
    const printContent = document.getElementById('customer-printable-ledger');
    if (!printContent) return;
    const WinPrint = window.open('', '', 'width=950,height=850');
    if (WinPrint) {
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');
      WinPrint.document.write('<html><head><title>Customer Ledger Statement</title>');
      WinPrint.document.write(styles);
      WinPrint.document.write('<style>');
      WinPrint.document.write(`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff !important; }
        }
      `);
      WinPrint.document.write('</style></head><body style="background: white; padding: 20px;">');
      WinPrint.document.write('<div class="ledger-container">');
      WinPrint.document.write(printContent.innerHTML);
      WinPrint.document.write('</div></body></html>');
      WinPrint.document.close();
      WinPrint.focus();
      setTimeout(() => { WinPrint.print(); WinPrint.close(); }, 500);
    }
  };

  const handleDownloadLedgerPDF = () => {
    const element = document.getElementById('customer-printable-ledger');
    if (!element) return;

    const opt = {
      margin: 8,
      filename: `Ledger_Statement_${activeCustomer?.name || 'Customer'}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  // Handle in-profile quick payment collection
  const handleQuickCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const parsedAmount = parseFloat(collectionAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন।");
      return;
    }

    const currentDue = activeCustomer.dueAmount || 0;
    const newDue = Math.max(0, currentDue - parsedAmount);

    const newCollection: Collection = {
      id: `COL-${Date.now()}`,
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      amount: parsedAmount,
      paymentMethod: collectionMethod,
      date: collectionDate || new Date().toISOString().split('T')[0],
      notes: collectionNotes || 'কাস্টমার প্রোফাইল থেকে বকেয়া আদায়',
      addedBy: currentStaff?.id
    };

    const updatedCustomer: Customer = {
      ...activeCustomer,
      dueAmount: newDue,
      totalPaid: (activeCustomer.totalPaid || 0) + parsedAmount
    };

    onCollection(newCollection, updatedCustomer);
    alert(`সফলভাবে ৳${parsedAmount.toLocaleString()} কালেকশন জমা নেওয়া হয়েছে!`);
    setShowQuickCollectionModal(false);
    setCollectionAmount('');
    setCollectionNotes('');
  };

  // Handler for Quick Loan Creation from profile
  const handleCreateQuickLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    const parsedAmount = parseFloat(quickLoanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("অনুগ্রহ করে সঠিক পরিমাণ দিন।");
      return;
    }

    const loanNo = `${quickLoanType === 'advance' ? 'ADV' : 'LN'}-${Date.now().toString().slice(-6)}`;
    const newLoan: CustomerLoan = {
      id: `CLOAN-${Date.now()}`,
      loanNo,
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      customerPhone: activeCustomer.phone,
      customerAddress: activeCustomer.address,
      type: quickLoanType,
      amount: parsedAmount,
      remainingAmount: parsedAmount,
      date: new Date().toISOString().split('T')[0],
      disbursedMethod: quickLoanMethod,
      purpose: quickLoanPurpose || `${quickLoanType === 'advance' ? 'অগ্রিম প্রদান' : 'লোন প্রদান'}`,
      status: 'active',
      repayments: [],
      addedBy: currentStaff?.id
    };

    if (onUpdateCustomerLoans) {
      onUpdateCustomerLoans([newLoan]);
    }
    alert(`সফলভাবে ${quickLoanType === 'advance' ? 'অগ্রিম' : 'লোন'} প্রদান রেকর্ড করা হয়েছে!`);
    setShowQuickLoanModal(false);
    setQuickLoanAmount('');
    setQuickLoanPurpose('');
  };

  // Handler for Quick Repayment from profile
  const handleQuickRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showQuickRepayModal || !activeCustomer) return;
    const parsedAmount = parseFloat(quickRepayAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("অনুগ্রহ করে সঠিক পরিমাণ দিন।");
      return;
    }

    const newRemaining = Math.max(0, (showQuickRepayModal.remainingAmount || 0) - parsedAmount);
    const isFullyPaid = newRemaining <= 0.01;

    const newRepayment: CustomerLoanRepayment = {
      id: `REPAY-${Date.now()}`,
      loanId: showQuickRepayModal.id,
      amount: parsedAmount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: quickRepayMethod,
      notes: quickRepayNote || 'কিস্তি আদায়',
      collectedBy: currentStaff?.id,
      collectedByName: currentStaff?.name || 'Staff'
    };

    const updatedLoan: CustomerLoan = {
      ...showQuickRepayModal,
      remainingAmount: newRemaining,
      status: isFullyPaid ? 'repaid' : 'active',
      repayments: [newRepayment, ...(showQuickRepayModal.repayments || [])]
    };

    if (onUpdateCustomerLoans) {
      onUpdateCustomerLoans([updatedLoan]);
    }

    alert(`সফলভাবে ৳${parsedAmount.toLocaleString()} কিস্তি আদায় করা হয়েছে!`);
    setShowQuickRepayModal(null);
    setQuickRepayAmount('');
    setQuickRepayNote('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Customer CRM & Profile</h2>
              <p className="text-slate-500 font-bold text-xs sm:text-sm mt-0.5">গ্রাহক তালিকা, বকেয়া কালেকশন, লোন লেজার ও ডায়নামিক প্রোফাইল খতিয়ান।</p>
            </div>
          </div>
        </div>
        {canAddNew && (
          <button 
            onClick={() => { resetForm(); setShowModal(true); }} 
            className="bg-primary text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary/20 font-black text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all w-full sm:w-auto justify-center"
          >
            <Plus size={18}/> নতুন কাস্টমার যোগ
          </button>
        )}
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">মোট গ্রাহক</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {kpiData.totalCustomersCount.toLocaleString()}
            </div>
            <div className="text-[9px] font-bold text-slate-500 mt-0.5">
              খুচরা: {kpiData.retailCount} • পাইকারি: {kpiData.wholesaleCount}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">মোট বিক্রয় বাকি</span>
            <div className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
              ৳{kpiData.totalSalesDue.toLocaleString()}
            </div>
            <div className="text-[9px] font-bold text-rose-500 mt-0.5">
              {kpiData.customersWithDue} জন কাস্টমারের বকেয়া
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <HandCoins size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">অগ্রিম ও লোন বাকি</span>
            <div className="text-xl sm:text-2xl font-black text-indigo-700 tracking-tight">
              ৳{kpiData.totalLoanOutstanding.toLocaleString()}
            </div>
            <div className="text-[9px] font-bold text-indigo-500 mt-0.5">
              চলমান লোন ও অগ্রিম খাতা
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Trophy size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">র‍্যাংক ও মেম্বারশিপ</span>
            <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
              {rankConfigs.length} ধাপ
            </div>
            <div className="text-[9px] font-bold text-amber-600 mt-0.5">
              স্বয়ংক্রিয় রিওয়ার্ড সিস্টেম
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="নাম, ফোন নম্বর বা ঠিকানা দিয়ে খুঁজুন..." 
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              সকল টাইপ
            </button>
            <button
              onClick={() => setTypeFilter('retail')}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all ${
                typeFilter === 'retail' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              খুচরা
            </button>
            <button
              onClick={() => setTypeFilter('wholesale')}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all ${
                typeFilter === 'wholesale' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              পাইকারি
            </button>
            <button
              onClick={() => setTypeFilter('distributor')}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all ${
                typeFilter === 'distributor' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ডিস্ট্রিবিউটর
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setDueFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all ${
                dueFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              সব
            </button>
            <button
              onClick={() => setDueFilter('with_due')}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all ${
                dueFilter === 'with_due' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              বকেয়া রয়েছে
            </button>
            <button
              onClick={() => setDueFilter('paid')}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all ${
                dueFilter === 'paid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              পরিশোধিত
            </button>
          </div>
        </div>
      </div>

      {/* Customer Master Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Hidden Invoice for Direct Download */}
        <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', pointerEvents: 'none' }}>
           {selectedSaleForPrint && (
             <InvoiceContent 
               sale={selectedSaleForPrint} 
               customer={activeCustomer || customers.find(c => c.id === selectedSaleForPrint.customerId)} 
               shopSettings={shopSettings}
               id="hidden-download-invoice"
             />
           )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[850px]">
            <thead className="bg-slate-50 text-slate-600 font-black text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 sm:p-5">কাস্টমার প্রোফাইল</th>
                <th className="p-4 sm:p-5">যোগাযোগ ও ঠিকানা</th>
                <th className="p-4 sm:p-5">টাইপ ও পদবি</th>
                <th className="p-4 sm:p-5 text-right">বিক্রয় বকেয়া</th>
                <th className="p-4 sm:p-5 text-right">অগ্রিম ও ঋণ</th>
                <th className="p-4 sm:p-5 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayCustomers.map(c => {
                const { current: r, progressToNext } = getCustomerRankInfo(c.totalPurchase || 0);
                const cLoans = customerLoans.filter(l => l.customerId === c.id);
                const loanOutstanding = cLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="p-4 sm:p-5">
                      <div className="flex items-center gap-3.5">
                        <div 
                          className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border shrink-0 overflow-hidden relative"
                          style={{
                            borderColor: c.profileColor ? `${c.profileColor}60` : undefined,
                            backgroundColor: c.profileColor ? `${c.profileColor}15` : undefined
                          }}
                        >
                          {c.imageUrl || c.photoUrl ? (
                            <img src={c.imageUrl || c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div 
                              className={`w-full h-full flex items-center justify-center font-black text-sm ${!c.profileColor ? `${r.bg} ${r.color}` : ''}`}
                              style={{ color: c.profileColor || undefined }}
                            >
                              {c.name ? c.name.charAt(0).toUpperCase() : <r.icon size={20} />}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div 
                            onClick={() => { setShowProfile(c.id); setProfileViewTab('overview'); }}
                            className="font-black text-sm hover:opacity-80 cursor-pointer truncate uppercase transition-colors flex items-center gap-1.5"
                            style={{ color: c.nameColor || '#0f172a' }}
                          >
                            <span>{c.name}</span>
                            {c.nameColor && (
                              <span 
                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0 border border-white shadow-xs" 
                                style={{ backgroundColor: c.nameColor }}
                                title={`নামের কালার: ${c.nameColor}`}
                              />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold font-mono flex items-center gap-1.5 mt-0.5">
                            <span>ID: #{c.id.slice(-6)} • {c.dateAdded ? c.dateAdded.split('T')[0] : 'N/A'}</span>
                            {(c.verifiedPhone || c.verifiedEmail) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black border border-emerald-200" title="OTP ভেরিফাইড রিয়েল কাস্টমার">
                                <ShieldCheck size={9} /> ভেরিফাইড
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 sm:p-5 text-xs">
                      <div className="font-bold text-slate-700 font-mono flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400"/> {c.phone}
                      </div>
                      {c.address ? (
                        <div className="text-[10px] text-slate-400 font-medium truncate max-w-[180px] mt-0.5 flex items-center gap-1">
                          <MapPin size={10} className="text-slate-400 shrink-0"/> {c.address}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300">ঠিকানা নেই</span>
                      )}
                    </td>

                    <td className="p-4 sm:p-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                           <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                             c.type === 'retail' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                             c.type === 'wholesale' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                             'bg-amber-50 text-amber-700 border-amber-200'
                           }`}>
                              {c.type === 'retail' ? 'খুচরা' : c.type === 'wholesale' ? 'পাইকারি' : 'ডিস্ট্রিবিউটর'}
                           </span>
                           <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${r.badge} ${r.border}`}>
                              {r.name}
                           </span>
                        </div>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                           <div className={`h-full ${r.bar}`} style={{ width: `${progressToNext}%` }}></div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 sm:p-5 text-right">
                      <div className={`font-black text-base font-mono ${c.dueAmount > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                        ৳{(c.dueAmount || 0).toLocaleString()}
                      </div>
                    </td>

                    <td className="p-4 sm:p-5 text-right">
                      {loanOutstanding > 0 ? (
                        <div>
                          <span className="font-black text-base font-mono text-indigo-700">
                            ৳{loanOutstanding.toLocaleString()}
                          </span>
                          <span className="block text-[9px] font-bold text-indigo-500">
                            {cLoans.filter(l => (l.remainingAmount || 0) > 0).length}টি কিস্তি
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-300">-</span>
                      )}
                    </td>

                    <td className="p-4 sm:p-5 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <button 
                          onClick={() => { setShowProfile(c.id); setProfileViewTab('overview'); }} 
                          className="px-3 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all font-black text-xs flex items-center gap-1.5 shadow-sm" 
                          title="View Dynamic Profile"
                        >
                          <Eye size={14}/> প্রোফাইল
                        </button>

                        {(c.dueAmount || 0) > 0 && (
                          <button
                            onClick={() => {
                              setShowProfile(c.id);
                              setCollectionAmount(String(c.dueAmount || ''));
                              setShowQuickCollectionModal(true);
                            }}
                            className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl transition-all border border-emerald-200"
                            title="Quick Collect Due"
                          >
                            <DollarSign size={15} />
                          </button>
                        )}

                        {canEditExisting && (
                          <>
                            <button 
                              onClick={() => { setEditingId(c.id); setFormData(c); setShowModal(true); }} 
                              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" 
                              title="Edit Customer"
                            >
                              <Edit size={15}/>
                            </button>
                            <button 
                              onClick={() => { 
                                if (window.confirm('কাস্টমারটি মুছে ফেলতে চান?')) { 
                                  if (onDelete && c.id) onDelete(c.id); 
                                  onUpdate(customers.filter(x => x.id !== c.id)); 
                                } 
                              }} 
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" 
                              title="Delete Customer"
                            >
                              <Trash2 size={15}/>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-bold text-sm">
                    কোনো কাস্টমার পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DYNAMIC FULL CUSTOMER PROFILE MODAL */}
      {/* ========================================================================= */}
      {showProfile && activeCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-slate-50 w-full h-full sm:max-w-7xl sm:max-h-[94vh] sm:rounded-[36px] overflow-hidden flex flex-col shadow-2xl border border-white/20">
            
            {/* Top Profile Header Banner */}
            <div 
              className="bg-slate-900 text-white p-5 sm:p-7 relative overflow-hidden shrink-0 border-b transition-colors duration-300"
              style={{
                borderBottomColor: activeCustomer.profileColor ? `${activeCustomer.profileColor}40` : '#1e293b'
              }}
            >
              <div 
                className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-30 transition-colors"
                style={{ backgroundColor: activeCustomer.profileColor || '#2563eb' }}
              />
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div 
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white border-2 shadow-xl shrink-0 overflow-hidden relative"
                      style={{
                        borderColor: activeCustomer.profileColor || 'rgba(255,255,255,0.2)',
                        backgroundColor: activeCustomer.profileColor ? `${activeCustomer.profileColor}25` : '#1e293b'
                      }}
                    >
                      {activeCustomer.imageUrl || activeCustomer.photoUrl ? (
                        <img 
                          src={activeCustomer.imageUrl || activeCustomer.photoUrl} 
                          alt={activeCustomer.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span 
                          className="text-2xl sm:text-3xl font-black"
                          style={{ color: activeCustomer.profileColor || '#60a5fa' }}
                        >
                          {activeCustomer.name ? activeCustomer.name.charAt(0).toUpperCase() : <User size={32} />}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setProfileViewTab('settings')}
                      className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-white text-slate-800 shadow-lg hover:bg-primary hover:text-white transition-all scale-90 group-hover:scale-100 border border-slate-200"
                      title="ছবি ও কালার পরিবর্তন"
                    >
                      <Camera size={13} />
                    </button>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 
                        className="text-xl sm:text-2xl font-black tracking-tight uppercase flex items-center gap-2 drop-shadow-sm transition-colors"
                        style={{ color: activeCustomer.nameColor || '#ffffff' }}
                      >
                        <span>{activeCustomer.name}</span>
                        {activeCustomer.nameColor && (
                          <span 
                            className="w-3.5 h-3.5 rounded-full inline-block border-2 border-white/60 shadow-sm shrink-0" 
                            style={{ backgroundColor: activeCustomer.nameColor }}
                            title={`নামের কালার: ${activeCustomer.nameColor}`}
                          />
                        )}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-white/20 bg-white/10 text-white`}>
                        {activeCustomer.type === 'retail' ? 'খুচরা গ্রাহক' : activeCustomer.type === 'wholesale' ? 'পাইকারি গ্রাহক' : 'ডিস্ট্রিবিউটর'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border border-amber-400/40 bg-amber-400/10 text-amber-300`}>
                        {getCustomerRankInfo(activeCustomer.totalPurchase || 0).current.name} Tier
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300 mt-2">
                      <a href={`tel:${activeCustomer.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono">
                        <Phone size={13} className="text-emerald-400" /> {activeCustomer.phone}
                      </a>
                      <a href={`https://wa.me/${activeCustomer.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                      {activeCustomer.address && (
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <MapPin size={13} className="text-slate-400 shrink-0" /> {activeCustomer.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                  <button
                    onClick={() => {
                      setCollectionAmount(String(activeCustomer.dueAmount || ''));
                      setShowQuickCollectionModal(true);
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-950/20 active:scale-95 transition-all"
                  >
                    <DollarSign size={15} /> টাকা কালেকশন
                  </button>

                  <button
                    onClick={() => setShowQuickLoanModal(true)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-indigo-950/20 active:scale-95 transition-all"
                  >
                    <HandCoins size={15} /> অগ্রিম/লোন
                  </button>

                  <button
                    onClick={() => setShowLedgerPrintModal(true)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 border border-slate-700 active:scale-95 transition-all"
                  >
                    <Printer size={15} /> খতিয়ান প্রিন্ট
                  </button>

                  <button
                    onClick={() => setShowProfile(null)}
                    className="p-2.5 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700 ml-1"
                    title="Close Profile"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
              {[
                { id: 'overview', name: 'ওভারভিউ ও অ্যানালিটিক্স', icon: TrendingUp },
                { id: 'invoices', name: `ক্রয় চালান (${customerSales.length})`, icon: ShoppingBag },
                { id: 'collections', name: `পেমেন্ট খাতা (${customerCollections.length})`, icon: CreditCard },
                { id: 'loans', name: `অগ্রিম ও লোন (${activeCustomerLoans.length})`, icon: HandCoins },
                { id: 'ledger', name: 'কাস্টমার খতিয়ান লেজার', icon: FileText },
                { id: 'settings', name: 'প্রোফাইল সেটিংস ও টার্গেট', icon: SlidersHorizontal }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setProfileViewTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                    profileViewTab === tab.id
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <tab.icon size={15} />
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Profile Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
              
              {/* ========================================================================= */}
              {/* TAB 1: OVERVIEW & ANALYTICS */}
              {/* ========================================================================= */}
              {profileViewTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Financial KPI Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">মোট কেনাকাটা (Purchases)</span>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                        ৳{customerFinancialSummary.totalPurchased.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 mt-1">
                        মোট {customerFinancialSummary.totalInvoicesCount}টি ইনভয়েস
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">মোট পরিশোধ (Paid)</span>
                      <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1">
                        ৳{(customerFinancialSummary.totalPaidOnSales + customerFinancialSummary.totalCollectionsReceived).toLocaleString()}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600 mt-1">
                        পরিশোধের হার: {customerFinancialSummary.paymentHealthRate}%
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">চলতি বিক্রয় বকেয়া</span>
                      <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1">
                        ৳{customerFinancialSummary.currentSalesDue.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-bold text-rose-500 mt-1">
                        {customerFinancialSummary.currentSalesDue > 0 ? 'বকেয়া কালেকশন প্রয়োজন' : 'পরিশোধ সম্পন্ন'}
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">অগ্রিম ও লোন বকেয়া</span>
                      <div className="text-xl sm:text-2xl font-black text-indigo-700 font-mono mt-1">
                        ৳{customerFinancialSummary.totalLoanOutstanding.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-bold text-indigo-500 mt-1">
                        মোট অগ্রিম: ৳{customerFinancialSummary.totalLoanDisbursed.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Target and Rank Progression Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Customer Targets */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <Target size={16} className="text-primary" /> কেনাকাটার টার্গেট প্রগতি
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">লাইভ ট্র্যাকার</span>
                      </div>

                      {/* Monthly */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar size={13} className="text-indigo-500" /> মাসিক টার্গেট (বর্তমান মাস)
                          </span>
                          <span className="font-black text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded-md">
                            {targetProgress.m}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${targetProgress.m}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-slate-500">
                          <span>অর্জিত: ৳{profileStats.monthly.toLocaleString()}</span>
                          <span>লক্ষ্য: ৳{(activeCustomer.targets?.monthly ?? 10000).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Yearly */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <TrendingUp size={13} className="text-amber-500" /> বার্ষিক টার্গেট
                          </span>
                          <span className="font-black text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded-md">
                            {targetProgress.y}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${targetProgress.y}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-slate-500">
                          <span>অর্জিত: ৳{profileStats.yearly.toLocaleString()}</span>
                          <span>লক্ষ্য: ৳{(activeCustomer.targets?.yearly ?? 100000).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rank Tier Card */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Trophy size={16} className="text-amber-500" /> গ্রাহক পদবি ও মেম্বারশিপ
                          </h4>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${getCustomerRankInfo(activeCustomer.totalPurchase || 0).current.badge}`}>
                            {getCustomerRankInfo(activeCustomer.totalPurchase || 0).current.name} Tier
                          </span>
                        </div>

                        {getCustomerRankInfo(activeCustomer.totalPurchase || 0).next ? (
                          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-white/10 text-amber-300">
                                  {React.createElement(RANK_ICONS[getCustomerRankInfo(activeCustomer.totalPurchase || 0).next!.name] || Trophy, { size: 20 })}
                                </div>
                                <div>
                                  <div className="text-sm font-black uppercase text-white">
                                    পরবর্তী পদবি: {getCustomerRankInfo(activeCustomer.totalPurchase || 0).next!.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    টার্গেট: ৳{getCustomerRankInfo(activeCustomer.totalPurchase || 0).next!.minAmount.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs font-black text-amber-300 font-mono">
                                {getCustomerRankInfo(activeCustomer.totalPurchase || 0).progressToNext}%
                              </span>
                            </div>

                            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-400 rounded-full transition-all duration-700" 
                                style={{ width: `${getCustomerRankInfo(activeCustomer.totalPurchase || 0).progressToNext}%` }}
                              ></div>
                            </div>

                            <p className="text-[11px] text-slate-300 font-medium">
                              আর মাত্র <span className="font-black text-amber-300 font-mono">৳{getCustomerRankInfo(activeCustomer.totalPurchase || 0).remainingToNext.toLocaleString()}</span> টাকার পণ্য ক্রয় করলে পরবর্তী পদবি ও বিশেষ ছাড় আনলক হবে!
                            </p>
                          </div>
                        ) : (
                          <div className="bg-emerald-700 text-white p-5 rounded-2xl text-center space-y-2">
                            <Sparkles size={28} className="mx-auto text-amber-300" />
                            <h5 className="font-black uppercase text-sm">সর্বোচ্চ পদবি অর্জনকারী গ্রাহক!</h5>
                            <p className="text-xs text-emerald-100">এই গ্রাহক আমাদের সর্বোচ্চ ডায়মন্ড মেম্বারশিপ টায়ার অর্জন করেছেন।</p>
                          </div>
                        )}
                      </div>

                      {/* Average Order Value Metric */}
                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block">গড় অর্ডার মূল্য</span>
                          <span className="text-sm font-black text-slate-800 font-mono">৳{customerFinancialSummary.avgOrderValue.toLocaleString()}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block">মোট সর্বমোট বাকি</span>
                          <span className="text-sm font-black text-rose-600 font-mono">৳{customerFinancialSummary.netTotalOutstanding.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Mini-Feed */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Activity size={16} className="text-primary" /> সাম্প্রতিক কার্যক্রম টাইমলাইন
                    </h4>

                    <div className="divide-y divide-slate-100">
                      {ledgerData.entries.slice(-5).reverse().map((entry, idx) => (
                        <div key={entry.id || idx} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              entry.type === 'sale' ? 'bg-blue-50 text-blue-600' :
                              entry.type === 'collection' ? 'bg-emerald-50 text-emerald-600' :
                              entry.type === 'loan_disbursed' ? 'bg-indigo-50 text-indigo-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {entry.type === 'sale' ? <Receipt size={16} /> :
                               entry.type === 'collection' ? <DollarSign size={16} /> :
                               entry.type === 'loan_disbursed' ? <HandCoins size={16} /> :
                               <CheckCircle2 size={16} />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">{entry.description}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{entry.date} • Ref: #{entry.refNo}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            {entry.debit > 0 && (
                              <span className="font-black text-xs text-slate-900 font-mono block">
                                +৳{entry.debit.toLocaleString()}
                              </span>
                            )}
                            {entry.credit > 0 && (
                              <span className="font-black text-xs text-emerald-600 font-mono block">
                                -৳{entry.credit.toLocaleString()}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-mono">ব্যালেন্স: ৳{entry.balance.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}

                      {ledgerData.entries.length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-xs font-bold">
                          এখনো কোনো লেনদেনের ইতিহাস পাওয়া যায়নি।
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: INVOICES & PURCHASES */}
              {/* ========================================================================= */}
              {profileViewTab === 'invoices' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Search and Filters */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="ইনভয়েস বা পণ্য দিয়ে খুঁজুন..." 
                        value={invoiceSearchQuery} 
                        onChange={e => setInvoiceSearchQuery(e.target.value)} 
                        className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                      {[
                        { id: 'all', label: 'সকল' },
                        { id: 'due', label: 'বকেয়া চালান' },
                        { id: 'paid', label: 'পরিশোধিত' },
                        { id: 'delivered', label: 'ডেলিভার্ড' },
                        { id: 'undelivered', label: 'অনডেলিভারী' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setInvoiceStatusFilter(f.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                            invoiceStatusFilter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Invoice Cards List */}
                  <div className="space-y-3">
                    {filteredCustomerSales.map(sale => {
                      const isExpanded = expandedInvoiceId === sale.id;
                      const hasUndelivered = sale.status === 'undelivered' || sale.deliveryStatus === 'undelivered' || sale.isUndeliveredChallan || (sale.undeliveredItems && sale.undeliveredItems.length > 0);

                      return (
                        <div key={sale.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-primary/20 transition-all">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                                <Receipt size={18} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-xs text-slate-900 font-mono">#{sale.invoiceNo}</span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                    sale.due > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {sale.due > 0 ? `বাকি ৳${sale.due.toLocaleString()}` : 'PAID'}
                                  </span>
                                  {hasUndelivered && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
                                      <AlertTriangle size={10} /> অনডেলিভারী
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                                  {sale.date} • {sale.items?.length || 0}টি আইটেম • বিক্রয়কারী: {sale.soldBy || 'N/A'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                              <div className="text-right">
                                <div className="text-[9px] font-black text-slate-400 uppercase">মোট বিল</div>
                                <div className="text-sm font-black text-slate-900 font-mono">৳{sale.total.toLocaleString()}</div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handlePrintSale(sale)}
                                  className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                                  title="প্রিভিউ ও প্রিন্ট"
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedSaleForPrint(sale);
                                    setTimeout(handleDownloadInvoice, 300);
                                  }}
                                  className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                                  title="PDF ডাউনলোড"
                                >
                                  <Download size={15} />
                                </button>
                                <button
                                  onClick={() => setExpandedInvoiceId(isExpanded ? null : sale.id)}
                                  className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                                  title="পণ্যের বিবরণ দেখুন"
                                >
                                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expandable Item Details */}
                          {isExpanded && (
                            <div className="mt-4 pt-3 border-t border-slate-100 animate-in fade-in duration-150">
                              <div className="text-[10px] font-black text-slate-500 uppercase mb-2">এই ইনভয়েসের পণ্য তালিকা:</div>
                              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                                {(sale.items || []).map((item, i) => (
                                  <div key={i} className="flex justify-between items-center text-xs">
                                    <div>
                                      <span className="font-bold text-slate-800">{item.productName}</span>
                                      <span className="text-[10px] text-slate-400 font-mono ml-2">
                                        ({item.quantity} {item.unit || 'টি'} × ৳{item.unitPrice})
                                      </span>
                                    </div>
                                    <div className="font-black text-slate-900 font-mono">
                                      ৳{item.total.toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredCustomerSales.length === 0 && (
                      <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 font-bold text-xs">
                        কোনো বিক্রয় ইনভয়েস পাওয়া যায়নি।
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: PAYMENT COLLECTIONS */}
              {/* ========================================================================= */}
              {profileViewTab === 'collections' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        বকেয়া আদায় ও জমার ইতিহাস ({customerCollections.length}টি লেনদেন)
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        সর্বমোট আদায়: ৳{customerFinancialSummary.totalCollectionsReceived.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setCollectionAmount(String(activeCustomer.dueAmount || ''));
                        setShowQuickCollectionModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Plus size={14} /> কালেকশন গ্রহণ করুন
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-black text-[10px] uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">তারিখ ও আইডি</th>
                          <th className="p-3.5">পেমেন্ট মাধ্যম</th>
                          <th className="p-3.5">বিবরণ / নোট</th>
                          <th className="p-3.5 text-right">আদায়কৃত টাকা</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customerCollections.map(col => (
                          <tr key={col.id} className="hover:bg-slate-50/60">
                            <td className="p-3.5">
                              <span className="font-mono font-bold text-slate-900">{col.date}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">#{col.id.slice(-8)}</span>
                            </td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                {col.paymentMethod}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 font-medium text-xs">
                              {col.notes || 'বকেয়া কালেকশন'}
                            </td>
                            <td className="p-3.5 text-right font-black text-emerald-600 font-mono text-sm">
                              ৳{col.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {customerCollections.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                              এখনো কোনো আলাদা কালেকশন এন্ট্রি নেই।
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: ADVANCE & LOAN LEDGER */}
              {/* ========================================================================= */}
              {profileViewTab === 'loans' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <HandCoins size={16} className="text-indigo-600" /> অগ্রিম ও লোন খাতা
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        বর্তমান বকেয়া লোন: ৳{customerFinancialSummary.totalLoanOutstanding.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowQuickLoanModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Plus size={14} /> নতুন লোন/অগ্রিম দিন
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activeCustomerLoans.map(loan => {
                      const total = loan.amount || 0;
                      const rem = loan.remainingAmount || 0;
                      const isPaid = rem <= 0 || loan.status === 'repaid';

                      return (
                        <div key={loan.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                                  loan.type === 'advance' ? 'bg-indigo-100 text-indigo-700' : 'bg-primary/10 text-primary'
                                }`}>
                                  {loan.type === 'advance' ? 'অগ্রিম' : 'লোন'}
                                </span>
                                <span className="font-mono text-xs font-black text-slate-800">#{loan.loanNo || loan.id.slice(-6)}</span>
                                <span className="text-[10px] text-slate-400 font-bold">• {loan.date}</span>
                              </div>
                              <p className="text-xs text-slate-600 font-bold mt-1">{loan.purpose || 'ব্যবসায়িক লেনদেন'}</p>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase block">মোট পরিমাণ</span>
                                <span className="text-sm font-black text-slate-900 font-mono">৳{total.toLocaleString()}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-black text-rose-500 uppercase block">অবশিষ্ট বাকি</span>
                                <span className="text-base font-black text-rose-600 font-mono">৳{rem.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Repayments History */}
                          {loan.repayments && loan.repayments.length > 0 && (
                            <div className="pt-3 border-t border-slate-100 space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase">কিস্তি জমা ইতিহাস ({loan.repayments.length}টি)</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {loan.repayments.map(rep => (
                                  <div key={rep.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] flex justify-between items-center">
                                    <span className="font-black text-emerald-600 font-mono">৳{rep.amount.toLocaleString()} ({rep.paymentMethod})</span>
                                    <span className="text-slate-400 text-[10px] font-mono">{rep.date}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            {!isPaid ? (
                              <button
                                onClick={() => {
                                  setShowQuickRepayModal(loan);
                                  setQuickRepayAmount(String(rem));
                                }}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:bg-emerald-700 transition-all"
                              >
                                <DollarSign size={14} /> কিস্তি জমা নিন
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 size={14} /> সম্পূর্ণ পরিশোধিত
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {activeCustomerLoans.length === 0 && (
                      <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 font-bold text-xs">
                        এই কাস্টমারের কোনো অগ্রিম বা লোন রেকর্ড নেই।
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 5: RUNNING BALANCE LEDGER STATEMENT */}
              {/* ========================================================================= */}
              {profileViewTab === 'ledger' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={16} className="text-primary" /> কাস্টমার লেজার খতিয়ান (Running Balance)
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        সকল বিক্রয়, কালেকশন ও লোনের সমন্বিত হিসাব।
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={handlePrintLedgerStatement}
                        className="px-4 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-sm transition-all active:scale-95"
                      >
                        <Printer size={15} /> খতিয়ান প্রিন্ট
                      </button>
                      <button
                        onClick={handleDownloadLedgerPDF}
                        className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition-all active:scale-95"
                      >
                        <Download size={15} /> PDF ডাউনলোড
                      </button>
                    </div>
                  </div>

                  {/* Summary Tiles */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase block">মোট ডেবিট (বিক্রয় ও লোন)</span>
                      <span className="text-base font-black text-slate-900 font-mono">৳{ledgerData.totalDebit.toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="text-[10px] font-black text-emerald-600 uppercase block">মোট ক্রেডিট (জমা ও পরিশোধ)</span>
                      <span className="text-base font-black text-emerald-700 font-mono">৳{ledgerData.totalCredit.toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="text-[10px] font-black text-rose-500 uppercase block">বর্তমান ব্যালেন্স (জের)</span>
                      <span className="text-base font-black text-rose-700 font-mono">৳{ledgerData.closingBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs min-w-[700px]">
                        <thead className="bg-slate-50 text-slate-700 font-black text-[10px] uppercase border-b border-slate-200">
                          <tr>
                            <th className="p-3.5">তারিখ</th>
                            <th className="p-3.5">বিবরণ / রেফারেন্স</th>
                            <th className="p-3.5 text-right">ডেবিট (+)</th>
                            <th className="p-3.5 text-right">ক্রেডিট (-)</th>
                            <th className="p-3.5 text-right">ব্যালেন্স / জের</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ledgerData.entries.map((entry, idx) => (
                            <tr key={entry.id || idx} className="hover:bg-slate-50/70">
                              <td className="p-3.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                                {entry.date}
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">{entry.description}</div>
                                <div className="text-[10px] text-slate-400 font-mono">Ref: #{entry.refNo}</div>
                              </td>
                              <td className="p-3.5 text-right font-black font-mono text-slate-900">
                                {entry.debit > 0 ? `৳${entry.debit.toLocaleString()}` : '-'}
                              </td>
                              <td className="p-3.5 text-right font-black font-mono text-emerald-600">
                                {entry.credit > 0 ? `৳${entry.credit.toLocaleString()}` : '-'}
                              </td>
                              <td className={`p-3.5 text-right font-black font-mono ${entry.balance > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                                ৳{entry.balance.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          {ledgerData.entries.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                                কোনো লেনদেন পাওয়া যায়নি।
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 6: SETTINGS & CUSTOMIZATION */}
              {/* ========================================================================= */}
              {profileViewTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="max-w-3xl bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <SlidersHorizontal size={18} className="text-primary" /> কাস্টমার প্রোফাইল কাস্টমাইজেশন ও সেটিংস
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        কাস্টমারের নাম, ছবি, প্রোফাইল কালার এবং টার্গেট পরিবর্তন করুন।
                      </p>
                    </div>

                    {settingsToast && (
                      <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 size={14} className="text-emerald-600" /> {settingsToast}
                      </div>
                    )}
                  </div>

                  {/* 1. Profile Photo & Color Theme Header Row */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-5">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Palette size={15} className="text-primary" /> কাস্টমার ছবি ও থিম কালার
                    </div>

                    {/* Live Preview Bar */}
                    <div 
                      className="p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border transition-all"
                      style={{
                        backgroundColor: settingsProfileColor ? `${settingsProfileColor}12` : '#f8fafc',
                        borderColor: settingsProfileColor ? `${settingsProfileColor}35` : '#e2e8f0'
                      }}
                    >
                      <div className="flex items-center gap-3.5">
                        <div 
                          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white border-2 shadow-md shrink-0 overflow-hidden relative"
                          style={{
                            borderColor: settingsProfileColor || '#2563eb',
                            backgroundColor: settingsProfileColor ? `${settingsProfileColor}25` : '#1e293b'
                          }}
                        >
                          {settingsImageUrl ? (
                            <img src={settingsImageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <span 
                              className="text-2xl font-black"
                              style={{ color: settingsProfileColor || '#2563eb' }}
                            >
                              {settingsName ? settingsName.charAt(0).toUpperCase() : 'C'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div 
                            className="text-base font-black uppercase flex items-center gap-2 transition-colors"
                            style={{ color: settingsNameColor || '#0f172a' }}
                          >
                            <span>{settingsName || 'কাস্টমারের নাম'}</span>
                            {settingsNameColor && (
                              <span 
                                className="w-3 h-3 rounded-full inline-block border border-white shadow-sm shrink-0"
                                style={{ backgroundColor: settingsNameColor }}
                                title={`নামের কালার: ${settingsNameColor}`}
                              />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {settingsNameColor ? `কাস্টম নাম কালার: ${settingsNameColor}` : 'ডিফল্ট নাম কালার'} • প্রোফাইল থিম: {settingsProfileColor}
                          </div>
                        </div>
                      </div>

                      {settingsImageUrl && (
                        <button
                          type="button"
                          onClick={() => setSettingsImageUrl('')}
                          className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <Trash2 size={13} /> ছবি মুছুন
                        </button>
                      )}
                    </div>

                    {/* Image Upload / URL Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">
                          ডিভাইস থেকে ছবি আপলোড
                        </label>
                        <label className="flex items-center justify-center gap-2 w-full p-3 bg-white border-2 border-dashed border-slate-300 hover:border-primary rounded-xl cursor-pointer transition-colors text-xs font-bold text-slate-700">
                          <Upload size={16} className="text-primary" />
                          <span>ছবি নির্বাচন করুন (PNG/JPG)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSettingsImageUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">
                          অথবা ছবির সরাসরি URL লিংক
                        </label>
                        <div className="relative">
                          <input
                            type="url"
                            value={settingsImageUrl}
                            onChange={e => setSettingsImageUrl(e.target.value)}
                            placeholder="https://example.com/photo.jpg"
                            className="w-full border-2 rounded-xl p-2.5 pl-9 font-medium text-xs outline-none focus:border-primary bg-white"
                          />
                          <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* Profile Theme Color Presets */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase block">
                          প্রোফাইল থিম ও ব্যাকগ্রাউন্ড কালার
                        </label>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          Hex: {settingsProfileColor}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {PROFILE_COLOR_PRESETS.map((preset) => {
                          const isSelected = settingsProfileColor.toLowerCase() === preset.hex.toLowerCase();
                          return (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => setSettingsProfileColor(preset.hex)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                                isSelected 
                                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20' 
                                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span 
                                className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-sm"
                                style={{ backgroundColor: preset.hex }}
                              />
                              <span>{preset.name}</span>
                              {isSelected && <Check size={12} className="text-white ml-0.5" />}
                            </button>
                          );
                        })}

                        {/* Custom Color Input */}
                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500">কাস্টম কালার:</label>
                          <input
                            type="color"
                            value={settingsProfileColor}
                            onChange={e => setSettingsProfileColor(e.target.value)}
                            className="w-8 h-8 rounded-xl cursor-pointer border border-slate-200 p-0.5 bg-white shadow-sm"
                            title="নিজের পছন্দের যেকোনো কালার বেছে নিন"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Customer Name & Name Color Settings Row */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={15} className="text-amber-500" /> কাস্টমারের নাম ও নামের কালার (Name & Name Color)
                      </div>
                      {settingsNameColor && (
                        <button
                          type="button"
                          onClick={() => setSettingsNameColor('')}
                          className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw size={11} /> ডিফল্ট রঙে রিসেট
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">কাস্টমার নাম *</label>
                        <input
                          type="text"
                          required
                          value={settingsName}
                          onChange={e => setSettingsName(e.target.value)}
                          placeholder="কাস্টমারের পূর্ণ নাম"
                          className="w-full border-2 rounded-xl p-3 font-bold text-xs outline-none focus:border-primary bg-white transition-colors"
                          style={{ color: settingsNameColor || undefined }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                          নামের লাইভ প্রিভিউ (Dark & Light)
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-900 px-3 py-2.5 rounded-xl border border-slate-800 flex items-center justify-center">
                            <span 
                              className="text-xs font-black uppercase truncate"
                              style={{ color: settingsNameColor || '#ffffff' }}
                            >
                              {settingsName || 'নামের প্রিভিউ'}
                            </span>
                          </div>
                          <div className="flex-1 bg-white px-3 py-2.5 rounded-xl border border-slate-200 flex items-center justify-center shadow-xs">
                            <span 
                              className="text-xs font-black uppercase truncate"
                              style={{ color: settingsNameColor || '#0f172a' }}
                            >
                              {settingsName || 'নামের প্রিভিউ'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Name Color Palette Picker */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase block">
                          নামের টেক্সট কালার সিলেক্ট করুন
                        </label>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {settingsNameColor ? `কালার কোড: ${settingsNameColor}` : 'ডিফল্ট কালার'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSettingsNameColor('')}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                            !settingsNameColor 
                              ? 'border-slate-900 bg-slate-900 text-white shadow-sm' 
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          ডিফল্ট
                        </button>

                        {NAME_COLOR_PRESETS.map((preset) => {
                          const isSelected = settingsNameColor.toLowerCase() === preset.hex.toLowerCase();
                          return (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => setSettingsNameColor(preset.hex)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                                isSelected 
                                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20' 
                                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span 
                                className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-sm border border-slate-300"
                                style={{ backgroundColor: preset.hex }}
                              />
                              <span>{preset.name}</span>
                              {isSelected && <Check size={12} className="text-white ml-0.5" />}
                            </button>
                          );
                        })}

                        {/* Custom Name Color Input */}
                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500">কাস্টম কালার:</label>
                          <input
                            type="color"
                            value={settingsNameColor || '#facc15'}
                            onChange={e => setSettingsNameColor(e.target.value)}
                            className="w-8 h-8 rounded-xl cursor-pointer border border-slate-200 p-0.5 bg-white shadow-sm"
                            title="নিজের পছন্দের যেকোনো নাম কালার বেছে নিন"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Customer General Information */}
                  <div className="space-y-4">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      সাধারণ তথ্য ও যোগাযোগ
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">মোবাইল নম্বর *</label>
                        <input
                          type="text"
                          required
                          value={settingsPhone}
                          onChange={e => setSettingsPhone(e.target.value)}
                          placeholder="01XXX-XXXXXX"
                          className="w-full border-2 rounded-xl p-3 font-bold text-xs outline-none focus:border-primary bg-slate-50 focus:bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">কাস্টমার ধরন</label>
                        <select
                          value={settingsType}
                          onChange={e => setSettingsType(e.target.value as any)}
                          className="w-full border-2 rounded-xl p-3 font-bold text-xs outline-none bg-slate-50 focus:bg-white"
                        >
                          <option value="retail">খুচরা (Retail)</option>
                          <option value="wholesale">পাইকারি (Wholesale)</option>
                          <option value="distributor">ডিস্ট্রিবিউটর (Distributor)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">ইমেইল (ঐচ্ছিক)</label>
                        <input
                          type="email"
                          value={settingsEmail}
                          onChange={e => setSettingsEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full border-2 rounded-xl p-3 font-bold text-xs outline-none focus:border-primary bg-slate-50 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">ঠিকানা</label>
                        <input
                          type="text"
                          value={settingsAddress}
                          onChange={e => setSettingsAddress(e.target.value)}
                          placeholder="ঠিকানা লিখুন"
                          className="w-full border-2 rounded-xl p-3 font-bold text-xs outline-none focus:border-primary bg-slate-50 focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* 3. Targets */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <div className="text-[10px] font-black text-slate-700 uppercase">কেনাকাটা টার্গেট নির্ধারণ (টাকা)</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">মাসিক টার্গেট</label>
                          <input
                            type="number"
                            value={settingsTargets.monthly}
                            onChange={e => setSettingsTargets(prev => ({ ...prev, monthly: parseFloat(e.target.value) || 0 }))}
                            className="w-full border rounded-xl p-2.5 font-black text-xs outline-none bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">বার্ষিক টার্গেট</label>
                          <input
                            type="number"
                            value={settingsTargets.yearly}
                            onChange={e => setSettingsTargets(prev => ({ ...prev, yearly: parseFloat(e.target.value) || 0 }))}
                            className="w-full border rounded-xl p-2.5 font-black text-xs outline-none bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">লাইফটাইম টার্গেট</label>
                          <input
                            type="number"
                            value={settingsTargets.lifetime}
                            onChange={e => setSettingsTargets(prev => ({ ...prev, lifetime: parseFloat(e.target.value) || 0 }))}
                            className="w-full border rounded-xl p-2.5 font-black text-xs outline-none bg-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-primary hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-98 transition-all"
                    >
                      <Save size={16} /> পরিবর্তন সংরক্ষণ করুন
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK IN-PROFILE PAYMENT COLLECTION MODAL */}
      {/* ========================================================================= */}
      {showQuickCollectionModal && activeCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900">বকেয়া কালেকশন জমা</h3>
                <p className="text-[10px] text-slate-400 font-bold">{activeCustomer.name} ({activeCustomer.phone})</p>
              </div>
              <button onClick={() => setShowQuickCollectionModal(false)}>
                <X size={20} className="text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <form onSubmit={handleQuickCollectionSubmit} className="space-y-4">
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-rose-500 uppercase">বর্তমান বিক্রয় বকেয়া</p>
                  <p className="text-2xl font-black text-rose-700 font-mono">৳{(activeCustomer.dueAmount || 0).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCollectionAmount(String(activeCustomer.dueAmount || ''))}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase"
                >
                  সম্পূর্ণ বকেয়া
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">জমার পরিমাণ (টাকা) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="৳ 0.00"
                  value={collectionAmount}
                  onChange={e => setCollectionAmount(e.target.value)}
                  className="w-full border-2 rounded-2xl p-3 font-black text-lg text-emerald-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">পেমেন্ট মেথড</label>
                  <select
                    value={collectionMethod}
                    onChange={e => setCollectionMethod(e.target.value)}
                    className="w-full border-2 rounded-2xl p-3 font-bold text-xs outline-none bg-white"
                  >
                    <option value="Cash">Cash (নগদ)</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank">Bank (ব্যাংক)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">তারিখ</label>
                  <input
                    type="date"
                    required
                    value={collectionDate}
                    onChange={e => setCollectionDate(e.target.value)}
                    className="w-full border-2 rounded-2xl p-3 font-bold text-xs outline-none bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">নোট / বিবরণ</label>
                <input
                  type="text"
                  placeholder="যেমন: চালান পরিশোধ..."
                  value={collectionNotes}
                  onChange={e => setCollectionNotes(e.target.value)}
                  className="w-full border-2 rounded-2xl p-3 font-bold text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
              >
                কালেকশন সেভ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK LOAN MODAL FROM CUSTOMER PROFILE */}
      {showQuickLoanModal && activeCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black uppercase text-slate-900">অগ্রিম বা লোন প্রদান ({activeCustomer.name})</h3>
              <button onClick={() => setShowQuickLoanModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <form onSubmit={handleCreateQuickLoan} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">লেনদেনের ধরন</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickLoanType('advance')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-black uppercase ${quickLoanType === 'advance' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    অগ্রিম (Advance)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickLoanType('loan')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-black uppercase ${quickLoanType === 'loan' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    ঋণ/লোন (Loan)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">টাকার পরিমাণ (৳) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="৳ 0.00"
                  value={quickLoanAmount}
                  onChange={e => setQuickLoanAmount(e.target.value)}
                  className="w-full border-2 rounded-2xl p-3 font-black text-lg text-primary outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">প্রদানের মাধ্যম</label>
                <select
                  value={quickLoanMethod}
                  onChange={e => setQuickLoanMethod(e.target.value)}
                  className="w-full border-2 rounded-2xl p-3 font-bold text-xs outline-none bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">কারণ / বিবরণ</label>
                <input
                  type="text"
                  placeholder="যেমন: মালামালের অগ্রিম..."
                  value={quickLoanPurpose}
                  onChange={e => setQuickLoanPurpose(e.target.value)}
                  className="w-full border-2 rounded-2xl p-3 font-bold text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg active:scale-95"
              >
                সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK REPAY MODAL FROM CUSTOMER PROFILE */}
      {showQuickRepayModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black uppercase text-slate-900">কিস্তি জমা গ্রহণ</h3>
              <button onClick={() => setShowQuickRepayModal(null)}><X size={20} className="text-slate-400"/></button>
            </div>
            <form onSubmit={handleQuickRepaySubmit} className="space-y-4">
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-black text-rose-500 uppercase">অবশিষ্ট বকেয়া</p>
                <p className="text-2xl font-black text-rose-700 font-mono">৳{(showQuickRepayModal.remainingAmount || 0).toLocaleString()}</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">জমার পরিমাণ (টাকা) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={showQuickRepayModal.remainingAmount}
                  value={quickRepayAmount}
                  onChange={e => setQuickRepayAmount(e.target.value)}
                  className="w-full border-2 rounded-2xl p-3 font-black text-lg text-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">মেথড</label>
                <select
                  value={quickRepayMethod}
                  onChange={e => setQuickRepayMethod(e.target.value)}
                  className="w-full border-2 rounded-2xl p-3 font-bold text-xs outline-none bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg active:scale-95"
              >
                টাকা গ্রহণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE PREVIEW MODAL */}
      {showInvoicePreview && selectedSaleForPrint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-0 sm:p-6 overflow-hidden">
           <div className="bg-slate-100 w-full h-full sm:max-w-4xl sm:max-h-[95vh] sm:rounded-[36px] flex flex-col shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
              <div className="bg-white p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-xl text-primary"><FileText size={22}/></div>
                    <div>
                       <h3 className="text-base font-black text-slate-900 uppercase">Invoice Preview</h3>
                       <p className="text-[10px] font-bold text-slate-400">চালান নম্বর: #{selectedSaleForPrint.invoiceNo}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowInvoicePreview(false)} className="p-2 text-slate-400 hover:text-rose-600"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar flex justify-center bg-slate-200/50">
                 <InvoiceContent 
                   sale={selectedSaleForPrint} 
                   customer={activeCustomer} 
                   shopSettings={shopSettings}
                   id="history-printable-receipt"
                 />
              </div>
              <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap justify-end gap-2 shrink-0">
                 <button onClick={() => setShowInvoicePreview(false)} className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-black text-xs uppercase">বন্ধ করুন</button>
                 <button onClick={handleDownloadInvoice} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2"><Download size={16}/> PDF ডাউনলোড</button>
                 <button onClick={handlePrintAction} className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg"><Printer size={16}/> প্রিন্ট করুন</button>
              </div>
           </div>
        </div>
      )}

      {/* PRINTABLE CUSTOMER LEDGER MODAL */}
      {showLedgerPrintModal && activeCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-0 sm:p-6 overflow-hidden">
          <div className="bg-slate-100 w-full h-full sm:max-w-4xl sm:max-h-[95vh] sm:rounded-[36px] flex flex-col shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
            <div className="bg-white p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl text-primary"><FileText size={22}/></div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">কাস্টমার লেজার খতিয়ান প্রিন্ট প্রিভিউ</h3>
                  <p className="text-[10px] font-bold text-slate-400">{activeCustomer.name} • {activeCustomer.phone}</p>
                </div>
              </div>
              <button onClick={() => setShowLedgerPrintModal(false)} className="p-2 text-slate-400 hover:text-rose-600"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar flex justify-center bg-slate-200/50">
              <CustomerLedgerContent
                customer={activeCustomer}
                entries={ledgerData.entries}
                totalDebit={ledgerData.totalDebit}
                totalCredit={ledgerData.totalCredit}
                closingBalance={ledgerData.closingBalance}
                shopSettings={shopSettings}
                id="customer-printable-ledger"
              />
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap justify-end gap-2 shrink-0">
              <button onClick={() => setShowLedgerPrintModal(false)} className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-black text-xs uppercase">বন্ধ করুন</button>
              <button onClick={handleDownloadLedgerPDF} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2"><Download size={16}/> PDF ডাউনলোড</button>
              <button onClick={handlePrintLedgerStatement} className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg"><Printer size={16}/> প্রিন্ট করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden modal-container">
          <div className="bg-white rounded-none sm:rounded-[36px] w-full h-full sm:max-w-2xl sm:max-h-[90vh] p-6 sm:p-8 shadow-2xl animate-in zoom-in duration-200 border border-slate-200 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
               <h3 className="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
                  <div className="bg-primary p-2.5 rounded-xl text-white shadow-md"><Users size={20}/></div>
                  {editingId ? 'কাস্টমার প্রোফাইল এডিট' : 'নতুন কাস্টমার নিবন্ধন'}
               </h3>
               <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-600"><X size={28}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Photo and Color Theme Row */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1.5">
                    <Palette size={14} className="text-primary" /> প্রোফাইল ছবি ও থিম কালার
                  </span>
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '', photoUrl: '' })}
                      className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 size={12} /> ছবি মুছুন
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Live Avatar Preview */}
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white border-2 shadow-md shrink-0 overflow-hidden relative"
                    style={{
                      borderColor: formData.profileColor || '#2563eb',
                      backgroundColor: formData.profileColor ? `${formData.profileColor}25` : '#1e293b'
                    }}
                  >
                    {formData.imageUrl || formData.photoUrl ? (
                      <img src={formData.imageUrl || formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span 
                        className="text-2xl font-black"
                        style={{ color: formData.profileColor || '#2563eb' }}
                      >
                        {formData.name ? formData.name.charAt(0).toUpperCase() : 'C'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center justify-center gap-1.5 p-2.5 bg-white border border-slate-300 hover:border-primary rounded-xl cursor-pointer text-xs font-bold text-slate-700 transition-colors shadow-sm">
                        <Upload size={14} className="text-primary" />
                        <span>ছবি আপলোড</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleModalImageUpload}
                          className="hidden"
                        />
                      </label>

                      <div className="relative">
                        <input
                          type="url"
                          value={formData.imageUrl || formData.photoUrl || ''}
                          onChange={e => setFormData({ ...formData, imageUrl: e.target.value, photoUrl: e.target.value })}
                          placeholder="ছবির URL লিংক..."
                          className="w-full border rounded-xl p-2 pl-7 font-medium text-xs outline-none bg-white focus:border-primary"
                        />
                        <ImageIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    {/* Presets and custom color */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {PROFILE_COLOR_PRESETS.slice(0, 7).map((preset) => {
                        const isSelected = (formData.profileColor || '#2563eb').toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => setFormData({ ...formData, profileColor: preset.hex })}
                            className={`w-6 h-6 rounded-full border-2 transition-all shrink-0 ${
                              isSelected ? 'border-slate-900 scale-110 shadow-sm ring-2 ring-slate-900/30' : 'border-white hover:scale-105'
                            }`}
                            style={{ backgroundColor: preset.hex }}
                            title={preset.name}
                          />
                        );
                      })}
                      <input
                        type="color"
                        value={formData.profileColor || '#2563eb'}
                        onChange={e => setFormData({ ...formData, profileColor: e.target.value })}
                        className="w-6 h-6 rounded-full cursor-pointer border border-slate-300 p-0 bg-transparent shrink-0"
                        title="কাস্টম কালার"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">পূর্ণ নাম *</label>
                    <input 
                      required 
                      className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-xs bg-white outline-none focus:border-primary transition-colors" 
                      style={{ color: formData.nameColor || undefined }}
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="নাম লিখুন" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">মোবাইল নম্বর *</label>
                    <input required className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-xs bg-slate-50 outline-none focus:bg-white focus:border-primary font-mono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="01XXX-XXXXXX" />
                  </div>
                </div>

                {/* Name Color Selection for Modal */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-500" /> নামের টেক্সট কালার:
                    </span>
                    <span 
                      className="text-xs font-black uppercase px-2 py-0.5 rounded bg-slate-900 shadow-xs"
                      style={{ color: formData.nameColor || '#ffffff' }}
                    >
                      {formData.name || 'নাম প্রিভিউ'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, nameColor: '' }))}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                        !formData.nameColor ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      ডিফল্ট
                    </button>
                    {NAME_COLOR_PRESETS.slice(0, 6).map(preset => {
                      const isSel = (formData.nameColor || '').toLowerCase() === preset.hex.toLowerCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, nameColor: preset.hex }))}
                          className={`w-5 h-5 rounded-full border transition-all shrink-0 ${
                            isSel ? 'scale-125 ring-2 ring-slate-900 border-white' : 'border-slate-300 hover:scale-110'
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        />
                      );
                    })}
                    <input
                      type="color"
                      value={formData.nameColor || '#facc15'}
                      onChange={e => setFormData(prev => ({ ...prev, nameColor: e.target.value }))}
                      className="w-5 h-5 rounded-full cursor-pointer border border-slate-300 p-0 bg-transparent shrink-0"
                      title="কাস্টম নাম কালার"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">যোগদানের তারিখ</label>
                  <input type="date" required className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-xs bg-slate-50 outline-none focus:bg-white focus:border-primary font-mono" value={formData.dateAdded?.split('T')[0]} onChange={e => setFormData({...formData, dateAdded: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">কাস্টমার ধরন</label>
                  <select className="w-full border-2 border-slate-200 rounded-xl p-3 bg-slate-50 font-bold text-xs outline-none focus:bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="retail">খুচরা (Retail)</option>
                    <option value="wholesale">পাইকারি (Wholesale)</option>
                    <option value="distributor">ডিস্ট্রিবিউটর (Distributor)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                 <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                   <Target size={14} className="text-primary"/> কেনাকাটার টার্গেট নির্ধারণ (৳)
                 </h4>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">মাসিক টার্গেট</label>
                      <input type="number" className="w-full border rounded-xl p-2.5 font-bold text-xs bg-white outline-none font-mono" value={formData.targets?.monthly} onChange={e => setFormData({...formData, targets: {...(formData.targets || {monthly:0, yearly:0, lifetime:0}), monthly: parseFloat(e.target.value) || 0}})} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">বার্ষিক টার্গেট</label>
                      <input type="number" className="w-full border rounded-xl p-2.5 font-bold text-xs bg-white outline-none font-mono" value={formData.targets?.yearly} onChange={e => setFormData({...formData, targets: {...(formData.targets || {monthly:0, yearly:0, lifetime:0}), yearly: parseFloat(e.target.value) || 0}})} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">লাইফটাইম টার্গেট</label>
                      <input type="number" className="w-full border rounded-xl p-2.5 font-bold text-xs bg-white outline-none font-mono" value={formData.targets?.lifetime} onChange={e => setFormData({...formData, targets: {...(formData.targets || {monthly:0, yearly:0, lifetime:0}), lifetime: parseFloat(e.target.value) || 0}})} />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">পূর্বের বকেয়া টাকা (৳)</label>
                  <input type="number" className="w-full border-2 border-slate-200 rounded-xl p-3 bg-slate-50 font-bold text-xs outline-none font-mono" value={formData.dueAmount} onChange={e => setFormData({...formData, dueAmount: parseFloat(e.target.value) || 0})} placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">ঠিকানা (Address)</label>
                  <input className="w-full border-2 border-slate-200 rounded-xl p-3 bg-slate-50 font-bold text-xs outline-none focus:bg-white focus:border-primary" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="ঠিকানা লিখুন" />
                </div>
              </div>

              <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider text-xs transition-all active:scale-95 mt-4">
                <Save size={18}/> {editingId ? 'তথ্য আপডেট করুন' : 'কাস্টমার সংরক্ষণ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
