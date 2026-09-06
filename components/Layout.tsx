
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  LogOut,
  Store,
  Menu,
  X,
  FileBarChart,
  TrendingDown,
  Settings as SettingsIcon,
  Truck,
  ShieldCheck,
  ClipboardCheck,
  RotateCcw,
  UserCog,
  Banknote,
  Landmark,
  ShoppingBag,
  Camera,
  Upload,
  Image as ImageIcon,
  Edit3,
  Trash2,
  Check,
  Save,
  Sparkles,
  Palette,
  Type,
  Building2,
  ChevronDown,
  Layers,
  Globe,
  Plus,
  Calendar,
  Clock
} from 'lucide-react';
import { AppRole, Product, ShopSettings, CompanyBranch, calculateLowStockAlerts } from '../types';
import { getLocalDateString, formatDisplayDate, formatDisplayTime } from '../services/dateUtils';

export const HEADER_COLOR_PRESETS = [
  { id: '#1e1e5f', label: 'রয়্যাল নেভি', bg: '#1e1e5f', gradient: 'from-[#111836] via-[#1e1e5f] to-[#16164a]', border: 'border-indigo-500/30' },
  { id: '#0f172a', label: 'ডিপ স্লেট', bg: '#0f172a', gradient: 'from-[#090d16] via-[#0f172a] to-[#1e293b]', border: 'border-slate-700/40' },
  { id: '#064e3b', label: 'এমারেল্ড গ্রিন', bg: '#064e3b', gradient: 'from-[#022c22] via-[#064e3b] to-[#047857]', border: 'border-emerald-500/30' },
  { id: '#1e3a8a', label: 'ওশান ব্লু', bg: '#1e3a8a', gradient: 'from-[#172554] via-[#1e3a8a] to-[#1d4ed8]', border: 'border-blue-500/30' },
  { id: '#3b0764', label: 'মিডনাইট পার্পল', bg: '#3b0764', gradient: 'from-[#2e1065] via-[#3b0764] to-[#581c87]', border: 'border-purple-500/30' },
  { id: '#881337', label: 'রয়েল মেরুন', bg: '#881337', gradient: 'from-[#4c0519] via-[#881337] to-[#9f1239]', border: 'border-rose-500/30' },
  { id: '#451a03', label: 'চকলেট কফি', bg: '#451a03', gradient: 'from-[#291002] via-[#451a03] to-[#78350f]', border: 'border-amber-500/30' },
  { id: '#18181b', label: 'কার্বন ব্ল্যাক', bg: '#18181b', gradient: 'from-[#09090b] via-[#18181b] to-[#27272a]', border: 'border-zinc-700/40' },
];

export const HEADER_TEXT_COLOR_PRESETS = [
  { id: '#ffffff', label: 'স্নো হোয়াইট (White)', color: '#ffffff' },
  { id: '#fde047', label: 'গোল্ডেন ইয়েলো (Gold)', color: '#fde047' },
  { id: '#67e8f9', label: 'আইস সায়ান (Cyan)', color: '#67e8f9' },
  { id: '#86efac', label: 'মিন্ট গ্রিন (Mint)', color: '#86efac' },
  { id: '#fbcfe8', label: 'সফট পিংক (Pink)', color: '#fbcfe8' },
  { id: '#fed7aa', label: 'পীচ ক্রিম (Peach)', color: '#fed7aa' },
  { id: '#f1f5f9', label: 'সিলভার লাইট (Silver)', color: '#f1f5f9' },
  { id: '#0f172a', label: 'ডিপ স্লেট (Dark)', color: '#0f172a' },
];

