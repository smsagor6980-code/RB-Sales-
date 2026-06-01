import React, { useState, useMemo } from 'react';
import { Staff, Attendance, LeaveRequest, Sale } from '../types';
import { 
  Users, Calendar, Clock, Target, CheckCircle2, XCircle, 
  AlertCircle, MapPin, Search, Plus, FileText, Check, X, BarChart3, ShieldCheck
} from 'lucide-react';

interface EmployeesProps {
  staff: Staff[];
  onUpdateStaff: (data: Staff[]) => void;
  attendances: Attendance[];
  onUpdateAttendances: (data: Attendance[]) => Promise<void> | void;
  leaves: LeaveRequest[];
  onUpdateLeaves: (data: LeaveRequest[]) => Promise<void> | void;
  sales: Sale[];
  currentStaff: Staff | null;
  isAdmin: boolean;
}

const Employees: React.FC<EmployeesProps> = ({ 
  staff, onUpdateStaff, attendances, onUpdateAttendances, leaves, onUpdateLeaves, sales, currentStaff, isAdmin 
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'performance' | 'list'>('attendance');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState<Partial<LeaveRequest>>({
    type: 'Casual', startDate: '', endDate: '', reason: ''
  });
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({
    name: '', designation: 'Salesman', phone: '', email: '', status: 'active', isApproved: true
  });

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

  const calculateHours = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return null;
    try {
      const [inH, inM] = checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      const diffMs = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffMs < 0) return null;
      const hours = Math.floor(diffMs / 60);
      const mins = diffMs % 60;
      return `${hours}ঘণ্টা ${mins}মি.`;
    } catch (e) {
      return null;
    }
  };

    // Attendance Logic
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
    
    // Check if already checked in
    const existing = attendances.find(a => a.staffId === targetStaff.id && a.date === today);
    if (existing?.checkIn) {
      alert("আপনি আজ ইতিমধ্যে প্রবেশ করেছেন।");
      return;
    }

    const now = new Date();
    const timeStr = formatTime(now);
    
    // Auto-detect Late (if after 10:00 AM)
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
      }, (err) => {
        onUpdateAttendances([newAttendance]);
        alert(`সফলভাবে প্রবেশ করেছেন! সময়: ${timeStr} (লোকেশন পাওয়া যায়নি)`);
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
      alert("আপনার ছুটির আবেদনটি সফলভাবে জমা দেওয়া হয়েছে এবং অনুমোদনের জন্য পেন্ডিং আছে।");
      setShowLeaveModal(false);
      setLeaveForm({ type: 'Casual', startDate: '', endDate: '', reason: '' });
    } catch (error) {
      // Error is already handled in App.tsx
    }
  };

  const handleLeaveAction = (id: string, status: 'Approved' | 'Rejected') => {
    const target = leaves.find(l => l.id === id);
    if (target) {
      onUpdateLeaves([{ ...target, status }]);
    }
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const newStaff: Staff = {
      ...staffForm as Staff,
      id: `STAFF-${Date.now()}`,
      joinedDate: today,
      isApproved: true,
      status: 'active'
    };
    onUpdateStaff([...staff, newStaff]);
    setShowAddStaffModal(false);
    setStaffForm({ name: '', designation: 'Salesman', phone: '', email: '', status: 'active', isApproved: true });
  };

  // Performance Logic
  const performanceData = useMemo(() => {
    return staff.map(s => {
      const staffSales = sales.filter(sale => sale.soldById === s.id && sale.date.startsWith(today.substring(0, 7)));
      const totalSales = staffSales.reduce((sum, sale) => sum + sale.total, 0);
      const target = s.targets?.monthly || 50000;
      const achievement = Math.min(100, Math.round((totalSales / target) * 100));
      return { ...s, totalSales, target, achievement };
    });
  }, [staff, sales, today]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-primary p-4 rounded-[28px] text-white shadow-2xl shadow-primary/20">
             <Users size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Employees</h2>
            <p className="text-slate-500 font-bold text-xs mt-1 uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-primary"/> HR & Performance Management
            </p>
          </div>
        </div>
        
        <div className="flex bg-white p-2 rounded-[28px] border-2 border-slate-100 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
    { id: 'attendance', label: 'উপস্থিতি', icon: Clock },
    { id: 'leave', label: 'ছুটি', icon: Calendar },
    { id: 'performance', label: 'পারফরম্যান্স', icon: Target },
    { id: 'list', label: 'টিম মেম্বার', icon: Users }
  ].map(tab => (
    <button 
      key={tab.id}
      onClick={() => setActiveTab(tab.id as any)} 
      className={`whitespace-nowrap flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-primary text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <tab.icon size={16} />
      {tab.label}
    </button>
  ))}
</div>
</div>

{activeTab === 'list' && (
<div className="space-y-6">
  <div className="flex justify-between items-center">
    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">স্টাফ তালিকা</h3>
    {isAdmin && (
      <button onClick={() => setShowAddStaffModal(true)} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2 active:scale-95 transition-all">
        <Plus size={18}/> স্টাফ যোগ করুন
      </button>
    )}
  </div>

  <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden text-slate-700">
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-[2px] border-b-2">
          <tr>
            <th className="p-6">নাম</th>
            <th className="p-6">পদবী</th>
            <th className="p-6">যোগাযোগ</th>
            <th className="p-6">স্ট্যাটাস</th>
            <th className="p-6 text-center">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {staff.map(member => (
            <tr key={member.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-6">
                <div className="font-black text-slate-800 text-sm uppercase">{member.name}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">যোগদান: {member.joinedDate}</div>
              </td>
              <td className="p-6 font-black text-slate-600 text-xs uppercase">{member.designation}</td>
              <td className="p-6">
                <div className="text-xs font-bold text-slate-600">{member.phone}</div>
                <div className="text-[10px] text-slate-400">{member.email}</div>
              </td>
              <td className="p-6">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${member.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </span>
              </td>
              <td className="p-6 text-center">
                <div className="flex justify-center gap-2">
                  {!member.isApproved && isAdmin && (
                    <button 
                      onClick={() => onUpdateStaff(staff.map(s => s.id === member.id ? { ...s, isApproved: true, status: 'active' } : s))}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100"
                      title="অনুমোদন করুন"
                    >
                      <Check size={16}/>
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if(window.confirm('আপনি কি নিশ্চিত যে এই স্টাফ মেম্বারকে ডিলিট করতে চান?')) {
                        onUpdateStaff(staff.filter(s => s.id !== member.id))
                      }
                    }}
                    className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100"
                    title="ডিলিট"
                  >
                    <X size={16}/>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>
)}

      {activeTab === 'attendance' && (
        <div className="space-y-8">
          {/* Punch Meter / Action Card */}
          {currentStaff && selectedDate === today && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[48px] p-1 border border-white/10 shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="bg-white/5 backdrop-blur-xl p-8 sm:p-12 rounded-[44px] flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                <div className="flex items-center gap-8 w-full md:w-auto">
                   <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[40px] bg-gradient-to-br from-primary/30 to-primary/10 border border-white/20 flex items-center justify-center text-white shadow-2xl">
                      <Clock size={48} className="animate-pulse" />
                   </div>
                   <div className="flex-1">
                      <p className="text-primary font-black text-xs uppercase tracking-[3px] mb-2 drop-shadow-sm">
                        {new Date().getHours() < 12 ? 'শুভ সকাল' : new Date().getHours() < 17 ? 'শুভ অপরাহ্ণ' : 'শুভ সন্ধ্যা'}
                      </p>
                      <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tightest uppercase mb-2">
                        {currentStaff.name || 'টিম মেম্বার'}
                      </h2>
                      <div className="flex items-center gap-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                        <span className="bg-white/10 px-3 py-1 rounded-full border border-white/5">
                          {new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="bg-white/10 px-3 py-1 rounded-full border border-white/5 flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${todayAttendance ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                          {todayAttendance ? getStatusLabel(todayAttendance.status) : 'হাজিরা বাকি'}
                        </span>
                      </div>
                   </div>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4 items-stretch">
                  {!todayAttendance?.checkIn ? (
                    <button 
                      onClick={handleCheckIn}
                      className="group/btn relative bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-6 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-[32px] opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                      <Check size={20} strokeWidth={3}/> চেক-ইন করুন
                    </button>
                  ) : !todayAttendance?.checkOut ? (
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                       <div className="bg-white/10 border border-white/10 backdrop-blur-md px-8 py-6 rounded-[32px] flex flex-col items-center justify-center min-w-[140px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">প্রবেশ সময়</p>
                          <p className="text-xl font-black text-white">{todayAttendance.checkIn}</p>
                       </div>
                       <button 
                         onClick={handleCheckOut}
                         className="group/btn relative bg-rose-500 hover:bg-rose-400 text-white px-10 py-6 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-rose-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                       >
                         <div className="absolute inset-0 bg-white/20 rounded-[32px] opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                         <X size={20} strokeWidth={3}/> অফিস ত্যাগ
                       </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/20 border-2 border-emerald-500/30 text-emerald-400 px-12 py-8 rounded-[32px] flex flex-col items-center justify-center text-center">
                       <CheckCircle2 size={32} className="mb-2" />
                       <p className="font-black text-xs uppercase tracking-widest">আজকের ডিউটি সম্পন্ন</p>
                       <p className="text-[10px] opacity-60 mt-1 font-bold uppercase tracking-widest">কাজ শেষ: {todayAttendance.checkOut}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[
               { label: 'মোট স্টাফ', count: staff.length, color: 'bg-slate-500', icon: Users },
               { label: 'উপস্থিত', count: attendances.filter(a => a.date === selectedDate && (a.status === 'Present' || a.status === 'Late')).length, color: 'bg-emerald-500', icon: CheckCircle2 },
               { label: 'বিলম্বে', count: attendances.filter(a => a.date === selectedDate && a.status === 'Late').length, color: 'bg-amber-500', icon: Clock },
               { label: 'অনুপস্থিত', count: staff.length - attendances.filter(a => a.date === selectedDate && (a.status === 'Present' || a.status === 'Late' || a.status === 'Leave')).length, color: 'bg-rose-500', icon: XCircle },
             ].map((stat, i) => (
               <div key={i} className="bg-white p-5 rounded-[32px] border-2 border-slate-100 flex items-center gap-4 shadow-sm group hover:border-primary/20 transition-all">
                  <div className={`${stat.color} p-3 rounded-2xl text-white shadow-lg`}>
                    <stat.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-xl font-black text-slate-900">{stat.count}</p>
                  </div>
               </div>
             ))}
          </div>

          <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b-2 border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                <Target size={18} className="text-primary"/> উপস্থিতি রেজিস্টার
              </h3>
              <div className="flex items-center gap-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={14}/> তারিখ নির্বাচন:</label>
                <input 
                  type="date" 
                  className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-primary/20"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto text-slate-700">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-[2px] border-b-2">
                  <tr>
                    <th className="p-6">স্টাফ মেম্বার</th>
                    <th className="p-6">স্ট্যাটাস</th>
                    <th className="p-6">চেক-ইন</th>
                    <th className="p-6">চেক-আউট</th>
                    <th className="p-6">ঘণ্টা</th>
                    {isAdmin && <th className="p-6">লোকেশন</th>}
                    {isAdmin && <th className="p-6 text-center">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map(member => {
                    const att = attendances.find(a => a.staffId === member.id && a.date === selectedDate);
                    
                    const handleManualStatus = (status: Attendance['status']) => {
                      if (!isAdmin) return;
                      const timeStr = formatTime(new Date());
                      const existing = attendances.find(a => a.staffId === member.id && a.date === selectedDate);
                      if (existing) {
                        onUpdateAttendances(attendances.map(a => a.id === existing.id ? { ...a, status } : a));
                      } else {
                        onUpdateAttendances([...attendances, {
                          id: `ATT-${Date.now()}`,
                          staffId: member.id,
                          date: selectedDate,
                          status,
                          checkIn: (status === 'Present' || status === 'Late' ? timeStr : ''),
                          checkOut: ''
                        }]);
                      }
                    };

                    return (
                      <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-[10px]">
                                 {member.name.charAt(0)}
                              </div>
                              <div>
                                 <div className="font-black text-slate-800 text-sm uppercase">{member.name}</div>
                                 <div className="text-[10px] text-slate-400 font-bold uppercase">{member.designation}</div>
                              </div>
                           </div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${
                            att ? (
                              att.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : 
                              att.status === 'Late' ? 'bg-amber-50 text-amber-600' : 
                              att.status === 'Leave' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                            ) : 'bg-rose-50 text-rose-600'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              att?.status === 'Present' ? 'bg-emerald-500' :
                              att?.status === 'Late' ? 'bg-amber-500' : 
                              att?.status === 'Leave' ? 'bg-blue-500' : 'bg-rose-500'
                            }`}></div>
                            {att ? getStatusLabel(att.status) : 'অনুপস্থিত'}
                          </span>
                        </td>
                        <td className="p-6 font-black text-slate-600 text-xs tracking-tighter">{att?.checkIn || '--:--'}</td>
                        <td className="p-6 font-black text-slate-600 text-xs tracking-tighter">{att?.checkOut || '--:--'}</td>
                        <td className="p-6 font-black text-indigo-600 text-[10px]">{calculateHours(att?.checkIn, att?.checkOut) || '--'}</td>
                        {isAdmin && (
                          <td className="p-6">
                            {att?.location ? (
                              <a href={`https://maps.google.com/?q=${att.location.lat},${att.location.lng}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                                <MapPin size={12}/> ম্যাপ দেখুন
                              </a>
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="p-6 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => handleManualStatus('Present')} className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] transition-all ${att?.status === 'Present' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`} title="উপস্থিত">P</button>
                              <button onClick={() => handleManualStatus('Absent')} className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] transition-all ${att?.status === 'Absent' ? 'bg-rose-500 text-white shadow-lg' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`} title="অনুপস্থিত">A</button>
                              <button onClick={() => handleManualStatus('Late')} className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] transition-all ${att?.status === 'Late' ? 'bg-amber-500 text-white shadow-lg' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`} title="বিলম্বে">L</button>
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

          {isAdmin && (
            <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b-2 border-slate-50 bg-slate-50/10">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-500"/> মাসিক সারাংশ ({new Date(selectedDate).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })})
                </h3>
              </div>
              <div className="overflow-x-auto text-slate-700">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-[2px] border-b-2">
                    <tr>
                      <th className="p-6">স্টাফ মেম্বার</th>
                      <th className="p-6 text-center">উপস্থিত (P)</th>
                      <th className="p-6 text-center">বিলম্বে (L)</th>
                      <th className="p-6 text-center">অনুপস্থিত (A)</th>
                      <th className="p-6 text-center">ছুটি (LV)</th>
                      <th className="p-6 text-right">উপস্থিতি হার (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.map(member => {
                      const monthPrefix = selectedDate.substring(0, 7);
                      const monthAtts = attendances.filter(a => a.staffId === member.id && a.date.startsWith(monthPrefix));
                      const present = monthAtts.filter(a => a.status === 'Present').length;
                      const late = monthAtts.filter(a => a.status === 'Late').length;
                      const absent = monthAtts.filter(a => a.status === 'Absent').length;
                      const leave = monthAtts.filter(a => a.status === 'Leave').length;

                      const statusCount = monthAtts.length || 0;
                      const attendanceRate = statusCount > 0 ? Math.round(((present + late) / statusCount) * 100) : 0;

                      return (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-6 font-black text-slate-800 text-xs uppercase">{member.name}</td>
                          <td className="p-6 text-center font-black text-emerald-600">{present}</td>
                          <td className="p-6 text-center font-black text-amber-600">{late}</td>
                          <td className="p-6 text-center font-black text-rose-600">{absent}</td>
                          <td className="p-6 text-center font-black text-blue-600">{leave}</td>
                          <td className="p-6 text-right">
                             <div className="flex flex-col items-end gap-1">
                                <span className="font-black text-slate-900 text-xs">{attendanceRate}%</span>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                   <div className={`h-full rounded-full ${attendanceRate >= 90 ? 'bg-emerald-500' : attendanceRate >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${attendanceRate}%` }}></div>
                                </div>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">ছুটি ব্যবস্থাপনা</h3>
            <button onClick={() => setShowLeaveModal(true)} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2 active:scale-95 transition-all">
              <Plus size={18}/> ছুটির আবেদন
            </button>
          </div>

          <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden text-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-[2px] border-b-2">
                  <tr>
                    <th className="p-6">স্টাফ মেম্বার</th>
                    <th className="p-6">ধরণ</th>
                    <th className="p-6">সময়কাল</th>
                    <th className="p-6">কারণ</th>
                    <th className="p-6 text-center">স্ট্যাটাস</th>
                    {isAdmin && <th className="p-6 text-center">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(isAdmin ? leaves : leaves.filter(l => l.staffId === currentStaff?.id)).map(leave => {
                    const member = staff.find(s => s.id === leave.staffId);
                    return (
                      <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6">
                          <div className="font-black text-slate-800 text-sm uppercase">{member?.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{leave.appliedDate}</div>
                        </td>
                        <td className="p-6 font-black text-slate-600 text-xs uppercase">
                          {leave.type === 'Casual' ? 'নৈমিত্তিক' : leave.type === 'Sick' ? 'অসুস্থতা' : 'বার্ষিক'}
                        </td>
                        <td className="p-6 font-black text-slate-600 text-xs">{leave.startDate} থেকে {leave.endDate}</td>
                        <td className="p-6 text-xs text-slate-500 max-w-[200px] truncate">{leave.reason}</td>
                        <td className="p-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : leave.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            {leave.status === 'Approved' ? 'অনুমোদিত' : leave.status === 'Rejected' ? 'প্রত্যাখ্যাত' : 'পেন্ডিং'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-6 text-center">
                            {leave.status === 'Pending' && (
                              <div className="flex justify-center gap-2">
                                <button onClick={() => handleLeaveAction(leave.id, 'Approved')} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100"><Check size={16}/></button>
                                <button onClick={() => handleLeaveAction(leave.id, 'Rejected')} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100"><X size={16}/></button>
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

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(isAdmin ? performanceData : performanceData.filter(p => p.id === currentStaff?.id)).map(p => (
            <div key={p.id} className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-all"></div>
              <div className="relative z-10 text-slate-700">
                <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">{p.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">{p.designation}</p>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-slate-500">মাসিক লক্ষ্যমাত্রা</span>
                      <span className="text-slate-900">৳{p.target.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-slate-500">অর্জিত</span>
                      <span className="text-primary">৳{p.totalSales.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${p.achievement >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, p.achievement)}%` }}></div>
                    </div>
                    <p className="text-right text-[9px] font-black text-slate-400 mt-1">{p.achievement}%</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">নতুন স্টাফ যোগ করুন</h3>
              <button onClick={() => setShowAddStaffModal(false)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddStaff} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">পূর্ণ নাম</label>
                <input type="text" required className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2 text-slate-800" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} placeholder="স্টাফের নাম" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">পদবী</label>
                <select required className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2 text-slate-800" value={staffForm.designation} onChange={e => setStaffForm({...staffForm, designation: e.target.value})}>
                  <option value="Salesman">সেলসম্যান</option>
                  <option value="Manager">ম্যানেজার</option>
                  <option value="Admin">এডমিন</option>
                  <option value="Delivery Boy">ডেলিভারি বয়</option>
                  <option value="Accountant">অ্যাকাউন্ট্যান্ট</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">ফোন</label>
                  <input type="tel" required className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2 text-slate-800" value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} placeholder="ফোন নম্বর" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">ইমেইল</label>
                  <input type="email" required className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2 text-slate-800" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} placeholder="ইমেইল অ্যাড্রেস" />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
                স্টাফ যোগ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">ছুটির জন্য আবেদন করুন</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
            </div>
            <form onSubmit={handleLeaveSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">ছুটির ধরণ</label>
                <select required className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2 text-slate-800" value={leaveForm.type} onChange={e => setLeaveForm({...leaveForm, type: e.target.value as any})}>
                  <option value="Casual">নৈমিত্তিক ছুটি</option>
                  <option value="Sick">অসুস্থতা জনিত ছুটি</option>
                  <option value="Annual">বার্ষিক ছুটি</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">শুরুর তারিখ</label>
                  <input type="date" required className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2 text-slate-800" value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">শেষের তারিখ</label>
                  <input type="date" required className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2 text-slate-800" value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">কারণ</label>
                <textarea required rows={3} className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none mt-2 text-slate-800" value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} placeholder="ছুটির কারণ বিস্তারিত লিখুন..."></textarea>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
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
