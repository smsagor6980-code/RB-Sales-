import React, { useState, useMemo } from 'react';
import { Expense, Staff } from '../types';
import { Plus, TrendingDown, FileText, Calendar, Calculator, Zap, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ExpensesProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense?: (id: string) => void;
  isAdmin: boolean;
  currentStaff?: Staff | null;
}

const Expenses: React.FC<ExpensesProps> = ({ expenses, onAddExpense, onDeleteExpense, isAdmin, currentStaff }) => {
  const getLocalDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getLocalDate());
  const [filterType, setFilterType] = useState<'month' | 'today'>('today');

  const categories = [
    { id: 'rent', label: 'Shop Rent' },
    { id: 'salary', label: 'Staff Salary' },
    { id: 'utilities', label: 'Electricity/Bills' },
    { id: 'transport', label: 'Transport' },
    { id: 'snacks', label: 'Tea/Snacks' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'maintenance', label: 'Repairs' },
    { id: 'other', label: 'Other' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category,
      description,
      date,
      addedBy: currentStaff?.id
    };

    onAddExpense(newExpense);
    setAmount('');
    setDescription('');
    setCategory('other');
  };

  const filteredExpenses = useMemo(() => {
    let base = expenses;
    if (!isAdmin && currentStaff) {
      base = expenses.filter(e => e.addedBy === currentStaff.id);
    }

    return base.filter(e => {
      if (filterType === 'today') return e.date === getLocalDate();
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterType, isAdmin, currentStaff]);

  const currentPeriodTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const lifetimeExpense = useMemo(() => {
    let base = expenses;
    if (!isAdmin && currentStaff) {
      base = expenses.filter(e => e.addedBy === currentStaff.id);
    }
    return base.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, isAdmin, currentStaff]);

  const chartData = categories.map(cat => ({
    name: cat.label,
    amount: filteredExpenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0)
  })).filter(d => d.amount > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tightest uppercase flex items-center gap-3">
            <TrendingDown className="text-rose-500" size={32} /> Expense Hub
          </h2>
          <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">ব্যবসায়িক খরচ এবং হিসাব ব্যবস্থাপনা।</p>
        </div>
        {/* ... buttons identical ... */}
        <div className="flex bg-white p-1.5 rounded-2xl border-2 border-slate-100 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
          <button onClick={() => setFilterType('today')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'today' ? 'bg-primary text-white shadow-xl' : 'text-slate-400'}`}>Today</button>
          <button onClick={() => setFilterType('month')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'month' ? 'bg-primary text-white shadow-xl' : 'text-slate-400'}`}>This Month</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[40px] shadow-sm border-2 border-slate-100 p-8">
            <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3 uppercase text-sm tracking-widest border-b border-slate-50 pb-4">
              <Plus size={18} className="text-primary" /> নতুন খরচ যোগ করুন
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">তারিখ</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-4 text-slate-400" size={18} />
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 font-black text-sm outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">ক্যাটাগরি</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-sm outline-none focus:bg-white appearance-none">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">টাকার পরিমাণ (৳)</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-rose-500 font-black text-lg">৳</span>
                  <input type="number" required placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-4 font-black text-2xl text-rose-700 outline-none focus:bg-white focus:ring-4 focus:ring-rose-500/10" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">বিস্তারিত বিবরণ</label>
                <textarea rows={2} placeholder="খরচের বিবরণ লিখুন" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:bg-white transition-all"/>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-[22px] font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-[10px]">খরচ সংরক্ষণ করুন</button>
            </form>
          </div>
          {/* Stat Cards */}
          <div className="bg-rose-600 p-8 rounded-[40px] text-white shadow-2xl shadow-rose-900/10 space-y-2 relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
             <div className="text-[10px] font-black uppercase tracking-[3px] opacity-80 flex items-center gap-2"><Calculator size={14}/> {filterType === 'today' ? 'আপনার আজকের' : 'এ মাসের'} খরচ</div>
             <div className="text-4xl font-black tracking-tightest">৳{currentPeriodTotal.toLocaleString()}</div>
             <p className="text-[9px] font-black uppercase tracking-widest opacity-60">আপনার রেকর্ড করা খরচের মোট যোগফল</p>
          </div>
          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl shadow-slate-900/20 space-y-2 relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
             <div className="text-[10px] font-black uppercase tracking-[3px] text-emerald-400 flex items-center gap-2"><Zap size={14}/> আপনার লাইফটাইম খরচ</div>
             <div className="text-4xl font-black tracking-tightest">৳{lifetimeExpense.toLocaleString()}</div>
             <p className="text-[9px] font-black uppercase tracking-widest opacity-60">ব্যবসা শুরুর পর থেকে আপনার মোট খরচ</p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          {chartData.length > 0 && (
             <div className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-slate-100 h-[350px]">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                  <TrendingDown size={18} className="text-rose-500"/> খরচ বিশ্লেষণ ({filterType})
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="5 5" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={110} tick={{fontSize: 9, fontWeight: '900', fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '12px', fontWeight: '900' }} />
                      <Bar dataKey="amount" fill="#e11d48" radius={[0, 12, 12, 0]} barSize={24} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          )}

          <div className="bg-white rounded-[40px] shadow-sm border-2 border-slate-100 overflow-hidden">
             <div className="p-6 border-b-2 border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">আপনার সাম্প্রতিক খরচসমূহ</h3>
                <span className="text-[10px] font-black bg-white px-3 py-1 rounded-lg border border-slate-100 text-slate-500 uppercase">{filteredExpenses.length} Records</span>
             </div>
             <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
               {filteredExpenses.length === 0 ? (
                 <div className="p-20 text-center flex flex-col items-center justify-center opacity-30 grayscale">
                    <TrendingDown size={48} />
                    <p className="text-[11px] font-black uppercase tracking-[3px] mt-6">কোনো খরচের হিসাব পাওয়া যায়নি</p>
                 </div>
               ) : (
                 filteredExpenses.map(item => (
                   <div key={item.id} className="p-6 hover:bg-slate-50 flex justify-between items-center group transition-all animate-in slide-in-from-right-4">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 rounded-[18px] bg-white text-rose-500 flex items-center justify-center shrink-0 shadow-sm border-2 border-rose-50 group-hover:bg-rose-500 group-hover:text-white transition-all">
                           <FileText size={20} />
                         </div>
                         <div>
                            <div className="font-black text-slate-800 text-sm uppercase tracking-tight">{categories.find(c => c.id === item.category)?.label}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{item.date} • {item.description || 'বিবরণ নেই'}</div>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                           <div className="font-black text-rose-600 text-lg tracking-tightest">৳{item.amount.toLocaleString()}</div>
                        </div>
                        {onDeleteExpense && (isAdmin || item.addedBy === currentStaff?.id) && (
                          <button
                            onClick={() => {
                              if (confirm('আপনি কি নিশ্চিত যে এই খরচের রেকর্ডটি ডিলিট করতে চান?')) {
                                onDeleteExpense(item.id);
                              }
                            }}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;