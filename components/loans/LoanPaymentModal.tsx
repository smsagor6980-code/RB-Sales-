import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Banknote, 
  Calendar, 
  CreditCard, 
  FileText, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { CompanyLoan, LoanPayment } from '../../types';
import { formatBDT, recalculateLoanStatus } from './loanUtils';

interface LoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: CompanyLoan | null;
  onSavePayment: (updatedLoan: CompanyLoan, newPayment: LoanPayment) => void;
  currentStaffName?: string;
  currentStaffId?: string;
}

export const LoanPaymentModal: React.FC<LoanPaymentModalProps> = ({
  isOpen,
  onClose,
  loan,
  onSavePayment,
  currentStaffName,
  currentStaffId
}) => {
  if (!isOpen || !loan) return null;

  const nextInstallmentNo = (loan.payments?.length || 0) + 1;
  const suggestedAmount = Math.min(
    loan.remainingLoan > 0 ? loan.remainingLoan : 0, 
    Number(loan.installmentAmount) || loan.remainingLoan || 0
  );

  // By default, calculate split between principal and interest based on loan ratio
  const interestRatio = loan.totalPayable > 0 ? (loan.totalInterest / loan.totalPayable) : 0;
  const defaultInterestPortion = Math.round(suggestedAmount * interestRatio);
  const defaultPrincipalPortion = Math.max(0, suggestedAmount - defaultInterestPortion);

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(suggestedAmount);
  const [principalPaid, setPrincipalPaid] = useState(defaultPrincipalPortion);
  const [interestPaid, setInterestPaid] = useState(defaultInterestPortion);
  const [penaltyPaid, setPenaltyPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad' | 'rocket' | 'other'>('bank');
  const [bankAccount, setBankAccount] = useState(loan.bankAccountNumber || '');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptNumber, setReceiptNumber] = useState(`REC-${Date.now().toString().slice(-6)}`);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isEarlyPayment, setIsEarlyPayment] = useState(false);

  const handleAmountChange = (newAmount: number) => {
    setAmount(newAmount);
    // auto split
    const intPortion = Math.round(newAmount * interestRatio);
    const prinPortion = Math.max(0, newAmount - intPortion);
    setInterestPaid(intPortion);
    setPrincipalPaid(prinPortion);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('অনুগ্রহ করে কিস্তির টাকার পরিমাণ সঠিকভাবে লিখুন।');
      return;
    }

    const newPayment: LoanPayment = {
      id: `lpay_${Date.now()}`,
      loanId: loan.id,
      installmentNo: nextInstallmentNo,
      paymentDate,
      amount: Number(amount) + Number(penaltyPaid || 0),
      principalPaid: Number(principalPaid) || 0,
      interestPaid: Number(interestPaid) || 0,
      penaltyPaid: Number(penaltyPaid) || 0,
      paymentMethod,
      bankAccount,
      transactionRef,
      receiptNumber,
      receiptUrl,
      notes,
      isEarlyPayment,
      addedBy: currentStaffId || 'admin',
      addedByName: currentStaffName || 'Admin',
      createdAt: new Date().toISOString()
    };

    const existingPayments = loan.payments || [];
    const updatedPayments = [newPayment, ...existingPayments];

    const recalculation = recalculateLoanStatus(loan, updatedPayments);

    const updatedLoan: CompanyLoan = {
      ...loan,
      ...recalculation,
      payments: updatedPayments,
      updatedAt: new Date().toISOString()
    };

    onSavePayment(updatedLoan, newPayment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
              <Banknote size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                কিস্তি পরিশোধ এন্ট্রি (Payment Entry)
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                {loan.providerName} • {loan.loanIdNumber || loan.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Balance Overview Banner */}
        <div className="bg-emerald-50 px-6 py-3 border-b border-emerald-200/80 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-500 font-bold block text-[10px]">মোট ঋণ</span>
            <span className="font-black text-slate-800">{formatBDT(loan.totalPayable)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block text-[10px]">ইতিমধ্যে পরিশোধিত</span>
            <span className="font-black text-emerald-700">{formatBDT(loan.totalPaidAmount)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block text-[10px]">বর্তমান বকেয়া (Due)</span>
            <span className="font-black text-rose-600">{formatBDT(loan.remainingLoan)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পরিশোধের তারিখ (Payment Date) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                কিস্তির ক্রম (Installment No.)
              </label>
              <input
                type="text"
                disabled
                value={`কিস্তি #${nextInstallmentNo}`}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-300 text-sm font-bold text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পরিশোধিত মোট টাকা (Payment Amount) ৳ <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount || ''}
                onChange={(e) => handleAmountChange(Number(e.target.value))}
                placeholder="যেমন: 15000"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-emerald-400 text-base font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পরিশোধ মাধ্যম (Payment Method)
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="bank">ব্যাংক ট্রান্সফার / ডিপোজিট (Bank)</option>
                <option value="cash">নগদ ক্যাশ (Cash)</option>
                <option value="cheque">ব্যাংক চেক (Cheque)</option>
                <option value="bkash">বিকাশ (bKash)</option>
                <option value="nagad">নগদ (Nagad)</option>
                <option value="rocket">রকেট (Rocket)</option>
                <option value="other">অন্যান্য (Other)</option>
              </select>
            </div>
          </div>

          {/* Breakdown: Principal, Interest, Late Penalty */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-[11px] font-black text-slate-700 block border-b border-slate-200 pb-1.5">
              টাকা বিভাজন (Payment Split Breakdown)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">আসল বাবদ (Principal)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={principalPaid}
                  onChange={(e) => setPrincipalPaid(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">সুদ বাবদ (Interest)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={interestPaid}
                  onChange={(e) => setInterestPaid(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">বিলম্ব ফি / জরিমানা (Penalty)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={penaltyPaid}
                  onChange={(e) => setPenaltyPaid(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-rose-600"
                />
              </div>
            </div>
          </div>

          {/* Bank / Transaction References */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ব্যাংক একাউন্ট / চেক নম্বর / TrxID
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. TXN987654 / CHQ-1002"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                মানি রসিদ নম্বর (Receipt / Voucher No.)
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="REC-001"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Early Payment & Voucher Upload */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isEarlyPayment}
                onChange={(e) => setIsEarlyPayment(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
              />
              <span className="text-xs font-bold text-amber-900">
                এটি কি আগাম / অতিরিক্ত এককালীন পরিশোধ (Early Repayment)?
              </span>
            </label>

            <div>
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">
                <Upload size={13} />
                <span>{receiptUrl ? 'রসিদ সংযুক্ত হয়েছে ✓' : 'রসিদ ছবি আপলোড'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              মন্তব্য / নোট (Notes)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="কিস্তি বা পেমেন্ট সংক্রান্ত বিবরণ"
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-100 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01]"
            >
              <Save size={16} />
              <span>কিস্তি জমা নিশ্চিত করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
