import React, { useState, useMemo } from 'react';
import { 
  Staff, Payroll, AdvanceLoan, Attendance, LeaveRequest, 
  SalaryBreakdownItem, PayrollPaymentRecord, Expense, ShopSettings 
} from '../types';
import { 
  Banknote, FileText, Download, Printer, Filter, Search, 
  Calendar, ChevronDown, ChevronUp, Plus, Edit, Trash2, 
  AlertCircle, CheckCircle2, ShieldCheck, Sparkles, TrendingUp, 
  TrendingDown, Clock, Gift, User, Phone, DollarSign, 
  Wallet, ArrowDownRight, ArrowUpRight, Scale, X, Check, 
  FileSpreadsheet, Eye, Info, RefreshCw, Layers
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell, PieChart, Pie 
} from 'recharts';

interface PayrollReasonReportProps {
  staff: Staff[];
  payrolls: Payroll[];
  onUpdatePayrolls: (data: Payroll[]) => void;
  loans?: AdvanceLoan[];
  attendances?: Attendance[];
  leaves?: LeaveRequest[];
  onAddExpense?: (expense: Partial<Expense>) => void;
  shopSettings?: ShopSettings | null;
  isAdmin: boolean;
  currentStaff: Staff | null;
}

export interface DetailedStaffPayrollReport {
  payrollId: string;
  staff: Staff;
  month: string;
  monthLabel: string;
  basic: number;
  basicReason: string;
  additions: SalaryBreakdownItem[];
  deductions: SalaryBreakdownItem[];
  totalAdditions: number;
  totalDeductions: number;
  grossPayable: number;
  netSalary: number;
  paidAmount: number;
  dueAmount: number;
  status: 'Paid' | 'Partial' | 'Draft' | 'Unpaid';
  payments: PayrollPaymentRecord[];
  workedDays: number;
  totalDays: number;
  dailyRate: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  overtimeHours: number;
}

