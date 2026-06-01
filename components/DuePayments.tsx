
import React, { useState, useMemo } from 'react';
// Corrected: Added RankConfig to imports
import { Customer, Sale, Collection, Staff, RankConfig } from '../types';
import { 
  DollarSign, Search, AlertCircle, Check, X, History, User, 
  Calendar, Calculator, TrendingUp, Wallet, ArrowRight,
  ChevronRight, Receipt, ArrowDownLeft, Trash2, Info, Clock,
  CheckCircle2, AlertTriangle, Users, Phone
} from 'lucide-react';

interface DuePaymentsProps {
  customers: Customer[];
  sales: Sale[];
  collections: Collection[];
  onCollection: (collection: Collection, customer: Customer) => void;
  isAdmin: boolean;
  currentStaff?: Staff | null;
  // Corrected: Added rankConfigs to interface to match App.tsx usage
  rankConfigs: RankConfig[];
}

// Corrected: Destructured rankConfigs from props
const DuePayments: React.FC<DuePaymentsProps> = ({ 
  customers, 
  sales, 
  collections, 
  onCollection, 
  isAdmin, 
  currentStaff,
  rankConfigs 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collectionModal, setCollectionModal] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');

  const today = new Date().toLocaleDateString('en-CA');

  const stats = useMemo(() => {
    let filteredCusts = customers;
    let filteredCols = collections;
    
    if (!isAdmin && currentStaff) {
      filteredCusts = customers.filter(c => c.addedBy === currentStaff.id);
      filteredCols = collections.filter(col => col.addedBy === currentStaff.id);
    }

    const totalDue = filteredCusts.reduce((sum, c) => sum + (c.dueAmount || 0), 0);
    const totalTodayCollected = filteredCols
      .filter(col => col.date === today)
      .reduce((sum, col) => sum + col.amount, 0);
    const dueCustomersCount = filteredCusts.filter(c => (c.dueAmount || 0) > 1).length;

    return { totalDue, totalTodayCollected, dueCustomersCount };
  }, [customers, collections, today, isAdmin, currentStaff]);

  const dueCustomers = useMemo(() => {
    let base = customers;
    if (!isAdmin && currentStaff) {
      base = customers.filter(c => c.addedBy === currentStaff.id);
    }

    return base.filter(c => 
      (c.dueAmount || 0) > 0.1 && 
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm))
    ).sort((a, b) => b.dueAmount - a.dueAmount);
  }, [customers, searchTerm, isAdmin, currentStaff]);

  const activeCustomer = customers.find(c => c.id === collectionModal);
  const historyCustomer = customers.find(c => c.id === historyModal);

  const customerCollections = useMemo(() => {
    if (!historyModal) return [];
    let base = collections.filter(col => col.customerId === historyModal);
    if (!isAdmin && currentStaff) {
      base = base.filter(col => col.addedBy === currentStaff.id);
    }
    return base.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [collections, historyModal, isAdmin, currentStaff]);

  const handleCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionModal || !activeCustomer) return;
    const collectAmount = parseFloat(amount);
    if (isNaN(collectAmount) || collectAmount <= 0) return;

    onCollection({
      id: Date.now().toString(), 
      customerId: activeCustomer.id, 
      amount: collectAmount, 
      paymentMethod: method, 
      date: today, 
      notes: note,
      addedBy: currentStaff?.id
    }, {
      ...activeCustomer, 
      dueAmount: Math.max(0, activeCustomer.dueAmount - collectAmount), 
      totalPaid: (activeCustomer.totalPaid || 0) + collectAmount
    });
    setCollectionModal(null);
    setAmount('');
    setNote('');
  };

  const setQuickAmount = (val: number) => {
    // Fixed: 'v' was not defined, changed to 'val'
    if (activeCustomer && val > activeCustomer.dueAmount) {
      setAmount(activeCustomer.dueAmount.toString());
    } else {
      setAmount(val.toString());
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
             <div className="bg-rose-500 p-2.5 rounded-2xl text-white shadow-lg"><Receipt size={24}/></div>
             Due Management
          </h2>
          <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">বাকি আদায় এবং লেনদেনের হিসাব।</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
         <div className="bg-white p-7 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertTriangle size={14} className="text-rose-400"/> {isAdmin ? 'মোট বকেয়া' : 'আপনার কাস্টমার বকেয়া'}</p>
            <h3 className="text-3xl font-black text-rose-600 tracking-tighter">৳{stats.totalDue.toLocaleString()}</h3>
            <p className="text-[9px] font-black text-slate-300 uppercase mt-2">{stats.dueCustomersCount} জন কাস্টমারের কাছে পাওনা</p>
         </div>
         <div className="bg-white p-7 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400"/> আজকের আদায়</p>
            <h3 className="text-3xl font-black text-emerald-600 tracking-tighter">৳{stats.totalTodayCollected.toLocaleString()}</h3>
            <p className="text-[9px] font-black text-slate-300 uppercase mt-2">গত ২৪ ঘণ্টায় আপনার সংগ্রহ</p>
         </div>
         <div className="bg-white p-7 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Users size={14} className="text-primary/40"/> কাস্টমার ফিল্টার</p>
            <div className="relative mt-1">
               <input type="text" placeholder="খুঁজুন..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 font-black text-xs outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {dueCustomers.map(customer => (
          <div key={customer.id} className="bg-white p-6 rounded-[40px] border-2 border-slate-50 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between">
             <div>
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-[24px] bg-slate-50 text-slate-400 flex items-center justify-center font-black text-2xl border-2 border-slate-100 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shadow-sm">
                      {customer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="font-black text-slate-900 text-base uppercase tracking-tight truncate">{customer.name}</div>
                       <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1.5"><Phone size={10}/> {customer.phone}</div>
                    </div>
                    <button onClick={() => setHistoryModal(customer.id)} className="p-3 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all" title="Payment History">
                       <History size={20}/>
                    </button>
                </div>
                <div className="bg-rose-50 p-6 rounded-[32px] border-2 border-rose-100 mb-6 group-hover:bg-rose-600 transition-all duration-500">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest group-hover:text-white/60">বাকি পরিমাণ</p>
                    <div className="text-3xl font-black text-rose-700 tracking-tightest group-hover:text-white transition-all">৳{customer.dueAmount.toLocaleString()}</div>
                </div>
             </div>
             <button onClick={() => { setCollectionModal(customer.id); setAmount(''); }} className="w-full bg-emerald-600 text-white py-4 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/10 active:scale-95 transition-all flex items-center justify-center gap-2">
                <DollarSign size={18}/> আদায় করুন
             </button>
          </div>
        ))}
      </div>

      {collectionModal && activeCustomer && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase">বাকি আদায়</h3>
              <button onClick={() => setCollectionModal(null)}><X /></button>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl mb-6">
              <p className="text-[10px] font-black text-rose-500 uppercase">মোট বকেয়া</p>
              <p className="text-2xl font-black text-rose-700">৳{activeCustomer.dueAmount}</p>
            </div>
            <form onSubmit={handleCollect} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">আদায়ের পরিমাণ</label>
                <input type="number" required className="w-full border-2 rounded-2xl p-4 font-black text-lg outline-none focus:ring-4 focus:ring-primary/5" value={amount} onChange={e => setAmount(e.target.value)} />
                <div className="flex gap-2 mt-2">
                  {[500, 1000, 5000].map(v => (
                    <button key={v} type="button" onClick={() => setQuickAmount(v)} className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black">৳{v}</button>
                  ))}
                  <button type="button" onClick={() => setQuickAmount(activeCustomer.dueAmount)} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black">Full</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">মেথড</label>
                <select className="w-full border-2 rounded-2xl p-4 font-black text-sm outline-none" value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">সংগ্রহ করুন</button>
            </form>
          </div>
        </div>
      )}

      {historyModal && historyCustomer && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-black uppercase">লেনদেনের ইতিহাস - {historyCustomer.name}</h3>
              <button onClick={() => setHistoryModal(null)}><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {customerCollections.map(col => (
                <div key={col.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <div className="text-xs font-black text-emerald-600 uppercase tracking-widest">৳{col.amount} সংগ্রহ করা হয়েছে</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{col.date} • {col.paymentMethod}</div>
                  </div>
                  <div className="bg-white px-3 py-1 rounded-lg border text-[9px] font-black text-slate-400">PAID</div>
                </div>
              ))}
              {customerCollections.length === 0 && (
                <div className="text-center py-10 text-slate-400 font-black uppercase text-[10px]">কোনো রেকর্ড পাওয়া যায়নি</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuePayments;
