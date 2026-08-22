import React from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Landmark, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Percent,
  Layers
} from 'lucide-react';
import { CompanyLoan, ShopSettings } from '../../types';
import { formatBDT } from './loanUtils';

interface LoanStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: CompanyLoan | null;
  shopSettings?: ShopSettings;
}

export const LoanStatementModal: React.FC<LoanStatementModalProps> = ({
  isOpen,
  onClose,
  loan,
  shopSettings
}) => {
  if (!isOpen || !loan) return null;

  const handlePrint = () => {
    window.print();
  };

  const payments = loan.payments || [];
  const sortedPayments = [...payments].sort((a, b) => (a.paymentDate || '').localeCompare(b.paymentDate || ''));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs border border-emerald-300">পরিশোধিত (Completed)</span>;
      case 'overdue':
        return <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-xs border border-rose-300">বিলম্বিত (Overdue)</span>;
      case 'closed':
        return <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full font-bold text-xs border border-slate-300">বন্ধ (Closed)</span>;
      default:
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs border border-amber-300">চলমান (Active)</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shadow-md shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold">কোম্পানি ঋণ বিবরণী (Loan Statement)</h2>
              <p className="text-xs text-slate-400">{loan.providerName} • {loan.loanIdNumber || loan.id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Printer size={15} />
              <span>প্রিন্ট করুন</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Statement Content */}
        <div id="loan-statement-printable" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:p-6 print:overflow-visible text-slate-800">
          
          {/* Statement Header with Company / Shop Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-800 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-3">
                {shopSettings?.logoUrl && (
                  <img src={shopSettings.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-xl" />
                )}
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    {shopSettings?.headerTitle || shopSettings?.name || 'REST BAZER'}
                  </h1>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    {shopSettings?.headerSubtitle || 'অফিসিয়াল কোম্পানি ঋণ হিসাব বিবরণী'}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                {shopSettings?.address && <p className="flex items-center gap-1"><MapPin size={12} /> {shopSettings.address}</p>}
                {shopSettings?.phone && <p className="flex items-center gap-1"><Phone size={12} /> {shopSettings.phone}</p>}
                {shopSettings?.email && <p className="flex items-center gap-1"><Mail size={12} /> {shopSettings.email}</p>}
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-xs font-black uppercase tracking-wider">
                LOAN STATEMENT
              </span>
              <p className="text-sm font-black text-slate-900">Loan ID: #{loan.loanIdNumber || loan.id}</p>
              <p className="text-xs text-slate-500">স্টেটমেন্ট ইস্যুর তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
              <div className="mt-1">{getStatusBadge(loan.status)}</div>
            </div>
          </div>

          {/* Loan & Provider Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                ঋণ প্রদানকারীর তথ্য (Provider Details)
              </h3>
              <p><span className="text-slate-500 font-bold">নাম / প্রতিষ্ঠান:</span> <span className="font-bold text-slate-900">{loan.providerName}</span></p>
              <p><span className="text-slate-500 font-bold">প্রতিষ্ঠান ধরন:</span> <span className="capitalize font-semibold">{loan.providerType}</span></p>
              {loan.providerPhone && <p><span className="text-slate-500 font-bold">মোবাইল:</span> {loan.providerPhone}</p>}
              {loan.referenceNumber && <p><span className="text-slate-500 font-bold">রেফারেন্স / একাউন্ট নং:</span> {loan.referenceNumber}</p>}
              {loan.collateralSecurity && <p><span className="text-slate-500 font-bold">জামানত / বন্ধক:</span> {loan.collateralSecurity}</p>}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                ঋণের শর্ত ও সময়সূচী (Terms & Schedule)
              </h3>
              <p><span className="text-slate-500 font-bold">ঋণ গ্রহণের তারিখ:</span> {loan.loanDate}</p>
              <p><span className="text-slate-500 font-bold">সুদের হার:</span> {loan.interestRate}% ({loan.interestType})</p>
              <p><span className="text-slate-500 font-bold">মেয়াদ ও কিস্তি:</span> {loan.loanTenure} মাস ({loan.totalInstallments} টি কিস্তি - {loan.installmentFrequency})</p>
              <p><span className="text-slate-500 font-bold">প্রতি কিস্তির পরিমাণ:</span> {formatBDT(loan.installmentAmount)}</p>
              <p><span className="text-slate-500 font-bold">চূড়ান্ত মেয়াদ (Due Date):</span> {loan.dueDate}</p>
            </div>
          </div>

          {/* Key Financial Balance Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-100 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">মোট ঋণের আসল</span>
              <span className="text-base font-black text-slate-900">{formatBDT(loan.principalAmount)}</span>
            </div>
            <div className="p-3.5 bg-rose-50 rounded-xl text-center border border-rose-100">
              <span className="text-[10px] text-rose-600 uppercase font-bold block">মোট প্রাক্কলিত সুদ</span>
              <span className="text-base font-black text-rose-700">{formatBDT(loan.totalInterest)}</span>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-xl text-center border border-emerald-100">
              <span className="text-[10px] text-emerald-600 uppercase font-bold block">মোট পরিশোধিত টাকা</span>
              <span className="text-base font-black text-emerald-700">{formatBDT(loan.totalPaidAmount)}</span>
            </div>
            <div className="p-3.5 bg-amber-50 rounded-xl text-center border border-amber-200">
              <span className="text-[10px] text-amber-700 uppercase font-bold block">বর্তমান বাকি (Outstanding)</span>
              <span className="text-base font-black text-amber-900">{formatBDT(loan.remainingLoan)}</span>
            </div>
          </div>

          {/* Payments History Ledger Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                কিস্তি পরিশোধের ইতিহাস (Payment Ledger & History)
              </h3>
              <span className="text-xs text-slate-500 font-bold">মোট {payments.length}টি কিস্তি সম্পন্ন</span>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">আসল পরিশোধ</th>
                    <th className="py-2.5 px-3">সুদ পরিশোধ</th>
                    <th className="py-2.5 px-3">জরিমানা</th>
                    <th className="py-2.5 px-3">মোট প্রদত্ত</th>
                    <th className="py-2.5 px-3">মাধ্যম / রেফারেন্স</th>
                    <th className="py-2.5 px-3">রসিদ নং</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 font-medium">
                        এখন পর্যন্ত কোনো কিস্তি পরিশোধ করা হয়নি।
                      </td>
                    </tr>
                  ) : (
                    sortedPayments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-bold text-slate-600">{p.installmentNo || idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{p.paymentDate}</td>
                        <td className="py-2 px-3 font-bold text-slate-700">{formatBDT(p.principalPaid)}</td>
                        <td className="py-2 px-3 font-medium text-rose-600">{formatBDT(p.interestPaid)}</td>
                        <td className="py-2 px-3 font-medium text-amber-600">{p.penaltyPaid ? formatBDT(p.penaltyPaid) : '-'}</td>
                        <td className="py-2 px-3 font-black text-emerald-700">{formatBDT(p.amount)}</td>
                        <td className="py-2 px-3 text-slate-600 uppercase text-[10px]">
                          {p.paymentMethod} {p.transactionRef ? `(${p.transactionRef})` : ''}
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{p.receiptNumber || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {sortedPayments.length > 0 && (
                  <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right">সর্বমোট:</td>
                      <td className="py-2.5 px-3">{formatBDT(loan.totalPrincipalPaid)}</td>
                      <td className="py-2.5 px-3 text-rose-700">{formatBDT(loan.totalInterestPaid)}</td>
                      <td className="py-2.5 px-3 text-amber-700">{formatBDT(loan.totalPenaltyPaid)}</td>
                      <td className="py-2.5 px-3 text-emerald-800">{formatBDT(loan.totalPaidAmount)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Notes or remarks */}
          {loan.notes && (
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs">
              <span className="font-bold text-amber-900 block mb-0.5">মন্তব্য / বিশেষ দ্রষ্টব্য:</span>
              <p className="text-slate-700">{loan.notes}</p>
            </div>
          )}

          {/* Official Signatures Section */}
          <div className="pt-16 grid grid-cols-2 gap-8 text-xs font-bold text-slate-700 print:pt-20">
            <div className="text-center border-t border-slate-400 pt-2">
              <p>প্রস্তুতকারীর স্বাক্ষর ও সীল</p>
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">হিসাব বিভাগ</p>
            </div>
            <div className="text-center border-t border-slate-400 pt-2">
              <p>কর্তৃপক্ষের অনুমোদন</p>
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">ব্যবস্থাপনা পরিচালক / স্বত্বাধিকারী</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
