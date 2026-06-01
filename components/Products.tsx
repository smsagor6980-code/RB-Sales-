
import React, { useState, useRef, useMemo } from 'react';
import { Product, ProductCategory, Purchase, StockEntry, Staff } from '../types';
import { 
  Plus, Edit, Trash2, Search, X, Upload, 
  Loader2, Package, LayoutGrid, List as ListIcon,
  Tag, DollarSign, Info, AlertCircle, Save, Truck, Calendar, History, TrendingUp,
  BarChart3, Clock, CheckCircle2, ChevronRight, Calculator, Minus, Sparkles
} from 'lucide-react';
import { storage, auth } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion } from 'motion/react';

interface ProductsProps {
  products: Product[];
  onUpdate: (products: Product[]) => void;
  onDelete?: (id: string) => void;
  categories: ProductCategory[];
  onCategoryUpdate: (categories: ProductCategory[]) => void;
  purchases?: Purchase[];
  stockEntries: StockEntry[];
  onStockUpdate: (entry: StockEntry, updatedProducts: Product[]) => void;
  currentStaff: Staff | null;
}

const Products: React.FC<ProductsProps> = ({ 
  products, onUpdate, onDelete, categories, onCategoryUpdate, 
  purchases = [], stockEntries = [], onStockUpdate, currentStaff 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'stock_history'>('inventory');
  
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stockEntryForm, setStockEntryForm] = useState({
    productId: '',
    quantity: 0,
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', purchasePrice: 0, salePrice: 0, wholesalePrice: 0, distributorPrice: 0, 
    unit: 'pcs', stock: 0, minStock: 10, category: 'other', imageUrl: '', status: 'active',
    dateAdded: new Date().toISOString().split('T')[0]
  });

  const productStockStats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const month = today.slice(0, 7);
    const year = today.slice(0, 4);

    const statsMap: Record<string, { today: number, month: number, year: number, lifetime: number, todayValue: number, monthValue: number, yearValue: number, lifetimeValue: number }> = {};

    (stockEntries || []).forEach(e => {
      const product = products.find(p => p.id === e.productId);
      const purchasePrice = product?.purchasePrice || 0;
      const value = e.quantity * purchasePrice;

      if (!statsMap[e.productId]) {
        statsMap[e.productId] = { today: 0, month: 0, year: 0, lifetime: 0, todayValue: 0, monthValue: 0, yearValue: 0, lifetimeValue: 0 };
      }

      statsMap[e.productId].lifetime += e.quantity;
      statsMap[e.productId].lifetimeValue += value;

      if (e.date === today) {
        statsMap[e.productId].today += e.quantity;
        statsMap[e.productId].todayValue += value;
      }
      if (e.date.startsWith(month)) {
        statsMap[e.productId].month += e.quantity;
        statsMap[e.productId].monthValue += value;
      }
      if (e.date.startsWith(year)) {
        statsMap[e.productId].year += e.quantity;
        statsMap[e.productId].yearValue += value;
      }
    });

    return statsMap;
  }, [stockEntries, products]);

  const stockStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);
    const year = today.slice(0, 4);

    const stats = (stockEntries || []).reduce((acc, e) => {
      const product = products.find(p => p.id === e.productId);
      const purchasePrice = product?.purchasePrice || 0;
      const value = e.quantity * purchasePrice;

      acc.lifetime += e.quantity;
      acc.lifetimeValue += value;

      if (e.date === today) {
        acc.today += e.quantity;
        acc.todayValue += value;
      }
      if (e.date.startsWith(month)) {
        acc.month += e.quantity;
        acc.monthValue += value;
      }
      if (e.date.startsWith(year)) {
        acc.year += e.quantity;
        acc.yearValue += value;
      }
      return acc;
    }, { 
      today: 0, todayValue: 0, 
      month: 0, monthValue: 0, 
      year: 0, yearValue: 0, 
      lifetime: 0, lifetimeValue: 0 
    });

    return {
      ...stats,
      totalValue: products.reduce((sum, p) => sum + (p.stock * (p.purchasePrice || 0)), 0),
      lowStockCount: products.filter(p => (p.stock || 0) <= (p.minStock || 10) && p.stock > 0).length,
      outOfStockCount: products.filter(p => (p.stock || 0) <= 0).length
    };
  }, [stockEntries, products]);

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockEntryForm.productId || stockEntryForm.quantity <= 0) return;

    const product = products.find(p => p.id === stockEntryForm.productId);
    if (!product) return;

    const newEntry: StockEntry = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      quantity: stockEntryForm.quantity,
      date: stockEntryForm.date,
      addedBy: currentStaff?.id,
      note: stockEntryForm.note
    };

    const updatedProducts = products.map(p => 
      p.id === product.id ? { ...p, stock: Number(p.stock) + Number(stockEntryForm.quantity) } : p
    );

    onStockUpdate(newEntry, updatedProducts);
    setShowStockModal(false);
    setStockEntryForm({
      productId: '',
      quantity: 0,
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products
      .filter(p => {
        if (!p) return false;
        const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
                             (p.sku || '').toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || (p.category || '').trim() === (selectedCategory || '').trim();
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  }, [products, search, selectedCategory]);

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= 0) return { label: 'Out of Stock', color: 'bg-rose-100 text-rose-600 border-rose-200' };
    if (stock <= minStock) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-600 border-amber-200' };
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // File size limit (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("ফাইলটি অনেক বড়! দয়াপি ৫ মেগাবাইটের নিচের ছবি আপলোড করুন।");
      return;
    }

    if (!storage || !auth.currentUser) {
      console.error("Firebase Storage or Auth is not initialized.", { storage: !!storage, user: !!auth.currentUser });
      alert(auth.currentUser ? "স্টোরেজ এরর: ফায়ারবেস স্টোরেজ খুঁজে পাওয়া যায়নি।" : "দয়াকরুন লগইন করে পুনরায় চেষ্টা করুন। ছবি আপলোড করার জন্য লগইন প্রয়োজন।");
      return;
    }

    setIsUploading(true);
    console.log("Starting upload:", file.name, "size:", file.size);
    console.log("Storage Bucket:", storage.app.options.storageBucket);
    
    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const bucketName = storage.app.options.storageBucket;
      const storageRef = ref(storage, `products/${fileName}`);
      
      console.log("Attempting upload to bucket:", bucketName);
      console.log("Ref path:", storageRef.fullPath);
      
      // Use uploadBytes which is more robust in some environments
      const result = await uploadBytes(storageRef, file);
      console.log("Upload success:", result.metadata.fullPath);

      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, imageUrl: url }));
      alert("ছবি সফলভাবে আপলোড হয়েছে!");
    } catch (err: any) { 
      console.error("Firebase Storage Upload Error:", err);
      let errorMsg = "ছবি আপলোড করা সম্ভব হয়নি।";
      
      if (err.code === 'storage/retry-limit-exceeded') {
        errorMsg = `সার্ভারের সাথে সংযোগ করা যাচ্ছে না। দয়া করে আপনার ইন্টারনেট চেক করুন এবং নিশ্চিত করুন যে ফায়ারবেস কনফিগারেশন সঠিক আছে।\nবাকেট: ${storage.app.options.storageBucket}`;
      } else if (err.code === 'storage/unauthorized') {
        errorMsg = "আপনার ছবি আপলোড করার অনুমতি নেই (Permission Denied)। Storage Rules আপডেট করা প্রয়োজন হতে পারে।";
      } else if (err.code === 'storage/quota-exceeded') {
        errorMsg = "আপনার ফায়ারবেস স্টোরেজ কোটা (Storage Quota) শেষ হয়ে গেছে।";
      } else if (err.code === 'storage/invalid-checksum') {
        errorMsg = "ছবির ডাটা ট্রান্সফারে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
      } else {
        errorMsg = `একটি সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}`;
      }
      
      alert(`${errorMsg}\n\nError Code: ${err.code}`); 
    } finally { 
      setIsUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting product data:", formData);
    
    const productData = { 
      ...formData, 
      id: editingId || Date.now().toString(),
      dateAdded: formData.dateAdded || new Date().toISOString()
    } as Product;

    onUpdate([productData]);
    
    setShowModal(false);
    setEditingId(null);
    setFormData({ 
      name: '', sku: '', purchasePrice: 0, salePrice: 0, wholesalePrice: 0, distributorPrice: 0, 
      unit: 'pcs', stock: 0, minStock: 10, category: 'other', imageUrl: '', status: 'active',
      dateAdded: new Date().toISOString().split('T')[0]
    });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = (e.currentTarget as any).categoryName.value;
    if (!name) return;
    
    const newCategory: ProductCategory = {
      id: Date.now().toString(),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-')
    };
    onCategoryUpdate([newCategory]);
    setShowCategoryModal(false);
  };

  const stats = useMemo(() => {
    const totalItems = products.length;
    const totalStockValue = products.reduce((sum, p) => sum + (p.stock * (p.purchasePrice || 0)), 0);
    const lowStockItems = products.filter(p => p.stock <= (p.minStock || 5)).length;

    // Stock addition analysis (from purchases)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = now.toISOString().slice(0, 7);
    const yearStr = now.toISOString().slice(0, 4);

    const additions = purchases.reduce((acc, pur) => {
      const purDate = pur.date.split('T')[0];
      const itemsQty = pur.items.reduce((s, i) => s + i.quantity, 0);
      
      acc.lifetime += itemsQty;
      if (purDate === todayStr) acc.today += itemsQty;
      if (purDate.startsWith(monthStr)) acc.month += itemsQty;
      if (purDate.startsWith(yearStr)) acc.year += itemsQty;
      
      return acc;
    }, { today: 0, month: 0, year: 0, lifetime: 0 });

    return { totalItems, totalStockValue, lowStockItems, additions };
  }, [products, purchases]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Categories</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ক্যাটাগরি ব্যবস্থাপনা</p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-8">
              <form onSubmit={handleAddCategory} className="mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">নতুন ক্যাটাগরি</label>
                <div className="flex gap-2">
                  <input name="categoryName" type="text" placeholder="ক্যাটাগরির নাম লিখুন..." className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:bg-white focus:border-primary/20 transition-all" required />
                  <button type="submit" className="bg-primary text-white p-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"><Plus size={20}/></button>
                </div>
              </form>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-slate-100 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                        <Tag size={18}/>
                      </div>
                      <span className="font-black text-slate-700">{cat.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Stock Entry Modal */}
      {showStockModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg"><Plus size={24}/></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Daily Stock Entry</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">প্রতি দিনের স্টক এড করুন</p>
                </div>
              </div>
              <button onClick={() => setShowStockModal(false)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><X size={32}/></button>
            </div>
            
            <form onSubmit={handleStockSubmit} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">পণ্য নির্বাচন করুন</label>
                <select 
                  required
                  className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                  value={stockEntryForm.productId}
                  onChange={e => setStockEntryForm({...stockEntryForm, productId: e.target.value})}
                >
                  <option value="">সিলেক্ট করুন...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock} {p.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">পরিমাণ (Quantity)</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-lg bg-slate-50 outline-none focus:bg-white transition-all"
                    value={stockEntryForm.quantity || ''}
                    onChange={e => setStockEntryForm({...stockEntryForm, quantity: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">তারিখ</label>
                  <input 
                    type="date"
                    required
                    className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-xs bg-slate-50 outline-none focus:bg-white transition-all"
                    value={stockEntryForm.date}
                    onChange={e => setStockEntryForm({...stockEntryForm, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">নোট (ঐচ্ছিক)</label>
                <input 
                  type="text"
                  placeholder="অতিরিক্ত তথ্য..."
                  className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm bg-slate-50 outline-none focus:bg-white transition-all"
                  value={stockEntryForm.note}
                  onChange={e => setStockEntryForm({...stockEntryForm, note: e.target.value})}
                />
              </div>

              <button className="w-full bg-emerald-600 text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-[4px] shadow-2xl shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-4 mt-4">
                <Save size={20}/> আপডেট স্টক
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modern Dashboard Header */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[48px] border-2 border-slate-50 shadow-sm flex items-center justify-between group">
           <div className="flex items-center gap-6">
              <div className="bg-primary p-5 rounded-[28px] text-white shadow-2xl shadow-primary/20 transition-transform group-hover:scale-110">
                <Package size={34} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">মজুদ মালামাল</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mt-2 flex items-center gap-2">
                   <TrendingUp size={12} className="text-primary"/> ইনভেন্টরি ও স্টক বিশ্লেষণ
                </p>
              </div>
           </div>
           <div className="hidden sm:flex flex-col items-end">
              <span className="text-2xl font-black text-slate-900 tracking-tighter">৳{stockStats.totalValue.toLocaleString()}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">মোট স্টক ভ্যালু</span>
           </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[48px] shadow-2xl shadow-slate-900/20 text-white relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
           <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                 <div className="p-2 bg-white/10 rounded-xl"><Plus size={16}/></div>
                 <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Add Stock</span>
              </div>
              <div className="flex justify-between items-end mt-4">
                 <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">আজকের আপডেট</h4>
                    <div className="text-4xl font-black tracking-tighter text-white">{stockStats.today} <span className="text-sm font-medium text-slate-500">Unit</span></div>
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter mt-1">Value: ৳{stockStats.todayValue.toLocaleString()}</div>
                 </div>
                 <button onClick={() => setShowStockModal(true)} className="bg-primary text-white p-4 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all">
                    <Plus size={24}/>
                 </button>
              </div>
           </div>
        </div>

        <div className="bg-white p-8 rounded-[48px] border-2 border-slate-50 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">স্টক এলার্ট</span>
              <AlertCircle size={18} className="text-amber-500"/>
           </div>
           <div className="mt-4">
              <div className="text-2xl font-black text-slate-900 tracking-tighter">{stockStats.lowStockCount}টি পণ্য</div>
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1">মজুদ ফুরিয়ে আসছে</p>
           </div>
        </div>
      </div>

      {/* Detailed Addition Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
         <div className="bg-white p-7 rounded-[40px] border-2 border-slate-50 flex flex-col items-center text-center group hover:bg-indigo-50 transition-all shadow-sm">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Clock size={24}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">আজকের স্টক</span>
            <div className="text-2xl font-black text-slate-900 tracking-tighter">{stockStats.today} Unit</div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter mt-1">Value: ৳{stockStats.todayValue.toLocaleString()}</div>
         </div>
         <div className="bg-white p-7 rounded-[40px] border-2 border-slate-50 flex flex-col items-center text-center group hover:bg-emerald-50 transition-all shadow-sm">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Calendar size={24}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">চলতি মাস</span>
            <div className="text-2xl font-black text-slate-900 tracking-tighter">{stockStats.month} Unit</div>
            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter mt-1">Value: ৳{stockStats.monthValue.toLocaleString()}</div>
         </div>
         <div className="bg-white p-7 rounded-[40px] border-2 border-slate-50 flex flex-col items-center text-center group hover:bg-amber-50 transition-all shadow-sm">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><TrendingUp size={24}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">চলতি বছর</span>
            <div className="text-2xl font-black text-slate-900 tracking-tighter">{stockStats.year} Unit</div>
            <div className="text-[10px] font-black text-amber-600 uppercase tracking-tighter mt-1">Value: ৳{stockStats.yearValue.toLocaleString()}</div>
         </div>
         <div className="bg-white p-7 rounded-[40px] border-2 border-slate-50 flex flex-col items-center text-center group hover:bg-primary/5 transition-all shadow-sm">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Package size={24}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">লাইফটাইম</span>
            <div className="text-2xl font-black text-slate-900 tracking-tighter">{stockStats.lifetime} Unit</div>
            <div className="text-[10px] font-black text-primary uppercase tracking-tighter mt-1">Value: ৳{stockStats.lifetimeValue.toLocaleString()}</div>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white p-8 rounded-[48px] border-2 border-slate-50 shadow-sm">
        <div className="flex items-center gap-6">
           <div className="bg-slate-900 p-5 rounded-3xl text-white"><LayoutGrid size={32}/></div>
           <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">ইনভেন্টরি লিস্ট</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">স্টক সমন্বয় ও ডাটা পরিবর্তন করুন</p>
           </div>
        </div>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
           <button onClick={() => setShowStockModal(true)} className="flex-1 lg:flex-none border-2 border-emerald-500 text-emerald-600 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 active-scale transition-all flex items-center justify-center gap-3">
              <Plus size={20}/> ডেইলি স্টক এড
           </button>
           <button onClick={() => setShowCategoryModal(true)} className="flex-1 lg:flex-none bg-slate-50 text-slate-600 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Categories</button>
           <button onClick={() => { setEditingId(null); setShowModal(true); }} className="flex-1 lg:flex-none bg-primary text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
              <Plus size={20}/> নতুন পণ্য এড
           </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-[36px] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row gap-5">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
          <input type="text" placeholder="পণ্য বা বারকোড খুঁজুন..." className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none font-black text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <select className="bg-slate-50 px-4 py-3 rounded-2xl font-black text-xs uppercase outline-none" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
             <option value="all">All Categories</option>
             {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          <div className="flex bg-slate-50 rounded-2xl p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={18}/></button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}><ListIcon size={18}/></button>
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white py-20 rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <Package size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">কোনো পণ্য পাওয়া যায়নি</h3>
          <p className="text-slate-400 font-bold text-sm max-w-xs">আপনার ইনভেন্টরিতে কোনো পণ্য নেই অথবা সার্চের সাথে মিলছে না।</p>
          <button onClick={() => { setEditingId(null); setShowModal(true); }} className="mt-6 bg-primary text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20">নতুন পণ্য যোগ করুন</button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(p => {
            const status = getStockStatus(p.stock, p.minStock || 5);
            return (
              <div key={p.id} className="bg-white rounded-[40px] border-2 border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all group">
                <div className="aspect-square relative overflow-hidden bg-slate-50">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package size={48} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-300">
                    <button onClick={() => { setEditingId(p.id); setFormData(p); setShowModal(true); }} className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-600 shadow-xl hover:bg-primary hover:text-white transition-all">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => { if(window.confirm('পণ্যটি মুছে ফেলতে চান?')) { if(onDelete && p.id) onDelete(p.id); onUpdate(products.filter(x => x.id !== p.id)); } }} className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-xl hover:bg-rose-500 hover:text-white transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{p.category}</p>
                    <h4 className="font-black text-slate-800 line-clamp-1">{p.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU: {p.sku || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sale Price</p>
                      <p className="text-lg font-black text-slate-800">৳{p.salePrice}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Stock</p>
                      <p className="text-lg font-black text-slate-800">{p.stock} <span className="text-[10px] font-bold opacity-50">{p.unit}</span></p>
                      <p className="text-[10px] font-black text-emerald-600 mt-1 uppercase tracking-tighter">Value: ৳{(p.stock * (p.purchasePrice || 0)).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* Detailed Stock Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                    <div className="bg-slate-50/50 p-2 rounded-xl">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Today</p>
                      <p className="text-[10px] font-black text-slate-700">{productStockStats[p.id]?.today || 0} U / ৳{(productStockStats[p.id]?.todayValue || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Month</p>
                      <p className="text-[10px] font-black text-slate-700">{productStockStats[p.id]?.month || 0} U / ৳{(productStockStats[p.id]?.monthValue || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Year</p>
                      <p className="text-[10px] font-black text-slate-700">{productStockStats[p.id]?.year || 0} U / ৳{(productStockStats[p.id]?.yearValue || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Lifetime</p>
                      <p className="text-[10px] font-black text-slate-700">{productStockStats[p.id]?.lifetime || 0} U / ৳{(productStockStats[p.id]?.lifetimeValue || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border-2 border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProducts.map(p => {
                  const status = getStockStatus(p.stock, p.minStock || 5);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={20}/></div>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">{p.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU: {p.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-800 text-sm">{p.stock} <span className="text-[10px] opacity-50">{p.unit}</span></p>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter mt-0.5">Value: ৳{(p.stock * (p.purchasePrice || 0)).toLocaleString()}</p>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">T: {productStockStats[p.id]?.today || 0}U / ৳{(productStockStats[p.id]?.todayValue || 0).toLocaleString()}</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase">M: {productStockStats[p.id]?.month || 0}U / ৳{(productStockStats[p.id]?.monthValue || 0).toLocaleString()}</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase">Y: {productStockStats[p.id]?.year || 0}U / ৳{(productStockStats[p.id]?.yearValue || 0).toLocaleString()}</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase">L: {productStockStats[p.id]?.lifetime || 0}U / ৳{(productStockStats[p.id]?.lifetimeValue || 0).toLocaleString()}</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Min: {p.minStock}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-800">Sale: ৳{p.salePrice}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Buy: ৳{p.purchasePrice}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingId(p.id); setFormData(p); setShowModal(true); }} className="p-2 text-slate-400 hover:text-primary transition-colors"><Edit size={18}/></button>
                          <button onClick={() => { if(window.confirm('পণ্যটি মুছে ফেলতে চান?')) { if(onDelete && p.id) onDelete(p.id); onUpdate(products.filter(x => x.id !== p.id)); } }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Stock Additions History */}
      <div className="bg-white rounded-[40px] border-2 border-slate-100 overflow-hidden shadow-sm mt-8">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div>
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-3">
              <History size={24} className="text-primary"/> Recent Stock History
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">সর্বশেষ স্টক যোগ করার ইতিহাস</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date & No</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Product Analysis</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Quantity</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {purchases.slice(0, 10).map(pur => (
                <tr key={pur.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="p-6">
                    <div className="text-xs font-black text-slate-800 uppercase">{pur.purchaseNo}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{pur.date}</div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {pur.items.map((item, idx) => (
                        <div key={idx} className="bg-slate-100 px-3 py-1.5 rounded-xl text-[9px] font-black text-slate-600 border border-slate-200">
                          {item.productName} (x{item.quantity})
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="text-sm font-black text-slate-800">
                      {pur.items.reduce((s, i) => s + i.quantity, 0)} <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Items</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="text-sm font-black text-emerald-700">৳{pur.total.toLocaleString()}</div>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">No stock addition history found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden modal-container">
          <div className="bg-white rounded-none sm:rounded-[48px] w-full h-full sm:max-w-4xl sm:max-h-[92vh] p-8 sm:p-12 shadow-2xl animate-in zoom-in duration-300 border-2 border-white/20 modal-content-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-10 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
                 <div className="bg-primary p-3 rounded-2xl text-white shadow-lg"><Package size={24}/></div>
                 {editingId ? 'পণ্য আপডেট করুন' : 'নতুন পণ্য যোগ করুন'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-600 transition-colors"><X size={36}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                {/* Left: Image and SKU */}
                <div className="md:col-span-4 space-y-6">
                  <div className="aspect-square bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group">
                    {formData.imageUrl ? (
                      <>
                        <img 
                          src={formData.imageUrl} 
                          className="w-full h-full object-contain p-6" 
                        />
                        <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute top-4 right-4 p-3 bg-rose-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={20}/></button>
                      </>
                    ) : (
                      <div className="text-center p-8 w-full">
                        {isUploading ? (
                          <div className="flex flex-col items-center">
                            <Loader2 size={48} className="animate-spin text-primary mb-4" />
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">আপলোড হচ্ছে...</p>
                          </div>
                        ) : (
                          <>
                            <Upload size={48} className="text-slate-300 mx-auto mb-4" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">পণ্যর ছবি আপলোড করুন</p>
                            <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
                            <div className="flex flex-col gap-2 mt-4">
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white border-2 border-slate-200 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-sm hover:bg-slate-50 transition-colors">ফাইল নির্বাচন করুন</button>
                              <div className="flex items-center gap-2 my-2">
                                <div className="h-[1px] flex-1 bg-slate-100"></div>
                                <span className="text-[8px] font-black text-slate-300 uppercase">অথবা</span>
                                <div className="h-[1px] flex-1 bg-slate-100"></div>
                              </div>
                              <input 
                                type="text" 
                                placeholder="ছবির লিঙ্ক (URL) দিন" 
                                className="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black bg-white outline-none focus:border-primary/30"
                                value={formData.imageUrl}
                                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 block">বারকোড / SKU</label>
                    <div className="relative">
                       <Tag className="absolute left-4 top-4 text-slate-400" size={18}/>
                       <input type="text" className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 font-black text-sm bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" placeholder="বারকোড স্ক্যান করুন বা লিখুন" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Right: Details */}
                <div className="md:col-span-8 space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">পণ্যের নাম</label>
                    <input required className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-base bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="পণ্যর নাম লিখুন" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">ক্যাটাগরি</label>
                      <select className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm bg-slate-50 outline-none focus:bg-white transition-all" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option value="other">অন্যান্য (Other)</option>
                        {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">ইউনিট (Unit)</label>
                      <select className="w-full border-2 border-slate-100 rounded-2xl p-4.5 bg-slate-50 font-black text-sm outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                        <option value="pcs">Pcs</option><option value="kg">Kg</option><option value="box">Box</option><option value="pkt">Pkt</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-rose-50 p-4 rounded-3xl border-2 border-rose-100">
                      <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-2 block ml-1">ক্রয় মূল্য (৳)</label>
                      <input type="number" required className="w-full bg-white border-none rounded-xl p-3 font-black text-lg text-rose-700 outline-none focus:ring-4 focus:ring-rose-500/10" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="bg-blue-50 p-4 rounded-3xl border-2 border-blue-100">
                      <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 block ml-1">খুচরা মূল্য (৳)</label>
                      <input type="number" required className="w-full bg-white border-none rounded-xl p-3 font-black text-lg text-blue-700 outline-none focus:ring-4 focus:ring-blue-500/10" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-3xl border-2 border-emerald-100">
                      <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 block ml-1">পাইকারি মূল্য (৳)</label>
                      <input type="number" required className="w-full bg-white border-none rounded-xl p-3 font-black text-lg text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/10" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="bg-amber-50 p-4 rounded-3xl border-2 border-amber-100">
                      <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2 block ml-1">ডিস্ট্রিবিউটর (৳)</label>
                      <input type="number" required className="w-full bg-white border-none rounded-xl p-3 font-black text-lg text-amber-700 outline-none focus:ring-4 focus:ring-amber-500/10" value={formData.distributorPrice} onChange={e => setFormData({...formData, distributorPrice: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">বর্তমান স্টক</label>
                      <div className="relative">
                         <LayoutGrid className="absolute left-4 top-4 text-slate-400" size={18}/>
                         <input type="number" required className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 font-black text-xl text-slate-800 bg-slate-50 outline-none focus:bg-white" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">ক্রয় তারিখ (Purchase Date)</label>
                      <div className="relative">
                         <Calendar className="absolute left-4 top-4 text-slate-400" size={18}/>
                         <input type="date" className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 font-black text-sm text-slate-800 bg-slate-50 outline-none focus:bg-white" value={formData.dateAdded?.split('T')[0]} onChange={e => setFormData({...formData, dateAdded: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                disabled={isUploading}
                className="w-full bg-primary text-white py-6 rounded-[28px] font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 uppercase tracking-widest text-sm transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24}/>}
                {isUploading ? 'ছবি আপলোড হচ্ছে...' : 'পণ্য তথ্য সংরক্ষণ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
