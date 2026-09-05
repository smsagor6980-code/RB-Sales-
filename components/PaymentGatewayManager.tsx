import React, { useState, useMemo } from 'react';
import { 
  CreditCard, Wallet, QrCode, Copy, CheckCircle2, XCircle, Clock, 
  Plus, Edit, Trash2, Save, X, RefreshCw, DollarSign, Check, AlertCircle,
  ArrowUpRight, ArrowDownLeft, Sliders, Smartphone, Building2, Eye,
  ShieldCheck, Sparkles, Send, Gift, Search, Filter, HelpCircle, Layers
} from 'lucide-react';
import { 
  PaymentGateway, WalletSettings, WalletTransaction, Customer, 
  ShopSettings, Staff, DEFAULT_PAYMENT_GATEWAYS, DEFAULT_WALLET_SETTINGS 
} from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentGatewayManagerProps {
  shopSettings: ShopSettings;
  onUpdateShopSettings: (settings: ShopSettings) => void;
  customers: Customer[];
  onUpdateCustomers: (customers: Customer[]) => void;
  walletTransactions: WalletTransaction[];
  onUpdateWalletTransactions: (transactions: WalletTransaction[]) => void;
  currentStaff?: Staff | null;
  isAdmin?: boolean;
}

export const PaymentGatewayManager: React.FC<PaymentGatewayManagerProps> = ({
  shopSettings,
  onUpdateShopSettings,
  customers = [],
  onUpdateCustomers,
  walletTransactions = [],
  onUpdateWalletTransactions,
  currentStaff,
  isAdmin = true
}) => {
  const [subTab, setSubTab] = useState<'gateways' | 'wallet_settings' | 'approvals' | 'adjust_balance' | 'ledger'>('gateways');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active gateways list from shopSettings or defaults
  const gateways: PaymentGateway[] = useMemo(() => {
    if (shopSettings.paymentGateways && shopSettings.paymentGateways.length > 0) {
      return shopSettings.paymentGateways;
    }
    return DEFAULT_PAYMENT_GATEWAYS;
  }, [shopSettings.paymentGateways]);

  // Wallet settings from shopSettings or defaults
  const walletConfig: WalletSettings = useMemo(() => {
    return shopSettings.walletSettings || DEFAULT_WALLET_SETTINGS;
  }, [shopSettings.walletSettings]);

  // Quick Merchant Numbers Edit State for instant Admin update
  const [quickGateways, setQuickGateways] = useState<PaymentGateway[]>(gateways);
  React.useEffect(() => {
    setQuickGateways(gateways);
  }, [gateways]);

  const handleQuickGatewayChange = (gatewayId: string, field: keyof PaymentGateway, value: any) => {
    setQuickGateways(prev => prev.map(g => {
      if (g.id === gatewayId) {
        return { ...g, [field]: value };
      }
      return g;
    }));
  };

  const handleQuickBankChange = (gatewayId: string, field: string, value: string) => {
    setQuickGateways(prev => prev.map(g => {
      if (g.id === gatewayId) {
        return {
          ...g,
          bankDetails: {
            ...(g.bankDetails || {}),
            [field]: value
          }
        };
      }
      return g;
    }));
  };

  const handleSaveAllMerchantNumbers = () => {
    onUpdateShopSettings({
      ...shopSettings,
      paymentGateways: quickGateways
    });
    showToast("সকল মার্চেন্ট নম্বর ও পেমেন্ট গেটওয়ে সেটিংস সফলভাবে সেভ করা হয়েছে!");
  };

  const handleSaveSingleMerchantNumber = (gatewayId: string) => {
    onUpdateShopSettings({
      ...shopSettings,
      paymentGateways: quickGateways
    });
    const targetGw = quickGateways.find(g => g.id === gatewayId);
    showToast(`${targetGw?.name || 'গেটওয়ে'}-এর নম্বর ও সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!`);
  };

  // Gateway Modal State
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);

  // Reject Modal State
  const [rejectingTx, setRejectingTx] = useState<WalletTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Adjust Balance State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct' | 'refund' | 'bonus'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustNote, setAdjustNote] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Ledger Filter State
  const [ledgerFilterType, setLedgerFilterType] = useState<string>('all');
  const [ledgerFilterStatus, setLedgerFilterStatus] = useState<string>('all');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Feedback Message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle Gateway Active Status
  const handleToggleGateway = (gatewayId: string) => {
    const updated = gateways.map(g => {
      if (g.id === gatewayId) {
        return { ...g, status: g.status === 'active' ? 'inactive' : 'active' } as PaymentGateway;
      }
      return g;
    });
    onUpdateShopSettings({
      ...shopSettings,
      paymentGateways: updated
    });
    showToast("গেটওয়ে স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে!");
  };

  // Save Gateway (Add / Edit)
  const handleSaveGateway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGateway) return;

    let updated: PaymentGateway[];
    const exists = gateways.some(g => g.id === editingGateway.id);
    if (exists) {
      updated = gateways.map(g => g.id === editingGateway.id ? editingGateway : g);
    } else {
      updated = [...gateways, editingGateway];
    }

    onUpdateShopSettings({
      ...shopSettings,
      paymentGateways: updated
    });
    setIsGatewayModalOpen(false);
    setEditingGateway(null);
    showToast("পেমেন্ট গেটওয়ে তথ্য সংরক্ষণ করা হয়েছে!");
  };

  // Delete Custom Gateway
  const handleDeleteGateway = (gatewayId: string) => {
    if (window.confirm("আপনি কি নিশ্চিত এই গেটওয়ে মুছে ফেলতে চান?")) {
      const updated = gateways.filter(g => g.id !== gatewayId);
      onUpdateShopSettings({
        ...shopSettings,
        paymentGateways: updated
      });
      showToast("গেটওয়ে মুছে ফেলা হয়েছে!");
    }
  };

  // Update Wallet Settings
  const [localWalletConfig, setLocalWalletConfig] = useState<WalletSettings>(walletConfig);
  React.useEffect(() => {
    setLocalWalletConfig(walletConfig);
  }, [walletConfig]);

  const handleSaveWalletConfig = () => {
    onUpdateShopSettings({
      ...shopSettings,
      walletSettings: localWalletConfig
    });
    showToast("রেস্ট পে ওয়ালেট কনফিগারেশন সফলভাবে সেভ করা হয়েছে!");
  };

  // Pending Top-Up Transactions
  const pendingTransactions = useMemo(() => {
    return walletTransactions.filter(t => t.status === 'pending');
  }, [walletTransactions]);

  // Approve Top-Up Transaction
  const handleApproveTransaction = (tx: WalletTransaction) => {
    const targetCustomer = customers.find(c => c.id === tx.customerId || c.uid === tx.customerId);
    if (!targetCustomer) {
      showToast("কাস্টমার প্রোফাইল পাওয়া যায়নি!", "error");
      return;
    }

    const currentBal = targetCustomer.walletBalance || 0;
    const newBal = currentBal + tx.amount;
    const totalTop = (targetCustomer.totalWalletTopup || 0) + tx.amount;

    const notification = {
      id: `notif_${Date.now()}`,
      title: 'ওয়ালেট রিচার্জ সফল!',
      message: `আপনার রেস্ট পে ওয়ালেটে ৳${tx.amount.toLocaleString()} সফলভাবে জমা হয়েছে। বর্তমান ব্যালেন্স: ৳${newBal.toLocaleString()}`,
      type: 'system' as const,
      status: 'unread' as const,
      date: new Date().toISOString()
    };

    const updatedCustomer: Customer = {
      ...targetCustomer,
      walletBalance: newBal,
      totalWalletTopup: totalTop,
      notifications: [notification, ...(targetCustomer.notifications || [])]
    };

    const updatedTx: WalletTransaction = {
      ...tx,
      status: 'approved',
      approvedBy: currentStaff?.id || 'admin',
      approvedByName: currentStaff?.name || 'Admin',
      notes: tx.notes ? `${tx.notes} (অনুমোদিত)` : 'এডমিন কর্তৃক অনুমোদিত'
    };

    onUpdateCustomers(customers.map(c => (c.id === targetCustomer.id ? updatedCustomer : c)));
    onUpdateWalletTransactions(walletTransactions.map(t => t.id === tx.id ? updatedTx : t));

    showToast(`৳${tx.amount} রিচার্জ সফলভাবে অনুমোদন করা হয়েছে!`);
  };

  // Reject Top-Up Transaction
  const handleRejectTransaction = () => {
    if (!rejectingTx) return;

    const targetCustomer = customers.find(c => c.id === rejectingTx.customerId || c.uid === rejectingTx.customerId);
    
    const updatedTx: WalletTransaction = {
      ...rejectingTx,
      status: 'rejected',
      approvedBy: currentStaff?.id || 'admin',
      approvedByName: currentStaff?.name || 'Admin',
      rejectedReason: rejectReason || 'ট্রানজেকশন আইডি সঠিক নয় বা পেমেন্ট পাওয়া যায়নি।'
    };

    if (targetCustomer) {
      const notification = {
        id: `notif_${Date.now()}`,
        title: 'ওয়ালেট রিচার্জ বাতিল',
        message: `আপনার ৳${rejectingTx.amount} রিচার্জ অনুরোধ বাতিল করা হয়েছে। কারণ: ${rejectReason || 'পেমেন্ট ভেরিফাই হয়নি'}`,
        type: 'system' as const,
        status: 'unread' as const,
        date: new Date().toISOString()
      };
      const updatedCustomer: Customer = {
        ...targetCustomer,
        notifications: [notification, ...(targetCustomer.notifications || [])]
      };
      onUpdateCustomers(customers.map(c => (c.id === targetCustomer.id ? updatedCustomer : c)));
    }

    onUpdateWalletTransactions(walletTransactions.map(t => t.id === rejectingTx.id ? updatedTx : t));
    setRejectingTx(null);
    setRejectReason('');
    showToast("রিচার্জ অনুরোধ বাতিল করা হয়েছে।", "error");
  };

  // Direct Customer Balance Adjustment
  const handleApplyBalanceAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !adjustAmount || Number(adjustAmount) <= 0) {
      showToast("সঠিক কাস্টমার ও টাকার পরিমাণ দিন!", "error");
      return;
    }

    const targetCustomer = customers.find(c => c.id === selectedCustomerId);
    if (!targetCustomer) {
      showToast("কাস্টমার খুঁজে পাওয়া যায়নি!", "error");
      return;
    }

    const currentBal = targetCustomer.walletBalance || 0;
    const amountNum = Number(adjustAmount);
    let newBal = currentBal;
    let txType: WalletTransaction['type'] = 'adjustment_add';
    let typeName = 'ব্যালেন্স রিচার্জ';

    if (adjustType === 'add') {
      newBal = currentBal + amountNum;
      txType = 'adjustment_add';
      typeName = 'এডমিন ক্রেডিট';
    } else if (adjustType === 'deduct') {
      if (currentBal < amountNum) {
        showToast("কাস্টমারের ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই!", "error");
        return;
      }
      newBal = currentBal - amountNum;
      txType = 'adjustment_deduct';
      typeName = 'এডমিন কর্তন';
    } else if (adjustType === 'refund') {
      newBal = currentBal + amountNum;
      txType = 'refund';
      typeName = 'অর্ডার রিফান্ড';
    } else if (adjustType === 'bonus') {
      newBal = currentBal + amountNum;
      txType = 'bonus';
      typeName = 'বোনাস / লয়্যালটি রিওয়ার্ড';
    }

    const newTx: WalletTransaction = {
      id: `WTX_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      customerId: targetCustomer.id,
      customerName: targetCustomer.name,
      customerPhone: targetCustomer.phone,
      type: txType,
      amount: amountNum,
      gatewayId: 'admin_manual',
      gatewayName: 'এডমিন ড্যাশবোর্ড',
      status: 'approved',
      date: new Date().toISOString(),
      notes: adjustNote || `${typeName} - অ্যাডমিন দ্বারা সম্পন্ন`,
      approvedBy: currentStaff?.id || 'admin',
      approvedByName: currentStaff?.name || 'Admin',
      createdAt: new Date().toISOString()
    };

    const notification = {
      id: `notif_${Date.now()}`,
      title: `ওয়ালেট ব্যালেন্স পরিবর্তন: ${typeName}`,
      message: `আপনার রেস্ট পে ওয়ালেটে ৳${amountNum.toLocaleString()} ${adjustType === 'deduct' ? 'কর্তন করা হয়েছে' : 'জমা করা হয়েছে'}। বর্তমান ব্যালেন্স: ৳${newBal.toLocaleString()}${adjustNote ? ` (নোট: ${adjustNote})` : ''}`,
      type: 'system' as const,
      status: 'unread' as const,
      date: new Date().toISOString()
    };

    const updatedCustomer: Customer = {
      ...targetCustomer,
      walletBalance: newBal,
      totalWalletTopup: (adjustType === 'add' || adjustType === 'bonus') ? (targetCustomer.totalWalletTopup || 0) + amountNum : targetCustomer.totalWalletTopup,
      notifications: [notification, ...(targetCustomer.notifications || [])]
    };

    onUpdateCustomers(customers.map(c => c.id === targetCustomer.id ? updatedCustomer : c));
    onUpdateWalletTransactions([newTx, ...walletTransactions]);

    setAdjustAmount('');
    setAdjustNote('');
    showToast(`কাস্টমার ${targetCustomer.name}-এর ওয়ালেট সফলভাবে আপডেট হয়েছে! নতুন ব্যালেন্স: ৳${newBal.toLocaleString()}`);
  };

  // Filtered Customers for Search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 15);
    const q = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [customers, customerSearch]);

  const selectedCustomerObj = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    return walletTransactions.filter(tx => {
      const matchType = ledgerFilterType === 'all' || tx.type === ledgerFilterType;
      const matchStatus = ledgerFilterStatus === 'all' || tx.status === ledgerFilterStatus;
      const q = ledgerSearch.toLowerCase().trim();
      const matchSearch = !q || 
        tx.customerName?.toLowerCase().includes(q) || 
        tx.customerPhone?.toLowerCase().includes(q) ||
        tx.trxId?.toLowerCase().includes(q) ||
        tx.gatewayName?.toLowerCase().includes(q);
      return matchType && matchStatus && matchSearch;
    });
  }, [walletTransactions, ledgerFilterType, ledgerFilterStatus, ledgerSearch]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalApprovedTopup = walletTransactions
      .filter(t => t.type === 'topup' && t.status === 'approved')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWalletPayments = walletTransactions
      .filter(t => t.type === 'payment' && (t.status === 'approved' || t.status === 'completed'))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCashback = walletTransactions
      .filter(t => t.type === 'cashback')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingCount = pendingTransactions.length;
    const pendingSum = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

    return { totalApprovedTopup, totalWalletPayments, totalCashback, pendingCount, pendingSum };
  }, [walletTransactions, pendingTransactions]);

  const getGatewayBadge = (gatewayId: string, name?: string) => {
    switch (gatewayId) {
      case 'bkash':
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-pink-50 text-pink-600 border border-pink-200 uppercase tracking-wider flex items-center gap-1.5"><Smartphone size={12}/> বিকাশ (bKash)</span>;
      case 'nagad':
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-orange-50 text-orange-600 border border-orange-200 uppercase tracking-wider flex items-center gap-1.5"><Smartphone size={12}/> নগদ (Nagad)</span>;
      case 'rocket':
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-200 uppercase tracking-wider flex items-center gap-1.5"><Smartphone size={12}/> রকেট (Rocket)</span>;
      case 'upay':
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200 uppercase tracking-wider flex items-center gap-1.5"><Smartphone size={12}/> উপায় (Upay)</span>;
      case 'rest_pay':
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase tracking-wider flex items-center gap-1.5"><Wallet size={12}/> রেস্ট পে ওয়ালেট</span>;
      case 'bank_transfer':
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300 uppercase tracking-wider flex items-center gap-1.5"><Building2 size={12}/> ব্যাংক ট্রান্সফার</span>;
      case 'cash_on_delivery':
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-wider flex items-center gap-1.5"><DollarSign size={12}/> ক্যাশ অন ডেলিভারি</span>;
      default:
        return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">{name || gatewayId}</span>;
    }
  };

  const getTxTypeBadge = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'topup':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">রিচার্জ (+Topup)</span>;
      case 'payment':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase">পেমেন্ট (-Payment)</span>;
      case 'cashback':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-200 uppercase">ক্যাশব্যাক (+Bonus)</span>;
      case 'bonus':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-purple-50 text-purple-600 border border-purple-200 uppercase">ওয়েলকাম বোনাস</span>;
      case 'refund':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-cyan-50 text-cyan-600 border border-cyan-200 uppercase">রিফান্ড জমা</span>;
      case 'adjustment_add':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-200 uppercase">এডমিন জমা</span>;
      case 'adjustment_deduct':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-300 uppercase">এডমিন কর্তন</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-slate-100 text-slate-500 uppercase">{type}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-xs uppercase tracking-wider text-white ${toastMessage.type === 'error' ? 'bg-rose-600 shadow-rose-600/30' : 'bg-emerald-600 shadow-emerald-600/30'}`}
          >
            {toastMessage.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-[40px] p-8 md:p-10 text-white shadow-2xl border border-indigo-800/30 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-amber-400 border border-white/10">
                <Wallet size={28} />
              </div>
              <div>
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/20">
                  Payment & Wallet Control Hub
                </span>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-1 text-white">
                  পেমেন্ট গেটওয়ে ও রেস্ট পে ওয়ালেট নিয়ন্ত্রণ
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-300 font-bold max-w-2xl leading-relaxed">
              বিকাশ (bKash), নগদ (Nagad), রকেট (Rocket), সেলফিন, ব্যাংক ও রেস্ট পে (Rest Pay) ওয়ালেটের নম্বর, কিউআর কোড, ট্রানজেকশন ফি, ইনস্ট্যান্ট রিচার্জ ও অনুমোদন এক জায়গা থেকে পরিচালনা করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditingGateway({
                  id: `gw_${Date.now()}`,
                  name: '',
                  nameEn: '',
                  type: 'mobile_banking',
                  accountType: 'personal',
                  number: '',
                  chargePercentage: 0,
                  discountPercentage: 0,
                  instructions: '',
                  minAmount: 10,
                  maxAmount: 25000,
                  status: 'active',
                  sortOrder: gateways.length + 1
                });
                setIsGatewayModalOpen(true);
              }}
              className="px-5 py-3 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Plus size={16} /> নতুন গেটওয়ে যুক্ত করুন
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">মোট ওয়ালেট রিচার্জ</p>
            <p className="text-xl font-black text-emerald-400 mt-1">৳{stats.totalApprovedTopup.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ওয়ালেট শপিং পেমেন্ট</p>
            <p className="text-xl font-black text-indigo-300 mt-1">৳{stats.totalWalletPayments.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ক্যাশব্যাক প্রদান</p>
            <p className="text-xl font-black text-amber-400 mt-1">৳{stats.totalCashback.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 relative">
            <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest flex items-center justify-between">
              অনুমোদন অপেক্ষমাণ
              {stats.pendingCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>}
            </p>
            <p className="text-xl font-black text-rose-400 mt-1">{stats.pendingCount} টি (৳{stats.pendingSum.toLocaleString()})</p>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex bg-white p-2 rounded-[28px] border-2 border-slate-100 shadow-xs overflow-x-auto no-scrollbar gap-2">
        {[
          { id: 'gateways', label: '১. মার্চেন্ট নম্বর ও গেটওয়ে কন্ট্রোল', icon: Sliders, badge: gateways.filter(g => g.status === 'active').length },
          { id: 'wallet_settings', label: '২. রেস্ট পে ওয়ালেট কনফিগ', icon: Wallet },
          { id: 'approvals', label: '৩. রিচার্জ অনুমোদন', icon: CheckCircle2, badge: stats.pendingCount, badgeColor: 'bg-rose-500 text-white' },
          { id: 'adjust_balance', label: '৪. কাস্টমার ব্যালেন্স কন্ট্রোল', icon: DollarSign },
          { id: 'ledger', label: '৫. ওয়ালেট লেনদেন লেজার', icon: Layers, badge: walletTransactions.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`whitespace-nowrap flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${subTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-[1.02]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ml-1 ${tab.badgeColor || (subTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700')}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. GATEWAYS & MERCHANT NUMBERS MANAGEMENT TAB                 */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'gateways' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
          
          {/* ========================================================= */}
          {/* DEDICATED MERCHANT NUMBERS QUICK SETUP PANEL              */}
          {/* ========================================================= */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-[36px] p-6 sm:p-8 text-white border border-indigo-500/20 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">Admin Control</span>
                    <h3 className="text-xl font-black text-white">মার্চেন্ট নম্বর কুইক সেটআপ (Quick Merchant Numbers)</h3>
                  </div>
                </div>
                <p className="text-xs text-slate-300 font-bold max-w-2xl">
                  বিকাশ, নগদ, রকেট ও উপায়-এর মার্চেন্ট/পার্সোনাল নম্বর এখানে লিখে সরাসরি সেভ করুন। চেকআউট ও ওয়ালেট রিচার্জে গ্রাহকরা এই নম্বরগুলো দেখতে পাবেন।
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveAllMerchantNumbers}
                className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
              >
                <Save size={16} /> সকল মার্চেন্ট নম্বর সেভ করুন
              </button>
            </div>

            {/* Quick Provider Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['bkash', 'nagad', 'rocket', 'upay'].map((providerId) => {
                const gw = quickGateways.find(g => g.id === providerId) || {
                  id: providerId,
                  name: providerId === 'bkash' ? 'বিকাশ (bKash)' : providerId === 'nagad' ? 'নগদ (Nagad)' : providerId === 'rocket' ? 'রকেট (Rocket)' : 'উপায় (Upay)',
                  nameEn: providerId.charAt(0).toUpperCase() + providerId.slice(1),
                  type: 'mobile_banking' as const,
                  accountType: providerId === 'bkash' ? 'merchant' : 'personal' as const,
                  number: '',
                  status: 'active' as const,
                  sortOrder: 1
                };

                const isActive = gw.status === 'active';
                const isMerchant = gw.accountType === 'merchant';

                return (
                  <div 
                    key={providerId}
                    className={`rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                      isActive 
                        ? 'bg-slate-800/80 border-indigo-500/30 shadow-md' 
                        : 'bg-slate-900/50 border-slate-700/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header & Switch */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                            providerId === 'bkash' ? 'bg-pink-600 text-white' :
                            providerId === 'nagad' ? 'bg-orange-600 text-white' :
                            providerId === 'rocket' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {gw.nameEn.charAt(0)}
                          </div>
                          <div>
                            <span className="font-black text-sm text-white block leading-tight">{gw.name}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isMerchant ? 'text-amber-300' : 'text-slate-400'}`}>
                              {isMerchant ? 'মার্চেন্ট পেমেন্ট' : 'পার্সোনাল সেন্ড মানি'}
                            </span>
                          </div>
                        </div>

                        {/* On/Off Switch */}
                        <button
                          type="button"
                          onClick={() => handleQuickGatewayChange(providerId, 'status', isActive ? 'inactive' : 'active')}
                          className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}
                          title={isActive ? 'বন্ধ করুন' : 'চালু করুন'}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform transform ${isActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </button>
                      </div>

                      {/* Number Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
                          <span>{isMerchant ? 'মার্চেন্ট নম্বর' : 'একাউন্ট নম্বর'}</span>
                          <span className="text-[9px] text-amber-300 font-mono">*আবশ্যক</span>
                        </label>
                        <input
                          type="text"
                          value={gw.number || ''}
                          onChange={(e) => handleQuickGatewayChange(providerId, 'number', e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 font-mono text-sm font-black text-white outline-none transition-all"
                        />
                      </div>

                      {/* Account Type Selector (Merchant vs Personal) */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                          অ্যাকাউন্ট টাইপ
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleQuickGatewayChange(providerId, 'accountType', 'merchant')}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                              isMerchant 
                                ? 'bg-amber-400 text-slate-950 shadow-sm' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            মার্চেন্ট (Pay)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickGatewayChange(providerId, 'accountType', 'personal')}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                              !isMerchant 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            পার্সোনাল
                          </button>
                        </div>
                      </div>

                      {/* Live Customer Preview */}
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] space-y-1">
                        <span className="text-slate-400 uppercase font-black tracking-widest text-[8px] block">গ্রাহক দেখবে:</span>
                        <div className="flex items-center justify-between font-mono font-bold">
                          <span className="text-white truncate">{gw.number || 'নম্বর দেওয়া হয়নি'}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] uppercase ${isMerchant ? 'bg-amber-400/20 text-amber-300' : 'bg-indigo-400/20 text-indigo-300'}`}>
                            {isMerchant ? 'Payment' : 'Send Money'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Single Gateway Save Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveSingleMerchantNumber(providerId)}
                      className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Check size={13} /> {gw.nameEn} সেভ করুন
                    </button>
                  </div>
                );
              })}
            </div>

            {/* How it works Info Box */}
            <div className="p-4 rounded-2xl bg-indigo-900/40 border border-indigo-500/20 flex items-start gap-3 text-xs">
              <Sparkles size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-black text-amber-300 uppercase tracking-wider block text-[11px]">
                  📌 মার্চেন্ট ও পার্সোনাল নম্বরের পার্থক্য এবং পরিচালনা গাইড
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px] font-bold">
                  • <strong>মার্চেন্ট (Merchant):</strong> সিলেক্ট করলে গ্রাহকরা চেকআউটে <span className="text-amber-300 font-mono">"Payment"</span> করার নির্দেশ পাবেন (বিকাশ/নগদ মার্চেন্ট কিউআর কোড বা পেমেন্ট অপশন)।<br/>
                  • <strong>পার্সোনাল (Personal):</strong> সিলেক্ট করলে গ্রাহকদের <span className="text-indigo-300 font-mono">"Send Money"</span> করার নির্দেশ দেওয়া হবে।<br/>
                  • যেকোনো পরিবর্তনের পর <strong>"সকল মার্চেন্ট নম্বর সেভ করুন"</strong> বাটনে ক্লিক করলে তা সরাসরি ফায়ারবেস ক্লাউড ডাটাবেজে সংরক্ষণ ও গ্রাহক পেজে আপডেট হবে।
                </p>
              </div>
            </div>
          </div>

          {/* Standard Gateways Header & Action */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border-2 border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
                <CreditCard className="text-indigo-600" size={20} /> সকল পেমেন্ট গেটওয়ে ও ব্যাংক বিস্তারিত
              </h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                লেনদেন সীমা, কিউআর কোড, ট্রানজেকশন ফি এবং ব্যাংক একাউন্টের তথ্য কনফিগার করুন
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingGateway({
                    id: `gw_${Date.now()}`,
                    name: '',
                    nameEn: '',
                    type: 'mobile_banking',
                    accountType: 'personal',
                    number: '',
                    chargePercentage: 0,
                    discountPercentage: 0,
                    instructions: '',
                    minAmount: 10,
                    maxAmount: 25000,
                    status: 'active',
                    sortOrder: gateways.length + 1
                  });
                  setIsGatewayModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <Plus size={15} /> নতুন গেটওয়ে যোগ করুন
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gateways.map((gw) => {
              const isActive = gw.status === 'active';
              return (
                <div
                  key={gw.id}
                  className={`bg-white rounded-[32px] p-6 border-2 transition-all relative flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-lg ${isActive ? 'border-slate-200' : 'border-slate-100 opacity-60 bg-slate-50/50'}`}
                >
                  {/* Top Bar */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        {getGatewayBadge(gw.id, gw.name)}
                        <h4 className="font-black text-slate-900 text-base mt-2">{gw.name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{gw.nameEn}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleGateway(gw.id)}
                          className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          title={isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </button>
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="space-y-2.5 my-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                      {gw.number && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">অ্যাকাউন্ট নম্বর:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 font-mono">{gw.number}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(gw.number || '', gw.id)}
                              className="text-slate-400 hover:text-indigo-600"
                              title="নম্বর কপি করুন"
                            >
                              {copiedId === gw.id ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">অ্যাকাউন্ট ধরন:</span>
                        <span className="font-black text-indigo-600 uppercase text-[10px] px-2 py-0.5 bg-indigo-50 rounded-lg">
                          {gw.accountType === 'merchant' ? 'মার্চেন্ট (Merchant)' : gw.accountType === 'personal' ? 'ব্যক্তিগত (Personal)' : gw.accountType === 'agent' ? 'এজেন্ট (Agent)' : 'ব্যাংক (Bank)'}
                        </span>
                      </div>

                      {gw.chargePercentage !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">ট্রানজেকশন ফি:</span>
                          <span className="font-black text-slate-800">{gw.chargePercentage > 0 ? `${gw.chargePercentage}% ফি` : 'কোনো ফি নেই (0%)'}</span>
                        </div>
                      )}

                      {gw.discountPercentage !== undefined && gw.discountPercentage > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">ক্যাশব্যাক / ডিসকাউন্ট:</span>
                          <span className="font-black text-emerald-600">{gw.discountPercentage}% ক্যাশব্যাক</span>
                        </div>
                      )}

                      {gw.minAmount !== undefined && gw.maxAmount !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">লেনদেন সীমা:</span>
                          <span className="font-black text-slate-700">৳{gw.minAmount} - ৳{gw.maxAmount.toLocaleString()}</span>
                        </div>
                      )}

                      {gw.bankDetails && gw.bankDetails.bankName && (
                        <div className="pt-2 border-t border-slate-200/60 space-y-1">
                          <p className="text-[10px] font-black text-slate-700">{gw.bankDetails.bankName}</p>
                          <p className="text-[9px] text-slate-500 font-bold">A/C: {gw.bankDetails.accountNumber} ({gw.bankDetails.accountName})</p>
                          <p className="text-[9px] text-slate-400">শাখা: {gw.bankDetails.branchName}, রাউটিং: {gw.bankDetails.routingNumber}</p>
                        </div>
                      )}

                      {gw.qrCodeUrl && (
                        <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                          <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1"><QrCode size={12}/> কিউআর কোড:</span>
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">সংযুক্ত আছে</span>
                        </div>
                      )}
                    </div>

                    {gw.instructions && (
                      <p className="text-[10px] text-slate-500 font-bold bg-slate-50 p-3 rounded-xl line-clamp-2 italic">
                        "{gw.instructions}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {isActive ? '● সক্রিয় (Active)' : '○ নিষ্ক্রিয় (Inactive)'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGateway({ ...gw });
                          setIsGatewayModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      >
                        <Edit size={12} /> এডিট
                      </button>
                      {!DEFAULT_PAYMENT_GATEWAYS.some(d => d.id === gw.id) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGateway(gw.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition-colors"
                          title="মুছে ফেলুন"
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

      {/* ------------------------------------------------------------- */}
      {/* 2. REST PAY WALLET CONFIGURATION TAB                          */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'wallet_settings' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-2">
          <div className="bg-white rounded-[40px] border-2 border-slate-100 p-8 md:p-12 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                  <Wallet size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">রেস্ট পে ওয়ালেট মাস্টার কন্ট্রোল</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rest Pay Wallet Rules & Rewards</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  {localWalletConfig.enabled ? 'ওয়ালেট সার্ভিস চালু আছে' : 'ওয়ালেট সার্ভিস বন্ধ'}
                </span>
                <button
                  type="button"
                  onClick={() => setLocalWalletConfig({ ...localWalletConfig, enabled: !localWalletConfig.enabled })}
                  className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center ${localWalletConfig.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform transform ${localWalletConfig.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Gift size={14} className="text-indigo-600"/> নতুন গ্রাহক সাইন-আপ ওয়েলকাম বোনাস ({localWalletConfig.currency})
                </label>
                <input
                  type="number"
                  className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-base bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  placeholder="যেমন: ৫০"
                  value={localWalletConfig.welcomeBonus}
                  onChange={e => setLocalWalletConfig({ ...localWalletConfig, welcomeBonus: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-[10px] font-bold text-slate-400">নতুন কাস্টমার একাউন্ট খোলার সাথে সাথে এই বোনাস তার রেস্ট পে ওয়ালেটে জমা হবে।</p>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500"/> ওয়ালেট পেমেন্টে ক্যাশব্যাক শতাংশ (%)
                </label>
                <input
                  type="number"
                  className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-base bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  placeholder="যেমন: ২"
                  value={localWalletConfig.cashbackPercentage}
                  onChange={e => setLocalWalletConfig({ ...localWalletConfig, cashbackPercentage: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-[10px] font-bold text-slate-400">রেস্ট পে ওয়ালেট দিয়ে অর্ডার দিলে প্রতি অর্ডারে গ্রাহক এই হারে ইনস্ট্যান্ট ক্যাশব্যাক পাবেন।</p>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <ArrowDownLeft size={14} className="text-emerald-600"/> সর্বনিম্ন টপ-আপ / রিচার্জ পরিমাণ ({localWalletConfig.currency})
                </label>
                <input
                  type="number"
                  className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-base bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  placeholder="যেমন: ৫০"
                  value={localWalletConfig.minTopupAmount}
                  onChange={e => setLocalWalletConfig({ ...localWalletConfig, minTopupAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <ArrowUpRight size={14} className="text-rose-600"/> সর্বোচ্চ টপ-আপ / রিচার্জ পরিমাণ ({localWalletConfig.currency})
                </label>
                <input
                  type="number"
                  className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-base bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  placeholder="যেমন: ৫০০০০"
                  value={localWalletConfig.maxTopupAmount}
                  onChange={e => setLocalWalletConfig({ ...localWalletConfig, maxTopupAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <HelpCircle size={14} className="text-indigo-600"/> গ্রাহকদের জন্য ওয়ালেট রিচার্জ নির্দেশিকা
              </label>
              <textarea
                rows={3}
                className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                placeholder="গ্রাহক যখন টাকা রিচার্জ করতে যাবেন তখন প্রদর্শিত নির্দেশনাবলী..."
                value={localWalletConfig.topupInstructions || ''}
                onChange={e => setLocalWalletConfig({ ...localWalletConfig, topupInstructions: e.target.value })}
              />
            </div>

            <div className="pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveWalletConfig}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.99] flex items-center justify-center gap-3"
              >
                <Save size={18} /> ওয়ালেট সেটিংস সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. PENDING TOP-UP & RECHARGE APPROVALS TAB                     */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'approvals' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
                <Clock className="text-amber-500" size={20} /> কাস্টমার রিচার্জ ও পেমেন্ট ভেরিফিকেশন কিউ
              </h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                গ্রাহকদের প্রেরিত বিকাশ, নগদ ও রকেট TrxID যাচাই করে ১-ক্লিকে একাউন্টে ব্যালেন্স যুক্ত করুন
              </p>
            </div>
            <span className="px-4 py-2 rounded-xl text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
              অপেক্ষমাণ: {pendingTransactions.length} টি
            </span>
          </div>

          {pendingTransactions.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="font-black text-slate-800 text-lg">কোনো অপেক্ষমাণ রিচার্জ অনুরোধ নেই</h4>
              <p className="text-xs text-slate-400 font-bold mt-1">
                গ্রাহকরা বিকাশ, নগদ বা রকেট এর মাধ্যমে টাকা পাঠালে এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingTransactions.map((tx) => (
                <div key={tx.id} className="bg-white rounded-[32px] p-6 border-2 border-amber-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 bg-amber-500 text-white font-black text-[9px] uppercase px-4 py-1 rounded-bl-2xl tracking-widest">
                    অপেক্ষমাণ (Pending)
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pr-20">
                      {getGatewayBadge(tx.gatewayId, tx.gatewayName)}
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                        {new Date(tx.date || tx.createdAt).toLocaleString('bn-BD')}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">টাকার পরিমাণ</p>
                        <p className="text-2xl font-black text-slate-900">৳{tx.amount.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">গ্রাহকের নাম</p>
                        <p className="text-sm font-black text-indigo-600">{tx.customerName}</p>
                        <p className="text-[11px] font-bold text-slate-500">{tx.customerPhone}</p>
                      </div>
                    </div>

                    <div className="space-y-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
                      {tx.senderNumber && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-bold">প্রেরকের নম্বর:</span>
                          <span className="font-mono font-black text-slate-800">{tx.senderNumber}</span>
                        </div>
                      )}
                      {tx.trxId && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-bold">Transaction ID (TrxID):</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">{tx.trxId}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(tx.trxId || '', tx.id)}
                              className="text-slate-400 hover:text-indigo-600"
                              title="কপি করুন"
                            >
                              {copiedId === tx.id ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}
                            </button>
                          </div>
                        </div>
                      )}
                      {tx.notes && (
                        <p className="text-[10px] text-slate-500 font-bold italic pt-1 border-t border-indigo-100/50">
                          গ্রাহকের নোট: "{tx.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-6 mt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleApproveTransaction(tx)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <CheckCircle2 size={16} /> অনুমোদন করুন (+৳{tx.amount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingTx(tx);
                        setRejectReason('');
                      }}
                      className="px-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    >
                      <XCircle size={16} /> বাতিল
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. CUSTOMER BALANCE ADJUSTMENT TOOL TAB                       */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'adjust_balance' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-2">
          <div className="bg-white rounded-[40px] border-2 border-slate-100 p-8 md:p-12 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b pb-6">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <DollarSign size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">সরাসরি কাস্টমার ওয়ালেট রিচার্জ / ব্যালেন্স নিয়ন্ত্রণ</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Credit, Debit & Refund Tool</p>
              </div>
            </div>

            <form onSubmit={handleApplyBalanceAdjustment} className="space-y-6">
              {/* Step 1: Select Customer */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Search size={14} className="text-indigo-600"/> কাস্টমার নির্বাচন করুন
                </label>
                
                <div className="relative">
                  <input
                    type="text"
                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all mb-2"
                    placeholder="নাম বা ফোন নম্বর দিয়ে কাস্টমার খুঁজুন..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {filteredCustomers.map(c => {
                    const isSelected = selectedCustomerId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                      >
                        <div>
                          <p className="font-black text-xs text-slate-900 truncate">{c.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{c.phone}</p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200/50 flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-bold">ওয়ালেট:</span>
                          <span className="font-black text-indigo-600">৳{(c.walletBalance || 0).toLocaleString()}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Customer Card */}
              {selectedCustomerObj && (
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 bg-white/10 px-2.5 py-0.5 rounded-full">নির্বাচিত কাস্টমার</span>
                    <h4 className="text-lg font-black mt-1">{selectedCustomerObj.name}</h4>
                    <p className="text-xs text-slate-300 font-bold">{selectedCustomerObj.phone} {selectedCustomerObj.email ? `• ${selectedCustomerObj.email}` : ''}</p>
                  </div>
                  <div className="text-right bg-white/10 p-4 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">বর্তমান ওয়ালেট ব্যালেন্স</p>
                    <p className="text-2xl font-black text-amber-400 mt-0.5">৳{(selectedCustomerObj.walletBalance || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Step 2: Action Type */}
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest">কার্যক্রম নির্বাচন করুন</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'add', label: 'টাকা যোগ করুন (+)', desc: 'ক্রেডিট ব্যালেন্স', color: 'border-emerald-500 bg-emerald-50/50 text-emerald-700' },
                    { id: 'bonus', label: 'বোনাস / রিওয়ার্ড (+)', desc: 'লয়্যালটি পয়েন্ট', color: 'border-purple-500 bg-purple-50/50 text-purple-700' },
                    { id: 'refund', label: 'অর্ডার রিফান্ড (+)', desc: 'টাকা ফেরত', color: 'border-cyan-500 bg-cyan-50/50 text-cyan-700' },
                    { id: 'deduct', label: 'টাকা কর্তন করুন (-)', desc: 'ডেবিট ব্যালেন্স', color: 'border-rose-500 bg-rose-50/50 text-rose-700' }
                  ].map(action => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => setAdjustType(action.id as any)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${adjustType === action.id ? `${action.color} shadow-sm font-black` : 'border-slate-100 hover:border-slate-200 text-slate-600 bg-slate-50/50'}`}
                    >
                      <p className="text-xs font-black">{action.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{action.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Amount and Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest">টাকার পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-lg bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    placeholder="যেমন: ৫০০"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                  <div className="flex gap-2 pt-1">
                    {[100, 500, 1000, 2000, 5000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAdjustAmount(amt)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black transition-colors"
                      >
                        +৳{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest">কারণ / রেফারেন্স নোট</label>
                  <input
                    type="text"
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    placeholder="যেমন: বিশেষ ছাড় / ইনভয়েস #1234 রিফান্ড"
                    value={adjustNote}
                    onChange={e => setAdjustNote(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedCustomerId || !adjustAmount}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.99] flex items-center justify-center gap-3"
              >
                <CheckCircle2 size={18} /> ব্যালেন্স আপডেট ও নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. WALLET TRANSACTION LEDGER TAB                              */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'ledger' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          {/* Filter Bar */}
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                className="w-full border-2 border-slate-100 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                placeholder="কাস্টমার নাম, ফোন বা TrxID দিয়ে খুঁজুন..."
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                className="border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-black bg-slate-50 outline-none focus:bg-white"
                value={ledgerFilterType}
                onChange={e => setLedgerFilterType(e.target.value)}
              >
                <option value="all">সব ধরনের লেনদেন</option>
                <option value="topup">টপ-আপ / রিচার্জ</option>
                <option value="payment">অর্ডার পেমেন্ট</option>
                <option value="cashback">ক্যাশব্যাক</option>
                <option value="bonus">বোনাস</option>
                <option value="refund">রিফান্ড</option>
                <option value="adjustment_add">এডমিন ক্রেডিট</option>
                <option value="adjustment_deduct">এডমিন কর্তন</option>
              </select>

              <select
                className="border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-black bg-slate-50 outline-none focus:bg-white"
                value={ledgerFilterStatus}
                onChange={e => setLedgerFilterStatus(e.target.value)}
              >
                <option value="all">সব স্ট্যাটাস</option>
                <option value="approved">অনুমোদিত (Approved)</option>
                <option value="pending">অপেক্ষমাণ (Pending)</option>
                <option value="rejected">বাতিলকৃত (Rejected)</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-[32px] border-2 border-slate-100 overflow-hidden shadow-xs">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-4 px-6">তারিখ ও সময়</th>
                    <th className="py-4 px-6">কাস্টমার</th>
                    <th className="py-4 px-6">ধরন</th>
                    <th className="py-4 px-6">গেটওয়ে / মাধ্যম</th>
                    <th className="py-4 px-6">পরিমাণ</th>
                    <th className="py-4 px-6">TrxID / নোট</th>
                    <th className="py-4 px-6">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        কোনো লেনদেন রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 text-slate-500 font-bold whitespace-nowrap text-[11px]">
                          {new Date(tx.date || tx.createdAt).toLocaleString('bn-BD')}
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-black text-slate-900">{tx.customerName}</p>
                          <p className="text-[10px] font-bold text-slate-400">{tx.customerPhone}</p>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          {getTxTypeBadge(tx.type)}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          {getGatewayBadge(tx.gatewayId, tx.gatewayName)}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className={`font-black text-sm ${(tx.type === 'payment' || tx.type === 'adjustment_deduct') ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {(tx.type === 'payment' || tx.type === 'adjustment_deduct') ? '-' : '+'}৳{tx.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {tx.trxId && (
                            <span className="font-mono text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {tx.trxId}
                            </span>
                          )}
                          {tx.notes && (
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5 max-w-xs truncate">
                              {tx.notes}
                            </p>
                          )}
                          {tx.rejectedReason && (
                            <p className="text-[10px] text-rose-500 font-bold mt-0.5">
                              কারণ: {tx.rejectedReason}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          {tx.status === 'approved' || tx.status === 'completed' ? (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase">
                              অনুমোদিত
                            </span>
                          ) : tx.status === 'pending' ? (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200 uppercase">
                              অপেক্ষমাণ
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 uppercase">
                              বাতিল
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EDIT / ADD GATEWAY MODAL                                      */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {isGatewayModalOpen && editingGateway && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGatewayModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-8 md:p-10 z-10"
            >
              <div className="flex justify-between items-center border-b pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">
                    {DEFAULT_PAYMENT_GATEWAYS.some(d => d.id === editingGateway.id) ? 'পেমেন্ট গেটওয়ে কনফিগারেশন' : 'নতুন গেটওয়ে তৈরি'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {editingGateway.name || 'Custom Payment Method'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveGateway} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">গেটওয়ে নাম (বাংলা)</label>
                    <input
                      type="text"
                      required
                      className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-black bg-slate-50 outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="যেমন: বিকাশ (bKash)"
                      value={editingGateway.name}
                      onChange={e => setEditingGateway({ ...editingGateway, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">গেটওয়ে নাম (English)</label>
                    <input
                      type="text"
                      required
                      className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-black bg-slate-50 outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="e.g. bKash"
                      value={editingGateway.nameEn}
                      onChange={e => setEditingGateway({ ...editingGateway, nameEn: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">অ্যাকাউন্ট টাইপ</label>
                    <select
                      className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-black bg-slate-50 outline-none focus:bg-white"
                      value={editingGateway.accountType}
                      onChange={e => setEditingGateway({ ...editingGateway, accountType: e.target.value as any })}
                    >
                      <option value="merchant">মার্চেন্ট (Merchant)</option>
                      <option value="personal">ব্যক্তিগত (Personal)</option>
                      <option value="agent">এজেন্ট (Agent)</option>
                      <option value="bank">ব্যাংক একাউন্ট (Bank Account)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">অ্যাকাউন্ট / ফোন নম্বর</label>
                    <input
                      type="text"
                      className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-black bg-slate-50 outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="যেমন: 017XXXXXXXX"
                      value={editingGateway.number || ''}
                      onChange={e => setEditingGateway({ ...editingGateway, number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ট্রানজেকশন চার্জ (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-black bg-slate-50 outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="0"
                      value={editingGateway.chargePercentage ?? 0}
                      onChange={e => setEditingGateway({ ...editingGateway, chargePercentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ক্যাশব্যাক / ডিসকাউন্ট (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-black bg-slate-50 outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="0"
                      value={editingGateway.discountPercentage ?? 0}
                      onChange={e => setEditingGateway({ ...editingGateway, discountPercentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সর্বনিম্ন লেনদেন (৳)</label>
                    <input
                      type="number"
                      className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-black bg-slate-50 outline-none focus:bg-white focus:border-indigo-500"
                      value={editingGateway.minAmount ?? 10}
                      onChange={e => setEditingGateway({ ...editingGateway, minAmount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সর্বোচ্চ লেনদেন (৳)</label>
                    <input
                      type="number"
                      className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-black bg-slate-50 outline-none focus:bg-white focus:border-indigo-500"
                      value={editingGateway.maxAmount ?? 25000}
                      onChange={e => setEditingGateway({ ...editingGateway, maxAmount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Bank Details if Bank Transfer */}
                {editingGateway.accountType === 'bank' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">ব্যাংক সংক্রান্ত বিস্তারিত তথ্য</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 text-xs font-bold bg-white"
                        placeholder="ব্যাংকের নাম (Bank Name)"
                        value={editingGateway.bankDetails?.bankName || ''}
                        onChange={e => setEditingGateway({
                          ...editingGateway,
                          bankDetails: { ...(editingGateway.bankDetails || {}), bankName: e.target.value }
                        })}
                      />
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 text-xs font-bold bg-white"
                        placeholder="অ্যাকাউন্টের নাম (Account Name)"
                        value={editingGateway.bankDetails?.accountName || ''}
                        onChange={e => setEditingGateway({
                          ...editingGateway,
                          bankDetails: { ...(editingGateway.bankDetails || {}), accountName: e.target.value }
                        })}
                      />
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 text-xs font-bold bg-white"
                        placeholder="অ্যাকাউন্ট নম্বর (Account Number)"
                        value={editingGateway.bankDetails?.accountNumber || ''}
                        onChange={e => setEditingGateway({
                          ...editingGateway,
                          bankDetails: { ...(editingGateway.bankDetails || {}), accountNumber: e.target.value }
                        })}
                      />
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 text-xs font-bold bg-white"
                        placeholder="শাখা ও রাউটিং নম্বর"
                        value={editingGateway.bankDetails?.branchName || ''}
                        onChange={e => setEditingGateway({
                          ...editingGateway,
                          bankDetails: { ...(editingGateway.bankDetails || {}), branchName: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">পেমেন্ট নির্দেশনা (গ্রাহকের জন্য)</label>
                  <textarea
                    rows={3}
                    className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-bold bg-slate-50 outline-none focus:bg-white focus:border-indigo-500"
                    placeholder="পেমেন্ট করার ধাপগুলো বিস্তারিত লিখুন..."
                    value={editingGateway.instructions || ''}
                    onChange={e => setEditingGateway({ ...editingGateway, instructions: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-700">স্ট্যাটাস:</span>
                    <button
                      type="button"
                      onClick={() => setEditingGateway({ ...editingGateway, status: editingGateway.status === 'active' ? 'inactive' : 'active' })}
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${editingGateway.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                    >
                      {editingGateway.status === 'active' ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsGatewayModalOpen(false)}
                      className="px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-500 hover:bg-slate-100"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20"
                    >
                      সংরক্ষণ করুন
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* REJECT TRANSACTION MODAL                                      */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {rejectingTx && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectingTx(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md p-6 z-10 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 border-b pb-3">
                <XCircle size={24} />
                <h4 className="font-black text-base text-slate-900">রিচার্জ অনুরোধ বাতিলকরণ</h4>
              </div>

              <p className="text-xs text-slate-600 font-bold">
                কাস্টমার <strong>{rejectingTx.customerName}</strong>-এর ৳{rejectingTx.amount} রিচার্জ অনুরোধ বাতিলের কারণ লিখুন:
              </p>

              <textarea
                rows={3}
                required
                className="w-full border-2 border-slate-100 rounded-2xl p-3 text-xs font-bold bg-slate-50 outline-none focus:bg-white focus:border-rose-500"
                placeholder="যেমন: প্রদত্ত TrxID সঠিক নয় অথবা নির্ধারিত নম্বরে টাকা পৌঁছায়নি।"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingTx(null)}
                  className="px-4 py-2 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  ফিরে যান
                </button>
                <button
                  type="button"
                  onClick={handleRejectTransaction}
                  className="px-5 py-2.5 text-xs font-black uppercase bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-600/20"
                >
                  বাতিল নিশ্চিত করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
