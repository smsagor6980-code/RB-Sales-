import React, { useState, useMemo, useRef } from 'react';
import { Expense, Staff, ShopSettings, ExpenseCategory } from '../types';
import { 
  Plus, TrendingDown, FileText, Calendar, Calculator, Zap, Trash2, Edit, Search,
  Filter, Download, Printer, ArrowUpDown, DollarSign, Tag, CreditCard, User,
  CheckCircle2, AlertCircle, X, ChevronRight, PieChart as PieChartIcon,
  BarChart3, RefreshCw, Paperclip, Camera, Eye, Sparkles, Building, Phone,
  Clock, ShieldAlert, SlidersHorizontal, ArrowUpRight, Check, Layers, Image as ImageIcon,
  Wallet, Landmark, Receipt, ArrowRight, ArrowDownRight, Award
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../services/imageCompressor';

interface ExpensesProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onUpdateExpense?: (expense: Expense) => void;
  onDeleteExpense?: (id: string) => void;
  isAdmin: boolean;
  currentStaff?: Staff | null;
  allStaff?: Staff[];
  shopSettings?: ShopSettings | null;
}

// Built-in Default Categories
const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'rent', name: 'Shop Rent', nameBn: 'দোকান / গোডাউন ভাড়া', color: '#6366f1', icon: 'Building' },
  { id: 'salary', name: 'Staff Salary', nameBn: 'কর্মচারী বেতন / পারিশ্রমিক', color: '#10b981', icon: 'User' },
  { id: 'utilities', name: 'Electricity/Bills', nameBn: 'বিদ্যুৎ, গ্যাস ও পানির বিল', color: '#f59e0b', icon: 'Zap' },
  { id: 'transport', name: 'Transport / Delivery', nameBn: 'পরিবহন, কুরিয়ার ও যাতায়াত', color: '#3b82f6', icon: 'Layers' },
  { id: 'snacks', name: 'Tea & Snacks', nameBn: 'চা, নাস্তা ও আপ্যায়ন', color: '#ec4899', icon: 'Sparkles' },
  { id: 'marketing', name: 'Marketing / Promo', nameBn: 'মার্কেটিং ও প্রচার খরচ', color: '#8b5cf6', icon: 'Award' },
  { id: 'maintenance', name: 'Repairs & Maintenance', nameBn: 'দোকান মেরামত ও রক্ষণাবেক্ষণ', color: '#14b8a6', icon: 'SlidersHorizontal' },
  { id: 'packaging', name: 'Packaging & Bags', nameBn: 'প্যাকেজিং ও শপিং ব্যাগ', color: '#d97706', icon: 'Layers' },
  { id: 'tax_legal', name: 'Taxes & Licenses', nameBn: 'ট্রেড লাইসেন্স ও ট্যাক্স', color: '#64748b', icon: 'FileText' },
  { id: 'raw_material_misc', name: 'Raw Material Ancillary', nameBn: 'কাঁচামাল সংক্রান্ত আনুষঙ্গিক', color: '#0284c7', icon: 'Building' },
  { id: 'other', name: 'Other Expenses', nameBn: 'অন্যান্য দৈনন্দিন খরচ', color: '#94a3b8', icon: 'Tag' }
];

const PAYMENT_METHODS = [
  { id: 'cash', label: 'নগদ ক্যাশ (Cash)', icon: 'Wallet' },
  { id: 'bkash', label: 'বিকাশ (bKash)', icon: 'CreditCard' },
  { id: 'nagad', label: 'নগদ (Nagad)', icon: 'CreditCard' },
  { id: 'rocket', label: 'রকেট (Rocket)', icon: 'CreditCard' },
  { id: 'bank', label: 'ব্যাংক ট্রান্সফার (Bank)', icon: 'Landmark' },
  { id: 'cheque', label: 'চেক (Cheque)', icon: 'FileText' },
  { id: 'card', label: 'কার্ড (Debit/Credit Card)', icon: 'CreditCard' },
  { id: 'other', label: 'অন্যান্য (Other)', icon: 'Tag' }
];

const QUICK_PRESETS = [
  { label: 'চা ও বিস্কুট', category: 'snacks', amount: 50, desc: 'দোকানের চা-নাস্তা' },
  { label: 'আপ্যায়ন খরচ', category: 'snacks', amount: 150, desc: 'কাস্টমার আপ্যায়ন' },
  { label: 'রিকশা / ভ্যান ভাড়া', category: 'transport', amount: 80, desc: 'লোকাল ডেলিভারি/যাতায়াত' },
  { label: 'প্যাকেট/পলিথিন ব্যাগ', category: 'packaging', amount: 300, desc: 'শপিং ব্যাগ ক্রয়' },
  { label: 'দোকান পরিচ্ছন্নতা', category: 'maintenance', amount: 100, desc: 'ঝাড়ু/ক্লিনজার সামগ্রী' },
  { label: 'বিদ্যুৎ বিল', category: 'utilities', amount: 1200, desc: 'মাসিক বিদ্যুৎ বিল' },
];

