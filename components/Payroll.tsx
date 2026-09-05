import React, { useState, useMemo } from 'react';
import { Staff, Payroll, AdvanceLoan, ExpenseReimbursement, Customer, CustomerLoan, Attendance, LeaveRequest, Expense, ShopSettings, PayrollPaymentRecord } from '../types';
import { 
  Banknote, FileText, Download, CheckCircle2, XCircle, 
  AlertCircle, Plus, Edit, Trash2, Check, X, Coins, Wallet,
  User, Users, Phone, MapPin, Sparkles, HandCoins, CreditCard, Clock,
  Printer, DollarSign, Calendar, Eye, ShieldCheck, History, ArrowUpRight, Scale
} from 'lucide-react';
import { AttendanceSalaryReport } from './AttendanceSalaryReport';
import { PayrollReasonReport } from './PayrollReasonReport';

interface PayrollProps {
  staff: Staff[];
  customers?: Customer[];
  payrolls: Payroll[];
  onUpdatePayrolls: (data: Payroll[]) => void;
  loans: AdvanceLoan[];
  onUpdateLoans: (data: AdvanceLoan[]) => void;
  customerLoans?: CustomerLoan[];
  onUpdateCustomerLoans?: (data: CustomerLoan[]) => void;
  reimbursements: ExpenseReimbursement[];
  onUpdateReimbursements: (data: ExpenseReimbursement[]) => void;
  attendances?: Attendance[];
  leaves?: LeaveRequest[];
  onAddExpense?: (expense: Partial<Expense>) => void;
  shopSettings?: ShopSettings | null;
  isAdmin: boolean;
  currentStaff: Staff | null;
}

