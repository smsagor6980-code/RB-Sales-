import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Landmark, 
  Calendar, 
  Percent, 
  DollarSign, 
  FileText, 
  Upload, 
  Trash2, 
  Paperclip, 
  ShieldAlert, 
  Layers,
  HelpCircle,
  Building,
  User,
  Clock,
  Sparkles
} from 'lucide-react';
import { CompanyLoan, LoanDocument, LoanInterestType, LoanInstallmentFrequency, LoanType } from '../../types';
import { calculateLoanDetails, formatBDT } from './loanUtils';

interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: CompanyLoan) => void;
  initialData?: CompanyLoan | null;
  currentStaffName?: string;
  currentStaffId?: string;
}

export const LoanFormModal: React.FC<LoanFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentStaffName,
  currentStaffId
}) => {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<CompanyLoan>>({
    loanIdNumber: `CLOAN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    providerName: '',
    providerType: 'bank',
    providerPhone: '',
    providerEmail: '',
    providerAddress: '',
    loanType: 'bank_loan',
    principalAmount: 100000,
    loanDate: new Date().toISOString().split('T')[0],
    firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    interestRate: 9,
    interestType: 'yearly',
    loanTenure: 12,
    installmentFrequency: 'monthly',
    installmentAmount: 0,
    totalInterest: 0,
    totalPayable: 0,
    collateralSecurity: '',
    bankAccountNumber: '',
    referenceNumber: '',
    notes: '',
    documents: [],
    status: 'active'
  });

  const [documents, setDocuments] = useState<LoanDocument[]>([]);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('agreement');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isManualInstallment, setIsManualInstallment] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        principalAmount: Number(initialData.principalAmount) || 0,
        interestRate: Number(initialData.interestRate) || 0,
        loanTenure: Number(initialData.loanTenure) || 12,
        installmentAmount: Number(initialData.installmentAmount) || 0,
        totalInterest: Number(initialData.totalInterest) || 0,
        totalPayable: Number(initialData.totalPayable) || 0,
      });
      setDocuments(initialData.documents || []);
    } else {
      const initialPrincipal = 100000;
      const initialRate = 9;
      const initialTenure = 12;
      const calc = calculateLoanDetails(initialPrincipal, initialRate, 'yearly', initialTenure, 'monthly');
      
      setFormData({
        loanIdNumber: `CLOAN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        providerName: '',
        providerType: 'bank',
        providerPhone: '',
        providerEmail: '',
        providerAddress: '',
        loanType: 'bank_loan',
        principalAmount: initialPrincipal,
        loanDate: new Date().toISOString().split('T')[0],
        firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueDate: calc.calculatedDueDate,
        interestRate: initialRate,
        interestType: 'yearly',
        loanTenure: initialTenure,
        installmentFrequency: 'monthly',
        totalInstallments: calc.totalInstallments,
        installmentAmount: calc.installmentAmount,
        totalInterest: calc.totalInterest,
        totalPayable: calc.totalPayable,
        collateralSecurity: '',
        bankAccountNumber: '',
        referenceNumber: '',
        notes: '',
        documents: [],
        status: 'active'
      });
      setDocuments([]);
      setIsManualInstallment(false);
    }
  }, [initialData, isOpen]);

  // Recalculate auto amounts whenever principal, rate, tenure, type, or frequency change
  const handleAutoCalculate = (updated = formData) => {
    if (isManualInstallment) return;
    const p = Number(updated.principalAmount) || 0;
    const r = Number(updated.interestRate) || 0;
    const tenure = Number(updated.loanTenure) || 1;
    const intType = updated.interestType || 'yearly';
    const freq = updated.installmentFrequency || 'monthly';
    const sDate = updated.loanDate || new Date().toISOString().split('T')[0];

    const result = calculateLoanDetails(p, r, intType, tenure, freq, sDate);

    setFormData(prev => ({
      ...prev,
      totalInstallments: result.totalInstallments,
      totalInterest: result.totalInterest,
      totalPayable: result.totalPayable,
      installmentAmount: result.installmentAmount,
      dueDate: result.calculatedDueDate
    }));
  };

  const handleFieldChange = (field: keyof CompanyLoan, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    if (['principalAmount', 'interestRate', 'interestType', 'loanTenure', 'installmentFrequency', 'loanDate'].includes(field)) {
      if (!isManualInstallment) {
        handleAutoCalculate(updated);
      }
    }
  };

  // Document Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('ফাইলের সাইজ সর্বোচ্চ ৫ MB হতে পারবে।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      const newDoc: LoanDocument = {
        id: `doc-${Date.now()}`,
        name: docName.trim() || file.name,
        type: docType,
        fileUrl: base64Url,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        uploadDate: new Date().toISOString().split('T')[0]
      };

      setDocuments(prev => [...prev, newDoc]);
      setDocName('');
    };
    reader.onerror = () => {
      setUploadError('ফাইল পড়তে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.providerName?.trim()) {
      alert('অনুগ্রহ করে ঋণ প্রদানকারীর নাম (Loan Provider) লিখুন।');
      return;
    }
    if (!formData.principalAmount || Number(formData.principalAmount) <= 0) {
      alert('অনুগ্রহ করে ঋণের আসল টাকার পরিমাণ (Loan Amount) লিখুন।');
      return;
    }

    const now = new Date().toISOString();
    const principal = Number(formData.principalAmount) || 0;
    const totalPayable = Number(formData.totalPayable) || principal;
    const totalPaid = initialData?.totalPaidAmount || 0;
    const remaining = Math.max(0, totalPayable - totalPaid);

    const completeLoan: CompanyLoan = {
      id: initialData?.id || `loan_${Date.now()}`,
      loanIdNumber: formData.loanIdNumber?.trim() || `CLOAN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      providerName: formData.providerName.trim(),
      providerType: formData.providerType || 'bank',
      providerPhone: formData.providerPhone || '',
      providerEmail: formData.providerEmail || '',
      providerAddress: formData.providerAddress || '',
      loanType: formData.loanType || 'bank_loan',
      principalAmount: principal,
      loanDate: formData.loanDate || now.split('T')[0],
      firstPaymentDate: formData.firstPaymentDate || now.split('T')[0],
      dueDate: formData.dueDate || now.split('T')[0],
      interestRate: Number(formData.interestRate) || 0,
      interestType: formData.interestType || 'yearly',
      loanTenure: Number(formData.loanTenure) || 12,
      installmentFrequency: formData.installmentFrequency || 'monthly',
      totalInstallments: Number(formData.totalInstallments) || 12,
      installmentAmount: Number(formData.installmentAmount) || 0,
      totalInterest: Number(formData.totalInterest) || 0,
      totalPayable: totalPayable,
      
      totalPaidAmount: totalPaid,
      totalPrincipalPaid: initialData?.totalPrincipalPaid || 0,
      totalInterestPaid: initialData?.totalInterestPaid || 0,
      totalPenaltyPaid: initialData?.totalPenaltyPaid || 0,
      totalPenaltyDue: initialData?.totalPenaltyDue || 0,
      
      remainingLoan: remaining,
      remainingPrincipal: Math.max(0, principal - (initialData?.totalPrincipalPaid || 0)),
      
      nextPaymentDate: formData.firstPaymentDate || formData.loanDate,
      nextPaymentAmount: Number(formData.installmentAmount) || 0,
      
      collateralSecurity: formData.collateralSecurity || '',
      bankAccountNumber: formData.bankAccountNumber || '',
      referenceNumber: formData.referenceNumber || '',
      notes: formData.notes || '',
      
      documents: documents,
      payments: initialData?.payments || [],
      
      status: formData.status || 'active',
      createdAt: initialData?.createdAt || now,
      updatedAt: now,
      addedBy: currentStaffId || initialData?.addedBy || 'admin',
      addedByName: currentStaffName || initialData?.addedByName || 'Admin'
    };

    onSave(completeLoan);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
              <Landmark size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                {isEdit ? 'ঋণের তথ্য সংশোধন করুন' : 'নতুন কোম্পানির ঋণ যোগ করুন (Add New Loan)'}
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                ব্যাংক, এনজিও, ব্যক্তিগত বা প্রাতিষ্ঠানিক ঋণের যাবতীয় তথ্য ও ডকুমেন্ট সংরক্ষণ
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Section 1: Basic Loan & Provider Details */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-amber-800 font-black text-sm border-b border-slate-200 pb-2">
              <Building size={16} />
              <span>১. ঋণ প্রদানকারী ও সাধারণ পরিচিতি</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Loan ID / ট্র্যাকিং নম্বর <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.loanIdNumber || ''}
                  onChange={(e) => handleFieldChange('loanIdNumber', e.target.value)}
                  placeholder="e.g. CLOAN-2026-001"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ঋণ প্রদানকারীর নাম (Loan Provider) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.providerName || ''}
                  onChange={(e) => handleFieldChange('providerName', e.target.value)}
                  placeholder="যেমন: ব্র্যাক ব্যাংক, সোনালী ব্যাংক, আশা এনজিও, ইত্যাদি"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  প্রদানকারীর ধরন (Provider Type)
                </label>
                <select
                  value={formData.providerType || 'bank'}
                  onChange={(e) => handleFieldChange('providerType', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="bank">বাণিজ্যিক ব্যাংক (Bank)</option>
                  <option value="ngo">এনজিও / সমিতি (NGO/MFI)</option>
                  <option value="company">কোম্পানি / কর্পোরেট প্রতিষ্ঠান</option>
                  <option value="financial_institution">আর্থিক প্রতিষ্ঠান (NBFI)</option>
                  <option value="individual">ব্যক্তিগত ঋণ (Personal/Investor)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ঋণের ধরন (Loan Type)
                </label>
                <select
                  value={formData.loanType || 'bank_loan'}
                  onChange={(e) => handleFieldChange('loanType', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="bank_loan">টার্ম লোন / সাধারণ ব্যাংক ঋণ</option>
                  <option value="sme_loan">এসএমই ঋণ (SME Loan)</option>
                  <option value="mortgage">বন্ধকী ঋণ (Mortgage / Collateral)</option>
                  <option value="credit_line">সিসি লোন / ক্যাশ ক্রেডিট (CC Loan)</option>
                  <option value="personal_loan">ব্যক্তিগত বা ডিরেক্টর লোন</option>
                  <option value="microcredit">মাইক্রোক্রেডিট / এনজিও ঋণ</option>
                  <option value="other">অন্যান্য ঋণ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মোবাইল নম্বর / হেল্পলাইন
                </label>
                <input
                  type="text"
                  value={formData.providerPhone || ''}
                  onChange={(e) => handleFieldChange('providerPhone', e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  একাউন্ট / রেফারেন্স নম্বর
                </label>
                <input
                  type="text"
                  value={formData.referenceNumber || ''}
                  onChange={(e) => handleFieldChange('referenceNumber', e.target.value)}
                  placeholder="চুক্তিপত্র বা লোন একাউন্ট নম্বর"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Loan Financial & Installment Calculations */}
          <div className="bg-amber-50/50 rounded-2xl p-4 sm:p-5 border border-amber-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                <DollarSign size={16} />
                <span>২. ঋণের পরিমাণ, সুদ ও কিস্তির হিসাব</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManualInstallment(!isManualInstallment);
                  if (isManualInstallment) handleAutoCalculate();
                }}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1"
              >
                <Sparkles size={12} />
                {isManualInstallment ? 'অটো ক্যালকুলেশনে ফিরুন' : 'ম্যানুয়ালি কিস্তির টাকা লিখবেন?'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মোট ঋণের পরিমাণ (Loan Amount) ৳ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="any"
                  value={formData.principalAmount || ''}
                  onChange={(e) => handleFieldChange('principalAmount', Number(e.target.value))}
                  placeholder="যেমন: 500000"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-base font-black text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সুদের হার (Interest Rate %)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.interestRate ?? ''}
                    onChange={(e) => handleFieldChange('interestRate', Number(e.target.value))}
                    placeholder="যেমন: 9"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সুদের ধরন (Interest Type)
                </label>
                <select
                  value={formData.interestType || 'yearly'}
                  onChange={(e) => handleFieldChange('interestType', e.target.value as LoanInterestType)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="yearly">বার্ষিক সরল সুদ (Yearly Flat)</option>
                  <option value="monthly">মাসিক সুদ (Monthly)</option>
                  <option value="flat">ফিক্সড / ফ্ল্যাট সুদ (Flat)</option>
                  <option value="reducing">হ্রাসমান সুদ / EMI (Reducing Balance)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ঋণের মেয়াদ (Tenure in Months)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.loanTenure || ''}
                  onChange={(e) => handleFieldChange('loanTenure', Number(e.target.value))}
                  placeholder="যেমন: 12 বা 24"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  কিস্তির ব্যবধান (Frequency)
                </label>
                <select
                  value={formData.installmentFrequency || 'monthly'}
                  onChange={(e) => handleFieldChange('installmentFrequency', e.target.value as LoanInstallmentFrequency)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="monthly">মাসিক (Monthly)</option>
                  <option value="weekly">সাপ্তাহিক (Weekly)</option>
                  <option value="quarterly">ত্রৈমাসিক (Quarterly)</option>
                  <option value="yearly">বার্ষিক (Yearly)</option>
                  <option value="one_time">এককালীন (One Time)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ঋণ গ্রহণের তারিখ (Loan Date)
                </label>
                <input
                  type="date"
                  value={formData.loanDate || ''}
                  onChange={(e) => handleFieldChange('loanDate', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  প্রথম কিস্তির তারিখ (1st Payment Date)
                </label>
                <input
                  type="date"
                  value={formData.firstPaymentDate || ''}
                  onChange={(e) => handleFieldChange('firstPaymentDate', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  চূড়ান্ত মেয়াদ শেষ (Due Date)
                </label>
                <input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Calculated Result Ribbon */}
            <div className="mt-4 p-4 rounded-2xl bg-white border border-amber-300 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">মোট কিস্তি সংখ্যা</span>
                <span className="text-base font-black text-slate-800">{formData.totalInstallments || 0} টি</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">মোট প্রাক্কলিত সুদ</span>
                <span className="text-base font-black text-rose-600">{formatBDT(formData.totalInterest)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">মোট প্রদেয় (আসল + সুদ)</span>
                <span className="text-base font-black text-amber-700">{formatBDT(formData.totalPayable)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">প্রতি কিস্তিতে প্রদেয়</span>
                {isManualInstallment ? (
                  <input
                    type="number"
                    value={formData.installmentAmount || ''}
                    onChange={(e) => handleFieldChange('installmentAmount', Number(e.target.value))}
                    className="w-full text-center px-2 py-0.5 border border-amber-400 rounded-lg text-sm font-black text-emerald-700"
                  />
                ) : (
                  <span className="text-base font-black text-emerald-700">{formatBDT(formData.installmentAmount)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Collateral, Security, and Notes */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-black text-sm border-b border-slate-200 pb-2">
              <ShieldAlert size={16} />
              <span>৩. জামানত, ব্যাংক একাউন্ট ও চুক্তি শর্তাবলী</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  জামানত / বন্ধক বিবরণ (Collateral / Security)
                </label>
                <textarea
                  rows={2}
                  value={formData.collateralSecurity || ''}
                  onChange={(e) => handleFieldChange('collateralSecurity', e.target.value)}
                  placeholder="যেমন: জমির দলিল, ফিক্সড ডিপোজিট চেক, গ্যারান্টার বিবরণ ইত্যাদি"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নোট / বিশেষ শর্তাবলী (Notes / Terms)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="ঋণ সম্পর্কিত যেকোনো গুরুত্বপূর্ণ শর্ত বা তথ্য"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Document Upload */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
                <Paperclip size={16} />
                <span>৪. চুক্তিপত্র, ব্যাংক কাগজ ও রসিদ আপলোড (Document Attachments)</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">সর্বোচ্চ ৫ MB (PDF/ছবি)</span>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-200">
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="ডকুমেন্টের নাম (যেমন: চুক্তিপত্র বা চেক ছবি)"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="agreement">চুক্তিপত্র (Loan Agreement)</option>
                  <option value="bank_statement">ব্যাংক স্টেটমেন্ট (Statement)</option>
                  <option value="cheque">সিকিউরিটি চেক (Cheque Copy)</option>
                  <option value="collateral">জামানতের দলিল (Collateral Doc)</option>
                  <option value="receipt">রসিদ / ভাউচার (Receipt)</option>
                  <option value="other">অন্যান্য ফাইল (Other)</option>
                </select>
              </div>

              <div>
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                  <Upload size={14} />
                  <span>ফাইল নির্বাচন করুন</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-black text-slate-600 block">সংযুক্ত ফাইলসমূহ ({documents.length}টি):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{doc.type} • {doc.fileSize || 'Doc'} • {doc.uploadDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg"
                        >
                          দেখুন
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-100 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs sm:text-sm font-black shadow-lg shadow-amber-600/30 transition-all hover:scale-[1.01]"
            >
              <Save size={16} />
              <span>{isEdit ? 'আপডেট সংরক্ষণ করুন' : 'ঋণ সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
