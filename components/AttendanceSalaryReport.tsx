import React, { useState, useMemo } from 'react';
import { Staff, Attendance, LeaveRequest, Payroll, PayrollPaymentRecord, Expense, ShopSettings } from '../types';
import { 
  FileText, Banknote, Calendar, CheckCircle2, Clock, 
  Search, Filter, Printer, Download, CreditCard, ChevronLeft, 
  ChevronRight, DollarSign, Wallet, ArrowUpRight, History, 
  AlertCircle, Check, X, Building2, User, Phone, Sparkles,
  Flame, Timer, ShieldCheck, RefreshCw, BadgeCheck, Copy, Eye, CalendarDays
} from 'lucide-react';

interface AttendanceSalaryReportProps {
  staff: Staff[];
  attendances: Attendance[];
  leaves: LeaveRequest[];
  payrolls?: Payroll[];
  onUpdatePayrolls?: (data: Payroll[]) => void;
  onAddExpense?: (expense: Partial<Expense>) => void;
  shopSettings?: ShopSettings | null;
  isAdmin: boolean;
  currentStaff: Staff | null;
}

export interface StaffPeriodReport {
  staff: Staff;
  totalPeriodDays: number;
  presentDays: number;
  lateDays: number;
  leaveDays: number;
  absentDays: number;
  totalWorkedDays: number;
  totalWorkMinutes: number;
  totalWorkHours: number;
  overtimeHours: number;
  basicSalary: number;
  allowances: number;
  grossSalary: number;
  dailyRate: number;
  earnedSalary: number;
  overtimePay: number;
  pawnaTaka: number;
  openingAdvance: number;
  totalPayable: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Advance';
  payroll?: Payroll;
  recentPayments: PayrollPaymentRecord[];
  dutyStartTime: string;
  dutyEndTime: string;
  dutyHours: number;
  shiftName: string;
}

