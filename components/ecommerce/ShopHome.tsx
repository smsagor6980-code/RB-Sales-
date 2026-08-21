import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowRight, Star, Zap, ShieldCheck, Truck, RotateCcw, ChevronRight, Package, Upload, X, MessageSquare } from 'lucide-react';
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
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '',
    category: categories[0]?.slug || 'other',
    budget: 500,
    description: '',
    imageUrl: '',
    quantity: 1
  });

  const activeSlides = useMemo(() => {
    const slides = (shopSettings?.sliderImages || []).filter((s: any) => s.active !== false);
    if (slides.length > 0) return slides;
    
    // Default fallback slides
    return [
      {
        id: 'default-slide-1',
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
        title: 'সেরা পণ্যের বিশাল সমাহার',
        subtitle: 'আমাদের শপে পাবেন সেরা মানের পণ্য এবং দ্রুততম ডেলিভারি। আজই অর্ডার করুন এবং উপভোগ করুন বিশেষ ছাড়।',
        active: true
      },
      {
        id: 'default-slide-2',
        imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=2070&auto=format&fit=crop',
        title: 'বিশেষ ছাড় ও অফার',
        subtitle: 'সব ক্যাটাগরির পণ্যে আকর্ষণীয় ডিসকাউন্ট এবং ফ্রি ডেলিভারি অফার!',
        active: true
      }
    ];
  }, [shopSettings?.sliderImages]);

  // Autoplay slider
  React.useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSlides]);

  const resizeImage = (file: File, maxWidth = 300, maxHeight = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleCustomOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name || !customForm.budget) return;

    const customProduct: Product = {
      id: `custom-${Date.now()}`,
      sku: `CUSTOM-${Date.now().toString().slice(-6)}`,
      name: `[কাস্টম পণ্য] ${customForm.name}`,
      purchasePrice: Math.round(Number(customForm.budget) * 0.8),
      salePrice: Number(customForm.budget),
      wholesalePrice: Number(customForm.budget),
      distributorPrice: Number(customForm.budget),
      unit: 'pcs',
      stock: 9999,
      category: customForm.category,
      description: `কাস্টম বিবরণ: ${customForm.description || 'নেই'}`,
      imageUrl: customForm.imageUrl || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=200&auto=format&fit=crop',
      dateAdded: new Date().toISOString()
    };

    const qty = Number(customForm.quantity) || 1;
    for (let i = 0; i < qty; i++) {
      onAddToCart(customProduct);
    }

    setCustomForm({
      name: '',
      category: selectedCategory || categories[0]?.slug || 'other',
      budget: 500,
      description: '',
      imageUrl: '',
      quantity: 1
    });
    setShowCustomOrderModal(false);
  };

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
      {/* 1. Image Slider Section (ছবি স্লাইডার) */}
      {shopPage === 'home' && (
        <section className="relative min-h-[320px] h-[360px] sm:h-[420px] md:h-[500px] lg:h-[550px] rounded-[32px] sm:rounded-[40px] md:rounded-[50px] overflow-hidden bg-slate-950 group shadow-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.01 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 w-full h-full"
            >
              <img 
                src={activeSlides[currentSlide].imageUrl} 
                alt={activeSlides[currentSlide].title || "Offer Banner"} 
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent" />
              
              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-12 md:p-20 max-w-3xl text-white">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <span className="inline-block bg-primary text-white text-[8px] sm:text-[10px] font-black uppercase tracking-[3px] px-3 py-1.5 rounded-full mb-3 sm:mb-4 shadow-xl shadow-primary/25">
                    विशेष অফার / Special Offer
                  </span>
                  {activeSlides[currentSlide].title && (
                    <h2 className="text-xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-2 sm:mb-3 uppercase text-shadow-md">
                      {activeSlides[currentSlide].title}
                    </h2>
                  )}
                  {activeSlides[currentSlide].subtitle && (
                    <p className="text-slate-300 text-[11px] sm:text-base font-medium max-w-lg line-clamp-2">
                      {activeSlides[currentSlide].subtitle}
                    </p>
                  )}
                  <div className="flex gap-3 mt-4 sm:mt-6">
                    <button 
                      onClick={() => document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-primary text-white px-5 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-xs shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      অফারটি নিন <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slider Navigation Arrows */}
          {activeSlides.length > 1 && (
            <>
              <button 
                onClick={() => setCurrentSlide(prev => (prev - 1 + activeSlides.length) % activeSlides.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 active:scale-95 z-20"
              >
                ❮
              </button>
              <button 
                onClick={() => setCurrentSlide(prev => (prev + 1) % activeSlides.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 active:scale-95 z-20"
              >
                ❯
              </button>

              {/* Bottom Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {activeSlides.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentSlide ? 'bg-primary w-6' : 'bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* 2. Featured Categories Grid Section (ক্যাটাগরি সেকশান সিস্টেম) */}
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
                  className={`group flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-[32px] sm:rounded-[36px] border transition-all ${selectedCategory === cat.slug ? 'bg-primary border-primary shadow-xl shadow-primary/20 scale-102' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:border-primary/20 hover:scale-102'}`}
                >
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all overflow-hidden border-2 ${selectedCategory === cat.slug ? 'bg-white/20 text-white border-white/40' : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20'}`}>
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={22} className="sm:w-7 sm:h-7" />
                    )}
                  </div>
                  <span className={`font-black text-[9px] sm:text-[11px] uppercase tracking-wider transition-colors text-center line-clamp-1 ${selectedCategory === cat.slug ? 'text-white' : 'text-slate-600 group-hover:text-primary'}`}>
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
        {/* Custom Order Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-indigo-50/50 to-primary/5 rounded-[32px] p-6 sm:p-8 border border-primary/20 flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 shadow-sm">
          <div className="space-y-2 text-center sm:text-left">
            <span className="bg-primary/20 text-primary text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              Custom Order Feature / আপনার পছন্দ
            </span>
            <h3 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">
              আপনার পছন্দের পণ্যটি কি খুঁজে পাচ্ছেন না?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-bold">
              {selectedCategory 
                ? `কোনো সমস্যা নেই! ${categories.find(c => c.slug === selectedCategory)?.name || ''} ক্যাটাগরিতে আপনার পছন্দের কাস্টম পণ্যটি অর্ডার করুন, আমরা এনে দেব!` 
                : 'আপনার চাহিদামতো যে কোনো কাস্টম পণ্য অর্ডার করুন, আমরা দ্রুততম সময়ে এনে দেব!'}
            </p>
          </div>
          <button 
            onClick={() => {
              setCustomForm(prev => ({ ...prev, category: selectedCategory || categories[0]?.slug || 'other' }));
              setShowCustomOrderModal(true);
            }}
            className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
          >
            কাস্টম অর্ডার দিন
          </button>
        </div>

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

      {/* 6. Static Hero Section (পুরাতন ১ম সেকশন নিচে স্থানান্তরিত) */}
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
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* 7. Features Bar (পুরাতন ২য় সেকশন নিচে স্থানান্তরিত) */}
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

      {/* Custom Product Order Modal */}
      <AnimatePresence>
        {showCustomOrderModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl border-2 border-slate-50 flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <MessageSquare className="text-primary" size={20}/> কাস্টম পণ্য অর্ডার করুন
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">আপনার চাহিদামতো পণ্য আমরা এনে দেব</p>
                </div>
                <button onClick={() => setShowCustomOrderModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={20}/></button>
              </div>

              <form onSubmit={handleCustomOrderSubmit} className="p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পণ্যের ক্যাটাগরি (Category)</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:bg-white focus:border-primary/20 transition-all"
                    value={customForm.category}
                    onChange={(e) => setCustomForm({ ...customForm, category: e.target.value })}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পণ্যের নাম (Product Name)</label>
                  <input
                    type="text"
                    placeholder="যেমন: কাস্টম ডিজাইনের চাবির রিং"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:bg-white focus:border-primary/20 transition-all"
                    value={customForm.name}
                    onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">আনুমানিক বাজেট (বাজেট/পিস)</label>
                    <input
                      type="number"
                      placeholder="৫০০"
                      min={10}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:bg-white focus:border-primary/20 transition-all"
                      value={customForm.budget}
                      onChange={(e) => setCustomForm({ ...customForm, budget: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পরিমাণ (Quantity)</label>
                    <input
                      type="number"
                      placeholder="১"
                      min={1}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:bg-white focus:border-primary/20 transition-all"
                      value={customForm.quantity}
                      onChange={(e) => setCustomForm({ ...customForm, quantity: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">বিশেষ বিবরণ / সাইজ / কালার (Specifications)</label>
                  <textarea
                    rows={3}
                    placeholder="পণ্যের সাইজ, রং বা কোনো বিশেষ ব্র্যান্ড বা নির্দেশাবলী থাকলে এখানে লিখুন..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:bg-white focus:border-primary/20 transition-all"
                    value={customForm.description}
                    onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পণ্যের রেফারেন্স ছবি (ঐচ্ছিক)</label>
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-2xl border-2 border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0">
                      {customForm.imageUrl ? (
                        <img src={customForm.imageUrl} alt="Reference Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const base64 = await resizeImage(file, 400, 400);
                            setCustomForm({ ...customForm, imageUrl: base64 });
                          } catch (err) {
                            console.error("Custom order image resize error:", err);
                          }
                        }}
                      />
                      <button type="button" className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all">
                        ছবি আপলোড করুন
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-white p-4 rounded-2xl shadow-lg shadow-primary/20 font-black text-xs uppercase tracking-wider active:scale-95 transition-all pt-5 pb-5"
                >
                  কার্টে যোগ করুন (Add to Cart)
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopHome;
