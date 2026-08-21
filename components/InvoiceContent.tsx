import React from 'react';
import { Sale, Customer, UndeliveredItemSummary } from '../types';
import { Building2, PackageX, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface InvoiceContentProps {
  sale: Sale;
  customer?: Customer | null;
  shopSettings: any;
  id?: string;
}

const InvoiceContent: React.FC<InvoiceContentProps> = ({ sale, customer, shopSettings, id = 'printable-receipt' }) => {
  // Aggregate undelivered items list
  const undeliveredList: UndeliveredItemSummary[] = [];

  if (sale.undeliveredItems && sale.undeliveredItems.length > 0) {
    undeliveredList.push(...sale.undeliveredItems);
  } else if (sale.items && sale.items.length > 0) {
    sale.items.forEach(item => {
      const ordQty = item.orderedQuantity !== undefined 
        ? item.orderedQuantity 
        : (item.deliveredQuantity !== undefined && item.undeliveredQuantity !== undefined 
            ? (item.deliveredQuantity + item.undeliveredQuantity) 
            : item.quantity);
      const delQty = item.deliveredQuantity !== undefined ? item.deliveredQuantity : item.quantity;
      const undelQty = item.undeliveredQuantity !== undefined ? item.undeliveredQuantity : Math.max(0, ordQty - delQty);

      if (undelQty > 0 || item.deliveryStatus === 'undelivered') {
        undeliveredList.push({
          productId: item.productId,
          productName: item.productName || (item as any).name || 'Unknown Product',
          orderedQuantity: ordQty,
          deliveredQuantity: delQty,
          undeliveredQuantity: undelQty > 0 ? undelQty : (ordQty - delQty),
          unitPrice: item.unitPrice || (item as any).price || 0,
          total: (undelQty > 0 ? undelQty : (ordQty - delQty)) * (item.unitPrice || (item as any).price || 0),
          shortageReason: item.shortageReason || sale.undeliveredReason
        });
      }
    });
  }

  const totalUndeliveredCount = undeliveredList.reduce((sum, item) => sum + (Number(item.undeliveredQuantity) || 0), 0);
  const totalUndeliveredAmount = undeliveredList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const hasUndelivered = totalUndeliveredCount > 0 || sale.deliveryStatus === 'partial' || sale.deliveryStatus === 'undelivered' || sale.isUndeliveredChallan;

  return (
    <div id={id} className="w-full max-w-[800px] p-8 sm:p-14 min-h-[1000px] relative flex flex-col border" style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#1e293b' }}>
      <div className="border-b-4 pb-10 mb-8 text-center" style={{ borderBottomColor: '#1e1e5f' }}>
          <div className="mb-6">
            <h2 className="text-3xl font-black uppercase tracking-[8px] mb-2" style={{ color: '#1e1e5f' }}>{shopSettings?.name || 'RB SHAD FOOD PRODUCT LTD'}</h2>
            <div className="h-1 w-64 bg-slate-100 mx-auto rounded-full overflow-hidden">
                <div className="h-full w-1/2" style={{ backgroundColor: '#1e1e5f' }}></div>
            </div>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="text-left space-y-4">
              <div className="flex items-center gap-4">
                {shopSettings?.logoUrl ? (
                  <div className="h-12 max-w-[130px] p-1 rounded-xl flex items-center justify-center border border-slate-200 bg-white">
                    <img 
                      src={shopSettings.logoUrl} 
                      alt={shopSettings?.name || 'Logo'} 
                      className="max-h-full w-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#1e1e5f', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={28} color="#ffffff" strokeWidth={2.5} />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-tighter leading-none" style={{ color: '#1e1e5f', margin: 0 }}>
                    {shopSettings?.headerTitle || shopSettings?.name || 'RB SHAD FOOD PRODUCT LTD'}
                  </h1>
                  {shopSettings?.headerSubtitle && (
                    <p className="text-[10px] font-bold text-slate-500 tracking-wider mt-0.5">
                      {shopSettings.headerSubtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="pl-1">
                <p className="text-[11px] font-black uppercase tracking-[5px]" style={{ color: '#64748b', margin: '4px 0 2px 0' }}>{shopSettings?.address || 'N/A'}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8', margin: 0 }}>
                  <span className="font-black" style={{ color: '#1e1e5f' }}>HOTLINE:</span> {shopSettings?.phone || 'N/A'} <span className="mx-2 opacity-30">|</span> <span className="font-black" style={{ color: '#1e1e5f' }}>EMAIL:</span> {shopSettings?.email || 'N/A'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="relative inline-block">
                <h2 className="text-5xl font-black uppercase opacity-5 select-none" style={{ color: '#1e1e5f', margin: '0 0 4px 0', lineHeight: '0.8', letterSpacing: '-2px' }}>
                  {sale.isUndeliveredChallan || sale.status === 'undelivered' || sale.invoiceNo.includes('UNDEL') ? 'UNDELIVERED' : 'INVOICE'}
                </h2>
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -rotate-3"></div>
              </div>
              <p className="text-lg font-black tracking-tight" style={{ color: '#0f172a', margin: '4px 0 0 0' }}>
                {sale.isUndeliveredChallan || sale.status === 'undelivered' || sale.invoiceNo.includes('UNDEL') ? 'অনডেলিভারী চালান NO:' : 'INVOICE NO:'} <span style={{ color: '#1e1e5f' }}>#{sale.invoiceNo}</span>
              </p>
              {sale.originalInvoiceNo && (
                <p className="text-[10px] font-black uppercase tracking-wider mt-1" style={{ color: '#d97706' }}>
                  মূল ইনভয়েস: #{sale.originalInvoiceNo}
                </p>
              )}
              {sale.undeliveredInvoiceNo && (
                <p className="text-[10px] font-black uppercase tracking-wider mt-1" style={{ color: '#e11d48' }}>
                  অনডেলিভারী চালান: #{sale.undeliveredInvoiceNo}
                </p>
              )}
            </div>
          </div>
      </div>
      
      <div className="flex justify-between gap-12 mb-8">
          <div className="p-6 rounded-[24px] border" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9', flex: 1 }}>
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 border-b pb-1" style={{ color: '#1e1e5f', borderBottomColor: '#e2e8f0' }}>Billing To:</h4>
            <p className="text-lg font-black uppercase" style={{ color: '#0f172a', margin: 0 }}>{customer?.name || sale.customerName || 'Cash Customer'}</p>
            <p className="text-xs font-bold uppercase" style={{ color: '#64748b', margin: '4px 0 0 0' }}>{customer?.phone || sale.customerPhone || 'N/A'}</p>
            {(customer?.address || sale.customerAddress) && (
              <p className="text-[10px] font-bold uppercase" style={{ color: '#94a3b8', margin: '2px 0 0 0' }}>{customer?.address || sale.customerAddress}</p>
            )}
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
                  <span style={{ color: '#0f172a' }}>{sale.soldBy || 'Admin'}</span>
                </div>
                {sale.vehicleNo && (
                  <div className="flex justify-between items-center text-xs font-black uppercase">
                    <span style={{ color: '#94a3b8' }}>গাড়ি/ট্রাক নং:</span> 
                    <span style={{ color: '#0f172a' }}>{sale.vehicleNo}</span>
                  </div>
                )}
                {sale.driverPhone && (
                  <div className="flex justify-between items-center text-xs font-black uppercase">
                    <span style={{ color: '#94a3b8' }}>ড্রাইভার ফোন:</span> 
                    <span style={{ color: '#0f172a' }}>{sale.driverPhone}</span>
                  </div>
                )}
            </div>
          </div>
      </div>

      <div className="flex-1">
          {/* Status Banner */}
          {(sale.isUndeliveredChallan || sale.status === 'undelivered' || sale.status === 'partial' || sale.deliveryStatus === 'undelivered' || sale.deliveryStatus === 'partial' || hasUndelivered) && (
            <div className="mb-4 p-4 rounded-2xl border" style={{ 
              backgroundColor: (sale.isUndeliveredChallan || sale.status === 'undelivered') ? '#fff1f2' : '#fefce8', 
              borderColor: (sale.isUndeliveredChallan || sale.status === 'undelivered') ? '#fecdd3' : '#fef08a' 
            }}>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="text-xs font-black uppercase flex items-center gap-1.5" style={{ color: (sale.isUndeliveredChallan || sale.status === 'undelivered') ? '#e11d48' : '#ca8a04' }}>
                  {(sale.isUndeliveredChallan || sale.status === 'undelivered') 
                    ? `⚠️ অনডেলিভারী চালান (স্টক ঘাটতির কারণে বকেয়া পণ্য চালান) ${sale.originalInvoiceNo ? `• মূল ইনভয়েস: #${sale.originalInvoiceNo}` : ''}`
                    : `📦 আংশিক ডেলিভারি সম্পন্ন (অনডেলিভারী পণ্য: ${totalUndeliveredCount}টি) ${sale.undeliveredInvoiceNo ? `• অনডেলিভারী চালান: #${sale.undeliveredInvoiceNo}` : ''}`}
                </span>
                {(sale.undeliveredNote || sale.undeliveredReason) && (
                  <span className="text-[10px] font-bold" style={{ color: '#475569' }}>
                    নোট: {sale.undeliveredNote || sale.undeliveredReason}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Main Delivered/Ordered Products Table */}
          <div className="mb-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider mb-2 flex items-center justify-between" style={{ color: '#1e1e5f' }}>
              <span>পণ্য ও ডেলিভারি বিবরণ (Items & Delivery Details)</span>
              <span className="text-[10px] font-bold text-slate-400">মোট আইটেম: {sale.items.length}টি</span>
            </h4>
          </div>

          <table className="w-full text-left" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
                <tr style={{ backgroundColor: '#1e1e5f', color: '#ffffff' }}>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest" style={{ color: '#ffffff' }}>Item Description</th>
                  <th className="p-3 text-[10px] font-black text-center uppercase tracking-widest" style={{ color: '#ffffff', textAlign: 'center' }}>অর্ডার</th>
                  <th className="p-3 text-[10px] font-black text-center uppercase tracking-widest" style={{ color: '#ffffff', textAlign: 'center' }}>ডেলিভারি</th>
                  <th className="p-3 text-[10px] font-black text-center uppercase tracking-widest" style={{ color: '#ffffff', textAlign: 'center' }}>অনডেলিভারী</th>
                  <th className="p-3 text-[10px] font-black text-right uppercase tracking-widest" style={{ color: '#ffffff', textAlign: 'right' }}>Unit Price</th>
                  <th className="p-3 text-[10px] font-black text-right uppercase tracking-widest" style={{ color: '#ffffff', textAlign: 'right' }}>Amount</th>
                </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid #f1f5f9' }}>
                {sale.items.map((item, idx) => {
                  const ordQty = item.orderedQuantity !== undefined 
                    ? item.orderedQuantity 
                    : (item.deliveredQuantity !== undefined && item.undeliveredQuantity !== undefined 
                        ? (item.deliveredQuantity + item.undeliveredQuantity) 
                        : item.quantity);
                  const deliveredQty = item.deliveredQuantity !== undefined ? item.deliveredQuantity : item.quantity;
                  const undeliveredQty = item.undeliveredQuantity !== undefined ? item.undeliveredQuantity : Math.max(0, ordQty - deliveredQty);
                  const isUndeliveredRow = undeliveredQty > 0 || item.deliveryStatus === 'undelivered';
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isUndeliveredRow ? (deliveredQty === 0 ? '#fff1f2' : '#fffbeb') : 'transparent' }}>
                      <td className="p-3 text-xs font-black uppercase" style={{ color: '#475569' }}>
                        <div>{item.productName || (item as any).name}</div>
                        {isUndeliveredRow && (
                          <div className="text-[9px] font-bold mt-0.5" style={{ color: deliveredQty === 0 ? '#e11d48' : '#d97706' }}>
                            {deliveredQty === 0 
                              ? `⚠️ সম্পূর্ণ অনডেলিভারী (${undeliveredQty}টি বাকি)` 
                              : `⚠️ আংশিক ডেলিভারি (অনডেলিভারী: ${undeliveredQty}টি)`}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center text-xs font-black" style={{ color: '#0f172a', textAlign: 'center' }}>{ordQty}</td>
                      <td className="p-3 text-center text-xs font-black" style={{ color: deliveredQty > 0 ? '#10b981' : '#94a3b8', textAlign: 'center' }}>
                        {deliveredQty}
                      </td>
                      <td className="p-3 text-center text-xs font-black" style={{ color: undeliveredQty > 0 ? '#e11d48' : '#94a3b8', textAlign: 'center' }}>
                        {undeliveredQty > 0 ? `${undeliveredQty}` : '-'}
                      </td>
                      <td className="p-3 text-right text-xs font-black" style={{ color: '#64748b', textAlign: 'right' }}>৳{item.unitPrice || (item as any).price}</td>
                      <td className="p-3 text-right text-xs font-black" style={{ color: '#0f172a', textAlign: 'right' }}>
                        ৳{item.total !== undefined ? item.total : ((item.unitPrice || (item as any).price || 0) * deliveredQty)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {/* DEDICATED UNDELIVERED PRODUCTS SECTION (অনডেলিভারী পণ্যের বিস্তারিত বক্স) */}
          {undeliveredList.length > 0 && !sale.isUndeliveredChallan && sale.status !== 'undelivered' && (
            <div className="mt-6 p-4 rounded-2xl border-2" style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3' }}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <PackageX size={18} color="#e11d48" />
                  <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: '#9f1239' }}>
                    অনডেলিভারী পণ্যের বিবরণ (Undelivered Products Summary)
                  </h4>
                </div>
                {sale.undeliveredInvoiceNo && (
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#ffffff', color: '#e11d48', border: '1px solid #fecdd3' }}>
                    চালান নং: #{sale.undeliveredInvoiceNo}
                  </span>
                )}
              </div>

              <table className="w-full text-left mb-2" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#ffe4e6', color: '#9f1239' }}>
                    <th className="p-2 font-black uppercase">পণ্যের নাম (Product)</th>
                    <th className="p-2 font-black text-center uppercase" style={{ textAlign: 'center' }}>অর্ডার</th>
                    <th className="p-2 font-black text-center uppercase" style={{ textAlign: 'center' }}>ডেলিভারি</th>
                    <th className="p-2 font-black text-center uppercase" style={{ textAlign: 'center' }}>বকেয়া/অনডেলিভারী</th>
                    <th className="p-2 font-black text-right uppercase" style={{ textAlign: 'right' }}>একক মূল্য</th>
                    <th className="p-2 font-black text-right uppercase" style={{ textAlign: 'right' }}>অনডেলিভারী মূল্য</th>
                  </tr>
                </thead>
                <tbody>
                  {undeliveredList.map((uItem, uIdx) => (
                    <tr key={uIdx} style={{ borderBottom: '1px solid #fecdd3' }}>
                      <td className="p-2 font-black uppercase" style={{ color: '#881337' }}>
                        {uItem.productName}
                      </td>
                      <td className="p-2 text-center font-bold" style={{ color: '#475569', textAlign: 'center' }}>
                        {uItem.orderedQuantity}
                      </td>
                      <td className="p-2 text-center font-bold" style={{ color: '#10b981', textAlign: 'center' }}>
                        {uItem.deliveredQuantity}
                      </td>
                      <td className="p-2 text-center font-black" style={{ color: '#e11d48', textAlign: 'center' }}>
                        {uItem.undeliveredQuantity} টি
                      </td>
                      <td className="p-2 text-right font-bold" style={{ color: '#64748b', textAlign: 'right' }}>
                        ৳{uItem.unitPrice}
                      </td>
                      <td className="p-2 text-right font-black" style={{ color: '#e11d48', textAlign: 'right' }}>
                        ৳{uItem.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-2 text-[10px] font-bold" style={{ color: '#9f1239', borderTop: '1px dashed #fecdd3' }}>
                <span>* উক্ত অনডেলিভারী পণ্যসমূহের স্টক ঘাটতি থাকায় পৃথক অনডেলিভারী চালান প্রস্তুত করা হয়েছে।</span>
                <span className="font-black">মোট অনডেলিভারী: {totalUndeliveredCount}টি | বকেয়া মূল্য: ৳{totalUndeliveredAmount}</span>
              </div>
            </div>
          )}
      </div>

      <div className="mt-8 pt-8 border-t-2 flex justify-between items-start" style={{ borderTopColor: '#f1f5f9' }}>
          <div className="text-xs space-y-1.5 max-w-[340px]">
            <p className="font-black uppercase tracking-wider text-[10px]" style={{ color: '#1e1e5f' }}>ডেলিভারি ও চালান সারসংক্ষেপ:</p>
            <div className="p-3 rounded-xl border space-y-1" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', fontSize: '11px' }}>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">মোট অর্ডারকৃত আইটেম:</span>
                <span className="font-black text-slate-800">{sale.items.reduce((s, i) => s + (i.orderedQuantity || (i.deliveredQuantity && i.undeliveredQuantity ? (i.deliveredQuantity + i.undeliveredQuantity) : i.quantity)), 0)}টি</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600 font-bold">এই চালানে ডেলিভারিকৃত:</span>
                <span className="font-black text-emerald-600">{sale.items.reduce((s, i) => s + (i.deliveredQuantity !== undefined ? i.deliveredQuantity : i.quantity), 0)}টি</span>
              </div>
              {totalUndeliveredCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-rose-600 font-bold">বকেয়া / অনডেলিভারী:</span>
                  <span className="font-black text-rose-600">{totalUndeliveredCount}টি (৳{totalUndeliveredAmount})</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-[300px] space-y-3">
            <div className="flex justify-between items-center text-xs font-black uppercase">
              <span style={{ color: '#94a3b8' }}>Sub-Total (ডেলিভারিকৃত):</span> 
              <span style={{ color: '#0f172a' }}>৳{sale.subTotal ?? 0}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-black uppercase">
              <span style={{ color: '#f43f5e' }}>Discount:</span> 
              <span style={{ color: '#f43f5e' }}>-৳{sale.discount ?? 0}</span>
            </div>
            <div className="pt-4 border-t-4 flex justify-between items-center" style={{ borderTopColor: '#1e1e5f' }}>
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#1e1e5f' }}>Net Payable:</span>
                <span className="text-2xl font-black" style={{ color: '#1e1e5f' }}>৳{sale.total ?? 0}</span>
            </div>
            <div className="pt-2 flex justify-between items-center text-xs font-black uppercase">
              <span style={{ color: '#94a3b8' }}>Received:</span> 
              <span style={{ color: '#10b981' }}>৳{sale.paid ?? 0}</span>
            </div>
            {(sale.due ?? 0) > 0 && (
              <div className="flex justify-between items-center text-xs font-black uppercase italic">
                <span style={{ color: '#e11d48' }}>Outstanding Due:</span> 
                <span style={{ color: '#e11d48' }}>৳{sale.due ?? 0}</span>
              </div>
            )}
          </div>
      </div>

      <div className="mt-14 flex justify-between items-end">
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
