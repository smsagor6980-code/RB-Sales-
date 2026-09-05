import React, { useState, useMemo } from 'react';
import { 
  Supplier, Product, Purchase, PurchaseItem, ProductCategory, 
  SupplierPayment, SupplierReturn, ShopSettings, Staff, WalletTransaction 
} from '../types';
import { 
  Plus, Edit, Trash2, Search, X, Truck, Phone, Building2, 
  DollarSign, Save, ShoppingBag, History, User, Package,
  TrendingUp, Calendar, Info, Check, Minus, Filter, LayoutGrid, Zap,
  ArrowUpRight, CreditCard, Wallet, Calculator, FileText, Printer,
  AlertCircle, ArrowRightLeft, ArrowDown, ArrowUp, ArrowRight, ChevronDown,
  Download, MessageCircle, Send, CheckCircle2, RotateCcw, ListFilter,
  Eye, RefreshCw, Layers, ShieldCheck, Mail, MapPin, Tag, Sparkles,
  ArrowDownLeft, Coins
} from 'lucide-react';

interface SuppliersProps {
  suppliers: Supplier[];
  products: Product[];
  purchases: Purchase[];
  payments?: SupplierPayment[];
  returns?: SupplierReturn[];
  onUpdate: (suppliers: Supplier[]) => void;
  onDelete?: (id: string) => void;
  onPurchaseComplete: (purchase: Purchase, suppliers: Supplier[], products: Product[]) => void;
  onPayment?: (payment: SupplierPayment, suppliers: Supplier[]) => void;
  onSupplierReturn?: (ret: SupplierReturn, suppliers: Supplier[], products: Product[]) => void;
  categories: ProductCategory[];
  isAdmin?: boolean;
  currentStaff?: Staff | null;
  shopSettings?: ShopSettings;
  walletTransactions?: WalletTransaction[];
  onWalletTransaction?: (txData: Omit<WalletTransaction, 'id' | 'createdAt'>, updatedSupplier: Supplier) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ 
  suppliers = [], 
  products = [], 
  purchases = [], 
  payments = [],
  returns = [],
  onUpdate, 
  onDelete,
  onPurchaseComplete, 
  onPayment,
  onSupplierReturn,
  categories = [],
  isAdmin = false,
  currentStaff,
  shopSettings,
  walletTransactions = [],
  onWalletTransaction
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'directory' | 'purchases' | 'payments' | 'returns' | 'ledger'>('directory');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState<string | null>(null);
  const [showPurchaseDetails, setShowPurchaseDetails] = useState<Purchase | null>(null);
  const [showPaymentReceipt, setShowPaymentReceipt] = useState<SupplierPayment | null>(null);

  // Supplier Wallet Modal State
  const [showSupplierWalletModal, setShowSupplierWalletModal] = useState(false);
  const [supplierWalletActionType, setSupplierWalletActionType] = useState<'topup' | 'adjustment_deduct' | 'withdraw'>('topup');
  const [supplierWalletAmount, setSupplierWalletAmount] = useState('');
  const [supplierWalletNote, setSupplierWalletNote] = useState('');
  const [supplierWalletGateway, setSupplierWalletGateway] = useState('bank');
  const [supplierWalletTrxId, setSupplierWalletTrxId] = useState('');

  // Search & Filtering State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'paid' | 'active'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'due_desc' | 'purchase_desc' | 'name_asc' | 'recent'>('due_desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profilePeriod, setProfilePeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  // Purchase Order State
  const [purchaseSupplierId, setPurchaseSupplierId] = useState<string>('');
  const [purchaseCart, setPurchaseCart] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState('all');
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<'all' | 'raw_material' | 'finished_good'>('all');
  const [paidInput, setPaidInput] = useState('');
  const [purchaseDiscount, setPurchaseDiscount] = useState<number>(0);
  const [purchaseTransport, setPurchaseTransport] = useState<number>(0);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<string>('Cash');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [autoUpdateStock, setAutoUpdateStock] = useState(true);
  const [mobilePurchaseTab, setMobilePurchaseTab] = useState<'catalog' | 'cart'>('catalog');

