import React, { useState, useMemo, useEffect } from 'react';
import { Staff, Attendance, LeaveRequest, Sale, Payroll, Expense, ShopSettings } from '../types';
import { 
  Users, Calendar, Clock, Target, CheckCircle2, XCircle, 
  AlertCircle, MapPin, Search, Plus, FileText, Check, X, BarChart3, ShieldCheck,
  Edit, Trash2, Phone, Mail, Award, TrendingUp, Printer, 
  DollarSign, Building2, Briefcase, ChevronRight, Grid, List, Sparkles, UserCheck, Filter,
  Timer, Flame, Zap, ArrowRight, RotateCcw, Banknote
} from 'lucide-react';
import { AttendanceSalaryReport } from './AttendanceSalaryReport';

interface EmployeesProps {
  staff: Staff[];
  onUpdateStaff: (data: Staff[]) => void;
  onDeleteStaff?: (id: string) => void;
  attendances: Attendance[];
  onUpdateAttendances: (data: Attendance[]) => Promise<void> | void;
  leaves: LeaveRequest[];
  onUpdateLeaves: (data: LeaveRequest[]) => Promise<void> | void;
  sales: Sale[];
  currentStaff: Staff | null;
  isAdmin: boolean;
  payrolls?: Payroll[];
  onUpdatePayrolls?: (data: Payroll[]) => void;
  onAddExpense?: (expense: Partial<Expense>) => void;
  shopSettings?: ShopSettings | null;
}

export interface WorkDurationResult {
  hasBoth: boolean;
  text: string;
  decimalText: string;
  totalMinutes: number;
  hours: number;
  minutes: number;
  decimalHours: number;
  isOvertime: boolean;
  overtimeText?: string;
  isRunning?: boolean;
}

