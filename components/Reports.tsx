import React, { useState, useMemo } from 'react';
import { Sale, Product, Customer, Collection, Expense, Staff, ProductReturn, Purchase, ProductionBatch, Supplier } from '../types';
import html2pdf from 'html2pdf.js';
import InvoiceContent from './InvoiceContent';
import DeliverySplitModal from './DeliverySplitModal';
import { 
  BarChart3, Calendar, TrendingUp, TrendingDown, DollarSign, 
  Package, ShoppingBag, User, Tag, Printer, PieChart, 
  ArrowUpRight, ArrowDownRight, Users, Target, Zap, ChevronRight,
  Filter, FileText, Share2, DownloadCloud, RotateCcw, Truck,
  AlertCircle, Briefcase, Activity, Layers, Wallet, Clock, XCircle,
  Download, X, Cpu, Sparkles, CheckCircle2, ArrowRightLeft, ShieldCheck,
  Search, Calculator, Boxes, Factory
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Cell, Legend,
  PieChart as RePieChart, Pie
} from 'recharts';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  collections: Collection[];
  expenses: Expense[];
  returns: ProductReturn[];
  purchases?: Purchase[];
  productionBatches?: ProductionBatch[];
  suppliers?: Supplier[];
  onCollection: (collection: Collection, customer: Customer) => void;
  onUpdateSales: (sales: Sale[]) => void;
  onDeleteSale?: (id: string) => void;
  onSplitDelivery?: (deliveredSale: Sale, newUndeliveredSale: Sale | null, updatedProducts: Product[], updatedCustomers: Customer[]) => void;
  currentUser: Staff | null;
  isAdmin: boolean;
  allStaff: Staff[];
  shopSettings: any;
  stockEntries?: any[];
}

type ReportType = 'overview' | 'product_performance' | 'detailed_sales' | 'profit_loss' | 'production_pnl' | 'stock_entries';
type ChannelFilter = 'all' | 'retail' | 'wholesale' | 'distributor';
type ProductionSubTab = 'all' | 'raw_purchases' | 'batches' | 'expenses';