  // Payment Modal State
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payNote, setPayNote] = useState('');
  const [payChequeNo, setPayChequeNo] = useState('');
  const [payTrxId, setPayTrxId] = useState('');

  // Return Modal State
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnPrice, setReturnPrice] = useState<number>(0);
  const [returnReason, setReturnReason] = useState('ড্যামেজ / ত্রুটিপূর্ণ পণ্য');
  const [returnRefundType, setReturnRefundType] = useState<'reduce_due' | 'cash_refund'>('reduce_due');

  // Supplier Form Data State
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    phone: '',
    email: '',
    companyName: '',
    contactPerson: '',
    address: '',
    dueAmount: 0,
    category: 'পাইকারি সরবরাহকারী',
    status: 'active',
    bankName: '',
    bankAccountNo: '',
    bankBranch: '',
    routingNo: '',
    bkashNo: '',
    nagadNo: '',
    notes: '',
    dateAdded: new Date().toISOString().split('T')[0]
  });

  // Dynamic Ledger & KPI Calculations
  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const totalDue = suppliers.reduce((sum, s) => sum + (s.dueAmount || 0), 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalReturns = returns.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const dueSuppliers = suppliers.filter(s => (s.dueAmount || 0) > 0).length;
    const activeSuppliersCount = suppliers.filter(s => s.status !== 'inactive').length;

    return {
      totalSuppliers,
      totalDue,
      totalPurchases,
      totalPayments,
      totalReturns,
      dueSuppliers,
      activeSuppliersCount
    };
  }, [suppliers, purchases, payments, returns]);

  // Filtered & Sorted Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter(s => {
        const matchesSearch = 
          (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
          (s.phone || '').includes(search) ||
          (s.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
          (s.address || '').toLowerCase().includes(search.toLowerCase()) ||
          (s.contactPerson || '').toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = 
          statusFilter === 'all' ? true : 
          statusFilter === 'due' ? (s.dueAmount || 0) > 0 : 
          statusFilter === 'paid' ? (s.dueAmount || 0) <= 0 :
          statusFilter === 'active' ? s.status !== 'inactive' : true;

        const matchesCat = categoryFilter === 'all' || s.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCat;
      })
      .sort((a, b) => {
        if (sortBy === 'due_desc') return (b.dueAmount || 0) - (a.dueAmount || 0);
        if (sortBy === 'purchase_desc') return (b.totalPurchase || 0) - (a.totalPurchase || 0);
        if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'recent') return (b.dateAdded || '').localeCompare(a.dateAdded || '');
        return 0;
      });
  }, [suppliers, search, statusFilter, categoryFilter, sortBy]);

  // Selected Active Supplier (for Profile, Payment, Purchase or Return)
  const activeSupplier = useMemo(() => {
    const targetId = showProfileModal || showPaymentModal || showReturnModal || purchaseSupplierId;
    return suppliers.find(s => s.id === targetId) || null;
  }, [suppliers, showProfileModal, showPaymentModal, showReturnModal, purchaseSupplierId]);

  // Lifetime metrics for active supplier
  const activeSupplierLifetimePurchase = useMemo(() => {
    if (!activeSupplier) return 0;
    return purchases
      .filter(p => p.supplierId === activeSupplier.id)
      .reduce((sum, p) => sum + (p.total || 0), 0);
  }, [purchases, activeSupplier]);

  const activeSupplierLifetimePaid = useMemo(() => {
    if (!activeSupplier) return 0;
    return payments
      .filter(p => p.supplierId === activeSupplier.id)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments, activeSupplier]);

  // Dynamic Double-Entry Ledger for active supplier
  const activeSupplierLedger = useMemo(() => {
    if (!activeSupplier) return [];
    
    const supplierPurchases = purchases
      .filter(p => p.supplierId === activeSupplier.id)
      .map(p => ({
        id: p.id,
        date: p.date,
        type: 'purchase' as const,
        description: `পণ্য ক্রয়: #${p.purchaseNo} (${p.items?.length || 0}টি আইটেম)`,
        amount: p.total,
        debit: p.total, // Purchase increases payable liability
        credit: 0,
        originalData: p
      }));
      
    const supplierPayments = payments
      .filter(p => p.supplierId === activeSupplier.id)
      .map(p => ({
        id: p.id,
        date: p.date,
        type: 'payment' as const,
        description: `পেমেন্ট পরিশোধ (${p.method})${p.voucherNo ? ` [ভাউচার #${p.voucherNo}]` : ''}${p.note ? ` - ${p.note}` : ''}`,
        amount: p.amount,
        debit: 0,
        credit: p.amount, // Payment decreases liability
        originalData: p
      }));

    const supplierReturns = returns
      .filter(r => r.supplierId === activeSupplier.id)
      .map(r => ({
        id: r.id,
        date: r.date,
        type: 'return' as const,
        description: `মাল ফেরত: ${r.productName} (${r.quantity}টি) [${r.refundType === 'reduce_due' ? 'বকেয়া সমন্বয়' : 'নগদ ফেরত'}]`,
        amount: r.totalAmount,
        debit: 0,
        credit: r.refundType === 'reduce_due' ? r.totalAmount : 0, // Only reduce due reduces payable
        originalData: r
      }));
      
    return [...supplierPurchases, ...supplierPayments, ...supplierReturns].sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases, payments, returns, activeSupplier]);

  const filteredLedger = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const ledger = activeSupplierLedger.filter(item => {
      if (profilePeriod === 'all') return true;
      if (profilePeriod === 'today') return item.date === todayStr || item.date.startsWith(todayStr);
      if (profilePeriod === 'week') {
        const itemDate = new Date(item.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return itemDate >= sevenDaysAgo;
      }
      if (profilePeriod === 'month') return item.date.startsWith(todayStr.substring(0, 7));
      if (profilePeriod === 'year') return item.date.startsWith(todayStr.substring(0, 4));
      return true;
    });

    let runningBalance = 0;
    const oldestFirst = [...activeSupplierLedger].sort((a, b) => a.date.localeCompare(b.date));
    const balanceMap: Record<string, number> = {};
    
    oldestFirst.forEach(item => {
      if (item.type === 'purchase') runningBalance += item.amount;
      else if (item.type === 'payment') runningBalance -= item.amount;
      else if (item.type === 'return') {
        const ret = item.originalData as SupplierReturn;
        if (ret?.refundType === 'reduce_due') {
          runningBalance -= item.amount;
        }
      }
      balanceMap[item.id] = runningBalance;
    });

    return ledger.map(item => ({ ...item, balance: balanceMap[item.id] || 0 }));
  }, [activeSupplierLedger, profilePeriod]);

  // Selected Profile Supplier Wallet Transactions
  const supplierWalletTxs = useMemo(() => {
    if (!activeSupplier) return [];
    return walletTransactions.filter(tx => 
      tx.profileId === activeSupplier.id ||
      (tx.profileType === 'supplier' && tx.profilePhone === activeSupplier.phone) ||
      (tx.customerId === activeSupplier.id)
    ).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [walletTransactions, activeSupplier]);

  const handleExecuteSupplierWalletAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier) return;
    const numAmount = parseFloat(supplierWalletAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const currentBal = activeSupplier.walletBalance || 0;
    let newBal = currentBal;
    let newTotalDeposited = activeSupplier.totalWalletDeposited || 0;
    let newTotalUsed = activeSupplier.totalWalletUsed || 0;

    if (supplierWalletActionType === 'topup') {
      newBal = currentBal + numAmount;
      newTotalDeposited += numAmount;
    } else {
      // adjustment_deduct or withdraw
      newBal = Math.max(0, currentBal - numAmount);
      newTotalUsed += numAmount;
    }

    const updatedSupplier: Supplier = {
      ...activeSupplier,
      walletBalance: newBal,
      totalWalletDeposited: newTotalDeposited,
      totalWalletUsed: newTotalUsed
    };

    const newTx: Omit<WalletTransaction, 'id' | 'createdAt'> = {
      profileType: 'supplier',
      profileId: activeSupplier.id,
      profileName: activeSupplier.name,
      profilePhone: activeSupplier.phone,
      type: supplierWalletActionType === 'withdraw' ? 'withdrawal' : supplierWalletActionType,
      amount: numAmount,
      gatewayId: supplierWalletGateway,
      gatewayName: supplierWalletGateway === 'bkash' ? 'বিকাশ' : supplierWalletGateway === 'nagad' ? 'নগদ' : supplierWalletGateway === 'bank' ? 'ব্যাংক ডিপোজিট' : 'নগদ ক্যাশ',
      trxId: supplierWalletTrxId || undefined,
      note: supplierWalletNote || (supplierWalletActionType === 'topup' ? 'সাপ্লায়ার অগ্রিম জমা' : supplierWalletActionType === 'adjustment_deduct' ? 'বকেয়া বিলের সাথে ওয়ালেট সমন্বয়' : 'ওয়ালেট ব্যালেন্স রিফান্ড/উইথড্র'),
      balanceBefore: currentBal,
      balanceAfter: newBal,
      status: 'approved',
      approvedBy: currentStaff?.id,
      approvedByName: currentStaff?.name || 'Admin',
      date: new Date().toLocaleDateString('en-CA')
    };

    if (onWalletTransaction) {
      onWalletTransaction(newTx, updatedSupplier);
    } else {
      onUpdate(suppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    }

    setShowSupplierWalletModal(false);
    setSupplierWalletAmount('');
    setSupplierWalletNote('');
    setSupplierWalletTrxId('');
  };

  // Form Reset & Open Handlers
  const resetForm = () => {
    setFormData({ 
      name: '', 
      phone: '', 
      email: '',
      companyName: '', 
      contactPerson: '',
      address: '', 
      dueAmount: 0, 
      category: 'পাইকারি সরবরাহকারী',
      status: 'active',
      bankName: '',
      bankAccountNo: '',
      bankBranch: '',
      routingNo: '',
      bkashNo: '',
      nagadNo: '',
      notes: '',
      dateAdded: new Date().toISOString().split('T')[0] 
    });
    setEditingId(null);
  };

  const handleEditSupplier = (s: Supplier) => {
    setEditingId(s.id);
    setFormData({
      ...s,
      dateAdded: s.dateAdded?.split('T')[0] || new Date().toISOString().split('T')[0]
    });
    setShowSupplierModal(true);
  };

  const handleSubmitSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.phone?.trim()) {
      alert('অনুগ্রহ করে সরবরাহকারীর নাম এবং ফোন নম্বর পূরণ করুন।');
      return;
    }

    if (editingId) {
      const existing = suppliers.find(s => s.id === editingId);
      if (existing) {
        const updated = {
          ...existing,
          ...formData,
          dueAmount: formData.dueAmount !== undefined ? formData.dueAmount : existing.dueAmount
        } as Supplier;
        onUpdate([updated]);
      }
    } else {
      const newSupplier: Supplier = {
        id: `SUP-${Date.now()}`,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || '',
        companyName: formData.companyName?.trim() || '',
        contactPerson: formData.contactPerson?.trim() || '',
        address: formData.address?.trim() || '',
        dueAmount: parseFloat(String(formData.dueAmount)) || 0,
        totalPurchase: 0,
        category: formData.category || 'পাইকারি সরবরাহকারী',
        status: formData.status || 'active',
        bankName: formData.bankName || '',
        bankAccountNo: formData.bankAccountNo || '',
        bankBranch: formData.bankBranch || '',
        routingNo: formData.routingNo || '',
        bkashNo: formData.bkashNo || '',
        nagadNo: formData.nagadNo || '',
        notes: formData.notes || '',
        dateAdded: formData.dateAdded || new Date().toISOString(),
        addedBy: currentStaff?.id
      };
      onUpdate([newSupplier]);
    }
    setShowSupplierModal(false);
    resetForm();
  };

  // Payment Execution Handler
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) {
      alert('সঠিক পরিশোধের পরিমাণ লিখুন।');
      return;
    }

    const updatedSupplier: Supplier = {
      ...activeSupplier,
      dueAmount: Math.max(0, (activeSupplier.dueAmount || 0) - amount)
    };

    const newPayment: SupplierPayment = {
      id: `PAY-${Date.now()}`,
      voucherNo: `VCH-${Date.now().toString().slice(-6)}`,
      supplierId: activeSupplier.id,
      supplierName: activeSupplier.name,
      amount,
      method: payMethod,
      date: new Date().toISOString().split('T')[0],
      note: payNote,
      chequeNo: payChequeNo,
      transactionId: payTrxId,
      addedBy: currentStaff?.id
    };

    if (onPayment) {
      onPayment(newPayment, [updatedSupplier]);
    } else {
      onUpdate([updatedSupplier]);
    }
    
    setShowPaymentModal(null);
    setShowPaymentReceipt(newPayment);
    setPayAmount('');
    setPayNote('');
    setPayChequeNo('');
    setPayTrxId('');
  };

  // Return to Supplier Execution Handler
  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier || !returnProductId) {
      alert('অনুগ্রহ করে পণ্য নির্বাচন করুন।');
      return;
    }
    const product = products.find(p => p.id === returnProductId);
    if (!product) return;

    const qty = Math.max(1, returnQty);
    const price = returnPrice > 0 ? returnPrice : (product.purchasePrice || 0);
    const total = qty * price;

    let updatedSupplier = { ...activeSupplier };
    if (returnRefundType === 'reduce_due') {
      updatedSupplier.dueAmount = Math.max(0, (updatedSupplier.dueAmount || 0) - total);
    }

    const updatedProduct = {
      ...product,
      stock: Math.max(0, (product.stock || 0) - qty)
    };

    const newReturn: SupplierReturn = {
      id: `SRET-${Date.now()}`,
      returnNo: `RET-${Date.now().toString().slice(-6)}`,
      supplierId: activeSupplier.id,
      supplierName: activeSupplier.name,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitPrice: price,
      totalAmount: total,
      refundType: returnRefundType,
      reason: returnReason,
      date: new Date().toISOString().split('T')[0],
      addedBy: currentStaff?.id
    };

    if (onSupplierReturn) {
      onSupplierReturn(newReturn, [updatedSupplier], [updatedProduct]);
    }

    setShowReturnModal(null);
    setReturnProductId('');
    setReturnQty(1);
    setReturnPrice(0);
    alert('সাপ্লায়ারের নিকট পণ্য সফলভাবে ফেরত পাঠানো হয়েছে এবং স্টক সমন্বয় করা হয়েছে।');
  };

  // Purchase Order Helpers
  const addToPurchaseCart = (p: Product) => {
    setPurchaseCart(prev => {
      const existing = prev.find(item => item.productId === p.id);
      const unitPrice = p.purchasePrice || 0;
      if (existing) {
        return prev.map(item => item.productId === p.id ? { 
          ...item, 
          quantity: item.quantity + 1, 
          total: Math.round((item.quantity + 1) * item.unitPrice) 
        } : item);
      }
      return [...prev, {
        id: `PC-${Date.now()}`,
        productId: p.id,
        productName: p.name,
        quantity: 1,
        unitPrice,
        total: unitPrice,
        productType: p.productType || 'finished_good'
      }];
    });
  };

  const updatePurchaseQty = (id: string, qty: number) => {
    setPurchaseCart(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        quantity: Math.max(1, qty), 
        total: Math.round(Math.max(1, qty) * item.unitPrice) 
      } : item
    ));
  };

  const updatePurchasePrice = (id: string, price: number) => {
    setPurchaseCart(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        unitPrice: Math.max(0, price), 
        total: Math.round(item.quantity * Math.max(0, price)) 
      } : item
    ));
  };

  // Cart Calculations
  const cartSubtotal = Math.round(purchaseCart.reduce((sum, item) => sum + item.total, 0));
  const finalPurchaseTotal = Math.max(0, Math.round(cartSubtotal - (purchaseDiscount || 0) + (purchaseTransport || 0)));
  const currentPaid = parseFloat(paidInput) || 0;
  const currentPurchaseDue = Math.max(0, finalPurchaseTotal - currentPaid);

  const displayPurchaseProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) || 
                             (p.sku || '').toLowerCase().includes(productSearch.toLowerCase());
        const matchesCategory = purchaseCategory === 'all' || p.category === purchaseCategory;
        const matchesType = purchaseTypeFilter === 'all' ? true :
                            purchaseTypeFilter === 'raw_material' ? p.productType === 'raw_material' :
                            p.productType !== 'raw_material';
        return matchesSearch && matchesCategory && matchesType;
      })
      .sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  }, [products, productSearch, purchaseCategory, purchaseTypeFilter]);

  const completePurchase = () => {
    const selectedSupplier = suppliers.find(s => s.id === purchaseSupplierId) || activeSupplier;
    if (!selectedSupplier) {
      alert('অনুগ্রহ করে সরবরাহকারী নির্বাচন করুন।');
      return;
    }
    if (purchaseCart.length === 0) {
      alert('ক্রয় তালিকায় কমপক্ষে একটি পণ্য যোগ করুন।');
      return;
    }

    const newPurchase: Purchase = {
      id: Date.now().toString(),
      purchaseNo: `PUR-${Date.now().toString().slice(-6)}`,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      supplierPhone: selectedSupplier.phone,
      date: purchaseDate,
      items: purchaseCart,
      subtotal: cartSubtotal,
      discount: purchaseDiscount,
      transportCost: purchaseTransport,
      total: finalPurchaseTotal,
      paid: currentPaid,
      due: currentPurchaseDue,
      paymentMethod: currentPaid > 0 ? purchasePaymentMethod : undefined,
      status: currentPurchaseDue > 0 ? 'due' : 'paid',
      notes: purchaseNotes,
      addedBy: currentStaff?.id
    };

    const updatedSuppliers = suppliers.map(s => {
      if (s.id === selectedSupplier.id) {
        return {
          ...s,
          dueAmount: (s.dueAmount || 0) + currentPurchaseDue,
          totalPurchase: (s.totalPurchase || 0) + finalPurchaseTotal
        };
      }
      return s;
    });

    const updatedProducts = products.map(p => {
      const cartItem = purchaseCart.find(item => item.productId === p.id);
      if (cartItem) {
        return { 
          ...p, 
          purchasePrice: cartItem.unitPrice,
          stock: autoUpdateStock ? (p.stock || 0) + cartItem.quantity : p.stock
        };
      }
      return p;
    });

    onPurchaseComplete(newPurchase, updatedSuppliers, updatedProducts);
    setShowPurchaseModal(false);
    setPurchaseCart([]);
    setPaidInput('');
    setPurchaseDiscount(0);
    setPurchaseTransport(0);
    setPurchaseNotes('');
    alert(`পণ্য ক্রয় সফলভাবে সম্পন্ন হয়েছে! ইনভয়েস: ${newPurchase.purchaseNo}`);
  };

  // Print & PDF Helpers
  const handlePrintLedger = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headerStr = 'Supplier Name,Company,Phone,Email,Category,Lifetime Buy,Current Due,Status,Address\n';
    const rows = filteredSuppliers.map(s => 
      `"${s.name}","${s.companyName || ''}","${s.phone}","${s.email || ''}","${s.category || ''}",${s.totalPurchase || 0},${s.dueAmount || 0},"${s.status || 'active'}","${s.address || ''}"`
    );
    const blob = new Blob([headerStr + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Suppliers_List_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 pb-20 font-sans">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 shadow-sm">
        <div className="w-full xl:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                সরবরাহকারী ব্যবস্থাপনা (Supplier Management)
              </h2>
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 mt-0.5">
                সাপ্লায়ার তালিকা, ক্রয় ইনভয়েস, বকেয়া হিসাব ও সমন্বিত ডাবল-এন্ট্রি লেজার
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto">
          <button 
            onClick={() => {
              setPurchaseSupplierId(suppliers[0]?.id || '');
              setShowPurchaseModal(true);
            }} 
            className="col-span-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all min-h-[44px]"
          >
            <ShoppingBag className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">নতুন মাল ক্রয়</span>
          </button>

          <button 
            onClick={() => { 
              resetForm(); 
              setShowSupplierModal(true); 
            }} 
            className="col-span-1 sm:flex-none bg-primary hover:bg-primary/90 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-lg shadow-primary/20 active:scale-95 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">নতুন সাপ্লায়ার</span>
          </button>

          <button 
            onClick={handleExportCSV}
            className="col-span-2 sm:col-span-1 p-2.5 sm:p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl sm:rounded-2xl border border-slate-200 transition-all active:scale-95 flex items-center justify-center gap-1.5 font-bold text-xs min-h-[44px]"
            title="Export CSV"
          >
            <Download size={18} />
            <span className="sm:hidden">CSV ডাউনলোড</span>
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">মোট সরবরাহকারী</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 sm:mt-2 tracking-tight">
                {stats.totalSuppliers} <span className="text-xs text-slate-400 font-bold">জন</span>
              </h3>
              <p className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 size={12}/> {stats.activeSuppliersCount} জন সক্রিয় সাপ্লায়ার
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-rose-100/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-[11px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle size={13}/> মোট দেনা (Payable Due)
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-rose-600 mt-1.5 sm:mt-2 tracking-tight">
                ৳{stats.totalDue.toLocaleString()}
              </h3>
              <p className="text-[10px] font-bold text-rose-500/80 mt-1">
                {stats.dueSuppliers} জন সরবরাহকারী টাকা পাবে
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-100/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp size={13}/> সর্বমোট ক্রয় (Purchases)
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1.5 sm:mt-2 tracking-tight">
                ৳{stats.totalPurchases.toLocaleString()}
              </h3>
              <p className="text-[10px] font-bold text-emerald-600/80 mt-1">
                {purchases.length}টি ক্রয় চালান রেকর্ড
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-indigo-100/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                <ArrowUpRight size={13}/> মোট পরিশোধিত (Settled)
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-indigo-700 mt-1.5 sm:mt-2 tracking-tight">
                ৳{stats.totalPayments.toLocaleString()}
              </h3>
              <p className="text-[10px] font-bold text-indigo-600/80 mt-1">
                {payments.length}টি পেমেন্ট ভাউচার প্রদান
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Module Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar scroll-smooth">
        <button 
          onClick={() => setActiveTab('directory')}
          className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all shrink-0 min-h-[40px] ${
            activeTab === 'directory' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Truck size={15}/> <span>সাপ্লায়ার তালিকা</span> <span className="text-[10px] opacity-75">({suppliers.length})</span>
        </button>

        <button 
          onClick={() => setActiveTab('purchases')}
          className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all shrink-0 min-h-[40px] ${
            activeTab === 'purchases' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag size={15}/> <span>ক্রয় চালান</span> <span className="text-[10px] opacity-75">({purchases.length})</span>
        </button>

        <button 
          onClick={() => setActiveTab('payments')}
          className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all shrink-0 min-h-[40px] ${
            activeTab === 'payments' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <DollarSign size={15}/> <span>পেমেন্ট ভাউচার</span> <span className="text-[10px] opacity-75">({payments.length})</span>
        </button>

        <button 
          onClick={() => setActiveTab('returns')}
          className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all shrink-0 min-h-[40px] ${
            activeTab === 'returns' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <RotateCcw size={15}/> <span>মাল ফেরত</span> <span className="text-[10px] opacity-75">({returns.length})</span>
        </button>
      </div>

      {/* TAB 1: SUPPLIERS DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
            <div className="relative w-full lg:w-80 xl:w-96">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
              <input 
                type="text" 
                placeholder="নাম, ফোন, প্রতিষ্ঠান বা ঠিকানা খুঁজুন..." 
                className="w-full pl-10 pr-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all min-h-[42px]"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between lg:justify-end">
              {/* Status Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
                {(['all', 'due', 'paid', 'active'] as const).map(f => (
                  <button 
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase transition-all whitespace-nowrap ${
                      statusFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {f === 'all' ? 'সকল' : f === 'due' ? 'বকেয়া' : f === 'paid' ? 'পরিশোধিত' : 'সক্রিয়'}
                  </button>
                ))}
              </div>

              {/* Sort selector */}
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 outline-none min-h-[38px]"
              >
                <option value="due_desc">সর্বোচ্চ বকেয়া দেনা</option>
                <option value="purchase_desc">সর্বোচ্চ মোট ক্রয়</option>
                <option value="name_asc">নাম অনুযায়ী (A-Z)</option>
                <option value="recent">নতুন যুক্ত</option>
              </select>

              {/* View mode toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                <button 
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                  title="Table View"
                >
                  <FileText size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                  title="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Suppliers Table View */}
          {viewMode === 'table' ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar -webkit-overflow-scrolling-touch">
                <table className="w-full text-left min-w-[700px] lg:min-w-[900px]">
                  <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-3.5 sm:p-5">সরবরাহকারী বিবরণী</th>
                      <th className="p-3.5 sm:p-5">যোগাযোগ ও ঠিকানা</th>
                      <th className="p-3.5 sm:p-5 text-right">মোট ক্রয় (Buy)</th>
                      <th className="p-3.5 sm:p-5 text-right">বর্তমান দেনা / বকেয়া</th>
                      <th className="p-3.5 sm:p-5 text-center">দ্রুত অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredSuppliers.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-all">
                        <td className="p-3.5 sm:p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs sm:text-sm border border-primary/20 shrink-0 uppercase">
                              {s.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{s.name}</span>
                                {s.status === 'inactive' && (
                                  <span className="bg-slate-100 text-slate-400 text-[9px] px-1.5 py-0.5 rounded-md font-bold">নিষ্ক্রিয়</span>
                                )}
                              </div>
                              <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-0.5 flex-wrap">
                                <Building2 size={11} className="text-slate-400 shrink-0"/>
                                <span className="truncate">{s.companyName || 'স্বতন্ত্র সরবরাহকারী'}</span>
                                {s.category && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-primary text-[10px]">{s.category}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 sm:p-5">
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 flex-wrap">
                            <Phone size={12} className="text-slate-400" />
                            <span>{s.phone}</span>
                            <a 
                              href={`https://wa.me/88${s.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${s.name} ভাই, ${shopSettings?.name || 'দোকান'} থেকে যোগাযোগ করছি।`)}`}
                              target="_blank" 
                              rel="noreferrer"
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Send WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                            <a 
                              href={`tel:${s.phone}`}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Call"
                            >
                              <Phone size={14} />
                            </a>
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400 font-bold mt-1 truncate max-w-[180px] sm:max-w-[220px] flex items-center gap-1">
                            <MapPin size={11} className="shrink-0" />
                            <span className="truncate">{s.address || 'ঠিকানা দেওয়া নেই'}</span>
                          </div>
                        </td>

                        <td className="p-3.5 sm:p-5 text-right">
                          <div className="font-black text-xs sm:text-sm text-emerald-700">
                            ৳{(s.totalPurchase || 0).toLocaleString()}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            মোট লেনদেন
                          </div>
                        </td>

                        <td className="p-3.5 sm:p-5 text-right">
                          <div className={`font-black text-xs sm:text-base ${s.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ৳{(s.dueAmount || 0).toLocaleString()}
                          </div>
                          <div className="text-[9px] font-bold uppercase mt-0.5">
                            {s.dueAmount > 0 ? (
                              <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">বকেয়া পাওনা</span>
                            ) : (
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">পরিশোধিত</span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 sm:p-5">
                          <div className="flex items-center justify-center gap-1">
                            {/* Pay Due Button */}
                            <button 
                              onClick={() => {
                                setShowPaymentModal(s.id);
                                setPayAmount(s.dueAmount > 0 ? String(s.dueAmount) : '');
                              }}
                              className={`p-2 rounded-xl transition-all min-h-[36px] min-w-[36px] flex items-center justify-center ${
                                s.dueAmount > 0 
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200' 
                                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                              title="পেমেন্ট জমা"
                            >
                              <DollarSign size={15}/>
                            </button>

                            {/* Purchase Button */}
                            <button 
                              onClick={() => {
                                setPurchaseSupplierId(s.id);
                                setShowPurchaseModal(true);
                              }}
                              className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl border border-blue-200 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="মাল ক্রয় (Stock-In)"
                            >
                              <ShoppingBag size={15}/>
                            </button>

                            {/* Return Button */}
                            <button 
                              onClick={() => {
                                setShowReturnModal(s.id);
                              }}
                              className="p-2 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-xl border border-amber-200 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="মাল ফেরত (Return)"
                            >
                              <RotateCcw size={15}/>
                            </button>

                            {/* View Profile / Ledger */}
                            <button 
                              onClick={() => setShowProfileModal(s.id)}
                              className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white rounded-xl transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="লেজার ও প্রোফাইল"
                            >
                              <FileText size={15}/>
                            </button>

                            {/* Edit */}
                            <button 
                              onClick={() => handleEditSupplier(s)}
                              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="সম্পাদনা"
                            >
                              <Edit size={15}/>
                            </button>

                            {/* Delete (Admin only) */}
                            {isAdmin && (
                              <button 
                                onClick={() => {
                                  if (window.confirm(`${s.name} কে মুছে ফেলতে চান?`)) {
                                    onDelete?.(s.id);
                                  }
                                }}
                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                                title="মুছুন"
                              >
                                <Trash2 size={15}/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredSuppliers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-slate-400">
                          <Truck size={36} className="mx-auto mb-2 opacity-30" />
                          <p className="font-bold text-xs">কোন সরবরাহকারী পাওয়া যায়নি</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
              {filteredSuppliers.map(s => (
                <div key={s.id} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-sm sm:text-base shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-900 text-sm sm:text-base truncate">{s.name}</h4>
                          <p className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">{s.companyName || 'স্বতন্ত্র সরবরাহকারী'}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2 sm:px-2.5 py-1 rounded-full shrink-0 ${
                        s.dueAmount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {s.dueAmount > 0 ? 'বকেয়া' : 'পরিশোধিত'}
                      </span>
                    </div>

                    <div className="space-y-2 py-3 border-y border-slate-100 text-xs font-bold text-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">মোবাইল:</span>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>{s.phone}</span>
                          <a 
                            href={`https://wa.me/88${s.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank" 
                            rel="noreferrer"
                            className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"
                          >
                            <MessageCircle size={13} />
                          </a>
                          <a 
                            href={`tel:${s.phone}`}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                          >
                            <Phone size={13} />
                          </a>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">মোট ক্রয়:</span>
                        <span className="text-emerald-700 font-black">৳{(s.totalPurchase || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">বর্তমান দেনা:</span>
                        <span className="text-rose-600 font-black">৳{(s.dueAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2 flex items-center justify-between gap-2">
                    <button 
                      onClick={() => setShowProfileModal(s.id)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px]"
                    >
                      লেজার প্রোফাইল
                    </button>
                    <button 
                      onClick={() => {
                        setShowPaymentModal(s.id);
                        setPayAmount(s.dueAmount > 0 ? String(s.dueAmount) : '');
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm min-h-[40px]"
                    >
                      পেমেন্ট জমা
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PURCHASES & INVOICES */}
      {activeTab === 'purchases' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">ক্রয় ও স্টক-ইন ইনভয়েস তালিকা</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-bold">সকল সরবরাহকারীর চালানের বিস্তারিত রেকর্ড</p>
              </div>

              <button 
                onClick={() => {
                  setPurchaseSupplierId(suppliers[0]?.id || '');
                  setShowPurchaseModal(true);
                }}
                className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 min-h-[40px] shadow-sm active:scale-95"
              >
                <Plus size={16} /> নতুন ক্রয় চালান
              </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar -webkit-overflow-scrolling-touch">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3 sm:p-4">চালান নং ও তারিখ</th>
                    <th className="p-3 sm:p-4">সরবরাহকারী</th>
                    <th className="p-3 sm:p-4 text-center">আইটেম</th>
                    <th className="p-3 sm:p-4 text-right">মোট বিল</th>
                    <th className="p-3 sm:p-4 text-right">পরিশোধিত</th>
                    <th className="p-3 sm:p-4 text-right">বকেয়া</th>
                    <th className="p-3 sm:p-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                  {purchases.map(p => {
                    const sup = suppliers.find(s => s.id === p.supplierId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="p-3 sm:p-4">
                          <div className="font-black text-slate-900">#{p.purchaseNo}</div>
                          <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Calendar size={11} /> {p.date}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="font-black text-slate-900">{p.supplierName || sup?.name || 'অজানা সাপ্লায়ার'}</div>
                          <div className="text-[10px] text-slate-400">{sup?.companyName}</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px]">
                            {p.items?.length || 0} টি
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 text-right font-black text-slate-900">
                          ৳{(p.total || 0).toLocaleString()}
                        </td>
                        <td className="p-3 sm:p-4 text-right font-black text-emerald-700">
                          ৳{(p.paid || 0).toLocaleString()}
                        </td>
                        <td className="p-3 sm:p-4 text-right">
                          <span className={`font-black ${p.due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ৳{(p.due || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          <button 
                            onClick={() => setShowPurchaseDetails(p)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all inline-flex items-center gap-1 text-[11px] min-h-[36px]"
                          >
                            <Eye size={14} /> দেখুন
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {purchases.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        কোন ক্রয় চালান পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS & VOUCHERS */}
      {activeTab === 'payments' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">পেমেন্ট ভাউচার হিস্ট্রি</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-bold">সরবরাহকারীদের পরিশোধিত অর্থের রশিদ ও হিসাব</p>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar -webkit-overflow-scrolling-touch">
              <table className="w-full text-left min-w-[650px]">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3 sm:p-4">ভাউচার নং ও তারিখ</th>
                    <th className="p-3 sm:p-4">সরবরাহকারী</th>
                    <th className="p-3 sm:p-4">মাধ্যম</th>
                    <th className="p-3 sm:p-4">নোট / ট্রানজেকশন</th>
                    <th className="p-3 sm:p-4 text-right">পরিমাণ (৳)</th>
                    <th className="p-3 sm:p-4 text-center">রশিদ প্রিন্ট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                  {payments.map(pay => {
                    const sup = suppliers.find(s => s.id === pay.supplierId);
                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/70">
                        <td className="p-3 sm:p-4">
                          <div className="font-black text-slate-900">{pay.voucherNo || `#${pay.id.slice(-6)}`}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{pay.date}</div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="font-black text-slate-900">{pay.supplierName || sup?.name || 'অজানা'}</div>
                          <div className="text-[10px] text-slate-400">{sup?.phone}</div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <span className="bg-blue-50 text-blue-700 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                            {pay.method}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 text-slate-500 font-normal text-[11px]">
                          {pay.note || pay.transactionId || '-'}
                        </td>
                        <td className="p-3 sm:p-4 text-right font-black text-emerald-700 text-sm">
                          ৳{(pay.amount || 0).toLocaleString()}
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          <button 
                            onClick={() => setShowPaymentReceipt(pay)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
                            title="রশিদ দেখুন"
                          >
                            <Printer size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        কোন পেমেন্ট রেকর্ড পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RETURNS & ADJUSTMENTS */}
      {activeTab === 'returns' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">পণ্য ফেরত ও সমন্বয় হিস্ট্রি</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-bold">সাপ্লায়ারের নিকট ফেরত পাঠানো ড্যামেজ/ত্রুটিপূর্ণ পণ্যের রেকর্ড</p>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar -webkit-overflow-scrolling-touch">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3 sm:p-4">রিটার্ন নং ও তারিখ</th>
                    <th className="p-3 sm:p-4">সরবরাহকারী</th>
                    <th className="p-3 sm:p-4">ফেরত পণ্য</th>
                    <th className="p-3 sm:p-4 text-center">পরিমাণ ও দর</th>
                    <th className="p-3 sm:p-4">ফেরতের কারণ</th>
                    <th className="p-3 sm:p-4">সমন্বয় ধরন</th>
                    <th className="p-3 sm:p-4 text-right">মোট টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                  {returns.map(ret => (
                    <tr key={ret.id} className="hover:bg-slate-50/70">
                      <td className="p-3 sm:p-4">
                        <div className="font-black text-slate-900">{ret.returnNo || `#${ret.id.slice(-6)}`}</div>
                        <div className="text-[10px] text-slate-400">{ret.date}</div>
                      </td>
                      <td className="p-3 sm:p-4 font-black text-slate-900">{ret.supplierName}</td>
                      <td className="p-3 sm:p-4 font-black text-slate-800">{ret.productName}</td>
                      <td className="p-3 sm:p-4 text-center">
                        {ret.quantity} টি × ৳{ret.unitPrice}
                      </td>
                      <td className="p-3 sm:p-4 text-slate-500 text-[11px] font-normal">{ret.reason}</td>
                      <td className="p-3 sm:p-4">
                        <span className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          ret.refundType === 'reduce_due' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {ret.refundType === 'reduce_due' ? 'বকেয়া সমন্বয়' : 'নগদ ফেরত'}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-right font-black text-rose-600">
                        ৳{(ret.totalAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {returns.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        কোন রিটার্ন রেকর্ড পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT SUPPLIER */}
      {/* ========================================================================= */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-2xl sm:rounded-[32px] w-full max-w-2xl p-4 sm:p-8 shadow-2xl border border-slate-100 my-4 sm:my-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-black text-slate-900">
                    {editingId ? 'সাপ্লায়ার তথ্য আপডেট' : 'নতুন সাপ্লায়ার নিবন্ধন'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-bold">সরবরাহকারীর পূর্ণাঙ্গ পরিচিতি ও হিসাব</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSupplierModal(false)}
                className="text-slate-400 hover:text-rose-600 p-2 rounded-xl"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmitSupplier} className="space-y-3.5 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">সরবরাহকারীর নাম *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="উদা: হাজী আব্দুল করিম" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 min-h-[42px]"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">মোবাইল নম্বর *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="017XXXXXXXX" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 min-h-[42px]"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">কোম্পানি / প্রতিষ্ঠান নাম</label>
                  <input 
                    type="text" 
                    placeholder="উদা: মেঘনা গ্রুপ / প্রাণ আরএফএল" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 min-h-[42px]"
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">যোগাযোগের ব্যক্তি (Contact Person)</label>
                  <input 
                    type="text" 
                    placeholder="উদা: ম্যানেজার মো: সুমন" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 min-h-[42px]"
                    value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">ক্যাটাগরি</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none min-h-[42px]"
                  >
                    <option value="পাইকারি সরবরাহকারী">পাইকারি সরবরাহকারী</option>
                    <option value="কোম্পানি ডিলার">কোম্পানি ডিলার</option>
                    <option value="ইমপোর্টার / আমদানিকারক">ইমপোর্টার / আমদানিকারক</option>
                    <option value="স্থানীয় উৎপাদক">স্থানীয় উৎপাদক</option>
                    <option value="অন্যান্য">অন্যান্য</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">পূর্বের বকেয়া দেনা (৳)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:bg-white min-h-[42px]"
                    value={formData.dueAmount}
                    onChange={e => setFormData({ ...formData, dueAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">যোগদানের তারিখ</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none min-h-[42px]"
                    value={formData.dateAdded?.split('T')[0]}
                    onChange={e => setFormData({ ...formData, dateAdded: e.target.value })}
                  />
                </div>
              </div>

              {/* Bank & Payment Info Section */}
              <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={14} /> ব্যাংক ও মোবাইল পেমেন্ট তথ্য (ঐচ্ছিক)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <input 
                    type="text" 
                    placeholder="ব্যাংকের নাম ও ব্রাঞ্চ" 
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none min-h-[38px]"
                    value={formData.bankName}
                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                  />
                  <input 
                    type="text" 
                    placeholder="ব্যাংক একাউন্ট নম্বর" 
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none min-h-[38px]"
                    value={formData.bankAccountNo}
                    onChange={e => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  />
                  <input 
                    type="text" 
                    placeholder="বিকাশ নম্বর" 
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none min-h-[38px]"
                    value={formData.bkashNo}
                    onChange={e => setFormData({ ...formData, bkashNo: e.target.value })}
                  />
                  <input 
                    type="text" 
                    placeholder="নগদ নম্বর" 
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none min-h-[38px]"
                    value={formData.nagadNo}
                    onChange={e => setFormData({ ...formData, nagadNo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">ঠিকানা</label>
                <textarea 
                  rows={2}
                  placeholder="সরবরাহকারীর বিস্তারিত ঠিকানা লিখুন..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:bg-white"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="flex gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase min-h-[44px]"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase shadow-lg shadow-primary/20 min-h-[44px]"
                >
                  তথ্য সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MAL KROY / PROCUREMENT ORDER (Stock-In) - FULLY RESPONSIVE */}
      {/* ========================================================================= */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-2 md:p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-none sm:rounded-2xl md:rounded-[32px] w-full max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[95vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden my-auto">
            
            {/* Header */}
            <div className="p-3.5 sm:p-4 lg:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/20 shrink-0">
                  <ShoppingBag size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 leading-tight">নতুন মালামাল ক্রয় ও স্টক-ইন চালান</h3>
                    <span className="hidden xs:inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                      Procurement
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-bold hidden xs:block">পণ্য ও কাঁচামাল নির্বাচন, দর নির্ধারণ ও স্বয়ংক্রিয় স্টক সমন্বয়</p>
                </div>
              </div>

              <button 
                onClick={() => setShowPurchaseModal(false)}
                className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors"
                title="বন্ধ করুন"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Mobile Tab Switcher (< lg screens) */}
            <div className="lg:hidden flex bg-slate-100/90 p-1.5 border-b border-slate-200 shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => setMobilePurchaseTab('catalog')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  mobilePurchaseTab === 'catalog'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package size={14} className="text-emerald-600" />
                <span>মালামাল ক্যাটালগ</span>
              </button>

              <button
                type="button"
                onClick={() => setMobilePurchaseTab('cart')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 relative ${
                  mobilePurchaseTab === 'cart'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag size={14} />
                <span>ক্রয় চালান ({purchaseCart.length})</span>
                {cartSubtotal > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${mobilePurchaseTab === 'cart' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    ৳{cartSubtotal.toLocaleString()}
                  </span>
                )}
              </button>
            </div>

            {/* Content Area - Responsive Grid */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              
              {/* Product Picker Column (7 cols on desktop, full width on mobile when catalog tab active) */}
              <div className={`lg:col-span-7 p-3 sm:p-4 lg:p-5 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100 ${
                mobilePurchaseTab === 'catalog' ? 'flex' : 'hidden lg:flex'
              }`}>
                {/* Supplier Picker & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 mb-2.5 sm:mb-3 shrink-0">
                  <div className="sm:col-span-7">
                    <label className="text-[10px] font-black text-slate-600 uppercase mb-1 flex items-center gap-1">
                      <Truck size={12} className="text-teal-600" /> সরবরাহকারী নির্বাচন *
                    </label>
                    <select 
                      value={purchaseSupplierId}
                      onChange={e => setPurchaseSupplierId(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none min-h-[40px] transition-colors"
                    >
                      <option value="">-- সাপ্লায়ার নির্বাচন করুন --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.companyName || 'স্বতন্ত্র'}) - বকেয়া: ৳{(s.dueAmount || 0).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="text-[10px] font-black text-slate-600 uppercase mb-1 flex items-center gap-1">
                      <Calendar size={12} className="text-blue-600" /> ক্রয়ের তারিখ
                    </label>
                    <input 
                      type="date"
                      value={purchaseDate}
                      onChange={e => setPurchaseDate(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none min-h-[40px] transition-colors"
                    />
                  </div>
                </div>

                {/* Filter Pills & Search */}
                <div className="space-y-2 mb-2.5 sm:mb-3 shrink-0">
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setPurchaseTypeFilter('all')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] sm:text-xs font-black uppercase transition-all whitespace-nowrap ${
                        purchaseTypeFilter === 'all' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      সব আইটেম ({products.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchaseTypeFilter('raw_material')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] sm:text-xs font-black uppercase transition-all whitespace-nowrap ${
                        purchaseTypeFilter === 'raw_material' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🌾 কাঁচামাল
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchaseTypeFilter('finished_good')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] sm:text-xs font-black uppercase transition-all whitespace-nowrap ${
                        purchaseTypeFilter === 'finished_good' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📦 রেডি পণ্য
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-7 relative">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                      <input 
                        type="text" 
                        placeholder="পণ্য বা কাঁচামাল খুঁজুন..." 
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-600 rounded-xl text-xs font-bold outline-none min-h-[38px]"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                      />
                      {productSearch && (
                        <button 
                          onClick={() => setProductSearch('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="sm:col-span-5">
                      <select 
                        value={purchaseCategory}
                        onChange={e => setPurchaseCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none min-h-[38px]"
                      >
                        <option value="all">সকল ক্যাটাগরি</option>
                        {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Products Grid - Scrollable with Custom Scrollbar */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-16 lg:pb-2">
                  <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-2 sm:gap-2.5">
                    {displayPurchaseProducts.map(p => {
                      const isRaw = p.productType === 'raw_material';
                      const inCart = purchaseCart.find(i => i.productId === p.id);
                      return (
                        <div 
                          key={p.id}
                          onClick={() => addToPurchaseCart(p)}
                          className={`bg-white p-2.5 sm:p-3 rounded-2xl border-2 transition-all flex flex-col justify-between group cursor-pointer active:scale-95 ${
                            inCart 
                              ? 'border-emerald-500 shadow-md shadow-emerald-500/10 bg-emerald-50/20' 
                              : 'border-slate-100 hover:border-emerald-500/50 hover:shadow-sm'
                          }`}
                        >
                          <div>
                            <div className="aspect-square bg-slate-50 rounded-xl mb-2 overflow-hidden flex items-center justify-center relative">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-1.5" />
                              ) : (
                                <Package size={26} className="text-slate-300" />
                              )}
                              <span className={`absolute top-1 left-1 text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-xs ${isRaw ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'}`}>
                                {isRaw ? 'কাঁচামাল' : 'রেডি'}
                              </span>
                              <span className={`absolute top-1 right-1 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs ${
                                (p.stock || 0) <= 5 ? 'bg-rose-100 text-rose-800' : 'bg-white/90 text-slate-700'
                              }`}>
                                স্টক: {p.stock || 0}
                              </span>
                              {inCart && (
                                <div className="absolute inset-0 bg-emerald-600/15 backdrop-blur-[1px] flex items-center justify-center">
                                  <span className="bg-emerald-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                    {inCart.quantity} {p.unit || 'pcs'} যোগ
                                  </span>
                                </div>
                              )}
                            </div>
                            <h5 className="font-black text-slate-900 text-[11px] sm:text-xs line-clamp-2 leading-tight group-hover:text-emerald-700">
                              {p.name}
                            </h5>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-[8px] text-slate-400 font-bold block uppercase">ক্রয় দর</span>
                              <span className="text-xs font-black text-emerald-700">৳{p.purchasePrice}/{p.unit || 'pcs'}</span>
                            </div>
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                              inCart 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                            }`}>
                              <Plus size={14} strokeWidth={3} />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {displayPurchaseProducts.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-400">
                        <Package size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="font-black text-xs">কোন পণ্য বা কাঁচামাল পাওয়া যায়নি</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Sticky Action Bar to switch to Cart */}
                {purchaseCart.length > 0 && (
                  <div className="lg:hidden absolute bottom-2 left-2 right-2 z-20">
                    <button
                      type="button"
                      onClick={() => setMobilePurchaseTab('cart')}
                      className="w-full bg-slate-950 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between font-black text-xs border border-slate-800 active:scale-98"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                          {purchaseCart.length}
                        </span>
                        <span>মোট বিল: ৳{finalPurchaseTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-400">
                        <span>চালান দেখুন</span>
                        <ArrowRight size={14} />
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Cart & Billing Column (5 cols on desktop, full width on mobile when cart tab active) */}
              <div className={`lg:col-span-5 p-3 sm:p-4 lg:p-5 bg-slate-50/70 flex flex-col overflow-hidden ${
                mobilePurchaseTab === 'cart' ? 'flex' : 'hidden lg:flex'
              }`}>
                <div className="flex justify-between items-center mb-2 shrink-0">
                  <h4 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <ShoppingBag size={16} className="text-emerald-600" />
                    ক্রয় তালিকা ({purchaseCart.length} টি আইটেম)
                  </h4>
                  {purchaseCart.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => setPurchaseCart([])}
                      className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase hover:underline"
                    >
                      তালিকা খালি করুন
                    </button>
                  )}
                </div>

                {/* Selected Items List - Custom Scrollable Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-[140px] max-h-[260px] lg:max-h-none">
                  {purchaseCart.map(item => (
                    <div key={item.id} className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs">
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <div className="min-w-0 flex-1">
                          <h6 className="font-black text-xs text-slate-900 truncate">{item.productName}</h6>
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                            item.productType === 'raw_material' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {item.productType === 'raw_material' ? 'কাঁচামাল' : 'রেডি পণ্য'}
                          </span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setPurchaseCart(purchaseCart.filter(i => i.id !== item.id))}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">পরিমাণ</label>
                          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <button 
                              type="button"
                              onClick={() => updatePurchaseQty(item.id, item.quantity - 1)}
                              className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-slate-700 font-black shadow-xs active:scale-90"
                            >
                              -
                            </button>
                            <input 
                              type="number"
                              className="w-full bg-transparent text-center font-black text-xs text-slate-900 outline-none"
                              value={item.quantity}
                              onChange={e => updatePurchaseQty(item.id, parseInt(e.target.value) || 1)}
                            />
                            <button 
                              type="button"
                              onClick={() => updatePurchaseQty(item.id, item.quantity + 1)}
                              className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-slate-700 font-black shadow-xs active:scale-90"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">ক্রয় দর প্রতি একক (৳)</label>
                          <input 
                            type="number"
                            className="w-full bg-slate-100 border border-slate-200 rounded-lg py-1 px-2 font-black text-xs text-right text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                            value={item.unitPrice}
                            onChange={e => updatePurchasePrice(item.id, parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="mt-1.5 pt-1 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-bold">মোট লাইন ভ্যালু:</span>
                        <span className="text-xs font-black text-emerald-800">৳{item.total.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}

                  {purchaseCart.length === 0 && (
                    <div className="py-8 lg:py-14 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-4">
                      <ShoppingBag size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="font-black text-xs text-slate-600">ক্রয় তালিকায় কোন পণ্য নেই</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">বাম পাশ থেকে পণ্য নির্বাচন করে যোগ করুন</p>
                      <button
                        type="button"
                        onClick={() => setMobilePurchaseTab('catalog')}
                        className="lg:hidden mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black"
                      >
                        পণ্য ক্যাটালগ দেখুন
                      </button>
                    </div>
                  )}
                </div>

                {/* Bill Calculation & Checkout Footer Card */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 shrink-0 bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-sm overflow-y-auto max-h-[340px] custom-scrollbar">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>আইটেম সাবটোটাল:</span>
                    <span className="font-black text-slate-900">৳{cartSubtotal.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">ডিসকাউন্ট (৳)</label>
                      <input 
                        type="number" 
                        placeholder="0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                        value={purchaseDiscount || ''}
                        onChange={e => setPurchaseDiscount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">পরিবহন/লেবার (৳)</label>
                      <input 
                        type="number" 
                        placeholder="0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                        value={purchaseTransport || ''}
                        onChange={e => setPurchaseTransport(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs sm:text-sm font-black text-slate-950 pt-1.5 border-t border-slate-100">
                    <span>সর্বমোট বিল (Net Total):</span>
                    <span className="text-sm sm:text-base text-emerald-800 font-black">৳{finalPurchaseTotal.toLocaleString()}</span>
                  </div>

                  {/* Payment Inputs */}
                  <div className="space-y-1.5 pt-1">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7">
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="text-[9px] font-black text-slate-600 uppercase">নগদ প্রদান (Paid)</label>
                          {finalPurchaseTotal > 0 && (
                            <button
                              type="button"
                              onClick={() => setPaidInput(String(finalPurchaseTotal))}
                              className="text-[9px] font-black text-emerald-600 hover:underline"
                            >
                              ১০০% পরিশোধ
                            </button>
                          )}
                        </div>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          className="w-full bg-emerald-50/70 border-2 border-emerald-300 focus:border-emerald-600 text-emerald-950 rounded-lg px-2.5 py-1.5 text-xs font-black outline-none"
                          value={paidInput}
                          onChange={e => setPaidInput(e.target.value)}
                        />
                      </div>

                      <div className="col-span-5">
                        <label className="text-[9px] font-black text-slate-600 uppercase block mb-0.5">পেমেন্ট মাধ্যম</label>
                        <select 
                          value={purchasePaymentMethod}
                          onChange={e => setPurchasePaymentMethod(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-slate-800 outline-none focus:border-emerald-600"
                        >
                          <option value="Cash">💵 Cash</option>
                          <option value="bKash">🌸 bKash</option>
                          <option value="Nagad">🍊 Nagad</option>
                          <option value="Bank">🏦 Bank</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-black">
                      <span>বকেয়া দেনা (Due):</span>
                      <span className="text-rose-700">৳{currentPurchaseDue.toLocaleString()}</span>
                    </div>

                    <div>
                      <input 
                        type="text" 
                        placeholder="চালান সংক্রান্ত নোট বা রেফারেন্স নং..." 
                        value={purchaseNotes}
                        onChange={e => setPurchaseNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-700 cursor-pointer pt-0.5 select-none">
                    <input 
                      type="checkbox" 
                      checked={autoUpdateStock} 
                      onChange={e => setAutoUpdateStock(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>পণ্য স্টক বৃদ্ধি করুন (Auto Stock Increment)</span>
                  </label>

                  <button 
                    type="button"
                    onClick={completePurchase}
                    disabled={purchaseCart.length === 0}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-40 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/25 active:scale-98 transition-all min-h-[44px]"
                  >
                    চালান সংরক্ষণ করুন
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUICK SUPPLIER PAYMENT */}
      {/* ========================================================================= */}
      {showPaymentModal && activeSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-2xl sm:rounded-[32px] w-full max-w-md p-4 sm:p-8 shadow-2xl border border-slate-100 my-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">সাপ্লায়ার পেমেন্ট ভাউচার</h3>
                  <p className="text-xs text-slate-400 font-bold truncate max-w-[200px]">{activeSupplier.name}</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(null)} className="text-slate-400 hover:text-rose-600 p-1">
                <X size={22} />
              </button>
            </div>

            <div className="bg-rose-50 p-3.5 sm:p-4 rounded-2xl border border-rose-100 mb-4 sm:mb-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider">বর্তমান মোট বকেয়া</p>
                <h4 className="text-xl sm:text-2xl font-black text-rose-700">৳{(activeSupplier.dueAmount || 0).toLocaleString()}</h4>
              </div>
              <Wallet size={24} className="text-rose-300" />
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5 sm:space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-black text-slate-600 uppercase">পরিশোধের পরিমাণ (৳) *</label>
                  <div className="flex gap-1">
                    <button 
                      type="button" 
                      onClick={() => setPayAmount(String(activeSupplier.dueAmount || 0))}
                      className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100"
                    >
                      100%
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPayAmount(String(Math.round((activeSupplier.dueAmount || 0) * 0.5)))}
                      className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
                    >
                      50%
                    </button>
                  </div>
                </div>
                <input 
                  type="number" 
                  required 
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3.5 py-2.5 sm:py-3 font-black text-lg sm:text-xl text-emerald-700 outline-none focus:bg-white focus:border-emerald-500 min-h-[46px]"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase mb-1.5 block">পেমেন্ট মাধ্যম</label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank', 'Cheque'].map(m => (
                    <button 
                      key={m} 
                      type="button" 
                      onClick={() => setPayMethod(m)}
                      className={`py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase transition-all min-h-[38px] ${
                        payMethod === m 
                          ? 'bg-slate-900 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {payMethod === 'Bank' || payMethod === 'Cheque' ? (
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">চেক / একাউন্ট নং</label>
                  <input 
                    type="text" 
                    placeholder="চেক নম্বর বা ব্যাংক রেফারেন্স"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none min-h-[40px]"
                    value={payChequeNo}
                    onChange={e => setPayChequeNo(e.target.value)}
                  />
                </div>
              ) : null}

              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">নোট / বিবরণ</label>
                <input 
                  type="text" 
                  placeholder="পেমেন্ট সম্পর্কিত অতিরিক্ত তথ্য..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none min-h-[40px]"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all min-h-[46px]"
              >
                পেমেন্ট সম্পন্ন করুন (Confirm Payment)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RETURN GOODS TO SUPPLIER */}
      {/* ========================================================================= */}
      {showReturnModal && activeSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-2xl sm:rounded-[32px] w-full max-w-md p-4 sm:p-8 shadow-2xl border border-slate-100 my-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">পণ্য ফেরত ও সমন্বয়</h3>
                  <p className="text-xs text-slate-400 font-bold truncate max-w-[200px]">{activeSupplier.name}</p>
                </div>
              </div>
              <button onClick={() => setShowReturnModal(null)} className="text-slate-400 hover:text-rose-600 p-1">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">ফেরতযোগ্য পণ্য নির্বাচন *</label>
                <select 
                  required
                  value={returnProductId}
                  onChange={e => {
                    setReturnProductId(e.target.value);
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod) setReturnPrice(prod.purchasePrice || 0);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none min-h-[40px]"
                >
                  <option value="">-- পণ্য নির্বাচন করুন --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (স্টক: {p.stock} টি) - ক্রয়মূল্য: ৳{p.purchasePrice}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">পরিমাণ (Units)</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={returnQty}
                    onChange={e => setReturnQty(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-black outline-none min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">ফেরত দর (৳)</label>
                  <input 
                    type="number" 
                    required
                    value={returnPrice}
                    onChange={e => setReturnPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-black outline-none min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">ফেরতের কারণ</label>
                <select 
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none min-h-[40px]"
                >
                  <option value="ড্যামেজ / ত্রুটিপূর্ণ পণ্য">ড্যামেজ / ত্রুটিপূর্ণ পণ্য</option>
                  <option value="মেয়াদোত্তীর্ণ পণ্য (Expired)">মেয়াদোত্তীর্ণ পণ্য (Expired)</option>
                  <option value="কোয়ালিটি সমস্যা">কোয়ালিটি সমস্যা</option>
                  <option value="অতিরিক্ত স্টক সমন্বয়">অতিরিক্ত স্টক সমন্বয়</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase mb-1 block">টাকা সমন্বয়ের পদ্ধতি</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setReturnRefundType('reduce_due')}
                    className={`p-2.5 rounded-xl text-xs font-black min-h-[40px] ${
                      returnRefundType === 'reduce_due' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    বকেয়া থেকে কর্তন
                  </button>
                  <button 
                    type="button"
                    onClick={() => setReturnRefundType('cash_refund')}
                    className={`p-2.5 rounded-xl text-xs font-black min-h-[40px] ${
                      returnRefundType === 'cash_refund' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    সরাসরি নগদ ফেরত
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs font-black text-slate-800">
                <span>মোট ফেরত মূল্য:</span>
                <span className="text-sm text-rose-600 font-black">
                  ৳{(returnQty * returnPrice).toLocaleString()}
                </span>
              </div>

              <button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all min-h-[44px]"
              >
                ফেরত নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SUPPLIER PROFILE & COMPLETE STATEMENT / LEDGER */}
      {/* ========================================================================= */}
      {showProfileModal && activeSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-6 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-2xl sm:rounded-[36px] w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden my-auto">
            
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-8 shrink-0 relative">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 text-white border border-white/20 flex items-center justify-center text-lg sm:text-xl font-black shrink-0">
                    {activeSupplier.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2 flex-wrap">
                      <span className="truncate">{activeSupplier.name}</span>
                      <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-md text-emerald-400">
                        {activeSupplier.category || 'সাপ্লায়ার'}
                      </span>
                    </h3>
                    <p className="text-xs text-white/70 font-bold flex items-center gap-3 mt-1 flex-wrap">
                      <span><Building2 size={12} className="inline mr-1"/> {activeSupplier.companyName || 'স্বতন্ত্র'}</span>
                      <span><Phone size={12} className="inline mr-1"/> {activeSupplier.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <button 
                    onClick={handlePrintLedger}
                    className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all flex items-center gap-1.5 text-xs font-bold min-h-[38px]"
                    title="Print Statement"
                  >
                    <Printer size={15} /> প্রিন্ট লেজার
                  </button>

                  <button 
                    onClick={() => {
                      setPurchaseSupplierId(activeSupplier.id);
                      setShowPurchaseModal(true);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs uppercase transition-all shadow-md min-h-[38px]"
                  >
                    + মাল ক্রয়
                  </button>

                  <button 
                    onClick={() => setShowProfileModal(null)}
                    className="text-white/60 hover:text-white p-2 rounded-xl"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Content Body */}
            <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-slate-50/50 custom-scrollbar">
              {/* Left Sidebar: Details & Stats */}
              <div className="md:col-span-4 p-4 sm:p-5 bg-white border-b md:border-b-0 md:border-r border-slate-100 md:overflow-y-auto custom-scrollbar space-y-3 sm:space-y-4">
                {/* Financial KPI Widgets */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 sm:gap-4">
                  <div className="bg-rose-50 p-3 sm:p-4 rounded-2xl border border-rose-100">
                    <p className="text-[9px] sm:text-[10px] font-black text-rose-500 uppercase tracking-wider">বর্তমান মোট দেনা</p>
                    <h4 className="text-lg sm:text-2xl font-black text-rose-700 mt-1">৳{(activeSupplier.dueAmount || 0).toLocaleString()}</h4>
                  </div>

                  <div className="bg-emerald-50 p-3 sm:p-4 rounded-2xl border border-emerald-100">
                    <p className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-wider">সর্বমোট ক্রয়</p>
                    <h4 className="text-lg sm:text-2xl font-black text-emerald-800 mt-1">৳{activeSupplierLifetimePurchase.toLocaleString()}</h4>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* SUPPLIER REST PAY DIGITAL WALLET & ADVANCE HUB */}
                {/* ========================================================================= */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl border border-indigo-500/20 text-white space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 block">
                          Supplier Rest Pay Wallet
                        </span>
                        <div className="text-xl font-black font-mono text-white">
                          ৳{(activeSupplier.walletBalance || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-[10px]">
                    <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">মোট অগ্রিম জমা</span>
                      <span className="text-[11px] font-black font-mono text-emerald-400">
                        ৳{(activeSupplier.totalWalletDeposited || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">মোট সমন্বয়/উইথড্র</span>
                      <span className="text-[11px] font-black font-mono text-amber-300">
                        ৳{(activeSupplier.totalWalletUsed || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Supplier Wallet Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSupplierWalletActionType('topup');
                        setShowSupplierWalletModal(true);
                      }}
                      className="py-2 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md"
                    >
                      <Plus size={13} /> অগ্রিম জমা
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSupplierWalletActionType('adjustment_deduct');
                        setShowSupplierWalletModal(true);
                      }}
                      className="py-2 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <ArrowRightLeft size={13} /> সমন্বয়
                    </button>
                  </div>

                  {/* Recent Supplier Wallet transactions */}
                  {supplierWalletTxs.length > 0 && (
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        সাম্প্রতিক ওয়ালেট হিস্টোরি
                      </span>
                      {supplierWalletTxs.slice(0, 3).map(tx => {
                        const isCredit = tx.type === 'topup';
                        return (
                          <div key={tx.id} className="flex items-center justify-between text-[10px] py-0.5 border-b border-slate-800/60 last:border-0">
                            <div className="truncate max-w-[130px]">
                              <span className="text-slate-300 font-bold block truncate">{tx.note || 'লেনদেন'}</span>
                              <span className="text-[8px] text-slate-500 font-mono">{tx.date}</span>
                            </div>
                            <span className={`font-mono font-black shrink-0 ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isCredit ? '+' : '-'}৳{tx.amount.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Info Card */}
                <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 sm:space-y-3 text-xs font-bold text-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">যোগাযোগ ও ব্যাংক হিসাব</p>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ঠিকানা:</span>
                    <span>{activeSupplier.address || 'ঠিকানা নেই'}</span>
                  </div>
                  {activeSupplier.contactPerson && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">কন্টাক্ট পার্সন:</span>
                      <span>{activeSupplier.contactPerson}</span>
                    </div>
                  )}
                  {activeSupplier.bankName && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">ব্যাংক একাউন্ট:</span>
                      <span>{activeSupplier.bankName} - {activeSupplier.bankAccountNo}</span>
                    </div>
                  )}
                  {activeSupplier.bkashNo && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">বিকাশ নম্বর:</span>
                      <span>{activeSupplier.bkashNo}</span>
                    </div>
                  )}
                </div>

                {/* Quick Payment Trigger */}
                <button 
                  onClick={() => {
                    setShowPaymentModal(activeSupplier.id);
                    setPayAmount(activeSupplier.dueAmount > 0 ? String(activeSupplier.dueAmount) : '');
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 min-h-[44px]"
                >
                  <DollarSign size={16} className="inline mr-1" /> বকেয়া পেমেন্ট জমা দিন
                </button>
              </div>

              {/* Right Side: Double Entry Statement Ledger */}
              <div className="md:col-span-8 p-3.5 sm:p-5 flex flex-col md:overflow-hidden bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-3 border-b border-slate-100 shrink-0">
                  <div>
                    <h4 className="font-black text-slate-900 text-xs sm:text-sm">হিসাব খতিয়ান বিবরণী (Ledger Statement)</h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold">সকল ডেবিট, ক্রেডিট ও রানিং ব্যালেন্স হিসাব</p>
                  </div>

                  {/* Period Filter */}
                  <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                    {(['all', 'today', 'week', 'month', 'year'] as const).map(p => (
                      <button 
                        key={p} 
                        onClick={() => setProfilePeriod(p)}
                        className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                          profilePeriod === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {p === 'all' ? 'সব' : p === 'today' ? 'আজ' : p === 'week' ? 'সপ্তাহ' : p === 'month' ? 'মাস' : 'বছর'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Statement Table */}
                <div className="flex-1 overflow-x-auto custom-scrollbar -webkit-overflow-scrolling-touch">
                  <table className="w-full text-left min-w-[500px]">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-2.5 sm:p-3">তারিখ</th>
                        <th className="p-2.5 sm:p-3">বিবরণ (Description)</th>
                        <th className="p-2.5 sm:p-3 text-right text-rose-600">ডেবিট (+) ক্রয়</th>
                        <th className="p-2.5 sm:p-3 text-right text-emerald-600">ক্রেডিট (-) প্রদান</th>
                        <th className="p-2.5 sm:p-3 text-right">ব্যালেন্স</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                      {filteredLedger.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="p-2.5 sm:p-3 text-slate-500 text-[10px] sm:text-[11px] font-medium whitespace-nowrap">{item.date}</td>
                          <td className="p-2.5 sm:p-3 font-bold text-slate-800 text-[11px] sm:text-xs">
                            {item.description}
                          </td>
                          <td className="p-2.5 sm:p-3 text-right font-black text-rose-600">
                            {item.debit > 0 ? `৳${item.debit.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-2.5 sm:p-3 text-right font-black text-emerald-600">
                            {item.credit > 0 ? `৳${item.credit.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-2.5 sm:p-3 text-right font-black text-slate-900">
                            ৳{item.balance.toLocaleString()}
                          </td>
                        </tr>
                      ))}

                      {filteredLedger.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 sm:py-16 text-center text-slate-400">
                            কোন লেনদেনের ইতিহাস পাওয়া যায়নি
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PURCHASE INVOICE DETAILS */}
      {/* ========================================================================= */}
      {showPurchaseDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-2xl sm:rounded-[32px] w-full max-w-2xl p-4 sm:p-8 shadow-2xl border border-slate-100 my-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">ক্রয় চালান ও ইনভয়েস</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 font-bold">ইনভয়েস #{showPurchaseDetails.purchaseNo} • তারিখ: {showPurchaseDetails.date}</p>
              </div>
              <button onClick={() => setShowPurchaseDetails(null)} className="text-slate-400 hover:text-rose-600 p-1">
                <X size={22} />
              </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar mb-4 -webkit-overflow-scrolling-touch">
              <table className="w-full text-left min-w-[400px]">
                <thead className="bg-slate-50 text-slate-600 text-[10px] font-black uppercase">
                  <tr>
                    <th className="p-2.5 sm:p-3">পণ্যর নাম</th>
                    <th className="p-2.5 sm:p-3 text-center">পরিমাণ</th>
                    <th className="p-2.5 sm:p-3 text-right">একক দর</th>
                    <th className="p-2.5 sm:p-3 text-right">মোট টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold">
                  {showPurchaseDetails.items?.map(item => (
                    <tr key={item.id}>
                      <td className="p-2.5 sm:p-3 text-slate-800">{item.productName}</td>
                      <td className="p-2.5 sm:p-3 text-center">{item.quantity} টি</td>
                      <td className="p-2.5 sm:p-3 text-right">৳{item.unitPrice}</td>
                      <td className="p-2.5 sm:p-3 text-right text-emerald-700">৳{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-black text-xs">
                  <tr>
                    <td colSpan={3} className="p-2.5 sm:p-3 text-right">সর্বমোট বিল:</td>
                    <td className="p-2.5 sm:p-3 text-right text-sm">৳{showPurchaseDetails.total.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2.5 sm:p-3 text-right text-emerald-600">পরিশোধিত:</td>
                    <td className="p-2.5 sm:p-3 text-right text-emerald-600">৳{showPurchaseDetails.paid.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2.5 sm:p-3 text-right text-rose-600">বকেয়া পাওনা:</td>
                    <td className="p-2.5 sm:p-3 text-right text-rose-600">৳{showPurchaseDetails.due.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button 
              onClick={() => setShowPurchaseDetails(null)}
              className="w-full bg-slate-900 text-white py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase min-h-[44px]"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: PAYMENT RECEIPT / VOUCHER */}
      {/* ========================================================================= */}
      {showPaymentReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-2xl sm:rounded-[32px] w-full max-w-md p-4 sm:p-8 shadow-2xl border border-slate-100 text-center my-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3 sm:mb-4">
              <CheckCircle2 size={28} />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900">পেমেন্ট মানি রিসিট</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 font-bold mb-4 sm:mb-6">ভাউচার নম্বর: {showPaymentReceipt.voucherNo || `#${showPaymentReceipt.id.slice(-6)}`}</p>

            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl text-left space-y-2 text-xs font-bold text-slate-700 mb-4 sm:mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">সরবরাহকারী:</span>
                <span>{showPaymentReceipt.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">তারিখ:</span>
                <span>{showPaymentReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">পেমেন্ট মাধ্যম:</span>
                <span>{showPaymentReceipt.method}</span>
              </div>
              {showPaymentReceipt.note && (
                <div className="flex justify-between">
                  <span className="text-slate-400">বিবরণ:</span>
                  <span>{showPaymentReceipt.note}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-emerald-700">
                <span>পরিশোধিত টাকা:</span>
                <span>৳{showPaymentReceipt.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2.5 sm:gap-3">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Printer size={15} /> প্রিন্ট রিসিট
              </button>
              <button 
                onClick={() => setShowPaymentReceipt(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase min-h-[44px]"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUPPLIER WALLET ACTION MODAL (Advance Topup / Deduct / Withdraw) */}
      {/* ========================================================================= */}
      {showSupplierWalletModal && activeSupplier && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                  supplierWalletActionType === 'topup' 
                    ? 'bg-indigo-600 text-white' 
                    : supplierWalletActionType === 'adjustment_deduct'
                    ? 'bg-amber-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}>
                  <Wallet size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {supplierWalletActionType === 'topup' 
                      ? 'সাপ্লায়ার একাউন্টে অগ্রিম টাকা জমা' 
                      : supplierWalletActionType === 'adjustment_deduct'
                      ? 'বকেয়া বিলের সাথে ওয়ালেট সমন্বয়'
                      : 'ওয়ালেট ব্যালেন্স রিফান্ড / উত্তোলন'}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    {activeSupplier.name} ({activeSupplier.phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierWalletModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Balance Overview */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-5 flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">বর্তমান ওয়ালেট ব্যালেন্স:</span>
              <span className="text-lg font-black font-mono text-indigo-700">
                ৳{(activeSupplier.walletBalance || 0).toLocaleString()}
              </span>
            </div>

            <form onSubmit={handleExecuteSupplierWalletAction} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  টাকার পরিমাণ (৳) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={supplierWalletAmount}
                  onChange={(e) => setSupplierWalletAmount(e.target.value)}
                  placeholder="যেমন: 25000"
                  className="w-full text-xl font-mono font-black p-3.5 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  পেমেন্ট মাধ্যম / চ্যানেল
                </label>
                <select
                  value={supplierWalletGateway}
                  onChange={(e) => setSupplierWalletGateway(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border-2 border-slate-200 font-bold text-xs bg-white outline-none focus:border-indigo-600"
                >
                  <option value="bank">ব্যাংক একাউন্ট ডিপোজিট</option>
                  <option value="bkash">বিকাশ (bKash)</option>
                  <option value="nagad">নগদ (Nagad)</option>
                  <option value="cash">নগদ ক্যাশ (Cash)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  ট্রানজেকশন আইডি / চেক নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={supplierWalletTrxId}
                  onChange={(e) => setSupplierWalletTrxId(e.target.value)}
                  placeholder="যেমন: TXN-8849202"
                  className="w-full p-3 rounded-2xl border-2 border-slate-200 font-mono text-xs bg-white outline-none focus:border-indigo-600 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  লেনদেনের উদ্দেশ্য / নোট
                </label>
                <input
                  type="text"
                  value={supplierWalletNote}
                  onChange={(e) => setSupplierWalletNote(e.target.value)}
                  placeholder={
                    supplierWalletActionType === 'topup' 
                      ? 'যেমন: আগামী চালানের অগ্রিম পেমেন্ট' 
                      : supplierWalletActionType === 'adjustment_deduct' 
                      ? 'যেমন: চালান নম্বরের সাথে সমন্বয়' 
                      : 'যেমন: অতিরিক্ত ব্যালেন্স রিফান্ড'
                  }
                  className="w-full p-3 rounded-2xl border-2 border-slate-200 text-xs bg-white outline-none focus:border-indigo-600"
                />
              </div>

              {/* Calculated New Balance Preview */}
              {supplierWalletAmount && parseFloat(supplierWalletAmount) > 0 && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs flex items-center justify-between text-indigo-900 font-bold">
                  <span>লেনদেন পরবর্তী নতুন ব্যালেন্স:</span>
                  <span className="font-mono text-sm font-black text-indigo-700">
                    ৳{(
                      supplierWalletActionType !== 'topup' 
                        ? Math.max(0, (activeSupplier.walletBalance || 0) - (parseFloat(supplierWalletAmount) || 0))
                        : (activeSupplier.walletBalance || 0) + (parseFloat(supplierWalletAmount) || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierWalletModal(false)}
                  className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-600 font-black text-xs uppercase hover:bg-slate-50 transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    supplierWalletActionType === 'topup' 
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' 
                      : supplierWalletActionType === 'adjustment_deduct'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  <Check size={16} /> নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Suppliers;
