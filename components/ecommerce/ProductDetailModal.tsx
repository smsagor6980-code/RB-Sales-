import React from 'react';
import { X, ShoppingCart, Heart, Share2, Star, ShieldCheck, Truck, RotateCcw, Package, Minus, Plus, QrCode, Download } from 'lucide-react';
import { Product } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onAddToWishlist: (product: Product) => void;
  isInWishlist?: boolean;
  isInCart?: boolean;
  cartQuantity?: number;
  onUpdateCartQuantity?: (productId: string, delta: number, absoluteQty?: number) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onAddToWishlist,
  isInWishlist,
  isInCart,
  cartQuantity,
  onUpdateCartQuantity
}) => {
  const [tempDetailQty, setTempDetailQty] = React.useState<string>('');
  const [showQR, setShowQR] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (cartQuantity !== undefined) {
      setTempDetailQty('');
    }
  }, [cartQuantity]);

  React.useEffect(() => {
    if (!isOpen) {
      setShowQR(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && product) {
      const dataStr = product.sku || product.id;
      // Use standard, high-reliability public QR generator API with H error correction
      setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=256x256&ecc=H&margin=1&data=${encodeURIComponent(dataStr)}`);
    } else {
      setQrDataUrl('');
    }
  }, [isOpen, product]);

  if (!product) return null;

  const downloadQRCode = async () => {
    if (!qrDataUrl) return;
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `QR_${product.sku || product.id}_${product.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download QR Code", err);
      // Fallback: Open in a new tab if fetch fails due to any reason
      window.open(qrDataUrl, '_blank');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:h-[85vh] max-h-[90vh] bg-white z-[160] rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
          >
            {/* Left: Image Side */}
            <div className="w-full md:w-1/2 bg-slate-50 relative group">
              <img 
                src={product.imageUrl || `https://picsum.photos/seed/${product.id}/800/800`} 
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <button 
                onClick={onClose}
                className="absolute top-6 left-6 p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl text-slate-400 hover:text-rose-500 md:hidden"
              >
                <X size={24} />
              </button>
              
              <div className="absolute top-6 right-6">
                 <span className="bg-primary text-white text-[10px] font-black uppercase tracking-[4px] px-4 py-2 rounded-full shadow-lg">
                    {product.category}
                 </span>
              </div>
            </div>

            {/* Right: Details Side */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="hidden md:flex justify-end mb-4">
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <X size={32} />
                </button>
              </div>

              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={14} className="fill-amber-400 text-amber-400" />
                ))}
                <span className="text-xs font-bold text-slate-400 ml-2">(4.8 / 124 reviews)</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-4 tracking-tighter uppercase">
                {product.name}
              </h2>

              <div className="flex items-center gap-4 mb-8">
                <p className="text-4xl font-black text-primary tracking-tighter">
                  ৳{(product.salePrice || 0).toLocaleString()}
                </p>
                {product.stock > 0 ? (
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-emerald-100">
                    In Stock
                  </span>
                ) : (
                  <span className="bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-rose-100">
                    Out of Stock
                  </span>
                )}
              </div>

              <p className="text-slate-500 font-medium leading-relaxed mb-10">
                {product.description || 'সেরা মানের পণ্য এবং দ্রুত ডেলিভারি নিশ্চিত করছি। আমাদের পণ্য সরাসরি বিশ্বস্ত সোর্স থেকে সংগ্রহ করা হয়।'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4 mt-auto">
                <div className="flex gap-4">
                  {isInCart ? (
                    <div className="flex-1 flex items-center justify-between bg-slate-100 rounded-3xl p-2 h-16">
                      <button 
                        onClick={() => {
                          onUpdateCartQuantity?.(product.id, -1);
                          setTempDetailQty('');
                        }}
                        className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-600 shadow-sm hover:scale-105 transition-all"
                      >
                        <Minus size={20} />
                      </button>
                      <input 
                        type="number"
                        min="1"
                        className="w-16 text-center font-black text-xl text-slate-800 bg-transparent border-none p-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={tempDetailQty !== '' ? tempDetailQty : (cartQuantity || 1)}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          setTempDetailQty(valStr);
                          const val = parseInt(valStr, 10);
                          if (!isNaN(val) && val > 0) {
                            onUpdateCartQuantity?.(product.id, 0, val);
                          }
                        }}
                        onBlur={() => {
                          setTempDetailQty('');
                          if (cartQuantity === undefined || cartQuantity < 1) {
                            onUpdateCartQuantity?.(product.id, 0, 1);
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          onUpdateCartQuantity?.(product.id, 1);
                          setTempDetailQty('');
                        }}
                        className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-600 shadow-sm hover:scale-105 transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => onAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1 bg-primary text-white h-16 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      <ShoppingCart size={20} /> কার্টে যোগ করুন
                    </button>
                  )}
                  
                  <button 
                    onClick={() => onAddToWishlist(product)}
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all border-2 ${isInWishlist ? 'bg-rose-500 border-rose-500 text-white shadow-xl shadow-rose-500/20' : 'bg-white border-slate-100 text-slate-300 hover:border-rose-200 hover:text-rose-500'}`}
                  >
                    <Heart size={24} fill={isInWishlist ? 'currentColor' : 'none'} />
                  </button>
                </div>
                
                <button className="w-full h-16 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                  <Share2 size={20} /> বন্ধুদের সাথে শেয়ার করুন
                </button>

                <div className="border-t border-slate-100 pt-4 mt-2">
                  <button 
                    onClick={() => setShowQR(!showQR)}
                    className="w-full h-14 border-2 border-dashed border-primary/25 hover:border-primary/50 text-primary rounded-3xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 bg-primary/5 hover:bg-primary/10"
                  >
                    <QrCode size={18} /> {showQR ? "কিউআর কোড লুকান" : "ইন-স্টোর স্ক্যান কিউআর কোড"}
                  </button>

                  <AnimatePresence>
                    {showQR && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden bg-slate-50 rounded-3xl border border-slate-100 p-6 flex flex-col items-center"
                      >
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                          {qrDataUrl ? (
                            <img
                              src={qrDataUrl}
                              alt="Product QR Code"
                              className="w-40 h-40 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-40 h-40 flex items-center justify-center text-slate-400 font-bold text-xs">
                              লোড হচ্ছে...
                            </div>
                          )}
                        </div>

                        <div className="text-center mt-4 w-full">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">কিউআর কোড ভ্যালু</span>
                          <p className="font-mono text-sm font-black text-slate-800 mt-0.5 break-all px-2">{product.sku || product.id}</p>
                          {product.sku ? (
                            <span className="inline-block bg-primary/10 text-primary text-[9px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 uppercase">SKU কোড</span>
                          ) : (
                            <span className="inline-block bg-amber-50 text-amber-600 text-[9px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 uppercase">প্রোডাক্ট আইডি</span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 font-bold text-center mt-3 max-w-[240px] leading-relaxed">
                          পণ্যটি ইন-স্টোরে দ্রুত স্ক্যান করে বিলিং কাউন্টারে খুঁজতে এই কিউআর কোড ব্যবহার করুন।
                        </p>

                        <button
                          onClick={downloadQRCode}
                          className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md mt-4 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Download size={14} /> কিউআর ডাউনলোড (PNG)
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 mt-12 pt-12 border-t border-slate-100">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><Truck size={20}/></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><ShieldCheck size={20}/></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Secured</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><RotateCcw size={20}/></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Easy Return</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailModal;
