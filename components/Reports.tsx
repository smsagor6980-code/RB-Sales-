import React, { useState, useMemo } from 'react';
import { Sale, Product, Customer, Collection, Expense, Staff, ProductReturn } from '../types';
import html2pdf from 'html2pdf.js';
import InvoiceContent from './InvoiceContent';
import { 
  BarChart3, Calendar, TrendingUp, TrendingDown, DollarSign, 
  Package, ShoppingBag, User, Tag, Printer, PieChart, 
  ArrowUpRight, ArrowDownRight, Users, Target, Zap, ChevronRight,
  Filter, FileText, Share2, DownloadCloud, RotateCcw, Truck,
  AlertCircle, Briefcase, Activity, Layers, Wallet, Clock, XCircle,
  Download, X
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
  onCollection: (collection: Collection, customer: Customer) => void;
  onUpdateSales: (sales: Sale[]) => void;
  currentUser: Staff | null;
  isAdmin: boolean;
  allStaff: Staff[];
  shopSettings: any;
  stockEntries?: any[];
}

type ReportType = 'overview' | 'product_performance' | 'detailed_sales' | 'profit_loss' | 'stock_entries';
type ChannelFilter = 'all' | 'retail' | 'wholesale' | 'distributor';

const Reports: React.FC<ReportsProps> = ({ 
  sales = [], 
  products = [], 
  customers = [], 
  collections = [], 
  expenses = [], 
  returns = [],
  onCollection,
  onUpdateSales,
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

  // 2. Financial Metrics
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

  const handlePrint = () => window.print();

  const handlePrintInvoice = () => {
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;
    const WinPrint = window.open('', '', 'width=900,height=800');
    if (WinPrint) {
      WinPrint.document.write('<html><head><title>Invoice</title><style>@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap"); body { font-family: "Inter", sans-serif; padding: 40px; color: #1e293b; background: white; } .invoice-container { max-width: 800px; margin: 0 auto; } table { width: 100%; border-collapse: collapse; margin-bottom: 40px; } th { background: #1e1e5f; color: white; text-align: left; padding: 14px 20px; font-size: 12px; } td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-size: 14px; } .text-right { text-align: right; } .summary-table { width: 300px; margin-left: auto; } .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; } .total-bill { border-top: 3px solid #1e1e5f; font-size: 22px; font-weight: 900; }</style></head><body>');
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

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 print:bg-white print:p-0">
      <div className="flex flex-col lg:flex-row justify-between gap-8 items-start lg:items-center bg-white p-8 rounded-[40px] shadow-sm border-2 border-slate-50 print:hidden">
        <div className="flex items-center gap-5">
          <div className="bg-primary p-4 rounded-3xl text-white shadow-2xl shadow-primary/20 flex items-center justify-center">
            <BarChart3 size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{isAdmin ? 'Executive Reports' : 'My Performance Report'}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mt-1 flex items-center gap-2">
              <Activity size={12} className="text-primary"/> {isAdmin ? 'ব্যবসায়িক প্রগতি ও স্টক বিশ্লেষণ' : 'আপনার বিক্রয় ও কাজের বিশ্লেষণ'}
            </p>
          </div>
        </div>
        {/* ... buttons identical ... */}
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-[24px]">
          {(['overview', 'product_performance', 'detailed_sales', 'profit_loss', 'stock_entries'] as const).map(type => (
            <button key={type} onClick={() => setReportType(type)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${reportType === type ? 'bg-white text-primary shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{type.replace('_', ' ')}</button>
          ))}
        </div>
        <button onClick={handlePrint} className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center gap-2 hover:bg-black"><Printer size={20}/><span className="hidden sm:inline font-black text-[10px] uppercase">Print Report</span></button>
      </div>
      {/* ... Filters identical ... */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-50 shadow-sm space-y-3 group hover:border-primary/10 transition-all">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Calendar size={14} className="text-primary"/> শুরুর তারিখ</label>
           <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all"/>
        </div>
        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-50 shadow-sm space-y-3 group hover:border-primary/10 transition-all">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Calendar size={14} className="text-primary"/> শেষ তারিখ</label>
           <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all"/>
        </div>
        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-50 shadow-sm space-y-3 group hover:border-primary/10 transition-all">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Layers size={14} className="text-primary"/> সেলস চ্যানেল</label>
           <select value={channelFilter} onChange={e => setChannelFilter(e.target.value as any)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm outline-none appearance-none cursor-pointer">
              <option value="all">All Channels (সব)</option><option value="retail">Retail Only</option><option value="wholesale">Wholesale Only</option><option value="distributor">Distributor Only</option>
           </select>
        </div>
        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-50 shadow-sm space-y-3 group hover:border-primary/10 transition-all">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Users size={14} className="text-primary"/> স্টাফ ফিল্টার</label>
           <select disabled={!isAdmin} value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm outline-none appearance-none cursor-pointer disabled:opacity-50">
              <option value="all">All Personnel</option>
              {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
           <p className="text-[10px] font-black uppercase tracking-[3px] opacity-70 mb-2">{isAdmin ? 'সর্বমোট বিক্রয়' : 'আপনার মোট বিক্রয়'}</p>
           <h3 className="text-3xl sm:text-4xl font-black tracking-tightest">৳{financials.revenue.toLocaleString()}</h3>
           <div className="mt-4 flex items-center gap-2 text-[9px] font-black bg-white/10 w-fit px-3 py-1 rounded-full uppercase tracking-widest"><ShoppingBag size={12}/> {filteredSales.length} Invoices</div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-2">{isAdmin ? 'মোট খরচ ও ফেরত' : 'আপনার খরচ ও ফেরত'}</p>
           <h3 className="text-3xl sm:text-4xl font-black text-rose-600 tracking-tightest">৳{(financials.totalExpenses + financials.returnAmount).toLocaleString()}</h3>
           <div className="mt-4 flex gap-3"><span className="text-[9px] font-black text-rose-500 uppercase">E: ৳{financials.totalExpenses.toLocaleString()}</span><span className="text-[9px] font-black text-amber-500 uppercase">R: ৳{financials.returnAmount.toLocaleString()}</span></div>
        </div>
        <div className="bg-emerald-600 p-8 rounded-[40px] text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
           <p className="text-[10px] font-black uppercase tracking-[3px] opacity-70 mb-2">{isAdmin ? 'নিট মুনাফা' : 'আপনার অর্জিত মুনাফা'}</p>
           <h3 className="text-3xl sm:text-4xl font-black tracking-tightest">৳{(financials.netProfit - financials.returnAmount).toLocaleString()}</h3>
           <div className="mt-4 flex items-center gap-2 text-[9px] font-black bg-white/10 w-fit px-3 py-1 rounded-full uppercase tracking-widest"><TrendingUp size={12}/> {(((financials.netProfit - financials.returnAmount) / (financials.revenue || 1)) * 100).toFixed(1)}% Margin</div>
        </div>
        <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
           <p className="text-[10px] font-black uppercase tracking-[3px] opacity-70 mb-2">স্টক ভ্যালু (Valuation)</p>
           <h3 className="text-3xl sm:text-4xl font-black text-indigo-400 tracking-tightest">৳{financials.totalStockValue.toLocaleString()}</h3>
           <div className="mt-4 flex items-center gap-2 text-[9px] font-black bg-white/10 w-fit px-3 py-1 rounded-full uppercase tracking-widest"><Package size={12}/> {financials.totalStockQty} Items</div>
        </div>
      </div>
      {/* ... rest of UI follows the same display logic ... */}
      {reportType === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 bg-white p-10 rounded-[48px] border-2 border-slate-50 shadow-sm">
              <div className="flex justify-between items-center mb-12">
                 <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-3"><PieChart size={24} className="text-primary"/> Channel Distribution</h4>
              </div>
              <div className="h-80">
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
                       <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={80}>{ [0,1,2].map((_, i) => <Cell key={i} fill={Object.values(channelColors)[i]} />) }</Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
           <div className="lg:col-span-4 bg-white p-8 rounded-[48px] border-2 border-slate-50 shadow-sm flex flex-col">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3"><Target size={18} className="text-primary"/> {isAdmin ? 'Top Performance Items' : 'Your Top Selling Items'}</h4>
              <div className="space-y-6 flex-1">
                 {productPerformance.slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between group cursor-pointer hover:translate-x-1 transition-transform">
                       <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-600 shadow-lg shadow-amber-500/10' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>{i + 1}</div>
                          <div className="min-w-0">
                             <p className="text-[11px] font-black text-slate-700 truncate uppercase tracking-tight">{p.name}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">{p.soldQty} Sold • {p.returnedQty} Returned</p>
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
      {reportType === 'product_performance' && (
        <div className="bg-white rounded-[48px] border-2 border-slate-50 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-3"><Package size={24} className="text-primary"/> Product Performance Analysis</h4>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{productPerformance.length} Products Analyzed</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Product</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Stock Qty</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sold</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Returned</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Revenue</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Valuation</th>
                </tr>
              </thead>
              <tbody>
                {productPerformance.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 border-b border-slate-50">
                      <div className="text-xs font-black text-slate-800 uppercase">{p.name}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{p.category}</div>
                    </td>
                    <td className="p-6 border-b border-slate-50">
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${p.stock < 10 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                         {p.stock} {p.unit}
                       </span>
                    </td>
                    <td className="p-6 border-b border-slate-50 text-xs font-black text-slate-700">{p.soldQty}</td>
                    <td className="p-6 border-b border-slate-50 text-xs font-black text-rose-500">{p.returnedQty}</td>
                    <td className="p-6 border-b border-slate-50 font-black text-xs text-primary">৳{p.revenue.toLocaleString()}</td>
                    <td className="p-6 border-b border-slate-50 font-black text-xs text-emerald-600">৳{p.valuation.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'profit_loss' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[48px] border-2 border-slate-50 shadow-sm">
               <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-8 flex items-center gap-3"><TrendingUp size={24} className="text-primary"/> Profit Summary</h4>
               <div className="space-y-6">
                  <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl">
                     <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Revenue (বিক্রয় লব্ধ আয়)</span>
                     <span className="text-xl font-black text-slate-900">৳{financials.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl">
                     <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Cost of Goods (মালামাল ক্রয়মূল্য)</span>
                     <span className="text-xl font-black text-rose-600">- ৳{financials.cogs.toLocaleString()}</span>
                  </div>
                  <div className="h-0.5 bg-slate-100 mx-4"></div>
                  <div className="flex justify-between items-center p-6 bg-emerald-50 rounded-3xl">
                     <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Gross Profit (মোট মুনাফা)</span>
                     <span className="text-xl font-black text-emerald-600">৳{financials.grossProfit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl">
                     <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Expenses (অন্যান্য খরচ)</span>
                     <span className="text-xl font-black text-rose-600">- ৳{financials.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-amber-50 rounded-3xl">
                     <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Returns & Adjustments (ফেরত / সমন্বয়)</span>
                     <span className="text-xl font-black text-amber-600">- ৳{financials.returnAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full mx-4"></div>
                  <div className="flex justify-between items-center p-8 bg-slate-900 rounded-[32px] text-white shadow-2xl shadow-slate-900/20">
                     <span className="text-sm font-black uppercase tracking-widest opacity-70">Net Profit (নিট লাভ)</span>
                     <span className="text-3xl font-black">৳{(financials.netProfit - financials.returnAmount).toLocaleString()}</span>
                  </div>
               </div>
            </div>

            <div className="bg-white p-10 rounded-[48px] border-2 border-slate-50 shadow-sm flex flex-col">
               <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-8 flex items-center gap-3"><PieChart size={24} className="text-primary"/> Revenue Breakdown</h4>
               <div className="flex-1 flex items-center justify-center">
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <RePieChart>
                          <Pie
                            data={[
                              { name: 'Retail', value: financials.retailRev },
                              { name: 'Wholesale', value: financials.wholesaleRev },
                              { name: 'Distributor', value: financials.distributorRev }
                            ]}
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                          >
                             <Cell fill={channelColors.retail} />
                             <Cell fill={channelColors.wholesale} />
                             <Cell fill={channelColors.distributor} />
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }} />
                          <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{value}</span>} />
                       </RePieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="text-center p-4 rounded-2xl bg-indigo-50">
                    <div className="text-xs font-black text-indigo-600 tracking-tight">৳{financials.retailRev.toLocaleString()}</div>
                    <div className="text-[8px] font-black text-indigo-400 uppercase mt-1">Retail</div>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-emerald-50">
                    <div className="text-xs font-black text-emerald-600 tracking-tight">৳{financials.wholesaleRev.toLocaleString()}</div>
                    <div className="text-[8px] font-black text-emerald-400 uppercase mt-1">Wholesale</div>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-amber-50">
                    <div className="text-xs font-black text-amber-600 tracking-tight">৳{financials.distributorRev.toLocaleString()}</div>
                    <div className="text-[8px] font-black text-amber-400 uppercase mt-1">Distributor</div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {reportType === 'detailed_sales' && (
        <div className="bg-white rounded-[48px] border-2 border-slate-50 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-primary"/>
              <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Detailed Sales Log</h4>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search Invoice / Customer..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 font-black text-xs outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl shrink-0">{filteredSales.length} Transactions</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Invoice</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Customer</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Amount</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6 border-b border-slate-50">
                      <div className="text-xs font-black text-slate-800 uppercase">#{sale.invoiceNo}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">{sale.soldBy}</div>
                    </td>
                    <td className="p-6 border-b border-slate-50 text-[10px] font-black text-slate-500 uppercase">{normalizeDate(sale.date)}</td>
                    <td className="p-6 border-b border-slate-50">
                      <div className="text-xs font-black text-slate-800 uppercase">{customers.find(c => c.id === sale.customerId)?.name || 'Guest'}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{sale.customerType}</div>
                    </td>
                    <td className="p-6 border-b border-slate-50 font-black text-xs text-primary">৳{sale.total.toLocaleString()}</td>
                    <td className="p-6 border-b border-slate-50">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        sale.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        sale.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>{sale.status}</span>
                    </td>
                    <td className="p-6 border-b border-slate-50 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setViewingSale(sale)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-600 hover:text-white transition-all"
                          title="View Invoice"
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          onClick={() => setEditingSale(sale)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-all"
                          title="Edit Record"
                        >
                          <Target size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this sale record?')) {
                                onUpdateSales(sales.filter(s => s.id !== sale.id));
                              }
                            }}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                          >
                            <TrendingDown size={16} />
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

      {reportType === 'stock_entries' && (
        <div className="bg-white rounded-[48px] border-2 border-slate-50 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/30">
            <div className="flex items-center gap-5">
               <div className="bg-emerald-600 p-4 rounded-3xl text-white shadow-xl shadow-emerald-500/20">
                  <Package size={28} />
               </div>
               <div>
                 <h4 className="font-black text-slate-900 text-xl uppercase tracking-tight">ডেইলি স্টক রিপোর্ট</h4>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">মজুদ মালামাল ও ডেইলি এন্ট্রির তালিকা</p>
               </div>
            </div>
            <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 flex gap-10">
               <div className="text-center">
                  <div className="text-xl font-black text-slate-900 leading-none">{financials.totalDailyStockAddQty}</div>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 px-2 py-0.5 bg-slate-50 rounded-full">Total Qty</div>
               </div>
               <div className="text-center">
                  <div className="text-xl font-black text-emerald-600 leading-none">৳{financials.totalDailyStockAddValue.toLocaleString()}</div>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 px-2 py-0.5 bg-slate-50 rounded-full">Total Value</div>
               </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date & Time</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Product Name</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Quantity</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Unit Price</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Total Value</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 uppercase">Note / Added By</th>
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
                        <td className="p-6 border-b border-slate-50 text-[10px] font-black text-slate-500 uppercase">{entry.date}</td>
                        <td className="p-6 border-b border-slate-50">
                          <div className="text-xs font-black text-slate-800 uppercase">{entry.productName}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{product?.category}</div>
                        </td>
                        <td className="p-6 border-b border-slate-50">
                          <div className="text-xs font-black text-slate-900">{entry.quantity} {product?.unit}</div>
                        </td>
                        <td className="p-6 border-b border-slate-50 text-xs font-black text-slate-500">৳{cost.toLocaleString()}</td>
                        <td className="p-6 border-b border-slate-50 font-black text-xs text-emerald-600">৳{(entry.quantity * cost).toLocaleString()}</td>
                        <td className="p-6 border-b border-slate-50">
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
                    <td colSpan={6} className="p-20 text-center">
                       <div className="flex flex-col items-center gap-4">
                          <div className="p-6 bg-slate-50 rounded-full text-slate-200"><Package size={48}/></div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-[4px]">কোনো স্টক এন্ট্রি পাওয়া যায়নি</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingSale && (

        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tight">Edit Sale Record</h3>
              <button onClick={() => setEditingSale(null)} className="p-2 rounded-full hover:bg-slate-100"><XCircle size={24}/></button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice No</label>
                  <input 
                    type="text" 
                    value={editingSale.invoiceNo} 
                    onChange={e => setEditingSale({...editingSale, invoiceNo: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Amount</label>
                  <input 
                    type="number" 
                    value={editingSale.total} 
                    onChange={e => setEditingSale({...editingSale, total: Number(e.target.value)})}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sale Date</label>
                  <input 
                    type="date" 
                    value={editingSale.date?.split('T')[0]} 
                    onChange={e => setEditingSale({...editingSale, date: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select 
                  value={editingSale.status} 
                  onChange={e => setEditingSale({...editingSale, status: e.target.value as any})}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm outline-none appearance-none"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  onClick={() => setEditingSale(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onUpdateSales(sales.map(s => s.id === editingSale.id ? editingSale : s));
                    setEditingSale(null);
                  }}
                  className="flex-1 bg-primary text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingSale && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[150] flex items-center justify-center p-0 sm:p-6 overflow-hidden">
          <div className="bg-slate-100 w-full h-full sm:max-w-4xl sm:max-h-[95vh] sm:rounded-[40px] flex flex-col shadow-3xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="bg-white p-6 border-b-2 border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2.5 rounded-xl text-primary"><FileText size={24}/></div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Viewing Invoice</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale Record details</p>
                </div>
              </div>
              <button onClick={() => setViewingSale(null)} className="p-3 text-slate-400 hover:text-rose-600 active:scale-95 transition-all"><X size={32}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar flex justify-center bg-slate-200/50">
               <InvoiceContent 
                 sale={viewingSale} 
                 customer={customers.find(c => c.id === viewingSale.customerId)} 
                 shopSettings={shopSettings} 
               />
            </div>
            <div className="p-6 bg-white border-t-2 border-slate-200 flex flex-wrap justify-end gap-3 shrink-0">
              <button onClick={() => setViewingSale(null)} className="bg-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active-scale">Close Preview</button>
              <button onClick={handleDownloadInvoice} className="bg-emerald-50 text-emerald-600 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-3 transition-all active-scale border-2 border-emerald-100"><Download size={18}/> Download PDF</button>
              <button onClick={handlePrintInvoice} className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all active-scale"><Printer size={18}/> Print Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;