export const HEADER_SUBTITLE_COLOR_PRESETS = [
  { id: '#fcd34d', label: 'অ্যাম্বার গোল্ড (Amber)', color: '#fcd34d' },
  { id: '#f8fafc', label: 'ব্রাইট হোয়াইট (White)', color: '#f8fafc' },
  { id: '#93c5fd', label: 'স্কাই ব্লু (Sky Blue)', color: '#93c5fd' },
  { id: '#a7f3d0', label: 'লাইম গ্রিন (Lime)', color: '#a7f3d0' },
  { id: '#cbd5e1', label: 'সফট গ্রে (Light Gray)', color: '#cbd5e1' },
  { id: '#f472b6', label: 'রোজ পিংক (Rose)', color: '#f472b6' },
  { id: '#fed7aa', label: 'পীচ ওরেঞ্জ (Orange)', color: '#fed7aa' },
  { id: '#334155', label: 'ডার্ক গ্রে (Dark)', color: '#334155' },
];

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
  isOnline: boolean;
  onLogout: () => void;
  userEmail: string;
  isAdmin: boolean;
  userRoleName?: string;
  roles?: AppRole[];
  onSwitchToShop?: () => void;
  products?: Product[];
  shopSettings?: ShopSettings;
  onUpdateShopSettings?: (settings: any) => void;
  companies?: CompanyBranch[];
  activeCompanyId?: string;
  onSelectCompany?: (companyId: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activePage, 
  setActivePage, 
  isOnline, 
  onLogout,
  userEmail,
  isAdmin,
  userRoleName = 'Salesman',
  roles = [],
  onSwitchToShop,
  products = [],
  shopSettings,
  onUpdateShopSettings,
  companies = [],
  activeCompanyId = 'company-main',
  onSelectCompany
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const [currentDateTime, setCurrentDateTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if current user is the master owner/superadmin
  const isMasterOwner = (userEmail || '').toLowerCase().trim() === 'smsagor6980@gmail.com';
  
  // If user is a branch admin/staff (not master owner), only allow access to their matched companies
  const accessibleCompanies = useMemo(() => {
    if (isMasterOwner) return companies;
    const userEmailLower = (userEmail || '').toLowerCase().trim();
    const matched = companies.filter(c => 
      (c.adminEmail && c.adminEmail.toLowerCase().trim() === userEmailLower) || 
      (c.email && c.email.toLowerCase().trim() === userEmailLower) ||
      c.id === activeCompanyId
    );
    return matched.length > 0 ? matched : (companies.filter(c => c.id === activeCompanyId).length > 0 ? companies.filter(c => c.id === activeCompanyId) : companies);
  }, [companies, isMasterOwner, userEmail, activeCompanyId]);
  // Local editing state for Header Customization
  const [headerFormData, setHeaderFormData] = useState({
    logoUrl: shopSettings?.logoUrl || '',
    headerTitle: shopSettings?.headerTitle || shopSettings?.name || 'REST BAZER',
    headerSubtitle: shopSettings?.headerSubtitle || '',
    headerBgColor: shopSettings?.headerBgColor || '#1e1e5f',
    headerTextColor: shopSettings?.headerTextColor || '#ffffff',
    headerSubtitleColor: shopSettings?.headerSubtitleColor || '#fcd34d',
    name: shopSettings?.name || 'REST BAZER'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync formData when shopSettings changes
  React.useEffect(() => {
    if (shopSettings) {
      setHeaderFormData({
        logoUrl: shopSettings.logoUrl || '',
        headerTitle: shopSettings.headerTitle || shopSettings.name || 'REST BAZER',
        headerSubtitle: shopSettings.headerSubtitle || '',
        headerBgColor: shopSettings.headerBgColor || '#1e1e5f',
        headerTextColor: shopSettings.headerTextColor || '#ffffff',
        headerSubtitleColor: shopSettings.headerSubtitleColor || '#fcd34d',
        name: shopSettings.name || 'REST BAZER'
      });
    }
  }, [shopSettings]);

  const lowStockCount = React.useMemo(() => {
    if (!isAdmin) return 0;
    return calculateLowStockAlerts(products).length;
  }, [products, isAdmin]);

  // Image compressor & converter to Base64
  const resizeImage = (file: File, maxWidth = 800, maxHeight = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.9);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const base64 = await resizeImage(file, 600, 300);
      setHeaderFormData(prev => ({ ...prev, logoUrl: base64 }));
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error("Logo upload error:", err);
      alert("ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveHeaderSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!onUpdateShopSettings) {
      alert("সেটিংস আপডেট ফাংশন পাওয়া যায়নি।");
      return;
    }

    const updated = {
      ...(shopSettings || {}),
      logoUrl: headerFormData.logoUrl,
      headerTitle: headerFormData.headerTitle.trim() || 'REST BAZER',
      headerSubtitle: headerFormData.headerSubtitle.trim(),
      headerBgColor: headerFormData.headerBgColor || '#1e1e5f',
      headerTextColor: headerFormData.headerTextColor || '#ffffff',
      headerSubtitleColor: headerFormData.headerSubtitleColor || '#fcd34d',
      name: headerFormData.name.trim() || headerFormData.headerTitle.trim() || 'REST BAZER'
    };

    onUpdateShopSettings(updated);
    setShowLogoModal(false);
  };

  // Default standard fallback permissions for roles if database roles are empty
  const DEFAULT_PERMISSIONS: Record<string, string[]> = {
    'owner': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'suppliers', 'returns', 'employees', 'payroll', 'company_loans', 'expenses', 'due', 'reports', 'settings'],
    'admin': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'suppliers', 'returns', 'employees', 'payroll', 'company_loans', 'expenses', 'due', 'reports', 'settings'],
    'super admin': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'suppliers', 'returns', 'employees', 'payroll', 'company_loans', 'expenses', 'due', 'reports', 'settings'],
    'মালিক': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'suppliers', 'returns', 'employees', 'payroll', 'company_loans', 'expenses', 'due', 'reports', 'settings'],
    'এডমিন': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'suppliers', 'returns', 'employees', 'payroll', 'company_loans', 'expenses', 'due', 'reports', 'settings'],
    'manager': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'suppliers', 'returns', 'employees', 'payroll', 'company_loans', 'expenses', 'due', 'reports'],
    'ম্যানেজার': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'suppliers', 'returns', 'employees', 'payroll', 'company_loans', 'expenses', 'due', 'reports'],
    'branch manager': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'suppliers', 'returns', 'employees', 'payroll', 'company_loans', 'expenses', 'due', 'reports'],
    'accountant': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'suppliers', 'returns', 'payroll', 'company_loans', 'expenses', 'due', 'reports'],
    'হিসাবরক্ষক': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'suppliers', 'returns', 'payroll', 'company_loans', 'expenses', 'due', 'reports'],
    'cashier': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'returns', 'expenses', 'due'],
    'ক্যাশিয়ার': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'returns', 'expenses', 'due'],
    'salesman': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'returns', 'due'],
    'সেলসম্যান': ['dashboard', 'sales', 'approvals', 'products', 'customers', 'returns', 'due'],
  };

  // Find permissions for current user role safely
  const normalizedRoleName = (userRoleName || (isAdmin ? 'Admin' : 'Salesman')).trim().toLowerCase();
  const currentUserRole = roles.find(r => r?.name && typeof r.name === 'string' && r.name.trim().toLowerCase() === normalizedRoleName);
  let permissions = (currentUserRole && Array.isArray(currentUserRole.permissions)) ? currentUserRole.permissions : [];

  // If no permissions loaded yet, use the default standard permissions
  if (permissions.length === 0) {
    permissions = DEFAULT_PERMISSIONS[normalizedRoleName] || (isAdmin ? DEFAULT_PERMISSIONS['admin'] : DEFAULT_PERMISSIONS['salesman']);
  }

  const canAccess = (itemId: string) => {
    // Only the Master Owner (smsagor6980@gmail.com) on the Main / Master view can access and see Company/Branch Management.
    // In newly created companies or branch views, the company & branch menu is NOT shown.
    if (itemId === 'companies') {
      const isViewingMainOrMaster = activeCompanyId === 'all' || activeCompanyId === 'company-main';
      const isPrivileged = isMasterOwner || isAdmin || ['owner', 'admin', 'super admin', 'মালিক', 'এডমিন', 'company admin', 'director', 'manager', 'ম্যানেজার'].includes(normalizedRoleName);
      return isPrivileged && isViewingMainOrMaster;
    }

    const roleName = normalizedRoleName;
    // Owners, Admins, Super Admins, Managers and Directors always have full access (except for companies menu which is handled above)
    if (isAdmin || ['owner', 'admin', 'super admin', 'মালিক', 'এডমিন', 'company admin', 'director', 'manager', 'ম্যানেজার', 'branch manager', 'executive'].includes(roleName)) return true;
    
    // If permissions array contains '*' or 'all', grant access
    if (permissions.includes('*') || permissions.includes('all')) return true;

    // For others, check defined permissions
    return permissions.includes(itemId);
  };

  const navItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'sales', label: 'বিক্রয়/POS', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'approvals', label: 'অনুমোদন', icon: ClipboardCheck, color: 'text-violet-600', bg: 'bg-violet-50' },
    { id: 'products', label: 'ইনভেন্টরি', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'customers', label: 'কাস্টমার', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'suppliers', label: 'সাপ্লায়ার', icon: Truck, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'returns', label: 'রিটার্ন', icon: RotateCcw, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'employees', label: 'কর্মচারী ও HR', icon: UserCog, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'payroll', label: 'পেরোল', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'company_loans', label: 'Company Loan 💰', icon: Landmark, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'expenses', label: 'খরচ (Expenses)', icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'due', label: 'বকেয়া তালিকা', icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'reports', label: 'রিপোর্ট', icon: FileBarChart, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'companies', label: 'কোম্পানি ও ব্রাঞ্চ', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'settings', label: 'সেটিংস', icon: SettingsIcon, color: 'text-slate-600', bg: 'bg-slate-100' },
  ].filter(item => canAccess(item.id));

  // Filtered footer items for mobile
  const footerItems = [
    { id: 'dashboard', label: 'হোম', icon: LayoutDashboard, color: 'text-indigo-600' },
    { id: 'sales', label: 'POS', icon: ShoppingCart, color: 'text-emerald-600' },
    { id: 'products', label: 'স্টক', icon: Package, color: 'text-blue-600' },
    { id: 'customers', label: 'CRM', icon: Users, color: 'text-amber-600' },
    { id: 'reports', label: 'রিপোর্ট', icon: FileBarChart, color: 'text-purple-600' },
  ].filter(item => canAccess(item.id));

  const displayTitle = shopSettings?.headerTitle || shopSettings?.name || 'REST BAZER';
  const displaySubtitle = shopSettings?.headerSubtitle;
  const currentLogo = shopSettings?.logoUrl;
  const currentHeaderBg = shopSettings?.headerBgColor || '#1e1e5f';
  const currentHeaderTextColor = shopSettings?.headerTextColor || '#ffffff';
  const currentHeaderSubtitleColor = shopSettings?.headerSubtitleColor || '#fcd34d';

  // Find active preset for main header
  const activeHeaderPreset = HEADER_COLOR_PRESETS.find(p => p.bg.toLowerCase() === currentHeaderBg.toLowerCase() || p.id === currentHeaderBg);
  const headerBgGradient = activeHeaderPreset ? activeHeaderPreset.gradient : 'from-[#111836] via-[#1e1e5f] to-[#16164a]';
  const headerBorderStyle = activeHeaderPreset ? activeHeaderPreset.border : 'border-indigo-500/20';
  const headerInlineStyle = !activeHeaderPreset ? { backgroundColor: currentHeaderBg } : undefined;

  // Active preset for modal live preview
  const previewPreset = HEADER_COLOR_PRESETS.find(p => p.bg.toLowerCase() === (headerFormData.headerBgColor || '#1e1e5f').toLowerCase());
  const previewGradient = previewPreset ? previewPreset.gradient : 'from-[#111836] via-[#1e1e5f] to-[#16164a]';
  const previewInlineStyle = !previewPreset ? { backgroundColor: headerFormData.headerBgColor } : undefined;

  return (
    <div className="h-[100dvh] bg-slate-100/70 flex flex-col font-sans overflow-hidden">
      <header 
        style={headerInlineStyle}
        className={`bg-gradient-to-r ${headerBgGradient} text-white shadow-xl shadow-slate-950/20 z-50 shrink-0 print:hidden border-b ${headerBorderStyle} transition-colors duration-300`}
      >
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2.5 hover:bg-white/10 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            {/* Header Branding (Logo + Text) */}
            <div className="flex items-center gap-3 group relative">
              <div 
                className="flex items-center gap-3 cursor-pointer select-none" 
                onClick={() => setActivePage('dashboard')}
                title="ড্যাশবোর্ডে যান"
              >
                {/* Logo Display */}
                {currentLogo ? (
                  <div className="h-10 max-w-[130px] sm:max-w-[170px] bg-white/95 rounded-xl p-1 shadow-md border border-white/30 flex items-center justify-center shrink-0 overflow-hidden hover:scale-105 transition-transform">
                    <img 
                      src={currentLogo} 
                      alt={displayTitle} 
                      className="max-h-full w-auto max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 p-2 rounded-xl shadow-lg shadow-amber-500/20 hidden xs:flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Store size={20} strokeWidth={3} />
                  </div>
                )}

                {/* Text Display */}
                <div className="flex flex-col justify-center">
                  <h1 
                    style={{ color: currentHeaderTextColor }}
                    className="text-lg sm:text-xl md:text-2xl font-black tracking-normal uppercase whitespace-nowrap leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
                  >
                    {displayTitle}
                  </h1>
                  {displaySubtitle && (
                    <span 
                      style={{ color: currentHeaderSubtitleColor }}
                      className="text-[10px] sm:text-xs font-bold tracking-wide whitespace-nowrap hidden xs:block mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                    >
                      {displaySubtitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Edit Button on Header (For Admin/Manager or anytime) */}
              {(isAdmin || ['admin', 'owner', 'manager'].includes((userRoleName || '').toLowerCase())) && (
                <button 
                  onClick={() => setShowLogoModal(true)}
                  className="p-1.5 bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-amber-200 rounded-lg text-xs font-bold transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-sm flex items-center gap-1.5 ml-1"
                  title="হেডার কালার, লোগো ও লেখা পরিবর্তন করুন"
                  id="btn-edit-header-branding"
                >
                  <Palette size={13} />
                  <span className="text-[10px] hidden md:inline font-bold">কালার ও লোগো</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Company / Branch Switcher: Displayed for Master Owner or Admin across all branch and main views */}
            {(isMasterOwner || isAdmin) && companies.length > 0 && (
              <div className="relative" ref={companyDropdownRef}>
                <button
                  onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 shadow-xs active:scale-95 group"
                  title="কোম্পানি বা ব্রাঞ্চ পরিবর্তন করুন (মাস্টার কন্ট্রোল)"
                  id="btn-company-switcher"
                >
                  <div className="w-5 h-5 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black shrink-0">
                    <Building2 size={12} />
                  </div>
                  <div className="text-left hidden sm:block max-w-[130px] md:max-w-[170px] truncate">
                    <span className="block text-[10px] text-amber-200 uppercase font-black tracking-wider leading-none">
                      {activeCompanyId === 'all' ? 'সম্মিলিত ভিউ' : (companies.find(c => c.id === activeCompanyId)?.isDefault || activeCompanyId === 'company-main' ? 'প্রধান শাখা' : 'ব্রাঞ্চ')}
                    </span>
                    <span className="text-xs font-black truncate block mt-0.5 leading-none">
                      {activeCompanyId === 'all' 
                        ? 'সকল কোম্পানি ও আগের ডেটা (All)' 
                        : (companies.find(c => c.id === activeCompanyId)?.name || 'REST BAZER')}
                    </span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-300 transition-transform duration-200 ${companyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {companyDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-[999] text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Building2 size={13} className="text-indigo-600" /> ব্রাঞ্চ / কোম্পানি নির্বাচন
                      </span>
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                        মোট {companies.length} টি
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                      {/* All Companies Option strictly for Master Owner */}
                      <button
                        onClick={() => {
                          if (onSelectCompany) onSelectCompany('all');
                          setCompanyDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100 ${activeCompanyId === 'all' ? 'bg-indigo-50/80 text-indigo-900 font-black' : ''}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                            <Globe size={15} />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900">সকল কোম্পানি / আগের সকল তথ্য (All Data)</div>
                            <div className="text-[10px] text-slate-500 font-medium">আগের সকল সেলস, স্টক ও সব ব্রাঞ্চের মোট হিসাব</div>
                          </div>
                        </div>
                        {activeCompanyId === 'all' && (
                          <Check size={16} className="text-indigo-600 font-black" />
                        )}
                      </button>

                      {/* Individual Companies */}
                      {companies.map(comp => {
                        const isSelected = activeCompanyId === comp.id;
                        return (
                          <button
                            key={comp.id}
                            onClick={() => {
                              if (onSelectCompany) onSelectCompany(comp.id);
                              setCompanyDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/80 text-indigo-900 font-black' : ''}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {comp.logoUrl ? (
                                <img 
                                  src={comp.logoUrl} 
                                  alt={comp.name} 
                                  className="w-8 h-8 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shrink-0" 
                                />
                              ) : (
                                <div 
                                  style={{ backgroundColor: comp.headerBgColor || '#1e1e5f' }}
                                  className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs"
                                >
                                  {comp.code?.slice(0, 2) || comp.name.slice(0, 1)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                                  {comp.name}
                                  {comp.isDefault && (
                                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">প্রধান</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1">
                                  <span className="font-mono text-indigo-600 font-bold">{comp.code || 'BR'}</span>
                                  {comp.address && <span>• {comp.address}</span>}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <Check size={16} className="text-indigo-600 font-black shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1 mt-1 border-t border-slate-100 px-2 space-y-1">
                      <button
                        onClick={() => {
                          setActivePage('companies');
                          setCompanyDropdownOpen(false);
                        }}
                        className="w-full py-2 px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Building2 size={14} /> কোম্পানি ও ব্রাঞ্চ পরিচালনা করুন
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Date & Time Widget in Header */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-xl border border-white/15 text-white transition-all shadow-xs shrink-0" title="আজকের তারিখ ও সময়">
              <Calendar size={14} className="text-amber-300 shrink-0" />
              <div className="text-left leading-tight">
                <div className="text-[11px] font-black text-amber-200 tracking-tight">
                  {formatDisplayDate(getLocalDateString(currentDateTime))}
                </div>
                <div className="text-[10px] font-bold text-white/80 flex items-center gap-1">
                  <Clock size={10} className="text-amber-300" />
                  <span>{formatDisplayTime(currentDateTime)}</span>
                </div>
              </div>
            </div>

            {onSwitchToShop && (
              <button 
                onClick={onSwitchToShop}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/20 shadow-xs active:scale-95"
              >
                <ShoppingBag size={16} className="text-amber-300" />
                <span className="hidden xs:block">অনলাইন শপ</span>
              </button>
            )}
            <div className="hidden sm:flex flex-col items-end">
              <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full mb-0.5 tracking-widest shadow-xs ${isAdmin ? 'bg-amber-400 text-slate-950 font-black' : 'bg-white/20 text-white'}`}>
                {(userRoleName || 'Salesman').toUpperCase()}
              </span>
              <span className="text-[11px] font-bold text-slate-300 max-w-[140px] truncate">{userEmail}</span>
            </div>
            <button onClick={onLogout} title="লগআউট" className="bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white p-2.5 rounded-xl transition-all border border-rose-500/30 active:scale-95">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Header Logo, Color & Text Customization Modal */}
      {showLogoModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[36px] border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div 
              style={previewInlineStyle}
              className={`bg-gradient-to-r ${previewGradient} p-6 text-white flex items-center justify-between transition-all`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
                  <Palette size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">হেডার কালার, লোগো ও ব্র্যান্ডিং সেটিং</h3>
                  <p className="text-[11px] text-amber-200/90 font-bold">হেডারের ব্যাকগ্রাউন্ড কালার, লোগো ও নাম কাস্টমাইজ করুন</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLogoModal(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveHeaderSettings} className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Live Preview Card */}
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  হেডারের লাইভ প্রিভিউ (Live Header Preview)
                </label>
                <div 
                  style={previewInlineStyle}
                  className={`bg-gradient-to-r ${previewGradient} p-4 rounded-2xl border border-white/20 flex items-center justify-between shadow-inner transition-all duration-300`}
                >
                  <div className="flex items-center gap-3">
                    {headerFormData.logoUrl ? (
                      <div className="h-10 max-w-[130px] bg-white/95 rounded-xl p-1 shadow-md border border-white/30 flex items-center justify-center shrink-0 overflow-hidden">
                        <img 
                          src={headerFormData.logoUrl} 
                          alt="Logo Preview" 
                          className="max-h-full w-auto max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 p-2 rounded-xl shadow-lg shadow-amber-500/20">
                        <Store size={20} strokeWidth={3} />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <h4 
                        style={{ color: headerFormData.headerTextColor || '#ffffff' }}
                        className="text-base font-black tracking-tight uppercase leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                      >
                        {headerFormData.headerTitle || 'REST BAZER'}
                      </h4>
                      {headerFormData.headerSubtitle && (
                        <span 
                          style={{ color: headerFormData.headerSubtitleColor || '#fcd34d' }}
                          className="text-[10px] font-bold tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                        >
                          {headerFormData.headerSubtitle}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-black bg-white/10 text-amber-300 px-2.5 py-1 rounded-lg border border-white/10">
                    হেডার বার
                  </span>
                </div>
              </div>

              {/* SECTION 1: HEADER COLOR THEMES */}
              <div className="space-y-3 pt-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palette size={14} className="text-indigo-600" />
                    ১. হেডারের ব্যাকগ্রাউন্ড কালার (Header Background Color)
                  </span>
                </label>

                {/* Preset Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {HEADER_COLOR_PRESETS.map((preset) => {
                    const isSelected = (headerFormData.headerBgColor || '#1e1e5f').toLowerCase() === preset.bg.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setHeaderFormData(prev => ({ ...prev, headerBgColor: preset.bg }))}
                        className={`flex items-center gap-2 p-2.5 rounded-2xl border text-left transition-all ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs' 
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div 
                          className="w-5 h-5 rounded-full shrink-0 shadow-xs border border-white/30"
                          style={{ backgroundColor: preset.bg }}
                        />
                        <span className={`text-[11px] font-black truncate ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>
                          {preset.label}
                        </span>
                        {isSelected && <Check size={12} className="text-indigo-600 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-3 pt-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <label className="text-[11px] font-black text-slate-600 whitespace-nowrap">
                    কাস্টম ব্যাকগ্রাউন্ড:
                  </label>
                  <input
                    type="color"
                    value={headerFormData.headerBgColor?.startsWith('#') ? headerFormData.headerBgColor : '#1e1e5f'}
                    onChange={(e) => setHeaderFormData(prev => ({ ...prev, headerBgColor: e.target.value }))}
                    className="w-9 h-9 rounded-xl cursor-pointer border border-slate-200 p-0.5 bg-white"
                    title="কালার নির্বাচন করুন"
                  />
                  <input
                    type="text"
                    value={headerFormData.headerBgColor || ''}
                    onChange={(e) => setHeaderFormData(prev => ({ ...prev, headerBgColor: e.target.value }))}
                    placeholder="#1e1e5f"
                    className="w-28 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 font-bold ml-auto hidden sm:inline">
                    হেক্স কোড লিখুন বা কালার বক্সে চাপুন
                  </span>
                </div>
              </div>

              {/* SECTION 2: HEADER FONT COLORS */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Type size={14} className="text-amber-500" />
                    ২. হেডার ফন্ট ও টেক্সট কালার (Header Font & Text Colors)
                  </label>
                  <button
                    type="button"
                    onClick={() => setHeaderFormData(prev => ({ ...prev, headerTextColor: '#ffffff', headerSubtitleColor: '#fcd34d' }))}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    ডিফল্ট ফন্ট কালার
                  </button>
                </div>

                {/* Main Title Font Color */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      মূল নামের ফন্ট কালার (Title Font Color)
                    </label>
                    <span 
                      className="text-xs font-black font-mono px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs"
                      style={{ backgroundColor: headerFormData.headerTextColor || '#ffffff', color: (headerFormData.headerTextColor === '#ffffff' || headerFormData.headerTextColor === '#fde047' || headerFormData.headerTextColor === '#67e8f9' || headerFormData.headerTextColor === '#86efac' || headerFormData.headerTextColor === '#fbcfe8' || headerFormData.headerTextColor === '#fed7aa' || headerFormData.headerTextColor === '#f1f5f9') ? '#0f172a' : '#ffffff' }}
                    >
                      {headerFormData.headerTextColor || '#ffffff'}
                    </span>
                  </div>

                  {/* Text Color Presets */}
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {HEADER_TEXT_COLOR_PRESETS.map((preset) => {
                      const isSelected = (headerFormData.headerTextColor || '#ffffff').toLowerCase() === preset.color.toLowerCase();
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setHeaderFormData(prev => ({ ...prev, headerTextColor: preset.color }))}
                          title={preset.label}
                          className={`h-8 rounded-xl flex items-center justify-center border transition-all ${
                            isSelected 
                              ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105 border-indigo-600 shadow-xs' 
                              : 'border-slate-300 hover:scale-102 hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: preset.color }}
                        >
                          {isSelected && (
                            <Check 
                              size={14} 
                              className={preset.color === '#ffffff' || preset.color === '#fde047' || preset.color === '#67e8f9' || preset.color === '#86efac' || preset.color === '#fbcfe8' || preset.color === '#fed7aa' || preset.color === '#f1f5f9' ? 'text-slate-900' : 'text-white'} 
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Title Custom Color Picker */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      কাস্টম ফন্ট কালার:
                    </label>
                    <input
                      type="color"
                      value={headerFormData.headerTextColor?.startsWith('#') ? headerFormData.headerTextColor : '#ffffff'}
                      onChange={(e) => setHeaderFormData(prev => ({ ...prev, headerTextColor: e.target.value }))}
                      className="w-8 h-8 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                      title="টাইটেলের ফন্ট কালার বাছুন"
                    />
                    <input
                      type="text"
                      value={headerFormData.headerTextColor || ''}
                      onChange={(e) => setHeaderFormData(prev => ({ ...prev, headerTextColor: e.target.value }))}
                      placeholder="#ffffff"
                      className="w-24 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 font-bold ml-auto hidden xs:inline">
                      টাইটেল কালার
                    </span>
                  </div>
                </div>

                {/* Subtitle Font Color */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      সাবটাইটেল / স্লোগানের ফন্ট কালার (Subtitle Font Color)
                    </label>
                    <span 
                      className="text-xs font-black font-mono px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs"
                      style={{ backgroundColor: headerFormData.headerSubtitleColor || '#fcd34d', color: (headerFormData.headerSubtitleColor === '#ffffff' || headerFormData.headerSubtitleColor === '#f8fafc' || headerFormData.headerSubtitleColor === '#fcd34d' || headerFormData.headerSubtitleColor === '#93c5fd' || headerFormData.headerSubtitleColor === '#a7f3d0' || headerFormData.headerSubtitleColor === '#cbd5e1' || headerFormData.headerSubtitleColor === '#f472b6' || headerFormData.headerSubtitleColor === '#fed7aa') ? '#0f172a' : '#ffffff' }}
                    >
                      {headerFormData.headerSubtitleColor || '#fcd34d'}
                    </span>
                  </div>

                  {/* Subtitle Color Presets */}
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {HEADER_SUBTITLE_COLOR_PRESETS.map((preset) => {
                      const isSelected = (headerFormData.headerSubtitleColor || '#fcd34d').toLowerCase() === preset.color.toLowerCase();
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setHeaderFormData(prev => ({ ...prev, headerSubtitleColor: preset.color }))}
                          title={preset.label}
                          className={`h-8 rounded-xl flex items-center justify-center border transition-all ${
                            isSelected 
                              ? 'ring-2 ring-amber-500 ring-offset-1 scale-105 border-amber-600 shadow-xs' 
                              : 'border-slate-300 hover:scale-102 hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: preset.color }}
                        >
                          {isSelected && (
                            <Check 
                              size={14} 
                              className={preset.color === '#ffffff' || preset.color === '#f8fafc' || preset.color === '#fcd34d' || preset.color === '#93c5fd' || preset.color === '#a7f3d0' || preset.color === '#cbd5e1' || preset.color === '#f472b6' || preset.color === '#fed7aa' ? 'text-slate-900' : 'text-white'} 
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Subtitle Custom Color Picker */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      কাস্টম সাবটাইটেল কালার:
                    </label>
                    <input
                      type="color"
                      value={headerFormData.headerSubtitleColor?.startsWith('#') ? headerFormData.headerSubtitleColor : '#fcd34d'}
                      onChange={(e) => setHeaderFormData(prev => ({ ...prev, headerSubtitleColor: e.target.value }))}
                      className="w-8 h-8 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                      title="সাবটাইটেলের ফন্ট কালার বাছুন"
                    />
                    <input
                      type="text"
                      value={headerFormData.headerSubtitleColor || ''}
                      onChange={(e) => setHeaderFormData(prev => ({ ...prev, headerSubtitleColor: e.target.value }))}
                      placeholder="#fcd34d"
                      className="w-24 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-slate-800 outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 font-bold ml-auto hidden xs:inline">
                      সাবটাইটেল কালার
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Logo Upload */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>৩. লোগো আপলোড (Logo Upload)</span>
                  {headerFormData.logoUrl && (
                    <button 
                      type="button" 
                      onClick={() => setHeaderFormData(prev => ({ ...prev, logoUrl: '' }))}
                      className="text-rose-500 hover:text-rose-700 text-[11px] font-black flex items-center gap-1 normal-case"
                    >
                      <Trash2 size={12} /> লোগো সরান
                    </button>
                  )}
                </label>

                {/* Drag and Drop / File Input Box */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    headerFormData.logoUrl 
                      ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50' 
                      : 'border-slate-300 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-400'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />

                  {isUploading ? (
                    <div className="py-3 flex flex-col items-center gap-2 text-indigo-600">
                      <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-black">লোগো প্রসেস হচ্ছে...</span>
                    </div>
                  ) : headerFormData.logoUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-14 max-w-[180px] p-2 bg-white rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-center overflow-hidden">
                        <img src={headerFormData.logoUrl} alt="Logo" className="max-h-full w-auto object-contain" />
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-black">
                        <Check size={14} /> লোগো যুক্ত আছে (পরিবর্তন করতে ক্লিক করুন)
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                        <Upload size={22} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">ক্লিক করে আপনার লোগো আপলোড করুন</p>
                        <p className="text-[10px] font-bold text-slate-400">PNG, JPG, WebP বা SVG ফরম্যাট</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: Header Text Inputs */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  ৪. লোগোর পাশের লেখা (Header Text & Subtitle)
                </label>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Edit3 size={12} className="text-indigo-600" />
                    প্রধান নাম / টাইটেল (Header Title)
                  </label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase"
                    placeholder="যেমন: RB SHAD FOOD PRODUCT LTD বা REST BAZER"
                    value={headerFormData.headerTitle}
                    onChange={(e) => setHeaderFormData(prev => ({ ...prev, headerTitle: e.target.value, name: e.target.value }))}
                  />
                  <p className="text-[10px] text-slate-400 font-bold">লোগোর পাশে বড় অক্ষরে প্রদর্শিত হবে</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Edit3 size={12} className="text-amber-500" />
                    সাবটাইটেল বা স্লোগান (Subtitle / Tagline) - ঐচ্ছিক
                  </label>
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="যেমন: Food & Agro Industries বা ERP Solutions"
                    value={headerFormData.headerSubtitle}
                    onChange={(e) => setHeaderFormData(prev => ({ ...prev, headerSubtitle: e.target.value }))}
                  />
                  <p className="text-[10px] text-slate-400 font-bold">লোগোর নিচে বা নামের নিচে স্লোগান হিসেবে প্রদর্শিত হবে</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowLogoModal(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-all"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="px-7 py-3 rounded-2xl bg-gradient-to-r from-[#1e1e5f] to-indigo-600 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
                  id="btn-save-header-branding"
                >
                  <Save size={16} /> সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`bg-white shadow-2xl w-64 flex-shrink-0 z-[60] transition-all duration-300 fixed lg:static h-full print:hidden border-r border-slate-100 ${mobileMenuOpen ? 'left-0' : '-left-64 lg:left-0'}`}>
          <nav className="p-4 space-y-1.5 overflow-y-auto h-full pb-24 lg:pb-8 custom-scrollbar">
            {/* Live Date & Time Card in Sidebar Navigation */}
            <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100/80 rounded-2xl p-3 mb-2 flex items-center gap-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center shrink-0">
                <Calendar size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black text-slate-800 leading-tight truncate">
                  {formatDisplayDate(getLocalDateString(currentDateTime))}
                </div>
                <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                  <Clock size={11} className="text-indigo-600" />
                  <span>{formatDisplayTime(currentDateTime)}</span>
                </div>
              </div>
            </div>

            <div className="px-3 py-2 mb-1 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">মেনু ও ফিচারসমূহ</p>
              {isAdmin && <ShieldCheck size={14} className="text-emerald-600" />}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              const hasAlert = (item.id === 'dashboard' || item.id === 'products') && lowStockCount > 0;
              return (
                <button 
                  key={item.id} 
                  onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); }} 
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all group active:scale-[0.98] ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#1e1e5f] to-[#2e2e88] text-white shadow-lg shadow-indigo-900/25 translate-x-1' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : `${item.bg} ${item.color} group-hover:scale-105`
                    }`}>
                      <Icon size={18} strokeWidth={isActive ? 3 : 2.5} />
                    </div>
                    <span className="tracking-tight text-[13px]">{item.label}</span>
                  </div>
                  {hasAlert && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm ${isActive ? 'bg-rose-500 text-white' : 'bg-rose-600 text-white animate-pulse'}`}>
                      {lowStockCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {mobileMenuOpen && <div className="fixed inset-0 bg-primary/60 backdrop-blur-md z-[55] lg:hidden" onClick={() => setMobileMenuOpen(false)} />}

        <main className="flex-1 overflow-y-auto bg-slate-50 relative pb-24 lg:pb-0 scroll-smooth custom-scrollbar">
          <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
            {activeCompanyId && activeCompanyId !== 'all' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm">
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                        ব্রাঞ্চ ফিল্টার চালু আছে
                      </span>
                      <span className="font-black text-amber-300 text-sm truncate">
                        {companies.find(c => c.id === activeCompanyId)?.name || 'নির্দিষ্ট ব্রাঞ্চ'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                      বর্তমানে শুধুমাত্র এই নির্দিষ্ট ব্রাঞ্চের ডেটা দেখাচ্ছে। পূর্বের সকল সেলস, স্টক ও সব তথ্য দেখতে পাশের বাটনে চাপুন।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCompany && onSelectCompany('all')}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 shrink-0 active:scale-95"
                >
                  <Globe size={15} />
                  <span>আগের সব তথ্য ও সব ব্রাঞ্চের ডেটা দেখুন (All Data)</span>
                </button>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-300 z-[45] px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex justify-around items-center shadow-[0_-10px_30px_rgba(0,0,0,0.15)] pr-2 print:hidden">
        {footerItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          const hasAlert = (item.id === 'dashboard' || item.id === 'products') && lowStockCount > 0;
          return (
            <button key={item.id} onClick={() => setActivePage(item.id)} className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all active:scale-110 relative ${isActive ? 'text-primary' : 'text-slate-600'}`}>
              <div className={`${isActive ? 'bg-primary/10 p-2.5 rounded-2xl' : 'p-2.5'}`}>
                <Icon size={22} strokeWidth={isActive ? 3 : 2.5} />
              </div>
              <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-primary font-black' : 'text-slate-700 font-bold'}`}>{item.label}</span>
              {hasAlert && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[8px] font-black flex items-center justify-center animate-pulse">
                  {lowStockCount}
                </span>
              )}
            </button>
          );
        })}
      </footer>
    </div>
  );
};

export default Layout;
