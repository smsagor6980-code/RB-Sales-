
import React, { useMemo, useState } from 'react';
import { Sale, Product, Customer } from '../types';
import { ClipboardCheck, Check, X, Eye, User, ShoppingBag, Clock, ShieldAlert } from 'lucide-react';

interface OrderApprovalsProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  onUpdateSales: (sales: Sale[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
  isAdmin: boolean;
}

const OrderApprovals: React.FC<OrderApprovalsProps> = ({ sales, products, customers, onUpdateSales, onUpdateProducts, onUpdateCustomers, isAdmin }) => {
  const [viewOrder, setViewOrder] = useState<Sale | null>(null);

  const pendingOrders = useMemo(() => {
    return sales
      .filter(s => s.status === 'pending')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [sales]);

  const handleApprove = (order: Sale) => {
    if (!isAdmin) return;

    // Check stock availability
    for (const item of order.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        alert(`পণ্য "${item.productName}" এর পর্যাপ্ত স্টক নেই।`);
        return;
      }
    }

    // Deduct stock
    const updatedProducts = products.map(p => {
      const item = order.items.find(i => i.productId === p.id);
      return item ? { ...p, stock: p.stock - item.quantity } : p;
    });

    // Update Customer Due
    const updatedCustomers = customers.map(c => {
      if (c.id === order.customerId) {
        return {
          ...c,
          dueAmount: (c.dueAmount || 0) + order.due,
          totalPurchase: (c.totalPurchase || 0) + order.total,
          totalPaid: (c.totalPaid || 0) + order.paid,
          lastPurchaseDate: order.date
        };
      }
      return c;
    });

    // Update Sale Status
    const updatedSales = sales.map(s => s.id === order.id ? { ...s, status: 'approved' as const } : s);

    onUpdateProducts(updatedProducts);
    onUpdateCustomers(updatedCustomers);
    onUpdateSales(updatedSales);
    setViewOrder(null);
  };

  const handleReject = (order: Sale) => {
    if (!isAdmin) return;
    if (confirm('অর্ডারটি বাতিল করতে চান?')) {
      const updatedSales = sales.map(s => s.id === order.id ? { ...s, status: 'cancelled' as const } : s);
      onUpdateSales(updatedSales);
      setViewOrder(null);
    }
  };

  if (!isAdmin) return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
      <ShieldAlert size={64} className="mb-4 opacity-20" />
      <p className="font-black uppercase tracking-widest text-xs">অ্যাক্সেস অনুমোদিত নয়</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Order Approvals</h2>
        <p className="text-slate-500 font-medium text-sm mt-1">Review and approve orders from Sales Officers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingOrders.map(order => (
          <div key={order.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Pending Approval</div>
              <span className="text-[10px] font-black text-slate-400 uppercase">#{order.invoiceNo}</span>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-primary"><User size={20}/></div>
                <div>
                  <div className="text-xs font-black text-slate-800 uppercase">{customers.find(c => c.id === order.customerId)?.name || 'Guest'}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Sold by: {order.soldBy}</div>
                </div>
              </div>
              <div className="text-2xl font-black text-primary">৳{order.total.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">{order.items.length} Items • {order.date}</div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setViewOrder(order)} className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100">View Details</button>
              <button onClick={() => handleApprove(order)} className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Approve</button>
            </div>
          </div>
        ))}
        {pendingOrders.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <ClipboardCheck size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No pending orders to approve</p>
          </div>
        )}
      </div>

      {viewOrder && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-black uppercase">Order Summary</h3>
              <button onClick={() => setViewOrder(null)}><X /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
              {viewOrder.items.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                  <div>
                    <div className="text-xs font-black uppercase">{item.productName}</div>
                    <div className="text-[10px] text-slate-400">৳{item.unitPrice} x {item.quantity}</div>
                  </div>
                  <div className="font-black text-xs">৳{item.total}</div>
                </div>
              ))}
              <div className="p-4 bg-primary text-white rounded-2xl">
                 <div className="flex justify-between text-[10px] uppercase font-bold opacity-60"><span>Subtotal</span><span>৳{viewOrder.subTotal}</span></div>
                 <div className="flex justify-between text-lg font-black mt-1"><span>Total Payable</span><span>৳{viewOrder.total}</span></div>
              </div>
            </div>

            <div className="flex gap-3 shrink-0">
              <button onClick={() => handleReject(viewOrder)} className="flex-1 bg-rose-50 text-rose-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Reject Order</button>
              <button onClick={() => handleApprove(viewOrder)} className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Approve Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderApprovals;
