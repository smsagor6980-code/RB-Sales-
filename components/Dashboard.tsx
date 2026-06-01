
import React, { useMemo, useState } from 'react';
import { Sale, Collection, Activity, Product, Expense, Customer, Staff } from '../types';
import { 
  DollarSign, TrendingUp, AlertCircle, ShoppingBag, 
  Wallet, PieChart, Activity as ActivityIcon, Package, BarChart3,
  ArrowUpRight, ArrowDownRight, Users, User, Trophy, Zap, RotateCcw,
  Tag, ChevronDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  sales: Sale[];
  collections: Collection[];
  activities: Activity[];
  products: Product[];
  expenses: Expense[];
  customers: Customer[];
  setActivePage: (page: string) => void;
  isAdmin: boolean;
  currentStaff: Staff | null;
}

const normalizeDate = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
};

const getLocalToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(Date.now() - offset).toISOString().split('T')[0];
};

const StatCard = ({ title, value, subValue, icon: Icon, color, trend }: any) => {
  const colorMap: any = {
    blue: 'from-blue-600 to-indigo-700 shadow-blue-200',
    green: 'from-emerald-600 to-teal-800 shadow-emerald-200',
    red: 'from-rose-600 to-red-800 shadow-rose-200',
    orange: 'from-orange-500 to-amber-700 shadow-orange-200',
    purple: 'from-purple-600 to-violet-800 shadow-purple-200',
  };

  return (
    <div className="bg-white p-5 sm:p-7 rounded-[32px] shadow-sm border-2 border-slate-100 hover:shadow-2xl transition-all duration-500 relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${colorMap[color]} opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-700`}></div>
      <div className="flex justify-between items-start mb-5 sm:mb-6">
        <div className={`p-3.5 sm:p-4 rounded-[20px] sm:rounded-[22px] bg-gradient-to-br ${colorMap[color] || colorMap.blue} text-white shadow-xl shadow-current/20`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        {trend !== undefined && (
           <div className={`flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {trend > 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
              {Math.abs(trend)}%
           </div>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-1">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter uppercase">{value}</h3>
        {subValue && <p className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-widest">{subValue}</p>}
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ sales, collections, activities, products, expenses, customers, setActivePage, isAdmin, currentStaff }) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'lifetime'>('today');

  const approvedSales = useMemo(() => {
    return sales.filter(s => s.status === 'approved' || s.status === 'paid' || s.status === 'due');
  }, [sales]);

  const userSales = useMemo(() => {
    if (isAdmin) return approvedSales;
    return approvedSales.filter(s => s.soldById === currentStaff?.id);
  }, [approvedSales, isAdmin, currentStaff]);

  const stats = useMemo(() => {
    const today = getLocalToday();
    const currentMonthPrefix = today.substring(0, 7);
    const currentYearPrefix = today.substring(0, 4);
    
    const isWithin = (dateStr: string) => {
      const normalized = normalizeDate(dateStr);
      if (!normalized) return false;
      if (period === 'lifetime') return true;
      if (period === 'today') return normalized === today;
      if (period === 'month') return normalized.startsWith(currentMonthPrefix);
      if (period === 'year') return normalized.startsWith(currentYearPrefix);
      if (period === 'week') {
        const diff = (new Date(today).getTime() - new Date(normalized).getTime()) / (1000 * 3600 * 24);
        return diff <= 7 && diff >= 0;
      }
      return false;
    };

    const fSales = userSales.filter(s => isWithin(s.date));
    const retailSales = fSales.filter(s => s.customerType !== 'wholesale').reduce((sum, s) => sum + s.total, 0);
    const wholesaleSales = fSales.filter(s => s.customerType === 'wholesale').reduce((sum, s) => sum + s.total, 0);
    const totalSales = retailSales + wholesaleSales;
    
    const totalReceived = fSales.reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
    const totalDue = (customers || []).reduce((sum, c) => sum + (Number(c.dueAmount) || 0), 0);
    const totalStockValue = (products || []).reduce((sum, p) => sum + ((Number(p.purchasePrice) || 0) * (Number(p.stock) || 0)), 0);
    const totalCustomers = (customers || []).length;

    return { totalSales, retailSales, wholesaleSales, totalReceived, totalDue, totalStockValue, totalCustomers };
  }, [userSales, products, customers, period]);

  const topCustomers = useMemo(() => {
    const customerStats: Record<string, { name: string; total: number; count: number }> = {};
    
    userSales.forEach(sale => {
      if (!sale.customerId) return;
      const customer = customers.find(c => c.id === sale.customerId);
      const name = customer?.name || 'Unknown Customer';
      
      if (!customerStats[sale.customerId]) {
        customerStats[sale.customerId] = { name, total: 0, count: 0 };
      }
      customerStats[sale.customerId].total += sale.total;
      customerStats[sale.customerId].count += 1;
    });

    return Object.entries(customerStats)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [userSales, customers]);

  const chartData = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dailySales = userSales.filter(s => normalizeDate(s.date) === dateStr);
      return {
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        retail: dailySales.filter(s => s.customerType !== 'wholesale').reduce((sum, s) => sum + s.total, 0),
        wholesale: dailySales.filter(s => s.customerType === 'wholesale').reduce((sum, s) => sum + s.total, 0)
      };
    });
  }, [userSales]);

  const formatCurrency = (val: number) => '৳' + new Intl.NumberFormat('en-IN').format(Math.round(val));

  return (
    <div className="space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase">
            {isAdmin ? 'পারফরম্যান্স হাব' : 'আমার ড্যাশবোর্ড'} 
            <span className="text-primary/20 text-xl sm:text-2xl font-light ml-3">v2.1</span>
          </h2>
          <p className="text-slate-500 font-black text-[10px] sm:text-xs mt-1 uppercase tracking-[3px]">
            {isAdmin ? 'রিটেইল এবং হোলসেল রিয়েল-টাইম ডেটা' : `স্বাগতম, ${currentStaff?.name}!`}
          </p>
        </div>
        <div className="relative w-full md:w-auto">
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value as any)}
            className="w-full md:w-48 appearance-none bg-white border-2 border-slate-100 rounded-[24px] px-8 py-3.5 font-black text-[10px] uppercase tracking-[2px] text-slate-700 outline-none focus:border-primary transition-all shadow-sm cursor-pointer"
          >
            <option value="today">আজ</option>
            <option value="week">এই সপ্তাহ</option>
            <option value="month">এই মাস</option>
            <option value="year">এই বছর</option>
            <option value="lifetime">সব সময়</option>
          </select>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
        <StatCard title="রিটেইল রেভিনিউ" value={formatCurrency(stats.retailSales)} icon={User} color="blue" />
        <StatCard title="হোলসেল রেভিনিউ" value={formatCurrency(stats.wholesaleSales)} icon={Tag} color="green" />
        <StatCard title="জমা (Received)" value={formatCurrency(stats.totalReceived)} icon={Wallet} color="purple" />
        <StatCard title="মোট বকেয়া" value={formatCurrency(stats.totalDue)} icon={AlertCircle} color="red" />
        <StatCard title="স্টক ভ্যালু" value={formatCurrency(stats.totalStockValue)} icon={Package} color="orange" />
        <StatCard title="মোট কাস্টমার" value={stats.totalCustomers} icon={Users} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border-2 border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
               <h3 className="font-black text-slate-900 text-lg sm:text-xl flex items-center gap-3 uppercase tracking-tight">
                 <PieChart size={24} className="text-primary"/> 
                 রেভিনিউ ট্রেন্ডস
               </h3>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600"><div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div> রিটেইল</div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600"><div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div> হোলসেল</div>
               </div>
            </div>
            <div className="h-64 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWholesale" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#94a3b8'}} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#94a3b8'}} tickFormatter={(v) => v >= 1000 ? (v/1000)+'k' : v} />
                  <Tooltip 
                    cursor={{ stroke: '#1e1e5f', strokeWidth: 2, strokeDasharray: '5 5' }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '15px', fontWeight: '900' }}
                  />
                  <Area type="monotone" dataKey="retail" stroke="#2563eb" strokeWidth={5} fillOpacity={1} fill="url(#colorRetail)" animationDuration={1000} />
                  <Area type="monotone" dataKey="wholesale" stroke="#10b981" strokeWidth={5} fillOpacity={1} fill="url(#colorWholesale)" animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 10 Customers Section */}
          <div className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border-2 border-slate-100 overflow-hidden">
            <h3 className="font-black text-slate-900 text-lg sm:text-xl flex items-center gap-3 uppercase tracking-tight mb-8">
              <Trophy size={24} className="text-amber-500"/> 
              শীর্ষ ১০ কাস্টমার
            </h3>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b-2 border-slate-50">
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">নাম</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">ইনভয়েস</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">মোট ক্রয়</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topCustomers.map((c, i) => (
                    <tr key={c.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            i === 0 ? 'bg-amber-100 text-amber-600' : 
                            i === 1 ? 'bg-slate-200 text-slate-600' :
                            i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                          }`}>
                            {i + 1}
                          </div>
                          <span className="font-black text-slate-800 text-sm tracking-tight">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{c.count}</span>
                      </td>
                      <td className="py-4 text-right">
                        <span className="font-black text-slate-900 text-sm">{formatCurrency(c.total)}</span>
                      </td>
                    </tr>
                  ))}
                  {topCustomers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-10 text-center font-black text-slate-400 uppercase text-xs tracking-widest">কোন ডেটা নেই</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border-2 border-slate-100 h-fit">
          <h3 className="font-black text-slate-900 mb-8 sm:mb-10 flex items-center gap-3 uppercase tracking-tight"><ActivityIcon size={24} className="text-orange-500"/> সাম্প্রতিক কার্যক্রম</h3>
          <div className="space-y-6 sm:space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-50">
            {(activities || []).slice(0, 6).map((act, i) => (
              <div key={act.id} className="flex gap-4 sm:gap-6 items-start relative z-10 animate-in fade-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 shadow-lg border-2 ${
                  act.type === 'sale' ? 'bg-primary text-white border-primary/20' : 
                  act.type === 'return' ? 'bg-rose-600 text-white border-rose-200' : 'bg-emerald-600 text-white border-emerald-200'
                }`}>
                  {act.type === 'sale' ? <ShoppingBag size={18} /> : 
                   act.type === 'return' ? <RotateCcw size={18} /> : <DollarSign size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">{act.title}</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate uppercase">{act.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{normalizeDate(act.date)}</span>
                       <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded uppercase">৳{act.amount}</span>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
