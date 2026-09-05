import React, { useState, useMemo } from 'react';
import { 
  X, MapPin, Phone, User, CreditCard, Wallet, Truck, CheckCircle2, 
  Loader2, ArrowRight, Package, Smartphone, Building2, Copy, Check,
  AlertCircle, Sparkles, QrCode
} from 'lucide-react';
import { CartItem, Customer, ShopSettings, PaymentGateway, DEFAULT_PAYMENT_GATEWAYS } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  customer: Customer | null;
  shopSettings?: ShopSettings;
  onPlaceOrder: (orderData: any) => Promise<void>;
  onOpenWallet?: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  customer,
  shopSettings,
  onPlaceOrder,
  onOpenWallet
}) => {
  const [step, setStep] = useState<'shipping' | 'payment' | 'success'>('shipping');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active gateways from settings or defaults
  const activeGateways: PaymentGateway[] = useMemo(() => {
    const all = (shopSettings?.paymentGateways && shopSettings.paymentGateways.length > 0) 
      ? shopSettings.paymentGateways 
      : DEFAULT_PAYMENT_GATEWAYS;
    return all.filter(g => g.status === 'active');
  }, [shopSettings?.paymentGateways]);

  const [selectedGatewayId, setSelectedGatewayId] = useState<string>(() => {
    return activeGateways[0]?.id || 'cash_on_delivery';
  });

  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    senderNumber: '',
    trxId: '',
    notes: ''
  });

  React.useEffect(() => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || customer.name || '',
        phone: prev.phone || customer.phone || '',
        address: prev.address || customer.address || '',
        senderNumber: prev.senderNumber || customer.phone || ''
      }));
    }
  }, [customer]);

  React.useEffect(() => {
    if (activeGateways.length > 0 && !activeGateways.some(g => g.id === selectedGatewayId)) {
      setSelectedGatewayId(activeGateways[0].id);
    }
  }, [activeGateways, selectedGatewayId]);

  const selectedGateway = useMemo(() => {
    return activeGateways.find(g => g.id === selectedGatewayId) || activeGateways[0];
  }, [activeGateways, selectedGatewayId]);

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const deliveryFee = shopSettings?.deliveryCharge ?? 60;
  const total = subtotal + deliveryFee;

  const customerWalletBal = customer?.walletBalance || 0;
  const isRestPay = selectedGateway?.id === 'rest_pay';
  const hasEnoughWalletBalance = customerWalletBal >= total;
  const cashbackPercent = shopSettings?.walletSettings?.cashbackPercentage || 2;
  const estimatedCashback = Math.round((total * cashbackPercent) / 100);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePlaceOrder = async () => {
    if (isRestPay && !hasEnoughWalletBalance) {
      alert(`আপনার রেস্ট পে ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই। আরও ৳${(total - customerWalletBal).toLocaleString()} রিচার্জ করুন অথবা অন্য মাধ্যমে পেমেন্ট করুন।`);
      return;
    }

    setLoading(true);
    try {
      await onPlaceOrder({
        ...formData,
        paymentMethod: selectedGateway?.id || 'cash_on_delivery',
        paymentGatewayId: selectedGateway?.id || 'cash_on_delivery',
        paymentGatewayName: selectedGateway?.name || 'ক্যাশ অন ডেলিভারি',
        senderNumber: formData.senderNumber,
        trxId: formData.trxId,
        isWalletPayment: isRestPay,
        walletDeductionAmount: isRestPay ? total : 0,
        estimatedCashback: isRestPay ? estimatedCashback : 0,
        items,
        subtotal,
        deliveryFee,
        total,
        date: new Date().toISOString(),
        status: 'pending'
      });
      setStep('success');
    } catch (err) {
      console.error("Order failed:", err);
      alert("অর্ডার সম্পন্ন করা সম্ভব হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const getGatewayIcon = (id: string) => {
    switch (id) {
      case 'cash_on_delivery': return Truck;
      case 'rest_pay': return Wallet;
      case 'bkash':
      case 'nagad':
      case 'rocket':
      case 'upay':
      case 'cellfin': return Smartphone;
      case 'bank_transfer': return Building2;
      default: return CreditCard;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
          >
            {/* Left Side - Form */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
              {step !== 'success' ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div>
                    <h2 className="font-black text-2xl text-slate-800 tracking-tight flex items-center gap-2">
                      <Package className="text-primary" size={24} /> চেকআউট সম্পন্ন করুন
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">সহজ ও দ্রুত অর্ডারিং ইন্টারফেস</p>
                  </div>

                  {/* Delivery Address Section */}
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                      <MapPin size={14} className="text-primary" /> ১. ডেলিভারি তথ্য
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">আপনার নাম (Full Name)</label>
                        <div className="relative">
                          <User className="absolute left-4 top-4 text-slate-300" size={18} />
                          <input 
                            type="text" 
                            className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold bg-slate-50 outline-none focus:border-primary/20 focus:bg-white transition-all"
                            placeholder="যেমন: আসিফ রহমান"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ফোন নম্বর (Phone Number)</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-4 text-slate-300" size={18} />
                          <input 
                            type="tel" 
                            className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold bg-slate-50 outline-none focus:border-primary/20 focus:bg-white transition-all"
                            placeholder="যেমন: ০১৭XXXXXXXX"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ডেলিভারি ঠিকানা (Detailed Address)</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4 text-slate-300" size={18} />
                        <textarea 
                          rows={2}
                          className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold bg-slate-50 outline-none focus:border-primary/20 focus:bg-white transition-all resize-none"
                          placeholder="আপনার বিস্তারিত ঠিকানা লিখুন (যেমন: বাসা নং, রোড, এলাকা)"
                          value={formData.address}
                          onChange={e => setFormData({...formData, address: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">অর্ডার নোট / নির্দেশনা (ঐচ্ছিক)</label>
                      <input 
                        type="text" 
                        className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold bg-slate-50 outline-none focus:border-primary/20 focus:bg-white transition-all"
                        placeholder="ডেলিভারি ম্যানের জন্য কোনো বিশেষ বার্তা থাকলে লিখুন"
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Payment Method Section */}
                  <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={14} className="text-primary" /> ২. পেমেন্ট পদ্ধতি নির্বাচন করুন
                      </h3>
                      {customer && (
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                          <Wallet size={12}/> রেস্ট পে: ৳{customerWalletBal.toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    {/* Gateway Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {activeGateways.map((gw) => {
                        const Icon = getGatewayIcon(gw.id);
                        const isSelected = selectedGatewayId === gw.id;
                        return (
                          <button
                            key={gw.id}
                            type="button"
                            onClick={() => setSelectedGatewayId(gw.id)}
                            className={`flex flex-col items-center text-center p-3.5 rounded-2xl border-2 transition-all gap-2 cursor-pointer relative ${isSelected ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 scale-102 font-black' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Icon size={18} />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-[11px] leading-tight">{gw.name}</h4>
                              <p className="text-slate-400 text-[8px] font-bold mt-0.5 uppercase tracking-tight">
                                {gw.id === 'rest_pay' ? `ব্যালেন্স ৳${customerWalletBal}` : (gw.nameEn || gw.id)}
                              </p>
                            </div>
                            {gw.discountPercentage !== undefined && gw.discountPercentage > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full">
                                {gw.discountPercentage}% OFF
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Gateway Detail View */}
                    {selectedGateway && (
                      <div className="mt-4 p-5 bg-slate-50 rounded-3xl border-2 border-slate-100 space-y-4">
                        {/* Rest Pay Wallet Card */}
                        {isRestPay ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-900 to-slate-900 p-5 rounded-2xl text-white">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/10 rounded-xl">
                                  <Wallet size={24} className="text-amber-400" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">রেস্ট পে ওয়ালেট</p>
                                  <h4 className="text-lg font-black text-white mt-0.5">
                                    বর্তমান ব্যালেন্স: ৳{customerWalletBal.toLocaleString()}
                                  </h4>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${hasEnoughWalletBalance ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30' : 'bg-rose-500/30 text-rose-300 border border-rose-400/30'}`}>
                                  {hasEnoughWalletBalance ? 'পর্যাপ্ত ব্যালেন্স' : 'অপর্যাপ্ত ব্যালেন্স'}
                                </span>
                              </div>
                            </div>

                            {hasEnoughWalletBalance ? (
                              <div className="flex items-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100">
                                <Sparkles size={16} className="text-amber-500 shrink-0" />
                                <span>১-ক্লিকে তাৎক্ষণিক পেমেন্ট সম্পন্ন হবে এবং ৳{estimatedCashback} ক্যাশব্যাক যোগ হবে!</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 p-3.5 rounded-2xl border border-rose-100">
                                  <AlertCircle size={16} className="shrink-0" />
                                  <span>ঘাটতি: ৳{(total - customerWalletBal).toLocaleString()}। ওয়ালেটে টাকা রিচার্জ করুন অথবা অন্য মাধ্যমে অর্ডার করুন।</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : selectedGateway.id === 'cash_on_delivery' ? (
                          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl text-emerald-800 border border-emerald-100">
                            <Truck size={22} className="text-emerald-600 shrink-0" />
                            <div>
                              <p className="text-xs font-black">ক্যাশ অন ডেলিভারি (হাতে পেয়ে পেমেন্ট)</p>
                              <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                                ডেলিভারি প্রতিনিধি পণ্য পৌঁছে দেওয়ার পর নগদ ৳{total.toLocaleString()} টাকা পরিশোধ করুন।
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Mobile Banking / Bank Transfer details */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {selectedGateway.accountType === 'merchant' ? 'মার্চেন্ট নম্বর' : selectedGateway.accountType === 'personal' ? 'পার্সোনাল নম্বর' : 'অ্যাকাউন্ট নম্বর'}
                                </span>
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg uppercase">
                                  {selectedGateway.accountType === 'merchant' ? 'Payment করুন' : 'Send Money করুন'}
                                </span>
                              </div>

                              {selectedGateway.number && (
                                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                                  <span className="font-mono font-black text-slate-900 text-base">{selectedGateway.number}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(selectedGateway.number || '', selectedGateway.id)}
                                    className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-black text-slate-700 flex items-center gap-1.5"
                                  >
                                    {copiedId === selectedGateway.id ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}
                                    {copiedId === selectedGateway.id ? 'কপি হয়েছে' : 'কপি করুন'}
                                  </button>
                                </div>
                              )}

                              {selectedGateway.bankDetails && selectedGateway.bankDetails.bankName && (
                                <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
                                  <p className="font-black text-slate-800">{selectedGateway.bankDetails.bankName}</p>
                                  <p className="text-[11px] text-slate-600">হিসাব নম্বর: <span className="font-mono font-black">{selectedGateway.bankDetails.accountNumber}</span></p>
                                  <p className="text-[10px] text-slate-400">হিসাবের নাম: {selectedGateway.bankDetails.accountName}, শাখা: {selectedGateway.bankDetails.branchName}</p>
                                </div>
                              )}

                              {selectedGateway.instructions && (
                                <p className="text-[11px] text-slate-600 font-bold bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                                  📌 {selectedGateway.instructions}
                                </p>
                              )}
                            </div>

                            {/* Verification Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                  যে নম্বর থেকে টাকা পাঠিয়েছেন
                                </label>
                                <input
                                  type="text"
                                  className="w-full border-2 border-slate-100 rounded-xl p-3 text-xs font-black bg-white outline-none focus:border-primary"
                                  placeholder="017XXXXXXXX"
                                  value={formData.senderNumber}
                                  onChange={e => setFormData({ ...formData, senderNumber: e.target.value })}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                  Transaction ID (TrxID)
                                </label>
                                <input
                                  type="text"
                                  className="w-full border-2 border-slate-100 rounded-xl p-3 text-xs font-black font-mono bg-white outline-none focus:border-primary uppercase"
                                  placeholder="e.g. 9B4F81A..."
                                  value={formData.trxId}
                                  onChange={e => setFormData({ ...formData, trxId: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mobile Order Button */}
                  <div className="block md:hidden pt-4 border-t border-slate-50">
                    <button 
                      type="button"
                      onClick={handlePlaceOrder}
                      disabled={loading || !formData.name || !formData.phone || !formData.address || (isRestPay && !hasEnoughWalletBalance)}
                      className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-primary/20 flex justify-center items-center gap-3 hover:scale-101 active:scale-98 transition-all disabled:bg-slate-200 disabled:shadow-none"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : 'অর্ডার কনফার্ম করুন'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/10">
                    <CheckCircle2 size={64} />
                  </div>
                  <h2 className="font-black text-slate-800 text-3xl mb-4">অর্ডার সফল হয়েছে!</h2>
                  <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                    আপনার অর্ডারটি গ্রহণ করা হয়েছে। খুব শীঘ্রই আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।
                  </p>
                  <div className="mt-10 p-6 bg-slate-50 rounded-[32px] border border-slate-100 w-full max-w-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">অর্ডার আইডি</span>
                      <span className="font-black text-slate-800">#RB-{Math.floor(Math.random() * 100000)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">ডেলিভারি সময়</span>
                      <span className="font-black text-primary uppercase tracking-tight">২৪-৪৮ ঘণ্টা</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={onClose}
                    className="mt-10 bg-primary text-white px-12 py-5 rounded-2xl font-black uppercase text-xs shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    হোম পেজে ফিরে যান
                  </button>
                </div>
              )}
            </div>

            {/* Right Side - Summary (Desktop Only) */}
            {step !== 'success' && (
              <div className="hidden md:flex w-80 bg-slate-50 border-l border-slate-100 p-10 flex-col justify-between">
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-8 border-b pb-2">অর্ডার সামারি</h3>
                  
                  <div className="space-y-6 max-h-[35vh] overflow-y-auto custom-scrollbar pr-2 mb-8">
                    {items.map((item) => (
                      <div key={item.productId} className="flex gap-4">
                        <div className="w-14 h-14 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-slate-200">
                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-800 text-xs truncate">{item.productName}</h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                            {item.quantity} x ৳{(item.unitPrice ?? 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>সাব-টোটাল</span>
                      <span>৳{(subtotal ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>ডেলিভারি চার্জ</span>
                      <span>৳{(deliveryFee ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="h-[1px] bg-slate-200 my-2"></div>
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-800 uppercase tracking-widest text-[10px]">সর্বমোট</span>
                      <span className="font-black text-primary text-2xl tracking-tighter">
                        ৳{(total ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <button 
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={loading || !formData.name || !formData.phone || !formData.address || (isRestPay && !hasEnoughWalletBalance)}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-primary/20 flex justify-center items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:bg-slate-200 disabled:shadow-none"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'অর্ডার কনফার্ম করুন'}
                  </button>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ডেলিভারি গ্যারান্টি</p>
                      <p className="text-[11px] font-black text-slate-800">২৪ ঘণ্টার মধ্যে শিপিং</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors z-10"
            >
              <X size={24} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutModal;