const PayrollModule: React.FC<PayrollProps> = ({ 
  staff, 
  customers = [],
  payrolls, 
  onUpdatePayrolls, 
  loans, 
  onUpdateLoans, 
  customerLoans = [],
  onUpdateCustomerLoans,
  reimbursements, 
  onUpdateReimbursements, 
  attendances = [],
  leaves = [],
  onAddExpense,
  shopSettings,
  isAdmin, 
  currentStaff 
}) => {
  const [activeTab, setActiveTab] = useState<'reason_report' | 'attendance_salary' | 'salary' | 'loans' | 'expenses'>('reason_report');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Pay Modal & Slip Modal for Quick Payroll
  const [payingPayroll, setPayingPayroll] = useState<Payroll | null>(null);
  const [payingStaff, setPayingStaff] = useState<Staff | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState<string>('');
  const [payVoucherNo, setPayVoucherNo] = useState<string>('');
  const [selectedPayslip, setSelectedPayslip] = useState<{ payroll: Payroll; staff: Staff } | null>(null);

  const [loanForm, setLoanForm] = useState<Partial<AdvanceLoan>>({ 
    applicantType: 'customer',
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    loanType: 'advance',
    amount: 0, 
    reason: '', 
    installmentAmount: 0,
    disbursedMethod: 'Cash',
    dueDate: ''
  });
  const [expenseForm, setExpenseForm] = useState<Partial<ExpenseReimbursement>>({ amount: 0, reason: '' });

  const getLocalToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(Date.now() - offset).toISOString().split('T')[0];
  };

  const today = getLocalToday();

  // Salary Generation Logic
  const generatePayroll = () => {
    if (!isAdmin) return;
    const newPayrolls = staff.map(s => {
      const existing = payrolls.find(p => p.staffId === s.id && p.month === selectedMonth);
      if (existing) return existing;

      const basic = s.salaryStructure?.basic || 15000;
      const travel = s.salaryStructure?.travelAllowance || 0;
      const food = s.salaryStructure?.foodAllowance || 0;
      const mobile = s.salaryStructure?.mobileAllowance || 0;
      const houseRent = s.salaryStructure?.houseRentAllowance || 0;
      const medical = s.salaryStructure?.medicalAllowance || 0;
      const special = s.salaryStructure?.specialAllowance || 0;
      const otherAllow = s.salaryStructure?.otherAllowance || 0;
      const fixedBonus = s.salaryStructure?.fixedBonus || 0;
      const pfDeduction = s.salaryStructure?.providentFundDeduction || 0;
      const taxDeduction = s.salaryStructure?.taxDeduction || 0;

      const allowances = travel + food + mobile + houseRent + medical + special + otherAllow + fixedBonus;
      const commission = 0;
      const bonus = 0;
      const overtime = 0;
      
      // Calculate active loan installments
      const activeLoans = loans.filter(l => l.staffId === s.id && l.status === 'Approved' && l.remainingAmount > 0);
      const loanDeduction = activeLoans.reduce((sum, l) => sum + Math.min(l.installmentAmount || 0, l.remainingAmount), 0);
      const deductions = loanDeduction + pfDeduction + taxDeduction;

      const netSalary = Math.max(0, basic + allowances + commission + bonus + overtime - deductions);

      return {
        id: `PAY-${s.id}-${selectedMonth}`,
        staffId: s.id,
        month: selectedMonth,
        basic,
        allowances,
        travelAllowance: travel,
        travelAllowanceReason: s.salaryStructure?.travelAllowanceReason,
        foodAllowance: food,
        foodAllowanceReason: s.salaryStructure?.foodAllowanceReason,
        mobileAllowance: mobile,
        mobileAllowanceReason: s.salaryStructure?.mobileAllowanceReason,
        houseRentAllowance: houseRent,
        houseRentReason: s.salaryStructure?.houseRentReason,
        medicalAllowance: medical,
        medicalReason: s.salaryStructure?.medicalReason,
        specialAllowance: special,
        specialReason: s.salaryStructure?.specialReason,
        providentFundDeduction: pfDeduction,
        taxDeduction: taxDeduction,
        commission,
        bonus,
        overtime,
        deductions,
        netSalary,
        status: 'Draft' as const,
        paidAmount: 0,
        dueAmount: netSalary,
        payments: []
      };
    });

    const updatedPayrolls = [...payrolls.filter(p => p.month !== selectedMonth), ...newPayrolls];
    onUpdatePayrolls(updatedPayrolls);
  };

  const handleOpenPayModal = (p: Payroll) => {
    const member = staff.find(s => s.id === p.staffId);
    if (!member) return;
    setPayingPayroll(p);
    setPayingStaff(member);
    const due = p.dueAmount !== undefined ? p.dueAmount : (p.status === 'Paid' ? 0 : p.netSalary);
    setPayAmount(due > 0 ? due : p.netSalary);
    setPayMethod(member.bkashNo ? 'bKash' : (member.bankAccountNo ? 'Bank' : 'Cash'));
    setPayDate(today);
    setPayVoucherNo(`SAL-${Date.now().toString().slice(-6)}`);
    setPayNote(`${selectedMonth} মাসের বেতন পরিশোধ`);
  };

  const handleConfirmPaySalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayroll || !payingStaff || !isAdmin) return;
    if (payAmount <= 0) {
      alert('সঠিক টাকার পরিমাণ দিন');
      return;
    }

    // 1. Update loan remaining amounts if any deduction
    const activeLoans = loans.filter(l => l.staffId === payingPayroll.staffId && l.status === 'Approved' && l.remainingAmount > 0);
    const updatedLoansDelta: AdvanceLoan[] = [];
    activeLoans.forEach(l => {
      const deduction = Math.min(l.installmentAmount || 0, l.remainingAmount);
      if (deduction > 0) {
        updatedLoansDelta.push({ 
          ...l, 
          remainingAmount: Math.max(0, l.remainingAmount - deduction), 
          status: l.remainingAmount - deduction <= 0 ? 'Paid' : 'Approved' 
        });
      }
    });
    if (updatedLoansDelta.length > 0) {
      onUpdateLoans(updatedLoansDelta);
    }

    // 2. Create Payment Record
    const newPaymentRecord: PayrollPaymentRecord = {
      id: `RCP-${Date.now()}`,
      amount: payAmount,
      date: payDate,
      method: payMethod,
      note: payNote || `${selectedMonth} মাসের বেতন বাবদ`,
      paidBy: currentStaff?.name || 'Admin'
    };

    const previousPayments = payingPayroll.payments || (payingPayroll.paidAmount ? [{
      id: `RCP-PREV-${payingPayroll.id}`,
      amount: payingPayroll.paidAmount,
      date: payingPayroll.paymentDate || payDate,
      method: payingPayroll.paymentMethod || 'Cash',
      note: 'পূর্ববর্তী পরিশোধ'
    }] : []);

    const updatedPayments = [newPaymentRecord, ...previousPayments];
    const newTotalPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const newDue = Math.max(0, payingPayroll.netSalary - newTotalPaid);
    const newStatus: 'Draft' | 'Paid' | 'Partial' = newTotalPaid >= payingPayroll.netSalary ? 'Paid' : 'Partial';

    const updatedPayroll: Payroll = {
      ...payingPayroll,
      status: newStatus,
      paymentDate: payDate,
      paidAmount: newTotalPaid,
      dueAmount: newDue,
      paymentMethod: payMethod,
      note: payNote,
      payments: updatedPayments
    };

    onUpdatePayrolls([
      ...payrolls.filter(p => p.id !== payingPayroll.id),
      updatedPayroll
    ]);

    // 3. Automatically record in shop Expenses
    if (onAddExpense) {
      onAddExpense({
        id: `EXP-SAL-${Date.now()}`,
        amount: payAmount,
        category: 'কর্মচারী বেতন',
        description: `${payingStaff.name} - এর ${selectedMonth} মাসের বেতন পরিশোধ [ভাউচার: ${payVoucherNo}] (${payMethod})`,
        date: payDate
      });
    }

    alert(`✅ ${payingStaff.name}-কে ৳${payAmount.toLocaleString('en-IN')} বেতন সফলভাবে পরিশোধ করা হয়েছে!`);
    setPayingPayroll(null);
    setPayingStaff(null);
  };

  // Loan Logic
  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff && !isAdmin) {
      alert("আবেদন করতে অনুগ্রহ করে লগইন করুন।");
      return;
    }

    const isCustomer = loanForm.applicantType === 'customer';
    let customerName = (loanForm.customerName || '').trim();
    let customerPhone = (loanForm.customerPhone || '').trim();
    let customerAddress = (loanForm.customerAddress || '').trim();
    let customerId = loanForm.customerId;

    if (isCustomer) {
      if (loanForm.customerId) {
        const found = customers.find(c => c.id === loanForm.customerId);
        if (found) {
          customerName = found.name;
          customerPhone = found.phone;
          customerAddress = found.address || '';
        }
      }
      if (!customerName) {
        alert("অনুগ্রহ করে কাস্টমারের নাম নির্বাচন অথবা লিখুন।");
        return;
      }
    }

    const parsedAmount = parseFloat(String(loanForm.amount || 0));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("অনুগ্রহ করে সঠিক টাকার পরিমাণ প্রদান করুন।");
      return;
    }

    const parsedInstallment = parseFloat(String(loanForm.installmentAmount || 0)) || 0;

    const newLoan: AdvanceLoan = {
      id: `LOAN-${Date.now()}`,
      staffId: isCustomer ? (currentStaff?.id || 'admin') : (loanForm.staffId || currentStaff?.id || 'admin'),
      applicantType: loanForm.applicantType || 'customer',
      customerId: isCustomer ? (customerId || `WALK-IN-${Date.now()}`) : undefined,
      customerName: isCustomer ? customerName : undefined,
      customerPhone: isCustomer ? customerPhone : undefined,
      customerAddress: isCustomer ? customerAddress : undefined,
      loanType: loanForm.loanType || 'advance',
      amount: parsedAmount,
      date: today,
      dueDate: loanForm.dueDate || undefined,
      disbursedMethod: loanForm.disbursedMethod || 'Cash',
      reason: loanForm.reason || (isCustomer ? `${customerName}-এর জন্য ${loanForm.loanType === 'advance' ? 'অগ্রিম' : 'লোন'}` : 'ব্যক্তিগত লোন'),
      status: 'Pending',
      remainingAmount: parsedAmount,
      installmentAmount: parsedInstallment
    };

    onUpdateLoans([newLoan]);

    // If it's a customer loan, also create in CustomerLoans so it appears across CRM & Due payments seamlessly
    if (isCustomer && onUpdateCustomerLoans) {
      const synCustomerLoan: CustomerLoan = {
        id: `CLOAN-${Date.now()}`,
        loanNo: `${loanForm.loanType === 'advance' ? 'ADV' : 'LN'}-${Date.now().toString().slice(-6)}`,
        customerId: customerId || `WALK-IN-${Date.now()}`,
        customerName,
        customerPhone,
        customerAddress,
        type: loanForm.loanType || 'advance',
        amount: parsedAmount,
        remainingAmount: parsedAmount,
        installmentAmount: parsedInstallment > 0 ? parsedInstallment : undefined,
        date: today,
        dueDate: loanForm.dueDate || undefined,
        disbursedMethod: loanForm.disbursedMethod || 'Cash',
        purpose: loanForm.reason || `${loanForm.loanType === 'advance' ? 'পণ্য সরবরাহ/ব্যবসার অগ্রিম আবেদন' : 'ব্যবসায়িক ঋণ/লোন আবেদন'}`,
        status: 'active',
        repayments: [],
        notes: '',
        addedBy: currentStaff?.id,
        approvedByName: currentStaff?.name || 'Admin'
      };
      onUpdateCustomerLoans([synCustomerLoan]);
    }

    alert(`সফলভাবে ${isCustomer ? `কাস্টমার (${customerName})` : 'স্টাফ'}-এর জন্য ${loanForm.loanType === 'advance' ? 'অগ্রিম' : 'লোন'} আবেদন জমা দেওয়া হয়েছে!`);
    setShowLoanModal(false);
    setLoanForm({ 
      applicantType: 'customer',
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      loanType: 'advance',
      amount: 0, 
      reason: '', 
      installmentAmount: 0,
      disbursedMethod: 'Cash',
      dueDate: ''
    });
  };

  const handleLoanAction = (id: string, status: 'Approved' | 'Rejected') => {
    const target = loans.find(l => l.id === id);
    if (target) {
      onUpdateLoans([{ ...target, status }]);
    }
  };

  // Expense Logic
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff) return;
    const newExpense: ExpenseReimbursement = {
      ...expenseForm as ExpenseReimbursement,
      id: `EXP-${Date.now()}`,
      staffId: currentStaff.id,
      date: today,
      status: 'Pending'
    };
    onUpdateReimbursements([newExpense]);
    setShowExpenseModal(false);
    setExpenseForm({ amount: 0, reason: '' });
  };

  const handleExpenseAction = (id: string, status: 'Approved' | 'Rejected') => {
    const target = reimbursements.find(r => r.id === id);
    if (target) {
      onUpdateReimbursements([{ ...target, status }]);
    }
  };

  const displayPayrolls = useMemo(() => {
    let list = payrolls.filter(p => p.month === selectedMonth);
    if (!isAdmin) list = list.filter(p => p.staffId === currentStaff?.id);
    return list;
  }, [payrolls, selectedMonth, isAdmin, currentStaff]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-emerald-500 p-4 rounded-[28px] text-white shadow-2xl shadow-emerald-500/20">
             <Banknote size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">পেরোল ও বেতন</h2>
            <p className="text-slate-500 font-bold text-xs mt-1 uppercase tracking-widest flex items-center gap-2">
              <Wallet size={14} className="text-emerald-500"/> হাজিরাভিত্তিক বেতন হিসাব, পেমেন্ট ও অর্থ ব্যবস্থাপনা
            </p>
          </div>
        </div>
        
        <div className="flex bg-white p-2 rounded-[28px] border-2 border-slate-100 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar gap-1">
          {[
            { id: 'reason_report', label: 'কারণসহ পূর্ণাঙ্গ রিপোর্ট', icon: Scale },
            { id: 'attendance_salary', label: 'হাজিরাভিত্তিক বেতন ও পে', icon: Banknote },
            { id: 'salary', label: 'পেরোল তালিকা', icon: FileText },
            { id: 'loans', label: 'অগ্রিম ও লোন', icon: Coins },
            { id: 'expenses', label: 'খরচ পুনঃপরিশোধ', icon: DollarSign }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`whitespace-nowrap flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 0: REASON-WISE COMPREHENSIVE PAYROLL REPORT (সকল কারণসহ পূর্ণাঙ্গ রিপোর্ট) */}
      {activeTab === 'reason_report' && (
        <PayrollReasonReport
          staff={staff}
          payrolls={payrolls}
          onUpdatePayrolls={onUpdatePayrolls}
          loans={loans}
          attendances={attendances}
          leaves={leaves}
          onAddExpense={onAddExpense}
          shopSettings={shopSettings}
          isAdmin={isAdmin}
          currentStaff={currentStaff}
        />
      )}

      {/* TAB 1: ATTENDANCE BASED SALARY REPORT (বেতন হিসাব ও পেমেন্ট সিস্টেম) */}
      {activeTab === 'attendance_salary' && (
        <AttendanceSalaryReport 
          staff={staff}
          attendances={attendances}
          leaves={leaves}
          payrolls={payrolls}
          onUpdatePayrolls={onUpdatePayrolls}
          onAddExpense={onAddExpense}
          shopSettings={shopSettings}
          isAdmin={isAdmin}
          currentStaff={currentStaff}
        />
      )}

      {/* TAB 2: MONTHLY PAYROLL OVERVIEW */}
      {activeTab === 'salary' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-[36px] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">মাস নির্বাচন করুন</label>
                <input 
                  type="month" 
                  className="border-2 border-slate-100 rounded-2xl px-4 py-3 font-black text-sm bg-slate-50 outline-none focus:border-emerald-500 text-slate-900" 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)} 
                />
              </div>
              {isAdmin && (
                <div className="pt-5">
                  <button 
                    onClick={generatePayroll} 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Sparkles size={16} /> নতুন মাসের পেরোল তৈরি
                  </button>
                </div>
              )}
            </div>
            <div className="text-right flex items-center gap-6 bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">মোট নেট প্রদেয়</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">৳{displayPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0).toLocaleString('en-IN')}</h3>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">মোট পরিশোধিত</p>
                <h3 className="text-2xl font-black text-emerald-600 tracking-tighter">৳{displayPayrolls.reduce((sum, p) => sum + (p.paidAmount || (p.status === 'Paid' ? p.netSalary : 0)), 0).toLocaleString('en-IN')}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[36px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-[2px] border-b-2">
                  <tr>
                    <th className="p-6">স্টাফ মেম্বার</th>
                    <th className="p-6 text-right">মূল বেতন</th>
                    <th className="p-6 text-right">ভাতা (Allowances)</th>
                    <th className="p-6 text-right">কর্তন (Deductions)</th>
                    <th className="p-6 text-right">নেট বেতন</th>
                    <th className="p-6 text-right">পরিশোধিত</th>
                    <th className="p-6 text-right">বকেয়া</th>
                    <th className="p-6 text-center">স্ট্যাটাস</th>
                    <th className="p-6 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayPayrolls.map(payroll => {
                    const member = staff.find(s => s.id === payroll.staffId);
                    const paidAmt = payroll.paidAmount !== undefined ? payroll.paidAmount : (payroll.status === 'Paid' ? payroll.netSalary : 0);
                    const dueAmt = Math.max(0, payroll.netSalary - paidAmt);
                    const isPaid = paidAmt >= payroll.netSalary && payroll.netSalary > 0;
                    const isPartial = paidAmt > 0 && paidAmt < payroll.netSalary;
                    const statusBN = isPaid ? 'পরিশোধিত' : isPartial ? 'আংশিক পরিশোধ' : 'বকেয়া';

                    return (
                      <tr key={payroll.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-6">
                          <div className="font-black text-slate-900 text-sm uppercase">{member?.name || 'Unknown'}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{member?.designation || 'Staff'} • {member?.phone}</div>
                        </td>
                        <td className="p-6 font-black text-slate-600 text-xs text-right">৳{payroll.basic.toLocaleString('en-IN')}</td>
                        <td className="p-6 font-black text-emerald-600 text-xs text-right">+৳{(payroll.allowances || 0).toLocaleString('en-IN')}</td>
                        <td className="p-6 font-black text-rose-600 text-xs text-right">-৳{(payroll.deductions || 0).toLocaleString('en-IN')}</td>
                        <td className="p-6 font-black text-slate-900 text-sm text-right">৳{payroll.netSalary.toLocaleString('en-IN')}</td>
                        <td className="p-6 font-black text-emerald-700 text-xs text-right">৳{paidAmt.toLocaleString('en-IN')}</td>
                        <td className="p-6 font-black text-rose-600 text-xs text-right">৳{dueAmt.toLocaleString('en-IN')}</td>
                        <td className="p-6 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPaid ? 'bg-emerald-100 text-emerald-800' : 
                            isPartial ? 'bg-amber-100 text-amber-800' : 
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {statusBN}
                          </span>
                        </td>
                        <td className="p-6 text-center">
                          <div className="flex justify-center items-center gap-2">
                            {isAdmin && (
                              <button 
                                onClick={() => handleOpenPayModal(payroll)} 
                                className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                                  isPaid 
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                                }`} 
                                title="বেতন পরিশোধ করুন (Pay)"
                              >
                                <DollarSign size={14}/> {isPaid ? 'পেমেন্ট' : 'পে (Pay)'}
                              </button>
                            )}
                            {member && (
                              <button 
                                onClick={() => setSelectedPayslip({ payroll, staff: member })} 
                                className="p-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all" 
                                title="পে-স্লিপ দেখুন ও প্রিন্ট করুন"
                              >
                                <Printer size={16}/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {displayPayrolls.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs">
                        নির্বাচিত মাসের জন্য কোন পেরোল ডেটা নেই। উপরে 'নতুন মাসের পেরোল তৈরি' বাটনে চাপুন।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Coins className="text-emerald-500" size={22}/> অগ্রিম এবং লোন ব্যবস্থাপনা
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">কাস্টমার ও স্টাফদের অগ্রিম ও লোন আবেদন এবং অনুমোদন</p>
            </div>
            <button 
              onClick={() => {
                setLoanForm({
                  applicantType: 'customer',
                  customerId: '',
                  customerName: '',
                  customerPhone: '',
                  customerAddress: '',
                  loanType: 'advance',
                  amount: 0,
                  reason: '',
                  installmentAmount: 0,
                  disbursedMethod: 'Cash',
                  dueDate: ''
                });
                setShowLoanModal(true);
              }} 
              className="bg-emerald-500 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center gap-2 active:scale-95 transition-all hover:bg-emerald-600"
            >
              <Plus size={18}/> অগ্রিম / লোনের আবেদন
            </button>
          </div>

          <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-[2px] border-b-2">
                  <tr>
                    <th className="p-6">আবেদনকারী / কাস্টমার</th>
                    <th className="p-6 text-center">ধরন</th>
                    <th className="p-6 text-right">পরিমাণ</th>
                    <th className="p-6 text-right">কিস্তি</th>
                    <th className="p-6 text-right">অবশিষ্ট</th>
                    <th className="p-6">কারণ</th>
                    <th className="p-6 text-center">স্ট্যাটাস</th>
                    {isAdmin && <th className="p-6 text-center">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(isAdmin ? loans : loans.filter(l => l.staffId === currentStaff?.id || l.applicantType === 'customer')).map(loan => {
                    const isCustomer = loan.applicantType === 'customer' || !!loan.customerName;
                    const member = staff.find(s => s.id === loan.staffId);
                    const displayName = isCustomer ? (loan.customerName || 'অনিবন্ধিত কাস্টমার') : (member?.name || 'স্টাফ মেম্বার');
                    const displayPhone = isCustomer ? loan.customerPhone : member?.phone;
                    const statusBN = loan.status === 'Approved' ? 'অনুমোদিত' : loan.status === 'Rejected' ? 'প্রত্যাখ্যাত' : loan.status === 'Paid' ? 'পরিশোধিত' : 'অপেক্ষমান';
                    
                    return (
                      <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white ${
                              isCustomer ? 'bg-indigo-600 shadow-indigo-200 shadow-md' : 'bg-emerald-600 shadow-emerald-200 shadow-md'
                            }`}>
                              {isCustomer ? <User size={18}/> : <Users size={18}/>}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-sm uppercase">{displayName}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                                  isCustomer ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {isCustomer ? 'কাস্টমার' : 'স্টাফ'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2 mt-0.5">
                                <span>{loan.date}</span>
                                {displayPhone && <span>• {displayPhone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                            loan.loanType === 'loan' 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {loan.loanType === 'loan' ? 'ঋণ / লোন' : 'অগ্রিম'}
                          </span>
                        </td>
                        <td className="p-6 font-black text-slate-900 text-xs text-right">৳{loan.amount.toLocaleString()}</td>
                        <td className="p-6 font-black text-slate-600 text-xs text-right">{loan.installmentAmount ? `৳${loan.installmentAmount.toLocaleString()}` : '-'}</td>
                        <td className="p-6 font-black text-rose-600 text-xs text-right">৳{loan.remainingAmount.toLocaleString()}</td>
                        <td className="p-6 text-xs text-slate-500 max-w-[200px] truncate" title={loan.reason}>{loan.reason}</td>
                        <td className="p-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            loan.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 
                            loan.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 
                            loan.status === 'Paid' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 
                            'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}>
                            {statusBN}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-6 text-center">
                            {loan.status === 'Pending' && (
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => handleLoanAction(loan.id, 'Approved')} 
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 hover:scale-105 transition-all shadow-sm" 
                                  title="অনুমোদন করুন"
                                >
                                  <Check size={16}/>
                                </button>
                                <button 
                                  onClick={() => handleLoanAction(loan.id, 'Rejected')} 
                                  className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 hover:scale-105 transition-all shadow-sm" 
                                  title="প্রত্যাখ্যান করুন"
                                >
                                  <X size={16}/>
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {loans.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs">
                        কোনো অগ্রিম বা লোনের আবেদন পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">খরচ পুনঃপরিশোধ (Expense Reimbursement)</h3>
            <button onClick={() => setShowExpenseModal(true)} className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center gap-2 active:scale-95 transition-all">
              <Plus size={18}/> খরচ জমা দিন
            </button>
          </div>

          <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-[2px] border-b-2">
                  <tr>
                    <th className="p-6">স্টাফ মেম্বার</th>
                    <th className="p-6 text-right">পরিমাণ</th>
                    <th className="p-6">কারণ</th>
                    <th className="p-6 text-center">স্ট্যাটাস</th>
                    {isAdmin && <th className="p-6 text-center">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(isAdmin ? reimbursements : reimbursements.filter(r => r.staffId === currentStaff?.id)).map(exp => {
                    const member = staff.find(s => s.id === exp.staffId);
                    const statusBN = exp.status === 'Approved' ? 'অনুমোদিত' : exp.status === 'Rejected' ? 'প্রত্যাখ্যাত' : exp.status === 'Paid' ? 'পরিশোধিত' : 'অপেক্ষমান';
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6">
                          <div className="font-black text-slate-800 text-sm uppercase">{member?.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{exp.date}</div>
                        </td>
                        <td className="p-6 font-black text-slate-600 text-xs text-right">৳{exp.amount.toLocaleString()}</td>
                        <td className="p-6 text-xs text-slate-500 max-w-[300px] truncate">{exp.reason}</td>
                        <td className="p-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${exp.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : exp.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : exp.status === 'Paid' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                            {statusBN}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-6 text-center">
                            {exp.status === 'Pending' && (
                              <div className="flex justify-center gap-2">
                                <button onClick={() => handleExpenseAction(exp.id, 'Approved')} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100"><Check size={16}/></button>
                                <button onClick={() => handleExpenseAction(exp.id, 'Rejected')} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100"><X size={16}/></button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Advance / Loan Application Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[36px] p-6 sm:p-8 shadow-2xl animate-in zoom-in duration-300 my-8 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Coins className="text-emerald-500" size={24}/> অগ্রিম / লোনের আবেদন
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">কাস্টমার অথবা স্টাফের জন্য নতুন অগ্রিম/লোন আবেদন করুন</p>
              </div>
              <button 
                onClick={() => setShowLoanModal(false)} 
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center text-slate-400 transition-colors"
              >
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleLoanSubmit} className="space-y-5">
              {/* Applicant Type Selection */}
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                  আবেদনকারী নির্বাচন করুন *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLoanForm(prev => ({
                        ...prev,
                        applicantType: 'customer',
                        staffId: '',
                        customerId: '',
                        customerName: '',
                        customerPhone: '',
                        customerAddress: ''
                      }));
                    }}
                    className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all ${
                      loanForm.applicantType === 'customer'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/25 scale-[1.02]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <User size={16}/> কাস্টমার (Customer)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoanForm(prev => ({
                        ...prev,
                        applicantType: 'staff',
                        customerId: '',
                        customerName: '',
                        customerPhone: '',
                        customerAddress: '',
                        staffId: currentStaff?.id || (staff[0]?.id || '')
                      }));
                    }}
                    className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all ${
                      loanForm.applicantType === 'staff'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 scale-[1.02]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Users size={16}/> স্টাফ (Staff)
                  </button>
                </div>
              </div>

              {/* If Customer Applicant */}
              {loanForm.applicantType === 'customer' && (
                <div className="p-4 bg-indigo-50/70 border-2 border-indigo-100 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 text-indigo-900 font-black text-xs uppercase tracking-wider">
                    <User size={16} className="text-indigo-600"/> কাস্টমারের তথ্য
                  </div>

                  {/* Registered Customer Quick Select */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      তালিকা থেকে কাস্টমার নির্বাচন (ঐচ্ছিক)
                    </label>
                    <select
                      className="w-full border-2 border-indigo-100 rounded-2xl p-3.5 font-bold text-xs bg-white text-slate-800 outline-none focus:border-indigo-500"
                      value={loanForm.customerId || ''}
                      onChange={e => {
                        const custId = e.target.value;
                        const selected = customers.find(c => c.id === custId);
                        if (selected) {
                          setLoanForm(prev => ({
                            ...prev,
                            customerId: selected.id,
                            customerName: selected.name,
                            customerPhone: selected.phone || '',
                            customerAddress: selected.address || ''
                          }));
                        } else {
                          setLoanForm(prev => ({
                            ...prev,
                            customerId: '',
                            customerName: '',
                            customerPhone: '',
                            customerAddress: ''
                          }));
                        }
                      }}
                    >
                      <option value="">-- তালিকা থেকে কাস্টমার বেছে নিন অথবা নিচে নাম লিখুন --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone || 'ফোন নেই'}) {c.dueAmount ? `- পূর্বের বাকি: ৳${c.dueAmount.toLocaleString()}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Customer Name Input */}
                  <div>
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest block mb-1">
                      কাস্টমারের নাম *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="কাস্টমারের পূর্ণ নাম লিখুন"
                      className="w-full border-2 border-indigo-100 rounded-2xl p-3.5 font-bold text-sm bg-white text-slate-900 outline-none focus:border-indigo-500"
                      value={loanForm.customerName || ''}
                      onChange={e => setLoanForm(prev => ({ ...prev, customerName: e.target.value }))}
                    />
                  </div>

                  {/* Customer Phone & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                        মোবাইল নম্বর
                      </label>
                      <input
                        type="text"
                        placeholder="01XXXXXXXXX"
                        className="w-full border-2 border-indigo-100 rounded-2xl p-3 font-bold text-xs bg-white text-slate-800 outline-none focus:border-indigo-500"
                        value={loanForm.customerPhone || ''}
                        onChange={e => setLoanForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                        ঠিকানা
                      </label>
                      <input
                        type="text"
                        placeholder="কাস্টমারের ঠিকানা"
                        className="w-full border-2 border-indigo-100 rounded-2xl p-3 font-bold text-xs bg-white text-slate-800 outline-none focus:border-indigo-500"
                        value={loanForm.customerAddress || ''}
                        onChange={e => setLoanForm(prev => ({ ...prev, customerAddress: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* If Staff Applicant */}
              {loanForm.applicantType === 'staff' && (
                <div className="p-4 bg-emerald-50/70 border-2 border-emerald-100 rounded-3xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-xs uppercase tracking-wider">
                    <Users size={16} className="text-emerald-600"/> স্টাফ মেম্বার নির্বাচন
                  </div>
                  {isAdmin ? (
                    <select
                      className="w-full border-2 border-emerald-100 rounded-2xl p-3.5 font-bold text-xs bg-white text-slate-800 outline-none focus:border-emerald-500"
                      value={loanForm.staffId || currentStaff?.id || ''}
                      onChange={e => setLoanForm(prev => ({ ...prev, staffId: e.target.value }))}
                    >
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.designation}) - {s.phone}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-white rounded-2xl border border-emerald-100 font-black text-xs text-slate-800">
                      {currentStaff?.name} ({currentStaff?.designation})
                    </div>
                  )}
                </div>
              )}

              {/* Loan vs Advance Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    আবেদনের ধরন *
                  </label>
                  <select
                    className="w-full border-2 border-slate-100 rounded-2xl p-3.5 font-bold text-xs bg-slate-50 text-slate-800 outline-none focus:border-emerald-500"
                    value={loanForm.loanType || 'advance'}
                    onChange={e => setLoanForm(prev => ({ ...prev, loanType: e.target.value as 'advance' | 'loan' }))}
                  >
                    <option value="advance">অগ্রিম (Advance)</option>
                    <option value="loan">ঋণ / লোন (Loan)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    প্রদানের মাধ্যম
                  </label>
                  <select
                    className="w-full border-2 border-slate-100 rounded-2xl p-3.5 font-bold text-xs bg-slate-50 text-slate-800 outline-none focus:border-emerald-500"
                    value={loanForm.disbursedMethod || 'Cash'}
                    onChange={e => setLoanForm(prev => ({ ...prev, disbursedMethod: e.target.value }))}
                  >
                    <option value="Cash">ক্যাশ (Cash)</option>
                    <option value="bKash">বিকাশ (bKash)</option>
                    <option value="Nagad">নগদ (Nagad)</option>
                    <option value="Rocket">রকেট (Rocket)</option>
                    <option value="Bank">ব্যাংক ট্রান্সফার (Bank)</option>
                  </select>
                </div>
              </div>

              {/* Amount and Installment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    টাকার পরিমাণ (৳) *
                  </label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    placeholder="0"
                    className="w-full border-2 border-slate-100 rounded-2xl p-3.5 font-black text-xl text-emerald-600 bg-slate-50 outline-none focus:border-emerald-500" 
                    value={loanForm.amount || ''} 
                    onChange={e => setLoanForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    প্রস্তাবিত কিস্তি (৳) (ঐচ্ছিক)
                  </label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full border-2 border-slate-100 rounded-2xl p-3.5 font-black text-sm bg-slate-50 outline-none focus:border-emerald-500" 
                    value={loanForm.installmentAmount || ''} 
                    onChange={e => setLoanForm(prev => ({ ...prev, installmentAmount: parseFloat(e.target.value) || 0 }))} 
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  পরিশোধের সম্ভাব্য শেষ তারিখ (Due Date)
                </label>
                <input
                  type="date"
                  className="w-full border-2 border-slate-100 rounded-2xl p-3.5 font-bold text-xs bg-slate-50 text-slate-800 outline-none focus:border-emerald-500"
                  value={loanForm.dueDate || ''}
                  onChange={e => setLoanForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>

              {/* Purpose / Reason */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  আবেদনের কারণ ও বিবরণ
                </label>
                <textarea 
                  rows={2} 
                  className="w-full border-2 border-slate-100 rounded-2xl p-3.5 font-bold text-xs bg-slate-50 outline-none focus:border-emerald-500 text-slate-800" 
                  value={loanForm.reason || ''} 
                  onChange={e => setLoanForm(prev => ({ ...prev, reason: e.target.value }))} 
                  placeholder="যেমন: ব্যবসা সম্প্রসারণ, জরুরি মালামাল ক্রয়, ইত্যাদি..."
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Check size={18}/> আবেদন জমা দিন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">খরচ জমা দিন</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">পরিমাণ (৳)</label>
                <input type="number" required className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-xl text-emerald-600 bg-slate-50 outline-none mt-2" value={expenseForm.amount || ''} onChange={e => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">বিবরণ</label>
                <textarea required rows={3} className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2" value={expenseForm.reason} onChange={e => setExpenseForm({...expenseForm, reason: e.target.value})} placeholder="খরচের বিবরণ লিখুন..."></textarea>
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                খরচ জমা দিন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK SALARY PAY MODAL (বেতন পরিশোধ পপআপ) */}
      {/* ========================================================================= */}
      {payingPayroll && payingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 shadow-2xl border-2 border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                  <Banknote size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">বেতন পরিশোধ (Pay Salary)</h4>
                  <p className="text-xs font-bold text-slate-500">{selectedMonth} মাস</p>
                </div>
              </div>
              <button 
                onClick={() => { setPayingPayroll(null); setPayingStaff(null); }}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Employee Card */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-3xl my-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-black">{payingStaff.name}</div>
                  <div className="text-xs text-cyan-300 font-bold">
                    {payingStaff.designation} • {payingStaff.phone}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-indigo-300">নেট বেতন</span>
                  <div className="text-base font-black text-white">
                    ৳{payingPayroll.netSalary.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">পরিশোধিত:</span>
                  <span className="font-black text-emerald-400">
                    ৳{(payingPayroll.paidAmount || (payingPayroll.status === 'Paid' ? payingPayroll.netSalary : 0)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">অবশিষ্ট বকেয়া:</span>
                  <span className="font-black text-rose-300">
                    ৳{(payingPayroll.dueAmount !== undefined ? payingPayroll.dueAmount : (payingPayroll.status === 'Paid' ? 0 : payingPayroll.netSalary)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Pay Form */}
            <form onSubmit={handleConfirmPaySalary} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  প্রদেয় টাকার পরিমাণ (৳) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border-2 border-emerald-500/40 rounded-2xl py-3 px-4 text-emerald-700 text-xl font-black focus:outline-none focus:border-emerald-600 focus:bg-white transition-all pl-9"
                    placeholder="0"
                  />
                  <span className="absolute left-3.5 top-3.5 text-emerald-700 font-black text-lg">৳</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">পেমেন্ট মাধ্যম *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Cash">ক্যাশ (Cash)</option>
                    <option value="bKash">বিকাশ (bKash)</option>
                    <option value="Nagad">নগদ (Nagad)</option>
                    <option value="Rocket">রকেট (Rocket)</option>
                    <option value="Bank">ব্যাংক ট্রান্সফার (Bank)</option>
                    <option value="Upay">উপায় (Upay)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">পরিশোধের তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">নোট / মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="যেমন: মার্চ মাসের বেতন পরিশোধ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/60 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>পেমেন্ট নিশ্চিত করলে স্বয়ংক্রিয়ভাবে দোকানের খরচ লেজারে এন্ট্রি যুক্ত হবে।</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setPayingPayroll(null); setPayingStaff(null); }}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <DollarSign size={16} />
                  পেমেন্ট নিশ্চিত করুন (Confirm Pay)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAYSLIP VIEW & PRINT MODAL */}
      {/* ========================================================================= */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-xl w-full p-6 sm:p-8 shadow-2xl border-2 border-slate-100 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2 font-black text-slate-900">
                <FileText size={18} className="text-indigo-600"/>
                <span>কর্মচারী বেতন রসিদ (Salary Payslip)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white font-black text-xs rounded-xl hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer size={14} /> প্রিন্ট
                </button>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Payslip Body */}
            <div className="py-6 space-y-6">
              <div className="text-center border-b pb-4">
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  {shopSettings?.name || 'REST BAZAR'}
                </h3>
                <p className="text-xs text-slate-500 font-bold">{shopSettings?.address || 'Bangladesh'}</p>
                <div className="inline-block bg-slate-100 text-slate-800 text-[10px] font-black uppercase px-3 py-1 rounded-full mt-2">
                  মাসিক বেতন রসিদ: {selectedPayslip.payroll.month}
                </div>
              </div>

              {/* Staff Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">কর্মচারীর নাম:</span>
                  <strong className="text-slate-900 font-black text-sm">{selectedPayslip.staff.name}</strong>
                  <div className="text-slate-500 font-bold text-[11px]">{selectedPayslip.staff.designation}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">মোবাইল / আইডি:</span>
                  <strong className="text-slate-900 font-bold">{selectedPayslip.staff.phone}</strong>
                  <div className="text-slate-500 font-medium text-[10px]">আইডি: {selectedPayslip.staff.id}</div>
                </div>
              </div>

              {/* Breakdown */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-slate-400 uppercase text-[10px]">
                    <th className="py-2 text-left">বিবরণ</th>
                    <th className="py-2 text-right">পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 font-bold text-slate-700">মূল বেতন (Basic Salary)</td>
                    <td className="py-2 text-right font-black text-slate-900">৳{selectedPayslip.payroll.basic.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-emerald-700">ভাতা (Allowances)</td>
                    <td className="py-2 text-right font-black text-emerald-700">+৳{(selectedPayslip.payroll.allowances || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  {(selectedPayslip.payroll.overtime || 0) > 0 && (
                    <tr>
                      <td className="py-2 font-bold text-amber-700">ওভারটাইম (Overtime)</td>
                      <td className="py-2 text-right font-black text-amber-700">+৳{selectedPayslip.payroll.overtime?.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  {(selectedPayslip.payroll.bonus || 0) > 0 && (
                    <tr>
                      <td className="py-2 font-bold text-indigo-700">বোনাস (Bonus)</td>
                      <td className="py-2 text-right font-black text-indigo-700">+৳{selectedPayslip.payroll.bonus?.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  {(selectedPayslip.payroll.deductions || 0) > 0 && (
                    <tr>
                      <td className="py-2 font-bold text-rose-700">কর্তন / লোন সমন্বয় (Deduction)</td>
                      <td className="py-2 text-right font-black text-rose-700">-৳{selectedPayslip.payroll.deductions?.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-100 font-black text-sm">
                    <td className="py-3 px-2 text-slate-900">সর্বমোট নেট প্রদেয়</td>
                    <td className="py-3 px-2 text-right text-indigo-950">৳{selectedPayslip.payroll.netSalary.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              {/* Payment Summary */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-emerald-800 font-black block">মোট পরিশোধিত: ৳{(selectedPayslip.payroll.paidAmount || (selectedPayslip.payroll.status === 'Paid' ? selectedPayslip.payroll.netSalary : 0)).toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-emerald-600 font-bold">স্ট্যাটাস: {selectedPayslip.payroll.status === 'Paid' ? 'সম্পূর্ণ পরিশোধিত' : 'আংশিক / বকেয়া'}</span>
                </div>
                <div className="text-right">
                  <span className="text-rose-700 font-black block">বকেয়া: ৳{(selectedPayslip.payroll.dueAmount !== undefined ? selectedPayslip.payroll.dueAmount : (selectedPayslip.payroll.status === 'Paid' ? 0 : selectedPayslip.payroll.netSalary)).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-10 grid grid-cols-2 text-center text-xs text-slate-500">
                <div>
                  <div className="w-32 border-t border-slate-300 mx-auto mb-1"></div>
                  <span>কর্মচারীর স্বাক্ষর</span>
                </div>
                <div>
                  <div className="w-32 border-t border-slate-300 mx-auto mb-1"></div>
                  <span>কর্তৃপক্ষের স্বাক্ষর</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollModule;
