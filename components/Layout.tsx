
import React from 'react';
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
  ShoppingBag
} from 'lucide-react';
import { AppRole } from '../types';

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
  onSwitchToShop
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Find permissions for current user role
  const currentUserRole = roles.find(r => r.name.trim().toLowerCase() === userRoleName.trim().toLowerCase());
  const permissions = currentUserRole ? currentUserRole.permissions : [];

  const canAccess = (itemId: string) => {
    // Owners and Admins always have full access
    if (isAdmin || userRoleName === 'Owner' || userRoleName === 'Admin') return true;
    
    // For others, check defined permissions
    return permissions.includes(itemId);
  };

  const navItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'sales', label: 'বিক্রয়/POS', icon: ShoppingCart },
    { id: 'approvals', label: 'অনুমোদন', icon: ClipboardCheck },
    { id: 'products', label: 'ইনভেন্টরি', icon: Package },
    { id: 'customers', label: 'কাস্টমার', icon: Users },
    { id: 'suppliers', label: 'সাপ্লায়ার', icon: Truck },
    { id: 'returns', label: 'রিটার্ন', icon: RotateCcw },
    { id: 'employees', label: 'স্টাফ/HR', icon: UserCog },
    { id: 'payroll', label: 'পেরোল', icon: Banknote },
    { id: 'expenses', label: 'খরচ (Expenses)', icon: TrendingDown },
    { id: 'due', label: 'বকেয়া তালিকা', icon: FileText },
    { id: 'reports', label: 'রিপোর্ট', icon: FileBarChart },
    { id: 'settings', label: 'সেটিংস', icon: SettingsIcon },
  ].filter(item => canAccess(item.id));

  // Filtered footer items for mobile
  const footerItems = [
    { id: 'dashboard', label: 'হোম', icon: LayoutDashboard },
    { id: 'sales', label: 'POS', icon: ShoppingCart },
    { id: 'products', label: 'স্টক', icon: Package },
    { id: 'customers', label: 'CRM', icon: Users },
    { id: 'reports', label: 'রিপোর্ট', icon: FileBarChart },
  ].filter(item => canAccess(item.id));

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col font-sans overflow-hidden">
      <header className="bg-primary text-white shadow-xl z-50 shrink-0 print:hidden">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2.5 hover:bg-white/10 rounded-xl" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActivePage('dashboard')}>
              <div className="bg-white text-primary p-1.5 rounded-xl shadow-lg hidden xs:block">
                <Store size={22} strokeWidth={3} />
              </div>
              <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase whitespace-nowrap">REST BAZER</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onSwitchToShop && (
              <button 
                onClick={onSwitchToShop}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/20"
              >
                <ShoppingBag size={18} />
                <span className="hidden xs:block">দোকান</span>
              </button>
            )}
            <div className="hidden sm:flex flex-col items-end">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md mb-0.5 tracking-widest border border-white/20 ${isAdmin ? 'bg-amber-400 text-primary' : 'bg-white/10 text-white'}`}>
                {userRoleName.toUpperCase()}
              </span>
              <span className="text-[10px] font-bold opacity-80 max-w-[120px] truncate">{userEmail}</span>
            </div>
            <button onClick={onLogout} className="bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white p-2.5 rounded-xl transition-all border border-rose-500/20 active:scale-95">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`bg-white shadow-2xl w-64 flex-shrink-0 z-[60] transition-all duration-300 fixed lg:static h-full print:hidden ${mobileMenuOpen ? 'left-0' : '-left-64 lg:left-0'}`}>
          <nav className="p-5 space-y-1.5 overflow-y-auto h-full pb-24 lg:pb-8 custom-scrollbar">
            <div className="px-4 py-3 mb-2 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">প্রধান নেভিগেশন</p>
              {isAdmin && <ShieldCheck size={14} className="text-primary/30" />}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button 
                  key={item.id} 
                  onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all active:scale-[0.98] ${isActive ? 'bg-primary text-white shadow-xl shadow-primary/20 translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-primary'}`}
                >
                  <Icon size={20} strokeWidth={isActive ? 3 : 2} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {mobileMenuOpen && <div className="fixed inset-0 bg-primary/60 backdrop-blur-md z-[55] lg:hidden" onClick={() => setMobileMenuOpen(false)} />}

        <main className="flex-1 overflow-y-auto bg-slate-50 relative pb-24 lg:pb-0 scroll-smooth custom-scrollbar">
          <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>

      <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[45] px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex justify-around items-center shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pr-2 print:hidden">
        {footerItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button key={item.id} onClick={() => setActivePage(item.id)} className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all active:scale-110 ${isActive ? 'text-primary' : 'text-slate-400'}`}>
              <div className={`${isActive ? 'bg-primary/10 p-2.5 rounded-2xl' : 'p-2.5'}`}><Icon size={22} strokeWidth={isActive ? 3 : 2} /></div>
              <span className={`text-[10px] font-black uppercase tracking-tight ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
            </button>
          );
        })}
      </footer>
    </div>
  );
};

export default Layout;
