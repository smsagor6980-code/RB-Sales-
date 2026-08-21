import React from 'react';
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package } from 'lucide-react';
import { CartItem } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number, absoluteQty?: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}) => {
  const [tempCartQtys, setTempCartQtys] = React.useState<Record<string, string>>({});
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const deliveryFee = items.length > 0 ? 60 : 0;
  const total = subtotal + deliveryFee;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[110] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h2 className="font-black text-lg text-slate-800 uppercase tracking-tight">শপিং কার্ট</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {items.length}টি পণ্য যোগ করা হয়েছে
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                    <ShoppingCart size={48} />
                  </div>
                  <h3 className="font-black text-slate-800 text-xl mb-2">আপনার কার্ট খালি</h3>
                  <p className="text-slate-400 text-sm font-medium mb-8">
                    সেরা মানের পণ্য খুঁজে পেতে আমাদের শপে ঘুরে আসুন।
                  </p>
                  <button 
                    onClick={onClose}
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    শপিং শুরু করুন
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div 
                    layout
                    key={item.productId}
                    className="flex gap-4 group"
                  >
                    <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
                      <img 
                        src={item.imageUrl || `https://picsum.photos/seed/${item.productId}/200/200`} 
                        alt={item.productName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-black text-slate-800 text-sm leading-tight line-clamp-2">
                            {item.productName}
                          </h4>
                          <button 
                            onClick={() => onRemoveItem(item.productId)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-primary font-black text-sm mt-1">
                          ৳{(item.unitPrice ?? 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                          <button 
                            onClick={() => {
                              onUpdateQuantity(item.productId, -1);
                              setTempCartQtys(prev => {
                                const next = { ...prev };
                                delete next[item.productId];
                                return next;
                              });
                            }}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="number"
                            min="1"
                            className="w-8 text-center font-black text-xs text-slate-800 bg-transparent border-none p-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={tempCartQtys[item.productId] !== undefined ? tempCartQtys[item.productId] : item.quantity}
                            onChange={(e) => {
                              const valStr = e.target.value;
                              setTempCartQtys(prev => ({ ...prev, [item.productId]: valStr }));
                              const val = parseInt(valStr, 10);
                              if (!isNaN(val) && val > 0) {
                                onUpdateQuantity(item.productId, 0, val);
                              }
                            }}
                            onBlur={() => {
                              setTempCartQtys(prev => {
                                const next = { ...prev };
                                delete next[item.productId];
                                return next;
                              });
                              if (item.quantity < 1) {
                                onUpdateQuantity(item.productId, 0, 1);
                              }
                            }}
                          />
                          <button 
                            onClick={() => {
                              onUpdateQuantity(item.productId, 1);
                              setTempCartQtys(prev => {
                                const next = { ...prev };
                                delete next[item.productId];
                                return next;
                              });
                            }}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="font-black text-slate-800 text-sm">
                          ৳{(item.total ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-slate-500">
                    <span>সাব-টোটাল</span>
                    <span>৳{(subtotal ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-500">
                    <span>ডেলিভারি চার্জ</span>
                    <span>৳{(deliveryFee ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="h-[1px] bg-slate-200 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-800 uppercase tracking-widest text-xs">সর্বমোট</span>
                    <span className="font-black text-primary text-2xl tracking-tighter">
                      ৳{(total ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={onCheckout}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase text-xs shadow-2xl shadow-primary/20 flex justify-center items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                >
                  চেকআউট করুন <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                
                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                  নিরাপদ পেমেন্ট এবং দ্রুত ডেলিভারি নিশ্চিত করছি
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
