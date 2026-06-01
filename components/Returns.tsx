
import React, { useState, useMemo } from 'react';
import { ProductReturn, Sale, Product } from '../types';
import { RotateCcw, Plus, Search, Package, Trash2, X, AlertTriangle } from 'lucide-react';

interface ReturnsProps {
  returns: ProductReturn[];
  sales: Sale[];
  products: Product[];
  onAddReturn: (ret: ProductReturn) => void;
}

const Returns: React.FC<ReturnsProps> = ({ returns, sales, products, onAddReturn }) => {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState<Partial<ProductReturn>>({
    productId: '',
    quantity: 1,
    reason: '',
    type: 'return'
  });

  const filteredReturns = returns.filter(r => r.productName.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === formData.productId);
    if (!product) return;

    const newReturn: ProductReturn = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      quantity: Number(formData.quantity) || 1,
      amount: product.salePrice * (Number(formData.quantity) || 1),
      reason: formData.reason || '',
      type: formData.type as any,
      date: formData.date || new Date().toISOString().split('T')[0],
      staffName: 'Admin'
    };

    onAddReturn(newReturn);
    setShowModal(false);
    setFormData({ productId: '', quantity: 1, reason: '', type: 'return' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Returns & Damage</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Track faulty items and product returns.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary text-white px-8 py-3.5 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary/20 font-black text-sm active:scale-95 transition-all">
          <Plus size={20}/> LOG RETURN
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-4 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search return records..." 
          className="w-full pl-14 pr-6 py-4 border rounded-3xl outline-none font-bold shadow-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[2px] border-b">
            <tr>
              <th className="p-6">Product</th>
              <th className="p-6">Type</th>
              <th className="p-6 text-center">Qty</th>
              <th className="p-6">Reason</th>
              <th className="p-6 text-right">Refund Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReturns.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-6">
                  <div className="font-black text-slate-800 text-xs">{r.productName}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">{r.date}</div>
                </td>
                <td className="p-6">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${r.type === 'damage' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                    {r.type}
                  </span>
                </td>
                <td className="p-6 text-center font-black">{r.quantity}</td>
                <td className="p-6 text-[10px] font-bold text-slate-500">{r.reason}</td>
                <td className="p-6 text-right font-black text-primary">৳{r.amount.toLocaleString()}</td>
              </tr>
            ))}
            {filteredReturns.length === 0 && (
              <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[4px]">No return records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black uppercase">Add Return Record</h3>
                <button onClick={() => setShowModal(false)}><X /></button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Product</label>
                   <select required className="w-full border rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}>
                      <option value="">Select Item</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Quantity</label>
                    <input type="number" required className="w-full border rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Date</label>
                    <input type="date" required className="w-full border rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none" value={formData.date || new Date().toISOString().split('T')[0]} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Type</label>
                  <select className="w-full border rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                     <option value="return">Customer Return</option>
                     <option value="damage">Shop Damage</option>
                  </select>
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Reason / Details</label>
                   <textarea className="w-full border rounded-2xl p-4 font-bold text-sm bg-slate-50 outline-none" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} rows={2} placeholder="Faulty item, size change, etc." />
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 mb-4">
                   <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                   <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed">This will increase your inventory stock automatically.</p>
                </div>

                <button type="submit" className="w-full bg-primary text-white py-5 rounded-[26px] font-black uppercase text-xs tracking-widest shadow-xl">Confirm & Save</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;