export const PayrollReasonReport: React.FC<PayrollReasonReportProps> = ({
  staff,
  payrolls,
  onUpdatePayrolls,
  loans = [],
  attendances = [],
  leaves = [],
  onAddExpense,
  shopSettings,
  isAdmin,
  currentStaff
}) => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [reasonCategoryFilter, setReasonCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  // Modals
  const [editingReport, setEditingReport] = useState<DetailedStaffPayrollReport | null>(null);
  const [showSlipModal, setShowSlipModal] = useState<DetailedStaffPayrollReport | null>(null);
  const [showAllPrintModal, setShowAllPrintModal] = useState<boolean>(false);
  const [newReasonItem, setNewReasonItem] = useState<{
    type: 'bonus' | 'allowance' | 'overtime' | 'other_addition' | 'absent_cut' | 'late_cut' | 'advance_recovery' | 'loan_recovery' | 'fine' | 'damage' | 'tax_pf' | 'other_deduction';
    category: 'addition' | 'deduction';
    title: string;
    amount: number;
    reason: string;
  }>({
    type: 'bonus',
    category: 'addition',
    title: 'উৎসব / বিশেষ বোনাস',
    amount: 0,
    reason: ''
  });

  // Calculate Bengali month label
  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthNames = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    return `${monthNames[month - 1] || ''} ${year}`;
  }, [selectedMonth]);

  // Days in month
  const totalDaysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }, [selectedMonth]);

  // Helper to construct all additions and deductions with explicit reasons for each staff
  const detailedReports: DetailedStaffPayrollReport[] = useMemo(() => {
    const pStart = `${selectedMonth}-01`;
    const pEnd = `${selectedMonth}-${String(totalDaysInMonth).padStart(2, '0')}`;

    return staff.map(member => {
      // Find existing payroll
      const existingPayroll = payrolls.find(p => p.staffId === member.id && p.month === selectedMonth);

      // Attendance stats
      const memberAtts = attendances.filter(a => a.staffId === member.id && a.date >= pStart && a.date <= pEnd);
      let presentDays = 0;
      let lateDays = 0;
      let leaveDays = 0;
      let absentDays = 0;
      let totalWorkMinutes = 0;
      let overtimeMinutes = 0;
      const scheduledDutyHours = member.dutyHours || 9;

      memberAtts.forEach(a => {
        if (a.status === 'Present') presentDays++;
        else if (a.status === 'Late') lateDays++;
        else if (a.status === 'Leave') leaveDays++;
        else if (a.status === 'Absent') absentDays++;

        if (a.checkIn && a.checkOut) {
          try {
            const [inH, inM] = a.checkIn.split(':').map(Number);
            const [outH, outM] = a.checkOut.split(':').map(Number);
            let diff = (outH * 60 + outM) - (inH * 60 + inM);
            if (diff < 0) diff += 24 * 60;
            totalWorkMinutes += diff;
            if (diff > scheduledDutyHours * 60) {
              overtimeMinutes += (diff - scheduledDutyHours * 60);
            }
          } catch {}
        }
      });

      // Approved leaves
      const memberLeaves = leaves.filter(l => l.staffId === member.id && l.status === 'Approved' && l.startDate <= pEnd && l.endDate >= pStart);
      if (memberLeaves.length > 0 && leaveDays === 0) {
        leaveDays = memberLeaves.length;
      }

      const workedDays = presentDays + lateDays;
      if (memberAtts.length > 0) {
        absentDays = Math.max(0, totalDaysInMonth - (workedDays + leaveDays));
      }

      const basicSalary = existingPayroll?.basic ?? (member.salaryStructure?.basic || 15000);
      const dailyRate = Math.round(basicSalary / Math.max(1, totalDaysInMonth));
      const overtimeHours = Number((overtimeMinutes / 60).toFixed(1));
      const hourlyRate = Math.round(dailyRate / scheduledDutyHours);
      const overtimePay = Math.round(overtimeHours * (member.overtimeRatePerHour || hourlyRate));

      // Build Additions Breakdown with reasons
      const additions: SalaryBreakdownItem[] = [];

      // 1. Basic
      additions.push({
        id: `add-basic-${member.id}`,
        type: 'basic',
        category: 'addition',
        title: 'মূল মাসিক বেতন (Basic Salary)',
        amount: basicSalary,
        reason: `${monthLabel} মাসের নিয়মিত নির্ধারিত মূল বেতন`,
        calculationNote: `দৈনিক রেট ৳${dailyRate.toLocaleString('en-IN')}`
      });

      // 2. Travel Allowance
      const travel = existingPayroll?.travelAllowance ?? (member.salaryStructure?.travelAllowance || 0);
      if (travel > 0) {
        additions.push({
          id: `add-travel-${member.id}`,
          type: 'allowance',
          category: 'addition',
          title: 'যাতায়াত / ভ্রমণ ভাতা (Travel Allowance)',
          amount: travel,
          reason: existingPayroll?.travelAllowanceReason || 'কর্মস্থলে যাতায়াত ও ভ্রমণ বিল বাবদ মাসিক নির্ধারিত ভাতা'
        });
      }

      // 3. Food Allowance
      const food = existingPayroll?.foodAllowance ?? (member.salaryStructure?.foodAllowance || 0);
      if (food > 0) {
        additions.push({
          id: `add-food-${member.id}`,
          type: 'allowance',
          category: 'addition',
          title: 'খাবার / লাঞ্চ ভাতা (Food Allowance)',
          amount: food,
          reason: existingPayroll?.foodAllowanceReason || 'দৈনিক মধ্যাহ্নভোজ ও নাস্তা বাবদ মাসিক ভাতা'
        });
      }

      // 4. Mobile / Utility Allowance
      const mobile = existingPayroll?.mobileAllowance ?? (member.salaryStructure?.mobileAllowance || 0);
      if (mobile > 0) {
        additions.push({
          id: `add-mobile-${member.id}`,
          type: 'allowance',
          category: 'addition',
          title: 'মোবাইল ও ইন্টারনেট বিল (Mobile Allowance)',
          amount: mobile,
          reason: existingPayroll?.mobileAllowanceReason || member.salaryStructure?.mobileAllowanceReason || 'অফিসিয়াল যোগাযোগ ও ডেটা বিল বাবদ ভাতা'
        });
      }

      // 4.1 House Rent Allowance
      const houseRent = existingPayroll?.houseRentAllowance ?? (member.salaryStructure?.houseRentAllowance || 0);
      if (houseRent > 0) {
        additions.push({
          id: `add-house-${member.id}`,
          type: 'allowance',
          category: 'addition',
          title: 'বাড়ি ভাড়া ভাতা (House Rent Allowance)',
          amount: houseRent,
          reason: existingPayroll?.houseRentReason || member.salaryStructure?.houseRentReason || 'কর্মচারীর বাসস্থান ও বাড়ি ভাড়া সহায়তা বাবদ মাসিক ভাতা'
        });
      }

      // 4.2 Medical Allowance
      const medical = existingPayroll?.medicalAllowance ?? (member.salaryStructure?.medicalAllowance || 0);
      if (medical > 0) {
        additions.push({
          id: `add-med-${member.id}`,
          type: 'allowance',
          category: 'addition',
          title: 'চিকিৎসা ভাতা (Medical Allowance)',
          amount: medical,
          reason: existingPayroll?.medicalReason || member.salaryStructure?.medicalReason || 'চিকিৎসা ও স্বাস্থ্যসেবা বাবদ মাসিক নির্ধারিত ভাতা'
        });
      }

      // 4.3 Special / Skill Allowance
      const special = existingPayroll?.specialAllowance ?? (member.salaryStructure?.specialAllowance || 0);
      if (special > 0) {
        additions.push({
          id: `add-spec-${member.id}`,
          type: 'allowance',
          category: 'addition',
          title: 'বিশেষ দক্ষতা / পারফরম্যান্স ভাতা',
          amount: special,
          reason: existingPayroll?.specialReason || member.salaryStructure?.specialReason || 'বিশেষ দায়িত্ব ও দক্ষতা বাবদ মাসিক বিশেষ ভাতা'
        });
      }

      // 4.4 Other Allowance
      const otherAllow = (member.salaryStructure?.otherAllowance || 0);
      if (otherAllow > 0) {
        additions.push({
          id: `add-other-${member.id}`,
          type: 'allowance',
          category: 'addition',
          title: 'অন্যান্য মাসিক সুবিধা / ভাতা',
          amount: otherAllow,
          reason: member.salaryStructure?.otherAllowanceReason || 'কোম্পানি প্রদত্ত অন্যান্য সুবিধা বাবদ নিয়মিত ভাতা'
        });
      }

      // 4.5 Daily Attendance Allowance
      const dailyAllowRate = member.salaryStructure?.dailyAllowance || 0;
      if (dailyAllowRate > 0 && workedDays > 0) {
        const totalDailyAmt = dailyAllowRate * workedDays;
        additions.push({
          id: `add-daily-${member.id}`,
          type: 'allowance',
          category: 'addition',
          title: `দৈনিক অতিরিক্ত খোরাকি ভাতা (${workedDays} দিন)`,
          amount: totalDailyAmt,
          reason: `উপস্থিত প্রতি কর্মদিবসে ৳${dailyAllowRate} হারে ${workedDays} দিনের খোরাকি বাবদ প্রদেয়`,
          calculationNote: `${workedDays} দিন × ৳${dailyAllowRate}`
        });
      }

      // 5. Overtime
      const otAmt = existingPayroll?.overtime ?? overtimePay;
      if (otAmt > 0) {
        additions.push({
          id: `add-ot-${member.id}`,
          type: 'overtime',
          category: 'addition',
          title: `ওভারটাইম আয় (${existingPayroll?.overtimeHours ?? overtimeHours} ঘণ্টা)`,
          amount: otAmt,
          reason: existingPayroll?.overtimeReason || `নির্ধারিত ডিউটির অতিরিক্ত ${existingPayroll?.overtimeHours ?? overtimeHours} ঘণ্টা কাজের পারিশ্রমিক (প্রতি ঘণ্টা ৳${member.overtimeRatePerHour || hourlyRate})`,
          calculationNote: `${existingPayroll?.overtimeHours ?? overtimeHours} ঘণ্টা × ৳${member.overtimeRatePerHour || hourlyRate}`
        });
      }

      // 6. Bonus
      const bonusAmt = existingPayroll?.bonus || 0;
      if (bonusAmt > 0) {
        additions.push({
          id: `add-bonus-${member.id}`,
          type: 'bonus',
          category: 'addition',
          title: 'বোনাস ও ইনসেন্টিভ (Bonus)',
          amount: bonusAmt,
          reason: existingPayroll?.bonusReason || 'উৎসব / বিশেষ পারফরম্যান্সের জন্য প্রদত্ত বোনাস'
        });
      }

      // 7. Commission
      const commissionAmt = existingPayroll?.commission || 0;
      if (commissionAmt > 0) {
        additions.push({
          id: `add-comm-${member.id}`,
          type: 'commission',
          category: 'addition',
          title: 'সেলস কমিশন / টার্গেট ইনসেন্টিভ',
          amount: commissionAmt,
          reason: existingPayroll?.commissionReason || 'মাসিক সেলস টার্গেট অর্জনের জন্য নির্ধারিত কমিশন'
        });
      }

      // 8. Previous Pawna
      const pawna = existingPayroll?.pawnaAmount ?? (member.pawnaTaka || 0);
      if (pawna > 0) {
        additions.push({
          id: `add-pawna-${member.id}`,
          type: 'pawna',
          category: 'addition',
          title: 'পূর্ববর্তী বকেয়া পাওনা টাকা',
          amount: pawna,
          reason: existingPayroll?.pawnaReason || 'বিগত মাসের বা পূর্বের অপরিশোধিত পাওনা বেতন সমন্বয়'
        });
      }

      // 9. Other custom additions from breakdowns
      if (existingPayroll?.breakdowns) {
        existingPayroll.breakdowns
          .filter(b => b.category === 'addition' && !['basic', 'allowance', 'bonus', 'commission', 'overtime', 'pawna'].includes(b.type))
          .forEach(b => additions.push(b));
      }

      // Build Deductions Breakdown with reasons
      const deductions: SalaryBreakdownItem[] = [];

      // 1. Absent Deduction (if attendance system recorded absences or entered manually)
      const absentCut = existingPayroll?.absentDeduction ?? (absentDays > 0 ? absentDays * dailyRate : 0);
      if (absentCut > 0) {
        deductions.push({
          id: `ded-absent-${member.id}`,
          type: 'absent_cut',
          category: 'deduction',
          title: `অনুপস্থিতি কর্তন (${existingPayroll?.absentDays ?? absentDays} দিন)`,
          amount: absentCut,
          reason: existingPayroll?.absentReason || `অননুমোদিত বা কাজে অনুপস্থিত থাকার কারণে ${existingPayroll?.absentDays ?? absentDays} দিনের বেতন কর্তন`,
          calculationNote: `${existingPayroll?.absentDays ?? absentDays} দিন × দৈনিক ৳${dailyRate.toLocaleString('en-IN')}`
        });
      }

      // 2. Late Arrival Deduction
      const lateCut = existingPayroll?.lateDeduction ?? 0;
      if (lateCut > 0 || (existingPayroll?.lateDays ?? lateDays) >= 3) {
        const autoLateCut = lateCut > 0 ? lateCut : Math.floor((existingPayroll?.lateDays ?? lateDays) / 3) * Math.round(dailyRate / 2);
        if (autoLateCut > 0) {
          deductions.push({
            id: `ded-late-${member.id}`,
            type: 'late_cut',
            category: 'deduction',
            title: `দেরিতে আসার জরিমানা (${existingPayroll?.lateDays ?? lateDays} দিন লেট)`,
            amount: autoLateCut,
            reason: existingPayroll?.lateReason || `নির্ধারিত সময়ের পর কর্মস্থলে পৌঁছানোর কারণে নিয়ম অনুযায়ী কর্তন/জরিমানা`,
            calculationNote: `${existingPayroll?.lateDays ?? lateDays} দিন দেরিতে উপস্থিতি`
          });
        }
      }

      // 3. Advance Salary Deduction / Recovery
      const activeAdvanceLoans = loans.filter(l => l.staffId === member.id && l.status === 'Approved' && l.remainingAmount > 0 && l.loanType === 'advance');
      const autoAdvanceCut = activeAdvanceLoans.reduce((sum, l) => sum + Math.min(l.installmentAmount || l.remainingAmount, l.remainingAmount), 0);
      const advanceCut = existingPayroll?.advanceDeduction ?? autoAdvanceCut;
      if (advanceCut > 0) {
        deductions.push({
          id: `ded-adv-${member.id}`,
          type: 'advance_recovery',
          category: 'deduction',
          title: 'অগ্রিম বেতন সমন্বয় (Advance Salary Recovery)',
          amount: advanceCut,
          reason: existingPayroll?.advanceReason || `ইতিপূর্বে গৃহীত অগ্রিম টাকা হতে মাসিক কিস্তি অনুযায়ী বেতন সমন্বয়`
        });
      }

      // 4. Loan Installment Deduction
      const activeRegularLoans = loans.filter(l => l.staffId === member.id && l.status === 'Approved' && l.remainingAmount > 0 && l.loanType === 'loan');
      const autoLoanCut = activeRegularLoans.reduce((sum, l) => sum + Math.min(l.installmentAmount || l.remainingAmount, l.remainingAmount), 0);
      const loanCut = existingPayroll?.loanDeduction ?? autoLoanCut;
      if (loanCut > 0) {
        deductions.push({
          id: `ded-loan-${member.id}`,
          type: 'loan_recovery',
          category: 'deduction',
          title: 'ঋণ / লোন কিস্তি কর্তন (Loan Installment)',
          amount: loanCut,
          reason: existingPayroll?.loanReason || `ব্যবসা প্রতিষ্ঠান থেকে গৃহীত ঋণের মাসিক কিস্তি পরিশোধ বাবদ কর্তন`
        });
      }

      // 5. Fine / Damage Compensation
      const fineAmt = existingPayroll?.fineAmount || 0;
      if (fineAmt > 0) {
        deductions.push({
          id: `ded-fine-${member.id}`,
          type: 'fine',
          category: 'deduction',
          title: 'শৃংখলাভঙ্গ / মালামাল ক্ষতির জরিমানা',
          amount: fineAmt,
          reason: existingPayroll?.fineReason || 'শৃঙ্খলাভঙ্গ বা দোকানের পণ্যের ক্ষতির কারণে আরোপিত জরিমানা'
        });
      }

      // 6. Tax / PF / Security Deposit
      const pfAmt = existingPayroll?.providentFundDeduction ?? (member.salaryStructure?.providentFundDeduction || 0);
      if (pfAmt > 0) {
        deductions.push({
          id: `ded-pf-${member.id}`,
          type: 'tax_pf',
          category: 'deduction',
          title: 'প্রভিডেন্ট ফান্ড / ডিপিএস কর্তন (PF)',
          amount: pfAmt,
          reason: existingPayroll?.providentFundReason || 'কর্মচারীর মাসিক সঞ্চয়ী প্রভিডেন্ট ফান্ড তহবিলের জন্য নিয়মিত কর্তন'
        });
      }

      const taxAmt = existingPayroll?.taxDeduction ?? (member.salaryStructure?.taxDeduction || 0);
      if (taxAmt > 0) {
        deductions.push({
          id: `ded-tax-${member.id}`,
          type: 'tax_pf',
          category: 'deduction',
          title: 'আয়কর / ট্যাক্স কর্তন (Income Tax)',
          amount: taxAmt,
          reason: existingPayroll?.taxReason || 'উৎস কর কর্তন ও সরকারি আয়কর জমা বাবদ কর্তন'
        });
      }

      const taxPfAmt = existingPayroll?.taxOrPfDeduction || 0;
      if (taxPfAmt > 0 && pfAmt === 0 && taxAmt === 0) {
        deductions.push({
          id: `ded-tax-other-${member.id}`,
          type: 'tax_pf',
          category: 'deduction',
          title: 'ট্যাক্স / প্রভিডেন্ট ফান্ড / সিকিউরিটি কর্তন',
          amount: taxPfAmt,
          reason: existingPayroll?.taxOrPfReason || 'আয়কর ও ভবিষ্যৎ তহবিলের জন্য সংগৃহীত অর্থ'
        });
      }

      // 7. Other custom deductions from breakdowns
      if (existingPayroll?.breakdowns) {
        existingPayroll.breakdowns
          .filter(b => b.category === 'deduction' && !['absent_cut', 'late_cut', 'advance_recovery', 'loan_recovery', 'fine', 'tax_pf', 'damage'].includes(b.type))
          .forEach(b => deductions.push(b));
      }

      const totalAdditions = additions.reduce((sum, a) => sum + a.amount, 0);
      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const grossPayable = totalAdditions;
      const netSalary = Math.max(0, totalAdditions - totalDeductions);

      // Payments made
      const payments = existingPayroll?.payments || (existingPayroll?.paidAmount ? [{
        id: `RCP-OLD-${member.id}`,
        amount: existingPayroll.paidAmount,
        date: existingPayroll.paymentDate || `${selectedMonth}-28`,
        method: existingPayroll.paymentMethod || 'Cash',
        note: existingPayroll.note || `${monthLabel} মাসের বেতন বাবদ`
      }] : []);

      const paidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const dueAmount = Math.max(0, netSalary - paidAmount);

      let status: 'Paid' | 'Partial' | 'Draft' | 'Unpaid' = 'Unpaid';
      if (paidAmount >= netSalary && netSalary > 0) status = 'Paid';
      else if (paidAmount > 0 && paidAmount < netSalary) status = 'Partial';
      else status = 'Unpaid';

      return {
        payrollId: existingPayroll?.id || `PAY-${member.id}-${selectedMonth}`,
        staff: member,
        month: selectedMonth,
        monthLabel,
        basic: basicSalary,
        basicReason: `${monthLabel} মাসের নিয়মিত মূল বেতন`,
        additions,
        deductions,
        totalAdditions,
        totalDeductions,
        grossPayable,
        netSalary,
        paidAmount,
        dueAmount,
        status,
        payments,
        workedDays,
        totalDays: totalDaysInMonth,
        dailyRate,
        absentDays,
        lateDays,
        leaveDays,
        overtimeHours
      };
    });
  }, [staff, payrolls, loans, attendances, leaves, selectedMonth, totalDaysInMonth, monthLabel]);

  // Filter reports based on user inputs
  const filteredReports = useMemo(() => {
    return detailedReports.filter(rep => {
      const matchesSearch = 
        rep.staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.staff.phone.includes(searchQuery) ||
        rep.staff.designation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStaff = selectedStaffFilter === 'all' || rep.staff.id === selectedStaffFilter;
      const matchesStatus = statusFilter === 'all' || rep.status === statusFilter;

      let matchesReasonCategory = true;
      if (reasonCategoryFilter === 'has_bonus') {
        matchesReasonCategory = rep.additions.some(a => a.type === 'bonus');
      } else if (reasonCategoryFilter === 'has_ot') {
        matchesReasonCategory = rep.additions.some(a => a.type === 'overtime');
      } else if (reasonCategoryFilter === 'has_absent') {
        matchesReasonCategory = rep.deductions.some(d => d.type === 'absent_cut');
      } else if (reasonCategoryFilter === 'has_advance') {
        matchesReasonCategory = rep.deductions.some(d => d.type === 'advance_recovery');
      } else if (reasonCategoryFilter === 'has_fine') {
        matchesReasonCategory = rep.deductions.some(d => d.type === 'fine' || d.type === 'damage');
      }

      return matchesSearch && matchesStaff && matchesStatus && matchesReasonCategory;
    });
  }, [detailedReports, searchQuery, selectedStaffFilter, statusFilter, reasonCategoryFilter]);

  // Aggregates & Analytics
  const summaryAggregates = useMemo(() => {
    const totalStaffCount = detailedReports.length;
    const totalBasicSalary = detailedReports.reduce((sum, r) => sum + r.basic, 0);
    const totalAdditions = detailedReports.reduce((sum, r) => sum + (r.totalAdditions - r.basic), 0);
    const totalDeductions = detailedReports.reduce((sum, r) => sum + r.totalDeductions, 0);
    const totalNetPayable = detailedReports.reduce((sum, r) => sum + r.netSalary, 0);
    const totalPaid = detailedReports.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalDue = detailedReports.reduce((sum, r) => sum + r.dueAmount, 0);

    // Reason specific totals
    let totalBonus = 0;
    let totalOvertime = 0;
    let totalAllowances = 0;
    let totalAbsentCuts = 0;
    let totalAdvanceRecoveries = 0;
    let totalFines = 0;
    let totalLoanCuts = 0;

    detailedReports.forEach(r => {
      r.additions.forEach(a => {
        if (a.type === 'bonus') totalBonus += a.amount;
        if (a.type === 'overtime') totalOvertime += a.amount;
        if (a.type === 'allowance') totalAllowances += a.amount;
      });
      r.deductions.forEach(d => {
        if (d.type === 'absent_cut') totalAbsentCuts += d.amount;
        if (d.type === 'advance_recovery') totalAdvanceRecoveries += d.amount;
        if (d.type === 'loan_recovery') totalLoanCuts += d.amount;
        if (d.type === 'fine' || d.type === 'damage') totalFines += d.amount;
      });
    });

    const paidCount = detailedReports.filter(r => r.status === 'Paid').length;
    const dueCount = detailedReports.filter(r => r.status === 'Unpaid' || r.status === 'Partial').length;

    return {
      totalStaffCount,
      totalBasicSalary,
      totalAdditions,
      totalDeductions,
      totalNetPayable,
      totalPaid,
      totalDue,
      totalBonus,
      totalOvertime,
      totalAllowances,
      totalAbsentCuts,
      totalAdvanceRecoveries,
      totalFines,
      totalLoanCuts,
      paidCount,
      dueCount
    };
  }, [detailedReports]);

  // Chart data for reason breakdown
  const additionChartData = [
    { name: 'মূল বেতন', amount: summaryAggregates.totalBasicSalary, fill: '#3b82f6' },
    { name: 'ভাতা ও সুবিধাসমূহ', amount: summaryAggregates.totalAllowances, fill: '#10b981' },
    { name: 'ওভারটাইম আয়', amount: summaryAggregates.totalOvertime, fill: '#f59e0b' },
    { name: 'বোনাস ও ইনসেন্টিভ', amount: summaryAggregates.totalBonus, fill: '#8b5cf6' },
  ].filter(d => d.amount > 0);

  const deductionChartData = [
    { name: 'অনুপস্থিতি কর্তন', amount: summaryAggregates.totalAbsentCuts, fill: '#ef4444' },
    { name: 'অগ্রিম সমন্বয়', amount: summaryAggregates.totalAdvanceRecoveries, fill: '#f97316' },
    { name: 'লোন কিস্তি কর্তন', amount: summaryAggregates.totalLoanCuts, fill: '#ec4899' },
    { name: 'জরিমানা ও ক্ষতিপূরণ', amount: summaryAggregates.totalFines, fill: '#64748b' },
  ].filter(d => d.amount > 0);

  // Save reason adjustments from editing modal
  const handleSaveBreakdownAdjustments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !isAdmin) return;

    // Recalculate allowances and deductions
    const basic = editingReport.basic;
    const allowances = editingReport.additions
      .filter(a => a.type !== 'basic')
      .reduce((sum, a) => sum + a.amount, 0);
    const deductions = editingReport.deductions.reduce((sum, d) => sum + d.amount, 0);
    const netSalary = Math.max(0, basic + allowances - deductions);
    const dueAmount = Math.max(0, netSalary - editingReport.paidAmount);
    const status = editingReport.paidAmount >= netSalary && netSalary > 0 ? 'Paid' : (editingReport.paidAmount > 0 ? 'Partial' : 'Draft');

    // Extract breakdown item specifics for persistent storage
    const travelItem = editingReport.additions.find(a => a.id.includes('travel'));
    const foodItem = editingReport.additions.find(a => a.id.includes('food'));
    const mobileItem = editingReport.additions.find(a => a.id.includes('mobile'));
    const bonusItem = editingReport.additions.find(a => a.type === 'bonus');
    const otItem = editingReport.additions.find(a => a.type === 'overtime');
    const absentItem = editingReport.deductions.find(d => d.type === 'absent_cut');
    const lateItem = editingReport.deductions.find(d => d.type === 'late_cut');
    const advItem = editingReport.deductions.find(d => d.type === 'advance_recovery');
    const loanItem = editingReport.deductions.find(d => d.type === 'loan_recovery');
    const fineItem = editingReport.deductions.find(d => d.type === 'fine');

    const updatedPayroll: Payroll = {
      id: editingReport.payrollId,
      staffId: editingReport.staff.id,
      month: editingReport.month,
      basic,
      allowances,
      commission: 0,
      bonus: bonusItem?.amount || 0,
      bonusReason: bonusItem?.reason || '',
      overtime: otItem?.amount || 0,
      overtimeReason: otItem?.reason || '',
      deductions,
      netSalary,
      status,
      paidAmount: editingReport.paidAmount,
      dueAmount,
      payments: editingReport.payments,
      breakdowns: [...editingReport.additions, ...editingReport.deductions],
      travelAllowance: travelItem?.amount,
      travelAllowanceReason: travelItem?.reason,
      foodAllowance: foodItem?.amount,
      foodAllowanceReason: foodItem?.reason,
      mobileAllowance: mobileItem?.amount,
      mobileAllowanceReason: mobileItem?.reason,
      absentDeduction: absentItem?.amount,
      absentReason: absentItem?.reason,
      lateDeduction: lateItem?.amount,
      lateReason: lateItem?.reason,
      advanceDeduction: advItem?.amount,
      advanceReason: advItem?.reason,
      loanDeduction: loanItem?.amount,
      loanReason: loanItem?.reason,
      fineAmount: fineItem?.amount,
      fineReason: fineItem?.reason,
      approvedByName: currentStaff?.name || 'Admin'
    };

    const remainingPayrolls = payrolls.filter(p => !(p.staffId === editingReport.staff.id && p.month === editingReport.month));
    onUpdatePayrolls([...remainingPayrolls, updatedPayroll]);

    alert(`✅ ${editingReport.staff.name}-এর বেতন সমন্বয় ও কারণসমূহ সফলভাবে সংরক্ষিত হয়েছে!`);
    setEditingReport(null);
  };

  // Add custom reason line in editing modal
  const handleAddNewReasonItem = () => {
    if (!editingReport) return;
    if (newReasonItem.amount <= 0 || !newReasonItem.title.trim()) {
      alert('সঠিক শিরোনাম এবং টাকার পরিমাণ দিন');
      return;
    }

    const item: SalaryBreakdownItem = {
      id: `custom-${Date.now()}`,
      type: newReasonItem.type,
      category: newReasonItem.category,
      title: newReasonItem.title,
      amount: Number(newReasonItem.amount),
      reason: newReasonItem.reason || `${newReasonItem.title} বাবদ সমন্বয়`,
      date: now.toISOString().split('T')[0]
    };

    if (newReasonItem.category === 'addition') {
      const updatedAdditions = [...editingReport.additions, item];
      const newGross = updatedAdditions.reduce((sum, a) => sum + a.amount, 0);
      const newNet = Math.max(0, newGross - editingReport.totalDeductions);
      setEditingReport({
        ...editingReport,
        additions: updatedAdditions,
        totalAdditions: newGross,
        grossPayable: newGross,
        netSalary: newNet,
        dueAmount: Math.max(0, newNet - editingReport.paidAmount)
      });
    } else {
      const updatedDeductions = [...editingReport.deductions, item];
      const newDed = updatedDeductions.reduce((sum, d) => sum + d.amount, 0);
      const newNet = Math.max(0, editingReport.totalAdditions - newDed);
      setEditingReport({
        ...editingReport,
        deductions: updatedDeductions,
        totalDeductions: newDed,
        netSalary: newNet,
        dueAmount: Math.max(0, newNet - editingReport.paidAmount)
      });
    }

    setNewReasonItem({
      type: 'bonus',
      category: 'addition',
      title: 'উৎসব / বিশেষ বোনাস',
      amount: 0,
      reason: ''
    });
  };

  // Remove reason item
  const handleRemoveReasonItem = (id: string, category: 'addition' | 'deduction') => {
    if (!editingReport) return;
    if (id.includes('basic')) {
      alert('মূল বেতন আইটেম মোছা যাবে না। আপনি চাইলে এর পরিমাণ পরিবর্তন করতে পারেন।');
      return;
    }

    if (category === 'addition') {
      const updated = editingReport.additions.filter(a => a.id !== id);
      const newGross = updated.reduce((sum, a) => sum + a.amount, 0);
      const newNet = Math.max(0, newGross - editingReport.totalDeductions);
      setEditingReport({
        ...editingReport,
        additions: updated,
        totalAdditions: newGross,
        grossPayable: newGross,
        netSalary: newNet,
        dueAmount: Math.max(0, newNet - editingReport.paidAmount)
      });
    } else {
      const updated = editingReport.deductions.filter(d => d.id !== id);
      const newDed = updated.reduce((sum, d) => sum + d.amount, 0);
      const newNet = Math.max(0, editingReport.totalAdditions - newDed);
      setEditingReport({
        ...editingReport,
        deductions: updated,
        totalDeductions: newDed,
        netSalary: newNet,
        dueAmount: Math.max(0, newNet - editingReport.paidAmount)
      });
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'কর্মচারীর নাম', 'পদবী', 'মোবাইল', 'মাস', 'মূল বেতন (৳)', 
      'সকল ভাতা ও যোগের কারণ (বিবরণ)', 'মোট যোগ (৳)', 
      'সকল কর্তনের কারণ (বিবরণ)', 'মোট কর্তন (৳)', 
      'নিট প্রদেয় বেতন (৳)', 'পরিশোধিত (৳)', 'বকেয়া (৳)', 'পেমেন্ট স্ট্যাটাস'
    ];

    const rows = filteredReports.map(r => {
      const addDetails = r.additions.map(a => `${a.title}: ৳${a.amount} (${a.reason || ''})`).join(' | ');
      const dedDetails = r.deductions.map(d => `${d.title}: ৳${d.amount} (${d.reason || ''})`).join(' | ');
      return [
        `"${r.staff.name}"`,
        `"${r.staff.designation}"`,
        `"${r.staff.phone}"`,
        `"${r.monthLabel}"`,
        r.basic,
        `"${addDetails}"`,
        r.totalAdditions,
        `"${dedDetails}"`,
        r.totalDeductions,
        r.netSalary,
        r.paidAmount,
        r.dueAmount,
        `"${r.status === 'Paid' ? 'পরিশোধিত' : r.status === 'Partial' ? 'আংশিক বকেয়া' : 'বকেয়া'}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Payroll_Reasons_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Banner & Date Picker */}
      <div className="bg-white p-6 sm:p-8 rounded-[36px] border-2 border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20">
              <Scale size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  সকল কারণসহ পূর্ণাঙ্গ পেরোল রিপোর্ট
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-200">
                  Itemized Reason Breakdown
                </span>
              </div>
              <p className="text-slate-500 font-bold text-xs mt-0.5">
                প্রতিটি কর্মীর বেতন, ভাতা, বোনাস, ওভারটাইম, অনুপস্থিতি, জরিমানা ও লোন কর্তনের সুনির্দিষ্ট কারণসহ হিসাব
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 text-xs font-black text-slate-800">
              <Calendar size={16} className="text-indigo-600" />
              <span>মাস:</span>
              <input 
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent font-black text-slate-900 outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <FileSpreadsheet size={15} /> এক্সেল / CSV ডাউনলোড
            </button>

            <button
              onClick={() => setShowAllPrintModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
            >
              <Printer size={15} /> পূর্ণাঙ্গ রিপোর্ট প্রিন্ট
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="নাম, পদবী বা ফোন দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-2xl text-xs font-bold outline-none transition-all"
            />
          </div>

          <div>
            <select
              value={selectedStaffFilter}
              onChange={e => setSelectedStaffFilter(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">সকল কর্মচারী ({staff.length} জন)</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.designation})</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={reasonCategoryFilter}
              onChange={e => setReasonCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">সকল খাতের কারণ (All Reasons)</option>
              <option value="has_bonus">🎁 বোনাস প্রাপ্তদের তালিকা</option>
              <option value="has_ot">⏰ ওভারটাইম ভাতা প্রাপ্তদের তালিকা</option>
              <option value="has_absent">⚠️ অনুপস্থিতি কর্তন তালিকা</option>
              <option value="has_advance">💳 অগ্রিম বেতন সমন্বয় তালিকা</option>
              <option value="has_fine">⚖️ জরিমানা / ক্ষতিপূরণ কর্তন তালিকা</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">সকল পেমেন্ট স্ট্যাটাস ({detailedReports.length})</option>
              <option value="Paid">✅ সম্পূর্ণ পরিশোধিত ({summaryAggregates.paidCount})</option>
              <option value="Partial">⏳ আংশিক বকেয়া</option>
              <option value="Unpaid">⚠️ সম্পূর্ণ বকেয়া ({summaryAggregates.dueCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards: Reason Aggregates */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">মূল বেতন মোট</span>
          <div className="text-xl font-black text-slate-900 mt-2">৳{summaryAggregates.totalBasicSalary.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-slate-500 font-bold mt-1">{summaryAggregates.totalStaffCount} জন কর্মচারী</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border-2 border-emerald-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">ভাতা ও সুবিধা মোট</span>
            <ArrowUpRight size={14} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-2">+৳{summaryAggregates.totalAdditions.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-emerald-800 font-bold mt-1">যাতায়াত, খাবার ও মোবাইল</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border-2 border-indigo-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">বোনাস ও ওভারটাইম</span>
            <Gift size={14} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-700 mt-2">+৳{(summaryAggregates.totalBonus + summaryAggregates.totalOvertime).toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-indigo-800 font-bold mt-1">বোনাস: ৳{summaryAggregates.totalBonus.toLocaleString()} | ওটি: ৳{summaryAggregates.totalOvertime.toLocaleString()}</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border-2 border-rose-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">মোট কর্তন ও জরিমানা</span>
            <ArrowDownRight size={14} className="text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700 mt-2">-৳{summaryAggregates.totalDeductions.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-rose-800 font-bold mt-1">অনুপস্থিতি, লোন ও ফাইন</span>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-3xl shadow-md flex flex-col justify-between">
          <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">সর্বমোট নিট প্রদেয়</span>
          <div className="text-2xl font-black text-white mt-2">৳{summaryAggregates.totalNetPayable.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-indigo-300 font-bold mt-1">সমন্বয় পরবর্তী চূড়ান্ত বেতন</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border-2 border-amber-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">পরিশোধ বনাম বকেয়া</span>
          <div className="text-lg font-black text-emerald-700 mt-1">পরিশোধ: ৳{summaryAggregates.totalPaid.toLocaleString('en-IN')}</div>
          <div className="text-xs font-black text-rose-600">বকেয়া: ৳{summaryAggregates.totalDue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Visual Reason Breakdown Charts */}
      {(additionChartData.length > 0 || deductionChartData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-3">
            <h4 className="font-black text-sm text-slate-800 uppercase flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600"/> বেতন ও ভাতায় যোগ হওয়ার খাতভিত্তিক বিশ্লেষণ
            </h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={additionChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={v => `৳${v.toLocaleString('en-IN')}`} textAnchor="end" style={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: 10, fontWeight: 700 }} width={120} />
                  <Tooltip formatter={(val: number) => [`৳${val.toLocaleString('en-IN')}`, 'পরিমাণ']} />
                  <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                    {additionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-3">
            <h4 className="font-black text-sm text-slate-800 uppercase flex items-center gap-2">
              <TrendingDown size={16} className="text-rose-600"/> বেতন হতে কর্তন ও জরিমানার খাতভিত্তিক বিশ্লেষণ
            </h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deductionChartData.length > 0 ? deductionChartData : [{ name: 'কোনো কর্তন নেই', amount: 0, fill: '#cbd5e1' }]} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={v => `৳${v.toLocaleString('en-IN')}`} textAnchor="end" style={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: 10, fontWeight: 700 }} width={130} />
                  <Tooltip formatter={(val: number) => [`৳${val.toLocaleString('en-IN')}`, 'পরিমাণ']} />
                  <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                    {deductionChartData.map((entry, index) => (
                      <Cell key={`cell-d-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Main Detailed Breakdown List Table */}
      <div className="bg-white rounded-[36px] border-2 border-slate-100 shadow-sm overflow-hidden space-y-0">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div>
            <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Layers size={18} className="text-indigo-600"/> {monthLabel} - সকল কারণসহ বিস্তারিত পেরোল হিসাব তালিকা
            </h4>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              প্রতিটি সারির বিস্তারিত কারণ দেখতে রো-তে ক্লিক করুন অথবা 'কারণ ও এডিট' বাটনে চাপুন
            </p>
          </div>
          <span className="text-xs font-black bg-indigo-100 text-indigo-900 px-3 py-1 rounded-xl">
            {filteredReports.length} জন কর্মী
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredReports.map(rep => {
            const isExpanded = expandedStaffId === rep.staff.id;
            const isPaid = rep.status === 'Paid';
            const isPartial = rep.status === 'Partial';

            return (
              <div key={rep.staff.id} className="transition-all hover:bg-slate-50/60">
                {/* Employee Row Header */}
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Employee Info */}
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => setExpandedStaffId(isExpanded ? null : rep.staff.id)}>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                      {rep.staff.imageUrl ? (
                        <img src={rep.staff.imageUrl} alt={rep.staff.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        rep.staff.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-base">{rep.staff.name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                          {rep.staff.designation}
                        </span>
                        <button className="text-slate-400 hover:text-indigo-600">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                      <div className="text-xs text-slate-400 font-bold flex items-center gap-2 mt-0.5">
                        <span>{rep.staff.phone}</span>
                        <span>•</span>
                        <span>কাজের দিন: {rep.workedDays}/{rep.totalDays} দিন</span>
                        {rep.absentDays > 0 && <span className="text-rose-600 font-black">• {rep.absentDays} দিন অনুপস্থিত</span>}
                        {rep.overtimeHours > 0 && <span className="text-amber-600 font-black">• {rep.overtimeHours}ঘ ওটি</span>}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Key Financial Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block">মূল বেতন</span>
                      <strong className="text-slate-800 font-black">৳{rep.basic.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase block">মোট যোগ ({rep.additions.length}টি খাত)</span>
                      <strong className="text-emerald-700 font-black">+৳{rep.totalAdditions.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-rose-600 uppercase block">মোট কর্তন ({rep.deductions.length}টি খাত)</span>
                      <strong className="text-rose-700 font-black">-৳{rep.totalDeductions.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-indigo-700 uppercase block">নিট প্রদেয় বেতন</span>
                      <strong className="text-indigo-950 font-black text-sm">৳{rep.netSalary.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  {/* Right: Status & Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                      isPaid ? 'bg-emerald-100 text-emerald-800' :
                      isPartial ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {isPaid ? '✅ পরিশোধিত' : isPartial ? '⏳ আংশিক পরিশোধ' : '⚠️ বকেয়া'}
                    </span>

                    {isAdmin && (
                      <button
                        onClick={() => setEditingReport(rep)}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all active:scale-95"
                        title="কারণসহ ভাতা ও কর্তন এডিট / যোগ করুন"
                      >
                        <Edit size={14} /> কারণ ও সমন্বয়
                      </button>
                    )}

                    <button
                      onClick={() => setShowSlipModal(rep)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                      title="কারণসহ পে-স্লিপ প্রিন্ট করুন"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Breakdown with Reason Cards */}
                {isExpanded && (
                  <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* 1. Additions with Reasons Column */}
                      <div className="bg-white p-5 rounded-3xl border-2 border-emerald-100 shadow-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                          <h5 className="font-black text-xs text-emerald-800 uppercase flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-600" />
                            বেতনে যোগ হওয়া সকল খাতের কারণ ({rep.additions.length}টি)
                          </h5>
                          <span className="font-black text-emerald-700 text-xs">
                            মোট: +৳{rep.totalAdditions.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {rep.additions.map((item, idx) => (
                            <div key={item.id || idx} className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/60 flex items-start justify-between gap-3 text-xs">
                              <div>
                                <div className="font-black text-slate-900 flex items-center gap-2">
                                  <span>{item.title}</span>
                                  {item.calculationNote && (
                                    <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-100">
                                      {item.calculationNote}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                                  <strong>কারণ:</strong> {item.reason || 'নিয়মিত বেতন ও ভাতা বাবদ'}
                                </div>
                              </div>
                              <span className="font-black text-emerald-700 text-sm whitespace-nowrap">
                                +৳{item.amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 2. Deductions with Reasons Column */}
                      <div className="bg-white p-5 rounded-3xl border-2 border-rose-100 shadow-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                          <h5 className="font-black text-xs text-rose-800 uppercase flex items-center gap-2">
                            <TrendingDown size={16} className="text-rose-600" />
                            বেতন হতে কর্তন ও জরিমানার সকল কারণ ({rep.deductions.length}টি)
                          </h5>
                          <span className="font-black text-rose-700 text-xs">
                            মোট কর্তন: -৳{rep.totalDeductions.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {rep.deductions.map((item, idx) => (
                            <div key={item.id || idx} className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100/60 flex items-start justify-between gap-3 text-xs">
                              <div>
                                <div className="font-black text-slate-900 flex items-center gap-2">
                                  <span>{item.title}</span>
                                  {item.calculationNote && (
                                    <span className="text-[10px] text-rose-700 font-bold bg-white px-2 py-0.5 rounded-md border border-rose-100">
                                      {item.calculationNote}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                                  <strong>কারণ:</strong> {item.reason || 'নিয়ম অনুযায়ী কর্তন বাবদ'}
                                </div>
                              </div>
                              <span className="font-black text-rose-700 text-sm whitespace-nowrap">
                                -৳{item.amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                          {rep.deductions.length === 0 && (
                            <div className="p-4 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                              এই মাসে কোনো প্রকার কর্তন বা জরিমানা নেই (শূন্য কর্তন)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payment Transaction Trail */}
                    {rep.payments.length > 0 && (
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <span className="text-[11px] font-black text-slate-700 uppercase block mb-2">
                          পরিশোধের লেনদেন ইতিহাস (Payment History):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          {rep.payments.map((pay, i) => (
                            <div key={pay.id || i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="font-black text-emerald-700">৳{Number(pay.amount).toLocaleString('en-IN')}</div>
                              <div className="text-[10px] text-slate-500 font-bold">{pay.date} • {pay.method}</div>
                              {pay.note && <div className="text-[10px] text-slate-700 italic mt-0.5">{pay.note}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredReports.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-black text-xs uppercase tracking-widest">
              কোনো কর্মচারীর পেরোল ডেটা পাওয়া যায়নি
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT / CUSTOMIZE REASONS & ADJUSTMENTS (কারণ ও সমন্বয় এডিটর) */}
      {/* ========================================================================= */}
      {editingReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[36px] max-w-3xl w-full p-6 sm:p-8 shadow-2xl border-2 border-slate-100 max-h-[92vh] overflow-y-auto animate-in zoom-in duration-300">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                  <Edit size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg">
                    বেতন, ভাতা ও কর্তনের কারণ এডিট ও সমন্বয়
                  </h4>
                  <p className="text-xs font-bold text-slate-500">
                    {editingReport.staff.name} ({editingReport.staff.designation}) • {editingReport.monthLabel}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingReport(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBreakdownAdjustments} className="space-y-6 pt-4">
              {/* Basic Salary Edit */}
              <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-black text-slate-800 block">মূল বেতন (Basic Salary)</label>
                  <span className="text-[10px] text-slate-500 font-bold">কর্মচারীর মাসিক নির্ধারিত মূল বেতন</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={editingReport.basic}
                    onChange={e => {
                      const newBasic = Number(e.target.value) || 0;
                      const updatedAdds = editingReport.additions.map(a => a.type === 'basic' ? { ...a, amount: newBasic } : a);
                      const newGross = updatedAdds.reduce((sum, a) => sum + a.amount, 0);
                      const newNet = Math.max(0, newGross - editingReport.totalDeductions);
                      setEditingReport({
                        ...editingReport,
                        basic: newBasic,
                        additions: updatedAdds,
                        totalAdditions: newGross,
                        grossPayable: newGross,
                        netSalary: newNet,
                        dueAmount: Math.max(0, newNet - editingReport.paidAmount)
                      });
                    }}
                    className="w-36 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm font-black text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Add New Custom Reason Section */}
              <div className="bg-indigo-50/60 p-5 rounded-3xl border-2 border-indigo-100 space-y-3">
                <h5 className="font-black text-xs text-indigo-950 uppercase flex items-center gap-2">
                  <Plus size={16} className="text-indigo-600"/> নতুন কোনো কারণসহ ভাতা বা কর্তন যোগ করুন
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">ক্যাটাগরি</label>
                    <select
                      value={newReasonItem.category}
                      onChange={e => setNewReasonItem({ ...newReasonItem, category: e.target.value as any })}
                      className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="addition">➕ ভাতা / যোগ (Addition)</option>
                      <option value="deduction">➖ কর্তন / বিয়োগ (Deduction)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">খাতের নাম / টাইটেল</label>
                    <input
                      type="text"
                      placeholder="যেমন: ঈদ বোনাস, কাঁচ ভাঙার জরিমানা..."
                      value={newReasonItem.title}
                      onChange={e => setNewReasonItem({ ...newReasonItem, title: e.target.value })}
                      className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">টাকার পরিমাণ (৳)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={newReasonItem.amount || ''}
                      onChange={e => setNewReasonItem({ ...newReasonItem, amount: Number(e.target.value) || 0 })}
                      className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 text-xs font-black text-indigo-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">সুনির্দিষ্ট কারণ ও বিবরণ</label>
                  <input
                    type="text"
                    placeholder="যেমন: পবিত্র ঈদুল ফিতর উপলক্ষে ১ মাসের ঈদ বোনাস মঞ্জুর"
                    value={newReasonItem.reason}
                    onChange={e => setNewReasonItem({ ...newReasonItem, reason: e.target.value })}
                    className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddNewReasonItem}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  <Plus size={14} /> এই আইটেমটি তালিকায় যুক্ত করুন
                </button>
              </div>

              {/* Current Additions Items List */}
              <div className="space-y-3">
                <h5 className="font-black text-xs text-emerald-800 uppercase flex items-center justify-between">
                  <span>ভাতা ও যোগের আইটেমসমূহ ({editingReport.additions.length}টি)</span>
                  <span>মোট: ৳{editingReport.totalAdditions.toLocaleString('en-IN')}</span>
                </h5>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {editingReport.additions.map(item => (
                    <div key={item.id} className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3 text-xs">
                      <div className="grow">
                        <div className="font-black text-slate-900">{item.title}</div>
                        <input
                          type="text"
                          value={item.reason || ''}
                          onChange={e => {
                            const val = e.target.value;
                            const updated = editingReport.additions.map(a => a.id === item.id ? { ...a, reason: val } : a);
                            setEditingReport({ ...editingReport, additions: updated });
                          }}
                          placeholder="কারণ লিখুন..."
                          className="w-full mt-1 bg-white border border-emerald-200 rounded-lg p-1.5 text-[11px] text-slate-700 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            const updated = editingReport.additions.map(a => a.id === item.id ? { ...a, amount: val } : a);
                            const newGross = updated.reduce((sum, a) => sum + a.amount, 0);
                            const newNet = Math.max(0, newGross - editingReport.totalDeductions);
                            setEditingReport({
                              ...editingReport,
                              additions: updated,
                              totalAdditions: newGross,
                              grossPayable: newGross,
                              netSalary: newNet,
                              dueAmount: Math.max(0, newNet - editingReport.paidAmount)
                            });
                          }}
                          className="w-24 bg-white border border-emerald-200 rounded-lg p-1.5 font-black text-right text-emerald-800 text-xs outline-none"
                        />
                        {item.type !== 'basic' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReasonItem(item.id, 'addition')}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                            title="আইটেম মুছুন"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Deductions Items List */}
              <div className="space-y-3">
                <h5 className="font-black text-xs text-rose-800 uppercase flex items-center justify-between">
                  <span>কর্তন ও জরিমানার আইটেমসমূহ ({editingReport.deductions.length}টি)</span>
                  <span>মোট কর্তন: ৳{editingReport.totalDeductions.toLocaleString('en-IN')}</span>
                </h5>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {editingReport.deductions.map(item => (
                    <div key={item.id} className="p-3 bg-rose-50/60 border border-rose-100 rounded-2xl flex items-center justify-between gap-3 text-xs">
                      <div className="grow">
                        <div className="font-black text-slate-900">{item.title}</div>
                        <input
                          type="text"
                          value={item.reason || ''}
                          onChange={e => {
                            const val = e.target.value;
                            const updated = editingReport.deductions.map(d => d.id === item.id ? { ...d, reason: val } : d);
                            setEditingReport({ ...editingReport, deductions: updated });
                          }}
                          placeholder="কর্তনের কারণ লিখুন..."
                          className="w-full mt-1 bg-white border border-rose-200 rounded-lg p-1.5 text-[11px] text-slate-700 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            const updated = editingReport.deductions.map(d => d.id === item.id ? { ...d, amount: val } : d);
                            const newDed = updated.reduce((sum, d) => sum + d.amount, 0);
                            const newNet = Math.max(0, editingReport.totalAdditions - newDed);
                            setEditingReport({
                              ...editingReport,
                              deductions: updated,
                              totalDeductions: newDed,
                              netSalary: newNet,
                              dueAmount: Math.max(0, newNet - editingReport.paidAmount)
                            });
                          }}
                          className="w-24 bg-white border border-rose-200 rounded-lg p-1.5 font-black text-right text-rose-800 text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveReasonItem(item.id, 'deduction')}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          title="কর্তন আইটেম মুছুন"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {editingReport.deductions.length === 0 && (
                    <div className="p-3 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                      বর্তমানে কোনো কর্তন যুক্ত নেই
                    </div>
                  )}
                </div>
              </div>

              {/* Net Summary Calculation Bar */}
              <div className="p-4 bg-slate-900 text-white rounded-3xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-300 block">চূড়ান্ত নিট প্রদেয় বেতন:</span>
                  <strong className="text-xl font-black text-white">৳{editingReport.netSalary.toLocaleString('en-IN')}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-rose-300 block">অবশিষ্ট বকেয়া:</span>
                  <strong className="text-base font-black text-rose-400">৳{editingReport.dueAmount.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Check size={16} /> কারণ ও সমন্বয় সংরক্ষণ করুন (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETAILED PRINTABLE SALARY SLIP WITH ALL REASONS (কারণসহ রসিদ) */}
      {/* ========================================================================= */}
      {showSlipModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[36px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border-2 border-slate-100 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2 font-black text-slate-900">
                <FileText size={18} className="text-indigo-600"/>
                <span>কারণসহ বিস্তারিত বেতন বিবরণী স্লিপ (Itemized Payslip)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 text-white font-black text-xs rounded-xl hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer size={14} /> প্রিন্ট করুন
                </button>
                <button
                  onClick={() => setShowSlipModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="py-6 space-y-6">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-black text-slate-900 uppercase">
                  {shopSettings?.name || 'REST BAZAR'}
                </h2>
                <p className="text-xs text-slate-500 font-bold">{shopSettings?.address || 'বাংলাদেশ'}</p>
                <div className="inline-block bg-indigo-900 text-white text-[11px] font-black uppercase px-4 py-1 rounded-full mt-2">
                  কর্মচারী মাসিক বেতন ও কারণ বিবরণী — {showSlipModal.monthLabel}
                </div>
              </div>

              {/* Staff Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">কর্মচারীর নাম:</span>
                  <strong className="text-slate-900 font-black text-sm">{showSlipModal.staff.name}</strong>
                  <div className="text-slate-500 font-bold text-[11px]">{showSlipModal.staff.designation} • {showSlipModal.staff.phone}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">হাজিরা ও ডিউটি তথ্য:</span>
                  <strong className="text-slate-900 font-bold">কাজের দিন: {showSlipModal.workedDays} / {showSlipModal.totalDays} দিন</strong>
                  <div className="text-slate-500 font-medium text-[10px]">দৈনিক রেট: ৳{showSlipModal.dailyRate.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Additions Table with Reasons */}
              <div>
                <h5 className="font-black text-xs text-emerald-800 uppercase tracking-wider mb-2 border-b pb-1">
                  ১. অর্জিত বেতন, ভাতা ও অন্যান্য যোগের কারণসহ বিবরণ
                </h5>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase">
                    <tr>
                      <th className="py-1.5 px-2 text-left">খাত / বিবরণ</th>
                      <th className="py-1.5 px-2 text-left">সুনির্দিষ্ট কারণ</th>
                      <th className="py-1.5 px-2 text-right">পরিমাণ (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {showSlipModal.additions.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2 px-2 font-black text-slate-800">{item.title}</td>
                        <td className="py-2 px-2 text-slate-600 font-medium">{item.reason || '-'}</td>
                        <td className="py-2 px-2 text-right font-black text-emerald-700">+৳{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-50/80 font-black">
                      <td colSpan={2} className="py-2 px-2 text-emerald-900">মোট অর্জিত বেতন ও ভাতা (Gross)</td>
                      <td className="py-2 px-2 text-right text-emerald-900">+৳{showSlipModal.totalAdditions.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions Table with Reasons */}
              <div>
                <h5 className="font-black text-xs text-rose-800 uppercase tracking-wider mb-2 border-b pb-1">
                  ২. বেতন হতে কর্তন, অগ্রিম ও জরিমানার কারণসহ বিবরণ
                </h5>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase">
                    <tr>
                      <th className="py-1.5 px-2 text-left">কর্তনের খাত</th>
                      <th className="py-1.5 px-2 text-left">সুনির্দিষ্ট কারণ</th>
                      <th className="py-1.5 px-2 text-right">পরিমাণ (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {showSlipModal.deductions.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2 px-2 font-black text-slate-800">{item.title}</td>
                        <td className="py-2 px-2 text-slate-600 font-medium">{item.reason || '-'}</td>
                        <td className="py-2 px-2 text-right font-black text-rose-700">-৳{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {showSlipModal.deductions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-2 px-2 text-center text-slate-400 italic">কোনো প্রকার কর্তন বা জরিমানা নেই</td>
                      </tr>
                    )}
                    <tr className="bg-rose-50/80 font-black">
                      <td colSpan={2} className="py-2 px-2 text-rose-900">মোট কর্তন ও জরিমানা</td>
                      <td className="py-2 px-2 text-right text-rose-900">-৳{showSlipModal.totalDeductions.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Final Summary Card */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] font-black text-indigo-200 block">সর্বমোট প্রদেয় নিট বেতন:</span>
                  <strong className="text-xl font-black text-white">৳{showSlipModal.netSalary.toLocaleString('en-IN')}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-300 block">পরিশোধিত: ৳{showSlipModal.paidAmount.toLocaleString('en-IN')}</span>
                  <span className="text-xs font-black text-rose-300 block">বকেয়া: ৳{showSlipModal.dueAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-10 grid grid-cols-2 text-center text-xs text-slate-500">
                <div>
                  <div className="w-36 border-t border-slate-400 mx-auto mb-1"></div>
                  <span>কর্মচারীর স্বাক্ষর</span>
                </div>
                <div>
                  <div className="w-36 border-t border-slate-400 mx-auto mb-1"></div>
                  <span>কর্তৃপক্ষের স্বাক্ষর ও সিল</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRINT ALL EMPLOYEES COMPREHENSIVE REASON REPORT */}
      {/* ========================================================================= */}
      {showAllPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[36px] max-w-5xl w-full p-6 sm:p-8 shadow-2xl border-2 border-slate-100 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-indigo-600" />
                <h4 className="font-black text-slate-900 text-base">সকল কারণসহ সম্পূর্ণ পেরোল বিবরণী প্রিন্ট</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md"
                >
                  <Printer size={14} /> প্রিন্ট করুন
                </button>
                <button 
                  onClick={() => setShowAllPrintModal(false)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Full Ledger */}
            <div className="p-4 sm:p-6 bg-white space-y-4 print:p-0">
              <div className="text-center pb-3 border-b-2 border-slate-900">
                <h2 className="text-2xl font-black text-slate-900">{shopSettings?.name || 'রেস্তোরাঁ ও বাণিজ্যালয়'}</h2>
                <p className="text-xs font-bold text-slate-600">সকল কর্মচারীর কারণসহ মাসিক পেরোল ও বেতন হিসাব বিবরণী — {monthLabel}</p>
              </div>

              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 font-black text-[10px] uppercase border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center">ক্র.নং</th>
                    <th className="p-2 border-r border-slate-300">কর্মচারী</th>
                    <th className="p-2 text-right border-r border-slate-300">মূল বেতন</th>
                    <th className="p-2 border-r border-slate-300">ভাতা ও যোগ হওয়ার কারণ</th>
                    <th className="p-2 text-right border-r border-slate-300">মোট যোগ</th>
                    <th className="p-2 border-r border-slate-300">কর্তন ও জরিমানার কারণ</th>
                    <th className="p-2 text-right border-r border-slate-300">মোট কর্তন</th>
                    <th className="p-2 text-right border-r border-slate-300">নিট বেতন</th>
                    <th className="p-2 text-right border-r border-slate-300">পরিশোধিত</th>
                    <th className="p-2 text-right border-r border-slate-300">বকেয়া</th>
                    <th className="p-2 text-center">স্বাক্ষর</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {detailedReports.map((r, i) => (
                    <tr key={r.staff.id}>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{i + 1}</td>
                      <td className="p-2 border-r border-slate-300">
                        <div className="font-black">{r.staff.name}</div>
                        <div className="text-[10px] text-slate-600">{r.staff.designation}</div>
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-black">
                        ৳{r.basic.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-[10px] max-w-[200px]">
                        {r.additions.filter(a => a.type !== 'basic').map(a => `${a.title}: ৳${a.amount} (${a.reason || ''})`).join('; ') || 'কোনো অতিরিক্ত ভাতা নেই'}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right text-emerald-700 font-black">
                        +৳{r.totalAdditions.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-[10px] max-w-[200px]">
                        {r.deductions.map(d => `${d.title}: ৳${d.amount} (${d.reason || ''})`).join('; ') || 'কোনো কর্তন নেই'}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right text-rose-700 font-black">
                        -৳{r.totalDeductions.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-black text-indigo-950">
                        ৳{r.netSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right text-emerald-800 font-black">
                        ৳{r.paidAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right text-rose-800 font-black">
                        ৳{r.dueAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-center">
                        <div className="h-6"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-black border-t-2 border-slate-900">
                  <tr>
                    <td colSpan={2} className="p-2 border-r border-slate-300 text-right">সর্বমোট:</td>
                    <td className="p-2 border-r border-slate-300 text-right">৳{summaryAggregates.totalBasicSalary.toLocaleString('en-IN')}</td>
                    <td className="p-2 border-r border-slate-300">-</td>
                    <td className="p-2 border-r border-slate-300 text-right text-emerald-800">+৳{(summaryAggregates.totalBasicSalary + summaryAggregates.totalAdditions).toLocaleString('en-IN')}</td>
                    <td className="p-2 border-r border-slate-300">-</td>
                    <td className="p-2 border-r border-slate-300 text-right text-rose-800">-৳{summaryAggregates.totalDeductions.toLocaleString('en-IN')}</td>
                    <td className="p-2 border-r border-slate-300 text-right text-indigo-950">৳{summaryAggregates.totalNetPayable.toLocaleString('en-IN')}</td>
                    <td className="p-2 border-r border-slate-300 text-right text-emerald-900">৳{summaryAggregates.totalPaid.toLocaleString('en-IN')}</td>
                    <td className="p-2 border-r border-slate-300 text-right text-rose-900">৳{summaryAggregates.totalDue.toLocaleString('en-IN')}</td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">হিসাবরক্ষকের স্বাক্ষর</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">স্বত্বাধিকারী / অনুমোদকের স্বাক্ষর</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
