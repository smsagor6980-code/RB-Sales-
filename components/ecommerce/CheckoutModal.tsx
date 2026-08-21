import React, { useState } from 'react';
import { X, MapPin, Phone, User, CreditCard, Wallet, Truck, CheckCircle2, Loader2, ArrowRight, Package } from 'lucide-react';
import { CartItem, Customer } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  customer: Customer | null;
  onPlaceOrder: (orderData: any) => Promise<void>;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  customer,
  onPlaceOrder
}) => {
  const [step, setStep] = useState<'shipping' | 'payment' | 'success'>('shipping');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    paymentMethod: 'cash_on_delivery',
    notes: ''
  });

  React.useEffect(() => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || customer.name || '',
        phone: prev.phone || customer.phone || '',
        address: prev.address || customer.address || '',
      }));
    }
  }, [customer]);

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const deliveryFee = 60;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      await onPlaceOrder({
        ...formData,
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
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                      <CreditCard size={14} className="text-primary" /> ২. পেমেন্ট পদ্ধতি
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'cash_on_delivery', name: 'ক্যাশ অন ডেলিভারি', icon: Truck, desc: 'হাতে পেয়ে পেমেন্ট' },
                        { id: 'bkash', name: 'বিকাশ / নগদ', icon: Wallet, desc: 'মোবাইল ব্যাংকিং' },
                        { id: 'card', name: 'কার্ড পেমেন্ট', icon: CreditCard, desc: 'ডেবিট/ক্রেডিট কার্ড' }
                      ].map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setFormData({...formData, paymentMethod: method.id})}
                          className={`flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all gap-2 cursor-pointer ${formData.paymentMethod === method.id ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 scale-102' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${formData.paymentMethod === method.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <method.icon size={20} />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-[11px]">{method.name}</h4>
                            <p className="text-slate-400 text-[8px] font-bold mt-0.5 uppercase tracking-tighter">{method.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Order Button */}
                  <div className="block md:hidden pt-4 border-t border-slate-50">
                    <button 
                      type="button"
                      onClick={handlePlaceOrder}
                      disabled={loading || !formData.name || !formData.phone || !formData.address}
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
                    disabled={loading || !formData.name || !formData.phone || !formData.address}
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
