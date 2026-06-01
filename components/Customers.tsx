import React, { useState, useMemo } from 'react';
import { Customer, Sale, Collection, CustomerReward, RankConfig, Staff } from '../types';
import html2pdf from 'html2pdf.js';
import InvoiceContent from './InvoiceContent';
import { 
  Plus, Edit, Trash2, Search, X, User, Users, Gift, 
  Target, Trophy, Save, Check, DollarSign, History,
  Phone, MapPin, Mail, Calendar, ArrowUpRight, ArrowDownRight,
  TrendingUp, Star, AlertCircle, ShoppingBag, Eye, Award,
  Medal, Crown, Sparkles, Zap, ShieldCheck, Receipt, FileText, Printer,
  Download, ExternalLink, Building2, Clock
} from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  onUpdate: (customers: Customer[]) => void;
  onDelete?: (id: string) => void;
  sales: Sale[];
  collections: Collection[];
  onCollection: (collection: Collection, customer: Customer) => void;
  rankConfigs: RankConfig[];
  isAdmin: boolean;
  currentStaff?: Staff | null;
  shopSettings: any;
}

const RANK_ICONS: Record<string, any> = {
  'Bronze': Medal,
  'Silver': ShieldCheck,
  'Gold': Trophy,
  'Platinum': Crown,
  'Diamond': Sparkles
};

