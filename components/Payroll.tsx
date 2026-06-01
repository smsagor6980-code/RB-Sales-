import React, { useState, useMemo } from 'react';
import { Staff, Payroll, AdvanceLoan, ExpenseReimbursement } from '../types';
import { 
  Banknote, FileText, Download, CheckCircle2, XCircle, 
  AlertCircle, Plus, Edit, Trash2, Check, X, Coins, Wallet
} from 'lucide-react';

interface PayrollProps {
  staff: Staff[];
  payrolls: Payroll[];
  onUpdatePayrolls: (data: Payroll[]) => void;
  loans: AdvanceLoan[];
  onUpdateLoans: (data: AdvanceLoan[]) => void;
  reimbursements: ExpenseReimbursement[];
  onUpdateReimbursements: (data: ExpenseReimbursement[]) => void;
  isAdmin: boolean;
  currentStaff: Staff | null;
}

const PayrollModule: React.FC<PayrollProps> = ({ 
  staff, payrolls, onUpdatePayrolls, loans, onUpdateLoans, reimbursements, onUpdateReimbursements, isAdmin, currentStaff 
}) => {
  const [activeTab, setActiveTab] = useState<'salary' | 'loans' | 'expenses'>('salary');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [loanForm, setLoanForm] = useState<Partial<AdvanceLoan>>({ amount: 0, reason: '', installmentAmount: 0 });
  const [expenseForm, setExpenseForm] = useState<Partial<ExpenseReimbursement>>({ amount: 0, reason: '' });

  const getLocalToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(Date.now() - offset).toISOString().split('T')[0];
  };

  const today = getLocalToday();

  // Salary Logic
  const generatePayroll = () => {
    if (!isAdmin) return;
    const newPayrolls = staff.map(s => {
      const existing = payrolls.find(p => p.staffId === s.id && p.month === selectedMonth);
      if (existing) return existing;

      const basic = s.salaryStructure?.basic || 0;
      const allowances = (s.salaryStructure?.travelAllowance || 0) + (s.salaryStructure?.foodAllowance || 0) + (s.salaryStructure?.mobileAllowance || 0);
      const commission = 0; // Calculate based on sales if needed
      const bonus = 0;
      const overtime = 0;
      
      // Calculate deductions (e.g., loan installments)
      const activeLoans = loans.filter(l => l.staffId === s.id && l.status === 'Approved' && l.remainingAmount > 0);
      const loanDeduction = activeLoans.reduce((sum, l) => sum + Math.min(l.installmentAmount, l.remainingAmount), 0);
      const deductions = loanDeduction;

      const netSalary = basic + allowances + commission + bonus + overtime - deductions;

      return {
        id: `PAY-${s.id}-${selectedMonth}`,
        staffId: s.id,
        month: selectedMonth,
        basic,
        allowances,
        commission,
        bonus,
        overtime,
        deductions,
        netSalary,
        status: 'Draft' as const
      };
    });

    const updatedPayrolls = [...payrolls.filter(p => p.month !== selectedMonth), ...newPayrolls];
    onUpdatePayrolls(updatedPayrolls);
  };

  const handlePaySalary = (id: string) => {
    const target = payrolls.find(p => p.id === id);
    if (!target || !isAdmin) return;
    
    // Update loan remaining amounts
    const activeLoans = loans.filter(l => l.staffId === target.staffId && l.status === 'Approved' && l.remainingAmount > 0);
    const updatedLoansDelta: AdvanceLoan[] = [];
    activeLoans.forEach(l => {
      const deduction = Math.min(l.installmentAmount, l.remainingAmount);
      updatedLoansDelta.push({ ...l, remainingAmount: l.remainingAmount - deduction, status: l.remainingAmount - deduction <= 0 ? 'Paid' : 'Approved' });
    });
    if (updatedLoansDelta.length > 0) {
      onUpdateLoans(updatedLoansDelta);
    }

    onUpdatePayrolls([{ ...target, status: 'Paid' as const, paymentDate: today }]);
  };

  // Loan Logic
  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff) return;
    const newLoan: AdvanceLoan = {
      ...loanForm as AdvanceLoan,
      id: `LOAN-${Date.now()}`,
      staffId: currentStaff.id,
      date: today,
      status: 'Pending',
      remainingAmount: loanForm.amount || 0
    };
    onUpdateLoans([newLoan]);
    setShowLoanModal(false);
    setLoanForm({ amount: 0, reason: '', installmentAmount: 0 });
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
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">পেরোল</h2>
            <p className="text-slate-500 font-bold text-xs mt-1 uppercase tracking-widest flex items-center gap-2">
              <Wallet size={14} className="text-emerald-500"/> বেতন এবং অর্থ ব্যবস্থাপনা
            </p>
          </div>
        </div>
        
        <div className="flex bg-white p-2 rounded-[28px] border-2 border-slate-100 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'salary', label: 'বেতন', icon: Banknote },
            { id: 'loans', label: 'অগ্রিম/লোন', icon: Coins },
            { id: 'expenses', label: 'খরচ', icon: FileText }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`whitespace-nowrap flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-emerald-500 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'salary' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex items-center gap-4">
              <input type="month" className="border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
              {isAdmin && (
                <button onClick={generatePayroll} className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                  পেরোল তৈরি করুন
                </button>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">মোট নেট বেতন</p>
              <h3 className="text-2xl font-black text-emerald-600 tracking-tighter">৳{displayPayrolls.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-[2px] border-b-2">
                  <tr>
                    <th className="p-6">স্টাফ মেম্বার</th>
                    <th className="p-6 text-right">মূল বেতন</th>
                    <th className="p-6 text-right">ভাতা (Allowances)</th>
                    <th className="p-6 text-right">কর্তন (Deductions)</th>
                    <th className="p-6 text-right">নেট বেতন</th>
                    <th className="p-6 text-center">স্ট্যাটাস</th>
                    <th className="p-6 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayPayrolls.map(payroll => {
                    const member = staff.find(s => s.id === payroll.staffId);
                    const statusBN = payroll.status === 'Paid' ? 'পরিশোধিত' : 'ড্রাফট';
                    return (
                      <tr key={payroll.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6">
                          <div className="font-black text-slate-800 text-sm uppercase">{member?.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{member?.designation}</div>
                        </td>
                        <td className="p-6 font-black text-slate-600 text-xs text-right">৳{payroll.basic.toLocaleString()}</td>
                        <td className="p-6 font-black text-emerald-600 text-xs text-right">+৳{payroll.allowances.toLocaleString()}</td>
                        <td className="p-6 font-black text-rose-600 text-xs text-right">-৳{payroll.deductions.toLocaleString()}</td>
                        <td className="p-6 font-black text-slate-900 text-sm text-right">৳{payroll.netSalary.toLocaleString()}</td>
                        <td className="p-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${payroll.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {statusBN}
                          </span>
                        </td>
                        <td className="p-6 text-center">
                          <div className="flex justify-center gap-2">
                            {isAdmin && payroll.status === 'Draft' && (
                              <button onClick={() => handlePaySalary(payroll.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100" title="পরিশোধিত হিসেবে চিহ্নিত করুন"><CheckCircle2 size={16}/></button>
                            )}
                            <button className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100" title="পে-স্লিপ ডাউনলোড করুন"><Download size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {displayPayrolls.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 font-black uppercase tracking-widest text-xs">নির্বাচিত মাসের জন্য কোন পেরোল ডেটা নেই</td>
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
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">অগ্রিম এবং লোন</h3>
            <button onClick={() => setShowLoanModal(true)} className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center gap-2 active:scale-95 transition-all">
              <Plus size={18}/> লোনের আবেদন
            </button>
          </div>

          <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-[2px] border-b-2">
                  <tr>
                    <th className="p-6">স্টাফ মেম্বার</th>
                    <th className="p-6 text-right">পরিমাণ</th>
                    <th className="p-6 text-right">মাসিক কিস্তি</th>
                    <th className="p-6 text-right">অবশিষ্ট</th>
                    <th className="p-6">কারণ</th>
                    <th className="p-6 text-center">স্ট্যাটাস</th>
                    {isAdmin && <th className="p-6 text-center">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(isAdmin ? loans : loans.filter(l => l.staffId === currentStaff?.id)).map(loan => {
                    const member = staff.find(s => s.id === loan.staffId);
                    const statusBN = loan.status === 'Approved' ? 'অনুমোদিত' : loan.status === 'Rejected' ? 'প্রত্যাখ্যাত' : loan.status === 'Paid' ? 'পরিশোধিত' : 'অপেক্ষমান';
                    return (
                      <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6">
                          <div className="font-black text-slate-800 text-sm uppercase">{member?.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{loan.date}</div>
                        </td>
                        <td className="p-6 font-black text-slate-600 text-xs text-right">৳{loan.amount.toLocaleString()}</td>
                        <td className="p-6 font-black text-slate-600 text-xs text-right">৳{loan.installmentAmount.toLocaleString()}</td>
                        <td className="p-6 font-black text-rose-600 text-xs text-right">৳{loan.remainingAmount.toLocaleString()}</td>
                        <td className="p-6 text-xs text-slate-500 max-w-[200px] truncate">{loan.reason}</td>
                        <td className="p-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${loan.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : loan.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : loan.status === 'Paid' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                            {statusBN}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-6 text-center">
                            {loan.status === 'Pending' && (
                              <div className="flex justify-center gap-2">
                                <button onClick={() => handleLoanAction(loan.id, 'Approved')} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100"><Check size={16}/></button>
                                <button onClick={() => handleLoanAction(loan.id, 'Rejected')} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100"><X size={16}/></button>
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

      {/* Loan Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">অগ্রিম/লোনের আবেদন</h3>
              <button onClick={() => setShowLoanModal(false)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
            </div>
            <form onSubmit={handleLoanSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">পরিমাণ (৳)</label>
                <input type="number" required className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-xl text-emerald-600 bg-slate-50 outline-none mt-2" value={loanForm.amount || ''} onChange={e => setLoanForm({...loanForm, amount: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">মাসিক কিস্তি (৳)</label>
                <input type="number" required className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2" value={loanForm.installmentAmount || ''} onChange={e => setLoanForm({...loanForm, installmentAmount: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">কারণ</label>
                <textarea required rows={3} className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2" value={loanForm.reason} onChange={e => setLoanForm({...loanForm, reason: e.target.value})} placeholder="লোনের কারণ লিখুন..."></textarea>
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                আবেদন জমা দিন
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
    </div>
  );
};

export default PayrollModule;