const Employees: React.FC<EmployeesProps> = ({ 
  staff, 
  onUpdateStaff, 
  onDeleteStaff, 
  attendances, 
  onUpdateAttendances, 
  leaves, 
  onUpdateLeaves, 
  sales, 
  currentStaff, 
  isAdmin,
  payrolls = [],
  onUpdatePayrolls,
  onAddExpense,
  shopSettings
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'attendance' | 'report' | 'leave' | 'performance'>('list');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentTimeTick, setCurrentTimeTick] = useState(new Date());

  // Live timer ticker for running shifts
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeTick(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedProfileStaff, setSelectedProfileStaff] = useState<Staff | null>(null);
  const [showIdCardModal, setShowIdCardModal] = useState<Staff | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Leave Form
  const [leaveForm, setLeaveForm] = useState<Partial<LeaveRequest>>({
    type: 'Casual', startDate: '', endDate: '', reason: ''
  });

  // Staff Form State
  const initialStaffForm: Partial<Staff> = {
    name: '',
    designation: 'Salesman',
    department: 'বিক্রয় শাখা',
    phone: '',
    email: '',
    address: '',
    nid: '',
    status: 'active',
    isApproved: true,
    dutyStartTime: '09:00',
    dutyEndTime: '18:00',
    dutyHours: 9,
    shiftName: 'ডে শিফট (Day Shift)',
    pawnaTaka: 0,
    openingAdvance: 0,
    bkashNo: '',
    nagadNo: '',
    bankAccountNo: '',
    bankName: '',
    salaryStructure: {
      basic: 15000,
      travelAllowance: 2000,
      foodAllowance: 2000,
      mobileAllowance: 1000
    },
    targets: {
      monthly: 100000,
      yearly: 1200000
    },
    leaveBalance: {
      casual: 10,
      sick: 10,
      annual: 15
    }
  };

  const [staffForm, setStaffForm] = useState<Partial<Staff>>(initialStaffForm);

  const getLocalToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(Date.now() - offset).toISOString().split('T')[0];
  };

  const today = getLocalToday();

  const getStatusLabel = (status: Attendance['status']) => {
    switch (status) {
      case 'Present': return 'উপস্থিত';
      case 'Absent': return 'অনুপস্থিত';
      case 'Late': return 'বিলম্বে';
      case 'Leave': return 'ছুটি';
      default: return 'অনুপস্থিত';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  // Advanced Working Hours & Overtime Calculation
  const calculateWorkDuration = (checkIn?: string, checkOut?: string, isForToday = false): WorkDurationResult | null => {
    if (!checkIn && !checkOut) return null;

    if (checkIn && !checkOut) {
      if (isForToday) {
        // Calculate running duration up to current time
        try {
          const [inH, inM] = checkIn.split(':').map(Number);
          const nowH = currentTimeTick.getHours();
          const nowM = currentTimeTick.getMinutes();
          let diffMs = (nowH * 60 + nowM) - (inH * 60 + inM);
          if (diffMs < 0) diffMs += 24 * 60; // Overnight
          const hours = Math.floor(diffMs / 60);
          const mins = diffMs % 60;
          return {
            hasBoth: false,
            isRunning: true,
            text: `${hours} ঘণ্টা ${mins} মি. (চলমান)`,
            decimalText: `${(diffMs / 60).toFixed(1)} ঘণ্টা`,
            totalMinutes: diffMs,
            hours,
            minutes: mins,
            decimalHours: Number((diffMs / 60).toFixed(2)),
            isOvertime: hours >= 8
          };
        } catch (e) {
          return null;
        }
      }
      return null;
    }

    if (!checkIn || !checkOut) return null;

    try {
      const [inH, inM] = checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      
      if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return null;

      let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      // If check-out is before check-in, handle overnight shift
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
      }

      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      const decimalHours = Number((diffMinutes / 60).toFixed(2));
      const isOvertime = diffMinutes > 8 * 60; // Standard shift is 8 hours
      
      let overtimeText: string | undefined = undefined;
      if (isOvertime) {
        const otMins = diffMinutes - 8 * 60;
        const otH = Math.floor(otMins / 60);
        const otM = otMins % 60;
        overtimeText = `+${otH > 0 ? `${otH}ঘ ` : ''}${otM > 0 ? `${otM}মি ` : ''}ওটি`;
      }

      const text = mins === 0 ? `${hours} ঘণ্টা` : `${hours} ঘণ্টা ${mins} মি.`;
      const decimalText = `${decimalHours} ঘণ্টা`;

      return {
        hasBoth: true,
        isRunning: false,
        text,
        decimalText,
        totalMinutes: diffMinutes,
        hours,
        minutes: mins,
        decimalHours,
        isOvertime,
        overtimeText
      };
    } catch (e) {
      return null;
    }
  };

  // Filtered Staff List
  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(search.toLowerCase()) ||
                            member.phone.includes(search) ||
                            (member.email && member.email.toLowerCase().includes(search.toLowerCase())) ||
                            (member.department && member.department.toLowerCase().includes(search.toLowerCase()));
      const matchesDesignation = designationFilter === 'all' || member.designation === designationFilter;
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      return matchesSearch && matchesDesignation && matchesStatus;
    });
  }, [staff, search, designationFilter, statusFilter]);

  // Unique designations for filter
  const designations = useMemo(() => {
    const set = new Set(staff.map(s => s.designation).filter(Boolean));
    return Array.from(set);
  }, [staff]);

  // Handle direct time change from inputs
  const handleTimeChange = (staffId: string, field: 'checkIn' | 'checkOut', newTime: string) => {
    const existing = attendances.find(a => a.staffId === staffId && a.date === selectedDate);
    const timeVal = newTime || '';

    if (existing) {
      const updatedCheckIn = field === 'checkIn' ? timeVal : (existing.checkIn || '');
      const updatedCheckOut = field === 'checkOut' ? timeVal : (existing.checkOut || '');

      let updatedStatus = existing.status;
      if (field === 'checkIn') {
        if (!timeVal && !updatedCheckOut) {
          updatedStatus = 'Absent';
        } else if (timeVal) {
          const [h] = timeVal.split(':').map(Number);
          updatedStatus = h >= 10 ? 'Late' : 'Present';
        }
      }

      const updatedRecord: Attendance = {
        ...existing,
        [field]: timeVal,
        status: updatedStatus
      };

      onUpdateAttendances([updatedRecord]);
    } else {
      if (!timeVal) return;
      const [h] = timeVal.split(':').map(Number);
      const newStatus: Attendance['status'] = field === 'checkIn' && h >= 10 ? 'Late' : 'Present';

      const newRecord: Attendance = {
        id: `ATT-${Date.now()}-${staffId}`,
        staffId,
        date: selectedDate,
        status: newStatus,
        checkIn: field === 'checkIn' ? timeVal : '',
        checkOut: field === 'checkOut' ? timeVal : '',
      };

      onUpdateAttendances([newRecord]);
    }
  };

  // Quick preset shift times
  const handleQuickShift = (staffId: string, inTime: string, outTime: string) => {
    const existing = attendances.find(a => a.staffId === staffId && a.date === selectedDate);
    const [h] = inTime.split(':').map(Number);
    const newStatus: Attendance['status'] = h >= 10 ? 'Late' : 'Present';

    if (existing) {
      onUpdateAttendances([{
        ...existing,
        checkIn: inTime,
        checkOut: outTime,
        status: newStatus
      }]);
    } else {
      onUpdateAttendances([{
        id: `ATT-${Date.now()}-${staffId}`,
        staffId,
        date: selectedDate,
        status: newStatus,
        checkIn: inTime,
        checkOut: outTime
      }]);
    }
  };

  // Clear times for an employee on selected date
  const handleClearTimes = (staffId: string) => {
    const existing = attendances.find(a => a.staffId === staffId && a.date === selectedDate);
    if (existing) {
      onUpdateAttendances([{
        ...existing,
        checkIn: '',
        checkOut: '',
        status: 'Absent'
      }]);
    }
  };

  // Punch in/out from top banner
  const handleCheckIn = () => {
    const targetStaff = currentStaff;
    if (!targetStaff) {
      if (isAdmin) {
        alert("অ্যাডমিন হিসেবে হাজিরা দিতে হলে আপনার ইমেইল দিয়ে একটি স্টাফ রেকর্ড তৈরি থাকতে হবে।");
        return;
      }
      alert("ইউজার প্রোফাইল পাওয়া যায়নি। দয়া করে পুনরায় লগইন করুন।");
      return;
    }
    
    const existing = attendances.find(a => a.staffId === targetStaff.id && a.date === today);
    if (existing?.checkIn) {
      alert("আপনি আজ ইতিমধ্যে প্রবেশ করেছেন।");
      return;
    }

    const now = new Date();
    const timeStr = formatTime(now);
    const isLate = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 0);
    
    const newAttendance: Attendance = {
      id: `ATT-${Date.now()}`,
      staffId: targetStaff.id,
      date: today,
      status: isLate ? 'Late' : 'Present',
      checkIn: timeStr,
    };
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        newAttendance.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onUpdateAttendances([newAttendance]);
        alert(`সফলভাবে প্রবেশ করেছেন! সময়: ${timeStr}`);
      }, () => {
        onUpdateAttendances([newAttendance]);
        alert(`সফলভাবে প্রবেশ করেছেন! সময়: ${timeStr} (লোকেশন ছাড়া)`);
      });
    } else {
      onUpdateAttendances([newAttendance]);
      alert(`সফলভাবে প্রবেশ করেছেন! সময়: ${timeStr}`);
    }
  };

  const handleCheckOut = () => {
    const targetStaff = currentStaff;
    if (!targetStaff) return;
    
    const existing = attendances.find(a => a.staffId === targetStaff.id && a.date === today);
    if (existing) {
      const timeStr = formatTime(new Date());
      const updated = { ...existing, checkOut: timeStr };
      onUpdateAttendances([updated]);
      alert(`সফলভাবে কাজ শেষ করেছেন। সময়: ${timeStr}`);
    }
  };

  const todayAttendance = attendances.find(a => a.staffId === currentStaff?.id && a.date === today);

  // Bulk Attendance Marking for Admin
  const handleMarkAllPresent = () => {
    if (!isAdmin) return;
    if (!window.confirm(`আপনি কি আজকের (${selectedDate}) জন্য সকল সক্রিয় কর্মচারীকে সকাল ০৯:০০ থেকে সন্ধ্যা ১৮:০০ পর্যন্ত 'উপস্থিত' হিসেবে চিহ্নিত করতে চান?`)) return;

    const defaultIn = '09:00';
    const defaultOut = '18:00';
    const newOrUpdatedList: Attendance[] = [...attendances];

    staff.filter(s => s.status === 'active').forEach(member => {
      const existingIndex = newOrUpdatedList.findIndex(a => a.staffId === member.id && a.date === selectedDate);
      if (existingIndex >= 0) {
        newOrUpdatedList[existingIndex] = {
          ...newOrUpdatedList[existingIndex],
          status: 'Present',
          checkIn: newOrUpdatedList[existingIndex].checkIn || defaultIn,
          checkOut: newOrUpdatedList[existingIndex].checkOut || defaultOut
        };
      } else {
        newOrUpdatedList.push({
          id: `ATT-${Date.now()}-${member.id}`,
          staffId: member.id,
          date: selectedDate,
          status: 'Present',
          checkIn: defaultIn,
          checkOut: defaultOut
        });
      }
    });

    onUpdateAttendances(newOrUpdatedList);
    alert('সকল সক্রিয় কর্মচারীর উপস্থিতি ও কর্মঘণ্টা সফলভাবে নিশ্চিত করা হয়েছে!');
  };

  // Leave Logic
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff) {
      alert("ছুটির আবেদন করতে আপনার একটি স্টাফ রেকর্ড থাকা প্রয়োজন।");
      return;
    }
    const newLeave: LeaveRequest = {
      ...leaveForm as LeaveRequest,
      id: `LEAVE-${Date.now()}`,
      staffId: currentStaff.id,
      status: 'Pending',
      appliedDate: today
    };
    
    try {
      await onUpdateLeaves([newLeave]);
      alert("আপনার ছুটির আবেদনটি সফলভাবে জমা দেওয়া হয়েছে এবং অনুমোদনের জন্য অপেক্ষমাণ আছে।");
      setShowLeaveModal(false);
      setLeaveForm({ type: 'Casual', startDate: '', endDate: '', reason: '' });
    } catch (error) {
      // Error handled in App.tsx
    }
  };

  const handleLeaveAction = (id: string, status: 'Approved' | 'Rejected') => {
    const target = leaves.find(l => l.id === id);
    if (target) {
      onUpdateLeaves([{ ...target, status }]);
    }
  };

  // Add / Edit Staff Handler
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.phone) {
      alert('নাম এবং ফোন নম্বর দেওয়া আবশ্যক');
      return;
    }

    if (editingStaff) {
      const updatedList = staff.map(s => s.id === editingStaff.id ? {
        ...s,
        ...staffForm,
        email: staffForm.email ? staffForm.email.trim().toLowerCase() : ''
      } as Staff : s);
      onUpdateStaff(updatedList);
      alert('কর্মচারীর তথ্য সফলভাবে আপডেট করা হয়েছে!');
      setEditingStaff(null);
    } else {
      const newStaff: Staff = {
        ...staffForm as Staff,
        id: `STAFF-${Date.now()}`,
        email: staffForm.email ? staffForm.email.trim().toLowerCase() : '',
        joinedDate: staffForm.joinedDate || today,
        isApproved: true,
        status: staffForm.status || 'active'
      };
      onUpdateStaff([...staff, newStaff]);
      alert('নতুন কর্মচারী সফলভাবে যুক্ত হয়েছে!');
      setShowAddStaffModal(false);
    }

    setStaffForm(initialStaffForm);
  };

  // Performance Logic
  const performanceData = useMemo(() => {
    return staff.map(s => {
      const staffSales = sales.filter(sale => sale.soldById === s.id && sale.date.startsWith(today.substring(0, 7)));
      const totalSales = staffSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const totalOrders = staffSales.length;
      const target = s.targets?.monthly || 100000;
      const achievement = Math.min(100, Math.round((totalSales / target) * 100));
      const projectedCommission = Math.round(totalSales * 0.015);
      return { ...s, totalSales, totalOrders, target, achievement, projectedCommission };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [staff, sales, today]);

  // Overall Statistics
  const totalEmployees = staff.length;
  const activeEmployees = staff.filter(s => s.status === 'active').length;
  const todayPresentCount = attendances.filter(a => a.date === selectedDate && (a.status === 'Present' || a.status === 'Late')).length;
  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;

  // Working Hours Metrics on Selected Date
  const dateWorkMetrics = useMemo(() => {
    let totalMins = 0;
    let completedCount = 0;
    let overtimeMins = 0;

    staff.forEach(member => {
      const att = attendances.find(a => a.staffId === member.id && a.date === selectedDate);
      if (att?.checkIn && att?.checkOut) {
        const dur = calculateWorkDuration(att.checkIn, att.checkOut);
        if (dur) {
          totalMins += dur.totalMinutes;
          completedCount += 1;
          if (dur.isOvertime) {
            overtimeMins += (dur.totalMinutes - 8 * 60);
          }
        }
      }
    });

    const totalHours = (totalMins / 60).toFixed(1);
    const avgHours = completedCount > 0 ? (totalMins / completedCount / 60).toFixed(1) : '0';
    const otHours = (overtimeMins / 60).toFixed(1);

    return { totalHours, avgHours, otHours, completedCount };
  }, [staff, attendances, selectedDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 font-sans text-slate-800">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
              <Users size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">কর্মচারী ব্যবস্থাপনা (HR)</h2>
                <span className="bg-cyan-400/20 text-cyan-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                  Staff & Attendance
                </span>
              </div>
              <p className="text-slate-300 font-bold text-xs mt-1 flex items-center gap-2">
                <Sparkles size={14} className="text-cyan-400"/> অটো কর্মঘণ্টা ক্যালকুলেশন, স্মার্ট হাজিরা ও টিম ম্যানেজমেন্ট
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {isAdmin && (
              <button 
                onClick={() => {
                  setStaffForm(initialStaffForm);
                  setEditingStaff(null);
                  setShowAddStaffModal(true);
                }}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2 active:scale-95 transition-all"
              >
                <Plus size={16} strokeWidth={3}/> নতুন কর্মচারী যুক্ত করুন
              </button>
            )}
            <button 
              onClick={() => setShowLeaveModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all"
            >
              <Calendar size={16} className="text-amber-300"/> ছুটির আবেদন
            </button>
          </div>
        </div>

        {/* Quick KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-slate-400 uppercase">মোট কর্মচারী</p>
            <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalEmployees} জন</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-emerald-400 uppercase">সক্রিয় টিম মেম্বার</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{activeEmployees} জন</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-cyan-400 uppercase">নির্বাচিত দিনে উপস্থিতি</p>
            <p className="text-xl sm:text-2xl font-black text-cyan-300 mt-0.5">{todayPresentCount} জন</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-amber-400 uppercase">মোট কর্মঘণ্টা</p>
            <p className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{dateWorkMetrics.totalHours} ঘণ্টা</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white p-2 rounded-[24px] border-2 border-slate-100 shadow-sm overflow-x-auto no-scrollbar gap-2">
        {[
          { id: 'list', label: 'টিম মেম্বার ও প্রোফাইল', icon: Users, badge: staff.length },
          { id: 'attendance', label: 'স্মার্ট ডিজিটাল হাজিরা ও কর্মঘণ্টা', icon: Clock, badge: todayPresentCount },
          { id: 'report', label: 'হাজিরা ও বেতন রিপোর্ট (Pay & Due)', icon: Banknote },
          { id: 'leave', label: 'ছুটি ও অনুমোদন', icon: Calendar, badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined },
          { id: 'performance', label: 'টার্গেট ও পারফরম্যান্স', icon: Target }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`whitespace-nowrap flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TEAM MEMBERS / STAFF LIST */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-5">
          {/* Controls & Search */}
          <div className="bg-white p-4 sm:p-5 rounded-[28px] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="কর্মচারীর নাম, ফোন, ইমেইল বা বিভাগ দিয়ে খুঁজুন..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 focus:border-cyan-500 rounded-2xl text-xs font-black outline-none transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select 
                value={designationFilter}
                onChange={e => setDesignationFilter(e.target.value)}
                className="bg-slate-50 border-2 border-slate-100 focus:border-cyan-500 rounded-2xl px-3 py-2.5 text-xs font-black text-slate-700 outline-none"
              >
                <option value="all">সকল পদবী</option>
                {designations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border-2 border-slate-100 focus:border-cyan-500 rounded-2xl px-3 py-2.5 text-xs font-black text-slate-700 outline-none"
              >
                <option value="all">সকল স্ট্যাটাস</option>
                <option value="active">সক্রিয় (Active)</option>
                <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
              </select>

              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  title="গ্রিড ভিউ"
                >
                  <Grid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  title="টেবিল ভিউ"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStaff.map(member => {
                const totalMonthSales = sales
                  .filter(s => s.soldById === member.id && s.date.startsWith(today.substring(0, 7)))
                  .reduce((sum, s) => sum + (s.total || 0), 0);
                const target = member.targets?.monthly || 100000;
                const progress = Math.min(100, Math.round((totalMonthSales / target) * 100));

                return (
                  <div 
                    key={member.id}
                    className="bg-white rounded-[32px] p-6 border-2 border-slate-100 hover:border-cyan-500/40 hover:shadow-xl transition-all duration-300 relative group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Avatar & Status */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center font-black text-lg shadow-md border-2 border-slate-100 overflow-hidden shrink-0">
                            {member.imageUrl ? (
                              <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              member.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-base leading-snug">{member.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-black text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md uppercase">
                                {member.designation}
                              </span>
                              {member.department && (
                                <span className="text-[10px] font-bold text-slate-500">
                                  • {member.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          member.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </div>

                      {/* Contact & Shift Info */}
                      <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                        <div className="flex items-center gap-2.5 text-slate-600">
                          <Phone size={14} className="text-emerald-600 shrink-0" />
                          <span className="font-bold">{member.phone}</span>
                        </div>
                        
                        {/* Duty Time Badge */}
                        <div className="flex items-center gap-2 text-cyan-900 bg-cyan-50/80 px-2.5 py-1 rounded-xl border border-cyan-100">
                          <Clock size={13} className="text-cyan-600 shrink-0" />
                          <span className="font-black text-[11px]">
                            ডিউটি: {member.dutyStartTime || '০৯:০০'} - {member.dutyEndTime || '১৮:০০'} ({member.dutyHours || 9}ঘ)
                          </span>
                        </div>

                        {/* Previous Pawna / Due if any */}
                        {(member.pawnaTaka !== undefined && member.pawnaTaka > 0) && (
                          <div className="flex items-center gap-2 text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                            <Banknote size={13} className="text-amber-600 shrink-0" />
                            <span className="font-black text-[11px]">
                              পূর্বের পাওনা: ৳{member.pawnaTaka.toLocaleString()}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2.5 text-slate-500 text-[11px]">
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <span>যোগদান: {member.joinedDate || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Monthly Sales & Target Mini Bar */}
                      <div className="mt-3.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
                          <span className="text-slate-500">চলতি মাসের বিক্রয়</span>
                          <span className="text-slate-900">৳{totalMonthSales.toLocaleString()} / ৳{target.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              progress >= 100 ? 'bg-emerald-500' : progress >= 60 ? 'bg-cyan-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-right text-[9px] font-black text-slate-500 mt-1">{progress}% অর্জিত</p>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setSelectedProfileStaff(member)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-black rounded-xl transition-all flex items-center gap-1"
                        >
                          প্রোফাইল <ChevronRight size={12} />
                        </button>
                        <button 
                          onClick={() => setShowIdCardModal(member)}
                          className="p-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-xl transition-all"
                          title="ডিজিটাল আইডি কার্ড"
                        >
                          <Printer size={14} />
                        </button>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => {
                              setEditingStaff(member);
                              setStaffForm(member);
                              setShowAddStaffModal(true);
                            }}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all"
                            title="সম্পাদনা করুন"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`আপনি কি নিশ্চিত যে '${member.name}'-কে ডিলিট করতে চান?`)) {
                                if (onDeleteStaff) {
                                  onDeleteStaff(member.id);
                                } else {
                                  onUpdateStaff(staff.filter(s => s.id !== member.id));
                                }
                              }
                            }}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredStaff.length === 0 && (
                <div className="col-span-full py-16 text-center bg-white rounded-[32px] border-2 border-slate-100 p-8">
                  <Users size={40} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-black text-slate-700">কোন কর্মচারী পাওয়া যায়নি</p>
                  <p className="text-xs text-slate-400 mt-1">অন্য কোনো নাম বা ফিল্টার দিয়ে চেষ্টা করুন</p>
                </div>
              )}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-4 sm:p-5">কর্মচারীর নাম ও আইডি</th>
                      <th className="p-4 sm:p-5">পদবী ও বিভাগ</th>
                      <th className="p-4 sm:p-5">ডিউটি শিফট ও সময়</th>
                      <th className="p-4 sm:p-5">যোগাযোগ</th>
                      <th className="p-4 sm:p-5">বেসিক ও পাওনা</th>
                      <th className="p-4 sm:p-5">স্ট্যাটাস</th>
                      <th className="p-4 sm:p-5 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredStaff.map(member => (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 sm:p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-slate-900">{member.name}</div>
                              <div className="text-[10px] text-slate-400 font-bold">ID: {member.id.substring(0, 10)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 sm:p-5">
                          <div className="font-black text-slate-800">{member.designation}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{member.department || 'সাধারণ'}</div>
                        </td>
                        <td className="p-4 sm:p-5">
                          <div className="inline-flex items-center gap-1.5 bg-cyan-50 text-cyan-900 px-2.5 py-1 rounded-xl border border-cyan-100 font-black text-[11px]">
                            <Clock size={12} className="text-cyan-600" />
                            <span>{member.dutyStartTime || '০৯:০০'} - {member.dutyEndTime || '১৮:০০'}</span>
                            <span className="text-[9px] bg-cyan-200/80 px-1 rounded text-cyan-800 font-bold">
                              {member.dutyHours || 9}ঘ
                            </span>
                          </div>
                        </td>
                        <td className="p-4 sm:p-5 font-bold text-slate-700">
                          <div>{member.phone}</div>
                          <div className="text-[10px] text-slate-400">{member.email || '-'}</div>
                        </td>
                        <td className="p-4 sm:p-5">
                          <div className="font-black text-emerald-700">
                            ৳{(member.salaryStructure?.basic || 0).toLocaleString()}
                          </div>
                          {(member.pawnaTaka !== undefined && member.pawnaTaka > 0) && (
                            <div className="text-[10px] font-black text-amber-700 flex items-center gap-1 mt-0.5">
                              <span>পাওনা: ৳{member.pawnaTaka.toLocaleString()}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 sm:p-5">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                            member.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button 
                              onClick={() => setSelectedProfileStaff(member)}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                              title="প্রোফাইল"
                            >
                              <Users size={14} />
                            </button>
                            <button 
                              onClick={() => setShowIdCardModal(member)}
                              className="p-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-xl"
                              title="আইডি কার্ড"
                            >
                              <Printer size={14} />
                            </button>
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingStaff(member);
                                    setStaffForm(member);
                                    setShowAddStaffModal(true);
                                  }}
                                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl"
                                  title="এডিট"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (window.confirm(`আপনি কি নিশ্চিত যে '${member.name}'-কে ডিলিট করতে চান?`)) {
                                      if (onDeleteStaff) {
                                        onDeleteStaff(member.id);
                                      } else {
                                        onUpdateStaff(staff.filter(s => s.id !== member.id));
                                      }
                                    }
                                  }}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl"
                                  title="ডিলিট"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ATTENDANCE & WORKING HOURS ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Quick Punch In/Out Card */}
          {currentStaff && (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5 w-full md:w-auto">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shrink-0">
                    <Clock size={36} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="text-cyan-400 font-black text-[11px] uppercase tracking-widest block mb-1">
                      {new Date().getHours() < 12 ? '☀️ শুভ সকাল' : new Date().getHours() < 17 ? '🌤️ শুভ অপরাহ্ণ' : '🌙 শুভ সন্ধ্যা'}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">{currentStaff.name}</h3>
                    <p className="text-slate-300 text-xs mt-0.5 font-bold flex items-center gap-2">
                      <span>পদবী: {currentStaff.designation}</span>
                      <span>•</span>
                      <span className={`font-black ${todayAttendance ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {todayAttendance ? `আজকে: ${getStatusLabel(todayAttendance.status)}` : 'হাজিরা দেওয়া হয়নি'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
                  {!todayAttendance?.checkIn ? (
                    <button 
                      onClick={handleCheckIn}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/30 flex items-center gap-2.5 active:scale-95 transition-all"
                    >
                      <Check size={18} strokeWidth={3}/> চেক-ইন করুন
                    </button>
                  ) : !todayAttendance?.checkOut ? (
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 px-4 py-2.5 rounded-2xl text-center border border-white/10">
                        <span className="text-[10px] text-slate-400 font-bold block">প্রবেশ সময়</span>
                        <span className="text-base font-black text-white">{todayAttendance.checkIn}</span>
                      </div>
                      <button 
                        onClick={handleCheckOut}
                        className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-rose-500/30 flex items-center gap-2 active:scale-95 transition-all"
                      >
                        <X size={18} strokeWidth={3}/> অফিস ত্যাগ
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 px-6 py-3 rounded-2xl flex items-center gap-3">
                      <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-black text-xs">ডিউটি সম্পন্ন</p>
                        <p className="text-[10px] text-slate-300 font-bold">
                          {todayAttendance.checkIn} - {todayAttendance.checkOut}
                          {calculateWorkDuration(todayAttendance.checkIn, todayAttendance.checkOut) && (
                            <span className="text-cyan-300 font-black ml-1.5">
                              ({calculateWorkDuration(todayAttendance.checkIn, todayAttendance.checkOut)?.text})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Working Hours Insight Banner for Selected Date */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                <Timer size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">মোট কর্মঘণ্টা</p>
                <p className="text-base sm:text-lg font-black text-slate-900">{dateWorkMetrics.totalHours} ঘণ্টা</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black">
                <Clock size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">গড় কর্মঘণ্টা</p>
                <p className="text-base sm:text-lg font-black text-slate-900">{dateWorkMetrics.avgHours} ঘণ্টা/জন</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                <Flame size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">মোট ওভারটাইম</p>
                <p className="text-base sm:text-lg font-black text-amber-600">+{dateWorkMetrics.otHours} ঘণ্টা</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">শিফট সম্পন্নকারী</p>
                <p className="text-base sm:text-lg font-black text-emerald-600">{dateWorkMetrics.completedCount} জন</p>
              </div>
            </div>
          </div>

          {/* Attendance Register Card with Direct Time Inputs */}
          <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-black">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">দৈনিক হাজিরা ও কর্মঘণ্টা ক্যালকুলেশন</h3>
                  <p className="text-[11px] text-slate-500 font-bold">
                    চেক-ইন ও চেক-আউটের সময় ইনপুট দিন, স্বয়ংক্রিয়ভাবে মোট কাজের সময় ও ওভারটাইম হিসাব হবে
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border-2 border-slate-200 shadow-xs">
                  <span className="text-[10px] font-black text-slate-400 uppercase">তারিখ:</span>
                  <input 
                    type="date" 
                    className="text-xs font-black text-slate-800 outline-none bg-transparent"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                
                {isAdmin && (
                  <button 
                    onClick={handleMarkAllPresent}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <UserCheck size={14} /> সবাইকে উপস্থিত করুন (০৯:০০ - ১৮:০০)
                  </button>
                )}

                <button 
                  onClick={() => setActiveTab('report')}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Banknote size={14} className="text-cyan-400" />
                  <span>হাজিরা ও বেতন রিপোর্ট (Pay)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-4 sm:p-5">কর্মচারী</th>
                    <th className="p-4 sm:p-5">হাজিরা স্ট্যাটাস</th>
                    <th className="p-4 sm:p-5">
                      <span className="flex items-center gap-1 text-cyan-700">
                        <Clock size={12} /> চেক-ইন সময় (Check-In)
                      </span>
                    </th>
                    <th className="p-4 sm:p-5">
                      <span className="flex items-center gap-1 text-rose-700">
                        <Clock size={12} /> চেক-আউট সময় (Check-Out)
                      </span>
                    </th>
                    <th className="p-4 sm:p-5">
                      <span className="flex items-center gap-1 text-indigo-700">
                        <Timer size={12} /> কাজের মোট সময় (Working Hours)
                      </span>
                    </th>
                    {isAdmin && <th className="p-4 sm:p-5 text-center">কুইক শিফট ও অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {staff.map(member => {
                    const att = attendances.find(a => a.staffId === member.id && a.date === selectedDate);
                    const isForToday = selectedDate === today;
                    const duration = calculateWorkDuration(att?.checkIn, att?.checkOut, isForToday);

                    const handleManualStatus = (status: Attendance['status']) => {
                      if (!isAdmin) return;
                      const timeStr = formatTime(new Date());
                      const existing = attendances.find(a => a.staffId === member.id && a.date === selectedDate);
                      if (existing) {
                        onUpdateAttendances([{ 
                          ...existing, 
                          status,
                          checkIn: (status === 'Present' || status === 'Late') ? (existing.checkIn || timeStr) : (status === 'Absent' ? '' : existing.checkIn),
                          checkOut: (status === 'Absent' ? '' : existing.checkOut)
                        }]);
                      } else {
                        onUpdateAttendances([{
                          id: `ATT-${Date.now()}-${member.id}`,
                          staffId: member.id,
                          date: selectedDate,
                          status,
                          checkIn: (status === 'Present' || status === 'Late' ? timeStr : ''),
                          checkOut: ''
                        }]);
                      }
                    };

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Employee Name & Role */}
                        <td className="p-4 sm:p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-slate-900 text-sm leading-tight">{member.name}</div>
                              <div className="text-[10px] text-cyan-700 font-black mt-0.5">{member.designation}</div>
                              {att?.location && (
                                <a 
                                  href={`https://maps.google.com/?q=${att.location.lat},${att.location.lng}`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-cyan-600 hover:underline flex items-center gap-1 font-bold text-[9px] mt-0.5"
                                >
                                  <MapPin size={10}/> ম্যাপে অবস্থান
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="p-4 sm:p-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 w-fit ${
                            att?.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
                            att?.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                            att?.status === 'Leave' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              att?.status === 'Present' ? 'bg-emerald-600' :
                              att?.status === 'Late' ? 'bg-amber-600' :
                              att?.status === 'Leave' ? 'bg-blue-600' : 'bg-rose-600'
                            }`}></div>
                            {att ? getStatusLabel(att.status) : 'অনুপস্থিত'}
                          </span>
                        </td>

                        {/* Check-In Input */}
                        <td className="p-4 sm:p-5">
                          <div className="flex items-center gap-2">
                            <input 
                              type="time" 
                              value={att?.checkIn || ''}
                              onChange={(e) => handleTimeChange(member.id, 'checkIn', e.target.value)}
                              className="bg-slate-50 border-2 border-slate-200 focus:border-cyan-500 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none w-28 transition-all hover:bg-white focus:bg-white"
                            />
                            {isAdmin && (
                              <button 
                                onClick={() => handleTimeChange(member.id, 'checkIn', formatTime(new Date()))}
                                className="px-2 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg text-[10px] font-black tracking-tight"
                                title="বর্তমান সময় সেট করুন"
                              >
                                এখন
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Check-Out Input */}
                        <td className="p-4 sm:p-5">
                          <div className="flex items-center gap-2">
                            <input 
                              type="time" 
                              value={att?.checkOut || ''}
                              onChange={(e) => handleTimeChange(member.id, 'checkOut', e.target.value)}
                              className="bg-slate-50 border-2 border-slate-200 focus:border-cyan-500 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none w-28 transition-all hover:bg-white focus:bg-white"
                            />
                            {isAdmin && (
                              <button 
                                onClick={() => handleTimeChange(member.id, 'checkOut', formatTime(new Date()))}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black tracking-tight"
                                title="বর্তমান সময় সেট করুন"
                              >
                                এখন
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Working Hours Calculation Cell */}
                        <td className="p-4 sm:p-5">
                          {duration ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs ${
                                  duration.hasBoth 
                                    ? 'bg-gradient-to-r from-indigo-50 to-cyan-50 text-indigo-900 border border-indigo-200/60' 
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 animate-pulse'
                                }`}>
                                  <Timer size={13} className={duration.hasBoth ? 'text-indigo-600' : 'text-emerald-600'} />
                                  <span>{duration.text}</span>
                                </span>

                                {duration.overtimeText && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-lg font-black text-[10px] flex items-center gap-1">
                                    <Flame size={11} className="text-amber-600" />
                                    {duration.overtimeText}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold pl-1">
                                মোট: {duration.decimalText}
                              </p>
                            </div>
                          ) : (
                            <div className="text-slate-400 text-xs font-bold flex items-center gap-1">
                              <span>--:--</span>
                              <span className="text-[10px] text-slate-300">(সময় দিন)</span>
                            </div>
                          )}
                        </td>

                        {/* Quick Presets & Status Actions */}
                        {isAdmin && (
                          <td className="p-4 sm:p-5 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              {/* Quick 9-Hour Standard Shift buttons */}
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleQuickShift(member.id, '09:00', '18:00')} 
                                  className="px-2 py-1 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 rounded-lg text-[9px] font-black"
                                  title="সকাল ৯টা থেকে সন্ধ্যা ৬টা (৯ ঘণ্টা)"
                                >
                                  ০৯-১৮
                                </button>
                                <button 
                                  onClick={() => handleQuickShift(member.id, '10:00', '19:00')} 
                                  className="px-2 py-1 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 rounded-lg text-[9px] font-black"
                                  title="সকাল ১০টা থেকে সন্ধ্যা ৭টা (৯ ঘণ্টা)"
                                >
                                  ১০-১৯
                                </button>
                                <button 
                                  onClick={() => handleClearTimes(member.id)} 
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                  title="সময় ও হাজিরা রিসেট"
                                >
                                  <RotateCcw size={12} />
                                </button>
                              </div>

                              {/* Status Badges */}
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleManualStatus('Present')} 
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${att?.status === 'Present' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}
                                >
                                  উপস্থিত
                                </button>
                                <button 
                                  onClick={() => handleManualStatus('Late')} 
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${att?.status === 'Late' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'}`}
                                >
                                  দেরি
                                </button>
                                <button 
                                  onClick={() => handleManualStatus('Absent')} 
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${att?.status === 'Absent' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'}`}
                                >
                                  অনুপস্থিত
                                </button>
                              </div>
                            </div>
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

      {/* ========================================================================= */}
      {/* TAB 3: ATTENDANCE & SALARY REPORT WITH PAY & DUE TRACKING */}
      {/* ========================================================================= */}
      {activeTab === 'report' && (
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

      {/* ========================================================================= */}
      {/* TAB 4: LEAVE MANAGEMENT & APPROVALS */}
      {/* ========================================================================= */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-[28px] border-2 border-slate-100 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-slate-900">ছুটি ব্যবস্থাপনা ও অনুমোদন</h3>
              <p className="text-xs text-slate-500 font-bold">কর্মচারীদের ছুটির আবেদন ও স্ট্যাটাস ট্র্যাকিং</p>
            </div>
            <button 
              onClick={() => setShowLeaveModal(true)} 
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2"
            >
              <Plus size={16}/> নতুন ছুটির আবেদন
            </button>
          </div>

          <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-4 sm:p-5">কর্মচারী</th>
                    <th className="p-4 sm:p-5">ছুটির ধরণ</th>
                    <th className="p-4 sm:p-5">সময়সীমা</th>
                    <th className="p-4 sm:p-5">ছুটির কারণ</th>
                    <th className="p-4 sm:p-5 text-center">স্ট্যাটাস</th>
                    {isAdmin && <th className="p-4 sm:p-5 text-center">অনুমোদন অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(isAdmin ? leaves : leaves.filter(l => l.staffId === currentStaff?.id)).map(leave => {
                    const member = staff.find(s => s.id === leave.staffId);
                    return (
                      <tr key={leave.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 sm:p-5">
                          <div className="font-black text-slate-900">{member?.name || 'অজানা'}</div>
                          <div className="text-[10px] text-slate-400 font-bold">আবেদন: {leave.appliedDate}</div>
                        </td>
                        <td className="p-4 sm:p-5 font-black text-slate-800">
                          {leave.type === 'Casual' ? 'নৈমিত্তিক ছুটি' : leave.type === 'Sick' ? 'অসুস্থতা জনিত' : 'বার্ষিক/অর্জিত ছুটি'}
                        </td>
                        <td className="p-4 sm:p-5 font-bold text-slate-700">
                          {leave.startDate} থেকে {leave.endDate}
                        </td>
                        <td className="p-4 sm:p-5 text-slate-600 max-w-[220px]">
                          {leave.reason}
                        </td>
                        <td className="p-4 sm:p-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            leave.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {leave.status === 'Approved' ? 'অনুমোদিত' : leave.status === 'Rejected' ? 'প্রত্যাখ্যাত' : 'অপেক্ষমাণ (Pending)'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-4 sm:p-5 text-center">
                            {leave.status === 'Pending' ? (
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => handleLeaveAction(leave.id, 'Approved')} 
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] flex items-center gap-1 shadow-xs"
                                >
                                  <Check size={14}/> অনুমোদন
                                </button>
                                <button 
                                  onClick={() => handleLeaveAction(leave.id, 'Rejected')} 
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[11px] flex items-center gap-1 shadow-xs"
                                >
                                  <X size={14}/> বাতিল
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-bold">নিষ্পন্ন</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Calendar size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="font-black text-xs">কোন ছুটির আবেদন জমা পড়েনি</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PERFORMANCE & SALES TARGET */}
      {/* ========================================================================= */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-[28px] border-2 border-slate-100 shadow-sm flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900">বিক্রয় টার্গেট ও পারফরম্যান্স লিডারবোর্ড</h3>
              <p className="text-xs text-slate-500 font-bold">চলতি মাসের লক্ষ্যমাত্রা ও বিক্রয় অর্জন র‍্যাঙ্কিং</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {performanceData.map((p, index) => (
              <div 
                key={p.id} 
                className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base ${
                        index === 0 ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30' :
                        index === 1 ? 'bg-slate-200 text-slate-800' :
                        index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-base">{p.name}</h4>
                        <p className="text-[10px] text-cyan-700 font-black uppercase">{p.designation}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-black bg-slate-100 px-2.5 py-1 rounded-full text-slate-700">
                      {p.totalOrders} টি অর্ডার
                    </span>
                  </div>

                  {/* Progress Bar & Amounts */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-xs font-black">
                      <span className="text-slate-500">মাসিক টার্গেট:</span>
                      <span className="text-slate-900">৳{p.target.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black">
                      <span className="text-slate-500">অর্জিত মোট বিক্রয়:</span>
                      <span className="text-emerald-700 text-sm font-black">৳{p.totalSales.toLocaleString()}</span>
                    </div>

                    <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          p.achievement >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-cyan-500 to-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, p.achievement)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[11px] font-black pt-1">
                      <span className="text-slate-400">অর্জন হার:</span>
                      <span className={`${p.achievement >= 100 ? 'text-emerald-600' : 'text-slate-800'}`}>{p.achievement}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">সম্ভাব্য সেলস কমিশন:</span>
                  <span className="font-black text-cyan-700">৳{p.projectedCommission.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT EMPLOYEE MODAL */}
      {/* ========================================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-white w-full max-w-2xl rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 my-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-black">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingStaff ? 'কর্মচারীর তথ্য সম্পাদনা' : 'নতুন কর্মচারী যুক্ত করুন'}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">ব্যক্তিগত তথ্য, বেতন কাঠামো ও মাসিক টার্গেট</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAddStaffModal(false);
                  setEditingStaff(null);
                }} 
                className="text-slate-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">পূর্ণ নাম *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="যেমন: মোঃ সাকিব হোসেন" 
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-cyan-500 rounded-xl p-3 text-xs font-black outline-none"
                    value={staffForm.name || ''}
                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">পদবী (Designation) *</label>
                  <select 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-cyan-500 rounded-xl p-3 text-xs font-black outline-none"
                    value={staffForm.designation || 'Salesman'}
                    onChange={e => setStaffForm({ ...staffForm, designation: e.target.value })}
                  >
                    <option value="Manager">ম্যানেজার (Manager)</option>
                    <option value="Senior Salesman">সিনিয়র সেলসম্যান</option>
                    <option value="Salesman">সেলসম্যান (Salesman)</option>
                    <option value="Cashier">ক্যাশিয়ার (Cashier)</option>
                    <option value="Delivery Boy">ডেলিভারি বয় (Delivery)</option>
                    <option value="Store Keeper">স্টোরকিপার (Store Keeper)</option>
                    <option value="Accountant">হিসাবরক্ষক (Accountant)</option>
                    <option value="Admin">এডমিন (Admin)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">মোবাইল নম্বর *</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="01XXXXXXXXX" 
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-cyan-500 rounded-xl p-3 text-xs font-black outline-none"
                    value={staffForm.phone || ''}
                    onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">ইমেইল অ্যাড্রেস</label>
                  <input 
                    type="email" 
                    placeholder="staff@gmail.com" 
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-cyan-500 rounded-xl p-3 text-xs font-black outline-none"
                    value={staffForm.email || ''}
                    onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">শাখা / ডিপার্টমেন্ট</label>
                  <input 
                    type="text" 
                    placeholder="যেমন: বিক্রয় শাখা" 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-bold outline-none"
                    value={staffForm.department || ''}
                    onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">জাতীয় পরিচয়পত্র (NID)</label>
                  <input 
                    type="text" 
                    placeholder="NID নম্বর" 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-bold outline-none"
                    value={staffForm.nid || ''}
                    onChange={e => setStaffForm({ ...staffForm, nid: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">যোগদানের তারিখ</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-bold outline-none"
                    value={staffForm.joinedDate || today}
                    onChange={e => setStaffForm({ ...staffForm, joinedDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Duty Time & Shift Schedule Card */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50/50 p-4 rounded-2xl border-2 border-cyan-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-cyan-700" />
                    <h5 className="font-black text-xs text-slate-900 uppercase">কাজের শিফট ও ডিউটি সময় (Duty Schedule)</h5>
                  </div>
                  <span className="text-[10px] font-black bg-cyan-200/70 text-cyan-900 px-2 py-0.5 rounded-full">
                    {staffForm.dutyHours || 9} ঘণ্টা ডিউটি
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">শিফটের ধরন / নাম</label>
                    <select 
                      className="w-full bg-white border border-cyan-200 focus:border-cyan-500 rounded-xl p-2.5 text-xs font-black outline-none"
                      value={staffForm.shiftName || 'ডে শিফট (Day Shift)'}
                      onChange={e => {
                        const shift = e.target.value;
                        let start = staffForm.dutyStartTime || '09:00';
                        let end = staffForm.dutyEndTime || '18:00';
                        if (shift.includes('মর্নিং') || shift.includes('Morning')) {
                          start = '07:00'; end = '15:00';
                        } else if (shift.includes('ডে') || shift.includes('Day')) {
                          start = '09:00'; end = '18:00';
                        } else if (shift.includes('ইভিনিং') || shift.includes('Evening')) {
                          start = '14:00'; end = '22:00';
                        } else if (shift.includes('নাইট') || shift.includes('Night')) {
                          start = '21:00'; end = '06:00';
                        }
                        setStaffForm({ 
                          ...staffForm, 
                          shiftName: shift,
                          dutyStartTime: start,
                          dutyEndTime: end
                        });
                      }}
                    >
                      <option value="ডে শিফট (Day Shift)">ডে শিফট (০৯:০০ - ১৮:০০)</option>
                      <option value="মর্নিং শিফট (Morning)">মর্নিং শিফট (০৭:০০ - ১৫:০০)</option>
                      <option value="ইভিনিং শিফট (Evening)">ইভিনিং শিফট (১৪:০০ - ২২:০০)</option>
                      <option value="নাইট শিফট (Night Shift)">নাইট শিফট (২১:০০ - ০৬:০০)</option>
                      <option value="ফুল টাইম (Full Time)">ফুল টাইম (১০ ঘণ্টা)</option>
                      <option value="কাস্টম শিফট (Custom)">কাস্টম সময়</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">ডিউটি শুরুর সময় *</label>
                    <input 
                      type="time" 
                      required 
                      className="w-full bg-white border border-cyan-200 focus:border-cyan-500 rounded-xl p-2.5 text-xs font-black outline-none"
                      value={staffForm.dutyStartTime || '09:00'}
                      onChange={e => {
                        const newStart = e.target.value;
                        setStaffForm({ ...staffForm, dutyStartTime: newStart });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">ডিউটি শেষ সময় *</label>
                    <input 
                      type="time" 
                      required 
                      className="w-full bg-white border border-cyan-200 focus:border-cyan-500 rounded-xl p-2.5 text-xs font-black outline-none"
                      value={staffForm.dutyEndTime || '18:00'}
                      onChange={e => {
                        const newEnd = e.target.value;
                        setStaffForm({ ...staffForm, dutyEndTime: newEnd });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">দৈনিক কর্মঘণ্টা (Hours)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      min="1"
                      max="24"
                      placeholder="9" 
                      className="w-full bg-white border border-cyan-200 focus:border-cyan-500 rounded-xl p-2.5 text-xs font-black text-cyan-900 outline-none"
                      value={staffForm.dutyHours || 9}
                      onChange={e => setStaffForm({ ...staffForm, dutyHours: parseFloat(e.target.value) || 9 })}
                    />
                  </div>
                </div>
              </div>

              {/* Previous Due / Pawna & Payment Accounts Card */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-4 rounded-2xl border-2 border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote size={16} className="text-amber-700" />
                    <h5 className="font-black text-xs text-slate-900 uppercase">পূর্বের পাওনা / বকেয়া ও পেমেন্ট একাউন্ট</h5>
                  </div>
                  <span className="text-[10px] font-black bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full">
                    Opening Due / Pawna
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-amber-900 uppercase block mb-1">
                      পূর্বের পাওনা বকেয়া টাকা (Opening Pawna/Due)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-black text-amber-600">৳</span>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded-xl p-2.5 pl-7 text-xs font-black text-amber-900 outline-none"
                        value={staffForm.pawnaTaka !== undefined ? staffForm.pawnaTaka : 0}
                        onChange={e => setStaffForm({ ...staffForm, pawnaTaka: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <p className="text-[9px] text-amber-700 font-bold mt-1">কর্মচারীর বিগত কোনো মাসের পাওনা থাকলে তা এখানে দিন</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">
                      পূর্বের অগ্রিম জমা (Previous Advance)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">৳</span>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl p-2.5 pl-7 text-xs font-black outline-none"
                        value={staffForm.openingAdvance !== undefined ? staffForm.openingAdvance : 0}
                        onChange={e => setStaffForm({ ...staffForm, openingAdvance: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 font-bold mt-1">পূর্বে অগ্রিম নিয়ে থাকলে তা দিন</p>
                  </div>
                </div>

                {/* Mobile Banking & Bank Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">বিকাশ পার্সোনাল নম্বর</label>
                    <input 
                      type="tel" 
                      placeholder="01XXXXXXXXX" 
                      className="w-full bg-white border border-slate-200 focus:border-pink-500 rounded-xl p-2.5 text-xs font-bold outline-none"
                      value={staffForm.bkashNo || ''}
                      onChange={e => setStaffForm({ ...staffForm, bkashNo: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">নগদ নম্বর</label>
                    <input 
                      type="tel" 
                      placeholder="01XXXXXXXXX" 
                      className="w-full bg-white border border-slate-200 focus:border-orange-500 rounded-xl p-2.5 text-xs font-bold outline-none"
                      value={staffForm.nagadNo || ''}
                      onChange={e => setStaffForm({ ...staffForm, nagadNo: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">ব্যাংক একাউন্ট নম্বর</label>
                    <input 
                      type="text" 
                      placeholder="একাউন্ট নং / ব্যাংক নাম" 
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs font-bold outline-none"
                      value={staffForm.bankAccountNo || ''}
                      onChange={e => setStaffForm({ ...staffForm, bankAccountNo: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Salary & Target Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h5 className="font-black text-xs text-slate-900 uppercase">বেতন ও মাসিক লক্ষ্যমাত্রা</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">মূল বেতন (Basic)</label>
                    <input 
                      type="number" 
                      placeholder="15000" 
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-black text-emerald-800 outline-none"
                      value={staffForm.salaryStructure?.basic || ''}
                      onChange={e => setStaffForm({ 
                        ...staffForm, 
                        salaryStructure: { ...staffForm.salaryStructure, basic: parseFloat(e.target.value) || 0 } as any 
                      })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">ভাতা (Allowances)</label>
                    <input 
                      type="number" 
                      placeholder="3000" 
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-black outline-none"
                      value={(staffForm.salaryStructure?.travelAllowance || 0) + (staffForm.salaryStructure?.foodAllowance || 0)}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setStaffForm({ 
                          ...staffForm, 
                          salaryStructure: { 
                            ...staffForm.salaryStructure, 
                            travelAllowance: Math.round(val / 2),
                            foodAllowance: Math.round(val / 2)
                          } as any 
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">মাসিক বিক্রয় টার্গেট</label>
                    <input 
                      type="number" 
                      placeholder="100000" 
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-black text-cyan-800 outline-none"
                      value={staffForm.targets?.monthly || ''}
                      onChange={e => setStaffForm({ 
                        ...staffForm, 
                        targets: { ...staffForm.targets, monthly: parseFloat(e.target.value) || 0 } as any 
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">বর্তমান ঠিকানা</label>
                  <input 
                    type="text" 
                    placeholder="বাসার ঠিকানা / এলাকা" 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-bold outline-none"
                    value={staffForm.address || ''}
                    onChange={e => setStaffForm({ ...staffForm, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">স্ট্যাটাস</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-black outline-none"
                    value={staffForm.status || 'active'}
                    onChange={e => setStaffForm({ ...staffForm, status: e.target.value as any })}
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-5 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/20 active:scale-95 transition-all"
                >
                  {editingStaff ? 'তথ্য আপডেট করুন' : 'কর্মচারী সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: 360° EMPLOYEE PROFILE MODAL */}
      {/* ========================================================================= */}
      {selectedProfileStaff && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-white w-full max-w-2xl rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 my-auto">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl">
                  {selectedProfileStaff.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedProfileStaff.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-black text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-md">
                      {selectedProfileStaff.designation}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">
                      {selectedProfileStaff.department || 'সাধারণ শাখা'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProfileStaff(null)} 
                className="text-slate-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X size={20}/>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-black uppercase block">মোবাইল নম্বর</span>
                  <span className="font-black text-slate-800">{selectedProfileStaff.phone}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-black uppercase block">ইমেইল</span>
                  <span className="font-black text-slate-800">{selectedProfileStaff.email || 'N/A'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-black uppercase block">যোগদান তারিখ</span>
                  <span className="font-black text-slate-800">{selectedProfileStaff.joinedDate || 'N/A'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-black uppercase block">মূল বেতন (Basic)</span>
                  <span className="font-black text-emerald-700">৳{(selectedProfileStaff.salaryStructure?.basic || 0).toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-black uppercase block">মাসিক টার্গেট</span>
                  <span className="font-black text-cyan-800">৳{(selectedProfileStaff.targets?.monthly || 100000).toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-black uppercase block">জাতীয় পরিচয়পত্র</span>
                  <span className="font-black text-slate-800">{selectedProfileStaff.nid || 'N/A'}</span>
                </div>
              </div>

              {/* Duty Schedule & Shift in Profile */}
              <div className="bg-cyan-50/70 p-3.5 rounded-xl border border-cyan-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-black">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-cyan-800 uppercase block">কাজের শিফট ও সময়</span>
                    <span className="font-black text-slate-900 text-xs">
                      {selectedProfileStaff.shiftName || 'ডে শিফট'}: {selectedProfileStaff.dutyStartTime || '০৯:০০'} - {selectedProfileStaff.dutyEndTime || '১৮:০০'} ({selectedProfileStaff.dutyHours || 9} ঘণ্টা)
                    </span>
                  </div>
                </div>
                {(selectedProfileStaff.pawnaTaka !== undefined && selectedProfileStaff.pawnaTaka > 0) && (
                  <div className="bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg font-black text-xs border border-amber-300">
                    পূর্বের পাওনা বকেয়া: ৳{selectedProfileStaff.pawnaTaka.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Bank & Mobile Banking Info */}
              {(selectedProfileStaff.bkashNo || selectedProfileStaff.nagadNo || selectedProfileStaff.bankAccountNo) && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedProfileStaff.bkashNo && (
                    <div className="text-[11px] font-bold text-pink-700">
                      <span className="text-[10px] text-slate-400 block uppercase">বিকাশ</span>
                      {selectedProfileStaff.bkashNo}
                    </div>
                  )}
                  {selectedProfileStaff.nagadNo && (
                    <div className="text-[11px] font-bold text-orange-700">
                      <span className="text-[10px] text-slate-400 block uppercase">নগদ</span>
                      {selectedProfileStaff.nagadNo}
                    </div>
                  )}
                  {selectedProfileStaff.bankAccountNo && (
                    <div className="text-[11px] font-bold text-blue-700">
                      <span className="text-[10px] text-slate-400 block uppercase">ব্যাংক একাউন্ট</span>
                      {selectedProfileStaff.bankAccountNo} {selectedProfileStaff.bankName ? `(${selectedProfileStaff.bankName})` : ''}
                    </div>
                  )}
                </div>
              )}

              {selectedProfileStaff.address && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-black uppercase block mb-0.5">ঠিকানা</span>
                  <p className="font-bold text-slate-700">{selectedProfileStaff.address}</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => {
                  setShowIdCardModal(selectedProfileStaff);
                  setSelectedProfileStaff(null);
                }}
                className="px-4 py-2.5 bg-cyan-50 text-cyan-800 rounded-xl font-black text-xs flex items-center gap-1.5"
              >
                <Printer size={14} /> আইডি কার্ড দেখুন
              </button>
              <button 
                onClick={() => setSelectedProfileStaff(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ID CARD PREVIEW & PRINT */}
      {/* ========================================================================= */}
      {showIdCardModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-slate-100 my-auto text-center">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-slate-800 text-sm">কর্মচারী ডিজিটাল আইডি কার্ড</h4>
              <button onClick={() => setShowIdCardModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* ID Card Front Frame */}
            <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border-2 border-indigo-500/30 text-center relative overflow-hidden">
              <div className="w-12 h-1 bg-cyan-400 mx-auto rounded-full mb-3"></div>
              <h5 className="font-black text-base tracking-wider uppercase text-cyan-300">REST BAZER</h5>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-4">Employee Identification Card</p>

              <div className="w-20 h-20 rounded-2xl bg-white text-slate-900 mx-auto mb-3 flex items-center justify-center font-black text-3xl shadow-md border-2 border-cyan-400">
                {showIdCardModal.name.charAt(0)}
              </div>

              <h4 className="font-black text-lg text-white">{showIdCardModal.name}</h4>
              <p className="text-xs font-bold text-cyan-300 mb-4">{showIdCardModal.designation}</p>

              <div className="bg-white/10 rounded-xl p-3 text-[11px] text-left space-y-1 border border-white/10">
                <p><span className="text-slate-400">ID:</span> <span className="font-black text-white">{showIdCardModal.id.substring(0, 10)}</span></p>
                <p><span className="text-slate-400">ফোন:</span> <span className="font-bold text-white">{showIdCardModal.phone}</span></p>
                <p><span className="text-slate-400">বিভাগ:</span> <span className="font-bold text-white">{showIdCardModal.department || 'বিক্রয়'}</span></p>
                <p><span className="text-slate-400">যোগদান:</span> <span className="font-bold text-white">{showIdCardModal.joinedDate || today}</span></p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[8px] text-slate-400">
                <span>Authorized Signatory</span>
                <span className="text-emerald-400 font-bold">● Active Status</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer size={14}/> প্রিন্ট আইডি কার্ড
              </button>
              <button 
                onClick={() => setShowIdCardModal(null)}
                className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs"
              >
                বন্ধ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: LEAVE APPLICATION MODAL */}
      {/* ========================================================================= */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">ছুটির আবেদন ফরম</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-rose-500">
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">ছুটির ধরণ</label>
                <select 
                  required 
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-black outline-none"
                  value={leaveForm.type} 
                  onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value as any })}
                >
                  <option value="Casual">নৈমিত্তিক ছুটি (Casual Leave)</option>
                  <option value="Sick">অসুস্থতা জনিত ছুটি (Sick Leave)</option>
                  <option value="Annual">বার্ষিক/অর্জিত ছুটি (Earned Leave)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">শুরুর তারিখ</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-black outline-none"
                    value={leaveForm.startDate} 
                    onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">শেষের তারিখ</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-black outline-none"
                    value={leaveForm.endDate} 
                    onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">ছুটির কারণ</label>
                <textarea 
                  required 
                  rows={3} 
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-bold outline-none"
                  value={leaveForm.reason} 
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} 
                  placeholder="ছুটি নেওয়ার সঠিক কারণ লিখুন..."
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg shadow-cyan-600/20 active:scale-95 transition-all"
              >
                আবেদন জমা দিন
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Employees;
