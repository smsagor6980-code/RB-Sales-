import React, { useState, useMemo } from 'react';
import { Staff, ProductCategory, RankConfig, AppRole } from '../types';
import { auth, db, rtdb } from '../services/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { 
  UserPlus, Trash2, Edit, Save, X, Shield, Mail, Trophy, Star, 
  UserCheck2, ShieldCheck, Key, Phone, UserCog, CheckSquare, Search,
  Layers, Lock, ChevronRight, Plus, Gift, Medal, Crown, Sparkles,
  Check, AlertCircle, Eye, EyeOff, Building2, UserCircle, Settings2,
  Store, MapPin, Database, RefreshCcw, Target, Percent, Briefcase,
  Unlock, ShieldAlert, Laptop, Layout, Users, Coins, ShoppingBag, Image, Bell, Truck,
  ArrowDownToLine, CloudDownload, Zap
} from 'lucide-react';

interface SettingsProps {
  staff: Staff[];
  onUpdateStaff: (staff: Staff[]) => void;
  roles: AppRole[];
  onUpdateRoles: (roles: AppRole[]) => void;
  categories: ProductCategory[];
  rankConfigs: RankConfig[];
  onUpdateRanks: (ranks: RankConfig[]) => void;
  shopSettings: any;
  onUpdateShopSettings: (settings: any) => void;
  onBackup?: () => void;
  onRestore?: (data: any) => void;
  isAdmin?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ 
  staff, onUpdateStaff, 
  roles, onUpdateRoles, 
  categories = [], rankConfigs, onUpdateRanks,
  shopSettings, onUpdateShopSettings,
  onBackup, onRestore, isAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'ranks' | 'general' | 'ecommerce' | 'rewards' | 'backup' | 'migration'>('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRankId, setEditingRankId] = useState<string | null>(null);
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [quickEditingRoleId, setQuickEditingRoleId] = useState<string | null>(null);
  const [quickEditName, setQuickEditName] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);

  // Default shop settings if none provided
  const defaultShopData = {
    id: 'default',
    name: 'REST BAZER',
    phone: '017XXXXXXXX',
    email: 'info@restbazer.com',
    address: 'Savar, Dhaka, Bangladesh',
    currency: '৳',
    heroTitle: 'Quality Products for Your Daily Needs',
    heroSubtitle: 'Shop the best deals on groceries, electronics, and more.',
    heroImageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
    deliveryCharge: 50,
    minOrderAmount: 200,
    shopStatus: 'open',
    featuredCategories: [],
    showNewsletter: true,
    showFeatures: true,
    luckyRewards: {
      enabled: true,
      rewards: [
        { id: '1', value: '৳৫০ ডিসকাউন্ট', code: 'LUCKY50', chance: 40 },
        { id: '2', value: '৳১০০ ডিসকাউন্ট', code: 'LOWER100', chance: 20 },
        { id: '3', value: 'ফ্রি হোম ডেলিভারি', code: 'FREESHIP', chance: 30 },
        { id: '4', value: '৫% ডিসকাউন্ট', code: 'MEGA5', chance: 10 }
      ]
    },
    targetRewards: {
      enabled: true,
      milestones: [
        { id: '1', title: 'নতুন শপার', desc: '৳৫,০০০ টাকা খরচ করুন', target: 5000, type: 'spent', reward: '৳১০০ ডিসকাউন্ট', status: 'active' },
        { id: '2', title: 'অনুগত গ্রাহক', desc: '৫টি সফল অর্ডার সম্পন্ন করুন', target: 5, type: 'orders', reward: 'ফ্রি হোম ডেলিভারি কুপন', status: 'active' },
        { id: '3', title: 'প্রিমিয়াম মেম্বার', desc: '৳২৫,০০০ টাকা খরচ করুন', target: 25000, type: 'spent', reward: '৳৫০০ গিফট ভাউচার', status: 'active' }
      ]
    }
  };

  // Shop Info Local State - initialized from props merged with defaults
  const [shopData, setShopData] = useState(() => {
    if (!shopSettings) return defaultShopData;
    return {
      ...defaultShopData,
      ...shopSettings,
      luckyRewards: {
        ...defaultShopData.luckyRewards,
        ...(shopSettings.luckyRewards || {})
      },
      targetRewards: {
        ...defaultShopData.targetRewards,
        ...(shopSettings.targetRewards || {})
      }
    };
  });

  const [userFormData, setUserFormData] = useState<Partial<Staff>>({
    name: '', designation: '', roleId: '', phone: '', email: '', password: '', 
    status: 'active', assignedCategories: [], isApproved: false,
    targets: { monthly: 50000, yearly: 500000 }
  });

  const [roleFormData, setRoleFormData] = useState<Partial<AppRole>>({
    name: '', permissions: []
  });

  const [rankFormData, setRankFormData] = useState<Partial<RankConfig>>({
    name: '', minAmount: 0, level: 1, rewardDescription: ''
  });

