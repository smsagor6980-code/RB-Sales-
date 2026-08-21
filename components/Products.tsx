import React, { useState, useRef, useMemo } from 'react';
import { Product, ProductCategory, Purchase, StockEntry, Staff, ProductionBatch, Supplier } from '../types';
import { 
  Plus, Edit, Trash2, Search, X, Upload, 
  Loader2, Package, LayoutGrid, List as ListIcon,
  Tag, DollarSign, Info, AlertCircle, Save, Truck, Calendar, History, TrendingUp,
  BarChart3, Clock, CheckCircle2, ChevronRight, Calculator, Minus, Sparkles,
  Layers, Factory, ArrowRightLeft, ArrowUpRight, Check, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { storage, auth } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';

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
  suppliers?: Supplier[];
  productionBatches?: ProductionBatch[];
  onProductionBatchComplete?: (batch: ProductionBatch, updatedProducts: Product[], newEntries: StockEntry[]) => void;
  onDeleteProductionBatch?: (id: string) => void;
}

type ProductTab = 'finished_goods' | 'raw_materials' | 'production_batches' | 'stock_history';

const Products: React.FC<ProductsProps> = ({ 
  products = [], 
  onUpdate, 
  onDelete, 
  categories = [], 
  onCategoryUpdate, 
  purchases = [], 
  stockEntries = [], 
  onStockUpdate, 
  currentStaff,
  suppliers = [],
  productionBatches = [],
  onProductionBatchComplete,
  onDeleteProductionBatch
}) => {
  const [activeTab, setActiveTab] = useState<ProductTab>('finished_goods');
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [activeCategoryToUploadId, setActiveCategoryToUploadId] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Daily Stock Entry Form
  const [stockEntryForm, setStockEntryForm] = useState({
    productId: '',
    quantity: 0,
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // Product / Raw Material Add/Edit Form
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    purchasePrice: 0,
    salePrice: 0,
    wholesalePrice: 0,
    distributorPrice: 0,
    unit: 'pcs',
    stock: 0,
    minStock: 10,
    category: 'other',
    imageUrl: '',
    status: 'active',
    productType: 'finished_good',
    rawMaterialCategory: 'general',
    supplierId: '',
    supplierName: '',
    dateAdded: new Date().toISOString().split('T')[0]
  });

  // Production Batch Form
  const [batchForm, setBatchForm] = useState<{
    producedProductId: string;
    producedQuantity: number;
    unit: string;
    date: string;
    laborCost: number;
    otherCost: number;
    notes: string;
    rawMaterials: { rawMaterialId: string; quantity: number }[];
  }>({
    producedProductId: '',
    producedQuantity: 1,
    unit: 'pcs',
    date: new Date().toISOString().split('T')[0],
    laborCost: 0,
    otherCost: 0,
    notes: '',
    rawMaterials: [{ rawMaterialId: '', quantity: 1 }]
  });

  // Separate Finished Goods and Raw Materials
  const finishedGoods = useMemo(() => {
    return products.filter(p => p.productType !== 'raw_material');
  }, [products]);

  const rawMaterials = useMemo(() => {
    return products.filter(p => p.productType === 'raw_material');
  }, [products]);

  // General Inventory Stats
  const inventoryStats = useMemo(() => {
    const totalFinishedStock = finishedGoods.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const finishedStockValue = finishedGoods.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.purchasePrice) || 0)), 0);
    const finishedSalePotential = finishedGoods.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.salePrice) || 0)), 0);

    const totalRawStock = rawMaterials.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const rawStockValue = rawMaterials.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.purchasePrice) || 0)), 0);

    const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 5)).length;
    const totalBatches = productionBatches.length;

    return {
      totalFinishedStock,
      finishedStockValue,
      finishedSalePotential,
      totalRawStock,
      rawStockValue,
      lowStockCount,
      totalBatches
    };
  }, [products, finishedGoods, rawMaterials, productionBatches]);

  // Filtered Items based on active tab and search
  const displayedItems = useMemo(() => {
    const sourceList = activeTab === 'raw_materials' ? rawMaterials : finishedGoods;
    return sourceList.filter(p => {
      if (!p) return false;
      const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
                           (p.sku || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || 
                              (p.category || '').trim() === (selectedCategory || '').trim() ||
                              (p.rawMaterialCategory || '').trim() === (selectedCategory || '').trim();
      return matchesSearch && matchesCategory;
    }).sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  }, [activeTab, rawMaterials, finishedGoods, search, selectedCategory]);

  const resizeImage = (file: File, maxWidth = 300, maxHeight = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("ফাইলটি অনেক বড়! দয়া করে ৫ মেগাবাইটের নিচের ছবি আপলোড করুন।");
      return;
    }

    setIsUploading(true);

    let base64Fallback: string | null = null;
    try {
      base64Fallback = await resizeImage(file);
    } catch (err) {
      console.log("Local base64 resize failed:", err);
    }

    if (base64Fallback) {
      setFormData(prev => ({ ...prev, imageUrl: base64Fallback }));
    }

    if (storage && auth.currentUser && base64Fallback) {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const storageRef = ref(storage, `products/${fileName}`);
      
      uploadBytes(storageRef, file)
        .then(() => getDownloadURL(storageRef))
        .then((url) => {
          setFormData(prev => ({ ...prev, imageUrl: url }));
        })
        .catch((err) => {
          console.log("Firebase Storage upload skipped, using base64:", err.message || err);
        });
    }

    setIsUploading(false); 
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openAddModal = (type: 'finished_good' | 'raw_material' = 'finished_good') => {
    setEditingId(null);
    setFormData({
      name: '',
      sku: '',
      purchasePrice: 0,
      salePrice: 0,
      wholesalePrice: 0,
      distributorPrice: 0,
      unit: type === 'raw_material' ? 'kg' : 'pcs',
      stock: 0,
      minStock: 5,
      category: 'other',
      imageUrl: '',
      status: 'active',
      productType: type,
      rawMaterialCategory: 'general',
      supplierId: '',
      supplierName: '',
      dateAdded: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingId(p.id);
    setFormData({
      ...p,
      productType: p.productType || 'finished_good'
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert("পণ্যের নাম আবশ্যক।");
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
    
    const productData: Product = { 
      ...formData, 
      id: editingId || Date.now().toString(),
      name: formData.name.trim(),
      purchasePrice: Number(formData.purchasePrice) || 0,
      salePrice: Number(formData.salePrice) || 0,
      wholesalePrice: Number(formData.wholesalePrice) || 0,
      distributorPrice: Number(formData.distributorPrice) || 0,
      stock: Number(formData.stock) || 0,
      minStock: Number(formData.minStock) || 5,
      unit: formData.unit || (formData.productType === 'raw_material' ? 'kg' : 'pcs'),
      category: formData.category || 'other',
      productType: formData.productType || 'finished_good',
      supplierId: formData.supplierId || '',
      supplierName: selectedSupplier?.name || formData.supplierName || '',
      dateAdded: formData.dateAdded || new Date().toISOString()
    } as Product;

    onUpdate([productData]);
    setShowModal(false);
    setEditingId(null);
  };

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockEntryForm.productId || stockEntryForm.quantity <= 0) return;

    const product = products.find(p => p.id === stockEntryForm.productId);
    if (!product) return;

    const newEntry: StockEntry = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      quantity: Number(stockEntryForm.quantity),
      date: stockEntryForm.date,
      addedBy: currentStaff?.id,
      note: stockEntryForm.note,
      productType: product.productType || 'finished_good',
      entryType: 'manual_add',
      unit: product.unit
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
    alert(`${product.name}-এর স্টকে ${stockEntryForm.quantity} ${product.unit} যোগ করা হয়েছে।`);
  };

  // Production Batch Calculation & Submission
  const calculatedBatch = useMemo(() => {
    let totalRawMaterialCost = 0;
    const validatedMaterials = batchForm.rawMaterials.map(item => {
      const raw = rawMaterials.find(r => r.id === item.rawMaterialId);
      const qty = Number(item.quantity) || 0;
      const unitPrice = Number(raw?.purchasePrice) || 0;
      const totalCost = qty * unitPrice;
      totalRawMaterialCost += totalCost;
      return {
        rawMaterialId: item.rawMaterialId,
        rawMaterialName: raw?.name || 'Unknown Material',
        quantity: qty,
        unit: raw?.unit || 'kg',
        unitPrice,
        totalCost,
        currentStock: Number(raw?.stock) || 0
      };
    });

    const totalBatchCost = totalRawMaterialCost + (Number(batchForm.laborCost) || 0) + (Number(batchForm.otherCost) || 0);
    const producedQty = Number(batchForm.producedQuantity) || 1;
    const unitProductionCost = producedQty > 0 ? Math.round(totalBatchCost / producedQty) : 0;

    const targetProduct = finishedGoods.find(p => p.id === batchForm.producedProductId);
    const totalProducedValue = targetProduct ? (producedQty * (targetProduct.salePrice || unitProductionCost)) : (producedQty * unitProductionCost);

    return {
      validatedMaterials,
      totalRawMaterialCost,
      totalBatchCost,
      unitProductionCost,
      totalProducedValue,
      targetProduct
    };
  }, [batchForm, rawMaterials, finishedGoods]);

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.producedProductId) {
      alert("অনুগ্রহ করে উৎপাদিত ফিনিশড পণ্য নির্বাচন করুন।");
      return;
    }
    if (batchForm.producedQuantity <= 0) {
      alert("উৎপাদিত পরিমাণ সঠিক নয়।");
      return;
    }
    if (batchForm.rawMaterials.length === 0 || batchForm.rawMaterials.some(m => !m.rawMaterialId || m.quantity <= 0)) {
      alert("কমপক্ষে একটি কাঁচামাল সঠিক পরিমাণসহ নির্বাচন করুন।");
      return;
    }

    // Check raw material stock availability
    for (const mat of calculatedBatch.validatedMaterials) {
      if (mat.quantity > mat.currentStock) {
        alert(`কাঁচামাল "${mat.rawMaterialName}"-এর পর্যাপ্ত স্টক নেই! বর্তমান স্টক: ${mat.currentStock} ${mat.unit}, প্রয়োজন: ${mat.quantity} ${mat.unit}`);
        return;
      }
    }

    const batchNo = `BATCH-${Date.now().toString().slice(-6)}`;
    const newBatch: ProductionBatch = {
      id: Date.now().toString(),
      batchNo,
      date: batchForm.date,
      producedProductId: batchForm.producedProductId,
      producedProductName: calculatedBatch.targetProduct?.name || 'Produced Item',
      producedQuantity: Number(batchForm.producedQuantity),
      unit: calculatedBatch.targetProduct?.unit || batchForm.unit || 'pcs',
      unitProductionCost: calculatedBatch.unitProductionCost,
      totalProducedValue: calculatedBatch.totalProducedValue,
      rawMaterialsUsed: calculatedBatch.validatedMaterials.map(m => ({
        rawMaterialId: m.rawMaterialId,
        rawMaterialName: m.rawMaterialName,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: m.unitPrice,
        totalCost: m.totalCost
      })),
      totalRawMaterialCost: calculatedBatch.totalRawMaterialCost,
      laborCost: Number(batchForm.laborCost) || 0,
      otherCost: Number(batchForm.otherCost) || 0,
      totalBatchCost: calculatedBatch.totalBatchCost,
      notes: batchForm.notes,
      addedBy: currentStaff?.id
    };

    // Update stocks: subtract raw materials, add produced finished product
    let updatedProducts = [...products];
    
    // Deduct raw materials
    calculatedBatch.validatedMaterials.forEach(mat => {
      updatedProducts = updatedProducts.map(p => {
        if (p.id === mat.rawMaterialId) {
          return { ...p, stock: Math.max(0, Number(p.stock) - Number(mat.quantity)) };
        }
        return p;
      });
    });

    // Add finished good stock & optionally update unit purchase/production price
    updatedProducts = updatedProducts.map(p => {
      if (p.id === batchForm.producedProductId) {
        return { 
          ...p, 
          stock: Number(p.stock) + Number(batchForm.producedQuantity),
          purchasePrice: calculatedBatch.unitProductionCost > 0 ? calculatedBatch.unitProductionCost : p.purchasePrice
        };
      }
      return p;
    });

    // Generate Stock entries for audit trail
    const stockEntriesToLog: StockEntry[] = [
      {
        id: `STK-${Date.now()}-OUT`,
        productId: batchForm.producedProductId,
        productName: calculatedBatch.targetProduct?.name || 'Produced Good',
        quantity: Number(batchForm.producedQuantity),
        date: batchForm.date,
        addedBy: currentStaff?.id,
        note: `উৎপাদন ব্যাচ #${batchNo} হতে আউটপুট যোগ`,
        productType: 'finished_good',
        entryType: 'production_output',
        unit: calculatedBatch.targetProduct?.unit || 'pcs'
      }
    ];

    if (onProductionBatchComplete) {
      onProductionBatchComplete(newBatch, updatedProducts, stockEntriesToLog);
    }

    setShowBatchModal(false);
    setBatchForm({
      producedProductId: '',
      producedQuantity: 1,
      unit: 'pcs',
      date: new Date().toISOString().split('T')[0],
      laborCost: 0,
      otherCost: 0,
      notes: '',
      rawMaterials: [{ rawMaterialId: '', quantity: 1 }]
    });

    alert(`উৎপাদন ব্যাচ #${batchNo} সফলভাবে সম্পন্ন হয়েছে! ${newBatch.producedQuantity} ${newBatch.unit} ${newBatch.producedProductName} স্টকে যুক্ত করা হয়েছে।`);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Top Header Card */}
      <div className="bg-white p-8 rounded-[40px] border-2 border-slate-50 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-primary p-4 rounded-3xl text-white shadow-2xl shadow-primary/20 flex items-center justify-center">
            <Package size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">মজুদ ও উৎপাদন ইনভেন্টরি</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mt-1 flex items-center gap-2">
              <Factory size={14} className="text-primary"/> কাঁচামাল ক্রয়, ফিনিশড স্টক ও রূপান্তর ব্যবস্থাপনা
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button 
            onClick={() => openAddModal(activeTab === 'raw_materials' ? 'raw_material' : 'finished_good')}
            className="flex-1 sm:flex-none bg-primary text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18}/> {activeTab === 'raw_materials' ? 'নতুন কাঁচামাল' : 'নতুন পণ্য'}
          </button>

          <button 
            onClick={() => setShowBatchModal(true)}
            className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Factory size={18}/> উৎপাদন ব্যাচ তৈরি
          </button>

          <button 
            onClick={() => setShowStockModal(true)}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <TrendingUp size={18}/> দৈনিক স্টক এন্ট্রি
          </button>

          <button 
            onClick={() => setShowCategoryModal(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-2xl font-black text-xs uppercase transition-all flex items-center gap-2"
            title="ক্যাটাগরি পরিচালনা"
          >
            <Tag size={18}/>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-indigo-600 p-7 rounded-[36px] text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700"></div>
          <p className="text-[10px] font-black uppercase tracking-[3px] opacity-80 mb-2">📦 রেডি পণ্য স্টক ভ্যালু</p>
          <h3 className="text-3xl font-black tracking-tight">৳{inventoryStats.finishedStockValue.toLocaleString()}</h3>
          <div className="mt-4 flex items-center justify-between text-[10px] font-black bg-white/10 px-3.5 py-1.5 rounded-full">
            <span>{finishedGoods.length}টি রেডি আইটেম</span>
            <span>মোট {inventoryStats.totalFinishedStock.toLocaleString()} পিস/একক</span>
          </div>
        </div>

        <div className="bg-amber-600 p-7 rounded-[36px] text-white shadow-xl shadow-amber-600/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700"></div>
          <p className="text-[10px] font-black uppercase tracking-[3px] opacity-80 mb-2">🌾 কাঁচামাল স্টক ভ্যালু</p>
          <h3 className="text-3xl font-black tracking-tight">৳{inventoryStats.rawStockValue.toLocaleString()}</h3>
          <div className="mt-4 flex items-center justify-between text-[10px] font-black bg-white/10 px-3.5 py-1.5 rounded-full">
            <span>{rawMaterials.length} প্রকার কাঁচামাল</span>
            <span>মোট {inventoryStats.totalRawStock.toLocaleString()} ইউনিট</span>
          </div>
        </div>

        <div className="bg-emerald-600 p-7 rounded-[36px] text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700"></div>
          <p className="text-[10px] font-black uppercase tracking-[3px] opacity-80 mb-2">⚙️ উৎপাদন রূপান্তর ব্যাচ</p>
          <h3 className="text-3xl font-black tracking-tight">{inventoryStats.totalBatches} <span className="text-lg font-bold">টি ব্যাচ</span></h3>
          <div className="mt-4 flex items-center justify-between text-[10px] font-black bg-white/10 px-3.5 py-1.5 rounded-full">
            <span>কাঁচামাল রূপান্তর সম্পন্ন</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12}/> সক্রিয়</span>
          </div>
        </div>

        <div className="bg-rose-600 p-7 rounded-[36px] text-white shadow-xl shadow-rose-600/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700"></div>
          <p className="text-[10px] font-black uppercase tracking-[3px] opacity-80 mb-2">⚠️ স্টক সতর্কতা</p>
          <h3 className="text-3xl font-black tracking-tight">{inventoryStats.lowStockCount} <span className="text-lg font-bold">টি পণ্য</span></h3>
          <div className="mt-4 flex items-center justify-between text-[10px] font-black bg-white/10 px-3.5 py-1.5 rounded-full">
            <span>মজুদ সীমার নিচে</span>
            <span className="flex items-center gap-1"><AlertTriangle size={12}/> রিস্টক প্রয়োজন</span>
          </div>
        </div>
      </div>

      {/* Main Sub Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-[32px] border-2 border-slate-50 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => { setActiveTab('finished_goods'); setSelectedCategory('all'); }} 
            className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${activeTab === 'finished_goods' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <Package size={16}/> 📦 উৎপাদিত / রেডি পণ্য ({finishedGoods.length})
          </button>

          <button 
            onClick={() => { setActiveTab('raw_materials'); setSelectedCategory('all'); }} 
            className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${activeTab === 'raw_materials' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <Layers size={16}/> 🌾 কাঁচামাল স্টক ({rawMaterials.length})
          </button>

          <button 
            onClick={() => setActiveTab('production_batches')} 
            className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${activeTab === 'production_batches' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <Factory size={16}/> ⚙️ উৎপাদন ব্যাচ ইতিহাস ({productionBatches.length})
          </button>

          <button 
            onClick={() => setActiveTab('stock_history')} 
            className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${activeTab === 'stock_history' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <History size={16}/> 📜 দৈনিক স্টক এন্ট্রি লগ ({stockEntries.length})
          </button>
        </div>

        {/* View mode toggle for inventory tabs */}
        {(activeTab === 'finished_goods' || activeTab === 'raw_materials') && (
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="গ্রিড ভিউ"
            >
              <LayoutGrid size={16}/>
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="টেবিল ভিউ"
            >
              <ListIcon size={16}/>
            </button>
          </div>
        )}
      </div>

      {/* Filters & Search for Finished Goods / Raw Materials */}
      {(activeTab === 'finished_goods' || activeTab === 'raw_materials') && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 bg-white p-2 rounded-2xl border-2 border-slate-50 shadow-sm flex items-center">
            <Search size={20} className="text-slate-400 ml-4 mr-2" />
            <input 
              type="text"
              placeholder={activeTab === 'raw_materials' ? "কাঁচামালের নাম বা কোড দিয়ে খুঁজুন..." : "পণ্যের নাম, SKU বা বারকোড দিয়ে খুঁজুন..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full p-3 font-bold text-sm bg-transparent outline-none text-slate-700"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-2 text-slate-400 hover:text-rose-500 mr-2">
                <X size={16}/>
              </button>
            )}
          </div>

          <div className="md:col-span-4 bg-white p-2 rounded-2xl border-2 border-slate-50 shadow-sm flex items-center">
            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full p-3 font-bold text-sm bg-transparent outline-none text-slate-700 cursor-pointer"
            >
              <option value="all">সব ক্যাটাগরি ({displayedItems.length})</option>
              {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* TAB 1 & 2: Inventory Items (Finished Goods or Raw Materials) */}
      {(activeTab === 'finished_goods' || activeTab === 'raw_materials') && (
        <>
          {displayedItems.length === 0 ? (
            <div className="bg-white p-16 rounded-[40px] text-center border-2 border-slate-50 shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-4">
                <Package size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-700">কোনো আইটেম পাওয়া যায়নি</h3>
              <p className="text-xs font-bold text-slate-400 mt-1 max-w-sm mx-auto">
                {activeTab === 'raw_materials' 
                  ? 'নতুন কাঁচামাল যোগ করুন অথবা সাপ্লায়ার থেকে কাঁচামাল ক্রয় করুন।' 
                  : 'নতুন উৎপাদিত পণ্য যোগ করুন অথবা উৎপাদন ব্যাচ তৈরি করুন।'}
              </p>
              <button 
                onClick={() => openAddModal(activeTab === 'raw_materials' ? 'raw_material' : 'finished_good')}
                className="mt-6 bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                + নতুন আইটেম যুক্ত করুন
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayedItems.map(p => {
                const isRaw = p.productType === 'raw_material';
                const isLow = (Number(p.stock) || 0) <= (Number(p.minStock) || 5);
                return (
                  <div 
                    key={p.id} 
                    className="bg-white rounded-[32px] p-6 border-2 border-slate-50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Image / Icon Banner */}
                      <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden relative flex items-center justify-center group-hover:scale-[1.02] transition-transform">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-2" />
                        ) : (
                          <div className={`p-6 rounded-3xl ${isRaw ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                            {isRaw ? <Layers size={40}/> : <Package size={40}/>}
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${isRaw ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'}`}>
                            {isRaw ? '🌾 কাঁচামাল' : '📦 রেডি পণ্য'}
                          </span>
                        </div>
                        {isLow && (
                          <div className="absolute top-3 right-3">
                            <span className="bg-rose-500 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm animate-pulse">
                              <AlertTriangle size={10}/> লো স্টক
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-black text-slate-800 text-base line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h4>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          ক্যাটাগরি: <span className="text-slate-600 font-black">{p.category || p.rawMaterialCategory || 'সাধারণ'}</span>
                        </p>
                        {p.sku && (
                          <p className="text-[9px] font-black text-slate-400 bg-slate-50 w-fit px-2 py-0.5 rounded-md uppercase">
                            SKU: {p.sku}
                          </p>
                        )}
                      </div>

                      {/* Pricing Details */}
                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl">
                          <span className="text-[9px] font-black text-slate-400 uppercase block">ক্রয়/উৎপাদন খরচ</span>
                          <span className="font-black text-slate-800">৳{(p.purchasePrice || 0).toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-slate-400 ml-1">/{p.unit}</span>
                        </div>

                        {!isRaw ? (
                          <div className="bg-primary/5 p-2.5 rounded-xl">
                            <span className="text-[9px] font-black text-primary uppercase block">বিক্রয় মূল্য</span>
                            <span className="font-black text-primary">৳{(p.salePrice || 0).toLocaleString()}</span>
                          </div>
                        ) : (
                          <div className="bg-amber-50 p-2.5 rounded-xl">
                            <span className="text-[9px] font-black text-amber-600 uppercase block">মজুদ ভ্যালু</span>
                            <span className="font-black text-amber-700">৳{((p.stock || 0) * (p.purchasePrice || 0)).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Stock Badge */}
                      <div className="mt-3 flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase">বর্তমান মজুদ:</span>
                        <span className={`text-sm font-black ${isLow ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {p.stock} <span className="text-[10px] font-bold text-slate-500 uppercase">{p.unit}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button 
                        onClick={() => openEditModal(p)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit size={14}/> এডিট
                      </button>
                      {onDelete && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`আপনি কি নিশ্চিত "${p.name}" মুছে ফেলতে চান?`)) {
                              onDelete(p.id);
                            }
                          }}
                          className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-[36px] border-2 border-slate-50 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-5">আইটেম ও ছবি</th>
                      <th className="p-5">টাইপ</th>
                      <th className="p-5">ক্যাটাগরি</th>
                      <th className="p-5">ক্রয়/উৎপাদন দর</th>
                      {activeTab === 'finished_goods' && <th className="p-5">বিক্রয় মূল্য</th>}
                      <th className="p-5">বর্তমান মজুদ</th>
                      <th className="p-5">মোট মজুদ ভ্যালু</th>
                      <th className="p-5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {displayedItems.map(p => {
                      const isRaw = p.productType === 'raw_material';
                      const isLow = (Number(p.stock) || 0) <= (Number(p.minStock) || 5);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  isRaw ? <Layers size={18} className="text-amber-600"/> : <Package size={18} className="text-primary"/>
                                )}
                              </div>
                              <div>
                                <span className="font-black text-slate-800 block">{p.name}</span>
                                {p.sku && <span className="text-[10px] font-bold text-slate-400">SKU: {p.sku}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${isRaw ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {isRaw ? 'কাঁচামাল' : 'রেডি পণ্য'}
                            </span>
                          </td>
                          <td className="p-5 font-bold text-slate-600 text-xs">{p.category || p.rawMaterialCategory || 'সাধারণ'}</td>
                          <td className="p-5 font-black text-slate-800">৳{(p.purchasePrice || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">/{p.unit}</span></td>
                          {activeTab === 'finished_goods' && (
                            <td className="p-5 font-black text-primary">৳{(p.salePrice || 0).toLocaleString()}</td>
                          )}
                          <td className="p-5">
                            <span className={`font-black ${isLow ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {p.stock} {p.unit}
                            </span>
                          </td>
                          <td className="p-5 font-black text-slate-800">৳{((p.stock || 0) * (p.purchasePrice || 0)).toLocaleString()}</td>
                          <td className="p-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditModal(p)} className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"><Edit size={16}/></button>
                              {onDelete && (
                                <button onClick={() => window.confirm(`"${p.name}" মুছবেন?`) && onDelete(p.id)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"><Trash2 size={16}/></button>
                              )}
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
        </>
      )}

      {/* TAB 3: Production Batches History */}
      {activeTab === 'production_batches' && (
        <div className="bg-white rounded-[36px] border-2 border-slate-50 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/40">
            <div>
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2">
                <Factory size={22} className="text-indigo-600"/> উৎপাদন ব্যাচ ও রূপান্তর ইতিহাস
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">কাঁচামাল খরচ করে প্রস্তুতকৃত পণ্যসমূহের লগ</p>
            </div>
            <button 
              onClick={() => setShowBatchModal(true)}
              className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={16}/> নতুন ব্যাচ রূপান্তর
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-5">ব্যাচ নং ও তারিখ</th>
                  <th className="p-5">উৎপাদিত পণ্য</th>
                  <th className="p-5">ব্যবহৃত কাঁচামাল</th>
                  <th className="p-5">কাঁচামাল খরচ</th>
                  <th className="p-5">মজুরি/অন্যান্য</th>
                  <th className="p-5">মোট ব্যাচ খরচ</th>
                  <th className="p-5">ইউনিট উৎপাদন দর</th>
                  <th className="p-5 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {productionBatches.map(batch => (
                  <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5">
                      <span className="font-black text-indigo-600 uppercase block">{batch.batchNo}</span>
                      <span className="text-[10px] font-bold text-slate-400">{batch.date}</span>
                    </td>
                    <td className="p-5">
                      <span className="font-black text-slate-800 block">{batch.producedProductName}</span>
                      <span className="text-xs font-black text-emerald-700">+{batch.producedQuantity} {batch.unit}</span>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {batch.rawMaterialsUsed?.map((mat, idx) => (
                          <span key={idx} className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            {mat.rawMaterialName} ({mat.quantity} {mat.unit})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-5 font-black text-slate-800">৳{(batch.totalRawMaterialCost || 0).toLocaleString()}</td>
                    <td className="p-5 font-bold text-slate-600">৳{((batch.laborCost || 0) + (batch.otherCost || 0)).toLocaleString()}</td>
                    <td className="p-5 font-black text-indigo-700">৳{(batch.totalBatchCost || 0).toLocaleString()}</td>
                    <td className="p-5 font-black text-emerald-700">৳{(batch.unitProductionCost || 0).toLocaleString()}/{batch.unit}</td>
                    <td className="p-5 text-right">
                      {onDeleteProductionBatch && (
                        <button 
                          onClick={() => window.confirm(`ব্যাচ #${batch.batchNo} মুছে ফেলতে চান?`) && onDeleteProductionBatch(batch.id)}
                          className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"
                          title="ব্যাচ মুছুন"
                        >
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {productionBatches.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-slate-400 font-bold text-xs">
                      এখনো কোনো উৎপাদন ব্যাচ রেকর্ড করা হয়নি। "নতুন ব্যাচ রূপান্তর" বাটনে ক্লিক করে তৈরি করুন।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Stock History */}
      {activeTab === 'stock_history' && (
        <div className="bg-white rounded-[36px] border-2 border-slate-50 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/40">
            <div>
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2">
                <History size={22} className="text-primary"/> দৈনিক স্টক এন্ট্রি ও সাপ্লায়ার ক্রয় লগ
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">স্টক সমন্বয় ও ক্রয়ের বিস্তারিত ইতিহাস</p>
            </div>
            <button 
              onClick={() => setShowStockModal(true)}
              className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={16}/> দৈনিক স্টক যোগ
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-5">তারিখ</th>
                  <th className="p-5">পণ্যের নাম</th>
                  <th className="p-5">ধরণ</th>
                  <th className="p-5">পরিমাণ</th>
                  <th className="p-5">এন্ট্রি ধরণ</th>
                  <th className="p-5">মন্তব্য / নোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {stockEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 font-bold text-slate-500 text-xs">{entry.date}</td>
                    <td className="p-5 font-black text-slate-800">{entry.productName}</td>
                    <td className="p-5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${entry.productType === 'raw_material' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {entry.productType === 'raw_material' ? 'কাঁচামাল' : 'রেডি পণ্য'}
                      </span>
                    </td>
                    <td className="p-5 font-black text-emerald-700">+{entry.quantity} {entry.unit || 'pcs'}</td>
                    <td className="p-5 font-bold text-slate-600 text-xs">
                      {entry.entryType === 'production_output' ? '⚙️ উৎপাদন আউটপুট' : '📦 ম্যানুয়াল স্টক ইন'}
                    </td>
                    <td className="p-5 text-slate-400 text-xs">{entry.note || '—'}</td>
                  </tr>
                ))}
                {stockEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-400 font-bold text-xs">
                      কোনো স্টক এন্ট্রি হিস্ট্রি পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Product / Raw Material Add & Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] w-full max-w-3xl p-8 sm:p-10 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl text-white ${formData.productType === 'raw_material' ? 'bg-amber-500' : 'bg-primary'}`}>
                  {formData.productType === 'raw_material' ? <Layers size={24}/> : <Package size={24}/>}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">
                    {editingId ? (formData.productType === 'raw_material' ? 'কাঁচামাল আপডেট' : 'পণ্য আপডেট') : (formData.productType === 'raw_material' ? 'নতুন কাঁচামাল যোগ' : 'নতুন উৎপাদিত পণ্য যোগ')}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">মজুদ বিবরণী ফরম</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500 p-2 rounded-xl transition-colors"><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type Switcher */}
              <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setFormData(prev => ({ ...prev, productType: 'finished_good', unit: prev.unit === 'kg' ? 'pcs' : prev.unit }))}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${formData.productType !== 'raw_material' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                >
                  <Package size={16}/> 📦 উৎপাদিত / রেডি পণ্য
                </button>
                <button 
                  type="button" 
                  onClick={() => setFormData(prev => ({ ...prev, productType: 'raw_material', unit: prev.unit === 'pcs' ? 'kg' : prev.unit }))}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${formData.productType === 'raw_material' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  <Layers size={16}/> 🌾 কাঁচামাল (Raw Material)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    {formData.productType === 'raw_material' ? 'কাঁচামালের নাম *' : 'পণ্যের নাম *'}
                  </label>
                  <input 
                    required 
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none focus:bg-white focus:border-primary/30 transition-all"
                    placeholder={formData.productType === 'raw_material' ? "যেমন: তুলা, র সুতা, প্লাস্টিক দানা, চিনি..." : "যেমন: টি-শার্ট, জুস, বিস্কুট..."}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">বারকোড / SKU / কোড</label>
                  <input 
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none focus:bg-white focus:border-primary/30 transition-all"
                    placeholder="বারকোড বা আইটেম কোড..."
                    value={formData.sku || ''}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ক্যাটাগরি</label>
                  <select 
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none focus:bg-white cursor-pointer"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="other">অন্যান্য (General)</option>
                    {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">একক / পরিমাপক (Unit)</label>
                  <select 
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none focus:bg-white cursor-pointer"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                  >
                    <option value="pcs">Pcs (পিস)</option>
                    <option value="kg">Kg (কেজি)</option>
                    <option value="gm">Gm (গ্রাম)</option>
                    <option value="liter">Liter (লিটার)</option>
                    <option value="meter">Meter (মিটার)</option>
                    <option value="bag">Bag (বস্তা)</option>
                    <option value="box">Box (বক্স)</option>
                    <option value="pkt">Pkt (প্যাকেট)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">সাপ্লায়ার / সরবরাহকারী</label>
                  <select 
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none focus:bg-white cursor-pointer"
                    value={formData.supplierId || ''}
                    onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                  >
                    <option value="">কোনো নির্দিষ্ট সাপ্লায়ার নেই</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.companyName || s.phone})</option>)}
                  </select>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100">
                  <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1 block">
                    {formData.productType === 'raw_material' ? 'ক্রয়মূল্য প্রতি ইউনিট (৳) *' : 'ক্রয়/উৎপাদন খরচ (৳)'}
                  </label>
                  <input 
                    type="number"
                    required
                    min="0"
                    step="any"
                    className="w-full bg-white border-none rounded-xl p-3 font-black text-lg text-rose-700 outline-none"
                    value={formData.purchasePrice || ''}
                    onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {formData.productType !== 'raw_material' ? (
                  <>
                    <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100">
                      <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1 block">খুচরা বিক্রয় মূল্য (৳) *</label>
                      <input 
                        type="number"
                        required
                        min="0"
                        step="any"
                        className="w-full bg-white border-none rounded-xl p-3 font-black text-lg text-blue-700 outline-none"
                        value={formData.salePrice || ''}
                        onChange={e => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100">
                      <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 block">পাইকারি মূল্য (৳)</label>
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        className="w-full bg-white border-none rounded-xl p-3 font-black text-lg text-emerald-700 outline-none"
                        value={formData.wholesalePrice || ''}
                        onChange={e => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2 bg-amber-50/70 p-4 rounded-2xl border border-amber-100 flex flex-col justify-center">
                    <span className="text-[10px] font-black text-amber-700 uppercase">💡 কাঁচামাল নোট</span>
                    <p className="text-xs text-amber-900 mt-1 font-bold">
                      কাঁচামাল সরাসরি বিক্রির জন্য নয়; এটি উৎপাদন ব্যাচে খরচ হবে এবং সাপ্লায়ার থেকে ক্রয় করা হবে।
                    </p>
                  </div>
                )}
              </div>

              {/* Stock and Min Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">প্রারম্ভিক / বর্তমান মজুদ</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    step="any"
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-lg bg-slate-50 outline-none focus:bg-white"
                    value={formData.stock || ''}
                    onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">সর্বনিম্ন মজুদ সতর্কতা (Min Alert)</label>
                  <input 
                    type="number"
                    min="0"
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-lg bg-slate-50 outline-none focus:bg-white"
                    value={formData.minStock || ''}
                    onChange={e => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18}/> {editingId ? 'পরিবর্তন সংরক্ষণ করুন' : 'আইটেম যুক্ত করুন'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: Production Batch Converter (Manufacturing) */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] w-full max-w-4xl p-8 sm:p-10 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                  <Factory size={24}/>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">নতুন উৎপাদন ব্যাচ তৈরি</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">কাঁচামাল খরচ করে উৎপাদিত পণ্য তৈরি ও স্বয়ংক্রিয় স্টক সমন্বয়</p>
                </div>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-rose-500 p-2 rounded-xl transition-colors"><X size={24}/></button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-8">
              {/* Output Finished Product */}
              <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 space-y-4">
                <h4 className="font-black text-indigo-900 text-xs uppercase tracking-widest flex items-center gap-2">
                  <Package size={16}/> ১. উৎপাদিত ফিনিশড পণ্য নির্বাচন করুন
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">টার্গেট রেডি পণ্য *</label>
                    <select 
                      required
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
                      value={batchForm.producedProductId}
                      onChange={e => {
                        const target = finishedGoods.find(f => f.id === e.target.value);
                        setBatchForm(prev => ({
                          ...prev,
                          producedProductId: e.target.value,
                          unit: target?.unit || prev.unit
                        }));
                      }}
                    >
                      <option value="">উৎপাদিত পণ্য সিলেক্ট করুন...</option>
                      {finishedGoods.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (বর্তমান স্টক: {p.stock} {p.unit})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">উৎপাদিত পরিমাণ *</label>
                    <input 
                      type="number"
                      required
                      min="1"
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 font-black text-base text-indigo-700 outline-none focus:border-indigo-500"
                      value={batchForm.producedQuantity || ''}
                      onChange={e => setBatchForm(prev => ({ ...prev, producedQuantity: parseFloat(e.target.value) || 0 }))}
                      placeholder="পরিমাণ"
                    />
                  </div>
                </div>
              </div>

              {/* Raw Materials Consumed */}
              <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-amber-900 text-xs uppercase tracking-widest flex items-center gap-2">
                    <Layers size={16}/> ২. ব্যবহৃত কাঁচামালসমূহ যোগ করুন
                  </h4>
                  <button 
                    type="button"
                    onClick={() => setBatchForm(prev => ({
                      ...prev,
                      rawMaterials: [...prev.rawMaterials, { rawMaterialId: '', quantity: 1 }]
                    }))}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all"
                  >
                    <Plus size={14}/> আরও কাঁচামাল যোগ
                  </button>
                </div>

                {batchForm.rawMaterials.map((item, index) => {
                  const raw = rawMaterials.find(r => r.id === item.rawMaterialId);
                  const lineCost = (Number(item.quantity) || 0) * (Number(raw?.purchasePrice) || 0);
                  const isStockShort = raw && Number(item.quantity) > Number(raw.stock);

                  return (
                    <div key={index} className="bg-white p-4 rounded-2xl border border-amber-200/60 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-5 space-y-1">
                        <select 
                          required
                          className="w-full border-2 border-slate-100 rounded-xl p-3 font-bold text-xs bg-slate-50 outline-none cursor-pointer"
                          value={item.rawMaterialId}
                          onChange={e => {
                            const newMat = [...batchForm.rawMaterials];
                            newMat[index].rawMaterialId = e.target.value;
                            setBatchForm(prev => ({ ...prev, rawMaterials: newMat }));
                          }}
                        >
                          <option value="">কাঁচামাল নির্বাচন করুন...</option>
                          {rawMaterials.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} (মজুদ: {r.stock} {r.unit} | দর: ৳{r.purchasePrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            required
                            min="0.01"
                            step="any"
                            placeholder="ব্যবহৃত পরিমাণ"
                            className="w-full border-2 border-slate-100 rounded-xl p-3 font-bold text-xs bg-slate-50 outline-none"
                            value={item.quantity || ''}
                            onChange={e => {
                              const newMat = [...batchForm.rawMaterials];
                              newMat[index].quantity = parseFloat(e.target.value) || 0;
                              setBatchForm(prev => ({ ...prev, rawMaterials: newMat }));
                            }}
                          />
                          <span className="text-[10px] font-black text-slate-400 uppercase">{raw?.unit || 'unit'}</span>
                        </div>
                      </div>

                      <div className="sm:col-span-3 font-black text-xs text-amber-900 flex flex-col justify-center">
                        <span>খরচ: ৳{lineCost.toLocaleString()}</span>
                        {isStockShort && <span className="text-[9px] text-rose-500 font-bold">⚠️ স্টকে কম আছে</span>}
                      </div>

                      <div className="sm:col-span-1 text-right">
                        {batchForm.rawMaterials.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => {
                              const newMat = batchForm.rawMaterials.filter((_, i) => i !== index);
                              setBatchForm(prev => ({ ...prev, rawMaterials: newMat }));
                            }}
                            className="p-2 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                          >
                            <Trash2 size={16}/>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extra Costs & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">মজুরি ও লেবার খরচ (৳)</label>
                  <input 
                    type="number"
                    min="0"
                    step="any"
                    className="w-full border-2 border-slate-100 rounded-2xl p-3.5 font-bold text-sm bg-slate-50 outline-none"
                    value={batchForm.laborCost || ''}
                    onChange={e => setBatchForm(prev => ({ ...prev, laborCost: parseFloat(e.target.value) || 0 }))}
                    placeholder="মজুরি খরচ..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">বিদ্যুৎ/প্যাকিং/অন্যান্য (৳)</label>
                  <input 
                    type="number"
                    min="0"
                    step="any"
                    className="w-full border-2 border-slate-100 rounded-2xl p-3.5 font-bold text-sm bg-slate-50 outline-none"
                    value={batchForm.otherCost || ''}
                    onChange={e => setBatchForm(prev => ({ ...prev, otherCost: parseFloat(e.target.value) || 0 }))}
                    placeholder="অন্যান্য খরচ..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">উৎপাদন তারিখ</label>
                  <input 
                    type="date"
                    required
                    className="w-full border-2 border-slate-100 rounded-2xl p-3.5 font-bold text-sm bg-slate-50 outline-none"
                    value={batchForm.date}
                    onChange={e => setBatchForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Batch Financial Summary Box */}
              <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400">উৎপাদন ব্যাচ সারসংক্ষেপ</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-black pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold">কাঁচামাল মোট ব্যয়</span>
                    <span className="text-amber-400 text-base">৳{calculatedBatch.totalRawMaterialCost.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold">মজুরি ও অতিরিক্ত খরচ</span>
                    <span className="text-blue-400 text-base">৳{((Number(batchForm.laborCost) || 0) + (Number(batchForm.otherCost) || 0)).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold">মোট ব্যাচ উৎপাদন খরচ</span>
                    <span className="text-emerald-400 text-base">৳{calculatedBatch.totalBatchCost.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold">প্রতি ইউনিট উৎপাদন দর</span>
                    <span className="text-white text-base">৳{calculatedBatch.unitProductionCost.toLocaleString()}/{batchForm.unit}</span>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18}/> উৎপাদন ব্যাচ সম্পন্ন করুন ও স্টক সমন্বয় করুন
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: Stock Quick Entry */}
      {showStockModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg"><Plus size={20}/></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase">দৈনিক স্টক এন্ট্রি</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">পণ্য বা কাঁচামালে দ্রুত স্টক যোগ করুন</p>
                </div>
              </div>
              <button onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-rose-500 p-2 rounded-xl transition-all"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleStockSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">পণ্য বা কাঁচামাল নির্বাচন করুন *</label>
                <select 
                  required
                  className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none focus:bg-white cursor-pointer"
                  value={stockEntryForm.productId}
                  onChange={e => setStockEntryForm({ ...stockEntryForm, productId: e.target.value })}
                >
                  <option value="">সিলেক্ট করুন...</option>
                  <optgroup label="📦 উৎপাদিত / রেডি পণ্য">
                    {finishedGoods.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (মজুদ: {p.stock} {p.unit})</option>
                    ))}
                  </optgroup>
                  <optgroup label="🌾 কাঁচামাল (Raw Materials)">
                    {rawMaterials.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (মজুদ: {p.stock} {p.unit})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">পরিমাণ (Quantity) *</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-lg bg-slate-50 outline-none focus:bg-white"
                    value={stockEntryForm.quantity || ''}
                    onChange={e => setStockEntryForm({ ...stockEntryForm, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">তারিখ *</label>
                  <input 
                    type="date"
                    required
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-xs bg-slate-50 outline-none focus:bg-white"
                    value={stockEntryForm.date}
                    onChange={e => setStockEntryForm({ ...stockEntryForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">মন্তব্য / নোট (ঐচ্ছিক)</label>
                <input 
                  type="text"
                  placeholder="স্টক যোগ করার কারণ বা নোট..."
                  className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none focus:bg-white"
                  value={stockEntryForm.note}
                  onChange={e => setStockEntryForm({ ...stockEntryForm, note: e.target.value })}
                />
              </div>

              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                <Save size={18}/> স্টক আপডেট করুন
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 4: Category Management */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Categories</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ক্যাটাগরি ব্যবস্থাপনা</p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={18}/></button>
            </div>

            <form onSubmit={handleAddCategory} className="mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">নতুন ক্যাটাগরি</label>
              <div className="flex gap-2">
                <input name="categoryName" type="text" placeholder="ক্যাটাগরির নাম লিখুন..." className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:bg-white" required />
                <button type="submit" className="bg-primary text-white p-3.5 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"><Plus size={18}/></button>
              </div>
            </form>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-slate-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm overflow-hidden">
                      {cat.imageUrl ? <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" /> : <Tag size={14}/>}
                    </div>
                    <span className="font-black text-xs text-slate-700">{cat.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Products;
