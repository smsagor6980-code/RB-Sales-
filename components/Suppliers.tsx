import React, { useState, useMemo } from 'react';
import { Supplier, Product, Purchase, PurchaseItem, ProductCategory, SupplierPayment, ShopSettings } from '../types';
import { 
  Plus, Edit, Trash2, Search, X, Truck, Phone, Building2, 
  DollarSign, Save, ShoppingBag, History, User, Package,
  TrendingUp, Calendar, Info, Check, Minus, Filter, LayoutGrid, Zap,
  ArrowUpRight, CreditCard, Wallet, Calculator, FileText, Printer,
  AlertCircle, ArrowRightLeft, ArrowDown, ArrowUp, ArrowRight, ChevronDown
} from 'lucide-react';

interface SuppliersProps {
  suppliers: Supplier[];
  products: Product[];
  purchases: Purchase[];
  payments?: SupplierPayment[];
  onUpdate: (suppliers: Supplier[]) => void;
  onPurchaseComplete: (purchase: Purchase, suppliers: Supplier[], products: Product[]) => void;
  onPayment?: (payment: SupplierPayment, suppliers: Supplier[]) => void;
  onDelete?: (id: string) => void;
  categories: ProductCategory[];
  isAdmin?: boolean;
  shopSettings?: ShopSettings;
}

