import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowRight, Star, Zap, ShieldCheck, Truck, RotateCcw, ChevronRight, Package } from 'lucide-react';
import { Product, ProductCategory, Sale, WishlistItem, AppNotification, Customer, ShopSettings } from '../../types';
import ProductCard from './ProductCard';
import { motion, AnimatePresence } from 'framer-motion';

interface ShopHomeProps {
  products: Product[];
  categories: ProductCategory[];
  onAddToCart: (product: Product) => void;
  onAddToWishlist: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  cartItems: any[];
  wishlist: WishlistItem[];
  onUpdateCartQuantity: (productId: string, delta: number) => void;
  shopPage?: 'home' | 'categories' | 'search';
  externalSearchQuery?: string;
  shopSettings?: ShopSettings;
}

const ShopHome: React.FC<ShopHomeProps> = ({
  products,
  categories,
  onAddToCart,
  onAddToWishlist,
  onViewDetails,
  cartItems,
  wishlist,
  onUpdateCartQuantity,
  shopPage = 'home',
  externalSearchQuery = '',
  shopSettings
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync internal search with external search
  React.useEffect(() => {
    if (externalSearchQuery) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'rating'>('newest');

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter(p => p && p.status !== 'inactive')
      .filter(p => {
        // If searching, we show all matching products regardless of category
        // unless a category was explicitly selected while searching or after
        if (searchQuery && !selectedCategory) return true;
        if (!selectedCategory) return true;
        return (p.category || '').trim() === selectedCategory.trim();
      })
      .filter(p => {
        if (!searchQuery) return true;
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const search = searchQuery.toLowerCase();
        return name.includes(search) || desc.includes(search) || cat.includes(search);
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return (a.salePrice || 0) - (b.salePrice || 0);
        if (sortBy === 'price-high') return (b.salePrice || 0) - (a.salePrice || 0);
        if (sortBy === 'newest') return (b.dateAdded || '').localeCompare(a.dateAdded || '');
        return 0;
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  const featuredProducts = useMemo(() => {
    if (!products) return [];
    return [...products]
      .filter(p => p && p.status !== 'inactive')
      .sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''))
      .slice(0, 4);
  }, [products]);

  return (
    <div className="space-y-16 animate-in fade-in duration-700">
      {/* Hero Section */}
      {shopPage === 'home' && (
        <section className="relative min-h-[400px] md:h-[500px] lg:h-[600px] rounded-[32px] sm:rounded-[40px] md:rounded-[60px] overflow-hidden bg-slate-900 group">
        <img 
          src={shopSettings?.heroImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop"} 
          alt="Hero" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/40 md:via-slate-900/40 to-transparent" />
        
        <div className="relative h-full flex flex-col justify-center px-6 sm:px-12 md:px-24 py-12 md:py-0 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="inline-block bg-primary text-white text-[8px] sm:text-[10px] font-black uppercase tracking-[2px] sm:tracking-[4px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6 shadow-xl shadow-primary/20">
              New Collection {new Date().getFullYear()}
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter leading-[1] sm:leading-[0.9] mb-4 sm:mb-8">
              {shopSettings?.heroTitle || 'সেরা পণ্যের'} <br className="hidden sm:block" /> <span className="text-primary">{shopSettings?.heroTitle ? '' : 'বিশাল সমাহার'}</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-lg font-medium mb-6 sm:mb-10 max-w-md line-clamp-3 sm:line-clamp-none">
              {shopSettings?.heroSubtitle || 'আমাদের শপে পাবেন সেরা মানের পণ্য এবং দ্রুততম ডেলিভারি। আজই অর্ডার করুন এবং উপভোগ করুন বিশেষ ছাড়।'}
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <button 
                onClick={() => document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary text-white px-6 sm:px-10 py-3 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 sm:gap-3"
              >
                শপিং শুরু করুন <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 sm:px-10 py-3 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs hover:bg-white/20 transition-all">
                অফারগুলো
              </button>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Features Bar */}
      {shopSettings?.showFeatures !== false && (
        <section className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          {[
            { icon: Truck, title: 'দ্রুত ডেলিভারি', desc: `${shopSettings?.deliveryCharge || 50} টাকা থেকে শুরু` },
            { icon: ShieldCheck, title: 'নিরাপদ পেমেন্ট', desc: '১০০% সুরক্ষিত লেনদেন' },
            { icon: RotateCcw, title: 'সহজ রিটার্ন', desc: '৭ দিনের মধ্যে রিটার্ন' },
            { icon: Zap, title: 'সেরা অফার', desc: 'প্রতি সপ্তাহে নতুন ডিল' }
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 text-primary rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                <feature.icon size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-xs sm:text-sm">{feature.title}</h4>
                <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1">{feature.desc}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Featured Categories Grid */}
      {(shopPage === 'home' || shopPage === 'categories') && (
        <section>
          <div className="flex justify-between items-end mb-6 sm:mb-10">
            <div className="max-w-[70%] sm:max-w-none">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">
                {shopPage === 'categories' ? 'সকল ক্যাটাগরি' : 'জনপ্রিয় ক্যাটাগরি'}
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 sm:mt-2">
                {shopPage === 'categories' ? 'আমাদের সকল পণ্যের বিভাগগুলো দেখুন' : 'আমাদের সেরা বিভাগগুলো দেখুন'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
            {(shopPage === 'categories' ? categories : (categories.filter(cat => shopSettings?.featuredCategories?.includes(cat.slug))))
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.slug);
                    document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`group flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-[32px] sm:rounded-[40px] border transition-all ${selectedCategory === cat.slug ? 'bg-primary border-primary shadow-xl shadow-primary/20' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:border-primary/20'}`}
                >
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-colors ${selectedCategory === cat.slug ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                    <Package size={24} className="sm:w-8 sm:h-8" />
                  </div>
                  <span className={`font-black text-[10px] sm:text-xs uppercase tracking-widest transition-colors ${selectedCategory === cat.slug ? 'text-white' : 'text-slate-600 group-hover:text-primary'}`}>
                    {cat.name}
                  </span>
                </button>
              ))}
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      {shopPage === 'home' && featuredProducts.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-6 sm:mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">নতুন কালেকশন</h2>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 sm:mt-2">সর্বশেষ পণ্যগুলো দেখুন</p>
            </div>
            <button 
              onClick={() => document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1.5 sm:gap-2"
            >
              সবগুলো <ChevronRight size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {featuredProducts.map((product) => (
              <ProductCard 
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onAddToWishlist={onAddToWishlist}
                onViewDetails={onViewDetails}
                isInWishlist={wishlist.some(w => w.productId === product.id)}
                isInCart={cartItems.some(item => item.productId === product.id)}
                cartQuantity={cartItems.find(item => item.productId === product.id)?.quantity}
                onUpdateCartQuantity={onUpdateCartQuantity}
              />
            ))}
          </div>
        </section>
      )}

      {/* Categories Filter Bar */}
      <section>
        <div className="flex justify-between items-end mb-6 sm:mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">ক্যাটাগরি</h2>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 sm:mt-2">আপনার পছন্দের বিভাগ</p>
          </div>
        </div>
        
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap transition-all ${!selectedCategory ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white text-slate-400 border border-slate-100 hover:border-primary/20'}`}
          >
            সব পণ্য
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap transition-all ${selectedCategory === cat.slug ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white text-slate-400 border border-slate-100 hover:border-primary/20'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section id="products-grid">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 mb-6 sm:mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">আমাদের পণ্যসমূহ</h2>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 sm:mt-2">
              {filteredProducts.length}টি পণ্য পাওয়া গেছে
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                placeholder="পণ্য খুঁজুন..."
                className="w-full bg-white border border-slate-100 rounded-xl sm:rounded-2xl pl-10 pr-4 py-3 sm:py-4 text-[10px] sm:text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="w-full sm:w-auto bg-white border border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">নতুন পণ্য</option>
              <option value="price-low">দাম: কম থেকে বেশি</option>
              <option value="price-high">দাম: বেশি থেকে কম</option>
              <option value="rating">রেটিং অনুযায়ী</option>
            </select>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-12 sm:py-20 text-center bg-white rounded-[32px] sm:rounded-[40px] border border-slate-100">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Search size={32} className="sm:w-10 sm:h-10" />
            </div>
            <h3 className="font-black text-slate-800 text-lg sm:text-xl mb-1 sm:mb-2">কোনো পণ্য পাওয়া যায়নি</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-bold">অনুগ্রহ করে অন্য কোনো কি-ওয়ার্ড দিয়ে চেষ্টা করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  onAddToWishlist={onAddToWishlist}
                  onViewDetails={onViewDetails}
                  isInWishlist={wishlist.some(w => w.productId === product.id)}
                  isInCart={cartItems.some(item => item.productId === product.id)}
                  cartQuantity={cartItems.find(item => item.productId === product.id)?.quantity}
                  onUpdateCartQuantity={onUpdateCartQuantity}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Newsletter / CTA */}
      {shopSettings?.showNewsletter !== false && (
        <section className="bg-primary rounded-[32px] sm:rounded-[40px] md:rounded-[60px] p-8 sm:p-12 md:p-24 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl sm:blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-64 sm:h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl sm:blur-3xl" />
          
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-tight mb-4 sm:mb-6">
              নতুন অফার এবং আপডেট পেতে <br className="hidden sm:block" /> আমাদের সাথে থাকুন
            </h2>
            <p className="text-white/70 text-sm sm:text-lg font-medium mb-6 sm:mb-10">
              সাবস্ক্রাইব করুন এবং বিশেষ ডিসকাউন্ট পান।
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="আপনার ইমেইল এড্রেস"
                className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl px-6 py-3 sm:py-5 text-sm font-bold placeholder:text-white/40 outline-none focus:bg-white/20 transition-all"
              />
              <button className="bg-white text-primary px-8 sm:px-10 py-3 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">
                সাবস্ক্রাইব
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ShopHome;