export const AttendanceSalaryReport: React.FC<AttendanceSalaryReportProps> = ({
  staff,
  attendances,
  leaves,
  payrolls = [],
  onUpdatePayrolls,
  onAddExpense,
  shopSettings,
  isAdmin,
  currentStaff
}) => {
  // Filters & Period State
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(`${currentMonthStr}-01`);
  const [endDate, setEndDate] = useState<string>(now.toISOString().split('T')[0]);
  const [search, setSearch] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Partial' | 'Unpaid'>('all');

  // Modals
  const [payingStaffReport, setPayingStaffReport] = useState<StaffPeriodReport | null>(null);
  const [historyStaffReport, setHistoryStaffReport] = useState<StaffPeriodReport | null>(null);
  const [slipStaffReport, setSlipStaffReport] = useState<StaffPeriodReport | null>(null);
  const [showPrintAllModal, setShowPrintAllModal] = useState<boolean>(false);
  const [attendanceSheetStaff, setAttendanceSheetStaff] = useState<StaffPeriodReport | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Pay Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [payDate, setPayDate] = useState<string>(now.toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState<string>('');
  const [payVoucherNo, setPayVoucherNo] = useState<string>('');
  const [isProcessingPay, setIsProcessingPay] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
    setUseCustomRange(false);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
    setUseCustomRange(false);
  };

  const handleSetThisMonth = () => {
    setSelectedMonth(currentMonthStr);
    setUseCustomRange(false);
  };

  const handleSetLastMonth = () => {
    const [y, m] = currentMonthStr.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
    setUseCustomRange(false);
  };

  // Date range determination
  const { periodStart, periodEnd, totalPeriodDays, monthLabel } = useMemo(() => {
    if (useCustomRange && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return {
        periodStart: startDate,
        periodEnd: endDate,
        totalPeriodDays: Math.max(1, diffDays),
        monthLabel: `${startDate} হতে ${endDate}`
      };
    }

    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const pStart = `${selectedMonth}-01`;
    const pEnd = `${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;
    
    // Bengali Month Name Format
    const monthNames = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const bMonthName = monthNames[month - 1] || '';
    const bYear = year;

    return {
      periodStart: pStart,
      periodEnd: pEnd,
      totalPeriodDays: daysInMonth,
      monthLabel: `${bMonthName} ${bYear} (${selectedMonth})`
    };
  }, [selectedMonth, useCustomRange, startDate, endDate]);

  // Working Hours calculation helper
  const calculateShiftMinutes = (checkIn?: string, checkOut?: string): number => {
    if (!checkIn || !checkOut) return 0;
    try {
      const [inH, inM] = checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
      let diff = (outH * 60 + outM) - (inH * 60 + inM);
      if (diff < 0) diff += 24 * 60; // Overnight
      return diff;
    } catch {
      return 0;
    }
  };

  // Compile full report per staff
  const staffReports: StaffPeriodReport[] = useMemo(() => {
    return staff.map(member => {
      // Find attendances in period
      const memberAtts = attendances.filter(a => 
        a.staffId === member.id && 
        a.date >= periodStart && 
        a.date <= periodEnd
      );

      let presentDays = 0;
      let lateDays = 0;
      let leaveDays = 0;
      let absentDays = 0;
      let totalWorkMinutes = 0;
      let overtimeMinutes = 0;

      const scheduledDutyHours = member.dutyHours || 9;
      const scheduledShiftStart = member.dutyStartTime || '09:00';
      const scheduledShiftEnd = member.dutyEndTime || '18:00';
      const scheduledShiftName = member.shiftName || 'ডে শিফট';

      memberAtts.forEach(att => {
        if (att.status === 'Present') presentDays += 1;
        else if (att.status === 'Late') lateDays += 1;
        else if (att.status === 'Leave') leaveDays += 1;
        else if (att.status === 'Absent') absentDays += 1;

        if (att.checkIn && att.checkOut) {
          const shiftMins = calculateShiftMinutes(att.checkIn, att.checkOut);
          totalWorkMinutes += shiftMins;
          if (shiftMins > scheduledDutyHours * 60) {
            overtimeMinutes += (shiftMins - scheduledDutyHours * 60);
          }
        }
      });

      // Approved leaves from leaves state in period
      const memberLeaves = leaves.filter(l => 
        l.staffId === member.id && 
        l.status === 'Approved' &&
        l.startDate <= periodEnd &&
        l.endDate >= periodStart
      );
      if (memberLeaves.length > 0 && leaveDays === 0) {
        leaveDays = memberLeaves.length;
      }

      // Total worked days = Present + Late
      const totalWorkedDays = presentDays + lateDays;

      // Salary Structure
      const basicSalary = member.salaryStructure?.basic || 15000;
      const travelAmt = member.salaryStructure?.travelAllowance || 0;
      const foodAmt = member.salaryStructure?.foodAllowance || 0;
      const mobileAmt = member.salaryStructure?.mobileAllowance || 0;
      const houseRentAmt = member.salaryStructure?.houseRentAllowance || 0;
      const medicalAmt = member.salaryStructure?.medicalAllowance || 0;
      const specialAmt = member.salaryStructure?.specialAllowance || 0;
      const otherAmt = member.salaryStructure?.otherAllowance || 0;
      const fixedBonusAmt = member.salaryStructure?.fixedBonus || 0;
      const dailyAllowAmt = (member.salaryStructure?.dailyAllowance || 0) * totalWorkedDays;

      const allowances = travelAmt + foodAmt + mobileAmt + houseRentAmt + medicalAmt + specialAmt + otherAmt + fixedBonusAmt + dailyAllowAmt;
      const grossSalary = basicSalary + allowances;

      // Daily Rate = Gross Salary / Total Days in Period
      const dailyRate = totalPeriodDays > 0 ? Math.round(grossSalary / totalPeriodDays) : 0;

      // Attendance-based Earned Salary
      // If employee worked all days (or no attendance system was used yet), full gross; otherwise proportional
      const earnedSalary = totalWorkedDays > 0 
        ? Math.min(grossSalary, Math.round(dailyRate * totalWorkedDays))
        : (memberAtts.length === 0 ? grossSalary : 0);

      // Overtime Pay calculation based on scheduled daily rate and duty hours
      const hourlyRate = dailyRate > 0 ? Math.round(dailyRate / scheduledDutyHours) : 0;
      const overtimeHours = Number((overtimeMinutes / 60).toFixed(1));
      const overtimePay = Math.round(overtimeHours * (member.overtimeRatePerHour || hourlyRate));

      // Previous Pawna & Advance
      const pawnaTaka = Number(member.pawnaTaka) || 0;
      const openingAdvance = Number(member.openingAdvance) || 0;

      const totalPayable = Math.max(0, earnedSalary + overtimePay + pawnaTaka - openingAdvance);

      // Existing Payroll Record check
      const payrollMonthKey = useCustomRange ? selectedMonth : selectedMonth;
      const existingPayroll = payrolls.find(p => p.staffId === member.id && p.month === payrollMonthKey);

      let paidAmount = 0;
      let recentPayments: PayrollPaymentRecord[] = [];

      if (existingPayroll) {
        if (existingPayroll.payments && existingPayroll.payments.length > 0) {
          recentPayments = existingPayroll.payments;
          paidAmount = existingPayroll.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        } else if (existingPayroll.paidAmount !== undefined && existingPayroll.paidAmount > 0) {
          paidAmount = existingPayroll.paidAmount;
        } else if (existingPayroll.status === 'Paid') {
          paidAmount = existingPayroll.netSalary || totalPayable;
        }
      }

      const dueAmount = Math.max(0, totalPayable - paidAmount);

      let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Advance' = 'Unpaid';
      if (paidAmount >= totalPayable && totalPayable > 0) {
        paymentStatus = 'Paid';
      } else if (paidAmount > 0 && paidAmount < totalPayable) {
        paymentStatus = 'Partial';
      } else if (paidAmount > totalPayable) {
        paymentStatus = 'Advance';
      } else {
        paymentStatus = 'Unpaid';
      }

      const totalWorkHours = Number((totalWorkMinutes / 60).toFixed(1));

      return {
        staff: member,
        totalPeriodDays,
        presentDays,
        lateDays,
        leaveDays,
        absentDays,
        totalWorkedDays,
        totalWorkMinutes,
        totalWorkHours,
        overtimeHours,
        basicSalary,
        allowances,
        grossSalary,
        dailyRate,
        earnedSalary,
        overtimePay,
        pawnaTaka,
        openingAdvance,
        totalPayable,
        paidAmount,
        dueAmount,
        paymentStatus,
        payroll: existingPayroll,
        recentPayments,
        dutyStartTime: scheduledShiftStart,
        dutyEndTime: scheduledShiftEnd,
        dutyHours: scheduledDutyHours,
        shiftName: scheduledShiftName
      };
    });
  }, [staff, attendances, leaves, payrolls, periodStart, periodEnd, totalPeriodDays, selectedMonth, useCustomRange]);

  // Filtered reports for search, department, and status
  const filteredReports = useMemo(() => {
    return staffReports.filter(rep => {
      const matchSearch = rep.staff.name.toLowerCase().includes(search.toLowerCase()) ||
                          rep.staff.phone.includes(search) ||
                          rep.staff.designation.toLowerCase().includes(search.toLowerCase()) ||
                          (rep.staff.department && rep.staff.department.toLowerCase().includes(search.toLowerCase()));
      
      const matchDept = departmentFilter === 'all' || rep.staff.department === departmentFilter || rep.staff.designation === departmentFilter;
      const matchStatus = statusFilter === 'all' || rep.paymentStatus === statusFilter;

      return matchSearch && matchDept && matchStatus;
    });
  }, [staffReports, search, departmentFilter, statusFilter]);

  // Overall aggregates
  const summary = useMemo(() => {
    const totalStaffCount = staffReports.length;
    const totalWorkingDaysAll = staffReports.reduce((sum, r) => sum + r.totalWorkedDays, 0);
    const totalPayableAll = staffReports.reduce((sum, r) => sum + r.totalPayable, 0);
    const totalPaidAll = staffReports.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalDueAll = staffReports.reduce((sum, r) => sum + r.dueAmount, 0);
    const totalHoursAll = staffReports.reduce((sum, r) => sum + r.totalWorkHours, 0);

    const paidCount = staffReports.filter(r => r.paymentStatus === 'Paid').length;
    const partialCount = staffReports.filter(r => r.paymentStatus === 'Partial').length;
    const unpaidCount = staffReports.filter(r => r.paymentStatus === 'Unpaid').length;

    return {
      totalStaffCount,
      totalWorkingDaysAll,
      totalPayableAll,
      totalPaidAll,
      totalDueAll,
      totalHoursAll,
      paidCount,
      partialCount,
      unpaidCount
    };
  }, [staffReports]);

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    staff.forEach(s => {
      if (s.department) set.add(s.department);
      if (s.designation) set.add(s.designation);
    });
    return Array.from(set);
  }, [staff]);

  // Open Pay Modal handler
  const handleOpenPayModal = (report: StaffPeriodReport) => {
    setPayingStaffReport(report);
    setPayAmount(report.dueAmount > 0 ? report.dueAmount : report.totalPayable);
    setPayMethod(report.staff.bkashNo ? 'bKash' : (report.staff.bankAccountNo ? 'Bank' : 'Cash'));
    setPayDate(now.toISOString().split('T')[0]);
    setPayVoucherNo(`PAY-${Date.now().toString().slice(-6)}`);
    setPayNote(`${monthLabel} এর বেতন পরিশোধ`);
  };

  // Submit Salary Payment
  const handleConfirmSalaryPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingStaffReport || !isAdmin) return;
    if (payAmount <= 0) {
      alert('অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন');
      return;
    }

    setIsProcessingPay(true);

    try {
      const staffMember = payingStaffReport.staff;
      const payrollMonthKey = selectedMonth;
      const targetPayrollId = `PAY-${staffMember.id}-${payrollMonthKey}`;

      const newPaymentRecord: PayrollPaymentRecord = {
        id: `RCP-${Date.now()}`,
        amount: payAmount,
        date: payDate,
        method: payMethod,
        note: payNote || `${monthLabel} এর বেতন বাবদ পরিশোধ`,
        paidBy: currentStaff?.name || 'Admin'
      };

      const existingPayroll = payrolls.find(p => p.staffId === staffMember.id && p.month === payrollMonthKey);
      
      const previousPayments = existingPayroll?.payments || (existingPayroll?.paidAmount ? [{
        id: `RCP-PREV-${staffMember.id}`,
        amount: existingPayroll.paidAmount,
        date: existingPayroll.paymentDate || payDate,
        method: existingPayroll.paymentMethod || 'Cash',
        note: 'পূর্ববর্তী পেমেন্ট'
      }] : []);

      const updatedPayments = [newPaymentRecord, ...previousPayments];
      const newTotalPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const newDue = Math.max(0, payingStaffReport.totalPayable - newTotalPaid);
      const newStatus: 'Draft' | 'Paid' | 'Partial' = newTotalPaid >= payingStaffReport.totalPayable ? 'Paid' : 'Partial';

      const updatedPayrollItem: Payroll = {
        id: existingPayroll?.id || targetPayrollId,
        staffId: staffMember.id,
        month: payrollMonthKey,
        basic: payingStaffReport.basicSalary,
        allowances: payingStaffReport.allowances,
        commission: 0,
        bonus: 0,
        overtime: payingStaffReport.overtimePay,
        deductions: 0,
        netSalary: payingStaffReport.totalPayable,
        status: newStatus,
        paymentDate: payDate,
        paidAmount: newTotalPaid,
        dueAmount: newDue,
        paymentMethod: payMethod,
        note: payNote,
        workedDays: payingStaffReport.totalWorkedDays,
        totalDays: payingStaffReport.totalPeriodDays,
        dailyRate: payingStaffReport.dailyRate,
        payments: updatedPayments
      };

      // 1. Update Payrolls
      const updatedPayrolls = [
        ...payrolls.filter(p => !(p.staffId === staffMember.id && p.month === payrollMonthKey)),
        updatedPayrollItem
      ];

      if (onUpdatePayrolls) {
        onUpdatePayrolls(updatedPayrolls);
      }

      // 2. Automatically record in shop Expenses so cash flow is completely synchronized
      if (onAddExpense) {
        onAddExpense({
          id: `EXP-SAL-${Date.now()}`,
          amount: payAmount,
          category: 'কর্মচারী বেতন',
          description: `${staffMember.name} - এর বেতন বাবদ পরিশোধ (${monthLabel}) [ভাউচার: ${payVoucherNo}]`,
          date: payDate
        });
      }

      showToast(`✅ ${staffMember.name}-কে ৳${payAmount.toLocaleString('en-IN')} বেতন সফলভাবে পরিশোধ করা হয়েছে!`);
      setPayingStaffReport(null);
    } catch (err) {
      console.error('Payment Error:', err);
      alert('পেমেন্ট সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsProcessingPay(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border-2 border-cyan-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <BadgeCheck className="text-cyan-400" size={20} />
          <span className="text-xs font-black">{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls Card */}
      <div className="bg-white p-5 sm:p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/20">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">কর্মচারী হাজিরা ও বেতন রিপোর্ট</h3>
                <p className="text-xs font-bold text-slate-500">
                  মোট কাজের দিন, প্রাপ্য বেতন, সরাসরি পরিশোধ (Pay) ও বকেয়া ট্র্যাকিং
                </p>
              </div>
            </div>
          </div>

          {/* Month / Period Picker & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!useCustomRange ? (
              <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl p-1 shadow-xs">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 text-slate-600 hover:text-slate-950 hover:bg-white rounded-xl transition-all"
                  title="পূর্ববর্তী মাস"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="px-3 flex items-center gap-1.5 font-black text-xs text-slate-900">
                  <Calendar size={14} className="text-cyan-600" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent font-black text-xs text-slate-900 outline-none cursor-pointer"
                  />
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-2 text-slate-600 hover:text-slate-950 hover:bg-white rounded-xl transition-all"
                  title="পরবর্তী মাস"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-1.5 text-xs font-bold">
                <span className="text-slate-500 text-[10px] font-black uppercase">শুরু:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent font-black text-slate-800 text-xs outline-none"
                />
                <span className="text-slate-400 font-black">-</span>
                <span className="text-slate-500 text-[10px] font-black uppercase">শেষ:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent font-black text-slate-800 text-xs outline-none"
                />
              </div>
            )}

            {/* Quick Filter Buttons */}
            <button
              onClick={handleSetThisMonth}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                !useCustomRange && selectedMonth === currentMonthStr
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              চলতি মাস
            </button>
            <button
              onClick={handleSetLastMonth}
              className="px-3 py-2 rounded-xl text-xs font-black bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all"
            >
              গত মাস
            </button>
            <button
              onClick={() => setUseCustomRange(!useCustomRange)}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                useCustomRange ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Filter size={13} />
              {useCustomRange ? 'মাসিক ভিউ' : 'কাস্টম তারিখ'}
            </button>

            {/* Print All Report Button */}
            <button
              onClick={() => setShowPrintAllModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <Printer size={14} /> রিপোর্ট প্রিন্ট
            </button>
          </div>
        </div>

        {/* Search & Department Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="কর্মচারীর নাম, পদবী বা ফোন দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-2 border-slate-100 focus:border-cyan-500 rounded-2xl text-xs font-black outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 focus:border-cyan-500 rounded-2xl px-3 py-2 text-xs font-black text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">সকল বিভাগ ও পদবী</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border-2 border-slate-100 focus:border-cyan-500 rounded-2xl px-3 py-2 text-xs font-black text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">সকল পেমেন্ট স্ট্যাটাস ({staffReports.length})</option>
              <option value="Unpaid">⚠️ সম্পূর্ণ বকেয়া ({summary.unpaidCount})</option>
              <option value="Partial">⏳ আংশিক পরিশোধিত ({summary.partialCount})</option>
              <option value="Paid">✅ সম্পূর্ণ পরিশোধিত ({summary.paidCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1: Total Working Days */}
        <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">মোট কর্মদিবস</span>
            <Calendar size={16} className="text-cyan-600" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{totalPeriodDays} দিন</div>
            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
              দলের মোট কাজের দিন: <span className="text-cyan-700 font-black">{summary.totalWorkingDaysAll}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Work Hours */}
        <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">মোট কাজের সময়</span>
            <Timer size={16} className="text-indigo-600" />
          </div>
          <div>
            <div className="text-xl font-black text-indigo-950">{summary.totalHoursAll} ঘণ্টা</div>
            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
              মোট কর্মী: <span className="font-black text-slate-800">{summary.totalStaffCount} জন</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Payable */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-3xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-200 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">মোট প্রদেয় বেতন</span>
            <Banknote size={16} className="text-cyan-400" />
          </div>
          <div>
            <div className="text-xl font-black text-white">৳{summary.totalPayableAll.toLocaleString('en-IN')}</div>
            <div className="text-[10px] font-bold text-indigo-300 mt-0.5">
              কাজের দিন অনুপাতে অর্জিত
            </div>
          </div>
        </div>

        {/* Card 4: Total Paid */}
        <div className="bg-white p-4 rounded-3xl border-2 border-emerald-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">মোট পরিশোধিত</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-700">৳{summary.totalPaidAll.toLocaleString('en-IN')}</div>
            <div className="text-[10px] font-bold text-emerald-800 mt-0.5">
              পরিশোধিত কর্মী: <span className="font-black">{summary.paidCount} জন</span>
            </div>
          </div>
        </div>

        {/* Card 5: Total Due / Remaining */}
        <div className="bg-white p-4 rounded-3xl border-2 border-rose-100 shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">অবশিষ্ট বকেয়া</span>
            <AlertCircle size={16} className="text-rose-600" />
          </div>
          <div>
            <div className="text-xl font-black text-rose-600">৳{summary.totalDueAll.toLocaleString('en-IN')}</div>
            <div className="text-[10px] font-bold text-rose-700 mt-0.5">
              বকেয়া কর্মী: <span className="font-black">{summary.unpaidCount + summary.partialCount} জন</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Attendance & Salary Report Table */}
      <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-cyan-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
              {monthLabel} - বিস্তারিত তালিকা ({filteredReports.length} জন কর্মী)
            </span>
          </div>
          <div className="text-[11px] font-bold text-slate-500">
            প্রতিটি কর্মীর কাজের দিন অনুযায়ী স্বয়ংক্রিয় বেতন হিসাব ও বকেয়া
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4 sm:p-5">কর্মচারী</th>
                <th className="p-4 sm:p-5 text-center">হাজিরা পরিসংখ্যান</th>
                <th className="p-4 sm:p-5 text-center">কাজের মোট সময়</th>
                <th className="p-4 sm:p-5 text-right">মাসিক বেতন ও দৈনিক হার</th>
                <th className="p-4 sm:p-5 text-right">মোট প্রাপ্য বেতন</th>
                <th className="p-4 sm:p-5 text-right">পরিশোধিত</th>
                <th className="p-4 sm:p-5 text-right">অবশিষ্ট বকেয়া</th>
                <th className="p-4 sm:p-5 text-center">স্ট্যাটাস</th>
                <th className="p-4 sm:p-5 text-center">অ্যাকশন ও পে অপশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredReports.map(rep => {
                const isPaidFull = rep.paymentStatus === 'Paid';
                const isPartial = rep.paymentStatus === 'Partial';
                const isUnpaid = rep.paymentStatus === 'Unpaid';

                return (
                  <tr key={rep.staff.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Employee info */}
                    <td className="p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                          {rep.staff.imageUrl ? (
                            <img src={rep.staff.imageUrl} alt={rep.staff.name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            rep.staff.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm leading-tight">{rep.staff.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-black text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md">
                              {rep.staff.designation}
                            </span>
                            {rep.staff.phone && (
                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                                • {rep.staff.phone}
                              </span>
                            )}
                          </div>
                          {/* Duty Schedule Pill */}
                          <div className="flex items-center gap-1 mt-1 text-[10px] font-black text-cyan-900 bg-cyan-50/80 px-2 py-0.5 rounded-md w-fit border border-cyan-100">
                            <Clock size={10} className="text-cyan-700" />
                            <span>{rep.dutyStartTime} - {rep.dutyEndTime} ({rep.dutyHours}ঘ)</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Attendance Stats */}
                    <td className="p-4 sm:p-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-black" title="উপস্থিত">
                            উপস্থিত: {rep.presentDays}
                          </span>
                          {rep.lateDays > 0 && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-black" title="দেরি">
                              দেরি: {rep.lateDays}
                            </span>
                          )}
                          {rep.leaveDays > 0 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[10px] font-black" title="ছুটি">
                              ছুটি: {rep.leaveDays}
                            </span>
                          )}
                          {rep.absentDays > 0 && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-[10px] font-black" title="অনুপস্থিত">
                              অনুপস্থিত: {rep.absentDays}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>কাজের দিন: <strong className="text-slate-900">{rep.totalWorkedDays}</strong>/{rep.totalPeriodDays}</span>
                          <button
                            onClick={() => setAttendanceSheetStaff(rep)}
                            className="text-[9px] font-black text-cyan-700 hover:text-cyan-900 bg-cyan-100/70 hover:bg-cyan-200 px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5"
                            title="মাসিক দৈনিক লগ শিট দেখুন"
                          >
                            <CalendarDays size={10} /> শিট
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Work Hours & Overtime */}
                    <td className="p-4 sm:p-5 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-black text-slate-800 flex items-center gap-1">
                          <Timer size={12} className="text-indigo-600" />
                          {rep.totalWorkHours} ঘণ্টা
                        </span>
                        {rep.overtimeHours > 0 && (
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Flame size={10} className="text-amber-600" />
                            +{rep.overtimeHours}ঘ ওটি
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Basic, Daily Rate & Pawna */}
                    <td className="p-4 sm:p-5 text-right">
                      <div className="text-slate-900 font-black">
                        ৳{rep.grossSalary.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        দৈনিক: ৳{rep.dailyRate.toLocaleString('en-IN')}
                      </div>
                      {rep.pawnaTaka > 0 && (
                        <div className="text-[10px] font-black text-amber-700 mt-0.5">
                          +পূর্বের পাওনা: ৳{rep.pawnaTaka.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* Total Earned / Payable */}
                    <td className="p-4 sm:p-5 text-right">
                      <div className="text-sm font-black text-indigo-950">
                        ৳{rep.totalPayable.toLocaleString('en-IN')}
                      </div>
                      {rep.overtimePay > 0 && (
                        <div className="text-[10px] text-amber-700 font-bold">
                          (ওটি ৳{rep.overtimePay.toLocaleString('en-IN')} সহ)
                        </div>
                      )}
                    </td>

                    {/* Total Paid Amount */}
                    <td className="p-4 sm:p-5 text-right">
                      <div className={`font-black ${rep.paidAmount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                        ৳{rep.paidAmount.toLocaleString('en-IN')}
                      </div>
                      {rep.recentPayments.length > 0 && (
                        <div className="text-[9px] text-slate-400 font-bold">
                          {rep.recentPayments.length}টি কিস্তিতে
                        </div>
                      )}
                    </td>

                    {/* Due Amount */}
                    <td className="p-4 sm:p-5 text-right">
                      <div className={`text-sm font-black ${rep.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ৳{rep.dueAmount.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 sm:p-5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                        isPaidFull ? 'bg-emerald-100 text-emerald-800' :
                        isPartial ? 'bg-amber-100 text-amber-800' :
                        rep.paymentStatus === 'Advance' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          isPaidFull ? 'bg-emerald-600' :
                          isPartial ? 'bg-amber-600' :
                          rep.paymentStatus === 'Advance' ? 'bg-indigo-600' :
                          'bg-rose-600'
                        }`}></div>
                        {isPaidFull ? 'পরিশোধিত' :
                         isPartial ? 'আংশিক বকেয়া' :
                         rep.paymentStatus === 'Advance' ? 'অগ্রিম' : 'বকেয়া'}
                      </span>
                    </td>

                    {/* Actions & Pay Button */}
                    <td className="p-4 sm:p-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Primary Pay Button */}
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenPayModal(rep)}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
                              isPaidFull
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                            }`}
                            title={isPaidFull ? 'অতিরিক্ত বা সংশোধিত পেমেন্ট দিন' : 'বেতন পরিশোধ করুন (Pay)'}
                          >
                            <DollarSign size={13} />
                            <span>{isPaidFull ? 'পেমেন্ট' : 'টাকা দিন (Pay)'}</span>
                          </button>
                        )}

                        {/* View Monthly Daily Sheet Button */}
                        <button
                          onClick={() => setAttendanceSheetStaff(rep)}
                          className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-xl transition-all"
                          title="মাসিক দৈনিক হাজিরা শিট ও কর্মঘণ্টা ক্যালেন্ডার"
                        >
                          <CalendarDays size={15} />
                        </button>

                        {/* History Log Button */}
                        {rep.recentPayments.length > 0 && (
                          <button
                            onClick={() => setHistoryStaffReport(rep)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="পেমেন্ট হিস্ট্রি দেখুন"
                          >
                            <History size={15} />
                          </button>
                        )}

                        {/* Salary Slip Print Button */}
                        <button
                          onClick={() => setSlipStaffReport(rep)}
                          className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all"
                          title="বেতন স্লিপ প্রিন্ট করুন"
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-bold">
                    কোনো কর্মচারীর তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PAY SALARY MODAL (টাকা পরিশোধ করার পপআপ) */}
      {/* ========================================================================= */}
      {payingStaffReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 shadow-2xl border-2 border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                  <Banknote size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">বেতন পরিশোধ (Pay Salary)</h4>
                  <p className="text-xs font-bold text-slate-500">{monthLabel}</p>
                </div>
              </div>
              <button 
                onClick={() => setPayingStaffReport(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Employee & Summary Card in Modal */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-3xl my-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-black">{payingStaffReport.staff.name}</div>
                  <div className="text-xs text-cyan-300 font-bold">
                    {payingStaffReport.staff.designation} • {payingStaffReport.staff.phone}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-indigo-300">কাজের দিন</span>
                  <div className="text-sm font-black text-white">
                    {payingStaffReport.totalWorkedDays} / {payingStaffReport.totalPeriodDays} দিন
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
                <div className="bg-white/5 p-2 rounded-2xl">
                  <div className="text-[10px] text-indigo-200 font-bold">মোট প্রাপ্য</div>
                  <div className="text-sm font-black text-white">৳{payingStaffReport.totalPayable.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white/5 p-2 rounded-2xl">
                  <div className="text-[10px] text-emerald-300 font-bold">ইতিপূর্বে দেওয়া</div>
                  <div className="text-sm font-black text-emerald-400">৳{payingStaffReport.paidAmount.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white/10 p-2 rounded-2xl border border-white/15">
                  <div className="text-[10px] text-rose-300 font-bold">বর্তমান বকেয়া</div>
                  <div className="text-base font-black text-rose-400">৳{payingStaffReport.dueAmount.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleConfirmSalaryPayment} className="space-y-4">
              {/* Payment Account Information Box */}
              {(payingStaffReport.staff.bkashNo || payingStaffReport.staff.nagadNo || payingStaffReport.staff.bankAccountNo) && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-100 space-y-2">
                  <div className="text-[10px] font-black text-slate-500 uppercase flex items-center justify-between">
                    <span>কর্মচারীর ডিজিটাল পেমেন্ট একাউন্ট</span>
                    <span className="text-[9px] text-cyan-700 font-bold">ক্লিক করে নম্বর কপি করুন</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {payingStaffReport.staff.bkashNo && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(payingStaffReport.staff.bkashNo!, 'bKash')}
                        className="p-2 bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 rounded-xl text-left flex items-center justify-between transition-all"
                      >
                        <div>
                          <span className="text-[9px] font-black text-pink-600 uppercase block">বিকাশ</span>
                          <span className="font-black">{payingStaffReport.staff.bkashNo}</span>
                        </div>
                        <div className="text-[10px] font-bold text-pink-700 bg-white px-2 py-0.5 rounded-md shadow-xs">
                          {copiedAccount === 'bKash' ? 'কপি হয়েছে!' : 'কপি'}
                        </div>
                      </button>
                    )}
                    {payingStaffReport.staff.nagadNo && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(payingStaffReport.staff.nagadNo!, 'Nagad')}
                        className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 rounded-xl text-left flex items-center justify-between transition-all"
                      >
                        <div>
                          <span className="text-[9px] font-black text-orange-600 uppercase block">নগদ</span>
                          <span className="font-black">{payingStaffReport.staff.nagadNo}</span>
                        </div>
                        <div className="text-[10px] font-bold text-orange-700 bg-white px-2 py-0.5 rounded-md shadow-xs">
                          {copiedAccount === 'Nagad' ? 'কপি হয়েছে!' : 'কপি'}
                        </div>
                      </button>
                    )}
                    {payingStaffReport.staff.bankAccountNo && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(payingStaffReport.staff.bankAccountNo!, 'Bank')}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-left flex items-center justify-between transition-all sm:col-span-2"
                      >
                        <div>
                          <span className="text-[9px] font-black text-blue-600 uppercase block">ব্যাংক একাউন্ট</span>
                          <span className="font-black">{payingStaffReport.staff.bankAccountNo} {payingStaffReport.staff.bankName ? `(${payingStaffReport.staff.bankName})` : ''}</span>
                        </div>
                        <div className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md shadow-xs">
                          {copiedAccount === 'Bank' ? 'কপি হয়েছে!' : 'কপি'}
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  পরিশোধের পরিমাণ (টাকা / BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-black text-sm">৳</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl font-black text-base text-slate-900 outline-none transition-all"
                    placeholder="টাকার পরিমাণ দিন"
                  />
                </div>

                {/* Quick amount shortcut buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {payingStaffReport.dueAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(payingStaffReport.dueAmount)}
                      className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-[10px] font-black"
                    >
                      পুরো বকেয়া (৳{payingStaffReport.dueAmount.toLocaleString('en-IN')})
                    </button>
                  )}
                  {payingStaffReport.pawnaTaka > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(payingStaffReport.pawnaTaka)}
                      className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl text-[10px] font-black"
                    >
                      পূর্বের পাওনা বাবদ (৳{payingStaffReport.pawnaTaka.toLocaleString('en-IN')})
                    </button>
                  )}
                  {payingStaffReport.dueAmount > 1000 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(Math.round(payingStaffReport.dueAmount / 2))}
                      className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-[10px] font-black"
                    >
                      ৫০% বকেয়া
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPayAmount(5000)}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-[10px] font-black"
                  >
                    ৳৫,০০০
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayAmount(10000)}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-[10px] font-black"
                  >
                    ৳১০,০০০
                  </button>
                </div>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">পেমেন্ট মেথড</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-3 py-2.5 text-xs font-black text-slate-800 outline-none"
                  >
                    <option value="Cash">💵 ক্যাশ (Cash)</option>
                    <option value="bKash">📱 বিকাশ (bKash)</option>
                    <option value="Nagad">📱 নগদ (Nagad)</option>
                    <option value="Rocket">📱 রকেট (Rocket)</option>
                    <option value="Bank">🏦 ব্যাংক ট্রান্সফার (Bank)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">পেমেন্টের তারিখ</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-3 py-2.5 text-xs font-black text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Voucher No & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">ভাউচার / রসিদ নং</label>
                  <input
                    type="text"
                    value={payVoucherNo}
                    onChange={(e) => setPayVoucherNo(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-3 py-2 text-xs font-black text-slate-800 outline-none"
                    placeholder="যেমন: PAY-1029"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">নোট / মন্তব্য</label>
                  <input
                    type="text"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-3 py-2 text-xs font-black text-slate-800 outline-none"
                    placeholder="যেমন: আগস্ট মাসের বেতন"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setPayingStaffReport(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPay}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessingPay ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      <span>পেমেন্ট নিশ্চিত করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PAYMENT TRANSACTION HISTORY (পেমেন্ট হিস্ট্রি) */}
      {/* ========================================================================= */}
      {historyStaffReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 shadow-2xl border-2 border-slate-100 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h4 className="font-black text-slate-900 text-base">পেমেন্ট লেনদেনের ইতিহাস</h4>
                <p className="text-xs font-bold text-slate-500">
                  {historyStaffReport.staff.name} • {monthLabel}
                </p>
              </div>
              <button 
                onClick={() => setHistoryStaffReport(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-4 space-y-2.5">
              {historyStaffReport.recentPayments.map((record, index) => (
                <div key={record.id || index} className="p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                      ৳
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        ৳{Number(record.amount).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                        <span>{record.date}</span>
                        <span>•</span>
                        <span className="text-indigo-700 font-black">{record.method}</span>
                        {record.paidBy && <span>• প্রদেয়: {record.paidBy}</span>}
                      </div>
                      {record.note && (
                        <p className="text-[10px] text-slate-600 font-bold mt-1 bg-white px-2 py-0.5 rounded-md w-fit">
                          {record.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setHistoryStaffReport(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-black"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRINTABLE SALARY SLIP (বেতন স্লিপ ও রসিদ) */}
      {/* ========================================================================= */}
      {slipStaffReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border-2 border-slate-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-cyan-600" />
                <h4 className="font-black text-slate-900 text-base">কর্মচারী মাসিক বেতন স্লিপ</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md"
                >
                  <Printer size={14} /> প্রিন্ট করুন
                </button>
                <button 
                  onClick={() => setSlipStaffReport(null)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Slip Content Printable Area */}
            <div className="p-4 sm:p-6 bg-white rounded-2xl space-y-6 mt-4 print:p-0 border border-slate-200">
              {/* Slip Header */}
              <div className="text-center pb-4 border-b-2 border-slate-800">
                <h2 className="text-2xl font-black text-slate-900">
                  {shopSettings?.name || 'রেস্তোরাঁ ও বাণিজ্যালয়'}
                </h2>
                <p className="text-xs font-bold text-slate-600">
                  {shopSettings?.address || 'ঠিকানা: দোকান / শোরুম'} | ফোন: {shopSettings?.phone || '০১৭xxxxxxxx'}
                </p>
                <div className="inline-block mt-2 px-4 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-md">
                  কর্মচারী মাসিক হাজিরা ও বেতন স্লিপ ({monthLabel})
                </div>
              </div>

              {/* Staff Details & Slip Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl">
                  <div><strong>কর্মচারীর নাম:</strong> {slipStaffReport.staff.name}</div>
                  <div><strong>পদবী / বিভাগ:</strong> {slipStaffReport.staff.designation} {slipStaffReport.staff.department ? `(${slipStaffReport.staff.department})` : ''}</div>
                  <div><strong>মোবাইল নম্বর:</strong> {slipStaffReport.staff.phone || 'N/A'}</div>
                </div>
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl text-right">
                  <div><strong>স্লিপ ইস্যুর তারিখ:</strong> {now.toISOString().split('T')[0]}</div>
                  <div><strong>সময়কাল:</strong> {monthLabel}</div>
                  <div><strong>মোট ক্যালেন্ডার দিন:</strong> {slipStaffReport.totalPeriodDays} দিন</div>
                </div>
              </div>

              {/* Attendance & Work Breakdown */}
              <div>
                <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-2 border-b pb-1">
                  ১. হাজিরা ও কর্মঘণ্টা বিবরণ
                </h5>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-emerald-700 font-bold">উপস্থিতি</div>
                    <div className="font-black text-sm text-emerald-900">{slipStaffReport.presentDays} দিন</div>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-[10px] text-amber-700 font-bold">বিলম্ব / ছুটি</div>
                    <div className="font-black text-sm text-amber-900">{slipStaffReport.lateDays + slipStaffReport.leaveDays} দিন</div>
                  </div>
                  <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
                    <div className="text-[10px] text-indigo-700 font-bold">মোট কাজের দিন</div>
                    <div className="font-black text-sm text-indigo-900">{slipStaffReport.totalWorkedDays} দিন</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-700 font-bold">কাজের মোট ঘণ্টা</div>
                    <div className="font-black text-sm text-slate-900">{slipStaffReport.totalWorkHours} ঘণ্টা</div>
                  </div>
                </div>
              </div>

              {/* Salary Calculation Ledger */}
              <div>
                <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-2 border-b pb-1">
                  ২. বেতন ও আর্থিক বিবরণ
                </h5>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-1.5 font-bold">মাসিক নির্ধারিত মোট বেতন (Gross Salary):</td>
                      <td className="py-1.5 text-right font-black">৳{slipStaffReport.grossSalary.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-600">দৈনিক বেতনের হার (Daily Rate):</td>
                      <td className="py-1.5 text-right font-bold text-slate-600">৳{slipStaffReport.dailyRate.toLocaleString('en-IN')} / দিন</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 font-bold">উপস্থিতির ভিত্তিতে মোট অর্জিত বেতন:</td>
                      <td className="py-1.5 text-right font-black text-indigo-950">৳{slipStaffReport.earnedSalary.toLocaleString('en-IN')}</td>
                    </tr>
                    {slipStaffReport.overtimePay > 0 && (
                      <tr>
                        <td className="py-1.5 text-amber-700 font-bold">ওভারটাইম ভাতা ({slipStaffReport.overtimeHours} ঘণ্টা):</td>
                        <td className="py-1.5 text-right font-black text-amber-700">+৳{slipStaffReport.overtimePay.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-100 font-black">
                      <td className="py-2 px-2 text-slate-900 text-sm">সর্বমোট প্রদেয় বেতন:</td>
                      <td className="py-2 px-2 text-right text-slate-900 text-sm">৳{slipStaffReport.totalPayable.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-black text-emerald-700">পরিশোধিত টাকা:</td>
                      <td className="py-2 text-right font-black text-emerald-700">-৳{slipStaffReport.paidAmount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="border-t-2 border-slate-900">
                      <td className="py-2.5 font-black text-base text-rose-700">অবশিষ্ট বকেয়া ব্যালেন্স:</td>
                      <td className="py-2.5 text-right font-black text-base text-rose-700">৳{slipStaffReport.dueAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">
                    কর্মচারীর স্বাক্ষর
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">
                    কর্তৃপক্ষের স্বাক্ষর ও সিল
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PRINT ALL EMPLOYEES ATTENDANCE-SALARY LEDGER */}
      {/* ========================================================================= */}
      {showPrintAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-4xl w-full p-6 sm:p-8 shadow-2xl border-2 border-slate-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-slate-900" />
                <h4 className="font-black text-slate-900 text-base">সম্পূর্ণ হাজিরা ও বেতন শিট প্রিন্ট</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md"
                >
                  <Printer size={14} /> শিট প্রিন্ট করুন
                </button>
                <button 
                  onClick={() => setShowPrintAllModal(false)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Report Ledger */}
            <div className="p-4 sm:p-6 bg-white space-y-4 print:p-0">
              <div className="text-center pb-3 border-b-2 border-slate-900">
                <h2 className="text-2xl font-black text-slate-900">{shopSettings?.name || 'রেস্তোরাঁ ও বাণিজ্যালয়'}</h2>
                <p className="text-xs font-bold text-slate-600">কর্মচারীদের পূর্ণাঙ্গ হাজিরা ও বেতন বিবরণী — {monthLabel}</p>
              </div>

              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 font-black text-[10px] uppercase border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300">ক্র.নং</th>
                    <th className="p-2 border-r border-slate-300">কর্মচারীর নাম ও পদবী</th>
                    <th className="p-2 text-center border-r border-slate-300">কাজের দিন</th>
                    <th className="p-2 text-center border-r border-slate-300">কাজের ঘণ্টা</th>
                    <th className="p-2 text-right border-r border-slate-300">মূল বেতন</th>
                    <th className="p-2 text-right border-r border-slate-300">প্রাপ্য বেতন</th>
                    <th className="p-2 text-right border-r border-slate-300">পরিশোধিত</th>
                    <th className="p-2 text-right border-r border-slate-300">বকেয়া</th>
                    <th className="p-2 text-center">স্বাক্ষর</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {staffReports.map((r, i) => (
                    <tr key={r.staff.id}>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{i + 1}</td>
                      <td className="p-2 border-r border-slate-300">
                        <div className="font-black">{r.staff.name}</div>
                        <div className="text-[10px] text-slate-600">{r.staff.designation}</div>
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">
                        {r.totalWorkedDays} / {r.totalPeriodDays} দিন
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">
                        {r.totalWorkHours} ঘণ্টা
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right">
                        ৳{r.grossSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-black">
                        ৳{r.totalPayable.toLocaleString('en-IN')}
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
                    <td className="p-2 border-r border-slate-300 text-center">{summary.totalWorkingDaysAll} দিন</td>
                    <td className="p-2 border-r border-slate-300 text-center">{summary.totalHoursAll} ঘণ্টা</td>
                    <td className="p-2 border-r border-slate-300 text-right">-</td>
                    <td className="p-2 border-r border-slate-300 text-right">৳{summary.totalPayableAll.toLocaleString('en-IN')}</td>
                    <td className="p-2 border-r border-slate-300 text-right text-emerald-900">৳{summary.totalPaidAll.toLocaleString('en-IN')}</td>
                    <td className="p-2 border-r border-slate-300 text-right text-rose-900">৳{summary.totalDueAll.toLocaleString('en-IN')}</td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">হিসাবরক্ষকের স্বাক্ষর</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">স্বত্বাধিকারী / ম্যানেজারের স্বাক্ষর</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DAILY ATTENDANCE & WORKING HOURS CALENDAR SHEET (দৈনিক হাজিরা শিট) */}
      {/* ========================================================================= */}
      {attendanceSheetStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-4xl w-full p-6 shadow-2xl border-2 border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-black">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">
                    মাসিক দৈনিক হাজিরা ও কর্মঘণ্টা শিট ({attendanceSheetStaff.staff.name})
                  </h4>
                  <p className="text-xs font-bold text-slate-500">
                    {monthLabel} • নির্ধারিত শিফট: {attendanceSheetStaff.dutyStartTime} - {attendanceSheetStaff.dutyEndTime} ({attendanceSheetStaff.dutyHours} ঘণ্টা)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all"
                >
                  <Printer size={14} /> প্রিন্ট
                </button>
                <button 
                  onClick={() => setAttendanceSheetStaff(null)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Attendance Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 shrink-0">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-center">
                <div className="text-[10px] font-black text-emerald-700 uppercase">উপস্থিত দিন</div>
                <div className="text-lg font-black text-emerald-800">{attendanceSheetStaff.presentDays} দিন</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center">
                <div className="text-[10px] font-black text-amber-700 uppercase">দেরি / আংশিক</div>
                <div className="text-lg font-black text-amber-800">{attendanceSheetStaff.lateDays} দিন</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl text-center">
                <div className="text-[10px] font-black text-indigo-700 uppercase">মোট কর্মঘণ্টা</div>
                <div className="text-lg font-black text-indigo-900">{attendanceSheetStaff.totalWorkHours} ঘণ্টা</div>
              </div>
              <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-2xl text-center">
                <div className="text-[10px] font-black text-cyan-700 uppercase">হাজিরা অনুযায়ী প্রাপ্য</div>
                <div className="text-lg font-black text-cyan-950">৳{attendanceSheetStaff.earnedSalary.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="overflow-y-auto grow border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 font-black text-[10px] uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">তারিখ ও বার</th>
                    <th className="p-3 text-center">শিফট সূচি</th>
                    <th className="p-3 text-center">ইন টাইম (Check In)</th>
                    <th className="p-3 text-center">আউট টাইম (Check Out)</th>
                    <th className="p-3 text-center">মোট ঘণ্টা</th>
                    <th className="p-3 text-center">স্ট্যাটাস</th>
                    <th className="p-3 text-right">দৈনিক আয়</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {Array.from({ length: attendanceSheetStaff.totalPeriodDays }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
                    const dateObj = new Date(dateStr);
                    const dayName = dateObj.toLocaleDateString('bn-BD', { weekday: 'long' });

                    // Find record for this day
                    const attRecord = attendances.find(a => a.staffId === attendanceSheetStaff.staff.id && a.date === dateStr);
                    
                    let workedMins = 0;
                    if (attRecord?.checkIn && attRecord?.checkOut) {
                      workedMins = calculateShiftMinutes(attRecord.checkIn, attRecord.checkOut);
                    }
                    const workedHours = (workedMins / 60).toFixed(1);
                    const isOt = Number(workedHours) > attendanceSheetStaff.dutyHours;

                    const isPres = attRecord?.status === 'Present';
                    const isLate = attRecord?.status === 'Late';
                    const isLeave = attRecord?.status === 'Leave';
                    const isAbs = attRecord?.status === 'Absent';
                    const isRecorded = !!attRecord;

                    return (
                      <tr key={dateStr} className={`hover:bg-slate-50 transition-colors ${!isRecorded ? 'opacity-60 bg-slate-50/40' : ''}`}>
                        <td className="p-3 font-bold text-slate-800">
                          <div className="font-black text-slate-900">{dayNum} {monthLabel.split(' ')[0]}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{dayName}</div>
                        </td>
                        <td className="p-3 text-center text-[11px] text-slate-600 font-bold">
                          {attendanceSheetStaff.dutyStartTime} - {attendanceSheetStaff.dutyEndTime}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {attRecord?.checkIn ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{attRecord.checkIn}</span>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {attRecord?.checkOut ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{attRecord.checkOut}</span>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center font-bold">
                          {workedMins > 0 ? (
                            <div className="inline-flex items-center gap-1">
                              <span>{workedHours} ঘণ্টা</span>
                              {isOt && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-black">
                                  +{(Number(workedHours) - attendanceSheetStaff.dutyHours).toFixed(1)}ঘ ওটি
                                </span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {isPres && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">উপস্থিত</span>}
                          {isLate && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">দেরি</span>}
                          {isLeave && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">ছুটি</span>}
                          {isAbs && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">অনুপস্থিত</span>}
                          {!isRecorded && <span className="text-slate-400 text-[10px] font-bold">লগ নেই</span>}
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {isPres || isLate ? (
                            `৳${attendanceSheetStaff.dailyRate.toLocaleString('en-IN')}`
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center shrink-0">
              <div className="text-xs font-bold text-slate-500">
                মোট দৈনিক কাজের ভিত্তি: {attendanceSheetStaff.dutyHours} ঘণ্টা/দিন • দৈনিক বেতন: ৳{attendanceSheetStaff.dailyRate}
              </div>
              <button
                onClick={() => setAttendanceSheetStaff(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
