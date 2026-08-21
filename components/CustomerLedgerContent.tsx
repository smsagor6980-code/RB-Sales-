import React from 'react';
import { Customer, Sale, Collection, CustomerLoan } from '../types';
import { Building2, Receipt, Phone, MapPin, Calendar, CreditCard, ShieldCheck } from 'lucide-react';

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'sale' | 'collection' | 'loan_disbursed' | 'loan_repaid';
  refNo: string;
  description: string;
  debit: number;   // Amount customer owes (+ / invoice or loan)
  credit: number;  // Amount customer paid (- / collection or repayment)
  balance: number; // Running balance
}

interface CustomerLedgerContentProps {
  customer: Customer;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  shopSettings: any;
  id?: string;
  dateRange?: { start?: string; end?: string };
}

const CustomerLedgerContent: React.FC<CustomerLedgerContentProps> = ({
  customer,
  entries,
  totalDebit,
  totalCredit,
  closingBalance,
  shopSettings,
  id = 'customer-printable-ledger',
  dateRange
}) => {
  const primaryColor = shopSettings?.headerBgColor || '#1e1e5f';

  return (
    <div 
      id={id} 
      className="w-full max-w-[850px] p-8 sm:p-12 min-h-[1050px] relative flex flex-col border bg-white text-slate-800" 
      style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1' }}
    >
      {/* Header Section */}
      <div className="border-b-4 pb-6 mb-6" style={{ borderBottomColor: primaryColor }}>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {shopSettings?.logoUrl ? (
                <div className="h-12 max-w-[120px] p-1 rounded-xl flex items-center justify-center border border-slate-200 bg-white">
                  <img 
                    src={shopSettings.logoUrl} 
                    alt={shopSettings?.name || 'Logo'} 
                    className="max-h-full w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <Building2 size={24} color="#ffffff" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: primaryColor }}>
                  {shopSettings?.headerTitle || shopSettings?.name || 'RB SHAD FOOD PRODUCT LTD'}
                </h1>
                {shopSettings?.headerSubtitle && (
                  <p className="text-[10px] font-bold text-slate-500">{shopSettings.headerSubtitle}</p>
                )}
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              {shopSettings?.address || 'ঢাকা, বাংলাদেশ'}
            </p>
            <p className="text-[10px] font-semibold text-slate-500">
              <span className="font-bold text-slate-700">হটলাইন:</span> {shopSettings?.phone || 'N/A'} | <span className="font-bold text-slate-700">ইমেইল:</span> {shopSettings?.email || 'N/A'}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-widest text-white rounded-lg mb-2" style={{ backgroundColor: primaryColor }}>
              কাস্টমার লেজার বিবরণী
            </span>
            <p className="text-xs font-bold text-slate-600">
              প্রিন্ট তারিখ: {new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {dateRange?.start && (
              <p className="text-[10px] text-slate-400 font-bold">
                সময়সীমা: {dateRange.start} থেকে {dateRange.end || 'বর্তমান'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400 block">গ্রাহকের নাম (Customer)</span>
          <span className="font-black text-sm text-slate-900 uppercase block">{customer.name}</span>
          <span className="text-[11px] text-slate-600 block mt-0.5"><Phone size={12} className="inline mr-1 text-slate-400"/> {customer.phone}</span>
          {customer.address && (
            <span className="text-[11px] text-slate-600 block mt-0.5"><MapPin size={12} className="inline mr-1 text-slate-400"/> {customer.address}</span>
          )}
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">গ্রাহকের ধরন / কোড</span>
          <span className="font-black text-xs uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 inline-block mt-0.5">
            {customer.type === 'retail' ? 'খুচরা (Retail)' : customer.type === 'wholesale' ? 'পাইকারি (Wholesale)' : 'ডিস্ট্রিবিউটর'}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">ID: #{customer.id.slice(-8)}</span>
          <span className="text-[10px] text-slate-500 font-bold block">যোগদান: {customer.dateAdded?.split('T')[0] || 'N/A'}</span>
        </div>
      </div>

      {/* Financial Overview Tiles */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-center">
          <span className="text-[10px] font-black uppercase text-slate-500 block">মোট বিক্রয় (Debit)</span>
          <span className="text-base font-black text-slate-900">৳{totalDebit.toLocaleString()}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <span className="text-[10px] font-black uppercase text-emerald-600 block">মোট জমা (Credit)</span>
          <span className="text-base font-black text-emerald-700">৳{totalCredit.toLocaleString()}</span>
        </div>
        <div className={`p-3.5 rounded-xl border text-center ${closingBalance > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
          <span className="text-[10px] font-black uppercase block">বর্তমান মোট বকেয়া</span>
          <span className="text-base font-black">৳{closingBalance.toLocaleString()}</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="flex-1 overflow-visible">
        <table className="w-full text-left text-xs border border-slate-300 rounded-lg overflow-hidden">
          <thead className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase border-b border-slate-300">
            <tr>
              <th className="p-2.5 border-r border-slate-300">তারিখ</th>
              <th className="p-2.5 border-r border-slate-300">ভাউচার / বিবরণ</th>
              <th className="p-2.5 text-right border-r border-slate-300">ডেবিট / বিক্রয় (৳)</th>
              <th className="p-2.5 text-right border-r border-slate-300">ক্রেডিট / জমা (৳)</th>
              <th className="p-2.5 text-right">ব্যালেন্স / জের (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400 font-bold">
                  কোনো লেনদেনের রেকর্ড পাওয়া যায়নি
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={entry.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                  <td className="p-2.5 border-r border-slate-200 font-mono text-[11px] whitespace-nowrap">
                    {entry.date}
                  </td>
                  <td className="p-2.5 border-r border-slate-200">
                    <div className="font-bold text-slate-800">{entry.description}</div>
                    <div className="text-[10px] text-slate-400 font-mono font-bold">Ref: #{entry.refNo}</div>
                  </td>
                  <td className="p-2.5 text-right border-r border-slate-200 font-bold font-mono text-slate-900">
                    {entry.debit > 0 ? `৳${entry.debit.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-2.5 text-right border-r border-slate-200 font-bold font-mono text-emerald-600">
                    {entry.credit > 0 ? `৳${entry.credit.toLocaleString()}` : '-'}
                  </td>
                  <td className={`p-2.5 text-right font-black font-mono ${entry.balance > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                    ৳{entry.balance.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-black text-xs border-t-2 border-slate-300">
            <tr>
              <td colSpan={2} className="p-3 text-right uppercase border-r border-slate-300">মোট সর্বমোট:</td>
              <td className="p-3 text-right text-slate-900 border-r border-slate-300">৳{totalDebit.toLocaleString()}</td>
              <td className="p-3 text-right text-emerald-700 border-r border-slate-300">৳{totalCredit.toLocaleString()}</td>
              <td className={`p-3 text-right text-sm ${closingBalance > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                ৳{closingBalance.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer & Signatures */}
      <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-end text-xs">
        <div className="text-center">
          <div className="w-44 border-t border-slate-400 pt-1.5 font-bold text-slate-700">
            গ্রাহকের স্বাক্ষর
          </div>
        </div>
        <div className="text-center">
          <div className="w-44 border-t border-slate-400 pt-1.5 font-bold text-slate-700">
            কর্তৃপক্ষের স্বাক্ষর
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-[9px] text-slate-400 font-bold">
        {shopSettings?.headerTagline || 'সততা ও সেবাই আমাদের লক্ষ্য। আমাদের সাথে থাকার জন্য ধন্যবাদ।'}
      </div>
    </div>
  );
};

export default CustomerLedgerContent;
