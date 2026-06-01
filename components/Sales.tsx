import React, { useState, useMemo, useEffect } from 'react';
import { Product, Customer, Sale, CartItem, Staff, ProductReturn } from '../types';
import html2pdf from 'html2pdf.js';
import InvoiceContent from './InvoiceContent';
import { 
  Plus, Trash2, ShoppingCart, 
  X, Printer, DollarSign, Search, User, Minus, Check, LayoutGrid,
  CreditCard, Tag, AlertCircle, ArrowRight, RotateCcw, SearchIcon,
  UserCheck, History, ArrowLeft, FileText, MapPin, Phone, 
  Share2, Download, CheckCircle2, AlertTriangle, Building2, Clock, MessageCircle,
  Calendar, Package
} from 'lucide-react';

interface SalesProps {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  onSaleComplete: (sale: Sale, products: Product[], customers: Customer[]) => void;
  onAddReturn: (ret: ProductReturn) => void;
  staff: Staff[];
  isAdmin?: boolean;
  currentStaff?: Staff | null;
  shopSettings: any;
}

const Sales: React.FC<SalesProps> = ({ products, customers, sales, onSaleComplete, onAddReturn, staff, isAdmin, currentStaff, shopSettings }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [paidInput, setPaidInput] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSearch, setReturnSearch] = useState('');
  const [returnCustomerSearch, setReturnCustomerSearch] = useState('');
  const [selectedReturnCustomerId, setSelectedReturnCustomerId] = useState<string | null>(null);
  const [selectedSaleToReturn, setSelectedSaleToReturn] = useState<Sale | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products');

  // Unified Filtered Customers with Permissions: Only show customers added by this user if not admin
  const displayCustomersForSelection = useMemo(() => {
    let base = customers;
    if (!isAdmin && currentStaff) {
      base = customers.filter(c => c.addedBy === currentStaff.id);
    }
    return base;
  }, [customers, isAdmin, currentStaff]);

  const selectedCustomer = useMemo(() => 
    displayCustomersForSelection.find(c => c.id === selectedCustomerId), 
  [displayCustomersForSelection, selectedCustomerId]);

  const currentPriceType = selectedCustomer?.type || 'retail';

  useEffect(() => {
    if (cart.length > 0) {
      const updatedCart = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return item;
        let newUnitPrice = product.salePrice;
        if (currentPriceType === 'wholesale') newUnitPrice = product.wholesalePrice;
        if (currentPriceType === 'distributor') newUnitPrice = product.distributorPrice || product.wholesalePrice;
        
        return {
          ...item,
          unitPrice: newUnitPrice,
          total: Math.round(newUnitPrice * item.quantity),
          priceType: currentPriceType as 'retail' | 'wholesale' | 'distributor'
        };
      });
      setCart(updatedCart);
    }
  }, [currentPriceType, products]);

  const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  const categories = useMemo(() => {
    const cats = new Set(products.filter(p => p && p.category).map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const displayProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const s = productSearch.toLowerCase().trim();
    return products
      .filter(p => {
        if (!p) return false;
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const matchesSearch = name.includes(s) || sku.includes(s);
        const matchesCategory = selectedCategory === 'all' || (p.category || '').trim() === (selectedCategory || '').trim();
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  }, [products, productSearch, selectedCategory]);

  const subTotal = round(cart.reduce((acc, item) => acc + item.total, 0));
  const discount = Math.max(0, round(parseFloat(discountInput) || 0));
  const grandTotal = Math.max(0, Math.round(subTotal - discount));
  const paid = Math.max(0, paidInput === '' ? 0 : round(parseFloat(paidInput)));
  const due = Math.max(0, round(grandTotal - paid));
  const change = Math.max(0, round(paid - grandTotal));

  const addItem = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      let unitPrice = product.salePrice;
      if (currentPriceType === 'wholesale') unitPrice = product.wholesalePrice;
      if (currentPriceType === 'distributor') unitPrice = product.distributorPrice || product.wholesalePrice;

      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        const newQty = existing.quantity + 1;
        return prev.map(i => i.productId === product.id ? { ...i, quantity: newQty, total: Math.round(newQty * unitPrice) } : i);
      }
      return [...prev, {
        id: `CART-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        quantity: 1,
        unitPrice: unitPrice,
        purchasePrice: product.purchasePrice || 0,
        total: unitPrice,
        priceType: currentPriceType as 'retail' | 'wholesale' | 'distributor'
      }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    setCart(cart.map(i => {
      if (i.id === id) {
        const product = products.find(p => p.id === i.productId);
        const finalQty = Math.max(1, Math.min(qty, product?.stock || 9999));
        return { ...i, quantity: finalQty, total: Math.round(finalQty * i.unitPrice) };
      }
      return i;
    }));
  };

  const completeSale = () => {
    if (cart.length === 0) return;
    if (!selectedCustomerId && due > 0) {
      alert("বাকি বিক্রির ক্ষেত্রে কাস্টমার সিলেক্ট করা বাধ্যতামূলক।");
      return;
    }
    const localDate = new Date().toISOString().split('T')[0];
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const newSale: Sale = {
      id: Date.now().toString(),
      invoiceNo,
      customerId: selectedCustomerId || null,
      customerType: currentPriceType as 'retail' | 'wholesale' | 'distributor',
      date: localDate,
      items: cart,
      subTotal,
      discount,
      vat: 0,
      total: grandTotal,
      paid,
      due,
      tendered: paid,
      change,
      paymentMethod,
      soldBy: currentStaff?.name || 'Admin',
      soldById: currentStaff?.id,
      status: due > 0 ? 'due' : 'paid'
    };
    const updatedProducts = products.map(p => {
      const item = cart.find(c => c.productId === p.id);
      return item ? { ...p, stock: p.stock - item.quantity } : p;
    });
    const updatedCustomers = customers.map(c => {
      if (c.id === selectedCustomerId) {
        return { 
          ...c, 
          dueAmount: round((c.dueAmount || 0) + due), 
          totalPurchase: round((c.totalPurchase || 0) + grandTotal),
          totalPaid: round((c.totalPaid || 0) + paid),
          lastPurchaseDate: localDate
        };
      }
      return c;
    });
    onSaleComplete(newSale, updatedProducts, updatedCustomers);
    setLastSale(newSale);
    setShowReceipt(true);
    setCart([]);
    setPaidInput('');
    setDiscountInput('0');
    setSelectedCustomerId('');
    setCustomerSearch('');
    setMobileView('products');
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;
    
    // Create a unique ID for the print window
    const WinPrint = window.open('', `print_${Date.now()}`, 'width=900,height=800');
    if (WinPrint) {
      WinPrint.document.write('<html><head><title>Invoice</title>');
      WinPrint.document.write('<style>');
      WinPrint.document.write(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: white; margin: 0; }
        .invoice-container { max-width: 800px; margin: 0 auto; }
        .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #1e1e5f; padding-bottom: 24px; margin-bottom: 40px; }
        .shop-brand h1 { margin: 0; font-size: 36px; font-weight: 900; color: #1e1e5f; letter-spacing: -1.5px; text-transform: uppercase; }
        .shop-brand p { margin: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; }
        .invoice-meta { text-align: right; }
        .invoice-meta h2 { margin: 0; font-size: 32px; font-weight: 900; color: #1e1e5f; text-transform: uppercase; }
        .invoice-meta p { margin: 4px 0; font-size: 14px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; border-radius: 12px; overflow: hidden; }
        th { background: #1e1e5f; color: white; text-align: left; padding: 14px 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 600; color: #334155; }
        .text-right { text-align: right; }
        .summary-wrapper { display: flex; justify-content: flex-end; padding-top: 10px; }
        .summary-table { width: 300px; }
        .summary-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; font-weight: 700; border-bottom: 1px solid #f1f5f9; }
        .summary-row.total-bill { border-bottom: none; border-top: 3px solid #1e1e5f; margin-top: 12px; padding-top: 20px; font-size: 22px; font-weight: 900; color: #1e1e5f; }
        .footer { margin-top: 100px; display: flex; justify-content: space-between; align-items: flex-end; }
        .signature-box { text-align: center; width: 220px; }
        .signature-line { border-top: 2px solid #1e1e5f; margin-bottom: 8px; }
        .signature-box span { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #1e1e5f; }
        @media print { body { padding: 20px; } }
      `);
      WinPrint.document.write('</style></head><body>');
      WinPrint.document.write('<div class="invoice-container">');
      WinPrint.document.write(printContent.innerHTML);
      WinPrint.document.write('</div>');
      WinPrint.document.write('</body></html>');
      WinPrint.document.close();
      WinPrint.focus();
      setTimeout(() => {
        WinPrint.print();
        WinPrint.close();
        setShowReceipt(false);
      }, 500);
    } else {
      // Fallback if window.open is blocked
      window.print();
    }
  };

  const handleDownloadInvoice = () => {
    const element = document.getElementById('printable-receipt');
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `Invoice_${lastSale?.invoiceNo || 'Sale'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
           <div className="bg-primary p-2.5 rounded-xl text-white shadow-lg"><ShoppingCart size={22}/></div>
           <h2 className="font-black text-slate-900 uppercase tracking-tight">Point of Sale</h2>
        </div>
        <button 
          onClick={() => setShowReturnModal(true)}
          className="flex items-center gap-2 bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 border-2 border-rose-100 shadow-sm"
        >
          <RotateCcw size={18}/> Return Items
        </button>
      </div>

      <div className="lg:hidden flex bg-white p-1.5 rounded-[24px] border-2 border-slate-100 shadow-sm sticky top-0 z-40">
        <button 
          onClick={() => setMobileView('products')}
          className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${mobileView === 'products' ? 'bg-primary text-white shadow-lg' : 'text-slate-400'}`}
        >
          Product List
        </button>
        <button 
          onClick={() => setMobileView('cart')}
          className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mobileView === 'cart' ? 'bg-primary text-white shadow-lg' : 'text-slate-400'}`}
        >
          Cart <span className={`px-2 py-0.5 rounded-full text-[9px] ${mobileView === 'cart' ? 'bg-white text-primary' : 'bg-slate-100'}`}>{cart.length}</span>
        </button>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:h-[calc(100vh-200px)]">
        <div className={`lg:col-span-7 xl:col-span-8 flex flex-col space-y-4 ${mobileView !== 'products' ? 'hidden lg:flex' : ''}`}>
          <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-slate-100 shrink-0">
             <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:flex-1">
                  <Search className="absolute left-4 top-4 text-slate-500" size={20} />
                  <input 
                    type="text" 
                    placeholder="পণ্য বা বারকোড খুঁজুন..." 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 font-black text-sm"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
                  {categories.map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${selectedCategory === cat ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {displayProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <Package size={32} />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">No Products Found</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Try a different search or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-24">
                {displayProducts.map(p => {
                const cartItem = cart.find(i => i.productId === p.id);
                const qty = cartItem ? cartItem.quantity : 0;
                const isLow = p.stock <= (p.minStock || 5);
                let currentPrice = p.salePrice;
                if (currentPriceType === 'wholesale') currentPrice = p.wholesalePrice;
                if (currentPriceType === 'distributor') currentPrice = p.distributorPrice || p.wholesalePrice;

                return (
                  <button 
                    key={p.id}
                    disabled={p.stock <= 0}
                    onClick={() => addItem(p)}
                    className={`group relative bg-white p-3 rounded-[32px] border-2 transition-all duration-300 active:scale-95 flex flex-col items-center ${p.stock <= 0 ? 'opacity-50 grayscale border-slate-100' : qty > 0 ? 'border-primary shadow-xl scale-[1.02]' : 'border-slate-100 hover:border-primary/20 hover:shadow-lg'}`}
                  >
                    <div className="aspect-square w-full bg-slate-50 rounded-[24px] mb-3 overflow-hidden relative border-2 border-slate-100">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200"><LayoutGrid size={32} /></div>
                      )}
                      {qty > 0 && <div className="absolute top-2 right-2 bg-primary text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shadow-lg animate-in zoom-in">{qty}</div>}
                    </div>
                    <div className="w-full text-left px-1 flex-1 flex flex-col justify-between">
                      <h4 className="font-black text-slate-900 text-xs line-clamp-2 uppercase tracking-tight leading-tight mb-2 min-h-[32px]">{p.name}</h4>
                      <div className="flex justify-between items-center mt-auto">
                        <span className={`font-black text-sm ${currentPriceType === 'wholesale' ? 'text-emerald-700' : currentPriceType === 'distributor' ? 'text-amber-700' : 'text-blue-700'}`}>৳{currentPrice}</span>
                        <div className="text-right">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border-2 block mb-0.5 ${isLow ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            {p.stock} <span className="opacity-60 text-[7px]">{p.unit}</span>
                          </span>
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter block whitespace-nowrap">
                            V: ৳{(p.stock * (p.purchasePrice || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          </div>
        </div>

        <div className={`lg:col-span-5 xl:col-span-4 flex flex-col h-full space-y-4 ${mobileView !== 'cart' ? 'hidden lg:flex' : ''}`}>
          <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden relative">
            <div className="p-6 border-b-2 border-slate-50 shrink-0">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={18} className="text-primary"/> Shopping Cart</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCart([])} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-2 py-1 rounded-lg transition-all">Clear</button>
                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${currentPriceType === 'wholesale' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : currentPriceType === 'distributor' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                       {currentPriceType}
                    </div>
                  </div>
               </div>
               
               <div className="relative">
                  <User className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="কাস্টমার খুঁজুন (নাম বা ফোন)..." 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 font-black text-sm"
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomerId(''); }}
                  />
                  {customerSearch && !selectedCustomerId && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-100 shadow-2xl rounded-[28px] mt-3 z-[100] max-h-64 overflow-y-auto p-3 flex flex-col gap-2">
                      {displayCustomersForSelection.filter(c => (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone || '').includes(customerSearch)).map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className="w-full p-4 text-left hover:bg-slate-50 rounded-2xl flex justify-between items-center transition-all border border-transparent hover:border-primary/10">
                          <div>
                            <div className="font-black text-sm uppercase flex items-center gap-2">
                               {c.name}
                               <span className={`text-[9px] px-2 py-0.5 rounded-lg uppercase border ${c.type === 'wholesale' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : c.type === 'distributor' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{c.type}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-bold mt-1 tracking-wider">{c.phone}</div>
                          </div>
                          <span className="text-[10px] font-black px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">৳{c.dueAmount}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCustomerId && <button onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); }} className="absolute right-4 top-3.5 text-rose-500 hover:bg-rose-50 p-1 rounded-lg"><X size={20}/></button>}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
               {cart.map(item => (
                 <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-[28px] transition-all border-2 border-transparent hover:border-slate-100 animate-in slide-in-from-right-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-black text-slate-900 uppercase leading-tight truncate">{item.productName}</div>
                      <div className="text-[11px] font-black text-slate-500 mt-1 flex items-center gap-2">
                         <span className={item.priceType === 'wholesale' ? 'text-emerald-700' : item.priceType === 'distributor' ? 'text-amber-700' : 'text-blue-700'}>৳{item.unitPrice}</span>
                         <span className="opacity-30">x</span>
                         <span>{item.quantity}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                       <button onClick={() => updateQty(item.id, item.quantity - 1)} className="p-1.5 rounded-xl bg-white shadow-sm text-slate-600 active-scale-90 transition-all"><Minus size={14}/></button>
                       <span className="text-xs font-black min-w-[24px] text-center">{item.quantity}</span>
                       <button onClick={() => updateQty(item.id, item.quantity + 1)} className="p-1.5 rounded-xl bg-white shadow-sm text-slate-600 active-scale-90 transition-all"><Plus size={14}/></button>
                    </div>
                    <div className="text-right min-w-[70px]">
                       <div className={`text-[12px] font-black tracking-tighter ${item.priceType === 'wholesale' ? 'text-emerald-700' : item.priceType === 'distributor' ? 'text-amber-700' : 'text-blue-700'}`}>৳{item.total}</div>
                       <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-rose-400 hover:text-rose-600 mt-1"><Trash2 size={16}/></button>
                    </div>
                 </div>
               ))}
            </div>

            <div className="p-8 bg-slate-50 border-t-2 border-slate-100 space-y-5">
               <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest"><span>উপ-মোট</span><span>৳{subTotal}</span></div>
                 <div className="flex justify-between items-center text-sm font-black text-rose-600 uppercase">
                    <span className="flex items-center gap-2"><Tag size={14}/> ডিসকাউন্ট</span>
                    <input type="number" className="w-24 text-right bg-white border-2 border-rose-100 rounded-xl outline-none p-2 focus:ring-4 focus:ring-primary/5" value={discountInput} onChange={e => setDiscountInput(e.target.value)} />
                 </div>
                 <div className="grid grid-cols-4 gap-2 mt-2">
                    {['Cash', 'bKash', 'Nagad', 'Bank'].map(m => (
                       <button key={m} onClick={() => setPaymentMethod(m)} className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter border-2 transition-all ${paymentMethod === m ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>
                          {m}
                       </button>
                    ))}
                 </div>
                 <div className="flex justify-between items-center py-4 border-y-2 border-slate-200 mt-4">
                    <span className="text-base font-black text-slate-900 uppercase tracking-tight">সর্বমোট বিল</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">৳{grandTotal}</span>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">জমা (Paid)</label>
                    <input type="number" className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl outline-none font-black text-emerald-700 text-lg focus:ring-4 focus:ring-emerald-500/10" value={paidInput} onChange={e => setPaidInput(e.target.value)} placeholder="0" />
                 </div>
                 <div className="flex flex-col justify-center text-right pt-4">
                    <span className={`text-[11px] font-black uppercase tracking-widest ${change > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                       {change > 0 ? `ফেরত: ৳${change}` : `বাকি: ৳${due}`}
                    </span>
                 </div>
               </div>
               <button onClick={completeSale} disabled={cart.length === 0} className="w-full bg-primary text-white py-5 rounded-[28px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                 <Check size={20}/> বিক্রয় নিশ্চিত করুন
               </button>
            </div>
          </div>
        </div>
      </div>
      
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[100] flex items-center justify-center p-0 sm:p-6 overflow-hidden modal-container">
           <div className="bg-slate-100 w-full h-full sm:max-w-4xl sm:max-h-[95vh] sm:rounded-[40px] flex flex-col shadow-3xl animate-in zoom-in duration-300 overflow-hidden modal-content-full">
              <div className="bg-white p-6 border-b-2 border-slate-200 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2.5 rounded-xl text-primary"><FileText size={24}/></div>
                    <div>
                       <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Invoice Generated</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Successful</p>
                    </div>
                 </div>
                 <button onClick={() => setShowReceipt(false)} className="p-3 text-slate-400 hover:text-rose-600 active:scale-95 transition-all"><X size={32}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar flex justify-center bg-slate-200/50">
                 <InvoiceContent 
                   sale={lastSale} 
                   customer={selectedCustomer} 
                   shopSettings={shopSettings} 
                 />
              </div>
              <div className="p-6 bg-white border-t-2 border-slate-200 flex flex-wrap justify-end gap-3 shrink-0">
                 <button onClick={() => setShowReceipt(false)} className="bg-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active-scale">Close Preview</button>
                 <button onClick={handleDownloadInvoice} className="bg-emerald-50 text-emerald-600 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-3 transition-all active-scale border-2 border-emerald-100"><Download size={18}/> Download PDF</button>
                 <button onClick={handlePrint} className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all active-scale"><Printer size={18}/> Print Invoice</button>
              </div>
           </div>
        </div>
      )}

      {showReturnModal && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[150] flex items-center justify-center p-0 sm:p-6 overflow-hidden modal-container">
           <div className="bg-white w-full h-full sm:max-w-5xl sm:max-h-[90vh] sm:rounded-[48px] flex flex-col shadow-3xl animate-in slide-in-from-bottom-10 overflow-hidden modal-content-full">
              <div className="p-8 border-b-2 flex justify-between items-center bg-slate-50 shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg"><RotateCcw size={24}/></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Product Return Service</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Process Customer Returns & Refunds</p>
                    </div>
                 </div>
                 <button onClick={() => setShowReturnModal(false)} className="p-3 text-slate-400 hover:text-rose-600 active:scale-95 transition-all"><X size={32}/></button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                 <div className="w-full lg:w-80 border-r-2 border-slate-100 bg-slate-50/50 p-6 overflow-y-auto custom-scrollbar">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><UserCheck size={16} className="text-primary"/> Step 1: Select Customer</h4>
                    <div className="relative mb-6">
                       <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                       <input 
                         type="text" 
                         placeholder="কাস্টমার খুঁজুন..." 
                         className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl outline-none text-xs font-black"
                         value={returnCustomerSearch}
                         onChange={e => setReturnCustomerSearch(e.target.value)}
                       />
                    </div>
                    <div className="space-y-3">
                       {displayCustomersForSelection.filter(c => (c.name || '').toLowerCase().includes(returnCustomerSearch.toLowerCase()) || (c.phone || '').includes(returnCustomerSearch)).map(c => (
                         <button 
                           key={c.id} 
                           onClick={() => { setSelectedReturnCustomerId(c.id); setSelectedSaleToReturn(null); }}
                           className={`w-full p-4 rounded-[24px] text-left transition-all border-2 ${selectedReturnCustomerId === c.id ? 'bg-white border-primary shadow-xl scale-105' : 'bg-white border-slate-100 opacity-60 hover:opacity-100'}`}
                         >
                            <div className="font-black text-xs uppercase">{c.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold mt-1 tracking-wider">{c.phone}</div>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="flex-1 bg-white p-8 overflow-y-auto custom-scrollbar">
                    {!selectedReturnCustomerId ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 grayscale opacity-50">
                         <User size={80}/>
                         <p className="font-black uppercase tracking-[4px] text-xs">Please select a customer first</p>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in fade-in duration-300">
                         <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><FileText size={16} className="text-primary"/> Step 2: Select Invoice to Return From</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sales.filter(s => s.customerId === selectedReturnCustomerId).map(sale => (
                               <button 
                                 key={sale.id}
                                 onClick={() => setSelectedSaleToReturn(sale)}
                                 className={`p-6 rounded-[32px] text-left border-2 transition-all ${selectedSaleToReturn?.id === sale.id ? 'border-primary bg-primary/5 shadow-lg scale-102' : 'border-slate-100 hover:border-primary/20'}`}
                               >
                                  <div className="flex justify-between items-center mb-3">
                                     <span className="text-[10px] font-black text-slate-400 uppercase">#{sale.invoiceNo}</span>
                                     <span className="text-[10px] font-black text-primary uppercase">{sale.date}</span>
                                  </div>
                                  <div className="text-lg font-black text-slate-900 tracking-tight">৳{sale.total.toLocaleString()}</div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{sale.items.length} Products purchased</div>
                               </button>
                            ))}
                         </div>
                         {selectedSaleToReturn && (
                           <div className="pt-8 border-t-2 border-slate-50 animate-in slide-in-from-top-4">
                              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><Package size={16} className="text-primary"/> Step 3: Select Items & Quantities</h4>
                              <div className="space-y-3">
                                 {selectedSaleToReturn.items.map(item => (
                                   <div key={item.id} className="p-4 bg-slate-50 rounded-[24px] border-2 border-slate-100 flex items-center justify-between">
                                      <div>
                                         <div className="text-xs font-black text-slate-800 uppercase">{item.productName}</div>
                                         <div className="text-[10px] font-bold text-slate-400 uppercase">Original Qty: {item.quantity} • Paid: ৳{item.total}</div>
                                      </div>
                                      <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200">
                                         <button onClick={() => setReturnQtys(prev => ({ ...prev, [item.productId]: Math.max(0, (prev[item.productId] || 0) - 1) }))} className="p-1.5 text-slate-400 hover:text-rose-500 transition-all"><Minus size={14}/></button>
                                         <span className="text-xs font-black min-w-[20px] text-center">{returnQtys[item.productId] || 0}</span>
                                         <button onClick={() => setReturnQtys(prev => ({ ...prev, [item.productId]: Math.min(item.quantity, (prev[item.productId] || 0) + 1) }))} className="p-1.5 text-slate-400 hover:text-emerald-500 transition-all"><Plus size={14}/></button>
                                      </div>
                                   </div>
                                 ))}
                              </div>
                              <div className="mt-10 p-8 bg-rose-50 rounded-[40px] border-2 border-rose-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                                 <div>
                                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-[2px]">Refund Estimated</div>
                                    <div className="text-3xl font-black text-rose-700 tracking-tightest">৳{
                                       (Object.entries(returnQtys) as [string, number][]).reduce((sum, [pid, qty]) => {
                                          const item = selectedSaleToReturn.items.find(i => i.productId === pid);
                                          return sum + (qty * (item?.unitPrice || 0));
                                       }, 0).toLocaleString()
                                    }</div>
                                 </div>
                                 <button 
                                   onClick={() => {
                                      (Object.entries(returnQtys) as [string, number][]).forEach(([pid, qty], idx) => {
                                         if (qty > 0) {
                                            const item = selectedSaleToReturn.items.find(i => i.productId === pid);
                                            if (item) {
                                               onAddReturn({
                                                  id: `RET-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
                                                  saleId: selectedSaleToReturn.id,
                                                  productId: pid,
                                                  productName: item.productName,
                                                  quantity: qty,
                                                  amount: qty * item.unitPrice,
                                                  reason: 'Customer Return',
                                                  type: 'return',
                                                  date: new Date().toISOString().split('T')[0],
                                                  staffName: currentStaff?.name || 'Admin',
                                                  addedBy: currentStaff?.id
                                               });
                                            }
                                         }
                                      });
                                      setShowReturnModal(false);
                                      setReturnQtys({});
                                   }}
                                   className="w-full sm:w-auto bg-rose-600 text-white px-10 py-5 rounded-[28px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-rose-900/20 active-scale"
                                 >
                                    Confirm Refund Process
                                 </button>
                              </div>
                           </div>
                         )}
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