  const appSections = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: Layout },
    { id: 'sales', label: 'Point of Sale (POS)', icon: Target },
    { id: 'approvals', label: 'Order Approvals', icon: UserCheck2 },
    { id: 'products', label: 'Inventory Control', icon: Laptop },
    { id: 'customers', label: 'Customer Management', icon: UserCircle },
    { id: 'suppliers', label: 'Supplier Ledger', icon: Building2 },
    { id: 'returns', label: 'Returns & Damages', icon: RefreshCcw },
    { id: 'employees', label: 'Employees Module', icon: UserCog },
    { id: 'payroll', label: 'Payroll Module', icon: Coins },
    { id: 'expenses', label: 'Expense Tracking', icon: Coins },
    { id: 'due', label: 'Due Collection', icon: Lock },
    { id: 'reports', label: 'Business Reports', icon: Layout },
    { id: 'settings', label: 'System Settings', icon: Settings2 },
  ];

  const resetUserForm = () => {
    setUserFormData({ 
      name: '', designation: '', roleId: '', phone: '', email: '', password: '', 
      status: 'active', assignedCategories: [], isApproved: false, 
      targets: { monthly: 50000, yearly: 500000 } 
    });
    setEditingUserId(null);
    setShowStaffPassword(false);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find the selected role details
    const selectedRole = roles.find(r => r.id === userFormData.roleId);
    // Crucial: Keep Designation and Role Name in Sync
    const finalDesignation = selectedRole ? selectedRole.name : (userFormData.designation || 'Salesman');

    if (editingUserId) {
      // Update logic: send only the changed item
      const updatedMember = {
        ...staff.find(m => m.id === editingUserId),
        ...userFormData,
        designation: finalDesignation,
        roleId: userFormData.roleId || '',
        status: userFormData.isApproved ? 'active' : 'inactive'
      } as Staff;
      onUpdateStaff([updatedMember]);
    } else {
      // Create new logic
      const newId = `USER-${Date.now()}`;
      const newStaff: Staff = {
        name: userFormData.name || '',
        email: userFormData.email || '',
        phone: userFormData.phone || '',
        password: userFormData.password || '',
        id: newId,
        uid: newId,
        designation: finalDesignation,
        roleId: userFormData.roleId || '',
        joinedDate: new Date().toISOString().split('T')[0],
        status: userFormData.isApproved ? 'active' : 'inactive',
        assignedCategories: userFormData.assignedCategories || [],
        isApproved: userFormData.isApproved || false,
        targets: userFormData.targets || { monthly: 50000, yearly: 500000 }
      };
      onUpdateStaff([newStaff]);
    }
    
    setShowUserModal(false);
    resetUserForm();
  };

  const handleEditUser = (member: Staff) => {
    // Attempt to map current designation back to a role ID if missing
    let mappedRoleId = member.roleId;
    if (!mappedRoleId && member.designation) {
      const foundRole = roles.find(r => r.name.trim().toLowerCase() === member.designation.trim().toLowerCase());
      if (foundRole) mappedRoleId = foundRole.id;
    }

    setUserFormData({
      ...member,
      roleId: mappedRoleId || ''
    });
    setEditingUserId(member.id);
    setShowUserModal(true);
  };

  const handleDeleteUser = (userId: string) => {
    const memberToDelete = staff.find(s => s.id === userId);
    if (!memberToDelete) return;

    // Protection for critical roles
    if (['Owner', 'Admin'].includes(memberToDelete.designation)) {
      alert("নিরাপত্তা সতর্কতা: এডমিন বা ওনার একাউন্ট ডিলিট করা সম্ভব নয়।");
      return;
    }

    if (confirm(`${memberToDelete.name}-কে কি নিশ্চিতভাবে সিস্টেম থেকে রিমুভ করতে চান?`)) {
      const updatedList = staff.filter(s => s.id !== userId);
      onUpdateStaff(updatedList);
    }
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoleId) {
      const targetRole = roles.find(r => r.id === editingRoleId);
      if (targetRole) {
        onUpdateRoles([{ ...targetRole, ...roleFormData } as AppRole]);
      }
    } else {
      const newRole: AppRole = {
        ...roleFormData as AppRole,
        id: `ROLE-${Date.now()}`,
        permissions: roleFormData.permissions || []
      };
      onUpdateRoles([newRole]);
    }
    setShowRoleModal(false);
    setRoleFormData({ name: '', permissions: [] });
    setEditingRoleId(null);
  };

  const handleQuickSaveRole = (roleId: string) => {
    if (!quickEditName.trim()) return;
    const target = roles.find(r => r.id === roleId);
    if (!target) return;
    const newName = quickEditName.trim();
    
    // Update role
    onUpdateRoles([{ ...target, name: newName }]);
    
    // Update staff designations to keep them in sync
    const affectedStaff = staff.filter(s => s.roleId === roleId).map(s => ({ ...s, designation: newName }));
    if (affectedStaff.length > 0) {
      onUpdateStaff(affectedStaff);
    }

    setQuickEditingRoleId(null);
  };

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    
    // Check if any staff is using this role
    const isUsed = staff.some(s => s.roleId === roleId);
    if (isUsed) {
      alert("এই রোলটি বর্তমানে স্টাফদের দ্বারা ব্যবহৃত হচ্ছে। এটি ডিলিট করা সম্ভব নয়।");
      return;
    }

    if (confirm(`আপনি কি নিশ্চিতভাবে "${role.name}" রোলটি ডিলিট করতে চান?`)) {
      onUpdateRoles(roles.filter(r => r.id !== roleId));
    }
  };

  const handleEditRole = (role: AppRole) => {
    setRoleFormData(role);
    setEditingRoleId(role.id);
    setShowRoleModal(true);
  };

  const handleEditRank = (rank: RankConfig) => {
    setRankFormData(rank);
    setEditingRankId(rank.id);
    setShowRankModal(true);
  };

  const handleRankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRankId) {
      const target = rankConfigs.find(r => r.id === editingRankId);
      if (target) {
        onUpdateRanks([{ ...target, ...rankFormData } as RankConfig]);
      }
    } else {
      const newRank: RankConfig = {
        ...rankFormData as RankConfig,
        id: `RANK-${Date.now()}`
      };
      onUpdateRanks([newRank]);
    }
    setShowRankModal(false);
    setEditingRankId(null);
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`${email} ঠিকানায় পাসওয়ার্ড রিসেট ইমেইল পাঠাতে চান?`)) return;
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, email);
        alert("পাসওয়ার্ড রিসেট ইমেইল পাঠানো হয়েছে।");
      }
    } catch (err: any) {
      alert("ইমেইল পাঠানো সম্ভব হয়নি: " + err.message);
    }
  };

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(staffSearch.toLowerCase()) || 
                           s.email.toLowerCase().includes(staffSearch.toLowerCase()) ||
                           s.phone.includes(staffSearch);
      const matchesFilter = staffFilter === 'all' ? true :
                           staffFilter === 'active' ? s.isApproved : !s.isApproved;
      return matchesSearch && matchesFilter;
    });
  }, [staff, staffSearch, staffFilter]);

  const toggleCategoryAccess = (slug: string) => {
    const current = userFormData.assignedCategories || [];
    if (current.includes(slug)) {
      setUserFormData({ ...userFormData, assignedCategories: current.filter(s => s !== slug) });
    } else {
      setUserFormData({ ...userFormData, assignedCategories: [...current, slug] });
    }
  };

  const togglePermission = (sectionId: string) => {
    const current = roleFormData.permissions || [];
    if (current.includes(sectionId)) {
      setRoleFormData({ ...roleFormData, permissions: current.filter(id => id !== sectionId) });
    } else {
      setRoleFormData({ ...roleFormData, permissions: [...current, sectionId] });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-primary p-4 rounded-[28px] text-white shadow-2xl shadow-primary/20">
             <Settings2 size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Control Center</h2>
            <p className="text-slate-500 font-bold text-xs mt-1 uppercase tracking-widest flex items-center gap-2">
              <Lock size={14} className="text-primary"/> System Configuration & Logic
            </p>
          </div>
        </div>
        
        <div className="flex bg-white p-2 rounded-[28px] border-2 border-slate-100 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'users', label: 'Staff', icon: Users },
            { id: 'roles', label: 'Access', icon: Shield },
            { id: 'ranks', label: 'Loyalty', icon: Crown },
            { id: 'rewards', label: 'Rewards', icon: Gift },
            { id: 'ecommerce', label: 'Shop', icon: ShoppingBag },
            { id: 'general', label: 'System', icon: Store },
            { id: 'backup', label: 'Backup', icon: Database },
            { id: 'migration', label: 'Migration', icon: CloudDownload }
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

      {/* ----------------- Staff Tab ----------------- */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-900/10 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all"></div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Total Personnel</p>
                <h3 className="text-4xl font-black">{staff.length} <span className="text-sm opacity-50">Members</span></h3>
             </div>
             <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col justify-center md:col-span-2">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search staff..." 
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 font-bold text-sm transition-all"
                      value={staffSearch}
                      onChange={e => setStaffSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="bg-slate-50 border-2 border-transparent rounded-2xl px-4 py-3.5 font-black text-[10px] uppercase tracking-widest outline-none focus:bg-white focus:border-primary/20 transition-all"
                    value={staffFilter}
                    onChange={e => setStaffFilter(e.target.value as any)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="locked">Locked Only</option>
                  </select>
                </div>
             </div>
             <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col justify-center">
                <button onClick={() => { resetUserForm(); setShowUserModal(true); }} className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all">
                   <UserPlus size={20}/> Add New Staff
                </button>
             </div>
          </div>

          <div className="bg-white rounded-[44px] shadow-sm border-2 border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="p-8 border-b-2 border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-3"><Users size={20} className="text-primary"/> Staff Directory</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing {filteredStaff.length} results</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-white text-slate-400 uppercase font-black text-[10px] tracking-[2px] border-b-2">
                        <tr>
                            <th className="p-8">Identity</th>
                            <th className="p-8">Tier / Role</th>
                            <th className="p-8">Catalog Access</th>
                            <th className="p-8 text-center">Status</th>
                            <th className="p-8 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStaff.map(member => (
                            <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-8">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center font-black text-xl shadow-md border-2 ${member.isApproved ? 'bg-white text-primary border-primary/10' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 text-base uppercase tracking-tight">{member.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tighter flex items-center gap-2">
                                              <Mail size={12}/> {member.email}
                                            </div>
                                            <div className="text-[9px] text-slate-300 font-bold uppercase mt-0.5 tracking-tighter font-mono">UID: {member.uid || member.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-8">
                                    <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 shadow-sm ${
                                        ['Admin', 'Owner', 'Manager'].includes(member.designation) ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
                                    }`}>
                                        {member.designation}
                                    </span>
                                </td>
                                <td className="p-8">
                                   <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                                      {member.assignedCategories && member.assignedCategories.length > 0 ? (
                                        member.assignedCategories.map(cat => (
                                          <span key={cat} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black uppercase border border-indigo-100">{cat}</span>
                                        ))
                                      ) : (
                                        <span className="text-[9px] font-black text-emerald-600 uppercase italic">Full Authorization</span>
                                      )}
                                   </div>
                                </td>
                                <td className="p-8 text-center">
                                    <button onClick={() => {
                                        const updated = staff.map(s => s.id === member.id ? { ...s, isApproved: !s.isApproved, status: !s.isApproved ? 'active' : 'inactive' } as Staff : s);
                                        onUpdateStaff(updated);
                                    }} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 border-2 ${member.isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                        {member.isApproved ? 'Active' : 'Locked'}
                                    </button>
                                </td>
                                <td className="p-8">
                                    <div className="flex justify-center gap-3">
                                        <button onClick={() => handleEditUser(member)} className="p-4 text-blue-600 bg-white border-2 border-blue-100 hover:bg-blue-50 rounded-2xl transition-all shadow-sm active:scale-90" title="Edit Profile"><Edit size={20} /></button>
                                        <button onClick={() => handleResetPassword(member.email)} className="p-4 text-amber-600 bg-white border-2 border-amber-100 hover:bg-amber-50 rounded-2xl transition-all shadow-sm active:scale-90" title="Reset Password"><Key size={20} /></button>
                                        {!['Owner', 'Admin'].includes(member.designation) && (
                                           <button onClick={() => handleDeleteUser(member.id)} className="p-4 text-rose-500 bg-white border-2 border-rose-100 hover:bg-rose-50 rounded-2xl transition-all shadow-sm active:scale-90" title="Delete User"><Trash2 size={20} /></button>
                                        )}
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

      {/* ----------------- Roles Tab ----------------- */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-sm h-full">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 border-2 border-indigo-100"><Layers size={24} /></div>
                        <div>
                          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Defined Tiers</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Access Profiles</p>
                        </div>
                    </div>
                    <button onClick={() => { setEditingRoleId(null); setRoleFormData({ name: '', permissions: [] }); setShowRoleModal(true); }} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-900/10 mb-8 flex items-center justify-center gap-3 active:scale-95 transition-all">
                        <Plus size={20}/> New Access Tier
                    </button>
                    <div className="space-y-4">
                        {roles.map(role => (
                            <div key={role.id} className={`group flex flex-col p-6 bg-slate-50 rounded-[32px] border-2 transition-all shadow-sm ${quickEditingRoleId === role.id ? 'border-indigo-500 bg-white ring-4 ring-indigo-50' : 'border-transparent hover:border-indigo-300 hover:bg-white'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        {quickEditingRoleId === role.id ? (
                                            <input 
                                                autoFocus
                                                className="w-full bg-slate-50 border-2 border-indigo-100 rounded-xl px-4 py-2 font-black text-xs uppercase outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                                value={quickEditName}
                                                onChange={e => setQuickEditName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleQuickSaveRole(role.id);
                                                    if (e.key === 'Escape') setQuickEditingRoleId(null);
                                                }}
                                            />
                                        ) : (
                                            <div onClick={() => handleEditRole(role)} className="cursor-pointer">
                                                <div className="font-black text-slate-800 text-xs uppercase tracking-tight truncate">{role.name}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-2">
                                                    <Unlock size={10} className="text-indigo-400"/> {role.permissions.length} Modules
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        {quickEditingRoleId === role.id ? (
                                            <>
                                                <button onClick={() => handleQuickSaveRole(role.id)} className="p-2.5 text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all active:scale-90"><Save size={16}/></button>
                                                <button onClick={() => setQuickEditingRoleId(null)} className="p-2.5 text-slate-400 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all active:scale-90"><X size={16}/></button>
                                            </>
                                        ) : (
                                            <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setQuickEditingRoleId(role.id); setQuickEditName(role.name); }} className="p-2.5 text-indigo-600 bg-white border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-all shadow-sm active:scale-90" title="Quick Edit Name"><Edit size={14}/></button>
                                                <button onClick={() => handleEditRole(role)} className="p-2.5 text-indigo-600 bg-white border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-all shadow-sm active:scale-90" title="Full Edit Permissions"><Shield size={14}/></button>
                                                <button onClick={() => handleDeleteRole(role.id)} className="p-2.5 text-rose-500 bg-white border border-rose-100 rounded-xl hover:bg-rose-50 transition-all shadow-sm active:scale-90" title="Delete Role"><Trash2 size={14}/></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="lg:col-span-8">
                <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-sm h-full flex flex-col">
                    <div className="flex items-center gap-4 mb-12 shrink-0">
                        <div className="bg-amber-50 p-3 rounded-2xl text-amber-600 border-2 border-amber-100"><ShieldAlert size={24} /></div>
                        <div>
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Permission Matrix</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Resource Assignments</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-10">
                        {appSections.map(section => (
                            <div key={section.id} className="p-8 rounded-[40px] bg-slate-50 border-2 border-slate-100 flex items-center justify-between group hover:border-amber-300 hover:bg-white transition-all shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="p-2.5 bg-white rounded-xl text-slate-400 group-hover:text-amber-500 transition-colors border border-slate-100"><section.icon size={18}/></div>
                                  <span className="font-black text-slate-700 uppercase tracking-tight text-[11px]">{section.label}</span>
                                </div>
                                <div className="flex -space-x-3">
                                    {roles.filter(r => r.permissions.includes(section.id)).map((r, idx) => (
                                        <div key={r.id} title={r.name} className="w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-lg uppercase relative ring-2 ring-white" style={{ zIndex: 10 + idx }}>
                                            {r.name.charAt(0)}
                                        </div>
                                    ))}
                                    {roles.filter(r => r.permissions.includes(section.id)).length === 0 && (
                                      <div className="text-[9px] font-black text-rose-300 uppercase tracking-widest italic px-4 py-2 bg-white rounded-2xl border-2 border-slate-100">Locked</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ----------------- Ranks Tab ----------------- */}
      {activeTab === 'ranks' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {rankConfigs.map((rank, i) => (
              <div key={rank.id} className="bg-white p-8 rounded-[48px] border-2 border-slate-100 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-all"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                   <div className={`p-4 rounded-2xl ${i === 0 ? 'bg-orange-50 text-orange-600' : i === 1 ? 'bg-slate-50 text-slate-600' : i === 2 ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {i === 0 ? <Medal size={24}/> : i === 1 ? <ShieldCheck size={24}/> : i === 2 ? <Trophy size={24}/> : <Crown size={24}/>}
                   </div>
                   <button onClick={() => handleEditRank(rank)} className="p-2 text-slate-300 hover:text-primary transition-colors"><Edit size={18}/></button>
                </div>
                <div className="relative z-10">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loyalty Tier</p>
                   <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{rank.name}</h3>
                   <div className="mt-6 flex justify-between items-end border-t border-slate-50 pt-4">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase">Min Expenditure</p>
                         <p className="text-lg font-black text-primary">৳{rank.minAmount.toLocaleString()}</p>
                      </div>
                      <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-lg">LVL {rank.level}</span>
                   </div>
                </div>
              </div>
            ))}
            <div className="bg-slate-50 p-8 rounded-[48px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-4 hover:bg-white hover:border-primary/30 transition-all cursor-pointer group" onClick={() => { setRankFormData({ name: '', minAmount: 0, level: rankConfigs.length + 1, rewardDescription: '' }); setEditingRankId(null); setShowRankModal(true); }}>
               <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:scale-110 transition-all">
                  <Plus size={28}/>
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Create New Benchmark</p>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Rewards Tab ----------------- */}
      {activeTab === 'rewards' && (
        <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-4 space-y-12">
          {/* Lucky Rewards Management */}
          <div className="bg-white rounded-[48px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="p-10 border-b-2 border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="bg-amber-500 p-4 rounded-3xl text-white shadow-xl shadow-amber-500/20"><Sparkles size={32}/></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">লাকি রিওয়ার্ডস কনফিগারেশন</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">স্পিন হুইল বা র্যান্ডম রিওয়ার্ডস কন্ট্রোল</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">স্ট্যাটাস:</span>
                <button 
                  onClick={() => setShopData({...shopData, luckyRewards: {...shopData.luckyRewards, enabled: !shopData.luckyRewards?.enabled}})}
                  className={`w-14 h-8 rounded-full transition-all duration-300 flex items-center p-1 shadow-inner ${shopData.luckyRewards?.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 transform ${shopData.luckyRewards?.enabled ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
            </div>

            <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {shopData.luckyRewards?.rewards.map((reward: any, idx: number) => (
                  <div key={reward.id} className="bg-slate-50 p-6 rounded-[32px] border-2 border-transparent hover:border-amber-300 hover:bg-white transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black">
                        {idx + 1}
                      </div>
                      <button 
                        onClick={() => {
                          const updatedRewards = shopData.luckyRewards.rewards.filter((r: any) => r.id !== reward.id);
                          setShopData({...shopData, luckyRewards: {...shopData.luckyRewards, rewards: updatedRewards}});
                        }}
                        className="p-2 text-rose-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">পুরস্কারের নাম</label>
                        <input 
                          className="w-full bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 transition-all"
                          value={reward.value}
                          onChange={(e) => {
                            const updated = shopData.luckyRewards.rewards.map((r: any) => r.id === reward.id ? {...r, value: e.target.value} : r);
                            setShopData({...shopData, luckyRewards: {...shopData.luckyRewards, rewards: updated}});
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">কুপন কোড</label>
                          <input 
                            className="w-full bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-amber-500 transition-all uppercase"
                            value={reward.code}
                            onChange={(e) => {
                              const updated = shopData.luckyRewards.rewards.map((r: any) => r.id === reward.id ? {...r, code: e.target.value.toUpperCase()} : r);
                              setShopData({...shopData, luckyRewards: {...shopData.luckyRewards, rewards: updated}});
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">সম্ভাবনা (%)</label>
                          <input 
                            type="number"
                            className="w-full bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 transition-all"
                            value={reward.chance}
                            onChange={(e) => {
                              const updated = shopData.luckyRewards.rewards.map((r: any) => r.id === reward.id ? {...r, chance: parseInt(e.target.value) || 0} : r);
                              setShopData({...shopData, luckyRewards: {...shopData.luckyRewards, rewards: updated}});
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => {
                    const newReward = { id: `LR-${Date.now()}`, value: 'নতুন পুরস্কার', code: 'NEWCOUPON', chance: 10 };
                    setShopData({...shopData, luckyRewards: {...shopData.luckyRewards, rewards: [...shopData.luckyRewards.rewards, newReward]}});
                  }}
                  className="bg-slate-50 p-6 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-3 hover:bg-white hover:border-amber-300 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-amber-500 group-hover:scale-110 transition-all">
                    <Plus size={24}/>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">নতুন রিওয়ার্ড এড করুন</p>
                </button>
              </div>
              
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
                <AlertCircle className="text-amber-500 shrink-0" size={20}/>
                <p className="text-[10px] font-bold text-amber-800 leading-relaxed">
                  সবগুলো রিওয়ার্ডের সম্ভাবনা (Probability) এর যোগফল ১০০ হতে হবে এমন নয়, সিস্টেম ওয়েটেড র্যান্ডমলি (Weighted Random) রিওয়ার্ড নির্বাচন করবে। তবে ১০% সম্ভাবনা মানে ১০০ জনের মধ্যে ১০ জন জেতার সম্ভাবনা থাকে।
                </p>
              </div>
            </div>
          </div>

          {/* Target Based Rewards Management */}
          <div className="bg-white rounded-[48px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="p-10 border-b-2 border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl shadow-indigo-600/20"><Target size={32}/></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">টার্গেট বা মাইলস্টোন রিওয়ার্ডস</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">নির্দিষ্ট টার্গেট পূর্ণ হলে পুরস্কার</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">স্ট্যাটাস:</span>
                 <button 
                  onClick={() => setShopData({...shopData, targetRewards: {...shopData.targetRewards, enabled: !shopData.targetRewards?.enabled}})}
                  className={`w-14 h-8 rounded-full transition-all duration-300 flex items-center p-1 shadow-inner ${shopData.targetRewards?.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 transform ${shopData.targetRewards?.enabled ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
            </div>

            <div className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {shopData.targetRewards?.milestones.map((milestone: any) => (
                  <div key={milestone.id} className="bg-slate-50 p-8 rounded-[40px] border-2 border-transparent hover:border-indigo-300 hover:bg-white transition-all group relative">
                    <button 
                      onClick={() => {
                        const updated = shopData.targetRewards.milestones.filter((m: any) => m.id !== milestone.id);
                        setShopData({...shopData, targetRewards: {...shopData.targetRewards, milestones: updated}});
                      }}
                      className="absolute top-6 right-6 p-2 text-rose-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={20}/>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">মাইলস্টোনের নাম</label>
                          <input 
                            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-indigo-500 transition-all"
                            value={milestone.title}
                            onChange={(e) => {
                              const updated = shopData.targetRewards.milestones.map((m: any) => m.id === milestone.id ? {...m, title: e.target.value} : m);
                              setShopData({...shopData, targetRewards: {...shopData.targetRewards, milestones: updated}});
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">টার্গেট টাইপ</label>
                          <select 
                            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-indigo-500 transition-all appearance-none"
                            value={milestone.type}
                            onChange={(e) => {
                              const updated = shopData.targetRewards.milestones.map((m: any) => m.id === milestone.id ? {...m, type: e.target.value} : m);
                              setShopData({...shopData, targetRewards: {...shopData.targetRewards, milestones: updated}});
                            }}
                          >
                            <option value="spent">মোট খরচ (৳)</option>
                            <option value="orders">অর্ডার সংখ্যা</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">টার্গেট ভ্যালু</label>
                          <input 
                            type="number"
                            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-indigo-500 transition-all"
                            value={milestone.target}
                            onChange={(e) => {
                              const updated = shopData.targetRewards.milestones.map((m: any) => m.id === milestone.id ? {...m, target: parseInt(e.target.value) || 0} : m);
                              setShopData({...shopData, targetRewards: {...shopData.targetRewards, milestones: updated}});
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">পুরস্কারের বিবরণ</label>
                          <input 
                            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-indigo-500 transition-all"
                            value={milestone.reward}
                            onChange={(e) => {
                              const updated = shopData.targetRewards.milestones.map((m: any) => m.id === milestone.id ? {...m, reward: e.target.value} : m);
                              setShopData({...shopData, targetRewards: {...shopData.targetRewards, milestones: updated}});
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">গ্রাহকের জন্য বিবরণ</label>
                       <input 
                          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                          value={milestone.desc}
                          onChange={(e) => {
                            const updated = shopData.targetRewards.milestones.map((m: any) => m.id === milestone.id ? {...m, desc: e.target.value} : m);
                            setShopData({...shopData, targetRewards: {...shopData.targetRewards, milestones: updated}});
                          }}
                        />
                    </div>
                  </div>
                ))}

                <button 
                   onClick={() => {
                    const newMilestone = { id: `TM-${Date.now()}`, title: 'নতুন মাইলস্টোন', desc: 'টার্গেট বিবরণ এখানে লিখুন', target: 1000, type: 'spent', reward: 'পুরস্কারের নাম', status: 'active' };
                    setShopData({...shopData, targetRewards: {...shopData.targetRewards, milestones: [...shopData.targetRewards.milestones, newMilestone]}});
                  }}
                  className="bg-slate-50 p-8 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-4 hover:bg-white hover:border-indigo-300 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:scale-110 transition-all shadow-sm">
                    <Plus size={32}/>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">নতুন মাইলস্টন এড করুন</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">টার্গেট ফুলফিলমেন্ট রিওয়ার্ড</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center pb-12">
            <button onClick={() => onUpdateShopSettings(shopData)} className="max-w-md w-full bg-primary text-white py-6 rounded-[28px] font-black uppercase text-sm tracking-[4px] shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4">
              <Save size={24}/> রিওয়ার্ড সেটিংস সেভ করুন
            </button>
          </div>
        </div>
      )}

      {/* ----------------- E-commerce Settings Tab ----------------- */}
      {activeTab === 'ecommerce' && (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4 space-y-8">
          <div className="bg-white rounded-[48px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="p-10 border-b-2 border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl shadow-indigo-600/20"><ShoppingBag size={32}/></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Shop Front Management</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Experience & Visuals</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${shopData.shopStatus === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                  Shop is {shopData.shopStatus === 'open' ? 'Live' : 'Maintenance Mode'}
                </div>
                <button 
                  onClick={() => setShopData({...shopData, shopStatus: shopData.shopStatus === 'open' ? 'closed' : 'open'})}
                  className={`w-14 h-8 rounded-full transition-all duration-300 flex items-center p-1 shadow-inner ${shopData.shopStatus === 'open' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 transform ${shopData.shopStatus === 'open' ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
            </div>

            <div className="p-12 space-y-12">
              {/* Hero Section Config */}
              <div className="space-y-8">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Image size={14}/> Hero Section Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Main Headline</label>
                      <input className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none focus:bg-white transition-all" value={shopData.heroTitle || ''} onChange={e => setShopData({...shopData, heroTitle: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sub-headline</label>
                      <textarea rows={3} className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none focus:bg-white transition-all" value={shopData.heroSubtitle || ''} onChange={e => setShopData({...shopData, heroSubtitle: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hero Image URL</label>
                      <input className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-sm bg-slate-50 outline-none focus:bg-white transition-all" value={shopData.heroImageUrl || ''} onChange={e => setShopData({...shopData, heroImageUrl: e.target.value})} />
                    </div>
                    <div className="aspect-video rounded-3xl border-2 border-slate-100 overflow-hidden bg-slate-50 relative group">
                      <img src={shopData.heroImageUrl} alt="Hero Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white font-black text-[10px] uppercase tracking-widest">Live Preview</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logistics Config */}
              <div className="space-y-8">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Truck size={14}/> Logistics & Rules</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Delivery Charge ({shopData.currency})</label>
                    <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-lg bg-slate-50 outline-none focus:bg-white transition-all" value={shopData.deliveryCharge || 0} onChange={e => setShopData({...shopData, deliveryCharge: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Min Order Amount ({shopData.currency})</label>
                    <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-black text-lg bg-slate-50 outline-none focus:bg-white transition-all" value={shopData.minOrderAmount || 0} onChange={e => setShopData({...shopData, minOrderAmount: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="flex flex-col justify-end space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Newsletter Section</span>
                      <button 
                        onClick={() => setShopData({...shopData, showNewsletter: !shopData.showNewsletter})}
                        className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center p-1 ${shopData.showNewsletter ? 'bg-indigo-500' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 transform ${shopData.showNewsletter ? 'translate-x-4' : ''}`}></div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Features Bar</span>
                      <button 
                        onClick={() => setShopData({...shopData, showFeatures: !shopData.showFeatures})}
                        className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center p-1 ${shopData.showFeatures ? 'bg-indigo-500' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 transform ${shopData.showFeatures ? 'translate-x-4' : ''}`}></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Featured Categories */}
              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Bell size={14}/> Featured Categories</h4>
                <div className="flex flex-wrap gap-3">
                  {categories.map(cat => {
                    const isFeatured = shopData.featuredCategories?.includes(cat.slug);
                    return (
                      <button 
                        key={cat.id}
                        onClick={() => {
                          const current = shopData.featuredCategories || [];
                          const updated = isFeatured ? current.filter(s => s !== cat.slug) : [...current, cat.slug];
                          setShopData({...shopData, featuredCategories: updated});
                        }}
                        className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${isFeatured ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-10 border-t-2 border-slate-50">
                <button onClick={() => onUpdateShopSettings(shopData)} className="w-full bg-indigo-600 text-white py-6 rounded-[28px] font-black uppercase text-sm tracking-[4px] shadow-2xl shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4">
                  <Save size={24}/> Update Shop Experience
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- General Settings Tab ----------------- */}
      {activeTab === 'general' && (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4">
          <div className="bg-white rounded-[48px] border-2 border-slate-100 shadow-sm overflow-hidden">
             <div className="p-10 border-b-2 border-slate-50 flex items-center gap-5">
                <div className="bg-primary/10 p-4 rounded-3xl text-primary"><Store size={32}/></div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Shop Identity</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branding & Logistics</p>
                </div>
             </div>
             <div className="p-12 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Business Name</label>
                      <input className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-base bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" value={shopData.name || ''} onChange={e => setShopData({...shopData, name: e.target.value})} />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact Hotline</label>
                      <input className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-base bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" value={shopData.phone || ''} onChange={e => setShopData({...shopData, phone: e.target.value})} />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Support Email</label>
                      <input className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-base bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" value={shopData.email || ''} onChange={e => setShopData({...shopData, email: e.target.value})} />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Local Currency Symbol</label>
                      <input className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-2xl text-primary bg-slate-50 outline-none focus:bg-white transition-all text-center max-w-[100px]" value={shopData.currency || ''} onChange={e => setShopData({...shopData, currency: e.target.value})} />
                   </div>
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Address</label>
                   <textarea rows={3} className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-base bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all" value={shopData.address || ''} onChange={e => setShopData({...shopData, address: e.target.value})} />
                </div>
                <div className="pt-6 border-t-2 border-slate-50">
                   <button onClick={() => onUpdateShopSettings(shopData)} className="w-full bg-primary text-white py-6 rounded-[28px] font-black uppercase text-sm tracking-[4px] shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4">
                      <Save size={24}/> Propagate System Changes
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ----------------- Migration Tab ----------------- */}
      {activeTab === 'migration' && (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 space-y-8">
          <div className="bg-white rounded-[48px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="p-10 border-b-2 border-slate-50 flex items-center gap-5">
              <div className="bg-indigo-50 p-4 rounded-3xl text-indigo-600 shadow-xl shadow-indigo-100"><CloudDownload size={32}/></div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Data Migration</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sync from Realtime Database</p>
              </div>
            </div>
            
            <div className="p-12 space-y-10">
              <div className="bg-amber-50 border-2 border-amber-100 p-8 rounded-[32px] flex items-start gap-5">
                <div className="bg-white p-3 rounded-2xl text-amber-500 shadow-sm"><AlertCircle size={24}/></div>
                <div>
                  <h4 className="font-black text-amber-900 uppercase text-sm mb-2 tracking-tight">Migration Warning</h4>
                  <p className="text-xs font-bold text-amber-800 leading-relaxed">This tool will fetch all data from your Realtime Database and attempt to populate Firestore. This may overwrite existing data if IDs match. Please ensure you have a backup before proceeding.</p>
                  <p className="text-[10px] font-bold text-amber-700 mt-2 italic">Note: Ensure your Realtime Database rules allow read access for the authenticated user.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Database size={14}/> Migration Control</h4>
                  {isMigrating && <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest animate-pulse"><RefreshCcw size={14} className="animate-spin"/> Migrating Data...</div>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button 
                    disabled={isMigrating}
                    onClick={async () => {
                      if (!confirm("Are you sure you want to start the migration?")) return;
                      setIsMigrating(true);
                      setMigrationLog(["Starting migration..."]);
                      try {
                        const rootRef = ref(rtdb, '/');
                        const snapshot = await get(rootRef);
                        if (!snapshot.exists()) {
                          setMigrationLog(prev => [...prev, "Error: No data found in Realtime Database."]);
                          return;
                        }

                        const allData = snapshot.val();
                        setMigrationLog(prev => [...prev, `Found root keys: ${Object.keys(allData).join(', ')}`]);

                        for (const collectionName of Object.keys(allData)) {
                          const collectionData = allData[collectionName];
                          if (typeof collectionData === 'object' && collectionData !== null) {
                            setMigrationLog(prev => [...prev, `Migrating collection: ${collectionName}...`]);
                            const batch = writeBatch(db);
                            let count = 0;
                            
                            for (const [docId, docData] of Object.entries(collectionData)) {
                              const docRef = doc(db, collectionName, docId);
                              batch.set(docRef, docData as any, { merge: true });
                              count++;
                              if (count >= 450) { // Firestore batch limit is 500
                                await batch.commit();
                                count = 0;
                              }
                            }
                            if (count > 0) await batch.commit();
                            setMigrationLog(prev => [...prev, `Successfully migrated ${Object.keys(collectionData).length} documents to ${collectionName}.`]);
                          }
                        }
                        setMigrationStatus("Migration completed successfully!");
                        setMigrationLog(prev => [...prev, "Migration finished."]);
                      } catch (err: any) {
                        console.error("Migration error:", err);
                        setMigrationLog(prev => [...prev, `Error: ${err.message}`]);
                        setMigrationStatus("Migration failed.");
                      } finally {
                        setIsMigrating(false);
                      }
                    }}
                    className={`p-8 rounded-[40px] border-2 transition-all flex flex-col items-center text-center gap-4 group ${isMigrating ? 'bg-slate-50 border-slate-100 cursor-not-allowed' : 'bg-indigo-50 border-indigo-100 hover:bg-white hover:border-indigo-300'}`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-all ${isMigrating ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white group-hover:scale-110'}`}>
                      <Zap size={32} />
                    </div>
                    <div>
                      <h5 className="font-black text-slate-900 uppercase text-xs tracking-widest">Full Auto Sync</h5>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Import all RTDB keys to Firestore</p>
                    </div>
                  </button>

                  <div className="bg-slate-900 rounded-[40px] p-8 text-white flex flex-col h-[200px]">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Migration Log</h5>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar pr-2">
                      {migrationLog.length === 0 ? (
                        <div className="text-slate-600 italic">No activity yet...</div>
                      ) : (
                        migrationLog.map((log, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-slate-600">[{i+1}]</span>
                            <span className={log.startsWith('Error') ? 'text-rose-400' : log.startsWith('Success') ? 'text-emerald-400' : 'text-slate-300'}>{log}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {migrationStatus && (
                  <div className={`p-6 rounded-2xl font-black text-xs uppercase tracking-widest text-center border-2 animate-in fade-in slide-in-from-top-2 ${migrationStatus.includes('successfully') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                    {migrationStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Modals ----------------- */}

      {/* Staff Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[100] flex items-center justify-center p-0 sm:p-6 overflow-hidden modal-container">
           <div className="bg-white w-full h-full sm:max-w-5xl sm:max-h-[90vh] sm:rounded-[48px] flex flex-col shadow-3xl animate-in zoom-in duration-300 overflow-hidden modal-content-full">
              <div className="p-8 sm:p-10 border-b-2 flex justify-between items-center bg-slate-50 shrink-0">
                 <div className="flex items-center gap-5">
                    <div className="bg-primary p-4 rounded-2xl text-white shadow-2xl shadow-primary/20"><UserCog size={28}/></div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">{editingUserId ? 'Refactor Profile' : 'Staff Onboarding'}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorization & Access Control</p>
                    </div>
                 </div>
                 <button onClick={() => setShowUserModal(false)} className="p-3 text-slate-400 hover:text-rose-600 active:scale-90 transition-all"><X size={36}/></button>
              </div>
              <form onSubmit={handleUserSubmit} className="flex-1 overflow-y-auto p-10 sm:p-14 space-y-14 custom-scrollbar">
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-5 space-y-8">
                       <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><UserCircle size={14}/> Identity Data</h4>
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Full Name</label>
                             <input required className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none focus:bg-slate-50 focus:ring-8 focus:ring-primary/5 transition-all bg-slate-50" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} placeholder="স্টাফের নাম" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Email Identity</label>
                             <input type="email" required className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none focus:bg-slate-50 focus:ring-8 focus:ring-primary/5 transition-all bg-slate-50" value={userFormData.email || ''} onChange={e => setUserFormData({...userFormData, email: e.target.value})} placeholder="ইমেইল অ্যাড্রেস" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Phone Number</label>
                             <input type="tel" required className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none focus:bg-slate-50 focus:ring-8 focus:ring-primary/5 transition-all bg-slate-50" value={userFormData.phone || ''} onChange={e => setUserFormData({...userFormData, phone: e.target.value})} placeholder="ফোন নম্বর" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">NID / ID Number</label>
                             <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none focus:bg-slate-50 focus:ring-8 focus:ring-primary/5 transition-all bg-slate-50" value={userFormData.nid || ''} onChange={e => setUserFormData({...userFormData, nid: e.target.value})} placeholder="NID Number" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Address</label>
                             <textarea rows={2} className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none focus:bg-slate-50 focus:ring-8 focus:ring-primary/5 transition-all bg-slate-50" value={userFormData.address || ''} onChange={e => setUserFormData({...userFormData, address: e.target.value})} placeholder="Full Address"></textarea>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Department</label>
                             <select className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none bg-slate-50 focus:ring-8 focus:ring-primary/5 transition-all appearance-none cursor-pointer" value={userFormData.department || ''} onChange={e => setUserFormData({...userFormData, department: e.target.value})}>
                                 <option value="">Select Department</option>
                                 <option value="Sales">Sales</option>
                                 <option value="Marketing">Marketing</option>
                                 <option value="Accounts">Accounts</option>
                                 <option value="Operations">Operations</option>
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Joined Date</label>
                             <input type="date" className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none focus:bg-slate-50 focus:ring-8 focus:ring-primary/5 transition-all bg-slate-50" value={userFormData.joinedDate?.split('T')[0]} onChange={e => setUserFormData({...userFormData, joinedDate: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">System Tier (Role)</label>
                             <div className="relative">
                                <select required className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none bg-slate-50 focus:ring-8 focus:ring-primary/5 transition-all appearance-none cursor-pointer" value={userFormData.roleId || ''} onChange={e => setUserFormData({...userFormData, roleId: e.target.value})}>
                                    <option value="">Select Tier</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    {!roles.length && <option value="salesman">Salesman (Default)</option>}
                                </select>
                                <ChevronRight className="absolute right-4 top-4 text-slate-300 pointer-events-none rotate-90" size={20} />
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="lg:col-span-7 space-y-8">
                       <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Percent size={14}/> Operational Logic</h4>
                       <div className="space-y-6">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Authorized Categories (Optional)</label>
                             <div className="flex flex-wrap gap-2 p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100">
                                {categories.map(cat => {
                                   const isSelected = userFormData.assignedCategories?.includes(cat.slug);
                                   return (
                                      <button 
                                         type="button" key={cat.id} 
                                         onClick={() => toggleCategoryAccess(cat.slug)}
                                         className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${isSelected ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                      >
                                         {cat.name}
                                      </button>
                                   );
                                })}
                                {categories.length === 0 && <p className="text-[9px] font-black text-slate-400 uppercase italic">No Categories Defined</p>}
                             </div>
                             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest px-2">Grant full access by leaving unselected.</p>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Sales Target (৳)</label>
                                <input type="number" required className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none bg-indigo-50/50" value={userFormData.targets?.monthly || 0} onChange={e => setUserFormData({...userFormData, targets: {...(userFormData.targets || {monthly:0, yearly:0}), monthly: parseFloat(e.target.value) || 0}})} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Secure Key (Pass)</label>
                                <div className="relative">
                                   <input type={showStaffPassword ? "text" : "password"} className="w-full border-2 border-slate-100 rounded-2xl pl-4.5 pr-12 py-4.5 font-black text-sm outline-none bg-slate-50" value={userFormData.password || ''} onChange={e => setUserFormData({...userFormData, password: e.target.value})} placeholder="Set Password" />
                                   <button type="button" onClick={() => setShowStaffPassword(!showStaffPassword)} className="absolute right-4 top-4 text-slate-300 hover:text-primary transition-all p-1">{showStaffPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                                </div>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Basic Salary (৳)</label>
                                <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none bg-slate-50" value={userFormData.salaryStructure?.basic || 0} onChange={e => setUserFormData({...userFormData, salaryStructure: {...(userFormData.salaryStructure || {basic:0, travelAllowance:0, foodAllowance:0, mobileAllowance:0}), basic: parseFloat(e.target.value) || 0}})} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Travel Allowance (৳)</label>
                                <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none bg-slate-50" value={userFormData.salaryStructure?.travelAllowance || 0} onChange={e => setUserFormData({...userFormData, salaryStructure: {...(userFormData.salaryStructure || {basic:0, travelAllowance:0, foodAllowance:0, mobileAllowance:0}), travelAllowance: parseFloat(e.target.value) || 0}})} />
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Food Allowance (৳)</label>
                                <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none bg-slate-50" value={userFormData.salaryStructure?.foodAllowance || 0} onChange={e => setUserFormData({...userFormData, salaryStructure: {...(userFormData.salaryStructure || {basic:0, travelAllowance:0, foodAllowance:0, mobileAllowance:0}), foodAllowance: parseFloat(e.target.value) || 0}})} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Mobile Allowance (৳)</label>
                                <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none bg-slate-50" value={userFormData.salaryStructure?.mobileAllowance || 0} onChange={e => setUserFormData({...userFormData, salaryStructure: {...(userFormData.salaryStructure || {basic:0, travelAllowance:0, foodAllowance:0, mobileAllowance:0}), mobileAllowance: parseFloat(e.target.value) || 0}})} />
                             </div>
                          </div>
                          <div className="grid grid-cols-3 gap-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Casual Leave</label>
                                <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none bg-slate-50" value={userFormData.leaveBalance?.casual || 0} onChange={e => setUserFormData({...userFormData, leaveBalance: {...(userFormData.leaveBalance || {casual:0, sick:0, annual:0}), casual: parseInt(e.target.value) || 0}})} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Sick Leave</label>
                                <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none bg-slate-50" value={userFormData.leaveBalance?.sick || 0} onChange={e => setUserFormData({...userFormData, leaveBalance: {...(userFormData.leaveBalance || {casual:0, sick:0, annual:0}), sick: parseInt(e.target.value) || 0}})} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Annual Leave</label>
                                <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm outline-none bg-slate-50" value={userFormData.leaveBalance?.annual || 0} onChange={e => setUserFormData({...userFormData, leaveBalance: {...(userFormData.leaveBalance || {casual:0, sick:0, annual:0}), annual: parseInt(e.target.value) || 0}})} />
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="p-10 bg-slate-900 rounded-[44px] text-white flex flex-col sm:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700"></div>
                    <div className="relative z-10 flex items-center gap-6">
                       <div className={`p-5 rounded-[28px] ${userFormData.isApproved ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'} shadow-2xl transition-all duration-500`}>
                          {userFormData.isApproved ? <Unlock size={32}/> : <Lock size={32}/>}
                       </div>
                       <div>
                          <p className="font-black text-xl uppercase tracking-tight">Access Approval</p>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${userFormData.isApproved ? 'text-emerald-400' : 'text-slate-400'}`}>{userFormData.isApproved ? 'Authorized Personnel' : 'Account Restricted'}</p>
                       </div>
                    </div>
                    <button type="button" onClick={() => setUserFormData({...userFormData, isApproved: !userFormData.isApproved})} className={`w-24 h-12 rounded-full transition-all duration-300 flex items-center p-1.5 shadow-inner relative z-10 ${userFormData.isApproved ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                       <div className={`w-9 h-9 bg-white rounded-full shadow-2xl transition-all duration-300 transform ${userFormData.isApproved ? 'translate-x-12' : ''}`}></div>
                    </button>
                 </div>

                 <button type="submit" className="w-full bg-primary text-white py-8 rounded-[36px] font-black uppercase text-sm tracking-[4px] shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4">
                    <Save size={28}/> Commit Personnel Data
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Role Matrix Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[100] flex items-center justify-center p-0 sm:p-6 overflow-hidden modal-container">
           <div className="bg-white w-full h-full sm:max-w-2xl sm:max-h-[88vh] sm:rounded-[48px] flex flex-col shadow-3xl animate-in zoom-in duration-300 overflow-hidden modal-content-full">
              <div className="p-8 sm:p-10 border-b-2 flex justify-between items-center bg-slate-50 shrink-0">
                 <div className="flex items-center gap-5">
                    <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-2xl shadow-indigo-600/10"><Shield size={28}/></div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">{editingRoleId ? 'Update Tier' : 'Tier Creation'}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Resource Mapping Logic</p>
                    </div>
                 </div>
                 <button onClick={() => setShowRoleModal(false)} className="p-3 text-slate-400 hover:text-rose-600 active:scale-90 transition-all"><X size={36}/></button>
              </div>
              <form onSubmit={handleRoleSubmit} className="flex-1 overflow-y-auto p-10 sm:p-12 space-y-12 custom-scrollbar">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-6">Tier Alias (Role Name)</label>
                    <input required className="w-full border-2 border-slate-100 rounded-[32px] p-8 font-black text-3xl outline-none focus:bg-slate-50 focus:border-indigo-600/20 transition-all text-indigo-700" value={roleFormData.name || ''} onChange={e => setRoleFormData({...roleFormData, name: e.target.value})} placeholder="e.g. Area Manager" />
                 </div>

                 <div className="space-y-8">
                    <div className="flex items-center justify-between border-b-2 border-slate-50 pb-4">
                       <h4 className="font-black text-slate-900 text-[11px] uppercase tracking-[3px] flex items-center gap-3">
                          <CheckSquare size={18} className="text-indigo-600"/> Module Access
                       </h4>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{roleFormData.permissions?.length} Modules Active</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {appSections.map(section => {
                          const isSelected = roleFormData.permissions?.includes(section.id);
                          return (
                             <button type="button" key={section.id} onClick={() => togglePermission(section.id)} className={`p-6 rounded-[28px] border-2 flex items-center justify-between transition-all active:scale-95 ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-xl scale-[1.02]' : 'bg-white border-slate-50 hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-4">
                                   <div className={`p-2 rounded-lg ${isSelected ? 'text-indigo-600 bg-white' : 'text-slate-300 bg-slate-50'}`}><section.icon size={16}/></div>
                                   <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-indigo-800' : 'text-slate-500'}`}>{section.label}</span>
                                </div>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-slate-200 text-transparent'}`}>
                                   <Check size={18} strokeWidth={4}/>
                                </div>
                             </button>
                          );
                       })}
                    </div>
                 </div>

                 <button type="submit" className="w-full bg-indigo-600 text-white py-8 rounded-[36px] font-black uppercase text-xs tracking-[4px] shadow-2xl shadow-indigo-900/30 active:scale-95 transition-all">
                    Update Access Matrix
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Rank Modal */}
      {showRankModal && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-xl z-[100] flex items-center justify-center p-0 sm:p-6 overflow-hidden modal-container">
           <div className="bg-white w-full h-full sm:max-w-xl sm:max-h-[80vh] sm:rounded-[48px] flex flex-col shadow-3xl animate-in zoom-in duration-300 overflow-hidden modal-content-full">
              <div className="p-8 sm:p-10 border-b-2 flex justify-between items-center bg-slate-50 shrink-0">
                 <div className="flex items-center gap-5">
                    <div className="bg-amber-500 p-4 rounded-2xl text-white shadow-2xl shadow-amber-500/20"><Trophy size={28}/></div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">{editingRankId ? 'Edit Rank' : 'New Rank'}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Loyalty Logic Config</p>
                    </div>
                 </div>
                 <button onClick={() => setShowRankModal(false)} className="p-3 text-slate-400 hover:text-rose-600 active:scale-90 transition-all"><X size={36}/></button>
              </div>
              <form onSubmit={handleRankSubmit} className="flex-1 overflow-y-auto p-10 sm:p-12 space-y-10 custom-scrollbar">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Tier Name</label>
                       <input required className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm bg-slate-50 outline-none focus:bg-white transition-all" value={rankFormData.name || ''} onChange={e => setRankFormData({...rankFormData, name: e.target.value})} placeholder="e.g. Gold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Minimum Purchase Amount (৳)</label>
                       <input type="number" required className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-xl text-primary bg-slate-50 outline-none focus:bg-white transition-all" value={rankFormData.minAmount || 0} onChange={e => setRankFormData({...rankFormData, minAmount: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Reward Description</label>
                       <textarea rows={3} className="w-full border-2 border-slate-100 rounded-2xl p-4.5 font-black text-sm bg-slate-50 outline-none focus:bg-white transition-all" value={rankFormData.rewardDescription || ''} onChange={e => setRankFormData({...rankFormData, rewardDescription: e.target.value})} placeholder="What does the customer get?" />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-amber-500 text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-[4px] shadow-2xl shadow-amber-900/30 active:scale-95 transition-all">
                    Save Tier Logic
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* ----------------- Backup & Restore Tab ----------------- */}
      {activeTab === 'backup' && (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4">
          <div className="bg-white rounded-[48px] border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="p-10 border-b-2 border-slate-50 flex items-center gap-5">
              <div className="bg-primary/10 p-4 rounded-3xl text-primary"><Database size={32}/></div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Data Integrity</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Backup & System Restore</p>
              </div>
            </div>
            <div className="p-12 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-slate-50 rounded-[32px] border-2 border-slate-100 space-y-6">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
                    <Save size={24}/>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Create Backup</h4>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">আপনার সব ডেটা (পণ্য, কাস্টমার, সেলস ইত্যাদি) একটি ফাইলে সেভ করে রাখুন।</p>
                  </div>
                  <button 
                    onClick={onBackup}
                    className="w-full bg-white border-2 border-slate-200 text-slate-800 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-3"
                  >
                    Download Backup File
                  </button>
                </div>

                <div className="p-8 bg-rose-50 rounded-[32px] border-2 border-rose-100 space-y-6">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
                    <RefreshCcw size={24}/>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Restore System</h4>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">আগের ব্যাকআপ ফাইল থেকে ডেটা রিস্টোর করুন। সতর্কতা: বর্তমান ডেটা ওভাররাইট হবে।</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const json = JSON.parse(event.target?.result as string);
                              if (window.confirm('আপনি কি নিশ্চিত যে আপনি এই ব্যাকআপটি রিস্টোর করতে চান? এটি বর্তমান সব ডেটা মুছে ফেলবে।')) {
                                onRestore?.(json);
                              }
                            } catch (err) {
                              alert('ভুল ফাইল ফরম্যাট। অনুগ্রহ করে সঠিক JSON ফাইল সিলেক্ট করুন।');
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <button className="w-full bg-white border-2 border-rose-200 text-rose-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex items-center justify-center gap-3">
                      Upload & Restore Data
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                <AlertCircle className="text-amber-500 shrink-0" size={20}/>
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-wider">
                  সতর্কতা: রিস্টোর করার আগে অবশ্যই বর্তমান ডেটার একটি ব্যাকআপ নিয়ে নিন। রিস্টোর করার পর সিস্টেম অটোমেটিক রিলোড হবে।
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;