export const Expenses: React.FC<ExpensesProps> = ({ 
  expenses, 
  onAddExpense, 
  onUpdateExpense, 
  onDeleteExpense, 
  isAdmin, 
  currentStaff, 
  allStaff = [],
  shopSettings 
}) => {
  const getLocalDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const getCurrentTime = () => {
    const d = new Date();
    return d.toTimeString().slice(0, 5); // HH:MM
  };

  // State: Dynamic Custom Categories (loaded from localStorage or initialized)
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => {
    try {
      const saved = localStorage.getItem('restbazer_custom_expense_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not load custom expense categories:", e);
    }
    return DEFAULT_CATEGORIES;
  });

  // State: Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'year' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = useState(getLocalDate());
  const [endDate, setEndDate] = useState(getLocalDate());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [activeTab, setActiveTab] = useState<'list' | 'analytics' | 'categories'>('list');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  // State: Modal & Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpenseForVoucher, setSelectedExpenseForVoucher] = useState<Expense | null>(null);
  const [viewReceiptModalUrl, setViewReceiptModalUrl] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    expenseNo: '',
    category: 'snacks',
    amount: '',
    description: '',
    date: getLocalDate(),
    time: getCurrentTime(),
    paymentMethod: 'cash',
    paidTo: '',
    referenceNo: '',
    receiptUrl: '',
    isRecurring: false,
    recurringFrequency: 'monthly' as const
  });

  const [isCompressingReceipt, setIsCompressingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Manager Modal state
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameBn, setNewCatNameBn] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');

  // Save custom categories to local storage
  const saveCategories = (updated: ExpenseCategory[]) => {
    setCategories(updated);
    try {
      localStorage.setItem('restbazer_custom_expense_categories', JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save custom categories:", e);
    }
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() && !newCatNameBn.trim()) return;
    const catId = `cat_${Date.now()}`;
    const newCat: ExpenseCategory = {
      id: catId,
      name: newCatName.trim() || newCatNameBn.trim(),
      nameBn: newCatNameBn.trim() || newCatName.trim(),
      color: newCatColor,
      isDefault: false
    };
    saveCategories([...categories, newCat]);
    setNewCatName('');
    setNewCatNameBn('');
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('আপনি কি এই খরচের ক্যাটাগরি মুছে ফেলতে চান?')) {
      const filtered = categories.filter(c => c.id !== id);
      saveCategories(filtered);
      if (selectedCategory === id) setSelectedCategory('all');
    }
  };

  // Open modal for new expense
  const openNewExpenseModal = (preset?: { category: string; amount: number; desc: string }) => {
    const nextExpenseNo = `EXP-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(expenses.length + 1).toString().padStart(3, '0')}`;
    setEditingExpense(null);
    setFormData({
      expenseNo: nextExpenseNo,
      category: preset?.category || 'snacks',
      amount: preset ? preset.amount.toString() : '',
      description: preset?.desc || '',
      date: getLocalDate(),
      time: getCurrentTime(),
      paymentMethod: 'cash',
      paidTo: '',
      referenceNo: '',
      receiptUrl: '',
      isRecurring: false,
      recurringFrequency: 'monthly'
    });
    setShowAddModal(true);
  };

  // Open modal for editing
  const openEditExpenseModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({
      expenseNo: exp.expenseNo || `EXP-${exp.id.slice(-4)}`,
      category: exp.category || 'other',
      amount: exp.amount.toString(),
      description: exp.description || '',
      date: exp.date || getLocalDate(),
      time: exp.time || '12:00',
      paymentMethod: exp.paymentMethod || 'cash',
      paidTo: exp.paidTo || '',
      referenceNo: exp.referenceNo || '',
      receiptUrl: exp.receiptUrl || '',
      isRecurring: exp.isRecurring || false,
      recurringFrequency: (exp.recurringFrequency as any) || 'monthly'
    });
    setShowAddModal(true);
  };

  // Handle Receipt Upload with Compression
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingReceipt(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 640, maxHeight: 640, quality: 0.7 });
      setFormData(prev => ({ ...prev, receiptUrl: compressed }));
    } catch (err) {
      console.warn("Receipt image compression failed:", err);
      alert("ছবি প্রসেসিংয়ে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন।");
    } finally {
      setIsCompressingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert("অনুগ্রহ করে খরচের সঠিক পরিমাণ লিখুন।");
      return;
    }

    const matchedCat = categories.find(c => c.id === formData.category);
    const categoryName = matchedCat ? (matchedCat.nameBn || matchedCat.name) : formData.category;

    if (editingExpense) {
      // Update
      const updatedExpense: Expense = {
        ...editingExpense,
        expenseNo: formData.expenseNo || editingExpense.expenseNo,
        amount: parseFloat(formData.amount),
        category: formData.category,
        categoryName,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        paymentMethod: formData.paymentMethod,
        paidTo: formData.paidTo,
        referenceNo: formData.referenceNo,
        receiptUrl: formData.receiptUrl,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.recurringFrequency,
        updatedAt: new Date().toISOString()
      };

      if (onUpdateExpense) {
        onUpdateExpense(updatedExpense);
      } else {
        onAddExpense(updatedExpense);
      }
    } else {
      // Create new
      const newExpense: Expense = {
        id: `exp_${Date.now()}`,
        expenseNo: formData.expenseNo || `EXP-${Date.now().toString().slice(-6)}`,
        amount: parseFloat(formData.amount),
        category: formData.category,
        categoryName,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        paymentMethod: formData.paymentMethod,
        paidTo: formData.paidTo,
        referenceNo: formData.referenceNo,
        receiptUrl: formData.receiptUrl,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.recurringFrequency,
        addedBy: currentStaff?.id || 'admin',
        addedByName: currentStaff?.name || 'এডমিন',
        createdAt: new Date().toISOString()
      };

      onAddExpense(newExpense);
    }

    setShowAddModal(false);
    setEditingExpense(null);
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    // Staff restrictions: If not admin, only see own expenses
    if (!isAdmin && currentStaff) {
      list = list.filter(e => e.addedBy === currentStaff.id);
    }

    // Date Filtering
    const todayStr = getLocalDate();
    const todayDate = new Date(todayStr);

    if (dateFilter === 'today') {
      list = list.filter(e => e.date === todayStr);
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(todayDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      list = list.filter(e => e.date === yStr);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(todayDate);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const wStr = weekAgo.toISOString().split('T')[0];
      list = list.filter(e => e.date >= wStr && e.date <= todayStr);
    } else if (dateFilter === 'month') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      list = list.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    } else if (dateFilter === 'last_month') {
      const now = new Date();
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      list = list.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === lastMonth && d.getFullYear() === targetYear;
      });
    } else if (dateFilter === 'year') {
      const currentYear = new Date().getFullYear();
      list = list.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === currentYear;
      });
    } else if (dateFilter === 'custom') {
      if (startDate) list = list.filter(e => e.date >= startDate);
      if (endDate) list = list.filter(e => e.date <= endDate);
    }

    // Category Filter
    if (selectedCategory !== 'all') {
      list = list.filter(e => e.category === selectedCategory);
    }

    // Payment Method Filter
    if (selectedPaymentMethod !== 'all') {
      list = list.filter(e => (e.paymentMethod || 'cash') === selectedPaymentMethod);
    }

    // Staff Filter (if Admin)
    if (selectedStaff !== 'all') {
      list = list.filter(e => e.addedBy === selectedStaff);
    }

    // Search Query (description, expenseNo, paidTo, referenceNo, category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e => 
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.expenseNo && e.expenseNo.toLowerCase().includes(q)) ||
        (e.paidTo && e.paidTo.toLowerCase().includes(q)) ||
        (e.referenceNo && e.referenceNo.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q)) ||
        (e.categoryName && e.categoryName.toLowerCase().includes(q)) ||
        (e.addedByName && e.addedByName.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.date + (b.time ? `T${b.time}` : '')).getTime() - new Date(a.date + (a.time ? `T${a.time}` : '')).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date + (a.time ? `T${a.time}` : '')).getTime() - new Date(b.date + (b.time ? `T${b.time}` : '')).getTime();
      }
      if (sortBy === 'amount_desc') {
        return (b.amount || 0) - (a.amount || 0);
      }
      if (sortBy === 'amount_asc') {
        return (a.amount || 0) - (b.amount || 0);
      }
      return 0;
    });

    return list;
  }, [expenses, isAdmin, currentStaff, dateFilter, startDate, endDate, selectedCategory, selectedPaymentMethod, selectedStaff, searchQuery, sortBy]);

  // Statistics Calculations
  const stats = useMemo(() => {
    let baseList = expenses;
    if (!isAdmin && currentStaff) {
      baseList = expenses.filter(e => e.addedBy === currentStaff.id);
    }

    const todayStr = getLocalDate();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const totalFiltered = filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalToday = baseList.filter(e => e.date === todayStr).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalThisMonth = baseList.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalLifetime = baseList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // Top Category in filtered set
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'other';
      catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
    });
    let topCategory = { id: 'none', label: 'কোনো খরচ নেই', amount: 0 };
    Object.entries(catMap).forEach(([catId, amt]) => {
      if (amt > topCategory.amount) {
        const found = categories.find(c => c.id === catId);
        topCategory = {
          id: catId,
          label: found ? (found.nameBn || found.name) : catId,
          amount: amt
        };
      }
    });

    // Average Expense per record
    const avgPerExpense = filteredExpenses.length > 0 ? Math.round(totalFiltered / filteredExpenses.length) : 0;

    return {
      totalFiltered,
      totalToday,
      totalThisMonth,
      totalLifetime,
      topCategory,
      avgPerExpense,
      count: filteredExpenses.length
    };
  }, [expenses, filteredExpenses, isAdmin, currentStaff, categories]);

  // Chart Data: Category Breakdown
  const categoryChartData = useMemo(() => {
    const map: Record<string, { label: string; amount: number; color: string }> = {};

    categories.forEach(cat => {
      map[cat.id] = {
        label: cat.nameBn || cat.name,
        amount: 0,
        color: cat.color || '#6366f1'
      };
    });

    filteredExpenses.forEach(e => {
      const catId = e.category || 'other';
      if (!map[catId]) {
        map[catId] = {
          label: e.categoryName || catId,
          amount: 0,
          color: '#94a3b8'
        };
      }
      map[catId].amount += Number(e.amount) || 0;
    });

    return Object.values(map)
      .filter(d => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [categories, filteredExpenses]);

  // Chart Data: Daily Timeline
  const dailyTimelineData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const d = e.date || 'Unknown';
      map[d] = (map[d] || 0) + (Number(e.amount) || 0);
    });

    return Object.entries(map)
      .map(([date, amount]) => ({
        date: date.slice(5), // MM-DD
        fullDate: date,
        amount
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [filteredExpenses]);

  // Chart Data: Payment Methods Breakdown
  const paymentMethodChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const pm = e.paymentMethod || 'cash';
      map[pm] = (map[pm] || 0) + (Number(e.amount) || 0);
    });

    return Object.entries(map).map(([pmId, amount]) => {
      const found = PAYMENT_METHODS.find(p => p.id === pmId);
      return {
        name: found ? found.label.split(' ')[0] : pmId,
        fullName: found ? found.label : pmId,
        amount
      };
    }).filter(d => d.amount > 0);
  }, [filteredExpenses]);

  // Export CSV / Excel
  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("ডাউনলোড করার মতো কোনো খরচের রেকর্ড নেই।");
      return;
    }

    const headers = ["ভাউচার নং", "তারিখ", "সময়", "ক্যাটাগরি", "টাকার পরিমাণ (৳)", "পেমেন্ট মাধ্যম", "প্রাপক (Paid To)", "রেফারেন্স / TrxID", "বিবরণ", "এন্ট্রি করেছেন"];
    const rows = filteredExpenses.map(e => [
      e.expenseNo || `EXP-${e.id.slice(-4)}`,
      e.date,
      e.time || '',
      getCategoryLabel(e.category),
      e.amount,
      getPaymentMethodLabel(e.paymentMethod),
      `"${(e.paidTo || '').replace(/"/g, '""')}"`,
      `"${(e.referenceNo || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.addedByName || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RestBazer_Expense_Report_${getLocalDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Statement Window
  const handlePrintStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const companyName = shopSettings?.name || 'Rest-Bazer';
    const companyPhone = shopSettings?.phone || '';
    const companyAddress = shopSettings?.address || '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>খরচের হিসাব স্টেটমেন্ট - ${companyName}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; line-height: 1.5; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; color: #0f172a; }
          .header p { margin: 2px 0; color: #64748b; font-size: 12px; }
          .statement-title { font-size: 16px; font-weight: bold; margin-top: 10px; color: #e11d48; text-transform: uppercase; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 15px; background: #f8fafc; padding: 10px 15px; border-radius: 8px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; color: #334155; font-size: 11px; text-transform: uppercase; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background: #fff1f2; color: #be123c; font-size: 14px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
          .signature-box { text-align: center; width: 160px; border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 11px; }
          @media print {
            button { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${companyName}</h1>
          <p>${companyAddress} • ফোন: ${companyPhone}</p>
          <div class="statement-title">ব্যবসায়িক খরচের পূর্ণাঙ্গ বিবরণী (Expense Statement)</div>
          <p>তারিখ: ${startDate === endDate ? startDate : `${startDate} থেকে ${endDate}`} | মোট এন্ট্রি: ${filteredExpenses.length} টি</p>
        </div>

        <div class="meta-grid">
          <div><strong>ফিল্টার:</strong> ${dateFilter.toUpperCase()} • <strong>ক্যাটাগরি:</strong> ${selectedCategory === 'all' ? 'সকল' : getCategoryLabel(selectedCategory)}</div>
          <div><strong>মোট খরচ:</strong> ৳${stats.totalFiltered.toLocaleString()}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ক্রমিক</th>
              <th>ভাউচার নং</th>
              <th>তারিখ</th>
              <th>খাত / ক্যাটাগরি</th>
              <th>প্রাপক (Paid To)</th>
              <th>পেমেন্ট মেথড</th>
              <th>বিবরণ</th>
              <th class="text-right">পরিমাণ (৳)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredExpenses.map((exp, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${exp.expenseNo || `EXP-${exp.id.slice(-4)}`}</strong></td>
                <td>${exp.date} ${exp.time || ''}</td>
                <td>${getCategoryLabel(exp.category)}</td>
                <td>${exp.paidTo || '-'}</td>
                <td>${getPaymentMethodLabel(exp.paymentMethod)}</td>
                <td>${exp.description || '-'}</td>
                <td class="text-right">৳${(exp.amount || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="7" class="text-right">সর্বমোট খরচ:</td>
              <td class="text-right">৳${stats.totalFiltered.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div class="signature-box">হিসাব প্রস্তুতকারক</div>
          <div class="signature-box">যাচাইকারী কর্মকর্তা</div>
          <div class="signature-box">স্বত্বাধিকারী / অনুমোদনকারী</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Print Single Voucher Slip (POS Thermal or Half-page)
  const handlePrintSingleVoucher = (exp: Expense) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const companyName = shopSettings?.name || 'Rest-Bazer';
    const companyPhone = shopSettings?.phone || '';
    const companyAddress = shopSettings?.address || '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>খরচ ভাউচার - ${exp.expenseNo || exp.id}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 15px; font-size: 12px; color: #000; }
          .center { text-align: center; }
          .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-bottom: 2px solid #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .amount-box { font-size: 18px; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #000; margin: 10px 0; }
          .signature-area { margin-top: 30px; display: flex; justify-content: space-between; }
          .sign-line { width: 100px; text-align: center; border-top: 1px dotted #000; font-size: 10px; padding-top: 3px; }
          @media print {
            body { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin:0; font-size:16px;">${companyName}</h2>
          <div style="font-size:10px;">${companyAddress}</div>
          <div style="font-size:10px;">ফোন: ${companyPhone}</div>
          <div class="divider"></div>
          <h3 style="margin:4px 0; font-size:13px; text-transform:uppercase;">খরচের ভাউচার (DEBIT VOUCHER)</h3>
          <div style="font-size:11px; font-weight:bold;">ভাউচার নং: ${exp.expenseNo || `EXP-${exp.id.slice(-4)}`}</div>
        </div>
        <div class="divider"></div>

        <div class="row"><span>তারিখ:</span><span>${exp.date} ${exp.time || ''}</span></div>
        <div class="row"><span>খরচের খাত:</span><span><strong>${getCategoryLabel(exp.category)}</strong></span></div>
        <div class="row"><span>পেমেন্ট মাধ্যম:</span><span>${getPaymentMethodLabel(exp.paymentMethod)}</span></div>
        ${exp.paidTo ? `<div class="row"><span>প্রাপক:</span><span>${exp.paidTo}</span></div>` : ''}
        ${exp.referenceNo ? `<div class="row"><span>রেফারেন্স/TrxID:</span><span>${exp.referenceNo}</span></div>` : ''}
        ${exp.addedByName ? `<div class="row"><span>এন্ট্রি করেছেন:</span><span>${exp.addedByName}</span></div>` : ''}
        
        <div class="double-divider"></div>
        <div style="margin: 5px 0;"><strong>বিবরণ:</strong> ${exp.description || 'দৈনন্দিন ব্যবসায়িক খরচ'}</div>

        <div class="amount-box">
          পরিমাণ: ৳${(exp.amount || 0).toLocaleString()}
        </div>

        <div class="signature-area">
          <div class="sign-line">গ্রহীতার স্বাক্ষর</div>
          <div class="sign-line">অনুমোদনকারী</div>
        </div>

        <div class="center" style="margin-top:20px; font-size:9px; color:#555;">
          ধন্যবাদ • সফটওয়্যার প্রস্তুতকারক: Rest-Bazer
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Helper Labels
  function getCategoryLabel(catId: string): string {
    const found = categories.find(c => c.id === catId);
    return found ? (found.nameBn || found.name) : catId;
  }

  function getCategoryColor(catId: string): string {
    const found = categories.find(c => c.id === catId);
    return found?.color || '#6366f1';
  }

  function getPaymentMethodLabel(pmId?: string): string {
    if (!pmId) return 'নগদ ক্যাশ';
    const found = PAYMENT_METHODS.find(p => p.id === pmId);
    return found ? found.label : pmId;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 max-w-7xl mx-auto px-2 sm:px-4">
      
      {/* 1. Header & Navigation Hub */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-[36px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center shadow-inner shrink-0">
            <TrendingDown size={28} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                খরচ ও হিসাব ব্যবস্থাপনা
              </h2>
              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                Expense Hub
              </span>
            </div>
            <p className="text-slate-500 font-bold text-xs sm:text-sm mt-0.5">
              দোকানের সকল প্রকার খরচ, ভাউচার তৈরি, ক্যাটাগরি ও বিশ্লেষণ।
            </p>
          </div>
        </div>

        {/* Action Buttons: Add Expense, Print Statement, Export */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={() => openNewExpenseModal()}
            className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> নতুন খরচ যোগ করুন
          </button>
          
          <button
            onClick={handlePrintStatement}
            className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            title="খরচের স্টেটমেন্ট প্রিন্ট করুন"
          >
            <Printer size={16} /> প্রিন্ট স্টেটমেন্ট
          </button>

          <button
            onClick={exportToCSV}
            className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            title="এক্সেল / CSV রিপোর্ট ডাউনলোড করুন"
          >
            <Download size={16} /> এক্সেল
          </button>
        </div>
      </div>

      {/* 2. Quick One-Click Presets for Common Petty Expenses */}
      <div className="bg-gradient-to-r from-rose-50/70 via-indigo-50/40 to-slate-50 p-4 sm:p-5 rounded-3xl border border-rose-100/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-black text-rose-950 uppercase tracking-wider">
          <Zap size={16} className="text-amber-500 fill-amber-500" />
          <span>কুইক খরচ এন্ট্রি (One-Click Shortcuts):</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {QUICK_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => openNewExpenseModal(p)}
              className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-800 hover:text-rose-700 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <span>{p.label}</span>
              <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[10px]">৳{p.amount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Filtered Expense */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-2 relative overflow-hidden group hover:border-rose-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              নির্বাচিত সময়ের মোট খরচ
            </span>
            <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <Calculator size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600 tracking-tight">
            ৳{stats.totalFiltered.toLocaleString()}
          </div>
          <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            মোট <span className="text-slate-800 font-black">{stats.count}</span> টি খরচের এন্ট্রি
          </p>
        </div>

        {/* Today's Expense */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-2 relative overflow-hidden group hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              আজকের মোট খরচ
            </span>
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">
            ৳{stats.totalToday.toLocaleString()}
          </div>
          <p className="text-[11px] font-bold text-slate-500">
            আজকের দিনের মোট খরচের হিসাব
          </p>
        </div>

        {/* This Month's Expense */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-2 relative overflow-hidden group hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              চলতি মাসের খরচ
            </span>
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Building size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">
            ৳{stats.totalThisMonth.toLocaleString()}
          </div>
          <p className="text-[11px] font-bold text-slate-500">
            চলতি ক্যালেন্ডার মাসের খরচ
          </p>
        </div>

        {/* Top Expense Category */}
        <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl shadow-slate-900/10 space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              সর্বোচ্চ খরচের খাত
            </span>
            <div className="w-9 h-9 bg-white/10 text-rose-400 rounded-xl flex items-center justify-center">
              <PieChartIcon size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-white truncate tracking-tight" title={stats.topCategory.label}>
            {stats.topCategory.label}
          </div>
          <div className="text-sm font-bold text-rose-300">
            ৳{stats.topCategory.amount.toLocaleString()}
          </div>
        </div>

      </div>

      {/* 4. Tab Navigation: Records List, Analytics & Charts, Category Manager */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'list' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt size={16} /> খরচের তালিকা ({filteredExpenses.length})
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'analytics' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 size={16} /> গ্রাফ ও বিশ্লেষণ
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'categories' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Tag size={16} /> ক্যাটাগরি সেটিংস ({categories.length})
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              title="কার্ড ভিউ"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              title="টেবিল ভিউ"
            >
              <FileText size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 5. Active Tab Contents */}
      {activeTab === 'list' && (
        <div className="space-y-6">

          {/* Filtering Bar */}
          <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            
            {/* Quick Date Range Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                <Calendar size={14} /> সময়কাল:
              </span>
              {[
                { id: 'today', label: 'আজকে' },
                { id: 'yesterday', label: 'গতকাল' },
                { id: 'week', label: 'গত ৭ দিন' },
                { id: 'month', label: 'চলতি মাস' },
                { id: 'last_month', label: 'গত মাস' },
                { id: 'year', label: 'চলতি বছর' },
                { id: 'all', label: 'সব সময়' },
                { id: 'custom', label: 'কাস্টম রেঞ্জ' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    dateFilter === f.id
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Custom Date Picker Inputs if 'custom' is selected */}
            {dateFilter === 'custom' && (
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex flex-wrap items-center gap-4 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">শুরুর তারিখ:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">শেষ তারিখ:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            )}

            {/* Dropdown Filters & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
              
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="বিবরণ, ভাউচার নং বা প্রাপক দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                    <X size={14}/>
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="all">সকল ক্যাটাগরি</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.nameBn || c.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment Method Filter */}
              <div>
                <select
                  value={selectedPaymentMethod}
                  onChange={e => setSelectedPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="all">সকল পেমেন্ট মাধ্যম</option>
                  {PAYMENT_METHODS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Sorting */}
              <div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="date_desc">নতুন তারিখ আগে</option>
                  <option value="date_asc">পুরনো তারিখ আগে</option>
                  <option value="amount_desc">সর্বোচ্চ টাকার খরচ</option>
                  <option value="amount_asc">সর্বনিম্ন টাকার খরচ</option>
                </select>
              </div>

            </div>

          </div>

          {/* Records Display */}
          {filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-[36px] border border-slate-100 p-16 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                <Receipt size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-700">কোনো খরচের হিসাব পাওয়া যায়নি</h4>
                <p className="text-xs font-bold text-slate-400">
                  নির্বাচিত সময়কাল বা ফিল্টারে কোনো রেকর্ড নেই। নতুন খরচ যোগ করতে উপরের বাটনে চাপুন।
                </p>
              </div>
              <button
                onClick={() => openNewExpenseModal()}
                className="bg-rose-600 text-white px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
              >
                + খরচ যোগ করুন
              </button>
            </div>
          ) : viewMode === 'cards' ? (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredExpenses.map(exp => (
                <div
                  key={exp.id}
                  className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-100 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    
                    {/* Card Top: Voucher No & Category Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg">
                        {exp.expenseNo || `EXP-${exp.id.slice(-4)}`}
                      </span>
                      <span 
                        className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-sm"
                        style={{ backgroundColor: getCategoryColor(exp.category) }}
                      >
                        {getCategoryLabel(exp.category)}
                      </span>
                    </div>

                    {/* Amount & Description */}
                    <div className="pt-2">
                      <div className="text-2xl font-black text-rose-600 tracking-tight">
                        ৳{exp.amount.toLocaleString()}
                      </div>
                      <p className="text-xs font-bold text-slate-700 mt-1 line-clamp-2">
                        {exp.description || 'বিবরণ উল্লেখ নেই'}
                      </p>
                    </div>

                    {/* Details: Date, Paid To, Payment Method */}
                    <div className="pt-3 border-t border-slate-50 space-y-1.5 text-[11px] font-bold text-slate-500">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Calendar size={12}/> তারিখ:</span>
                        <span className="text-slate-800">{exp.date} {exp.time ? `(${exp.time})` : ''}</span>
                      </div>
                      {exp.paidTo && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><User size={12}/> প্রাপক:</span>
                          <span className="text-slate-800 font-black">{exp.paidTo}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Wallet size={12}/> পেমেন্ট:</span>
                        <span className="text-slate-800">{getPaymentMethodLabel(exp.paymentMethod)}</span>
                      </div>
                      {exp.addedByName && (
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>এন্ট্রি করেছেন:</span>
                          <span>{exp.addedByName}</span>
                        </div>
                      )}
                    </div>

                    {/* Receipt Thumbnail if attached */}
                    {exp.receiptUrl && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setViewReceiptModalUrl(exp.receiptUrl!)}
                          className="w-full bg-slate-50 hover:bg-slate-100 p-2 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold text-slate-600 transition-colors"
                        >
                          <ImageIcon size={14} className="text-rose-500"/> ভাউচার রিসিপ্ট সংযুক্ত আছে (দেখুন)
                        </button>
                      </div>
                    )}

                  </div>

                  {/* Card Bottom Actions: Print Voucher, Edit, Delete */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handlePrintSingleVoucher(exp)}
                      className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all flex items-center gap-1 text-[11px] font-bold"
                      title="ভাউচার স্লিপ প্রিন্ট করুন"
                    >
                      <Printer size={14} /> স্লিপ
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditExpenseModal(exp)}
                        className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all"
                        title="এডিট করুন"
                      >
                        <Edit size={16} />
                      </button>

                      {onDeleteExpense && (isAdmin || exp.addedBy === currentStaff?.id) && (
                        <button
                          onClick={() => {
                            if (confirm(`আপনি কি নিশ্চিত যে "${exp.expenseNo || 'এই'}" খরচের রেকর্ডটি ডিলিট করতে চান?`)) {
                              onDeleteExpense(exp.id);
                            }
                          }}
                          className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4 pl-6">ভাউচার / তারিখ</th>
                      <th className="p-4">খাত ও বিবরণ</th>
                      <th className="p-4">প্রাপক (Paid To)</th>
                      <th className="p-4">পেমেন্ট মাধ্যম</th>
                      <th className="p-4 text-right">পরিমাণ (৳)</th>
                      <th className="p-4 text-right pr-6">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="p-4 pl-6">
                          <span className="font-black text-slate-900 block">{exp.expenseNo || `EXP-${exp.id.slice(-4)}`}</span>
                          <span className="text-[10px] font-bold text-slate-400">{exp.date} {exp.time || ''}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: getCategoryColor(exp.category) }} 
                            />
                            <span className="font-black text-slate-800">{getCategoryLabel(exp.category)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">{exp.description || '-'}</p>
                        </td>
                        <td className="p-4 font-bold text-slate-700">
                          {exp.paidTo || '-'}
                        </td>
                        <td className="p-4 font-bold text-slate-600">
                          {getPaymentMethodLabel(exp.paymentMethod)}
                        </td>
                        <td className="p-4 text-right font-black text-rose-600 text-sm">
                          ৳{exp.amount.toLocaleString()}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            {exp.receiptUrl && (
                              <button
                                onClick={() => setViewReceiptModalUrl(exp.receiptUrl!)}
                                className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-all"
                                title="রিসিপ্ট দেখুন"
                              >
                                <Eye size={15}/>
                              </button>
                            )}
                            <button
                              onClick={() => handlePrintSingleVoucher(exp)}
                              className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
                              title="স্লিপ প্রিন্ট করুন"
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              onClick={() => openEditExpenseModal(exp)}
                              className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all"
                              title="এডিট করুন"
                            >
                              <Edit size={15} />
                            </button>
                            {onDeleteExpense && (isAdmin || exp.addedBy === currentStaff?.id) && (
                              <button
                                onClick={() => {
                                  if (confirm(`আপনি কি "${exp.expenseNo || 'এই'}" খরচের রেকর্ডটি ডিলিট করতে চান?`)) {
                                    onDeleteExpense(exp.id);
                                  }
                                }}
                                className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 6. Analytics & Charts Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Category Breakdown Bar Chart */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <BarChart3 size={18} className="text-rose-500" /> খাতভিত্তিক খরচের বিশ্লেষণ (Category Breakdown)
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">কোন খাতে কত টাকা খরচ হয়েছে</p>
                </div>
                <span className="text-xs font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                  মোট ৳{stats.totalFiltered.toLocaleString()}
                </span>
              </div>

              <div className="h-[320px] w-full">
                {categoryChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                    পর্যাপ্ত খরচের ডাটা নেই
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} layout="vertical" margin={{ left: 30, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 11, fontWeight: '700', fill: '#475569' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'খরচের পরিমাণ']}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                      />
                      <Bar dataKey="amount" fill="#e11d48" radius={[0, 10, 10, 0]} barSize={22}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#e11d48'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payment Method Distribution Pie Chart */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <PieChartIcon size={18} className="text-indigo-500" /> পেমেন্ট মাধ্যম অনুপাত
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">ক্যাশ বনাম ডিজিটাল পেমেন্টে খরচের হার</p>
              </div>

              <div className="h-[240px] w-full">
                {paymentMethodChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                    পর্যাপ্ত ডাটা নেই
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodChartData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={50}
                        paddingAngle={4}
                      >
                        {paymentMethodChartData.map((entry, index) => {
                          const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];
                          return <Cell key={`pie-cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'মোট খরচ']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                {paymentMethodChartData.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-2xl flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 truncate">{item.fullName}</span>
                    <span className="text-xs font-black text-slate-900">৳{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Daily Timeline Area Chart */}
          {dailyTimelineData.length > 1 && (
            <div className="bg-white p-6 sm:p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" /> প্রতিদিনের খরচের ওঠানামা (Daily Timeline)
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">সময়ভিত্তিক খরচের ট্রেন্ড ও পরিবর্তন</p>
              </div>

              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTimelineData} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'খরচ']}
                      labelFormatter={(label) => `তারিখ: ${label}`}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                    />
                    <Area type="monotone" dataKey="amount" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#expenseGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 7. Category Settings Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
          
          {/* Add Category Form */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Plus size={18} className="text-rose-500" /> নতুন খরচের খাত / ক্যাটাগরি তৈরি
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">আপনার ব্যবসার উপযোগী কাস্টম ক্যাটাগরি যোগ করুন</p>
            </div>

            <form onSubmit={handleAddCustomCategory} className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                  ক্যাটাগরির নাম (বাংলায়) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: জেনারেটর ডিজেল খরচ"
                  value={newCatNameBn}
                  onChange={e => setNewCatNameBn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                  Category Name (English)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Generator Fuel"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                  কালার কোড (Badge Color)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={e => setNewCatColor(e.target.value)}
                    className="w-12 h-12 rounded-2xl border-0 cursor-pointer"
                  />
                  <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">
                    নির্বাচিত রঙ: <span className="font-mono">{newCatColor}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16}/> ক্যাটাগরি সংরক্ষণ করুন
              </button>
            </form>
          </div>

          {/* Existing Categories List */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">বিদ্যমান সকল ক্যাটাগরি</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">মোট {categories.length} টি ক্যাটাগরি সক্রিয় আছে</p>
              </div>
              <button
                onClick={() => saveCategories(DEFAULT_CATEGORIES)}
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                title="ডিফল্ট ক্যাটাগরিতে রিসেট করুন"
              >
                <RefreshCw size={12}/> ডিফল্ট রিসেট
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color || '#6366f1' }}
                    />
                    <div>
                      <span className="font-black text-slate-800 text-xs block">{cat.nameBn || cat.name}</span>
                      {cat.name && <span className="text-[10px] text-slate-400 font-bold block">{cat.name}</span>}
                    </div>
                  </div>

                  {!cat.isDefault && (
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="ক্যাটাগরি মুছুন"
                    >
                      <Trash2 size={14}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 8. MODAL: Add / Edit Expense */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[36px] shadow-2xl p-6 sm:p-8 max-h-[90vh] flex flex-col my-auto"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                    <TrendingDown size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {editingExpense ? 'খরচের তথ্য সংশোধন (Edit Expense)' : 'নতুন খরচ রেকর্ড করুন (Add Expense)'}
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      ভাউচার নম্বর: <span className="text-rose-600 font-mono font-black">{formData.expenseNo}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Scrollable Form Body */}
              <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 pr-1 custom-scrollbar space-y-5">
                
                {/* Amount & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                      খরচের পরিমাণ (৳) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-rose-500 font-black text-xl">৳</span>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 font-black text-2xl text-rose-600 outline-none focus:bg-white focus:border-rose-500 transition-all"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                      খরচের খাত / ক্যাটাগরি *
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xs outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nameBn || c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                      তারিখ *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-3.5 text-slate-400" size={16} />
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                      সময় (ঐচ্ছিক)
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-3.5 text-slate-400" size={16} />
                      <input
                        type="time"
                        value={formData.time}
                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method & Paid To (Payee) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                      পেমেন্ট মাধ্যম *
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 cursor-pointer"
                    >
                      {PAYMENT_METHODS.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                      কাকে প্রদান করা হয়েছে (Paid To)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: রহিম মিয়া (ড্রাইভার) / বাড়িওয়ালা"
                      value={formData.paidTo}
                      onChange={e => setFormData({ ...formData, paidTo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Reference No / Trx ID */}
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                    রেফারেন্স / TrxID / চেক নং (যদি থাকে)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: TrxID-9KJH76 বা চেক #765432"
                    value={formData.referenceNo}
                    onChange={e => setFormData({ ...formData, referenceNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                    খরচের বিস্তারিত বিবরণ
                  </label>
                  <textarea
                    rows={2}
                    placeholder="খরচের উদ্দেশ্য বা বিস্তারিত নোট লিখুন..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Receipt Attachment Upload */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip size={14}/> ভাউচার / ক্যাশমেমো ছবি সংযুক্ত করুন (Receipt Photo)
                    </span>
                    {formData.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, receiptUrl: '' })}
                        className="text-rose-600 hover:text-rose-800 text-[10px] font-bold"
                      >
                        ছবি মুছুন
                      </button>
                    )}
                  </div>

                  {formData.receiptUrl ? (
                    <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
                      <img 
                        src={formData.receiptUrl} 
                        alt="Receipt" 
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm cursor-pointer"
                        onClick={() => setViewReceiptModalUrl(formData.receiptUrl)}
                      />
                      <div className="space-y-1">
                        <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={14}/> ছবি সংযুক্ত হয়েছে
                        </span>
                        <p className="text-[10px] text-slate-400">ক্লিক করে বড় করে দেখুন</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="hidden"
                        id="receipt-file-input"
                      />
                      <label
                        htmlFor="receipt-file-input"
                        className={`w-full py-4 border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white hover:bg-rose-50/30 transition-all ${
                          isCompressingReceipt ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <Camera size={20} className="text-slate-400"/>
                        <span className="text-xs font-black text-slate-600">
                          {isCompressingReceipt ? 'ছবি অপ্টিমাইজ হচ্ছে...' : 'ক্যামেরা দিয়ে তুলুন বা ছবি সিলেক্ট করুন'}
                        </span>
                        <span className="text-[10px] text-slate-400">JPG, PNG বা WEBP (স্বয়ংক্রিয়ভাবে কম্প্রেস হবে)</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-3.5 rounded-2xl font-bold text-xs text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Check size={16} /> {editingExpense ? 'সংরক্ষণ করুন' : 'খরচ কনফার্ম করুন'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. MODAL: Fullscreen Image Lightbox Viewer */}
      <AnimatePresence>
        {viewReceiptModalUrl && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            >
              <button
                onClick={() => setViewReceiptModalUrl(null)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X size={24} />
              </button>
              <img
                src={viewReceiptModalUrl}
                alt="Receipt Full Preview"
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Expenses;