const Suppliers: React.FC<SuppliersProps> = ({ 
  suppliers, 
  products, 
  purchases, 
  payments = [],
  onUpdate, 
  onPurchaseComplete, 
  onPayment,
  onDelete,
  categories = [],
  isAdmin = false,
  shopSettings
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showProfile, setShowProfile] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [showPurchaseDetails, setShowPurchaseDetails] = useState<Purchase | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'paid'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profilePeriod, setProfilePeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  // Purchase Modal State
  const [purchaseCart, setPurchaseCart] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState('all');
  const [paidInput, setPaidInput] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toLocaleDateString('en-CA'));

  // Payment Modal State
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payNote, setPayNote] = useState('');

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '', phone: '', companyName: '', address: '', dueAmount: 0,
    dateAdded: new Date().toISOString().split('T')[0]
  });

  const generateId = (prefix: string = '') => {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Accounts Ledger Calculations
  const ledgerStats = useMemo(() => {
    return {
      totalSuppliers: suppliers.length,
      totalDue: suppliers.reduce((sum, s) => sum + (s.dueAmount || 0), 0),
      totalPurchase: suppliers.reduce((sum, s) => sum + (s.totalPurchase || 0), 0),
      dueSuppliers: suppliers.filter(s => (s.dueAmount || 0) > 0).length
    };
  }, [suppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                           s.phone.includes(search) ||
                           (s.companyName || '').toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' ? true : 
                           statusFilter === 'due' ? (s.dueAmount || 0) > 0 : 
                           (s.dueAmount || 0) <= 0;
      
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, search, statusFilter]);

  const activeSupplier = suppliers.find(s => s.id === showProfile || s.id === showPaymentModal);

  const activeSupplierLifetimePurchase = useMemo(() => {
    if (!showProfile) return 0;
    return purchases
      .filter(p => p.supplierId === showProfile)
      .reduce((sum, p) => sum + (p.total || 0), 0);
  }, [purchases, showProfile]);

  const activeSupplierLedger = useMemo(() => {
    if (!showProfile) return [];
    
    const supplierPurchases = purchases
      .filter(p => p.supplierId === showProfile)
      .map(p => ({
        id: p.id,
        date: p.date,
        type: 'purchase' as const,
        description: `Purchase #${p.purchaseNo}`,
        amount: p.total,
        debit: p.total, // Purchase increases due (liability)
        credit: 0,
        originalData: p
      }));
      
    const supplierPayments = payments
      .filter(p => p.supplierId === showProfile)
      .map(p => ({
        id: p.id,
        date: p.date,
        type: 'payment' as const,
        description: `Payment (${p.method}) ${p.note ? `- ${p.note}` : ''}`,
        amount: p.amount,
        debit: 0,
        credit: p.amount, // Payment decreases due
        originalData: null
      }));
      
    return [...supplierPurchases, ...supplierPayments].sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases, payments, showProfile]);

  const filteredLedger = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const ledger = activeSupplierLedger.filter(item => {
      if (profilePeriod === 'all') return true;
      if (profilePeriod === 'today') return item.date === todayStr || item.date.startsWith(todayStr);
      if (profilePeriod === 'month') return item.date.startsWith(todayStr.substring(0, 7));
      if (profilePeriod === 'year') return item.date.startsWith(todayStr.substring(0, 4));
      return true;
    });

    let runningBalance = 0;
    const oldestFirst = [...activeSupplierLedger].sort((a, b) => a.date.localeCompare(b.date));
    const balanceMap: Record<string, number> = {};
    
    oldestFirst.forEach(item => {
      if (item.type === 'purchase') runningBalance += item.amount;
      else runningBalance -= item.amount;
      balanceMap[item.id] = runningBalance;
    });

    return ledger.map(item => ({ ...item, balance: balanceMap[item.id] || 0 }));
  }, [activeSupplierLedger, profilePeriod]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supplierData = { 
      ...formData as Supplier, 
      id: editingId || `SUP-${Date.now()}`, 
      dateAdded: formData.dateAdded || new Date().toISOString(), 
      totalPurchase: formData.totalPurchase || 0 
    };

    if (editingId) {
      onUpdate([{ ...suppliers.find(s => s.id === editingId), ...formData } as Supplier]);
    } else {
      onUpdate([supplierData]);
    }
    setShowModal(false);
    resetForm();
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;

    const updatedSupplier: Supplier = {
      ...activeSupplier,
      dueAmount: Math.max(0, (activeSupplier.dueAmount || 0) - amount)
    };

    if (onPayment) {
      const newPayment: SupplierPayment = {
        id: `PAY-${Date.now()}`,
        supplierId: activeSupplier.id,
        amount,
        method: payMethod,
        date: new Date().toISOString().split('T')[0],
        note: payNote
      };
      onPayment(newPayment, [updatedSupplier]);
    } else {
      onUpdate([updatedSupplier]);
    }
    
    setShowPaymentModal(null);
    setPayAmount('');
    setPayNote('');
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', companyName: '', address: '', dueAmount: 0, dateAdded: new Date().toISOString().split('T')[0] });
    setEditingId(null);
  };

  // Purchase Logic
  const addToPurchaseCart = (p: Product) => {
    setPurchaseCart(prev => {
      const existing = prev.find(item => item.productId === p.id);
      const unitPrice = p.purchasePrice || 0;
      if (existing) {
        return prev.map(item => item.productId === p.id ? { ...item, quantity: item.quantity + 1, total: Math.round((item.quantity + 1) * item.unitPrice) } : item);
      }
      return [...prev, {
        id: `PC-${Date.now()}`,
        productId: p.id,
        productName: p.name,
        quantity: 1,
        unitPrice,
        total: unitPrice
      }];
    });
  };

  const updatePurchaseQty = (id: string, qty: number) => {
    setPurchaseCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, qty), total: Math.round(Math.max(1, qty) * item.unitPrice) } : item));
  };

  const updatePurchasePrice = (id: string, price: number) => {
    setPurchaseCart(prev => prev.map(item => item.id === id ? { ...item, unitPrice: price, total: Math.round(item.quantity * price) } : item));
  };

  const purchaseTotal = Math.round(purchaseCart.reduce((sum, item) => sum + item.total, 0));
  const paidAmount = parseFloat(paidInput) || 0;
  const purchaseDue = Math.max(0, purchaseTotal - paidAmount);

  const displayPurchaseProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes(productSearch.toLowerCase());
        const matchesCategory = purchaseCategory === 'all' || p.category === purchaseCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  }, [products, productSearch, purchaseCategory]);

  const completePurchase = () => {
    if (!activeSupplier || purchaseCart.length === 0) return;

    const newPurchase: Purchase = {
      id: Date.now().toString(),
      purchaseNo: `PUR-${Date.now().toString().slice(-6)}`,
      supplierId: activeSupplier.id,
      date: purchaseDate,
      items: purchaseCart,
      total: purchaseTotal,
      paid: paidAmount,
      due: purchaseDue,
      status: purchaseDue > 0 ? 'due' : 'paid'
    };

    const updatedSuppliers = suppliers.map(s => {
      if (s.id === activeSupplier.id) {
        return {
          ...s,
          dueAmount: (s.dueAmount || 0) + purchaseDue,
          totalPurchase: (s.totalPurchase || 0) + purchaseTotal
        };
      }
      return s;
    });

    const updatedProducts = products.map(p => {
      const cartItem = purchaseCart.find(item => item.productId === p.id);
      if (cartItem) {
        return { 
          ...p, 
          purchasePrice: cartItem.unitPrice
        };
      }
      return p;
    });

    onPurchaseComplete(newPurchase, updatedSuppliers, updatedProducts);
    setShowPurchaseModal(false);
    setPurchaseCart([]);
    setPaidInput('');
  };

  const handleDownloadLedger = () => {
    if (!showProfile || !activeSupplier) return;
    
    const element = document.getElementById('supplier-ledger-content');
    if (!element) return;

    // @ts-ignore
    import('html2pdf.js').then((html2pdf) => {
      const opt = {
        margin: 10,
        filename: `Ledger_${activeSupplier.name}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };
      html2pdf.default().set(opt).from(element).save();
    });
  };

  const handlePrintAllSuppliers = () => {
    const element = document.getElementById('suppliers-table-print');
    if (!element) return;

    // @ts-ignore
    import('html2pdf.js').then((html2pdf) => {
      const opt = {
        margin: 10,
        filename: 'Suppliers_Report.pdf',
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
      };
      html2pdf.default().set(opt).from(element).save();
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Truck className="text-primary" size={32} /> Supplier Management
          </h2>
          <p className="text-slate-600 font-bold text-sm mt-1 uppercase tracking-widest">সরবরাহকারী এবং হিসাব লেজার।</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-primary text-white px-8 py-3.5 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary/20 font-black text-sm active-scale transition-all w-full sm:w-auto justify-center">
          <Plus size={20}/> নতুন সাপ্লায়ার যোগ করুন
        </button>
      </div>

      {/* Summary Ledger Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-7 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Truck size={14} className="text-primary/40"/> মোট সাপ্লায়ার</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{ledgerStats.totalSuppliers} <span className="text-sm text-slate-400">জন</span></h3>
        </div>
        
        <div className="bg-rose-50 p-7 rounded-[40px] border-2 border-rose-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-600/5 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Wallet size={14}/> মোট বকেয়া (Payable)</p>
          <h3 className="text-3xl font-black text-rose-700 tracking-tightest">৳{ledgerStats.totalDue.toLocaleString()}</h3>
          <p className="text-[9px] font-black text-rose-400 uppercase mt-2">{ledgerStats.dueSuppliers} জন টাকা পাবে</p>
        </div>

        <div className="bg-emerald-50 p-7 rounded-[40px] border-2 border-emerald-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-600/5 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingUp size={14}/> মোট ক্রয় (Lifetime)</p>
          <h3 className="text-3xl font-black text-emerald-700 tracking-tightest">৳{ledgerStats.totalPurchase.toLocaleString()}</h3>
          <p className="text-[9px] font-black text-emerald-400 uppercase mt-2">ব্যবসা শুরুর পর থেকে</p>
        </div>

        <div className="bg-slate-900 p-7 rounded-[40px] shadow-2xl relative overflow-hidden group text-white">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
          <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2"><Calculator size={14}/> লেজার ফিল্টার</p>
          <div className="flex bg-white/10 p-1 rounded-xl mt-2 border border-white/10">
            {(['all', 'due', 'paid'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${statusFilter === f ? 'bg-white text-slate-900 shadow-xl' : 'text-white/60 hover:text-white'}`}
              >
                {f === 'all' ? 'সব' : f === 'due' ? 'বাকি' : 'পরিশোধিত'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-4.5 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="সাপ্লায়ার নাম, কোম্পানি বা মোবাইল দিয়ে খুঁজুন..." 
            className="w-full pl-14 pr-6 py-4.5 border-2 rounded-[28px] focus:ring-4 focus:ring-primary/5 outline-none font-black shadow-sm transition-all border-slate-200 bg-white" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <button onClick={handlePrintAllSuppliers} className="bg-white border-2 border-slate-200 px-6 py-3 rounded-[24px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
          <Printer size={18}/> প্রিন্ট লেজার
        </button>
      </div>

      {/* Hidden container for printing all suppliers */}
      <div className="hidden">
        <div id="suppliers-table-print" className="p-10 bg-white">
          <div className="text-center mb-8 pb-8 border-b-4 border-slate-900">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">{shopSettings?.name || 'REST BAZER'}</h1>
            <p className="text-sm font-black text-slate-500 uppercase tracking-[4px] mt-2">Supplier Balances Report</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Date: {new Date().toLocaleDateString()}</p>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Supplier</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Company</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Lifetime Buy</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Due Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="p-4 font-black text-xs uppercase">{s.name}</td>
                  <td className="p-4 font-bold text-[10px] text-slate-500 uppercase">{s.companyName}</td>
                  <td className="p-4 text-right font-black text-xs">৳{s.totalPurchase?.toLocaleString()}</td>
                  <td className="p-4 text-right font-black text-xs">৳{s.dueAmount?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <th colSpan={3} className="p-4 text-right text-[10px] font-black uppercase tracking-widest">Total Payable</th>
                <th className="p-4 text-right text-sm font-black">৳{ledgerStats.totalDue.toLocaleString()}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Suppliers Table Ledger */}
      <div className="bg-white rounded-[40px] border-2 shadow-sm overflow-hidden border-slate-100">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[850px]">
            <thead className="bg-slate-50 text-slate-600 font-black text-[11px] uppercase tracking-[2px] border-b-2">
              <tr>
                <th className="p-6">Supplier Details</th>
                <th className="p-6">Contact Info</th>
                <th className="p-6 text-right">Lifetime Buy</th>
                <th className="p-6 text-right">Current Balance</th>
                <th className="p-6 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center font-black border border-primary/10 shadow-sm shrink-0 uppercase">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-base uppercase tracking-tight">{s.name}</div>
                        <div className="text-[10px] text-slate-500 font-black flex items-center gap-1.5 mt-0.5"><Building2 size={12}/> {s.companyName || 'স্বতন্ত্র সরবরাহকারী'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="text-sm font-black text-slate-800 flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {s.phone}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter truncate max-w-[150px]">{s.address || 'ঠিকানা নেই'}</div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="font-black text-xl text-emerald-700 tracking-tighter">৳{(s.totalPurchase || 0).toLocaleString()}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase mt-0.5">মোট লেনদেন</div>
                  </td>
                  <td className="p-6 text-right">
                    <div className={`font-black text-2xl tracking-tightest ${s.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ৳{(s.dueAmount || 0).toLocaleString()}
                    </div>
                    <div className={`text-[9px] font-black uppercase mt-0.5 ${s.dueAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {s.dueAmount > 0 ? 'বাকি পাওনা' : 'পরিশোধিত'}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setShowPaymentModal(s.id)} className={`p-3.5 rounded-2xl transition-all shadow-sm border-2 ${s.dueAmount > 0 ? 'text-emerald-600 bg-white border-emerald-100 hover:bg-emerald-50' : 'text-slate-300 bg-slate-50 border-slate-100'}`} title="Pay Due"><DollarSign size={20}/></button>
                      <button onClick={() => setShowProfile(s.id)} className="p-3.5 text-primary bg-white border-2 border-primary/10 hover:bg-primary/5 rounded-2xl transition-all shadow-sm" title="View Profile"><User size={20}/></button>
                      <button onClick={() => { setEditingId(s.id); setFormData(s); setShowModal(true); }} className="p-3.5 text-blue-600 bg-white border-2 border-blue-100 hover:bg-blue-50 rounded-2xl transition-all shadow-sm" title="Edit"><Edit size={20}/></button>
                      {isAdmin && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`${s.name} কে ডিলিট করতে চান?`)) {
                              onDelete?.(s.id);
                            }
                          }} 
                          className="p-3.5 text-rose-600 bg-white border-2 border-rose-100 hover:bg-rose-50 rounded-2xl transition-all shadow-sm" 
                          title="Delete"
                        >
                          <Trash2 size={20}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <div className="w-20 h-20 rounded-[32px] bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                        <Truck size={32} className="opacity-20" />
                      </div>
                      <p className="font-black uppercase text-[10px] tracking-[4px]">কোন সাপ্লায়ার পাওয়া যায়নি</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showProfile && activeSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[60] flex items-center justify-center p-0 sm:p-6 overflow-hidden modal-container">
          <div className="bg-white/80 backdrop-blur-2xl w-full h-full sm:max-w-7xl sm:max-h-[92vh] sm:rounded-[48px] overflow-hidden flex flex-col shadow-[0_32px_128px_-12px_rgba(0,0,0,0.3)] border border-white/50 animate-in zoom-in duration-500 modal-content-full">
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 sm:p-12 text-white shrink-0 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-900/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
               
               <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8 relative z-10 font-sans">
                  <div className="flex items-center gap-4 sm:gap-8 w-full">
                    <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-[24px] sm:rounded-[38px] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-2xl group transition-transform hover:scale-105">
                       <Truck className="w-8 h-8 sm:w-14 sm:h-14 drop-shadow-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-3 sm:gap-4">
                        <h2 className="text-xl sm:text-5xl font-black tracking-tightest truncate uppercase drop-shadow-md">{activeSupplier.name}</h2>
                        <span className="hidden sm:inline-flex bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{activeSupplier.companyName?.split(' ')[0] || 'PARTNER'}</span>
                       </div>
                       <div className="flex flex-wrap gap-x-4 sm:gap-x-8 gap-y-1 sm:gap-y-2 opacity-90 font-black text-[9px] sm:text-[11px] mt-2 sm:mt-4 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5 sm:gap-2.5 bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl"><Building2 size={12}/> {activeSupplier.companyName || 'INDEPENDENT'}</span>
                          <span className="flex items-center gap-1.5 sm:gap-2.5 bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl"><Phone size={12}/> {activeSupplier.phone}</span>
                       </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                    <button onClick={handleDownloadLedger} className="p-3 sm:p-4.5 bg-white/15 hover:bg-white/25 rounded-xl sm:rounded-[24px] transition-all border border-white/25 shrink-0 shadow-lg active-scale" title="Download Ledger">
                      <Printer size={20} className="sm:w-[26px] sm:h-[26px]" />
                    </button>
                    <button onClick={() => setShowPurchaseModal(true)} className="flex-1 sm:flex-none bg-white text-emerald-600 px-6 sm:px-10 py-3 sm:py-4.5 rounded-xl sm:rounded-[24px] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-2xl hover:bg-emerald-50 active-scale transition-all flex items-center justify-center gap-2 sm:gap-3 ring-4 ring-white/10">
                       <Plus size={16} className="stroke-[3px] sm:w-[20px] sm:h-[20px]"/> মাল ক্রয়
                    </button>
                    <button onClick={() => { setShowProfile(null); setProfilePeriod('all'); }} className="p-3 sm:p-4.5 bg-white/15 hover:bg-white/25 rounded-xl sm:rounded-[24px] transition-all border border-white/25 shadow-lg active-scale">
                      <X size={20} className="sm:w-[26px] sm:h-[26px]" strokeWidth={2.5} />
                    </button>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#fdfdfd]">
               <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-100 p-6 sm:p-10 bg-white/50 backdrop-blur-sm overflow-y-auto space-y-4 sm:space-y-8 shrink-0 md:shrink-0 max-h-[60vh] md:max-h-full custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 sm:gap-6">
                    <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-5 sm:p-7 rounded-[32px] sm:rounded-[40px] border border-rose-100/50 shadow-sm relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/20 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform"></div>
                       <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">বকেয়া পাওনা</p>
                       <p className="text-2xl sm:text-4xl font-black text-rose-700 tracking-tightest">৳{(activeSupplier.dueAmount || 0).toLocaleString()}</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 sm:p-7 rounded-[32px] sm:rounded-[40px] border border-emerald-100/50 shadow-sm relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/20 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform"></div>
                       <div className="flex items-center justify-between mb-1">
                         <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">মোট ক্রয়</p>
                         <Zap size={12} className="text-emerald-400 fill-emerald-400" />
                       </div>
                       <p className="text-2xl sm:text-4xl font-black text-emerald-700 tracking-tightest">৳{activeSupplierLifetimePurchase.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-7 bg-slate-50/50 rounded-[32px] sm:rounded-[40px] border border-slate-100">
                     <h4 className="font-black text-slate-400 text-[9px] uppercase tracking-[2px] mb-3 flex items-center gap-2"><Info size={12}/> CONTACT</h4>
                     <div className="space-y-3">
                      <div className="p-3 bg-white rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Address</p>
                        <p className="text-[10px] font-black text-slate-800 uppercase leading-snug">{activeSupplier.address || 'ঠিকানা নেই'}</p>
                      </div>
                      <div className="p-3 bg-white rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Join Date</p>
                        <p className="text-[10px] font-black text-slate-800 uppercase">{activeSupplier.dateAdded ? new Date(activeSupplier.dateAdded).toLocaleDateString('bn-BD') : 'অজানা'}</p>
                      </div>
                     </div>
                  </div>
               </aside>
               
               <main className="flex-1 bg-white flex flex-col min-w-0 overflow-hidden">
                  <div className="px-6 sm:px-10 py-4 sm:py-7 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between shrink-0 bg-white gap-4 sm:gap-6">
                     <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-900 rounded-lg text-white"><FileText size={16}/></div>
                      <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[2px]">Transaction History</h3>
                     </div>
                     <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar max-w-full shadow-inner ring-2 ring-slate-50/50">
                        {(['all', 'today', 'week', 'month', 'year'] as const).map(p => (
                          <button key={p} onClick={() => setProfilePeriod(p)} className={`px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${profilePeriod === p ? 'bg-white text-emerald-700 shadow-sm border border-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}>
                            {p === 'all' ? 'সব' : p === 'today' ? 'আজ' : p === 'week' ? 'সপ্তাহ' : p === 'month' ? 'মাস' : 'বছর'}
                          </button>
                        ))}
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar relative bg-[#fcfcfc]">
                      {/* Detailed Ledger for PDF Export */}
                      <div id="supplier-ledger-content" className="hidden print:block bg-white p-10">
                        <div className="text-center mb-8 border-b-2 pb-6">
                           <h1 className="text-3xl font-black uppercase text-slate-900">{shopSettings?.name}</h1>
                           <h2 className="text-xl font-black text-slate-500 uppercase tracking-[4px] mt-1">Supplier Ledger</h2>
                           <div className="mt-4 flex justify-between text-[10px] font-black text-slate-400 uppercase">
                              <div>Supplier: {activeSupplier.name}</div>
                              <div>Company: {activeSupplier.companyName}</div>
                              <div>Date: {new Date().toLocaleDateString()}</div>
                           </div>
                        </div>
                        <table className="w-full text-[10px] border-collapse">
                           <thead>
                              <tr className="bg-slate-900 text-white">
                                 <th className="p-3 text-left">Date</th>
                                 <th className="p-3 text-left">Description</th>
                                 <th className="p-3 text-right">Debit (+)</th>
                                 <th className="p-3 text-right">Credit (-)</th>
                                 <th className="p-3 text-right">Balance</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200">
                              {filteredLedger.map(item => (
                                <tr key={item.id}>
                                  <td className="p-3">{item.date}</td>
                                  <td className="p-3 uppercase">{item.description}</td>
                                  <td className="p-3 text-right font-black text-rose-600">{item.debit > 0 ? `৳${item.debit.toLocaleString()}` : '-'}</td>
                                  <td className="p-3 text-right font-black text-emerald-600">{item.credit > 0 ? `৳${item.credit.toLocaleString()}` : '-'}</td>
                                  <td className="p-3 text-right font-black">৳{item.balance.toLocaleString()}</td>
                                </tr>
                              ))}
                           </tbody>
                           <tfoot>
                              <tr className="bg-slate-50">
                                 <th colSpan={4} className="p-3 text-right">Final Outstanding Due</th>
                                 <th className="p-3 text-right text-sm">৳{activeSupplier.dueAmount?.toLocaleString()}</th>
                              </tr>
                           </tfoot>
                        </table>
                      </div>

                      <div className="max-w-4xl mx-auto space-y-5 pb-12">
                        {filteredLedger.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => {
                              if (item.type === 'purchase' && item.originalData) {
                                setShowPurchaseDetails(item.originalData as Purchase);
                              }
                            }}
                            className={`p-6 rounded-[38px] bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col sm:flex-row justify-between items-center gap-6 group animate-in slide-in-from-bottom-4 transition-all hover:border-emerald-500/20 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 ${item.type === 'purchase' ? 'cursor-pointer' : ''}`}
                          >
                             <div className="flex items-center gap-5 w-full sm:w-auto">
                                <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center shrink-0 border-2 ${item.type === 'purchase' ? 'bg-amber-50 text-amber-600 border-amber-100/50 group-hover:bg-amber-600 group-hover:text-white' : 'bg-emerald-50 text-emerald-600 border-emerald-100/50 group-hover:bg-emerald-600 group-hover:text-white'} transition-all duration-500 group-hover:shadow-lg`}>
                                  {item.type === 'purchase' ? <ShoppingBag size={24}/> : <ArrowUpRight size={24}/>}
                                </div>
                                <div className="min-w-0 flex-1">
                                   <div className="font-black text-slate-800 text-base tracking-tight uppercase truncate drop-shadow-sm">{item.description}</div>
                                   <div className="text-[10px] font-black text-slate-400 uppercase mt-1.5 flex items-center gap-2">
                                    <Calendar size={12} strokeWidth={2.5}/> {item.date} 
                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                    <span className={`${item.type === 'purchase' ? 'text-amber-500' : 'text-emerald-500'}`}>{item.type === 'purchase' ? 'INVENTORY PURCHASE' : 'PAYMENT COMPLETED'}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-50">
                                <div className="text-right">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-[2px]">{item.type === 'purchase' ? 'Liability Increase' : 'Liability Decrease'}</div>
                                  <div className={`font-black text-2xl tracking-tightest mt-0.5 ${item.type === 'purchase' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {item.type === 'purchase' ? `+ ৳${item.amount.toLocaleString()}` : `- ৳${item.amount.toLocaleString()}`}
                                  </div>
                                  <div className="inline-flex mt-1.5 px-3 py-1 rounded-lg bg-slate-50 font-black text-[9px] text-slate-500 uppercase tracking-tighter border border-slate-100">
                                    Bal: ৳{item.balance.toLocaleString()}
                                  </div>
                                </div>
                                {item.type === 'purchase' && (
                                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all border border-slate-100/50">
                                    <ArrowRight size={18} strokeWidth={2.5}/>
                                  </div>
                                )}
                             </div>
                          </div>
                        ))}
                        {filteredLedger.length === 0 && (
                          <div className="py-32 flex flex-col items-center justify-center text-slate-300">
                            <div className="w-24 h-24 rounded-[40px] bg-slate-50 border border-slate-100 flex items-center justify-center mb-6">
                              <History size={40} className="text-slate-200" />
                            </div>
                            <p className="font-black uppercase text-xs tracking-[4px] text-slate-400">ইতিহাস পাওয়া যায়নি</p>
                            <p className="text-[10px] font-bold text-slate-300 uppercase mt-2">No transaction history for the selected period</p>
                          </div>
                        )}
                      </div>
                  </div>
               </main>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Payment Modal */}
      {showPaymentModal && activeSupplier && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-hidden modal-container">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 sm:p-10 shadow-2xl animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                   <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg"><DollarSign size={24}/></div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">সাপ্লায়ার পেমেন্ট</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">সরবরাহকারীর বকেয়া পরিশোধ</p>
                   </div>
                </div>
                <button onClick={() => setShowPaymentModal(null)} className="text-slate-400 hover:text-rose-600 transition-colors"><X size={32}/></button>
             </div>

             <div className="bg-rose-50 p-6 rounded-3xl border-2 border-rose-100 mb-8 flex justify-between items-center">
                <div>
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">বর্তমান বকেয়া</p>
                   <h4 className="text-3xl font-black text-rose-700 tracking-tightest">৳{(activeSupplier.dueAmount || 0).toLocaleString()}</h4>
                </div>
                <Truck size={32} className="text-rose-200" />
             </div>

             <form onSubmit={handlePayment} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">পরিশোধের পরিমাণ (৳)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-4 text-emerald-600 font-black text-lg">৳</span>
                    <input type="number" required placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-4 font-black text-2xl text-emerald-700 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">পেমেন্ট মেথড</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Cash', 'bKash', 'Nagad', 'Bank'].map(m => (
                       <button key={m} type="button" onClick={() => setPayMethod(m)} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${payMethod === m ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                          {m}
                       </button>
                    ))}
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">নোট (ঐচ্ছিক)</label>
                   <textarea rows={2} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:bg-white transition-all" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="পেমেন্ট সম্পর্কে কিছু লিখুন..." />
                </div>

                <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-[22px] font-black shadow-2xl shadow-emerald-900/20 flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                   <Check size={20}/> পেমেন্ট নিশ্চিত করুন
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      {showPurchaseDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[48px] w-full max-w-2xl p-10 shadow-[0_32px_128px_-12px_rgba(0,0,0,0.3)] animate-in zoom-in duration-500 border border-white/50">
             <div className="flex justify-between items-center mb-10 shrink-0">
                <div className="flex items-center gap-5">
                   <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl shadow-slate-900/20 transition-transform hover:rotate-3"><ShoppingBag size={28}/></div>
                   <div>
                     <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">ক্রয় বিবরণী</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mt-1">Invoice #{showPurchaseDetails.purchaseNo} • {showPurchaseDetails.date}</p>
                   </div>
                </div>
                <button onClick={() => setShowPurchaseDetails(null)} className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active-scale"><X size={32} strokeWidth={2.5}/></button>
             </div>
             
             <div className="relative overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm ring-4 ring-slate-50/50">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/70">পণ্যর নাম</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-widest text-white/70">পরিমাণ</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-white/70">দর</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-white/70">মোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {showPurchaseDetails.items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5 font-black text-xs uppercase text-slate-700">{item.productName}</td>
                        <td className="px-6 py-5 text-center font-black text-xs text-slate-900">
                          <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200/50">{item.quantity}</span>
                        </td>
                        <td className="px-6 py-5 text-right font-black text-xs text-slate-600">৳{item.unitPrice.toLocaleString()}</td>
                        <td className="px-6 py-5 text-right font-black text-xs text-emerald-700">৳{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/80">
                    <tr>
                      <td colSpan={3} className="px-6 py-7 text-right font-black text-xs uppercase text-slate-400 tracking-widest">সর্বমোট ইনভয়েস বিল</td>
                      <td className="px-6 py-7 text-right font-black text-2xl text-slate-900 tracking-tightest pr-6">৳{showPurchaseDetails.total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
             </div>
             
             <button onClick={() => setShowPurchaseDetails(null)} className="w-full mt-10 bg-slate-900 text-white py-6 rounded-[32px] font-black text-xs uppercase tracking-[4px] active-scale shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all ring-4 ring-slate-900/5">
                বন্ধ করুন
             </button>
          </div>
        </div>
      )}

      {/* Supplier Mal Kroy Modal (Purchase Order) */}
      {showPurchaseModal && activeSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[70] flex items-center justify-center p-0 sm:p-4 overflow-hidden modal-container">
          <div className="bg-white/95 backdrop-blur-2xl w-full h-full sm:max-w-7xl sm:max-h-[95vh] sm:rounded-[56px] flex flex-col shadow-[0_32px_128px_-12px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom-12 duration-700 overflow-hidden border border-white/50">
             {/* Modal Header */}
             <div className="p-8 sm:p-10 border-b border-slate-100 flex justify-between items-center bg-white/50 shrink-0">
                <div className="flex items-center gap-6">
                   <div className="bg-gradient-to-br from-emerald-600 to-teal-500 p-5 rounded-[28px] text-white shadow-2xl ring-8 ring-emerald-500/5 transition-transform hover:rotate-3">
                     <ShoppingBag size={32} className="stroke-[2.5px]"/>
                   </div>
                   <div>
                       <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">মাল ক্রয় অর্ডার</h3>
                       <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">Procurement Portal</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100/50">সাপ্লায়ার: {activeSupplier.name}</span>
                       </div>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end mr-4">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Current Session</p>
                     <p className="text-xs font-black text-slate-900 uppercase">{new Date().toLocaleTimeString('bn-BD')}</p>
                  </div>
                  <button onClick={() => setShowPurchaseModal(false)} className="w-14 h-14 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-[22px] transition-all active-scale">
                    <X size={36} strokeWidth={2.5}/>
                  </button>
                </div>
             </div>

             <div className="flex-1 overflow-hidden flex flex-col lg:grid lg:grid-cols-12 bg-white">
                {/* Left Panel: Product Selection */}
                <div className="lg:col-span-8 flex flex-col overflow-hidden bg-white relative">
                   <div className="p-8 pb-4 space-y-6 shrink-0">
                      <div className="flex flex-col sm:flex-row gap-5">
                         <div className="relative flex-1 group">
                            <Search className="absolute left-6 top-5.5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                            <input 
                              type="text" 
                              placeholder="পণ্যর নাম বা বারকোড দিয়ে খুঁজুন..." 
                              className="w-full pl-16 pr-8 py-5.5 bg-slate-50/50 border-2 border-slate-100 rounded-[32px] outline-none focus:bg-white focus:border-emerald-500/20 focus:ring-8 focus:ring-emerald-500/5 font-black text-sm transition-all" 
                              value={productSearch} 
                              onChange={e => setProductSearch(e.target.value)} 
                            />
                         </div>
                         <div className="relative group">
                            <Filter className="absolute left-6 top-5.5 text-slate-300 pointer-events-none" size={20} />
                            <select 
                              className="appearance-none pl-16 pr-12 py-5.5 bg-slate-50/50 border-2 border-slate-100 rounded-[32px] font-black text-xs uppercase outline-none focus:bg-white focus:border-emerald-500/20 transition-all cursor-pointer min-w-[200px]" 
                              value={purchaseCategory} 
                              onChange={e => setPurchaseCategory(e.target.value)}
                            >
                              <option value="all">সকল ক্যাটাগরি</option>
                              {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-6 top-6 text-slate-300 pointer-events-none" size={16} />
                         </div>
                      </div>
                   </div>

                   <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
                         {displayPurchaseProducts.map(p => (
                            <button 
                              key={p.id} 
                              onClick={() => addToPurchaseCart(p)} 
                              className="group bg-white p-4 rounded-[40px] border-2 border-slate-100 hover:border-emerald-500/30 hover:shadow-[0_20px_50px_rgba(16,185,129,0.08)] transition-all duration-500 text-left active-scale relative overflow-hidden"
                            >
                               <div className="aspect-square bg-slate-50/50 rounded-[32px] mb-4 overflow-hidden relative border border-slate-50/50 group-hover:bg-emerald-50/30 transition-colors">
                                  {p.imageUrl ? (
                                    <img src={p.imageUrl} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                      <Package size={48} strokeWidth={1} />
                                    </div>
                                  )}
                                  <div className="absolute top-3 right-3">
                                     <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-2xl text-[9px] font-black text-slate-600 shadow-sm border border-slate-100 uppercase tracking-tight">
                                       Stock: {p.stock}
                                     </div>
                                  </div>
                               </div>
                               <div className="px-1">
                                 <h4 className="font-black text-slate-800 text-[11px] uppercase leading-tight line-clamp-2 min-h-[32px] mb-3 group-hover:text-emerald-700 transition-colors">{p.name}</h4>
                                 <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-2xl border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100/50 transition-all">
                                    <div className="flex flex-col">
                                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Cost Price</span>
                                       <span className="text-emerald-700 font-black text-sm tracking-tighter">৳{p.purchasePrice}</span>
                                    </div>
                                    <div className="bg-white text-emerald-600 p-2.5 rounded-xl shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                                      <Plus size={16} strokeWidth={3}/>
                                    </div>
                                 </div>
                               </div>
                               {p.stock <= 5 && (
                                 <div className="absolute top-0 left-0 w-2 h-full bg-rose-500/20"></div>
                               )}
                            </button>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Right Panel: Cart & Checkout */}
                <div className="lg:col-span-4 bg-slate-50/50 flex flex-col overflow-hidden border-l border-slate-100 p-8">
                   <div className="flex items-center justify-between mb-8 shrink-0">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-[3px] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                          <ShoppingBag size={18}/>
                        </div>
                        ক্রয় তালিকা ({purchaseCart.length})
                      </h3>
                      <button 
                        onClick={() => setPurchaseCart([])} 
                        className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-100/50"
                        disabled={purchaseCart.length === 0}
                      >
                         Clear All
                      </button>
                   </div>

                   <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                      {purchaseCart.map(item => (
                        <div key={item.id} className="bg-white p-5 rounded-[36px] border border-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.02)] animate-in slide-in-from-right-8 group hover:shadow-xl hover:border-emerald-500/20 transition-all duration-500">
                           <div className="flex justify-between items-start mb-4 gap-4">
                              <div className="font-black text-slate-800 text-xs uppercase leading-tight flex-1">{item.productName}</div>
                              <button onClick={() => setPurchaseCart(purchaseCart.filter(i => i.id !== item.id))} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">পরিমাণ (Units)</label>
                                 <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-2xl border border-slate-100 group-focus-within:border-emerald-500/20 transition-all">
                                    <button onClick={() => updatePurchaseQty(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all active-scale"><Minus size={14}/></button>
                                    <input type="number" className="w-full bg-transparent border-none text-center font-black text-sm p-0 outline-none" value={item.quantity} onChange={e => updatePurchaseQty(item.id, parseInt(e.target.value) || 0)} />
                                    <button onClick={() => updatePurchaseQty(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all active-scale"><Plus size={14}/></button>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">ক্রয় মূল্য (৳)</label>
                                 <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100 group-focus-within:border-emerald-500/20 transition-all">
                                    <span className="pl-2 text-slate-400 text-xs font-black">৳</span>
                                    <input type="number" className="w-full bg-transparent border-none font-black text-sm p-1.5 outline-none text-right" value={item.unitPrice} onChange={e => updatePurchasePrice(item.id, parseFloat(e.target.value) || 0)} />
                                 </div>
                              </div>
                           </div>
                           
                           <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center px-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Item Subtotal</span>
                              <span className="text-sm font-black text-emerald-700 tracking-tighter bg-emerald-50 px-3 py-1 rounded-lg">৳{item.total.toLocaleString()}</span>
                           </div>
                        </div>
                      ))}
                      
                      {purchaseCart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-200">
                           <div className="w-24 h-24 rounded-[40px] bg-white border-4 border-dashed border-slate-100 flex items-center justify-center mb-6">
                             <Zap size={40} className="opacity-20 animate-pulse" />
                           </div>
                           <p className="font-black uppercase text-[10px] tracking-[4px] text-slate-300">ক্রয় তালিকা খালি</p>
                           <p className="text-[9px] font-bold text-slate-300 uppercase mt-2">Select items from the left to start</p>
                        </div>
                      )}
                   </div>

                   {/* Footer Actions */}
                   <div className="bg-white p-8 rounded-[48px] mt-8 border-2 border-slate-100 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.1)] space-y-6 shrink-0 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                      
                      <div className="grid grid-cols-2 gap-4 relative z-10 font-sans">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> Order Date</p>
                          <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 font-black text-[11px] outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all uppercase tracking-tighter" />
                        </div>
                        <div className="text-right flex flex-col justify-center">
                           <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[3px] mb-1">Total Payable Bill</p>
                           <p className="text-3xl font-black text-slate-900 tracking-tightest leading-none">৳{purchaseTotal.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 relative z-10">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[3px]">নগদ পরিশোধ (Paid Now)</label>
                          {parseFloat(paidInput) >= purchaseTotal && purchaseTotal > 0 && (
                            <span className="text-[9px] font-black text-emerald-500 uppercase animate-bounce group-hover:opacity-100 transition-opacity">FULL PAYMENT ✓</span>
                          )}
                        </div>
                        <div className="relative">
                          <DollarSign className="absolute left-5 top-5.5 text-emerald-600" size={24} />
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[28px] pl-14 pr-8 py-5.5 font-black text-3xl text-emerald-700 outline-none focus:bg-white focus:border-emerald-500/20 focus:ring-8 focus:ring-emerald-500/5 transition-all placeholder:text-slate-200" 
                            value={paidInput} 
                            onChange={e => setPaidInput(e.target.value)} 
                            placeholder="0.00" 
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center px-4 py-3 bg-rose-50 rounded-2xl border border-rose-100/50 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[2px] text-rose-500 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div> বকেয়া পাওনা (Due)</span>
                        <span className="text-xl font-black text-rose-700 tracking-tighter">৳{purchaseDue.toLocaleString()}</span>
                      </div>

                      <button 
                        onClick={completePurchase} 
                        disabled={purchaseCart.length === 0} 
                        className="relative z-10 w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-[11px] uppercase tracking-[5px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] active-scale disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-4 group/btn overflow-hidden"
                      >
                         <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500 ease-out"></div>
                         <div className="relative flex items-center justify-center gap-4 group-hover/btn:scale-105 transition-transform">
                            <Check size={28} className="stroke-[3px] text-emerald-400 group-hover/btn:text-white transition-colors" />
                            <span>ক্রয় সম্পন্ন করুন</span>
                         </div>
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Supplier Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden modal-container">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[48px] w-full max-w-2xl p-10 sm:p-14 shadow-[0_32px_128px_-12px_rgba(0,0,0,0.3)] animate-in zoom-in duration-500 border border-white/50 overflow-y-auto custom-scrollbar max-h-[95vh]">
             <div className="flex justify-between items-center mb-12 shrink-0">
                <div className="flex items-center gap-5">
                   <div className="bg-gradient-to-br from-primary to-blue-600 p-4 rounded-3xl text-white shadow-xl ring-4 ring-primary/10 transition-transform hover:rotate-3">
                     <Truck size={28}/>
                   </div>
                   <div>
                     <h3 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                       {editingId ? 'সাপ্লায়ার আপডেট' : 'নতুন সাপ্লায়ার'}
                     </h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mt-1">Information Registry Form</p>
                   </div>
                </div>
                <button onClick={() => setShowModal(false)} className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active-scale">
                  <X size={32} strokeWidth={2.5}/>
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-10">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">সাপ্লায়ার নাম</label>
                   <div className="relative group">
                     <User className="absolute left-5 top-5 text-slate-300 group-focus-within:text-primary transition-colors" size={20}/>
                     <input required className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-3xl font-black text-sm outline-none focus:bg-white focus:border-primary/30 focus:ring-8 focus:ring-primary/5 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="নাম লিখুন" />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">মোবাইল নম্বর</label>
                   <div className="relative group">
                     <Phone className="absolute left-5 top-5 text-slate-300 group-focus-within:text-primary transition-colors" size={20}/>
                     <input required className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-3xl font-black text-sm outline-none focus:bg-white focus:border-primary/30 focus:ring-8 focus:ring-primary/5 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="01XXX-XXXXXX" />
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">কোম্পানির নাম</label>
                   <div className="relative group">
                     <Building2 className="absolute left-5 top-5 text-slate-300 group-focus-within:text-primary transition-colors" size={20}/>
                     <input className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-3xl font-black text-sm outline-none focus:bg-white focus:border-primary/30 focus:ring-8 focus:ring-primary/5 transition-all" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="কোম্পানি বা ব্র্যান্ড" />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">যোগদানের তারিখ</label>
                   <div className="relative group">
                     <Calendar className="absolute left-5 top-5 text-slate-300 group-focus-within:text-primary transition-colors" size={20}/>
                     <input type="date" required className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-3xl font-black text-sm outline-none focus:bg-white focus:border-primary/30 focus:ring-8 focus:ring-primary/5 transition-all" value={formData.dateAdded?.split('T')[0]} onChange={e => setFormData({...formData, dateAdded: e.target.value})} />
                   </div>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">পূর্বের বকেয়া পাওনা (৳)</label>
                 <div className="relative group">
                   <DollarSign className="absolute left-5 top-5 text-slate-300 group-focus-within:text-primary transition-colors" size={20}/>
                   <input type="number" className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-3xl font-black text-sm outline-none focus:bg-white focus:border-primary/30 focus:ring-8 focus:ring-primary/5 transition-all" value={formData.dueAmount} onChange={e => setFormData({...formData, dueAmount: parseFloat(e.target.value) || 0})} placeholder="০.০০" />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">স্থায়ী ঠিকানা</label>
                 <textarea className="w-full px-6 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-3xl font-black text-sm outline-none focus:bg-white focus:border-primary/30 focus:ring-8 focus:ring-primary/5 transition-all min-h-[100px]" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="সাপ্লায়ারের বিস্তারিত ঠিকানা লিখুন..." rows={3} />
               </div>

               <button className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-6 rounded-[32px] font-black shadow-[0_20px_40px_-10px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center gap-4 uppercase tracking-[4px] text-xs transition-all active-scale hover:shadow-[0_24px_48px_-12px_rgba(var(--primary-rgb),0.4)] ring-4 ring-primary/10">
                 <Save size={24} className="stroke-[3px]"/> তথ্য সংরক্ষণ করুন
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
