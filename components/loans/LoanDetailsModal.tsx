import React, { useState } from 'react';
import { 
  X, 
  Landmark, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  Paperclip, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  TrendingDown, 
  Eye, 
  Edit3, 
  Trash2,
  Lock,
  Percent,
  Plus
} from 'lucide-react';
import { CompanyLoan, LoanPayment } from '../../types';
import { formatBDT } from './loanUtils';

interface LoanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: CompanyLoan | null;
  onOpenEdit: (loan: CompanyLoan) => void;
  onOpenPayment: (loan: CompanyLoan) => void;
  onOpenStatement: (loan: CompanyLoan) => void;
  onCloseLoan?: (loanId: string, reason: string) => void;
}

export const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({
  isOpen,
  onClose,
  loan,
  onOpenEdit,
  onOpenPayment,
  onOpenStatement,
  onCloseLoan
}) => {
  if (!isOpen || !loan) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'documents'>('overview');
  const [showClosePrompt, setShowClosePrompt] = useState(false);
  const [closureReason, setClosureReason] = useState('');

  const payments = loan.payments || [];
  const documents = loan.documents || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Landmark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">{loan.providerName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-amber-300">
                  {loan.loanIdNumber || loan.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {loan.loanType} • {loan.providerType} • ঋণ শুরুর তারিখ: {loan.loanDate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenStatement(loan)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <FileText size={14} />
              <span>স্টেটমেন্ট</span>
            </button>
            <button
              onClick={() => onOpenPayment(loan)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus size={14} />
              <span>কিস্তি জমা</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex gap-4 bg-slate-50/70 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            সারসংক্ষেপ (Overview)
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>পরিশোধের ইতিহাস</span>
            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px]">{payments.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'documents'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>সংযুক্ত ডকুমেন্টস</span>
            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px]">{documents.length}</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial 4-Block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">মোট ঋণ (আসল)</span>
                  <span className="text-lg font-black text-slate-800">{formatBDT(loan.principalAmount)}</span>
                  <span className="text-[10px] text-slate-400 block mt-1">সুদ: {loan.interestRate}% ({loan.interestType})</span>
                </div>
                <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">মোট প্রদেয় (আসল + সুদ)</span>
                  <span className="text-lg font-black text-rose-700">{formatBDT(loan.totalPayable)}</span>
                  <span className="text-[10px] text-rose-500 block mt-1">প্রাক্কলিত মোট সুদ: {formatBDT(loan.totalInterest)}</span>
                </div>
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">মোট পরিশোধিত টাকা</span>
                  <span className="text-lg font-black text-emerald-700">{formatBDT(loan.totalPaidAmount)}</span>
                  <span className="text-[10px] text-emerald-600 block mt-1">আসল: {formatBDT(loan.totalPrincipalPaid)} • সুদ: {formatBDT(loan.totalInterestPaid)}</span>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">বর্তমান বাকি ঋণ (Due)</span>
                  <span className="text-lg font-black text-amber-900">{formatBDT(loan.remainingLoan)}</span>
                  <span className="text-[10px] text-amber-700 block mt-1">অবশিষ্ট আসল: {formatBDT(loan.remainingPrincipal)}</span>
                </div>
              </div>

              {/* Installment Plan & Schedule Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                    কিস্তি ও সময়সূচী
                  </h3>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">কিস্তির ফ্রিকোয়েন্সি:</span>
                    <span className="font-bold text-slate-800 capitalize">{loan.installmentFrequency}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">প্রতি কিস্তির প্রদেয় পরিমাণ:</span>
                    <span className="font-black text-emerald-700">{formatBDT(loan.installmentAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">মোট কিস্তি সংখ্যা:</span>
                    <span className="font-bold text-slate-800">{loan.totalInstallments} টি ({loan.payments?.length || 0}টি দেওয়া হয়েছে)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">পরবর্তী কিস্তির তারিখ:</span>
                    <span className="font-black text-amber-700">{loan.nextPaymentDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-bold">চূড়ান্ত মেয়াদ (Final Due Date):</span>
                    <span className="font-bold text-slate-800">{loan.dueDate || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                    রেফারেন্স ও নিরাপত্তা জামানত
                  </h3>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">রেফারেন্স / চুক্তি নম্বর:</span>
                    <span className="font-bold text-slate-800">{loan.referenceNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">ব্যাংক / একাউন্ট নম্বর:</span>
                    <span className="font-bold text-slate-800">{loan.bankAccountNumber || 'N/A'}</span>
                  </div>
                  <div className="py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold block mb-0.5">জামানত / বন্ধক (Collateral):</span>
                    <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200">{loan.collateralSecurity || 'কোনো জামানত উল্লেখ করা হয়নি'}</p>
                  </div>
                  <div className="py-1">
                    <span className="text-slate-500 font-bold block mb-0.5">মন্তব্য / শর্তাবলী:</span>
                    <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200">{loan.notes || 'কোনো নোট নেই'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Edit / Close / Delete */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenEdit(loan)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    <Edit3 size={14} />
                    <span>তথ্য সংশোধন</span>
                  </button>
                  {loan.status !== 'closed' && onCloseLoan && (
                    <button
                      onClick={() => setShowClosePrompt(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all"
                    >
                      <Lock size={14} />
                      <span>ঋণ সমাপ্ত / ক্লোজ করুন</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenStatement(loan)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <FileText size={14} />
                    <span>স্টেটমেন্ট ভিউ</span>
                  </button>
                </div>
              </div>

              {/* Close Loan Modal Prompt */}
              {showClosePrompt && (
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-300 space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-black text-rose-900">ঋণ সমাপ্ত / ক্লোজ করার কারণ লিখুন:</h4>
                  <input
                    type="text"
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    placeholder="যেমন: সম্পূর্ণ টাকা পরিশোধিত বা ব্যাংক থেকে এনওসি প্রাপ্তি"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-rose-300 text-xs text-slate-800"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowClosePrompt(false)}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onCloseLoan) {
                          onCloseLoan(loan.id, closureReason || 'সম্পূর্ণ ক্লোজড');
                          setShowClosePrompt(false);
                          onClose();
                        }
                      }}
                      className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
                    >
                      ক্লোজ নিশ্চিত করুন
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  সকল কিস্তির লেনদেন বিবরণী
                </h3>
                <button
                  onClick={() => onOpenPayment(loan)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  <Plus size={13} />
                  <span>নতুন কিস্তি জমা</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">তারিখ</th>
                      <th className="py-2.5 px-3">আসল</th>
                      <th className="py-2.5 px-3">সুদ</th>
                      <th className="py-2.5 px-3">জরিমানা</th>
                      <th className="py-2.5 px-3">মোট প্রদত্ত</th>
                      <th className="py-2.5 px-3">মাধ্যম / ট্রানজেকশন</th>
                      <th className="py-2.5 px-3">রসিদ নং</th>
                      <th className="py-2.5 px-3">রসিদ ছবি</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400 font-medium">
                          কোনো কিস্তি পরিশোধ করা হয়নি।
                        </td>
                      </tr>
                    ) : (
                      payments.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-bold text-slate-600">{p.installmentNo || idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{p.paymentDate}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">{formatBDT(p.principalPaid)}</td>
                          <td className="py-2.5 px-3 font-medium text-rose-600">{formatBDT(p.interestPaid)}</td>
                          <td className="py-2.5 px-3 font-medium text-amber-600">{p.penaltyPaid ? formatBDT(p.penaltyPaid) : '-'}</td>
                          <td className="py-2.5 px-3 font-black text-emerald-700">{formatBDT(p.amount)}</td>
                          <td className="py-2.5 px-3 uppercase text-[10px] text-slate-600">
                            {p.paymentMethod} {p.transactionRef ? `(${p.transactionRef})` : ''}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{p.receiptNumber || '-'}</td>
                          <td className="py-2.5 px-3">
                            {p.receiptUrl ? (
                              <a
                                href={p.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold inline-block"
                              >
                                ভাউচার দেখুন
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  সংযুক্ত ফাইল ও ডকুমেন্টস ({documents.length}টি)
                </h3>
              </div>

              {documents.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Paperclip size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-600">কোনো ফাইল সংযুক্ত করা নেই</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">এডিট মেন্যু থেকে চুক্তিপত্র বা চেক আপলোড করতে পারেন</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{doc.type} • {doc.fileSize || 'Doc'} • {doc.uploadDate}</p>
                        </div>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs"
                      >
                        ডাউনলোড / দেখুন
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