const RANK_COLORS: Record<string, any> = {
  'Bronze': { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500' },
  'Silver': { color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', bar: 'bg-slate-500' },
  'Gold': { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500' },
  'Platinum': { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', bar: 'bg-purple-500' },
  'Diamond': { color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', bar: 'bg-cyan-500' }
};

const Customers: React.FC<CustomersProps> = ({ customers, onUpdate, onDelete, sales, collections, onCollection, rankConfigs, isAdmin, currentStaff, shopSettings }) => {
  const [showModal, setShowModal] = useState(false);
  const [showProfile, setShowProfile] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);

  // Data access control: If not admin, show only their own customers
  const displayCustomers = useMemo(() => {
    let filtered = customers;
    if (!isAdmin && currentStaff) {
      filtered = customers.filter(c => c.addedBy === currentStaff.id);
    }
    return filtered.filter(c => 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (c.phone || '').includes(search)
    );
  }, [customers, isAdmin, currentStaff, search]);

  // Role based check: Only Admin, Owner or Manager can edit existing customers
  const canEditExisting = isAdmin || ['Admin', 'Owner', 'Manager'].includes(currentStaff?.designation || '');
  // All users can add new customers
  const canAddNew = true;

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', phone: '', email: '', address: '', dueAmount: 0, type: 'retail', status: 'active',
    dateAdded: new Date().toISOString().split('T')[0],
    targets: { monthly: 10000, yearly: 100000, lifetime: 500000 }
  });

  const resetForm = () => {
    setFormData({ 
      name: '', phone: '', email: '', address: '', dueAmount: 0, type: 'retail', status: 'active',
      dateAdded: new Date().toISOString().split('T')[0],
      targets: { monthly: 10000, yearly: 100000, lifetime: 500000 }
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      if (!canEditExisting) {
        alert("আপনার কাস্টমার তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র এডমিন এটি করতে পারবেন।");
        return;
      }
      const existing = customers.find(c => c.id === editingId);
      if (existing) {
        onUpdate([{ ...existing, ...formData } as Customer]);
      }
    } else {
      const newCustomer: Customer = {
        ...formData as Customer,
        id: `CUST-${Date.now()}`,
        dateAdded: formData.dateAdded || new Date().toISOString(),
        totalPurchase: 0,
        totalPaid: 0,
        rewards: [],
        addedBy: currentStaff?.id
      };
      onUpdate([newCustomer]);
    }
    setShowModal(false);
    resetForm();
  };

  const [collectAmount, setCollectAmount] = useState('');
  const [collectNote, setCollectNote] = useState('');
  
  const handleCollection = (e: React.FormEvent, cust: Customer) => {
    e.preventDefault();
    const amount = parseFloat(collectAmount) || 0;
    if (amount <= 0) return;

    const newCollection: Collection = {
      id: `COL-${Date.now()}`,
      customerId: cust.id,
      customerName: cust.name,
      amount,
      date: new Date().toISOString(),
      paymentMethod: (e.target as any).method.value,
      notes: collectNote
    };

    const updatedCustomer: Customer = {
      ...cust,
      dueAmount: Math.max(0, (cust.dueAmount || 0) - amount),
      totalPaid: (cust.totalPaid || 0) + amount
    };

    onCollection(newCollection, updatedCustomer);
    setCollectAmount('');
    setCollectNote('');
  };

  const activeCustomer = customers.find(c => c.id === showProfile);

  const getCustomerRankInfo = (lifetimeSpent: number) => {
    const sortedRanks = [...(rankConfigs || [])].sort((a, b) => a.minAmount - b.minAmount);
    let current = sortedRanks[0] || { id: 'default', name: 'Bronze', minAmount: 0, level: 1 };
    let next = sortedRanks[1] || null;

    for (let i = sortedRanks.length - 1; i >= 0; i--) {
      if (lifetimeSpent >= sortedRanks[i].minAmount) {
        current = sortedRanks[i];
        next = sortedRanks[i + 1] || null;
        break;
      }
    }

    const colors = RANK_COLORS[current.name] || RANK_COLORS['Bronze'];
    const progressToNext = next ? Math.min(100, Math.round((lifetimeSpent / next.minAmount) * 100)) : 100;

    return { 
      current: { ...current, ...colors, icon: RANK_ICONS[current.name] || Medal },
      next,
      progressToNext
    };
  };

  const customerSales = useMemo(() => {
    if (!activeCustomer) return [];
    return sales
      .filter(s => s && s.customerId === activeCustomer.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activeCustomer, sales]);

  const profileStats = useMemo(() => {
    if (!activeCustomer) return { monthly: 0, yearly: 0, lifetime: 0 };
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7);
    const currentYear = today.toISOString().substring(0, 4);
    
    return {
      monthly: customerSales.filter(s => s.date.startsWith(currentMonth)).reduce((sum, s) => sum + s.total, 0),
      yearly: customerSales.filter(s => s.date.startsWith(currentYear)).reduce((sum, s) => sum + s.total, 0),
      lifetime: activeCustomer.totalPurchase || 0
    };
  }, [activeCustomer, customerSales]);

  const targetProgress = useMemo(() => {
    if (!activeCustomer) return { m: 0, y: 0, l: 0 };
    const t = activeCustomer.targets || { monthly: 10000, yearly: 100000, lifetime: 500000 };
    return {
      m: Math.min(100, Math.round((profileStats.monthly / (t.monthly || 1)) * 100)),
      y: Math.min(100, Math.round((profileStats.yearly / (t.yearly || 1)) * 100)),
      l: Math.min(100, Math.round((profileStats.lifetime / (t.lifetime || 1)) * 100))
    };
  }, [activeCustomer, profileStats]);

  const handlePrintSale = (sale: Sale) => {
    setSelectedSaleForPrint(sale);
    setShowInvoicePreview(true);
  };

  const handlePrintAction = () => {
    const printContent = document.getElementById('history-printable-receipt');
    if (!printContent) return;
    const WinPrint = window.open('', '', 'width=900,height=800');
    if (WinPrint) {
      WinPrint.document.write('<html><head><title>Invoice</title><style>@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap"); body { font-family: "Inter", sans-serif; padding: 40px; color: #1e293b; background: white; } .invoice-container { max-width: 800px; margin: 0 auto; }</style></head><body>');
      WinPrint.document.write('<div class="invoice-container">');
      WinPrint.document.write(printContent.innerHTML);
      WinPrint.document.write('</div></body></html>');
      WinPrint.document.close();
      WinPrint.focus();
      setTimeout(() => { WinPrint.print(); WinPrint.close(); }, 500);
    }
  };

  const handleDownloadInvoice = () => {
    // Try to find the element in the preview first
    const previewElement = document.getElementById('history-printable-receipt');
    const hiddenElement = document.getElementById('hidden-download-invoice');
    
    // Prioritize the preview if it exists, otherwise use the hidden one
    const element = previewElement || hiddenElement;

    if (!element) {
      console.warn('Invoice content not ready for download. Retrying...');
      return;
    }

    const opt = {
      margin: 10,
      filename: `Invoice_${selectedSaleForPrint?.invoiceNo || 'Sale'}.pdf`,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Customer CRM</h2>
          <p className="text-slate-600 font-bold text-sm mt-1">টার্গেট ও পদবি ব্যবস্থাপনা।</p>
        </div>
        {canAddNew && (
          <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-primary text-white px-8 py-3.5 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary/20 font-black text-sm active-scale transition-all w-full sm:w-auto justify-center">
            <Plus size={20}/> নতুন কাস্টমার
          </button>
        )}
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none"><Search className="text-slate-500 group-focus-within:text-primary transition-colors" size={20} /></div>
        <input type="text" placeholder="নাম বা মোবাইল দিয়ে খুঁজুন..." className="w-full pl-14 pr-6 py-4.5 border-2 rounded-[28px] focus:ring-4 focus:ring-primary/5 outline-none font-black shadow-sm transition-all border-slate-200 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
        {/* Hidden Invoice Content for Instant Download */}
        <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', pointerEvents: 'none' }}>
           {selectedSaleForPrint && (
             <InvoiceContent 
               sale={selectedSaleForPrint} 
               customer={activeCustomer || customers.find(c => c.id === selectedSaleForPrint.customerId)} 
               shopSettings={shopSettings}
               id="hidden-download-invoice"
             />
           )}
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 text-slate-600 font-black text-[11px] uppercase tracking-[2px] border-b-2">
              <tr>
                <th className="p-6">কাস্টমার</th>
                <th className="p-6">টাইপ / পদবি</th>
                <th className="p-6 text-right">বাকি পরিমাণ</th>
                <th className="p-6 text-center">ম্যানেজ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayCustomers.map(c => {
                const { current: r } = getCustomerRankInfo(c.totalPurchase || 0);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-all group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[22px] flex items-center justify-center font-black text-xl shadow-sm border-2 ${r.bg} ${r.color} ${r.border} transition-transform group-hover:scale-110 shrink-0`}>
                          <r.icon size={26} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 text-base truncate tracking-tight uppercase">{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{c.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                           <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${c.type === 'retail' ? 'bg-blue-50 text-blue-600 border-blue-100' : c.type === 'wholesale' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {c.type}
                           </span>
                           <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border-2 ${r.bg} ${r.color} ${r.border}`}>
                              {r.name}
                           </span>
                        </div>
                        <div className="hidden sm:block w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                           <div className={`h-full ${r.bar}`} style={{ width: `${getCustomerRankInfo(c.totalPurchase || 0).progressToNext}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className={`font-black text-2xl tracking-tighter ${c.dueAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>৳{(c.dueAmount || 0).toLocaleString()}</div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setShowProfile(c.id)} className="p-3.5 text-primary bg-white border-2 border-primary/10 hover:bg-primary/5 rounded-2xl transition-all shadow-sm" title="Profile Viewer"><User size={20}/></button>
                        {canEditExisting && (
                          <>
                            <button onClick={() => { setEditingId(c.id); setFormData(c); setShowModal(true); }} className="p-3.5 text-blue-600 bg-white border-2 border-blue-100 hover:bg-blue-50 rounded-2xl transition-all shadow-sm" title="Edit Customer"><Edit size={20}/></button>
                            <button onClick={() => { if(window.confirm('কাস্টমারটি মুছে ফেলতে চান?')) { if(onDelete && c.id) onDelete(c.id); onUpdate(customers.filter(x => x.id !== c.id)); } }} className="p-3.5 text-rose-500 bg-white border-2 border-rose-100 hover:bg-rose-50 rounded-2xl transition-all shadow-sm" title="Delete Customer"><Trash2 size={20}/></button>
                          </>
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

      {showProfile && activeCustomer && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md z-[60] flex items-center justify-center p-0 sm:p-4 overflow-hidden modal-container">
          <div className="bg-white w-full h-full sm:max-w-7xl sm:max-h-[92vh] sm:rounded-[40px] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-300 modal-content-full">
            <div className="bg-primary p-6 sm:p-10 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10">
                <div className="flex items-center gap-6 w-full">
                  <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-[36px] flex items-center justify-center border-4 shadow-2xl backdrop-blur-md shrink-0 bg-white/20 border-white/30 text-white`}>
                    {React.createElement(getCustomerRankInfo(activeCustomer.totalPurchase || 0).current.icon, { size: 56 })}
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
                      <h2 className="text-2xl sm:text-5xl font-black tracking-tightest truncate uppercase">{activeCustomer.name}</h2>
                      <div className="flex gap-2">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-white/30 bg-white/10`}>
                          {activeCustomer.type}
                        </span>
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-white/30 bg-white/10`}>
                          {getCustomerRankInfo(activeCustomer.totalPurchase || 0).current.name} Rank
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-1 opacity-90 font-black text-sm mt-3 uppercase">
                      <span className="flex items-center gap-2"><Phone size={16}/> {activeCustomer.phone}</span>
                      <span className="flex items-center gap-2"><MapPin size={16}/> {activeCustomer.address || 'ঠিকানা নেই'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 w-full sm:w-auto absolute top-0 right-0 sm:static">
                  <button onClick={() => { setShowProfile(null); }} className="p-3 sm:p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border-2 border-white/20 active-scale m-4 sm:m-0"><X size={24} /></button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto sm:overflow-hidden flex flex-col md:flex-row bg-slate-50 custom-scrollbar">
              <aside className="w-full md:w-96 border-r-2 border-slate-200 p-6 sm:p-10 overflow-visible sm:overflow-y-auto space-y-6 sm:space-y-8 bg-white shrink-0 custom-scrollbar">
                <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px] border-b pb-2 mb-4">কাস্টমার টার্গেট</h3>
                <div className="bg-indigo-50 p-6 sm:p-7 rounded-[32px] sm:rounded-[40px] border-2 border-indigo-100 shadow-sm space-y-4">
                   <div className="flex justify-between items-center">
                      <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> মাসিক টার্গেট</div>
                      <span className="text-[10px] font-black text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-100">{targetProgress.m}%</span>
                   </div>
                   <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-indigo-100 shadow-inner">
                      <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${targetProgress.m}%` }}></div>
                   </div>
                   <div className="flex justify-between items-end">
                      <div className="text-xl sm:text-2xl font-black text-indigo-800 tracking-tightest">৳{profileStats.monthly.toLocaleString()}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase">লক্ষ্য: ৳{activeCustomer.targets?.monthly.toLocaleString()}</div>
                   </div>
                </div>
                <div className="bg-amber-50 p-6 sm:p-7 rounded-[32px] sm:rounded-[40px] border-2 border-amber-100 shadow-sm space-y-4">
                   <div className="flex justify-between items-center">
                      <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14}/> বার্ষিক টার্গেট</div>
                      <span className="text-[10px] font-black text-amber-700 bg-white px-3 py-1 rounded-lg border border-amber-100">{targetProgress.y}%</span>
                   </div>
                   <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-amber-100 shadow-inner">
                      <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${targetProgress.y}%` }}></div>
                   </div>
                   <div className="flex justify-between items-end">
                      <div className="text-xl sm:text-2xl font-black text-amber-800 tracking-tightest">৳{profileStats.yearly.toLocaleString()}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase">লক্ষ্য: ৳{activeCustomer.targets?.yearly.toLocaleString()}</div>
                   </div>
                </div>
                <div className="bg-emerald-50 p-6 sm:p-7 rounded-[32px] sm:rounded-[40px] border-2 border-emerald-100 shadow-sm space-y-4">
                   <div className="flex justify-between items-center">
                      <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2"><Zap size={14}/> লাইফটাইম টার্গেট</div>
                      <span className="text-[10px] font-black text-emerald-700 bg-white px-3 py-1 rounded-lg border border-emerald-100">{targetProgress.l}%</span>
                   </div>
                   <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-emerald-100 shadow-inner">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${targetProgress.l}%` }}></div>
                   </div>
                   <div className="flex justify-between items-end">
                      <div className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tightest">৳{profileStats.lifetime.toLocaleString()}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase">লক্ষ্য: ৳{activeCustomer.targets?.lifetime.toLocaleString()}</div>
                   </div>
                </div>
                <div className="bg-rose-50 p-6 sm:p-7 rounded-[32px] sm:rounded-[40px] border-2 border-rose-100 shadow-sm">
                   <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 flex items-center gap-2"><AlertCircle size={14}/> মোট বকেয়া</div>
                   <div className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tightest">৳{(activeCustomer.dueAmount || 0).toLocaleString()}</div>
                </div>
              </aside>

              <main className="flex-1 flex flex-col min-w-0 bg-white overflow-visible sm:overflow-hidden">
                <div className="p-6 sm:p-8 border-b-2 border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 sm:static z-20">
                   <div className="flex items-center gap-4">
                      <div className="bg-primary p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-white shadow-xl shadow-primary/20"><Trophy size={20} className="sm:w-6 sm:h-6"/></div>
                      <div>
                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">রিওয়ার্ড ও কেনাকাটার ইতিহাস</h3>
                        <p className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">অর্জিত পুরস্কার এবং আগের মেমোসমূহ</p>
                      </div>
                   </div>
                </div>
                <div className="flex-1 p-6 sm:p-12 overflow-visible sm:overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
                     <div className="space-y-6">
                        <h4 className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                           <Star size={18} className="text-amber-500"/> অর্জিত রিওয়ার্ড
                        </h4>
                        <div className="space-y-4">
                           {activeCustomer.rewards?.map((reward, i) => {
                             const getRewardStyle = (type: string) => {
                               switch (type) {
                                 case 'monthly': return { icon: <Calendar size={20} />, color: 'text-blue-500', bg: 'bg-blue-50' };
                                 case 'yearly': return { icon: <Award size={20} />, color: 'text-indigo-500', bg: 'bg-indigo-50' };
                                 case 'lifetime': return { icon: <ShieldCheck size={20} />, color: 'text-amber-500', bg: 'bg-amber-50' };
                                 case 'lucky': return { icon: <Sparkles size={20} />, color: 'text-purple-500', bg: 'bg-purple-50' };
                                 case 'milestone': return { icon: <TrendingUp size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-50' };
                                 default: return { icon: <Gift size={20} />, color: 'text-amber-500', bg: 'bg-amber-50' };
                               }
                             };
                             const style = getRewardStyle(reward.type);
                             return (
                               <div key={reward.id || i} className="bg-slate-50 p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] border-2 border-slate-100 flex items-center gap-4 sm:gap-5 group hover:border-primary/20 transition-all">
                                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${style.bg} ${style.color} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm border border-current/10 shrink-0`}>
                                     {style.icon}
                                  </div>
                                  <div className="flex-1">
                                     <div className="text-xs font-black text-slate-800 uppercase leading-tight">{reward.description}</div>
                                     <div className="text-[10px] font-black text-slate-400 uppercase mt-1">{reward.date} • {reward.type} Reward</div>
                                  </div>
                               </div>
                             );
                           })}
                           {(!activeCustomer.rewards || activeCustomer.rewards.length === 0) && (
                              <div className="p-8 sm:p-10 text-center bg-slate-50 rounded-[28px] sm:rounded-[32px] border-2 border-dashed border-slate-200">
                                 <Gift size={32} className="mx-auto text-slate-200 mb-4"/>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">এখনো কোনো রিওয়ার্ড অর্জিত হয়নি</p>
                              </div>
                           )}
                        </div>
                     </div>
                     <div className="space-y-6">
                        <h4 className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                           <TrendingUp size={18} className="text-indigo-500"/> পরবর্তী পদবি অর্জন
                        </h4>
                        {getCustomerRankInfo(activeCustomer.totalPurchase || 0).next ? (
                           <div className="bg-indigo-600 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden group">
                              <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                              <div className="flex items-center gap-4 sm:gap-5 relative z-10 mb-6">
                                 <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                                    {React.createElement(RANK_ICONS[getCustomerRankInfo(activeCustomer.totalPurchase || 0).next!.name] || Medal, { size: 32 })}
                                 </div>
                                 <div>
                                    <div className="text-xl sm:text-2xl font-black tracking-tightest uppercase">{getCustomerRankInfo(activeCustomer.totalPurchase || 0).next!.name} Rank</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Next Achievement</div>
                                 </div>
                              </div>
                              <div className="space-y-3 relative z-10">
                                 <div className="flex justify-between text-[10px] sm:text-[11px] font-black uppercase tracking-widest">
                                    <span>প্রগতি (Progress)</span>
                                    <span>৳{(getCustomerRankInfo(activeCustomer.totalPurchase || 0).next!.minAmount - (activeCustomer.totalPurchase || 0)).toLocaleString()} বাকি</span>
                                 </div>
                                 <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden border border-white/10">
                                    <div className="h-full bg-white transition-all duration-1000" style={{ width: `${getCustomerRankInfo(activeCustomer.totalPurchase || 0).progressToNext}%` }}></div>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div className="bg-emerald-600 p-8 sm:p-10 rounded-[32px] sm:rounded-[40px] text-white shadow-2xl text-center">
                              <Crown size={40} className="mx-auto mb-4"/>
                              <div className="text-xl sm:text-2xl font-black uppercase">সর্বোচ্চ পদবি!</div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-2">আপনি ডায়মন্ড মেম্বারশিপ অর্জন করেছেন</p>
                           </div>
                        )}
                     </div>
                  </div>
                  <div className="space-y-6 mb-12">
                     <h4 className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <ShoppingBag size={18} className="text-primary"/> ক্রয় ইতিহাস (Purchase History)
                     </h4>
                     <div className="space-y-3">
                        {customerSales.map((sale, i) => (
                           <div key={sale.id} className="bg-white p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] border-2 border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 group hover:border-primary/20 transition-all shadow-sm">
                              <div className="flex items-center gap-4 w-full sm:w-auto">
                                 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 text-slate-400 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border border-slate-100"><Receipt size={20}/></div>
                                 <div>
                                    <div className="text-xs font-black text-slate-800 uppercase tracking-tight">ইনভয়েস: #{sale.invoiceNo}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase mt-1 flex items-center gap-2">
                                       <Calendar size={12}/> {sale.date} • {sale.items.length}টি পণ্য
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                 <div className="text-right flex items-center gap-6">
                                    <div>
                                       <p className="text-[9px] font-black text-slate-400 uppercase">মোট বিল</p>
                                       <p className="text-sm sm:text-base font-black text-slate-900">৳{sale.total.toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                       <button 
                                         onClick={() => handlePrintSale(sale)}
                                         className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100 active-scale"
                                         title="Preview & Print"
                                       >
                                          <Eye size={18}/>
                                       </button>
                                       <button 
                                         onClick={() => { setSelectedSaleForPrint(sale); setTimeout(handleDownloadInvoice, 300); }}
                                         className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100 active-scale"
                                         title="Instant Download"
                                       >
                                          <Download size={18}/>
                                       </button>
                                    </div>
                                 </div>
                                 <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 ${sale.due > 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                    {sale.due > 0 ? `বাকি ৳${sale.due}` : 'PAID'}
                                 </span>
                              </div>
                           </div>
                        ))}
                        {customerSales.length === 0 && (
                           <div className="p-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                              <FileText size={32} className="mx-auto text-slate-200 mb-4"/>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">এখনো কোনো কেনাকাটার ইতিহাস নেই</p>
                           </div>
                        )}
                     </div>
                  </div>
                  <div className="h-20 sm:hidden"></div>
                </div>
              </main>
            </div>
          </div>
        </div>
      )}

      {showInvoicePreview && selectedSaleForPrint && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[150] flex items-center justify-center p-0 sm:p-6 overflow-hidden">
           <div className="bg-slate-100 w-full h-full sm:max-w-4xl sm:max-h-[95vh] sm:rounded-[40px] flex flex-col shadow-3xl animate-in zoom-in duration-300 overflow-hidden">
              <div className="bg-white p-6 border-b-2 border-slate-200 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2.5 rounded-xl text-primary"><FileText size={24}/></div>
                    <div>
                       <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Invoice Preview</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale Record for {activeCustomer?.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowInvoicePreview(false)} className="p-3 text-slate-400 hover:text-rose-600 active:scale-95 transition-all"><X size={32}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar flex justify-center bg-slate-200/50">
                 <InvoiceContent 
                   sale={selectedSaleForPrint} 
                   customer={activeCustomer} 
                   shopSettings={shopSettings}
                   id="history-printable-receipt"
                 />
              </div>
              <div className="p-6 bg-white border-t-2 border-slate-200 flex flex-wrap justify-end gap-3 shrink-0">
                 <button onClick={() => setShowInvoicePreview(false)} className="bg-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active-scale">Close Preview</button>
                 <button onClick={handleDownloadInvoice} className="bg-emerald-50 text-emerald-600 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-3 transition-all active-scale border-2 border-emerald-100"><Download size={18}/> Download PDF</button>
                 <button onClick={handlePrintAction} className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all active-scale"><Printer size={18}/> Print Invoice</button>
              </div>
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden modal-container">
          <div className="bg-white rounded-none sm:rounded-[48px] w-full h-full sm:max-w-3xl sm:max-h-[92vh] p-8 sm:p-12 shadow-2xl animate-in zoom-in duration-300 border-2 border-white/20 modal-content-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-10 shrink-0">
               <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-4">
                  <div className="bg-primary p-3 rounded-2xl text-white shadow-lg"><Users size={24}/></div>
                  {editingId ? 'প্রোফাইল আপডেট' : 'নতুন কাস্টমার ও টার্গেট'}
               </h3>
               <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-600 transition-colors"><X size={36}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">পূর্ণ নাম</label>
                  <input required className="w-full border-2 border-slate-200 rounded-2xl p-4.5 font-black text-sm bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="নাম লিখুন" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">মোবাইল নম্বর</label>
                  <input required className="w-full border-2 border-slate-200 rounded-2xl p-4.5 font-black text-sm bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="01XXX-XXXXXX" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">যোগদানের তারিখ</label>
                  <input type="date" required className="w-full border-2 border-slate-200 rounded-2xl p-4.5 font-black text-sm bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" value={formData.dateAdded?.split('T')[0]} onChange={e => setFormData({...formData, dateAdded: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">কাস্টমার ধরন</label>
                  <select className="w-full border-2 border-slate-200 rounded-2xl p-4.5 bg-slate-50 font-black text-sm outline-none focus:bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="retail">খুচরা (Retail)</option>
                    <option value="wholesale">পাইকারি (Wholesale)</option>
                    <option value="distributor">ডিস্ট্রিবিউটর (Distributor)</option>
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border-2 border-slate-100 space-y-6">
                 <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4"><Target size={16} className="text-indigo-500"/> কেনাকাটার টার্গেট নির্ধারণ</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">মাসিক টার্গেট (৳)</label>
                      <input type="number" className="w-full border-2 border-slate-200 rounded-2xl p-4 font-black text-base bg-white outline-none" value={formData.targets?.monthly} onChange={e => setFormData({...formData, targets: {...(formData.targets || {monthly:0, yearly:0, lifetime:0}), monthly: parseFloat(e.target.value) || 0}})} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">বার্ষিক টার্গেট (৳)</label>
                      <input type="number" className="w-full border-2 border-slate-200 rounded-2xl p-4 font-black text-base bg-white outline-none" value={formData.targets?.yearly} onChange={e => setFormData({...formData, targets: {...(formData.targets || {monthly:0, yearly:0, lifetime:0}), yearly: parseFloat(e.target.value) || 0}})} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">লাইফটাইম টার্গেট (৳)</label>
                      <input type="number" className="w-full border-2 border-slate-200 rounded-2xl p-4 font-black text-base bg-white outline-none" value={formData.targets?.lifetime} onChange={e => setFormData({...formData, targets: {...(formData.targets || {monthly:0, yearly:0, lifetime:0}), lifetime: parseFloat(e.target.value) || 0}})} />
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">পূর্বের বাকি টাকা</label>
                  <input type="number" className="w-full border-2 border-slate-200 rounded-2xl p-4.5 bg-slate-50 font-black text-sm outline-none" value={formData.dueAmount} onChange={e => setFormData({...formData, dueAmount: parseFloat(e.target.value) || 0})} placeholder="0" />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-6 rounded-[28px] font-black shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs transition-all active-scale mt-4">
                <Save size={24}/> কাস্টমার তথ্য সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;