const Reports: React.FC<ReportsProps> = ({ 
  sales = [], 
  products = [], 
  customers = [], 
  collections = [], 
  expenses = [], 
  returns = [],
  purchases = [],
  productionBatches = [],
  suppliers = [],
  onCollection,
  onUpdateSales,
  onDeleteSale,
  onSplitDelivery,
  currentUser,
  isAdmin,
  allStaff = [],
  shopSettings,
  stockEntries = []
}) => {
  const [reportType, setReportType] = useState<ReportType>('overview');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [productionSubTab, setProductionSubTab] = useState<ProductionSubTab>('all');
  const [showDeliverySplitModal, setShowDeliverySplitModal] = useState(false);
  const [deliveryTargetSale, setDeliveryTargetSale] = useState<Sale | null>(null);
  
  const getToday = () => new Date().toISOString().split('T')[0];
  const getFirstOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getFirstOfMonth());
  const [endDate, setEndDate] = useState(getToday());

  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  };

  // 1. Unified Filtered Data with Permissions
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = normalizeDate(s.date);
      const inDateRange = d >= startDate && d <= endDate;
      const matchesChannel = channelFilter === 'all' || s.customerType === channelFilter;
      const matchesStaff = !isAdmin ? (s.soldById === currentUser?.id) : (selectedStaffId === 'all' || s.soldById === selectedStaffId);
      
      const customer = customers.find(c => c.id === s.customerId);
      const matchesSearch = !searchQuery || 
        s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer?.phone || '').includes(searchQuery);

      return inDateRange && matchesChannel && matchesStaff && matchesSearch;
    });
  }, [sales, startDate, endDate, channelFilter, selectedStaffId, isAdmin, currentUser, searchQuery, customers]);

  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      const d = normalizeDate(r.date);
      const inRange = d >= startDate && d <= endDate;
      const matchesStaff = !isAdmin ? r.addedBy === currentUser?.id : true;
      return inRange && matchesStaff;
    });
  }, [returns, startDate, endDate, isAdmin, currentUser]);

  const periodExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = normalizeDate(e.date);
      const inRange = d >= startDate && d <= endDate;
      const matchesStaff = !isAdmin ? e.addedBy === currentUser?.id : true;
      return inRange && matchesStaff;
    });
  }, [expenses, startDate, endDate, isAdmin, currentUser]);

  // 2. Financial Metrics for Standard Sales
  const financials = useMemo(() => {
    const revenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const retailRev = filteredSales.filter(s => s.customerType === 'retail').reduce((sum, s) => sum + s.total, 0);
    const wholesaleRev = filteredSales.filter(s => s.customerType === 'wholesale').reduce((sum, s) => sum + s.total, 0);
    const distributorRev = filteredSales.filter(s => s.customerType === 'distributor').reduce((sum, s) => sum + s.total, 0);
    
    const returnAmount = filteredReturns.reduce((sum, r) => sum + (r.amount || 0), 0);
    
    let cogs = 0; // Cost of Goods Sold
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        cogs += (item.purchasePrice || 0) * item.quantity;
      });
    });

    const grossProfit = revenue - cogs;
    const totalExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = grossProfit - totalExpenses;

    const totalStockValue = products.reduce((sum, p) => sum + (p.stock * (p.purchasePrice || 0)), 0);
    const totalStockQty = products.reduce((sum, p) => sum + p.stock, 0);

    // Stock Entry Analysis
    const periodStockEntries = stockEntries.filter(e => {
      const d = normalizeDate(e.date);
      return d >= startDate && d <= endDate;
    });
    const totalDailyStockAddValue = periodStockEntries.reduce((sum, e) => {
      const product = products.find(p => p.id === e.productId);
      return sum + (e.quantity * (product?.purchasePrice || 0));
    }, 0);
    const totalDailyStockAddQty = periodStockEntries.reduce((sum, e) => sum + e.quantity, 0);

    return { 
      revenue, 
      retailRev, 
      wholesaleRev, 
      distributorRev, 
      returnAmount, 
      cogs, 
      grossProfit, 
      totalExpenses, 
      netProfit, 
      totalStockValue, 
      totalStockQty,
      totalDailyStockAddValue,
      totalDailyStockAddQty
    };
  }, [filteredSales, periodExpenses, filteredReturns, products, stockEntries, startDate, endDate]);

  // 3. Product-Wise Integrated Analytics
  const productPerformance = useMemo(() => {
    const statsMap = new Map<string, { sold: number; ret: number; rev: number }>();
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const current = statsMap.get(item.productId) || { sold: 0, ret: 0, rev: 0 };
        current.sold += item.quantity;
        current.rev += item.total || 0;
        statsMap.set(item.productId, current);
      });
    });

    filteredReturns.forEach(ret => {
      const current = statsMap.get(ret.productId) || { sold: 0, ret: 0, rev: 0 };
      current.ret += ret.quantity;
      statsMap.set(ret.productId, current);
    });

    return products.map(p => {
      const stats = statsMap.get(p.id) || { sold: 0, ret: 0, rev: 0 };
      return {
        ...p,
        soldQty: stats.sold,
        returnedQty: stats.ret,
        netSold: stats.sold - stats.ret,
        revenue: stats.rev,
        valuation: (p.stock || 0) * (p.purchasePrice || 0)
      };
    }).filter(p => p.soldQty > 0 || isAdmin).sort((a, b) => b.revenue - a.revenue);
  }, [products, filteredSales, filteredReturns, isAdmin]);

  // 4. Raw Material Buy vs Expenses vs Produced Goods P&L (User's Exact Formula)
  const productionMetrics = useMemo(() => {
    // 1. Raw Material Purchases in Date Range
    const periodPurchases = (purchases || []).filter(p => {
      const d = normalizeDate(p.date);
      return d >= startDate && d <= endDate;
    });

    let rawMaterialTotalBuyValue = 0;
    let rawMaterialPurchasedQty = 0;
    const rawMaterialPurchaseItemsList: any[] = [];

    const rawProductIds = new Set(products.filter(p => p.productType === 'raw_material').map(p => p.id));

    periodPurchases.forEach(p => {
      (p.items || []).forEach(item => {
        const isRaw = item.productType === 'raw_material' || rawProductIds.has(item.productId);
        if (isRaw) {
          const itemVal = item.total || (item.quantity * item.unitPrice);
          rawMaterialTotalBuyValue += itemVal;
          rawMaterialPurchasedQty += item.quantity || 0;
          const prod = products.find(prod => prod.id === item.productId);
          rawMaterialPurchaseItemsList.push({
            id: `${p.id}-${item.id || item.productId}`,
            purchaseNo: p.purchaseNo,
            supplierName: p.supplierName,
            supplierPhone: p.supplierPhone,
            date: p.date,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: itemVal,
            unit: prod?.unit || 'কেজি'
          });
        }
      });
    });

    // 2. All Expenses in Date Range
    const totalAllExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 3. Total Cost Basis = Raw Material Buy Value + All Expenses
    const totalCostBasis = rawMaterialTotalBuyValue + totalAllExpenses;

    // 4. Production Batches in Date Range
    const periodBatches = (productionBatches || []).filter(b => {
      const d = normalizeDate(b.date);
      return d >= startDate && d <= endDate;
    });

    const totalProducedQuantity = periodBatches.reduce((sum, b) => sum + (b.outputQuantity || 0), 0);
    const totalProducedOutputValue = periodBatches.reduce((sum, b) => {
      const val = b.totalProducedValue || (b.outputQuantity * (b.unitProductionCost || 0));
      return sum + val;
    }, 0);
    const totalRawMaterialCostInBatches = periodBatches.reduce((sum, b) => sum + (b.rawMaterialCost || 0), 0);
    const totalBatchLaborAndOtherExpenses = periodBatches.reduce((sum, b) => sum + (b.laborCost || 0) + (b.otherExpenses || 0), 0);

    // 5. User Formula Results:
    // (kacha mal ar buy value + sokol khoroch) - utpadito ponno value = profit / loss
    // formulaDifference = (Raw Material Buy Value + All Expenses) - Produced Output Value
    const formulaDifference = totalCostBasis - totalProducedOutputValue;
    // Commercial Net Profit: Produced Value - (Raw Material Buy + All Expenses)
    const commercialProductionProfit = totalProducedOutputValue - totalCostBasis;

    // Stock Valuations
    const rawMaterialStockValuation = products
      .filter(p => p.productType === 'raw_material')
      .reduce((sum, p) => sum + ((p.stock || 0) * (p.purchasePrice || 0)), 0);

    const finishedGoodsStockValuation = products
      .filter(p => p.productType !== 'raw_material')
      .reduce((sum, p) => sum + ((p.stock || 0) * (p.purchasePrice || 0)), 0);

    return {
      rawMaterialTotalBuyValue,
      rawMaterialPurchasedQty,
      rawMaterialPurchaseItemsList,
      totalAllExpenses,
      totalCostBasis,
      periodBatches,
      totalProducedQuantity,
      totalProducedOutputValue,
      totalRawMaterialCostInBatches,
      totalBatchLaborAndOtherExpenses,
      formulaDifference,
      commercialProductionProfit,
      rawMaterialStockValuation,
      finishedGoodsStockValuation
    };
  }, [purchases, products, periodExpenses, productionBatches, startDate, endDate]);

  const handlePrint = () => window.print();

  const handlePrintInvoice = () => {
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;
    const WinPrint = window.open('', '', 'width=900,height=800');
    if (WinPrint) {
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');
      WinPrint.document.write('<html><head><title>Invoice</title>');
      WinPrint.document.write(styles);
      WinPrint.document.write('<style>');
      WinPrint.document.write(`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff !important; }
        }
      `);
      WinPrint.document.write('</style></head><body style="background: white; padding: 20px;">');
      WinPrint.document.write('<div class="invoice-container">');
      WinPrint.document.write(printContent.innerHTML);
      WinPrint.document.write('</div></body></html>');
      WinPrint.document.close();
      WinPrint.focus();
      setTimeout(() => { WinPrint.print(); WinPrint.close(); }, 500);
    }
  };

  const handleDownloadInvoice = () => {
    const element = document.getElementById('printable-receipt');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `Invoice_${viewingSale?.invoiceNo || 'Sale'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(element).save();
  };

  const channelColors: Record<string, string> = {
    retail: '#2563eb',
    wholesale: '#10b981',
    distributor: '#f59e0b'
  };

  const reportTabs: { id: ReportType; label: string; badge?: string }[] = [
    { id: 'overview', label: 'সারসংক্ষেপ' },
    { id: 'production_pnl', label: '🌾 কাঁচামাল ও উৎপাদন লাভ-ক্ষতি', badge: 'New' },
    { id: 'profit_loss', label: 'বাণিজ্যিক লাভ-ক্ষতি' },
    { id: 'product_performance', label: 'পণ্য বিশ্লেষণ' },
    { id: 'detailed_sales', label: 'বিক্রয় তালিকা' },
    { id: 'stock_entries', label: 'স্টক হিস্ট্রি' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-20 print:bg-white print:p-0">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 sm:gap-6 items-start lg:items-center bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[40px] shadow-sm border-2 border-slate-50 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-primary p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl text-white shadow-2xl shadow-primary/20 flex items-center justify-center">
            <BarChart3 size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight uppercase">
              {isAdmin ? 'ব্যবসায়িক রিপোর্ট ও উৎপাদন বিশ্লেষণ' : 'আপনার পারফরম্যান্স রিপোর্ট'}
            </h2>
            <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[2px] mt-0.5 flex items-center gap-2">
              <Activity size={12} className="text-primary"/> কাঁচামাল, উৎপাদন লাভ-ক্ষতি ও সেলস ট্র্যাকিং
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Main Tabs Navigation */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl max-w-full overflow-x-auto custom-scrollbar">
            {reportTabs.map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setReportType(tab.id)} 
                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap min-h-[38px] ${
                  reportType === tab.id 
                    ? 'bg-white text-primary shadow-md scale-[1.02]' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button 
            onClick={handlePrint} 
            className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 hover:bg-black font-black text-xs uppercase min-h-[38px]"
          >
            <Printer size={16}/>
            <span className="hidden sm:inline">প্রিন্ট রিপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Date & Global Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 print:hidden">
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-[32px] border-2 border-slate-50 shadow-xs space-y-1.5">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <Calendar size={13} className="text-primary"/> শুরুর তারিখ
           </label>
           <input 
             type="date" 
             value={startDate} 
             onChange={e => setStartDate(e.target.value)} 
             className="w-full bg-slate-50 border-none rounded-xl p-3 font-black text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20"
           />
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-[32px] border-2 border-slate-50 shadow-xs space-y-1.5">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <Calendar size={13} className="text-primary"/> শেষ তারিখ
           </label>
           <input 
             type="date" 
             value={endDate} 
             onChange={e => setEndDate(e.target.value)} 
             className="w-full bg-slate-50 border-none rounded-xl p-3 font-black text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20"
           />
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-[32px] border-2 border-slate-50 shadow-xs space-y-1.5">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <Layers size={13} className="text-primary"/> সেলস চ্যানেল
           </label>
           <select 
             value={channelFilter} 
             onChange={e => setChannelFilter(e.target.value as any)} 
             className="w-full bg-slate-50 border-none rounded-xl p-3 font-black text-xs sm:text-sm outline-none appearance-none cursor-pointer"
           >
              <option value="all">সকল চ্যানেল (All Channels)</option>
              <option value="retail">খুচরা বিক্রয় (Retail)</option>
              <option value="wholesale">পাইকারি বিক্রয় (Wholesale)</option>
              <option value="distributor">ডিলার / পরিবেশক (Distributor)</option>
           </select>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-[32px] border-2 border-slate-50 shadow-xs space-y-1.5">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <Users size={13} className="text-primary"/> স্টাফ ফিল্টার
           </label>
           <select 
             disabled={!isAdmin} 
             value={selectedStaffId} 
             onChange={e => setSelectedStaffId(e.target.value)} 
             className="w-full bg-slate-50 border-none rounded-xl p-3 font-black text-xs sm:text-sm outline-none appearance-none cursor-pointer disabled:opacity-50"
           >
              <option value="all">সকল স্টাফ (All Personnel)</option>
              {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
        </div>
      </div>

      {/* Top Level Metric Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-indigo-600 p-5 sm:p-7 rounded-2xl sm:rounded-[36px] text-white shadow-xl shadow-indigo-900/15 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
           <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[2px] opacity-75 mb-1 sm:mb-2">মোট বিক্রয় (Revenue)</p>
           <h3 className="text-xl sm:text-3xl font-black tracking-tight">৳{financials.revenue.toLocaleString()}</h3>
           <div className="mt-2.5 sm:mt-4 flex items-center gap-1.5 text-[8px] sm:text-[9px] font-black bg-white/15 w-fit px-2.5 py-1 rounded-full uppercase tracking-wider">
             <ShoppingBag size={11}/> {filteredSales.length} ইনভয়েস
           </div>
        </div>

        <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-[36px] border-2 border-slate-100 shadow-xs relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
           <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1 sm:mb-2">মোট খরচ ও ফেরত</p>
           <h3 className="text-xl sm:text-3xl font-black text-rose-600 tracking-tight">৳{(financials.totalExpenses + financials.returnAmount).toLocaleString()}</h3>
           <div className="mt-2.5 sm:mt-4 flex gap-2">
             <span className="text-[8px] sm:text-[9px] font-black text-rose-500 uppercase">খরচ: ৳{financials.totalExpenses.toLocaleString()}</span>
           </div>
        </div>

        <div className="bg-emerald-600 p-5 sm:p-7 rounded-2xl sm:rounded-[36px] text-white shadow-xl shadow-emerald-900/15 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
           <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[2px] opacity-75 mb-1 sm:mb-2">বাণিজ্যিক নিট মুনাফা</p>
           <h3 className="text-xl sm:text-3xl font-black tracking-tight">৳{(financials.netProfit - financials.returnAmount).toLocaleString()}</h3>
           <div className="mt-2.5 sm:mt-4 flex items-center gap-1.5 text-[8px] sm:text-[9px] font-black bg-white/15 w-fit px-2.5 py-1 rounded-full uppercase tracking-wider">
             <TrendingUp size={11}/> {(((financials.netProfit - financials.returnAmount) / (financials.revenue || 1)) * 100).toFixed(1)}% মার্জিন
           </div>
        </div>

        <div className="bg-slate-900 p-5 sm:p-7 rounded-2xl sm:rounded-[36px] text-white shadow-xl shadow-slate-900/25 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/20 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
           <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[2px] opacity-75 mb-1 sm:mb-2">মোট মজুদ স্টক মূল্য</p>
           <h3 className="text-xl sm:text-3xl font-black text-amber-400 tracking-tight">৳{financials.totalStockValue.toLocaleString()}</h3>
           <div className="mt-2.5 sm:mt-4 flex items-center gap-1.5 text-[8px] sm:text-[9px] font-black bg-white/15 w-fit px-2.5 py-1 rounded-full uppercase tracking-wider">
             <Package size={11}/> {financials.totalStockQty} পণ্য
           </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCTION & RAW MATERIALS PROFIT/LOSS (USER'S EXACT FEATURE) */}
      {/* Formula: (Raw Material Buy Value + All Expenses) - Produced Goods Value = Profit/Loss */}
      {/* ========================================================================= */}
      {reportType === 'production_pnl' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Formula Banner Header */}
          <div className="bg-linear-to-r from-amber-500 via-orange-500 to-emerald-600 rounded-3xl sm:rounded-[40px] p-5 sm:p-8 text-white shadow-2xl shadow-orange-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Factory size={160} />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider">
                  <Calculator size={14} className="text-amber-300" />
                  কাঁচামাল ও উৎপাদন লাভ-ক্ষতি হিসাব সমীকরণ
                </div>
                <div className="text-[10px] sm:text-xs font-black text-white/80 uppercase">
                  সময়কাল: {startDate} হতে {endDate}
                </div>
              </div>

              {/* Mathematical Equation Display */}
              <div className="bg-black/30 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/20">
                <p className="text-[10px] sm:text-xs font-black text-amber-200 uppercase tracking-widest mb-3">
                  নির্ধারিত ব্যবসায়িক সমীকরণ সূত্র:
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-base lg:text-lg font-black tracking-tight">
                  <span className="bg-white/20 px-3 py-1.5 rounded-xl border border-white/30">
                    ( কাঁচামাল ক্রয় মূল্য + সকল খরচ )
                  </span>
                  <span className="text-amber-300 text-xl font-black">−</span>
                  <span className="bg-white/20 px-3 py-1.5 rounded-xl border border-white/30">
                    উৎপাদিত পণ্যের ভ্যালু
                  </span>
                  <span className="text-amber-300 text-xl font-black">=</span>
                  <span className="bg-white px-3.5 py-1.5 rounded-xl text-slate-900 shadow-md">
                    লাভ / ক্ষতি (Profit / Loss)
                  </span>
                </div>

                {/* Equation with Real Values */}
                <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-black">
                  <span className="text-amber-100">
                    ( ৳{productionMetrics.rawMaterialTotalBuyValue.toLocaleString()} + ৳{productionMetrics.totalAllExpenses.toLocaleString()} )
                  </span>
                  <span className="text-white/70">−</span>
                  <span className="text-emerald-200">
                    ৳{productionMetrics.totalProducedOutputValue.toLocaleString()}
                  </span>
                  <span className="text-white/70">=</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                    productionMetrics.commercialProductionProfit >= 0 ? 'bg-emerald-400 text-slate-950' : 'bg-rose-400 text-slate-950'
                  }`}>
                    {productionMetrics.commercialProductionProfit >= 0 
                      ? `মুনাফা: +৳${productionMetrics.commercialProductionProfit.toLocaleString()}` 
                      : `ঘাটতি: -৳${Math.abs(productionMetrics.commercialProductionProfit).toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Detailed KPI Cards for Raw Material & Production Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1: Raw Material Buy Value */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl sm:rounded-[36px] border-2 border-slate-100 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">১. কাঁচামাল ক্রয় মূল্য</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Boxes size={16} />
                  </div>
                </div>
                <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ৳{productionMetrics.rawMaterialTotalBuyValue.toLocaleString()}
                </h4>
                <p className="text-[11px] text-slate-500 font-bold mt-1">
                  সাপ্লায়ার থেকে মোট কাঁচামাল ইনভয়েস
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-black">
                <span className="text-slate-400 uppercase">মোট ক্রয় পরিমাণ:</span>
                <span className="text-amber-600">{productionMetrics.rawMaterialPurchasedQty} ইউনিট/কেজি</span>
              </div>
            </div>

            {/* Card 2: All Expenses */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl sm:rounded-[36px] border-2 border-slate-100 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">২. সকল খরচ</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                </div>
                <h4 className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                  ৳{productionMetrics.totalAllExpenses.toLocaleString()}
                </h4>
                <p className="text-[11px] text-slate-500 font-bold mt-1">
                  বেতন, পরিবহন, কারখানা ও যাবতীয় ব্যয়
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-black">
                <span className="text-slate-400 uppercase">খরচ এন্ট্রি:</span>
                <span className="text-rose-600">{periodExpenses.length}টি ভাউচার</span>
              </div>
            </div>

            {/* Card 3: Total Cost Basis (Raw Material + All Expenses) */}
            <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-3xl sm:rounded-[36px] shadow-xl shadow-slate-900/15 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">৩. মোট ইনপুট ব্যয় (১ + ২)</span>
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center">
                    <Calculator size={16} />
                  </div>
                </div>
                <h4 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                  ৳{productionMetrics.totalCostBasis.toLocaleString()}
                </h4>
                <p className="text-[11px] text-slate-400 font-bold mt-1">
                  (কাঁচামাল ক্রয় মূল্য + সকল খরচ)
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] font-black">
                <span className="text-slate-400 uppercase">মোট খরচ ভিত্তি:</span>
                <span className="text-slate-200">100% ইনপুট কস্ট</span>
              </div>
            </div>

            {/* Card 4: Produced Goods Valuation */}
            <div className="bg-emerald-600 text-white p-6 sm:p-7 rounded-3xl sm:rounded-[36px] shadow-xl shadow-emerald-900/15 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">৪. উৎপাদিত পণ্যের ভ্যালু</span>
                  <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                    <Factory size={16} />
                  </div>
                </div>
                <h4 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  ৳{productionMetrics.totalProducedOutputValue.toLocaleString()}
                </h4>
                <p className="text-[11px] text-emerald-100 font-bold mt-1">
                  উৎপাদিত ফিনিশড গুডস মূল্যায়ন
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[10px] font-black">
                <span className="text-emerald-200 uppercase">উৎপাদিত পণ্য:</span>
                <span className="text-white">{productionMetrics.totalProducedQuantity} পিস / ইউনিট</span>
              </div>
            </div>
          </div>

          {/* Grand P&L Breakdown Card & Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            {/* Left: Summary Ledger */}
            <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[40px] border-2 border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h4 className="font-black text-slate-900 text-base sm:text-lg uppercase tracking-tight flex items-center gap-2.5">
                  <TrendingUp size={20} className="text-primary" />
                  উৎপাদন লাভ-ক্ষতি খতিয়ান সারসংক্ষেপ
                </h4>
                <span className="text-[10px] font-black text-slate-400 uppercase">
                  {startDate} থেকে {endDate}
                </span>
              </div>

              <div className="space-y-3 sm:space-y-3.5">
                <div className="flex justify-between items-center p-3.5 sm:p-4 bg-slate-50 rounded-2xl">
                  <span className="text-xs font-black text-slate-600">১. কাঁচামাল ক্রয় মূল্য (Raw Material Purchases)</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900">৳{productionMetrics.rawMaterialTotalBuyValue.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-3.5 sm:p-4 bg-slate-50 rounded-2xl">
                  <span className="text-xs font-black text-slate-600">২. সকল খরচ (All Operating Expenses)</span>
                  <span className="text-xs sm:text-sm font-black text-rose-600">+ ৳{productionMetrics.totalAllExpenses.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-3.5 sm:p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                  <span className="text-xs font-black text-amber-900">মোট ব্যয় ভিত্তি ( কাঁচামাল + সকল খরচ )</span>
                  <span className="text-sm font-black text-amber-900">৳{productionMetrics.totalCostBasis.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-3.5 sm:p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                  <span className="text-xs font-black text-emerald-900">উৎপাদিত পণ্যের মোট ভ্যালু (Finished Goods Value)</span>
                  <span className="text-sm font-black text-emerald-900">৳{productionMetrics.totalProducedOutputValue.toLocaleString()}</span>
                </div>

                {/* Mathematical Result */}
                <div className={`p-5 rounded-2xl sm:rounded-3xl border-2 text-white shadow-xl ${
                  productionMetrics.commercialProductionProfit >= 0 
                    ? 'bg-emerald-600 border-emerald-500 shadow-emerald-900/20' 
                    : 'bg-rose-600 border-rose-500 shadow-rose-900/20'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black uppercase tracking-wider opacity-90">
                      {productionMetrics.commercialProductionProfit >= 0 
                        ? 'উৎপাদনে অর্জিত নিট মুনাফা (Net Production Profit)' 
                        : 'উৎপাদনে খরচ ঘাটতি / লোকসান (Cost Deficit / Loss)'}
                    </span>
                    <span className="text-[10px] font-black bg-white/20 px-2.5 py-0.5 rounded-full uppercase">
                      {productionMetrics.commercialProductionProfit >= 0 ? 'Surplus' : 'Deficit'}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black">
                    ৳{Math.abs(productionMetrics.commercialProductionProfit).toLocaleString()}
                  </div>
                  <p className="text-[10px] font-bold opacity-80 mt-1.5">
                    {productionMetrics.commercialProductionProfit >= 0 
                      ? 'উৎপাদিত পণ্যের মূল্য কাঁচামাল ক্রয় ও সকল খরচের মোট ব্যয়ের চেয়ে বেশি।' 
                      : 'কাঁচামাল ক্রয় ও সর্বমোট খরচের চেয়ে উৎপাদিত পণ্যের মূল্য কম রয়েছে।'}
                  </p>
                </div>
              </div>

              {/* Stock Separation Summary */}
              <div className="pt-2 grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100">
                  <span className="text-[9px] font-black text-amber-700 uppercase block">🌾 বর্তমান কাঁচামাল স্টক</span>
                  <span className="text-xs sm:text-sm font-black text-amber-900">৳{productionMetrics.rawMaterialStockValuation.toLocaleString()}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <span className="text-[9px] font-black text-indigo-700 uppercase block">📦 বর্তমান রেডি পণ্য স্টক</span>
                  <span className="text-xs sm:text-sm font-black text-indigo-900">৳{productionMetrics.finishedGoodsStockValuation.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Right: Comparative Chart */}
            <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-black text-slate-900 text-base sm:text-lg uppercase tracking-tight flex items-center gap-2.5">
                  <BarChart3 size={20} className="text-primary" />
                  খরচ বনাম উৎপাদিত মূল্যের তুলনামূলক চার্ট
                </h4>
              </div>

              <div className="flex-1 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'কাঁচামাল ক্রয়', value: productionMetrics.rawMaterialTotalBuyValue, color: '#f59e0b' },
                    { name: 'সকল খরচ', value: productionMetrics.totalAllExpenses, color: '#e11d48' },
                    { name: 'মোট ইনপুট ব্যয়', value: productionMetrics.totalCostBasis, color: '#0f172a' },
                    { name: 'উৎপাদিত ভ্যালু', value: productionMetrics.totalProducedOutputValue, color: '#10b981' }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900', fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900', fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'পরিমাণ']}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', padding: '15px' }} 
                    />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={50}>
                      {['#f59e0b', '#e11d48', '#0f172a', '#10b981'].map((c, i) => (
                        <Cell key={i} fill={c} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-slate-100">
                <div className="text-center p-2 rounded-xl bg-amber-50">
                  <span className="text-[8px] font-black text-amber-600 uppercase block">কাঁচামাল</span>
                  <span className="text-[11px] font-black text-amber-900">৳{productionMetrics.rawMaterialTotalBuyValue.toLocaleString()}</span>
                </div>
                <div className="text-center p-2 rounded-xl bg-rose-50">
                  <span className="text-[8px] font-black text-rose-600 uppercase block">খরচ</span>
                  <span className="text-[11px] font-black text-rose-900">৳{productionMetrics.totalAllExpenses.toLocaleString()}</span>
                </div>
                <div className="text-center p-2 rounded-xl bg-slate-100">
                  <span className="text-[8px] font-black text-slate-600 uppercase block">মোট ইনপুট</span>
                  <span className="text-[11px] font-black text-slate-900">৳{productionMetrics.totalCostBasis.toLocaleString()}</span>
                </div>
                <div className="text-center p-2 rounded-xl bg-emerald-50">
                  <span className="text-[8px] font-black text-emerald-600 uppercase block">উৎপাদিত ভ্যালু</span>
                  <span className="text-[11px] font-black text-emerald-900">৳{productionMetrics.totalProducedOutputValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-tabs for Detailed Logs */}
          <div className="bg-white rounded-3xl sm:rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm sm:text-base uppercase tracking-tight">
                    বিস্তারিত খতিয়ান ও ট্রানজেকশন লগ
                  </h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase">
                    কাঁচামাল ক্রয়, উৎপাদনের ব্যাচ এবং খরচের তালিকা
                  </p>
                </div>
              </div>

              {/* Sub-tab buttons */}
              <div className="flex gap-1 bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setProductionSubTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                    productionSubTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  সব হিসাব
                </button>
                <button
                  type="button"
                  onClick={() => setProductionSubTab('raw_purchases')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                    productionSubTab === 'raw_purchases' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  🌾 কাঁচামাল ক্রয় ({productionMetrics.rawMaterialPurchaseItemsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductionSubTab('batches')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                    productionSubTab === 'batches' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ⚙️ উৎপাদিত ব্যাচ ({productionMetrics.periodBatches.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductionSubTab('expenses')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                    productionSubTab === 'expenses' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  💸 সকল খরচ ({periodExpenses.length})
                </button>
              </div>
            </div>

            {/* Sub-Tab 1: Raw Material Purchases Table */}
            {(productionSubTab === 'all' || productionSubTab === 'raw_purchases') && (
              <div className="p-4 sm:p-6 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-black text-xs uppercase tracking-wider text-amber-700 flex items-center gap-2">
                    <Boxes size={14} />
                    ১. কাঁচামাল ক্রয়ের বিবরণী (Raw Material Purchases Log)
                  </h5>
                  <span className="text-[10px] font-black text-slate-500">
                    মোট ক্রয়: ৳{productionMetrics.rawMaterialTotalBuyValue.toLocaleString()}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">তারিখ ও মেমো</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">সরবরাহকারী (Supplier)</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">কাঁচামাল</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">পরিমাণ</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">দর (রেট)</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">মোট ক্রয়মূল্য</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productionMetrics.rawMaterialPurchaseItemsList.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/60 border-b border-slate-50">
                          <td className="p-3">
                            <div className="text-[11px] font-black text-slate-800 uppercase">{item.purchaseNo}</div>
                            <div className="text-[9px] text-slate-400 font-bold">{normalizeDate(item.date)}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-xs font-black text-slate-800">{item.supplierName}</div>
                            <div className="text-[9px] text-slate-400">{item.supplierPhone || ''}</div>
                          </td>
                          <td className="p-3 font-black text-xs text-amber-700">
                            🌾 {item.productName}
                          </td>
                          <td className="p-3 font-black text-xs text-slate-700">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="p-3 text-xs font-bold text-slate-600">
                            ৳{item.unitPrice}/{item.unit}
                          </td>
                          <td className="p-3 text-xs font-black text-amber-700 text-right">
                            ৳{item.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {productionMetrics.rawMaterialPurchaseItemsList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-xs font-black text-slate-400">
                            এই সময়কালের মধ্যে কোনো কাঁচামাল ক্রয় রেকর্ড পাওয়া যায়নি।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Production Batches Table */}
            {(productionSubTab === 'all' || productionSubTab === 'batches') && (
              <div className="p-4 sm:p-6 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-black text-xs uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                    <Factory size={14} />
                    ২. উৎপাদিত পণ্যের বিবরণী ও মূল্যায়ন (Production Batches & Output Valuation)
                  </h5>
                  <span className="text-[10px] font-black text-slate-500">
                    মোট উৎপাদিত মূল্য: ৳{productionMetrics.totalProducedOutputValue.toLocaleString()}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">ব্যাচ নং ও তারিখ</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">উৎপাদিত পণ্য</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">উৎপাদিত পরিমাণ</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">ব্যবহৃত কাঁচামাল ব্যয়</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">মজুরি ও অতিরিক্ত খরচ</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">ইউনিট দর</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">মোট ভ্যালু</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productionMetrics.periodBatches.map(batch => (
                        <tr key={batch.id} className="hover:bg-slate-50/60 border-b border-slate-50">
                          <td className="p-3">
                            <div className="text-[11px] font-black text-slate-800 uppercase">{batch.batchNo}</div>
                            <div className="text-[9px] text-slate-400 font-bold">{normalizeDate(batch.date)}</div>
                          </td>
                          <td className="p-3 font-black text-xs text-slate-900">
                            📦 {batch.productName}
                          </td>
                          <td className="p-3 font-black text-xs text-emerald-700">
                            {batch.outputQuantity} {batch.unit || 'পিস'}
                          </td>
                          <td className="p-3 text-xs font-bold text-amber-700">
                            ৳{(batch.rawMaterialCost || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-xs font-bold text-slate-600">
                            ৳{((batch.laborCost || 0) + (batch.otherExpenses || 0)).toLocaleString()}
                          </td>
                          <td className="p-3 text-xs font-black text-slate-700">
                            ৳{(batch.unitProductionCost || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-xs font-black text-emerald-700 text-right">
                            ৳{(batch.totalProducedValue || (batch.outputQuantity * batch.unitProductionCost)).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {productionMetrics.periodBatches.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-xs font-black text-slate-400">
                            এই সময়কালের মধ্যে কোনো উৎপাদন ব্যাচ রেকর্ড পাওয়া যায়নি। (পণ্য মেন্যু থেকে উৎপাদন প্রসেস করুন)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Expenses Table */}
            {(productionSubTab === 'all' || productionSubTab === 'expenses') && (
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-black text-xs uppercase tracking-wider text-rose-700 flex items-center gap-2">
                    <Wallet size={14} />
                    ৩. সর্বমোট খরচের খতিয়ান (Operating & Factory Expenses Log)
                  </h5>
                  <span className="text-[10px] font-black text-slate-500">
                    মোট খরচ: ৳{productionMetrics.totalAllExpenses.toLocaleString()}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">তারিখ</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">খরচের খাত (ক্যাটাগরি)</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">বিবরণ / নোট</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">পেমেন্ট মেথড</th>
                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">টাকা (টাকা)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodExpenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/60 border-b border-slate-50">
                          <td className="p-3 text-[10px] font-black text-slate-500">
                            {normalizeDate(exp.date)}
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black uppercase">
                              {exp.category}
                            </span>
                          </td>
                          <td className="p-3 text-xs font-bold text-slate-700">
                            {exp.description || 'বিনা বিবরণ'}
                          </td>
                          <td className="p-3 text-xs font-bold text-slate-500">
                            {exp.paymentMethod || 'Cash'}
                          </td>
                          <td className="p-3 text-xs font-black text-rose-600 text-right">
                            ৳{exp.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {periodExpenses.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs font-black text-slate-400">
                            এই সময়কালের মধ্যে কোনো খরচ রেকর্ড পাওয়া যায়নি।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OVERVIEW */}
      {/* ========================================================================= */}
      {reportType === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
           <div className="lg:col-span-8 bg-white p-6 sm:p-10 rounded-3xl sm:rounded-[48px] border-2 border-slate-50 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                 <h4 className="font-black text-slate-900 text-base sm:text-lg uppercase tracking-tight flex items-center gap-3">
                   <PieChart size={24} className="text-primary"/> চ্যানেল ভিত্তিক বিক্রয় বণ্টন (Channel Distribution)
                 </h4>
              </div>
              <div className="h-72 sm:h-80">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Retail', value: financials.retailRev, color: channelColors.retail },
                      { name: 'Wholesale', value: financials.wholesaleRev, color: channelColors.wholesale },
                      { name: 'Distributor', value: financials.distributorRev, color: channelColors.distributor }
                    ]}>
                       <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#94a3b8'}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#94a3b8'}} />
                       <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '20px' }} />
                       <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={60}>{ [0,1,2].map((_, i) => <Cell key={i} fill={Object.values(channelColors)[i]} />) }</Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
           <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[48px] border-2 border-slate-50 shadow-sm flex flex-col">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
                <Target size={18} className="text-primary"/> {isAdmin ? 'সর্বোচ্চ বিক্রিত পণ্য' : 'আপনার সেরা বিক্রিত পণ্য'}
              </h4>
              <div className="space-y-4 flex-1">
                 {productPerformance.slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between group cursor-pointer hover:translate-x-1 transition-transform">
                       <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-600 shadow-md shadow-amber-500/10' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>{i + 1}</div>
                          <div className="min-w-0">
                             <p className="text-[11px] font-black text-slate-700 truncate uppercase tracking-tight">{p.name}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">{p.soldQty} বিক্রয় • {p.returnedQty} ফেরত</p>
                          </div>
                       </div>
                       <div className="text-right shrink-0">
                          <div className="font-black text-slate-900 text-xs tracking-tighter">৳{p.revenue.toLocaleString()}</div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRODUCT PERFORMANCE */}
      {/* ========================================================================= */}
      {reportType === 'product_performance' && (
        <div className="bg-white rounded-3xl sm:rounded-[48px] border-2 border-slate-50 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-50 flex justify-between items-center">
            <h4 className="font-black text-slate-900 text-base sm:text-lg uppercase tracking-tight flex items-center gap-3">
              <Package size={24} className="text-primary"/> পণ্য পারফরম্যান্স ও স্টক বিশ্লেষণ
            </h4>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{productPerformance.length} টি পণ্য বিশ্লেষিত</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">পণ্যর নাম</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">টাইপ</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">মজুদ (Stock)</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">বিক্রিত</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ফেরত</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">আয় (Revenue)</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">স্টক ভ্যালু</th>
                </tr>
              </thead>
              <tbody>
                {productPerformance.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 sm:p-6 border-b border-slate-50">
                      <div className="text-xs font-black text-slate-800 uppercase">{p.name}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{p.category}</div>
                    </td>
                    <td className="p-4 sm:p-6 border-b border-slate-50">
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                        p.productType === 'raw_material' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.productType === 'raw_material' ? 'কাঁচামাল' : 'রেডি পণ্য'}
                      </span>
                    </td>
                    <td className="p-4 sm:p-6 border-b border-slate-50">
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${p.stock < 10 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                         {p.stock} {p.unit}
                       </span>
                    </td>
                    <td className="p-4 sm:p-6 border-b border-slate-50 text-xs font-black text-slate-700">{p.soldQty}</td>
                    <td className="p-4 sm:p-6 border-b border-slate-50 text-xs font-black text-rose-500">{p.returnedQty}</td>
                    <td className="p-4 sm:p-6 border-b border-slate-50 font-black text-xs text-primary">৳{p.revenue.toLocaleString()}</td>
                    <td className="p-4 sm:p-6 border-b border-slate-50 font-black text-xs text-emerald-600">৳{p.valuation.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COMMERCIAL PROFIT & LOSS */}
      {/* ========================================================================= */}
      {reportType === 'profit_loss' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white p-6 sm:p-10 rounded-3xl sm:rounded-[48px] border-2 border-slate-50 shadow-sm">
               <h4 className="font-black text-slate-900 text-base sm:text-lg uppercase tracking-tight mb-6 sm:mb-8 flex items-center gap-3">
                 <TrendingUp size={24} className="text-primary"/> বাণিজ্যিক লাভ-ক্ষতি সারাংশ (Sales P&L)
               </h4>
               <div className="space-y-4 sm:space-y-6">
                  <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl">
                     <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Revenue (বিক্রয় লব্ধ আয়)</span>
                     <span className="text-base sm:text-xl font-black text-slate-900">৳{financials.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl">
                     <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Cost of Goods (বিক্রিত পণ্যের ক্রয়মূল্য)</span>
                     <span className="text-base sm:text-xl font-black text-rose-600">- ৳{financials.cogs.toLocaleString()}</span>
                  </div>
                  <div className="h-0.5 bg-slate-100 mx-4"></div>
                  <div className="flex justify-between items-center p-4 sm:p-6 bg-emerald-50 rounded-2xl sm:rounded-3xl">
                     <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Gross Profit (মোট মুনাফা)</span>
                     <span className="text-base sm:text-xl font-black text-emerald-700">৳{financials.grossProfit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl">
                     <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Expenses (অন্যান্য সকল খরচ)</span>
                     <span className="text-base sm:text-xl font-black text-rose-600">- ৳{financials.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 sm:p-6 bg-amber-50 rounded-2xl sm:rounded-3xl">
                     <span className="text-xs font-black text-amber-700 uppercase tracking-wider">Returns & Adjustments (ফেরত / সমন্বয়)</span>
                     <span className="text-base sm:text-xl font-black text-amber-700">- ৳{financials.returnAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full mx-4"></div>
                  <div className="flex justify-between items-center p-6 sm:p-8 bg-slate-900 rounded-2xl sm:rounded-[32px] text-white shadow-2xl shadow-slate-900/20">
                     <span className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-80">Net Profit (বাণিজ্যিক নিট লাভ)</span>
                     <span className="text-2xl sm:text-3xl font-black">৳{(financials.netProfit - financials.returnAmount).toLocaleString()}</span>
                  </div>
               </div>
            </div>

            <div className="bg-white p-6 sm:p-10 rounded-3xl sm:rounded-[48px] border-2 border-slate-50 shadow-sm flex flex-col">
               <h4 className="font-black text-slate-900 text-base sm:text-lg uppercase tracking-tight mb-6 sm:mb-8 flex items-center gap-3">
                 <PieChart size={24} className="text-primary"/> রেভিনিউ বণ্টন পাই চার্ট
               </h4>
               <div className="flex-1 flex items-center justify-center min-h-[260px]">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <RePieChart>
                          <Pie
                            data={[
                              { name: 'Retail', value: financials.retailRev },
                              { name: 'Wholesale', value: financials.wholesaleRev },
                              { name: 'Distributor', value: financials.distributorRev }
                            ]}
                            innerRadius={70}
                            outerRadius={105}
                            paddingAngle={5}
                            dataKey="value"
                          >
                             <Cell fill={channelColors.retail} />
                             <Cell fill={channelColors.wholesale} />
                             <Cell fill={channelColors.distributor} />
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)' }} />
                          <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{value}</span>} />
                       </RePieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="text-center p-3 rounded-2xl bg-indigo-50">
                    <div className="text-xs font-black text-indigo-700 tracking-tight">৳{financials.retailRev.toLocaleString()}</div>
                    <div className="text-[8px] font-black text-indigo-500 uppercase mt-0.5">Retail</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-emerald-50">
                    <div className="text-xs font-black text-emerald-700 tracking-tight">৳{financials.wholesaleRev.toLocaleString()}</div>
                    <div className="text-[8px] font-black text-emerald-500 uppercase mt-0.5">Wholesale</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-amber-50">
                    <div className="text-xs font-black text-amber-700 tracking-tight">৳{financials.distributorRev.toLocaleString()}</div>
                    <div className="text-[8px] font-black text-amber-500 uppercase mt-0.5">Distributor</div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DETAILED SALES LOG */}
      {/* ========================================================================= */}
      {reportType === 'detailed_sales' && (
        <div className="bg-white rounded-3xl sm:rounded-[48px] border-2 border-slate-50 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-primary"/>
              <h4 className="font-black text-slate-900 text-base sm:text-lg uppercase tracking-tight">বিস্তারিত বিক্রয় তালিকা (Sales Log)</h4>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input 
                  type="text" 
                  placeholder="ইনভয়েস বা কাস্টমার খুঁজুন..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-10 pr-4 font-black text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3.5 py-2 rounded-xl shrink-0">
                {filteredSales.length} ট্রানজেকশন
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ইনভয়েস</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">তারিখ</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">গ্রাহক</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">মোট টাকা</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">স্ট্যাটাস</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">একশন</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 sm:p-6 border-b border-slate-50">
                      <div className="text-xs font-black text-slate-800 uppercase">#{sale.invoiceNo}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">{sale.soldBy}</div>
                    </td>
                    <td className="p-4 sm:p-6 border-b border-slate-50 text-[10px] font-black text-slate-500 uppercase">{normalizeDate(sale.date)}</td>
                    <td className="p-4 sm:p-6 border-b border-slate-50">
                      <div className="text-xs font-black text-slate-800 uppercase">{customers.find(c => c.id === sale.customerId)?.name || 'খুচরা ক্রেতা'}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{sale.customerType}</div>
                    </td>
                    <td className="p-4 sm:p-6 border-b border-slate-50 font-black text-xs text-primary">৳{sale.total.toLocaleString()}</td>
                    <td className="p-4 sm:p-6 border-b border-slate-50">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        sale.status === 'approved' || sale.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        sale.status === 'undelivered' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        sale.status === 'partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        sale.status === 'pending' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                        'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {sale.status === 'undelivered' ? 'অনডেলিভারী' : sale.status === 'partial' ? 'আংশিক ডেলিভারি' : sale.status}
                      </span>
                    </td>
                    <td className="p-4 sm:p-6 border-b border-slate-50 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setDeliveryTargetSale(sale);
                            setShowDeliverySplitModal(true);
                          }}
                          className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
                          title="পণ্য ডেলিভারি ও অনডেলিভারী চালান তৈরি"
                        >
                          <Truck size={14} /> ডেলিভারি
                        </button>
                        <button 
                          onClick={() => setViewingSale(sale)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-600 hover:text-white transition-all"
                          title="ভিউ ইনভয়েস"
                        >
                          <FileText size={15} />
                        </button>
                        <button 
                          onClick={() => setEditingSale(sale)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-all"
                          title="এডিট"
                        >
                          <Target size={15} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              if (confirm('আপনি কি নিশ্চিত যে এই বিক্রয় রেকর্ডটি ডিলিট করতে চান?')) {
                                if (onDeleteSale) {
                                  onDeleteSale(sale.id);
                                } else {
                                  onUpdateSales(sales.filter(s => s.id !== sale.id));
                                }
                              }
                            }}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                          >
                            <TrendingDown size={15} />
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

      {/* ========================================================================= */}
      {/* TAB 6: STOCK ENTRIES */}
      {/* ========================================================================= */}
      {reportType === 'stock_entries' && (
        <div className="bg-white rounded-3xl sm:rounded-[48px] border-2 border-slate-50 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30">
            <div className="flex items-center gap-4">
               <div className="bg-emerald-600 p-3.5 rounded-2xl text-white shadow-md">
                  <Package size={24} />
               </div>
               <div>
                 <h4 className="font-black text-slate-900 text-base sm:text-xl uppercase tracking-tight">ডেইলি স্টক রিপোর্ট</h4>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">মজুদ মালামাল ও ডেইলি এন্ট্রির তালিকা</p>
               </div>
            </div>
            <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 flex gap-6">
               <div className="text-center">
                  <div className="text-base sm:text-xl font-black text-slate-900 leading-none">{financials.totalDailyStockAddQty}</div>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5 px-2 py-0.5 bg-slate-50 rounded-full">Total Qty</div>
               </div>
               <div className="text-center">
                  <div className="text-base sm:text-xl font-black text-emerald-600 leading-none">৳{financials.totalDailyStockAddValue.toLocaleString()}</div>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5 px-2 py-0.5 bg-slate-50 rounded-full">Total Value</div>
               </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">তারিখ ও সময়</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">পণ্যর নাম</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">পরিমাণ</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ক্রয়মূল্য</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">মোট মূল্য</th>
                  <th className="p-4 sm:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">নোট / এন্ট্রি প্রদানকারী</th>
                </tr>
              </thead>
              <tbody>
                {stockEntries
                  .filter(e => {
                    const d = normalizeDate(e.date);
                    return d >= startDate && d <= endDate;
                  })
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(entry => {
                    const product = products.find(p => p.id === entry.productId);
                    const cost = product?.purchasePrice || 0;
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 sm:p-6 border-b border-slate-50 text-[10px] font-black text-slate-500 uppercase">{entry.date}</td>
                        <td className="p-4 sm:p-6 border-b border-slate-50">
                          <div className="text-xs font-black text-slate-800 uppercase">{entry.productName}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{product?.category}</div>
                        </td>
                        <td className="p-4 sm:p-6 border-b border-slate-50">
                          <div className="text-xs font-black text-slate-900">{entry.quantity} {product?.unit}</div>
                        </td>
                        <td className="p-4 sm:p-6 border-b border-slate-50 text-xs font-black text-slate-500">৳{cost.toLocaleString()}</td>
                        <td className="p-4 sm:p-6 border-b border-slate-50 font-black text-xs text-emerald-600">৳{(entry.quantity * cost).toLocaleString()}</td>
                        <td className="p-4 sm:p-6 border-b border-slate-50">
                          <div className="text-[9px] font-bold text-slate-600 uppercase mb-1">{entry.note || 'No note'}</div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-[7px] font-black text-slate-400 uppercase">
                               {allStaff.find(s => s.id === entry.addedBy)?.name.charAt(0) || 'A'}
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase">{allStaff.find(s => s.id === entry.addedBy)?.name || 'Admin'}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {stockEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center">
                       <div className="flex flex-col items-center gap-3">
                          <div className="p-5 bg-slate-50 rounded-full text-slate-300"><Package size={40}/></div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-[2px]">কোনো স্টক এন্ট্রি পাওয়া যায়নি</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editing Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl sm:rounded-[48px] w-full max-w-lg p-6 sm:p-10 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">সেলস রেকর্ড সম্পাদনা</h3>
              <button onClick={() => setEditingSale(null)} className="p-2 rounded-full hover:bg-slate-100"><XCircle size={22}/></button>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice No</label>
                  <input 
                    type="text" 
                    value={editingSale.invoiceNo} 
                    onChange={e => setEditingSale({...editingSale, invoiceNo: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 sm:p-4 font-black text-xs sm:text-sm outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">মোট টাকা</label>
                  <input 
                    type="number" 
                    value={editingSale.total} 
                    onChange={e => setEditingSale({...editingSale, total: Number(e.target.value)})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 sm:p-4 font-black text-xs sm:text-sm outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">তারিখ</label>
                  <input 
                    type="date" 
                    value={editingSale.date?.split('T')[0]} 
                    onChange={e => setEditingSale({...editingSale, date: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 sm:p-4 font-black text-xs sm:text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">স্ট্যাটাস</label>
                <select 
                  value={editingSale.status} 
                  onChange={e => setEditingSale({...editingSale, status: e.target.value as any})}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 sm:p-4 font-black text-xs sm:text-sm outline-none appearance-none"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="delivered">Delivered</option>
                  <option value="undelivered">Undelivered</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setEditingSale(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3.5 sm:py-4 rounded-xl font-black uppercase text-xs tracking-widest"
                >
                  বাতিল
                </button>
                <button 
                  onClick={() => {
                    onUpdateSales(sales.map(s => s.id === editingSale.id ? editingSale : s));
                    setEditingSale(null);
                  }}
                  className="flex-1 bg-primary text-white py-3.5 sm:py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Invoice Modal */}
      {viewingSale && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[150] flex items-center justify-center p-0 sm:p-6 overflow-hidden">
          <div className="bg-slate-100 w-full h-full sm:max-w-4xl sm:max-h-[95vh] sm:rounded-[40px] flex flex-col shadow-3xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="bg-white p-5 sm:p-6 border-b-2 border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="bg-primary/10 p-2.5 rounded-xl text-primary"><FileText size={22}/></div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">ইনভয়েস প্রিভিউ</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">মেমো #{viewingSale.invoiceNo}</p>
                </div>
              </div>
              <button onClick={() => setViewingSale(null)} className="p-2 text-slate-400 hover:text-rose-600 active:scale-95 transition-all"><X size={28}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-10 custom-scrollbar flex justify-center bg-slate-200/50">
               <InvoiceContent 
                 sale={viewingSale} 
                 customer={customers.find(c => c.id === viewingSale.customerId)} 
                 shopSettings={shopSettings} 
               />
            </div>
            <div className="p-4 sm:p-6 bg-white border-t-2 border-slate-200 flex flex-wrap justify-between items-center gap-2.5 shrink-0">
              <button 
                onClick={() => {
                  setDeliveryTargetSale(viewingSale);
                  setShowDeliverySplitModal(true);
                }} 
                className="bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active-scale"
              >
                <Truck size={16}/> 📦 ডেলিভারি ও চালান স্প্লিট (Delivery & Challan)
              </button>
              <div className="flex flex-wrap justify-end gap-2.5">
                <button onClick={() => setViewingSale(null)} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest active-scale">বন্ধ করুন</button>
                <button onClick={handleDownloadInvoice} className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xs flex items-center gap-2 transition-all active-scale border border-emerald-200"><Download size={16}/> PDF ডাউনলোড</button>
                <button onClick={handlePrintInvoice} className="bg-primary text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all active-scale"><Printer size={16}/> প্রিন্ট করুন</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery and Undelivery Split Modal */}
      {showDeliverySplitModal && deliveryTargetSale && (
        <DeliverySplitModal
          isOpen={showDeliverySplitModal}
          onClose={() => {
            setShowDeliverySplitModal(false);
            setDeliveryTargetSale(null);
          }}
          sale={deliveryTargetSale}
          products={products}
          customers={customers}
          shopSettings={shopSettings}
          currentStaff={currentUser}
          onConfirmSplitDelivery={(deliveredSale, newUndeliveredSale, updatedProducts, updatedCustomers) => {
            if (onSplitDelivery) {
              onSplitDelivery(deliveredSale, newUndeliveredSale, updatedProducts, updatedCustomers);
            } else {
              let nextSales = sales.map(s => s.id === deliveredSale.id ? deliveredSale : s);
              if (newUndeliveredSale) {
                nextSales = [newUndeliveredSale, ...nextSales];
              }
              onUpdateSales(nextSales);
            }
            setViewingSale(deliveredSale);
          }}
        />
      )}
    </div>
  );
};

export default Reports;
