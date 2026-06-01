import React from 'react';
import { Sale, Customer } from '../types';
import { Building2 } from 'lucide-react';

interface InvoiceContentProps {
  sale: Sale;
  customer?: Customer | null;
  shopSettings: any;
  id?: string;
}

const InvoiceContent: React.FC<InvoiceContentProps> = ({ sale, customer, shopSettings, id = 'printable-receipt' }) => {
  return (
    <div id={id} className="w-full max-w-[800px] p-8 sm:p-14 min-h-[1000px] relative flex flex-col border" style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#1e293b' }}>
      <div className="border-b-4 pb-10 mb-10 text-center" style={{ borderBottomColor: '#1e1e5f' }}>
          <div className="mb-6">
            <h2 className="text-3xl font-black uppercase tracking-[8px] mb-2" style={{ color: '#1e1e5f' }}>RB SHAD FOOD PRODUCT LTD</h2>
            <div className="h-1 w-64 bg-slate-100 mx-auto rounded-full overflow-hidden">
                <div className="h-full w-1/2" style={{ backgroundColor: '#1e1e5f' }}></div>
            </div>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="text-left space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#1e1e5f', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={28} color="#ffffff" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tighter leading-none" style={{ color: '#1e1e5f', margin: 0 }}>{shopSettings.name}</h1>
              </div>
              <div className="pl-1">
                <p className="text-[11px] font-black uppercase tracking-[5px]" style={{ color: '#64748b', margin: '4px 0 2px 0' }}>{shopSettings.address}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8', margin: 0 }}>
                  <span className="font-black" style={{ color: '#1e1e5f' }}>HOTLINE:</span> {shopSettings.phone} <span className="mx-2 opacity-30">|</span> <span className="font-black" style={{ color: '#1e1e5f' }}>EMAIL:</span> {shopSettings.email}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="relative inline-block">
                <h2 className="text-5xl font-black uppercase opacity-5 select-none" style={{ color: '#1e1e5f', margin: '0 0 4px 0', lineHeight: '0.8', letterSpacing: '-2px' }}>INVOICE</h2>
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -rotate-3"></div>
              </div>
              <p className="text-lg font-black tracking-tight" style={{ color: '#0f172a', margin: '4px 0 0 0' }}>INVOICE NO: <span style={{ color: '#1e1e5f' }}>#{sale.invoiceNo}</span></p>
            </div>
          </div>
      </div>
      
      <div className="flex justify-between gap-12 mb-10">
          <div className="p-6 rounded-[24px] border" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9', flex: 1 }}>
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 border-b pb-1" style={{ color: '#1e1e5f', borderBottomColor: '#e2e8f0' }}>Billing To:</h4>
            <p className="text-lg font-black uppercase" style={{ color: '#0f172a', margin: 0 }}>{customer?.name || 'Cash Customer'}</p>
            <p className="text-xs font-bold uppercase" style={{ color: '#64748b', margin: '4px 0 0 0' }}>{customer?.phone || 'N/A'}</p>
          </div>
          <div className="text-right flex flex-col justify-center pr-4" style={{ flex: 1 }}>
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-black uppercase">
                  <span style={{ color: '#94a3b8' }}>Issue Date:</span> 
                  <span style={{ color: '#0f172a' }}>{sale.date}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black uppercase">
                  <span style={{ color: '#94a3b8' }}>Payment:</span> 
                  <span style={{ color: '#10b981' }}>{sale.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black uppercase">
                  <span style={{ color: '#94a3b8' }}>Issued By:</span> 
                  <span style={{ color: '#0f172a' }}>{sale.soldBy}</span>
                </div>
            </div>
          </div>
      </div>

      <div className="flex-1">
          <table className="w-full text-left" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
                <tr style={{ backgroundColor: '#1e1e5f', color: '#ffffff' }}>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest" style={{ color: '#ffffff' }}>Item Description</th>
                  <th className="p-4 text-[10px] font-black text-center uppercase tracking-widest" style={{ color: '#ffffff', textAlign: 'center' }}>Qty</th>
                  <th className="p-4 text-[10px] font-black text-right uppercase tracking-widest" style={{ color: '#ffffff', textAlign: 'right' }}>Unit Price</th>
                  <th className="p-4 text-[10px] font-black text-right uppercase tracking-widest" style={{ color: '#ffffff', textAlign: 'right' }}>Amount</th>
                </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid #f1f5f9' }}>
                {sale.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="p-4 text-xs font-black uppercase" style={{ color: '#475569' }}>{item.productName}</td>
                    <td className="p-4 text-center text-xs font-black" style={{ color: '#0f172a', textAlign: 'center' }}>{item.quantity}</td>
                    <td className="p-4 text-right text-xs font-black" style={{ color: '#64748b', textAlign: 'right' }}>৳{item.unitPrice}</td>
                    <td className="p-4 text-right text-xs font-black" style={{ color: '#0f172a', textAlign: 'right' }}>৳{item.total}</td>
                  </tr>
                ))}
            </tbody>
          </table>
      </div>

      <div className="mt-10 pt-10 border-t-2 flex justify-end" style={{ borderTopColor: '#f1f5f9' }}>
          <div className="w-[300px] space-y-3">
            <div className="flex justify-between items-center text-xs font-black uppercase">
              <span style={{ color: '#94a3b8' }}>Sub-Total:</span> 
              <span style={{ color: '#0f172a' }}>৳{sale.subTotal}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-black uppercase">
              <span style={{ color: '#f43f5e' }}>Discount:</span> 
              <span style={{ color: '#f43f5e' }}>-৳{sale.discount}</span>
            </div>
            <div className="pt-4 border-t-4 flex justify-between items-center" style={{ borderTopColor: '#1e1e5f' }}>
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#1e1e5f' }}>Net Payable:</span>
                <span className="text-2xl font-black" style={{ color: '#1e1e5f' }}>৳{sale.total}</span>
            </div>
            <div className="pt-2 flex justify-between items-center text-xs font-black uppercase">
              <span style={{ color: '#94a3b8' }}>Received:</span> 
              <span style={{ color: '#10b981' }}>৳{sale.paid}</span>
            </div>
            {sale.due > 0 && (
              <div className="flex justify-between items-center text-xs font-black uppercase italic">
                <span style={{ color: '#e11d48' }}>Outstanding Due:</span> 
                <span style={{ color: '#e11d48' }}>৳{sale.due}</span>
              </div>
            )}
          </div>
      </div>

      <div className="mt-20 flex justify-between items-end">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border max-w-[450px]" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
                <p className="text-[9px] font-black uppercase mb-1" style={{ color: '#94a3b8' }}>Terms & Conditions:</p>
                <p className="text-[8px] font-bold uppercase leading-relaxed" style={{ color: '#64748b' }}>১. বিক্রীত মাল ফেরত নেওয়া হয় না। ২. কোনো সমস্যা থাকলে বিক্রয় রশিদসহ ৩ দিনের মধ্যে যোগাযোগ করুন। ৩. ক্যাশ পেমেন্ট এর ক্ষেত্রে রশিদ সংগ্রহ করুন।</p>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[3px]" style={{ color: '#cbd5e1' }}>Generated via REST BAZER System</p>
          </div>
          <div className="text-center space-y-2 w-48">
            <div className="border-t-2 pt-2" style={{ borderTopColor: '#cbd5e1' }}>
                <span className="text-[10px] font-black uppercase" style={{ color: '#0f172a' }}>Authorized Signature</span>
            </div>
          </div>
      </div>
    </div>
  );
};

export default InvoiceContent;
