import React from 'react';
import { X, Package, Calendar, MapPin, Phone, User, ShoppingBag, Truck, CheckCircle2, Download, Printer, Tag } from 'lucide-react';
import { Sale, Product } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderDetailModalProps {
  order: Sale;
  products: Product[];
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, products, onClose }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'cancelled': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'approved': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const calculateSubtotal = () => {
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/5">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">অর্ডার বিবরণী</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">#RB-{order.invoiceNo || order.id.slice(0, 8)}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 rounded-2xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
          {/* Status Tracker */}
          <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">অর্ডার স্ট্যাটাস</span>
              <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                {order.status}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${order.status === 'cancelled' ? 'bg-rose-500 w-full' : 'bg-primary'}`}
                  style={{ width: order.status === 'pending' ? '25%' : order.status === 'approved' ? '50%' : order.status === 'delivered' ? '100%' : '100%' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 mt-4 text-center">
              <p className="text-[8px] font-black text-primary uppercase">গৃহীত</p>
              <p className={`text-[8px] font-black uppercase ${['approved', 'delivered'].includes(order.status) ? 'text-primary' : 'text-slate-300'}`}>প্রসেসিং</p>
              <p className={`text-[8px] font-black uppercase ${['delivered'].includes(order.status) ? 'text-primary' : 'text-slate-300'}`}>শিপড</p>
              <p className={`text-[8px] font-black uppercase ${order.status === 'delivered' ? 'text-primary' : 'text-slate-300'}`}>ডেলিভারড</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Order Info */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Calendar size={14} className="text-primary"/> অর্ডারের তথ্য</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">অর্ডার তারিখ:</span>
                  <span className="text-slate-800">{new Date(order.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">পেমেন্ট মেথড:</span>
                  <span className="text-slate-800 uppercase">{order.paymentMethod || 'Cash On Delivery'}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">ইনভয়েস নম্বর:</span>
                  <span className="text-slate-800 font-mono">#RB-{order.invoiceNo || 'PENDING'}</span>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><MapPin size={14} className="text-primary"/> ডেলিভারি ঠিকানা</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-800">
                  <User size={14} className="text-slate-300" /> {order.customerName || 'Customer'}
                </div>
                <div className="flex items-start gap-3 text-xs font-bold text-slate-800">
                  <MapPin size={14} className="text-slate-300 mt-0.5" /> {(order as any).address || 'No address provided'}
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-800">
                  <Phone size={14} className="text-slate-300" /> {(order as any).phone || 'No phone provided'}
                </div>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Package size={14} className="text-primary"/> পণ্যের তালিকা</h3>
            <div className="border border-slate-100 rounded-3xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-left">পণ্য</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">মূল্য</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">পরিমাণ</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {order.items.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                              {product?.imageUrl && <img src={product.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 text-[11px] uppercase tracking-tight">{item.name}</p>
                              {product?.sku && <p className="text-[8px] font-bold text-slate-300 uppercase mt-0.5">SKU: {product.sku}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center font-black text-slate-600 text-[11px]">৳{item.price.toLocaleString()}</td>
                        <td className="p-4 text-center font-black text-slate-600 text-[11px]">{item.quantity}</td>
                        <td className="p-4 text-right font-black text-slate-800 text-[11px]">৳{(item.price * item.quantity).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-slate-900 rounded-[32px] p-8 text-white">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-white/50">
                <span>উপ-মোট</span>
                <span className="text-white">৳{calculateSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-white/50">
                <span>ডেলিভারি চার্জ</span>
                <span className="text-white">৳{(order.total - calculateSubtotal()).toLocaleString()}</span>
              </div>
              <div className="h-[1px] bg-white/10 my-4" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-[3px] text-primary">সর্বমোট</span>
                <span className="text-3xl font-black tracking-tighter">৳{order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <button className="flex-1 flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs hover:bg-slate-50 transition-all">
            <Printer size={18} /> ইনভয়েস প্রিন্ট করুন
          </button>
          <button className="flex-1 flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <CheckCircle2 size={18} /> অর্ডার কনফার্ম হয়েছে
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderDetailModal;
