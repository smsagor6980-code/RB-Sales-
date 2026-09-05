import React, { useState } from 'react';
import { ShoppingCart, Heart, User, Search, Menu, X, Bell, Home, Package, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Product, ProductCategory, Sale, WishlistItem, AppNotification, Customer, ShopSettings } from '../../types';

interface EcommerceLayoutProps {
  children: React.ReactNode;
  cartCount: number;
  wishlistCount: number;
  notificationCount: number;
  onSearch: (query: string) => void;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onGoHome: () => void;
  onGoCategories: () => void;
  onLogout: () => void;
  customerName?: string;
  isCustomer?: boolean;
  isAdmin?: boolean;
  onSwitchToAdmin?: () => void;
  shopSettings?: ShopSettings;
}

const EcommerceLayout: React.FC<EcommerceLayoutProps> = ({
  children,
  cartCount,
  wishlistCount,
  notificationCount,
  onSearch,
  onOpenCart,
  onOpenWishlist,
  onOpenProfile,
  onOpenNotifications,
  onGoHome,
  onGoCategories,
  onLogout,
  customerName,
  isCustomer,
  isAdmin,
  onSwitchToAdmin,
  shopSettings
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg hover:bg-slate-100 lg:hidden"
                aria-label="Menu"
              >
                {isMenuOpen ? <X size={22} className="sm:w-6 sm:h-6" /> : <Menu size={22} className="sm:w-6 sm:h-6" />}
              </button>
              <div 
                onClick={onGoHome}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                {shopSettings?.logoUrl ? (
                  <div className="h-9 sm:h-11 max-w-[130px] sm:max-w-[160px] bg-white rounded-xl p-1 shadow-sm border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                    <img 
                      src={shopSettings.logoUrl} 
                      alt={shopSettings.headerTitle || shopSettings.name || 'Logo'} 
                      className="max-h-full w-auto max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform shrink-0">
                    <Package size={18} className="sm:w-5 sm:h-5" />
                  </div>
                )}
                <div className="flex flex-col justify-center">
                  <span className="text-lg sm:text-2xl font-black tracking-normal uppercase hidden xs:block leading-tight text-slate-900">
                    {shopSettings?.headerTitle ? (
                      shopSettings.headerTitle
                    ) : (
                      <>
                        {shopSettings?.name?.split(' ')[0] || 'REST'} <span className="text-primary">{shopSettings?.name?.split(' ').slice(1).join(' ') || 'BAZAR'}</span>
                      </>
                    )}
                  </span>
                  {shopSettings?.headerSubtitle && (
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-wide whitespace-nowrap hidden sm:block mt-0.5">
                      {shopSettings.headerSubtitle}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-8 transition-all">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="পণ্য খুঁজুন..."
                  className="w-full bg-slate-100 border-none rounded-2xl py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-3">
              <button 
                onClick={onOpenNotifications}
                className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-100 relative text-slate-600 hidden sm:block"
              >
                <Bell size={20} className="sm:w-5.5 sm:h-5.5" />
                {notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-rose-500 text-white text-[8px] sm:text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {notificationCount}
                  </span>
                )}
              </button>
              
              <button 
                onClick={onOpenWishlist}
                className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-100 relative text-slate-600 hidden xs:block"
              >
                <Heart size={20} className="sm:w-5.5 sm:h-5.5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-primary text-white text-[8px] sm:text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button 
                onClick={onOpenCart}
                className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 relative transition-colors"
                aria-label="Cart"
              >
                <ShoppingCart size={20} className="sm:w-5.5 sm:h-5.5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 bg-primary text-white text-[8px] sm:text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                    {cartCount}
                  </span>
                )}
              </button>

              <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden lg:block"></div>

              <button 
                onClick={onOpenProfile}
                className="flex items-center gap-2 p-1 lg:pr-3 rounded-full hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 overflow-hidden ring-2 ring-white shadow-sm">
                  <User size={18} />
                </div>
                <span className="text-sm font-bold hidden lg:block max-w-[120px] truncate">
                  {customerName || 'লগইন'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search - Only show if not on search page or if explicitly needed */}
        <div className="md:hidden px-4 pb-3 sm:pb-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="পণ্য খুঁজুন..."
              className="w-full bg-slate-100 border-none rounded-xl py-2 pl-9 pr-4 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-[32px] p-2 flex items-center justify-around shadow-2xl shadow-slate-900/50 border border-white/10">
          <button 
            onClick={onGoHome}
            className="flex flex-col items-center gap-1 p-2 flex-1 text-white/50 hover:text-primary transition-colors hover:scale-110 active:scale-95"
          >
            <Home size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">হোম</span>
          </button>
          
          <button 
            onClick={onGoCategories}
            className="flex flex-col items-center gap-1 p-2 flex-1 text-white/50 hover:text-primary transition-colors hover:scale-110 active:scale-95"
          >
            <Package size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">ক্যাটাগরি</span>
          </button>
          
          <div className="relative -mt-10 mb-2">
            <button 
              onClick={onOpenCart}
              className="w-16 h-16 bg-primary rounded-full flex flex-col items-center justify-center text-white shadow-xl shadow-primary/40 border-4 border-slate-900 relative scale-110 hover:scale-125 transition-all active:scale-90"
            >
              <ShoppingCart size={24} />
              <span className="text-[7px] font-black uppercase tracking-widest mt-1">কার্ট</span>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-white text-primary text-[10px] font-black rounded-full flex items-center justify-center shadow-lg transform translate-x-1 -translate-y-1">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          <button 
            onClick={onOpenWishlist}
            className="flex flex-col items-center gap-1 p-2 flex-1 text-white/50 hover:text-primary transition-colors hover:scale-110 active:scale-95"
          >
            <Heart size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">উইশলিস্ট</span>
          </button>

          <button 
            onClick={onOpenProfile}
            className="flex flex-col items-center gap-1 p-2 flex-1 text-white/50 hover:text-primary transition-colors hover:scale-110 active:scale-95"
          >
            <User size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">প্রোফাইল</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[70] shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                    <Package size={16} />
                  </div>
                  <span className="font-black tracking-tight uppercase">MENU</span>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => { onGoHome(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-primary/5 text-slate-600 hover:text-primary font-bold transition-all"
                >
                  <Home size={20} /> হোম
                </button>
                <button 
                  onClick={() => { onGoCategories(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-primary/5 text-slate-600 hover:text-primary font-bold transition-all"
                >
                  <Package size={20} /> ক্যাটাগরি
                </button>
                <button 
                  onClick={() => { onOpenCart(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-primary/5 text-slate-600 hover:text-primary font-bold transition-all"
                >
                  <ShoppingCart size={20} /> শপিং কার্ট
                </button>
                <button 
                  onClick={() => { onOpenProfile(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-primary/5 text-slate-600 hover:text-primary font-bold transition-all"
                >
                  <User size={20} /> আমার প্রোফাইল
                </button>
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-all"
                >
                  <LogOut size={20} /> লগআউট
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <Package size={20} />
                </div>
                <span className="text-xl font-black tracking-tighter uppercase">
                  {shopSettings?.name?.split(' ')[0] || 'REST'} <span className="text-primary">{shopSettings?.name?.split(' ').slice(1).join(' ') || 'BAZER'}</span>
                </span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                {shopSettings?.address || 'আপনার বিশ্বস্ত অনলাইন শপিং পার্টনার। আমরা দিচ্ছি সেরা মানের পণ্য এবং দ্রুত ডেলিভারি।'}
              </p>
            </div>
            
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6">Quick Links</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-600">
                <li><button onClick={onGoHome} className="hover:text-primary transition-colors">হোম</button></li>
                <li><button onClick={onGoCategories} className="hover:text-primary transition-colors">ক্যাটাগরি</button></li>
                <li><button className="hover:text-primary transition-colors">অফারসমূহ</button></li>
                <li><button className="hover:text-primary transition-colors">যোগাযোগ</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6">Support</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-600">
                <li><button className="hover:text-primary transition-colors">হেল্প সেন্টার</button></li>
                <li><button className="hover:text-primary transition-colors">রিটার্ন পলিসি</button></li>
                <li><button className="hover:text-primary transition-colors">ডেলিভারি ট্র্যাকিং</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6">Newsletter</h4>
              <p className="text-slate-500 text-sm mb-4">নতুন অফার এবং আপডেট পেতে সাবস্ক্রাইব করুন।</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="আপনার ইমেইল"
                  className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                />
                <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                  জয়েন
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} {shopSettings?.name || 'REST BAZER'}. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EcommerceLayout;
