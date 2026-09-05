import React, { useState, useMemo } from 'react';
import { 
  User, Package, Heart, Bell, Settings, LogOut, ChevronRight, ShoppingBag, 
  Clock, CheckCircle2, XCircle, Download, TrendingUp, Calendar, CreditCard, 
  ArrowLeft, Gift, Sparkles, RefreshCcw, Award, ShieldCheck, Zap, AlertTriangle,
  Wallet, ArrowUpRight, ArrowDownLeft, Copy, Check, QrCode, Smartphone, 
  Building2, PlusCircle, AlertCircle, Loader2
} from 'lucide-react';
import { 
  Customer, Sale, WishlistItem, AppNotification, Product, RankConfig, 
  ShopSettings, WalletTransaction, PaymentGateway, DEFAULT_PAYMENT_GATEWAYS 
} from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CustomerProfileProps {
  customer: Customer;
  orders: Sale[];
  wishlist: WishlistItem[];
  notifications: AppNotification[];
  products: Product[];
  rankConfigs: RankConfig[];
  shopSettings?: ShopSettings;
  walletTransactions?: WalletTransaction[];
  initialTab?: 'overview' | 'orders' | 'wallet' | 'wishlist' | 'notifications' | 'settings' | 'lucky';
  onLogout: () => void;
  onClose: () => void;
  onViewOrder: (order: Sale) => void;
  onConfirmOrder: (order: Sale) => void;
  onRemoveFromWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onTopupRequest?: (tx: Omit<WalletTransaction, 'id' | 'createdAt'>) => Promise<void>;
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({
  customer,
  orders,
  wishlist,
  notifications,
  products,
  rankConfigs,
  shopSettings,
  walletTransactions = [],
  initialTab = 'overview',
  onLogout,
  onClose,
  onViewOrder,
  onConfirmOrder,
  onRemoveFromWishlist,
  onAddToCart,
  onUpdateCustomer,
  onTopupRequest
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wallet' | 'wishlist' | 'notifications' | 'settings' | 'lucky'>(initialTab);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reward, setReward] = useState<{ type: string; value: string; code: string } | null>(null);

  // Top-up Modal & Wallet State
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number | ''>(500);
  const [topupSenderPhone, setTopupSenderPhone] = useState(customer.phone || '');
  const [topupTrxId, setTopupTrxId] = useState('');
  const [topupNote, setTopupNote] = useState('');
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Available manual gateways for wallet recharge
  const rechargeGateways: PaymentGateway[] = useMemo(() => {
    const all = (shopSettings?.paymentGateways && shopSettings.paymentGateways.length > 0) 
      ? shopSettings.paymentGateways 
      : DEFAULT_PAYMENT_GATEWAYS;
    return all.filter(g => g.status === 'active' && g.id !== 'cash_on_delivery' && g.id !== 'rest_pay');
  }, [shopSettings?.paymentGateways]);

  const [selectedRechargeGatewayId, setSelectedRechargeGatewayId] = useState<string>(() => {
    return rechargeGateways[0]?.id || 'bkash';
  });

  const selectedRechargeGateway = useMemo(() => {
    return rechargeGateways.find(g => g.id === selectedRechargeGatewayId) || rechargeGateways[0];
  }, [rechargeGateways, selectedRechargeGatewayId]);

  const customerTransactions = useMemo(() => {
    return walletTransactions
      .filter(tx => tx.customerId === customer.id)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [walletTransactions, customer.id]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(topupAmount);
    if (!amountNum || amountNum <= 0) {
      alert('সঠিক রিচার্জের পরিমাণ লিখুন।');
      return;
    }
    if (!topupSenderPhone) {
      alert('যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন।');
      return;
    }
    if (!topupTrxId) {
      alert('ট্রানজেকশন আইডি (TrxID) লিখুন।');
      return;
    }

    setIsSubmittingTopup(true);
    try {
      if (onTopupRequest) {
        await onTopupRequest({
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          type: 'topup',
          amount: amountNum,
          status: 'pending',
          gatewayId: selectedRechargeGateway?.id || 'manual',
          gatewayName: selectedRechargeGateway?.name || 'Mobile Banking',
          senderNumber: topupSenderPhone,
          trxId: topupTrxId.toUpperCase().trim(),
          note: topupNote,
          balanceBefore: customer.walletBalance || 0,
          balanceAfter: (customer.walletBalance || 0) + amountNum
        });
      }
      alert('আপনার রিচার্জ অনুরোধ জমা হয়েছে! এডমিন যাচাই করে দ্রুত ব্যালেন্স যুক্ত করে দেবেন।');
      setShowTopupModal(false);
      setTopupTrxId('');
      setTopupNote('');
    } catch (err) {
      console.error('Topup error:', err);
      alert('রিচার্জ অনুরোধ পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  const [editName, setEditName] = useState(customer.name);
  const [editNameColor, setEditNameColor] = useState(customer.nameColor || '');
  const [editEmail, setEditEmail] = useState(customer.email || '');
  const [editAddress, setEditAddress] = useState(customer.address || '');
  const [editPhone, setEditPhone] = useState(customer.phone);

  React.useEffect(() => {
    setEditName(customer.name);
    setEditNameColor(customer.nameColor || '');
    setEditEmail(customer.email || '');
    setEditAddress(customer.address || '');
    setEditPhone(customer.phone);
  }, [customer]);

  // Check if can spin (once every 24h)
  const canSpin = !customer.lastSpinDate || 
    (new Date().getTime() - new Date(customer.lastSpinDate).getTime()) > 24 * 60 * 60 * 1000;

  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
  const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'paid').length;

  // Calculate stats for targets
  const profileStats = (() => {
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7);
    const currentYear = today.toISOString().substring(0, 4);
    
    return {
      monthly: orders.filter(s => s.date.startsWith(currentMonth)).reduce((sum, s) => sum + s.total, 0),
      yearly: orders.filter(s => s.date.startsWith(currentYear)).reduce((sum, s) => sum + s.total, 0),
      lifetime: totalSpent
    };
  })();

  const targetProgress = (() => {
    const t = customer.targets || { monthly: 10000, yearly: 100000, lifetime: 500000 };
    return {
      m: Math.min(100, Math.round((profileStats.monthly / (t.monthly || 1)) * 100)),
      y: Math.min(100, Math.round((profileStats.yearly / (t.yearly || 1)) * 100)),
      l: Math.min(100, Math.round((profileStats.lifetime / (t.lifetime || 1)) * 100))
    };
  })();

  // Calculate Rank
  const currentRank = [...rankConfigs]
    .sort((a, b) => b.minAmount - a.minAmount)
    .find(r => totalSpent >= r.minAmount) || rankConfigs[0];

  const nextRank = rankConfigs.find(r => r.level === (currentRank?.level || 0) + 1);
  const progressToNext = nextRank ? Math.min(100, (totalSpent / nextRank.minAmount) * 100) : 100;

  // Prepare chart data (last 6 months)
  const chartData = [
    { name: 'Jan', amount: 4000 },
    { name: 'Feb', amount: 3000 },
    { name: 'Mar', amount: 2000 },
    { name: 'Apr', amount: 2780 },
    { name: 'May', amount: 1890 },
    { name: 'Jun', amount: 2390 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'approved': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'undelivered': return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'partial': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'pending': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'cancelled': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 size={14} />;
      case 'approved': return <CheckCircle2 size={14} />;
      case 'undelivered': return <XCircle size={14} />;
      case 'partial': return <AlertTriangle size={14} />;
      case 'pending': return <Clock size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <Package size={14} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-300">
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-auto md:h-full">
        <div className="p-5 sm:p-8 border-b border-slate-100 flex items-center justify-between md:block">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 text-primary rounded-2xl sm:rounded-3xl flex items-center justify-center text-xl sm:text-2xl font-black shadow-xl shadow-primary/5">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h2 
                className="font-black text-base sm:text-xl tracking-tight leading-tight uppercase flex items-center gap-1.5"
                style={{ color: customer.nameColor || '#1e293b' }}
              >
                <span>{customer.name}</span>
                {customer.nameColor && (
                  <span 
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 border border-white shadow-xs" 
                    style={{ backgroundColor: customer.nameColor }}
                  />
                )}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">{customer.phone}</p>
                {(customer.verifiedPhone || customer.verifiedEmail) && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black tracking-wide border border-emerald-200">
                    <ShieldCheck size={10} /> OTP ভেরিফাইড
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors md:hidden">
            <ArrowLeft size={20} />
          </button>
        </div>

        <div className="p-2 sm:p-6 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto custom-scrollbar bg-white md:bg-transparent">
          {[
            { id: 'overview', name: 'ওভারভিউ', icon: TrendingUp },
            { id: 'orders', name: 'অর্ডার হিস্ট্রি', icon: ShoppingBag, count: orders.length },
            { id: 'wallet', name: 'রেস্ট পে ওয়ালেট', icon: Wallet, badge: `৳${(customer.walletBalance || 0).toLocaleString()}` },
            { id: 'lucky', name: 'লাকি রিওয়ার্ড', icon: Gift },
            { id: 'wishlist', name: 'উইশলিস্ট', icon: Heart, count: wishlist.length },
            { id: 'notifications', name: 'নোটিফিকেশন', icon: Bell, count: notifications.filter(n => n.status === 'unread').length },
            { id: 'settings', name: 'সেটিংস', icon: Settings }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all whitespace-nowrap md:whitespace-normal ${activeTab === item.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
              <div className="flex items-center gap-2 sm:gap-4">
                <item.icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                {item.name}
              </div>
              {item.badge ? (
                <span className={`ml-2 px-2 py-0.5 rounded-lg text-[9px] font-black ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                  {item.badge}
                </span>
              ) : item.count !== undefined && item.count > 0 ? (
                <span className={`ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[8px] sm:text-[10px] ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {item.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-100 flex md:block gap-2">
          <button 
            onClick={onLogout}
            className="flex-1 md:w-full flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-rose-100 transition-all"
          >
            <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden xs:inline">লগআউট</span>
          </button>
          <button 
            onClick={onClose}
            className="flex-1 md:w-full md:mt-4 flex items-center justify-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white p-6 sm:p-8 rounded-[24px] sm:rounded-[40px] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                      <Calendar size={18} />
                    </div>
                    <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">{targetProgress.m}%</span>
                  </div>
                  <div>
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">মাসিক খরচ</p>
                    <h3 className="text-xl font-black text-slate-800">৳{(profileStats.monthly ?? 0).toLocaleString()}</h3>
                  </div>
                  <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${targetProgress.m}%` }}></div>
                  </div>
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-[24px] sm:rounded-[40px] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                      <TrendingUp size={18} />
                    </div>
                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg">{targetProgress.y}%</span>
                  </div>
                  <div>
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">বার্ষিক খরচ</p>
                    <h3 className="text-xl font-black text-slate-800">৳{(profileStats.yearly ?? 0).toLocaleString()}</h3>
                  </div>
                  <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${targetProgress.y}%` }}></div>
                  </div>
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-[24px] sm:rounded-[40px] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                      <Zap size={18} />
                    </div>
                    <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg">{targetProgress.l}%</span>
                  </div>
                  <div>
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">মোট খরচ</p>
                    <h3 className="text-xl font-black text-slate-800">৳{(profileStats.lifetime ?? 0).toLocaleString()}</h3>
                  </div>
                  <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${targetProgress.l}%` }}></div>
                  </div>
                </div>
              </div>

              {nextRank && (
                <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-black text-slate-800 text-xl tracking-tight">পরবর্তী র‍্যাঙ্ক: {nextRank.name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">৳{(Math.max(0, nextRank.minAmount - totalSpent) ?? 0).toLocaleString()} খরচ করলে আপনি {nextRank.name} মেম্বার হবেন।</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-primary">{Math.round(progressToNext)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToNext}%` }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              )}

              {/* My Rewards Section */}
              <div className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="flex items-center gap-4 mb-8 relative z-10">
                  <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
                    <Gift size={24} />
                  </div>
                  <div className="pr-0 pb-0 mr-0 mb-6">
                    <h3 className="font-black text-slate-800 text-lg sm:text-xl tracking-tight">আমার পুরস্কারসমূহ</h3>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">অর্জিত রিওয়ার্ড ও কুপন</p>
                  </div>
                </div>
                
                <div className="space-y-4 relative z-10">
                  {(!customer.rewards || customer.rewards.length === 0) ? (
                    <div className="py-10 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">এখনো কোনো পুরস্কার অর্জন করেননি</p>
                    </div>
                  ) : (
                    customer.rewards.slice(0, 8).map((reward, idx) => {
                      const getRewardStyle = (type: string) => {
                        switch (type) {
                          case 'monthly': return { icon: <Calendar size={18} />, color: 'bg-blue-50 text-blue-500', label: 'মাসিক রিওয়ার্ড' };
                          case 'yearly': return { icon: <Award size={18} />, color: 'bg-indigo-50 text-indigo-500', label: 'বার্ষিক রিওয়ার্ড' };
                          case 'lifetime': return { icon: <ShieldCheck size={18} />, color: 'bg-amber-50 text-amber-500', label: 'লাইফটাইম রিওয়ার্ড' };
                          case 'lucky': return { icon: <Sparkles size={18} />, color: 'bg-purple-50 text-purple-500', label: 'লাকি স্পিন' };
                          case 'milestone': return { icon: <TrendingUp size={18} />, color: 'bg-emerald-50 text-emerald-500', label: 'মাইলস্টোন' };
                          default: return { icon: <Gift size={18} />, color: 'bg-slate-50 text-slate-500', label: 'রিওয়ার্ড' };
                        }
                      };
                      const style = getRewardStyle(reward.type);

                      return (
                        <div key={reward.id || idx} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-primary/20 transition-all flex items-center justify-between group/item">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.color}`}>
                              {style.icon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-black text-slate-800 leading-tight">{reward.description}</p>
                                <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md ${style.color} border border-current/10`}>{style.label}</span>
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(reward.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const codeMatch = reward.description.match(/Code: (\w+)/);
                              if (codeMatch) {
                                navigator.clipboard.writeText(codeMatch[1]);
                                alert('কুপন কোডটি কপি করা হয়েছে!');
                              } else {
                                alert(reward.description);
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-primary hover:text-white transition-all"
                          >
                            বিস্তারিত
                          </button>
                        </div>
                      );
                    })
                  )}
                  {customer.rewards && customer.rewards.length > 5 && (
                    <button className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-all border-t border-slate-50 mt-4">সবগুলো দেখুন</button>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6 sm:mb-10">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg sm:text-xl tracking-tight">মাসিক খরচের গ্রাফ</h3>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">বিগত ৬ মাসের রিপোর্ট</p>
                  </div>
                  <button className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 text-slate-400 hover:text-primary transition-colors">
                    <Download size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
                <div className="h-60 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F27D26" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#F27D26" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 900}}
                        cursor={{stroke: '#F27D26', strokeWidth: 2}}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#F27D26" strokeWidth={4} fillOpacity={1} fill="url(#colorAmount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                  <h3 className="font-black text-slate-800 text-lg sm:text-xl tracking-tight">সাম্প্রতিক অর্ডার</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-widest hover:underline">সবগুলো দেখুন</button>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {orders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-50 bg-slate-50/50 hover:bg-slate-50 transition-all group">
                      <div className="flex items-center gap-3 sm:gap-6">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                          <ShoppingBag size={18} className="sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-xs sm:text-sm">#RB-{order.invoiceNo || order.id.slice(0, 6)}</h4>
                          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1">{new Date(order.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-10">
                        <div className="text-right hidden sm:block">
                          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">পরিমাণ</p>
                          <p className="font-black text-slate-800 text-sm">৳{(order.total ?? 0).toLocaleString()}</p>
                        </div>
                        <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 border ${getStatusColor(order.status)}`}>
                          <span className="hidden sm:inline">{getStatusIcon(order.status)}</span>
                          {order.status}
                        </div>
                        <button onClick={() => onViewOrder(order)} className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white text-slate-400 hover:text-primary shadow-sm transition-all group-hover:scale-110">
                          <ChevronRight size={16} className="sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">অর্ডার হিস্ট্রি</h2>
                <div className="flex gap-2">
                  <button className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all">ফিল্টার</button>
                  <button className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all">ডাউনলোড</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {orders.length === 0 ? (
                  <div className="bg-white p-20 rounded-[40px] text-center border border-slate-100">
                    <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShoppingBag size={40} />
                    </div>
                    <h3 className="font-black text-slate-800 text-xl mb-2">কোনো অর্ডার পাওয়া যায়নি</h3>
                    <p className="text-slate-400 text-sm font-bold">আপনি এখনো কোনো কেনাকাটা করেননি।</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                      <div className="flex flex-col md:flex-row justify-between gap-6 sm:gap-8">
                        <div className="flex gap-4 sm:gap-6">
                          <div className="w-14 h-14 sm:w-20 sm:h-20 bg-slate-50 rounded-2xl sm:rounded-3xl flex items-center justify-center text-slate-300 flex-shrink-0">
                            <Package size={24} className="sm:w-8 sm:h-8" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="font-black text-slate-800 text-sm sm:text-lg">#RB-{order.invoiceNo || order.id.slice(0, 8)}</h4>
                              <div className={`px-2 sm:px-3 py-1 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 border ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                                {order.status}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span className="flex items-center gap-2"><Calendar size={12} /> {new Date(order.date).toLocaleDateString()}</span>
                              <span className="flex items-center gap-2"><ShoppingBag size={12} /> {order.items.length}টি পণ্য</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-6 sm:gap-10 border-t sm:border-t-0 pt-6 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">মোট মূল্য</p>
                            <p className="font-black text-primary text-xl sm:text-2xl tracking-tighter">৳{(order.total ?? 0).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={() => onViewOrder(order)} className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 text-slate-600 font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">বিস্তারিত</button>
                            {order.status === 'pending' && (
                              <button 
                                onClick={() => onConfirmOrder(order)}
                                className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-emerald-500 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                              >
                                কনফার্ম
                              </button>
                            )}
                            <button className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-all"><Download size={18} className="sm:w-5 sm:h-5" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ------------------- REST PAY WALLET TAB ------------------- */}
          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <Wallet className="text-indigo-600" size={32} /> রেস্ট পে ওয়ালেট (Rest Pay)
                  </h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs mt-1">
                    ১-ক্লিক দ্রুত ও ক্যাশব্যাক সমৃদ্ধ সুরক্ষিত স্মার্ট ওয়ালেট
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTopupModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-102 active:scale-98"
                >
                  <PlusCircle size={18} /> টাকা রিচার্জ করুন
                </button>
              </div>

              {/* Hero Wallet Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[36px] p-8 sm:p-10 text-white shadow-2xl border border-indigo-500/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/15 text-[10px] font-black uppercase tracking-widest text-amber-400">
                      <Sparkles size={13} /> Rest Pay Digital Account
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">বর্তমান ওয়ালেট ব্যালেন্স</p>
                      <h3 className="text-4xl sm:text-5xl font-black tracking-tight mt-1 text-white font-mono flex items-baseline gap-1">
                        <span className="text-amber-400 font-sans text-3xl sm:text-4xl">৳</span>
                        {(customer.walletBalance || 0).toLocaleString()}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-300">
                      <span className="font-mono">{customer.phone}</span>
                      <span>•</span>
                      <span className="capitalize font-bold text-emerald-400">অ্যাকাউন্ট স্ট্যাটাস: সচল (Active)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                    <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[140px]">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <ArrowDownLeft size={14} className="text-emerald-400" /> মোট রিচার্জ
                      </div>
                      <p className="text-lg font-black text-emerald-400 font-mono">
                        ৳{(customer.totalWalletTopup || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[140px]">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <ArrowUpRight size={14} className="text-rose-400" /> মোট খরচ
                      </div>
                      <p className="text-lg font-black text-rose-400 font-mono">
                        ৳{(customer.totalWalletSpent || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3.5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">১-ক্লিক সুপারফাস্ট চেকআউট</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">ওটিপি বা অতিরিক্ত পেমেন্ট গেটওয়ে লোডিং ছাড়াই তাৎক্ষণিক অর্ডার সম্পন্ন।</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3.5">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">{shopSettings?.walletSettings?.cashbackPercentage || 2}% নিশ্চিত ক্যাশব্যাক</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">প্রতিবার রেস্ট পে ওয়ালেট দিয়ে অর্ডারে স্বয়ংক্রিয় ক্যাশব্যাক জমা হবে।</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3.5">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">১০০% নিরাপদ ও সুরক্ষিত</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">সম্পূর্ণ এনক্রিপ্টেড লেজার এবং রিয়েল-টাইম ব্যালেন্স ট্র্যাকিং।</p>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h3 className="font-black text-slate-800 text-lg">লেনদেন ইতিহাস (Transactions)</h3>
                  <span className="text-xs font-bold text-slate-400">{customerTransactions.length}টি লেনদেন</span>
                </div>

                {customerTransactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Wallet size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-bold">এখনো কোনো ওয়ালেট লেনদেন হয়নি</p>
                    <p className="text-xs text-slate-400 mt-1">টাকা রিচার্জ করুন অথবা ওয়ালেট দিয়ে কেনাকাটা শুরু করুন।</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerTransactions.map((tx) => {
                      const isCredit = tx.type === 'topup' || tx.type === 'cashback' || tx.type === 'bonus' || (tx.type === 'adjustment' && tx.amount > 0);
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl transition-all border border-slate-100">
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-xs sm:text-sm text-slate-800">
                                  {tx.type === 'topup' ? 'টাকা রিচার্জ (Top-up)' :
                                   tx.type === 'purchase' ? 'অর্ডার পেমেন্ট (Purchase)' :
                                   tx.type === 'cashback' ? 'ক্যাশব্যাক রিওয়ার্ড' :
                                   tx.type === 'bonus' ? 'বোনাস ক্রেডিট' :
                                   tx.type === 'refund' ? 'অর্ডার রিফান্ড' : 'ব্যালেন্স অ্যাডজাস্টমেন্ট'}
                                </h4>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  tx.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                  tx.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {tx.status === 'approved' ? 'সফল' : tx.status === 'pending' ? 'অপেক্ষমাণ' : 'বাতিল'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                {new Date(tx.createdAt).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                                {tx.gatewayName ? ` • ${tx.gatewayName}` : ''}
                                {tx.trxId ? ` • TrxID: ${tx.trxId}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={`font-mono font-black text-sm sm:text-base ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                              {isCredit ? '+' : '-'}৳{tx.amount.toLocaleString()}
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                              ব্যালেন্স: ৳{(tx.balanceAfter ?? 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'lucky' && (
            <motion.div
              key="lucky"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-10"
            >
              {shopSettings?.luckyRewards?.enabled ? (
                <>
                  <div className="text-center space-y-2 sm:space-y-4">
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-tight uppercase">আপনার ভাগ্য পরীক্ষা করুন!</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs px-4">প্রতিদিন একবার চাপ দিয়ে জিতুন আকর্ষণীয় রিওয়ার্ড</p>
                  </div>

                  <div className="bg-white p-6 sm:p-12 rounded-[32px] sm:rounded-[50px] border border-slate-100 shadow-2xl relative overflow-hidden flex flex-col items-center">
                    {/* Decorative background */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
                      <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary rounded-full blur-3xl" />
                      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary rounded-full blur-3xl" />
                    </div>

                    <div className="relative z-10 w-full flex flex-col items-center">
                      <div className="relative mb-8 sm:mb-12">
                        <motion.div
                          animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
                          transition={isSpinning ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
                          className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full border-8 border-slate-50 flex items-center justify-center bg-gradient-to-br from-primary to-orange-400 text-white shadow-2xl ${isSpinning ? 'brightness-110' : ''}`}
                        >
                          {reward ? <Sparkles size={48} className="sm:w-16 sm:h-16" /> : <Gift size={48} className="sm:w-16 sm:h-16" />}
                        </motion.div>
                        
                        {/* Floating icons when spinning */}
                        <AnimatePresence>
                          {isSpinning && [1, 2, 3, 4, 5].map((i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                              animate={{ 
                                opacity: [0, 1, 0], 
                                scale: [0, 1.5, 0],
                                x: (Math.random() - 0.5) * 300,
                                y: (Math.random() - 0.5) * 300
                              }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              className="absolute top-1/2 left-1/2 text-primary"
                            >
                              <Sparkles size={16} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence mode="wait">
                        {!reward ? (
                          <motion.div
                            key="spin-button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center"
                          >
                            <button
                              disabled={isSpinning || !canSpin}
                              onClick={() => {
                                if (!canSpin) {
                                  alert('আপনি আজ ইতিমধ্যে একবার স্পিন করেছেন। আগামীকাল আবার চেষ্টা করুন।');
                                  return;
                                }
                                setIsSpinning(true);
                                setTimeout(() => {
                                  const rewards = shopSettings?.luckyRewards?.rewards || [];
                                  if (rewards.length === 0) {
                                    alert('দুঃখিত, কোনো রিওয়ার্ড পাওয়া যায়নি।');
                                    setIsSpinning(false);
                                    return;
                                  }
                                  
                                  // Weighted Selection
                                  const totalChance = rewards.reduce((sum, r) => sum + r.chance, 0) || 1;
                                  let random = Math.random() * totalChance;
                                  let selected = rewards[0];
                                  
                                  for (const r of rewards) {
                                    if (random < r.chance) {
                                      selected = r;
                                      break;
                                    }
                                    random -= r.chance;
                                  }

                                  const wonReward = { type: 'Lucky', value: selected.value, code: selected.code };
                                  setReward(wonReward);
                                  setIsSpinning(false);

                                  // Update Customer Data
                                  const newNotification: AppNotification = {
                                    id: `NOTIF-${Date.now()}`,
                                    userId: customer.id,
                                    title: 'অভিনন্দন! আপনি লাকি রিওয়ার্ড জিতেছেন',
                                    message: `আপনি ${selected.value} জিতেছেন। আপনার প্রোমো কোড: ${selected.code}`,
                                    type: 'offer',
                                    status: 'unread',
                                    date: new Date().toISOString()
                                  };

                                  const newRewardEntry = {
                                    id: `REW-${Date.now()}`,
                                    date: new Date().toISOString(),
                                    type: 'lucky' as const,
                                    description: `লাকি স্পিন: ${selected.value} (Code: ${selected.code})`
                                  };

                                  onUpdateCustomer({
                                    ...customer,
                                    lastSpinDate: new Date().toISOString(),
                                    notifications: [newNotification, ...(customer.notifications || [])],
                                    rewards: [newRewardEntry, ...(customer.rewards || [])]
                                  });
                                }, 3000);
                              }}
                              className="group relative px-12 py-6 bg-primary text-white rounded-[32px] font-black text-xl uppercase tracking-[4px] shadow-2xl shadow-primary/40 hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50 disabled:scale-100"
                            >
                              {isSpinning ? 'ভাগ্য পরীক্ষা চলছে...' : !canSpin ? 'আবার কাল আসুন' : 'পুরস্কার জিতুন'}
                              <div className="absolute inset-0 bg-white/20 rounded-[32px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                            </button>
                            <p className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                              * আপনি প্রতিদিন একবার এই সুযোগটি পাবেন <br/>
                              জয়ী হলে রিওয়ার্ড কোডটি আপনার অর্ডারে ব্যবহার করতে পারবেন
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="reward-display"
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="w-full text-center space-y-8"
                          >
                            <div className="space-y-4 sm:space-y-8">
                              <div className="space-y-2">
                                <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">অভিনন্দন! আপনি জিতেছেন</h3>
                                <div className="text-3xl sm:text-5xl font-black text-primary tracking-tighter uppercase">{reward.value}</div>
                              </div>

                              <div className="max-w-md mx-auto p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-slate-50 border-2 border-dashed border-primary/30 relative group">
                                <div className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">প্রোমো কোড</div>
                                <div className="text-lg sm:text-2xl font-black text-slate-800 font-mono tracking-[4px] sm:tracking-[8px] uppercase">{reward.code}</div>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(reward.code);
                                    alert('কোড কপি করা হয়েছে!');
                                  }}
                                  className="mt-4 sm:mt-6 text-[8px] sm:text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center justify-center gap-2 mx-auto"
                                >
                                  <RefreshCcw size={12} /> কপি করে ব্যবহার করুন
                                </button>
                              </div>

                              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
                                <button 
                                   onClick={() => setReward(null)} 
                                   className="w-full sm:w-auto px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                   আবার ফিরে আসুন
                                </button>
                                <button 
                                   onClick={() => { setActiveTab('orders'); onClose(); }}
                                   className="w-full sm:w-auto px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.05] transition-all"
                                >
                                   অর্ডার করুন
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white p-12 sm:p-20 rounded-[40px] text-center border border-slate-100">
                  <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Gift size={40} />
                  </div>
                  <h3 className="font-black text-slate-800 text-xl mb-2">লাকি রিওয়ার্ড বর্তমানে বন্ধ আছে</h3>
                  <p className="text-slate-400 text-sm font-bold">নতুন রিওয়ার্ড ক্যাম্পেইন শুরু হলে এখানে দেখতে পাবেন।</p>
                </div>
              )}

              {/* Target Based Rewards */}
              {shopSettings?.targetRewards?.enabled && (shopSettings.targetRewards.milestones || []).length > 0 && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase">টার্গেট রিওয়ার্ড</h3>
                    <div className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] sm:text-xs font-black uppercase tracking-widest">
                      {(shopSettings.targetRewards.milestones || []).length}টি মাইলস্টোন আছে
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    {(shopSettings.targetRewards.milestones || []).map((milestone, idx) => {
                      const currentVal = milestone.type === 'spent' ? totalSpent : completedOrders;
                      const progress = Math.min(100, (currentVal / milestone.target) * 100);
                      const isCompleted = progress >= 100;

                      return (
                        <div key={milestone.id} className="bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm relative group hover:shadow-xl transition-all">
                          {isCompleted && (
                            <div className="absolute top-4 right-4 text-emerald-500 animate-bounce">
                              <CheckCircle2 size={24} />
                            </div>
                          )}
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 ${idx % 3 === 0 ? 'bg-blue-50 text-blue-500' : idx % 3 === 1 ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'} rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6`}>
                            {milestone.type === 'spent' ? <ShoppingBag size={20} className="sm:w-6 sm:h-6" /> : <CheckCircle2 size={20} className="sm:w-6 sm:h-6" />}
                          </div>
                          <h4 className="font-black text-slate-800 text-base sm:text-lg mb-1">{milestone.title}</h4>
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-4 sm:mb-6">{milestone.desc}</p>
                          
                          <div className="space-y-2 mb-4 sm:mb-6">
                            <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-none">
                              <span className="text-slate-400">প্রগতি ({currentVal}/{milestone.target})</span>
                              <span className="text-primary">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 sm:h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-primary'} rounded-full`}
                              />
                            </div>
                          </div>

                          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">পুরস্কার</p>
                            <p className="font-black text-slate-800 text-[10px] sm:text-xs leading-tight">{milestone.reward}</p>
                          </div>

                          {isCompleted && (
                            <button 
                              onClick={() => {
                                // Check if already claimed
                                const isAlreadyClaimed = (customer.rewards || []).some(r => r.description.includes(milestone.title));
                                if (isAlreadyClaimed) {
                                  alert('এই রিওয়ার্ডটি আপনি ইতিমধ্যে সংগ্রহ করেছেন।');
                                  return;
                                }

                                const newNotification: AppNotification = {
                                  id: `NOTIF-${Date.now()}`,
                                  userId: customer.id,
                                  title: `মাইলস্টোন অর্জিত: ${milestone.title}`,
                                  message: `অভিনন্দন! আপনি "${milestone.title}" মাইলস্টোন পূর্ণ করেছেন। আপনার পুরস্কার: ${milestone.reward}`,
                                  type: 'offer',
                                  status: 'unread',
                                  date: new Date().toISOString()
                                };

                                const newRewardEntry = {
                                  id: `REW-${Date.now()}`,
                                  date: new Date().toISOString(),
                                  type: 'milestone' as const,
                                  description: `মাইলস্টোন (${milestone.title}): ${milestone.reward}`
                                };

                                onUpdateCustomer({
                                  ...customer,
                                  notifications: [newNotification, ...(customer.notifications || [])],
                                  rewards: [newRewardEntry, ...(customer.rewards || [])]
                                });

                                alert('রিওয়ার্ডটি সফলভাবে সংগ্রহ করা হয়েছে! চেক করুন আপনার প্রোফাইল।');
                              }}
                              className="w-full mt-4 sm:mt-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-emerald-500 text-white font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                            >
                              {(customer.rewards || []).some(r => r.description.includes(milestone.title)) ? 'সংগৃহীত' : 'রিওয়ার্ড সংগ্রহ করুন'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Winners (Static simulation for "social proof") */}
              <div className="space-y-6">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <Sparkles size={14} className="text-primary" /> সাম্প্রতিক বিজয়ীরা
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {[
                     { name: 'S****r', win: '১০% ডিসকাউন্ট', time: '২ মিনিট আগে' },
                     { name: 'R****d', win: 'ফ্রি ডেলিভারি', time: '৫ মিনিট আগে' },
                     { name: 'M****n', win: '৫০ লাকি পয়েন্ট', time: '১০ মিনিট আগে' }
                   ].map((winner, idx) => (
                     <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between">
                       <div>
                         <p className="text-[10px] font-black text-slate-800">{winner.name}</p>
                         <p className="text-[8px] font-bold text-slate-400 uppercase">{winner.time}</p>
                       </div>
                       <span className="text-[10px] font-black text-emerald-500 uppercase">{winner.win}</span>
                     </div>
                   ))}
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'wishlist' && (
            <motion.div
              key="wishlist"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">আমার উইশলিস্ট</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.length === 0 ? (
                  <div className="col-span-full bg-white p-20 rounded-[40px] text-center border border-slate-100">
                    <div className="w-20 h-20 bg-rose-50 text-rose-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Heart size={40} />
                    </div>
                    <h3 className="font-black text-slate-800 text-xl mb-2">উইশলিস্ট খালি</h3>
                    <p className="text-slate-400 text-sm font-bold">আপনার পছন্দের পণ্যগুলো এখানে সেভ করে রাখুন।</p>
                  </div>
                ) : (
                  wishlist.map((item) => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product) return null;
                    return (
                      <div key={item.id} className="bg-white rounded-[32px] sm:rounded-[40px] border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all">
                        <div className="relative aspect-square bg-slate-50">
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <button 
                            onClick={() => onRemoveFromWishlist(product.id)}
                            className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-md text-rose-500 shadow-xl"
                          >
                            <Heart size={16} fill="currentColor" className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                        </div>
                        <div className="p-6 sm:p-8">
                          <h4 className="font-black text-slate-800 text-base sm:text-lg mb-1 sm:mb-2 line-clamp-1">{product.name}</h4>
                          <p className="font-black text-primary text-lg sm:text-xl tracking-tighter mb-4 sm:mb-6">৳{(product.salePrice ?? 0).toLocaleString()}</p>
                          <button 
                            onClick={() => onAddToCart(product)}
                            className="w-full bg-primary text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            কার্টে যোগ করুন
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">নোটিফিকেশন</h2>
                <button className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-widest hover:underline whitespace-nowrap">সবগুলো পড়া হয়েছে মার্ক করুন</button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {notifications.length === 0 ? (
                  <div className="bg-white p-12 sm:p-20 rounded-[32px] sm:rounded-[40px] text-center border border-slate-100">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <Bell size={32} className="sm:w-10 sm:h-10" />
                    </div>
                    <h3 className="font-black text-slate-800 text-lg sm:text-xl mb-1 sm:mb-2">কোনো নোটিফিকেশন নেই</h3>
                    <p className="text-slate-400 text-xs sm:text-sm font-bold px-4">সব আপডেট এখানে দেখতে পাবেন।</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className={`p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border transition-all flex flex-col sm:flex-row gap-4 sm:gap-6 ${notif.status === 'unread' ? 'bg-white border-primary/20 shadow-xl shadow-primary/5' : 'bg-slate-50/50 border-slate-100'}`}>
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 ${notif.type === 'order' ? 'bg-emerald-50 text-emerald-500' : notif.type === 'offer' ? 'bg-amber-50 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                        {notif.type === 'order' ? <Package size={20} className="sm:w-6 sm:h-6" /> : notif.type === 'offer' ? <TrendingUp size={20} className="sm:w-6 sm:h-6" /> : <Bell size={20} className="sm:w-6 sm:h-6" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1 sm:mb-2 gap-4">
                          <h4 className="font-black text-slate-800 text-base sm:text-lg leading-tight">{notif.title}</h4>
                          <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{new Date(notif.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-500 font-bold text-xs sm:text-sm leading-relaxed">{notif.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl space-y-8 animate-in fade-in duration-300"
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">প্রোফাইল সেটিংস</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs mt-2">আপনার প্রোফাইল তথ্য এবং ঠিকানা পরিবর্তন করুন</p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  onUpdateCustomer({
                    ...customer,
                    name: editName,
                    nameColor: editNameColor || undefined,
                    email: editEmail,
                    address: editAddress,
                    phone: editPhone
                  });
                  alert('প্রোফাইল সফলভাবে আপডেট করা হয়েছে!');
                }}
                className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">পূর্ণ নাম</label>
                    <input 
                      required 
                      type="text"
                      className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-xs sm:text-sm bg-white outline-none focus:ring-4 focus:ring-primary/5 transition-all" 
                      style={{ color: editNameColor || undefined }}
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      placeholder="আপনার নাম লিখুন" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">মোবাইল নম্বর</label>
                    <input 
                      required 
                      type="text"
                      disabled
                      className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-xs sm:text-sm bg-slate-100 text-slate-400 cursor-not-allowed outline-none" 
                      value={editPhone} 
                      placeholder="01XXX-XXXXXX" 
                    />
                  </div>
                </div>

                {/* Name Color Control */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">
                      নামের টেক্সট কালার
                    </span>
                    <span 
                      className="text-xs font-black uppercase px-2.5 py-1 rounded-xl bg-slate-900 shadow-xs"
                      style={{ color: editNameColor || '#ffffff' }}
                    >
                      {editName || 'নাম প্রিভিউ'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditNameColor('')}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all ${
                        !editNameColor ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ডিফল্ট কালার
                    </button>
                    {[
                      { name: 'গোল্ডেন ইয়েলো', hex: '#facc15' },
                      { name: 'এমারেল্ড গ্রিন', hex: '#10b981' },
                      { name: 'স্কাই ব্লু', hex: '#0284c7' },
                      { name: 'রোজ পিঙ্ক', hex: '#f43f5e' },
                      { name: 'পার্পল', hex: '#a855f7' },
                      { name: 'অরেঞ্জ', hex: '#f97316' },
                      { name: 'সায়ান', hex: '#06b6d4' },
                      { name: 'হোয়াইট', hex: '#ffffff' }
                    ].map(preset => {
                      const isSel = (editNameColor || '').toLowerCase() === preset.hex.toLowerCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setEditNameColor(preset.hex)}
                          className={`w-6 h-6 rounded-full border transition-all shrink-0 ${
                            isSel ? 'scale-125 ring-2 ring-slate-900 border-white' : 'border-slate-300 hover:scale-110'
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        />
                      );
                    })}
                    <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500">কাস্টম:</span>
                      <input
                        type="color"
                        value={editNameColor || '#facc15'}
                        onChange={e => setEditNameColor(e.target.value)}
                        className="w-7 h-7 rounded-xl cursor-pointer border border-slate-200 p-0.5 bg-white shadow-xs shrink-0"
                        title="কাস্টম কালার পিক করুন"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">ইমেইল ঠিকানা</label>
                  <input 
                    type="email"
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-xs sm:text-sm bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" 
                    value={editEmail} 
                    onChange={e => setEditEmail(e.target.value)} 
                    placeholder="example@mail.com" 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">ডেলিভারি ঠিকানা (Address)</label>
                  <textarea 
                    rows={4}
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-xs sm:text-sm bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all resize-none" 
                    value={editAddress} 
                    onChange={e => setEditAddress(e.target.value)} 
                    placeholder="আপনার সম্পূর্ণ ঠিকানা লিখুন (যেমন: বাসা নং, রোড নং, এলাকা, জেলা)" 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-primary text-white py-4.5 rounded-2xl sm:rounded-3xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] sm:text-xs transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                >
                  তথ্য সংরক্ষণ করুন
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ----------------- Top-up Recharge Modal ----------------- */}
      <AnimatePresence>
        {showTopupModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTopupModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[36px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-2xl">
                    <Wallet size={24} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">ওয়ালেট ব্যালেন্স রিচার্জ</h3>
                    <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">বিকাশ / নগদ / রকেট দিয়ে অ্যাড মানি</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTopupModal(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
              </div>

              <form onSubmit={handleTopupSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                {/* Step 1: Select Gateway */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    ১. যে মাধ্যমে টাকা পাঠাবেন (Select Payment Method)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {rechargeGateways.map((gw) => (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setSelectedRechargeGatewayId(gw.id)}
                        className={`p-3 rounded-2xl border-2 text-center transition-all ${
                          selectedRechargeGatewayId === gw.id
                            ? 'border-indigo-600 bg-indigo-50/60 font-black text-indigo-900 shadow-xs'
                            : 'border-slate-100 hover:border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <p className="text-xs font-black">{gw.name}</p>
                        <p className="text-[8px] text-slate-400 uppercase mt-0.5">{gw.accountType || 'Personal'}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gateway Detail & Instructions */}
                {selectedRechargeGateway && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {selectedRechargeGateway.accountType === 'merchant' ? 'মার্চেন্ট নম্বর (Payment)' : 'পার্সোনাল নম্বর (Send Money)'}
                      </span>
                      <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md uppercase">
                        {selectedRechargeGateway.accountType || 'Personal'}
                      </span>
                    </div>

                    {selectedRechargeGateway.number && (
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                        <span className="font-mono font-black text-base text-slate-900">{selectedRechargeGateway.number}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedRechargeGateway.number || '', selectedRechargeGateway.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-black text-slate-700 flex items-center gap-1.5 transition-colors"
                        >
                          {copiedId === selectedRechargeGateway.id ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}
                          {copiedId === selectedRechargeGateway.id ? 'কপি হয়েছে' : 'কপি করুন'}
                        </button>
                      </div>
                    )}

                    {selectedRechargeGateway.bankDetails && selectedRechargeGateway.bankDetails.bankName && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                        <p className="font-black text-slate-800">{selectedRechargeGateway.bankDetails.bankName}</p>
                        <p className="text-slate-600">হিসাব নম্বর: <span className="font-mono font-bold">{selectedRechargeGateway.bankDetails.accountNumber}</span></p>
                        <p className="text-[10px] text-slate-400">নাম: {selectedRechargeGateway.bankDetails.accountName}, শাখা: {selectedRechargeGateway.bankDetails.branchName}</p>
                      </div>
                    )}

                    {selectedRechargeGateway.instructions && (
                      <p className="text-[11px] text-slate-600 font-bold bg-amber-50/70 p-2.5 rounded-xl border border-amber-100">
                        📌 {selectedRechargeGateway.instructions}
                      </p>
                    )}
                  </div>
                )}

                {/* Amount Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    ২. টাকার পরিমাণ (Recharge Amount)
                  </label>
                  <div className="flex gap-2">
                    {[100, 500, 1000, 2000, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTopupAmount(amt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          topupAmount === amt
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        ৳{amt}
                      </button>
                    ))}
                  </div>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-3.5 text-slate-400 font-black text-base">৳</span>
                    <input
                      type="number"
                      required
                      min={shopSettings?.walletSettings?.minTopupAmount || 50}
                      max={shopSettings?.walletSettings?.maxTopupAmount || 50000}
                      className="w-full border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-black font-mono bg-slate-50 outline-none focus:bg-white focus:border-indigo-600 transition-all"
                      placeholder="পরিমাণ লিখুন"
                      value={topupAmount}
                      onChange={e => setTopupAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Sender & TrxID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      ৩. যে নম্বর থেকে পাঠিয়েছেন
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-black bg-slate-50 outline-none focus:bg-white focus:border-indigo-600"
                      placeholder="017XXXXXXXX"
                      value={topupSenderPhone}
                      onChange={e => setTopupSenderPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      ৪. Transaction ID (TrxID)
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-xs font-black font-mono uppercase bg-slate-50 outline-none focus:bg-white focus:border-indigo-600"
                      placeholder="e.g. 9B4F81A..."
                      value={topupTrxId}
                      onChange={e => setTopupTrxId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    নোট (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold bg-slate-50 outline-none focus:bg-white focus:border-indigo-600"
                    placeholder="কোনো বার্তা থাকলে লিখুন"
                    value={topupNote}
                    onChange={e => setTopupNote(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingTopup || !topupAmount || !topupSenderPhone || !topupTrxId}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all hover:scale-101 active:scale-98"
                >
                  {isSubmittingTopup ? <Loader2 className="animate-spin" size={18} /> : 'রিচার্জ অনুরোধ জমা দিন'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerProfile;
