import React, { useState, useRef } from 'react';
import { CompanyBranch, Product, Sale, Staff } from '../types';
import { 
  Building2, Plus, Edit, Trash2, Check, CheckCircle2, 
  MapPin, Phone, Mail, Globe, Shield, Star, RefreshCw, 
  Search, ArrowRight, Sparkles, Upload, Image as ImageIcon,
  Palette, Tag, AlertTriangle, Eye, Layers, DollarSign,
  Download, BarChart3, Users, Package, ShoppingCart, Lock,
  Copy, UserCheck, KeyRound, ExternalLink, ShieldCheck,
  Share2, QrCode, MessageSquare, Send, Smartphone, Laptop, Link as LinkIcon
} from 'lucide-react';
import { HEADER_COLOR_PRESETS } from './Layout';
import { db } from '../services/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface CompanyManagementProps {
  companies: CompanyBranch[];
  activeCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  onSaveCompany: (company: CompanyBranch) => Promise<void> | void;
  onDeleteCompany: (companyId: string) => Promise<void> | void;
  onSetDefaultCompany?: (companyId: string) => Promise<void> | void;
  onSetDefault?: (companyId: string) => Promise<void> | void;
  products?: Product[];
  sales?: Sale[];
  staff?: Staff[];
  isAdmin?: boolean;
}

export const CompanyManagement: React.FC<CompanyManagementProps> = ({
  companies = [],
  activeCompanyId,
  onSelectCompany,
  onSaveCompany,
  onDeleteCompany,
  onSetDefaultCompany,
  onSetDefault,
  products = [],
  sales = [],
  staff = [],
  isAdmin = true
}) => {
  const setDefaultHandler = onSetDefaultCompany || onSetDefault || (() => {});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyBranch | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareModalCompany, setShareModalCompany] = useState<CompanyBranch | null>(null);
  const [linkCopiedType, setLinkCopiedType] = useState<'admin' | 'shop' | 'all' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copiedRegisterUrl, setCopiedRegisterUrl] = useState(false);
  const companyRegisterUrl = `${window.location.origin}${window.location.pathname}?mode=register_company`;

  const handleCopyRegisterUrl = () => {
    navigator.clipboard.writeText(companyRegisterUrl);
    setCopiedRegisterUrl(true);
    setTimeout(() => setCopiedRegisterUrl(false), 2500);
  };

  // URL generators for company direct access
  const getCompanyAdminLoginUrl = (comp: CompanyBranch) => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}?company=${encodeURIComponent(comp.id)}&mode=admin`;
  };

  const getCompanyShopUrl = (comp: CompanyBranch) => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}?company=${encodeURIComponent(comp.id)}&mode=shop`;
  };

  // Form State
  const [formData, setFormData] = useState<Partial<CompanyBranch> & { adminPassword?: string }>({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    currency: '৳',
    logoUrl: '',
    headerTitle: '',
    headerSubtitle: '',
    headerBgColor: '#1e1e5f',
    headerTextColor: '#ffffff',
    headerSubtitleColor: '#fcd34d',
    tagline: '',
    invoicePrefix: '',
    status: 'active',
    isDefault: false,
    notes: '',
    adminEmail: '',
    adminName: '',
    adminPhone: '',
    adminPassword: ''
  });

  // Image compressor & converter to Base64
  const resizeImage = (file: File, maxWidth = 800, maxHeight = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (PNG, JPG, WEBP) আপলোড করুন।');
      return;
    }

    try {
      setIsUploading(true);
      const base64 = await resizeImage(file, 600, 300);
      setFormData(prev => ({ ...prev, logoUrl: base64 }));
    } catch (err) {
      console.error('Error compressing image:', err);
      alert('ছবি আপলোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCompany(null);
    const nextNum = companies.length + 1;
    setFormData({
      name: '',
      code: `CMP-0${nextNum}`,
      phone: '',
      email: '',
      address: '',
      currency: '৳',
      logoUrl: '',
      headerTitle: '',
      headerSubtitle: '',
      headerBgColor: '#1e1e5f',
      headerTextColor: '#ffffff',
      headerSubtitleColor: '#fcd34d',
      tagline: 'স্মার্ট ইনভেন্টরি ও রিটেইল সেলস',
      invoicePrefix: `INV-C${nextNum}-`,
      status: 'active',
      isDefault: companies.length === 0,
      notes: '',
      adminEmail: '',
      adminName: '',
      adminPhone: '',
      adminPassword: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (comp: CompanyBranch) => {
    setEditingCompany(comp);
    setFormData({
      ...comp,
      adminPassword: ''
    });
    setShowModal(true);
  };

  const copyCredentials = (comp: CompanyBranch) => {
    const emailToUse = comp.adminEmail || comp.email || 'info@company.com';
    const textToCopy = `🏢 কোম্পানি: ${comp.name}\n🔖 ব্রাঞ্চ কোড: ${comp.code || 'N/A'}\n👤 এডমিন: ${comp.adminName || 'Admin'}\n📧 লগইন ইমেইল: ${emailToUse}\n📍 ঠিকানা: ${comp.address || 'N/A'}\n\nসরাসরি লগইন করে এই কোম্পানির ডেটা পরিচালনা করুন।`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(comp.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('কোম্পানির নাম অবশ্যই পূরণ করতে হবে!');
      return;
    }

    try {
      setIsSaving(true);
      const now = new Date().toISOString();
      const companyId = editingCompany ? editingCompany.id : `comp-${Date.now()}`;
      
      const compToSave: CompanyBranch = {
        id: companyId,
        name: formData.name.trim(),
        code: formData.code?.trim() || `CMP-${Math.floor(10 + Math.random() * 90)}`,
        phone: formData.phone || '',
        email: formData.email || '',
        address: formData.address || '',
        currency: formData.currency || '৳',
        logoUrl: formData.logoUrl || '',
        headerTitle: formData.headerTitle || formData.name,
        headerSubtitle: formData.headerSubtitle || '',
        headerBgColor: formData.headerBgColor || '#1e1e5f',
        headerTextColor: formData.headerTextColor || '#ffffff',
        headerSubtitleColor: formData.headerSubtitleColor || '#fcd34d',
        tagline: formData.tagline || '',
        invoicePrefix: formData.invoicePrefix || '',
        status: (formData.status as any) || 'active',
        isDefault: !!formData.isDefault,
        notes: formData.notes || '',
        adminEmail: formData.adminEmail?.trim() || formData.email?.trim() || '',
        adminName: formData.adminName?.trim() || '',
        adminPhone: formData.adminPhone?.trim() || formData.phone?.trim() || '',
        createdAt: editingCompany?.createdAt || now,
        updatedAt: now
      };

      await onSaveCompany(compToSave);

      // If admin email is provided, ensure a Staff document is synced for this company
      const adminEmail = compToSave.adminEmail?.toLowerCase();
      if (adminEmail && db) {
        try {
          const q = query(collection(db, 'staff'), where('email', '==', adminEmail));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            // Update existing staff with companyId and Admin role
            const existingDoc = querySnap.docs[0];
            await setDoc(doc(db, 'staff', existingDoc.id), {
              ...existingDoc.data(),
              companyId: companyId,
              companyName: compToSave.name,
              designation: 'Admin',
              isApproved: true,
              status: 'active'
            }, { merge: true });
          } else {
            // Create a pending or pre-approved staff profile for this admin email
            const newStaffDocId = `STAFF-${Date.now()}`;
            await setDoc(doc(db, 'staff', newStaffDocId), {
              id: newStaffDocId,
              name: compToSave.adminName || `${compToSave.name} Admin`,
              email: adminEmail,
              phone: compToSave.adminPhone || '',
              designation: 'Admin',
              roleId: 'admin',
              companyId: companyId,
              companyName: compToSave.name,
              status: 'active',
              isApproved: true,
              joinedDate: now
            });
          }
        } catch (staffSyncErr) {
          console.warn("Could not auto-sync staff for company admin:", staffSyncErr);
        }
      }

      setShowModal(false);
    } catch (err: any) {
      console.error('Error saving company:', err);
      alert('কোম্পানি সংরক্ষণ করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (companies.length <= 1) {
      alert('কমপক্ষে একটি প্রধান কোম্পানি থাকতে হবে! এটি মুছে ফেলা সম্ভব নয়।');
      return;
    }
    try {
      await onDeleteCompany(id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert('কোম্পানি মুছে ফেলতে সমস্যা হয়েছে: ' + err.message);
    }
  };

  // Filtered companies
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.adminEmail && c.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      filterStatus === 'all' ? true : c.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate live branch stats
  const getCompanyStats = (companyId: string) => {
    const isMainOrMatches = (itemCompId?: string) => {
      const defaultComp = companies.find(c => c.isDefault) || companies.find(c => c.id === 'company-main') || companies[0];
      const isMainComp = companyId === 'company-main' || (defaultComp && companyId === defaultComp.id);

      if (!itemCompId) {
        return isMainComp;
      }
      if (itemCompId === companyId) return true;
      if (isMainComp && (itemCompId === 'company-main' || itemCompId === defaultComp?.id)) {
        return true;
      }
      return false;
    };

    const compProducts = products.filter(p => isMainOrMatches(p.companyId));
    const compSales = sales.filter(s => isMainOrMatches(s.companyId));
    const compStaff = staff.filter(st => isMainOrMatches(st.companyId));
    const totalSalesAmount = compSales.reduce((sum, s) => sum + (s.total || 0), 0);

    return {
      productsCount: compProducts.length,
      salesCount: compSales.length,
      staffCount: compStaff.length,
      totalSalesAmount
    };
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-500/30">
              <Building2 size={13} /> Multi-Company & Branch Management
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              কোম্পানি, ব্রাঞ্চ ও লগইন একাউন্ট ব্যবস্থাপনা
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              প্রতিটি কোম্পানির জন্য আলাদা ডেটাবেস, ইনভেন্টরি, কর্মচারী ও নিজস্ব এডমিন লগইন তৈরি করুন। নতুন কোম্পানি সরাসরি লগইন করে কেবল তাদের ব্রাঞ্চ পরিচালনা করতে পারবে।
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={companyRegisterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-wider border border-white/20 flex items-center gap-1.5 transition-all shadow-md"
                title="নতুন কোম্পানি সাইন আপ পোর্টাল ব্রাউজারের নতুন ট্যাবে খুলুন"
              >
                <ExternalLink size={15} className="text-amber-400" />
                <span>নতুন ট্যাব সাইন-আপ ↗</span>
              </a>

              <button
                type="button"
                onClick={handleCopyRegisterUrl}
                className="px-3.5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-wider border border-white/20 flex items-center gap-1.5 transition-all"
                title="নতুন কোম্পানি সাইন আপ লিংক কপি করুন"
              >
                {copiedRegisterUrl ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                <span>{copiedRegisterUrl ? 'কপি হয়েছে' : 'লিংক'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-400/20 flex items-center gap-2 active:scale-95 transition-all"
                id="btn-add-company"
              >
                <Plus size={16} strokeWidth={3} />
                নতুন কোম্পানি / ব্রাঞ্চ তৈরি করুন
              </button>
            </div>
          )}
        </div>

        {/* Global Summary Ribbon */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">মোট কোম্পানি / ব্রাঞ্চ</span>
            <span className="text-xl font-black text-white mt-0.5 block">{companies.length} টি</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">সক্রিয় ব্রাঞ্চ</span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">
              {companies.filter(c => c.status === 'active').length} টি
            </span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">বর্তমান সক্রিয় ভিউ</span>
            <span className="text-xs font-black text-amber-300 truncate block mt-1" title={activeCompanyId === 'all' ? 'সকল কোম্পানি' : companies.find(c => c.id === activeCompanyId)?.name}>
              {activeCompanyId === 'all' ? '🌐 সকল কোম্পানি (Combined)' : companies.find(c => c.id === activeCompanyId)?.name || 'ডিফল্ট'}
            </span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">ডেটা সিকিউরিটি</span>
            <span className="text-xs font-black text-indigo-300 flex items-center gap-1 mt-1">
              <ShieldCheck size={14} className="text-indigo-400" /> কোম্পানি ভিত্তিক আইসোলেটেড
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="কোম্পানির নাম, কোড, ইমেইল বা ঠিকানা দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              সব ({companies.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'active' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              সক্রিয় ({companies.filter(c => c.status === 'active').length})
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'inactive' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              নিষ্ক্রিয় ({companies.filter(c => c.status === 'inactive').length})
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => onSelectCompany('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all ${activeCompanyId === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
              title="সকল ব্রাঞ্চের সম্মিলিত ডেটা দেখুন"
            >
              <Globe size={14} />
              সম্মিলিত ভিউ (All)
            </button>
          )}
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredCompanies.map(comp => {
          const isActive = activeCompanyId === comp.id;
          const stats = getCompanyStats(comp.id);
          const adminEmail = comp.adminEmail || comp.email;

          return (
            <div 
              key={comp.id}
              className={`bg-white rounded-3xl border-2 transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl ${isActive ? 'border-indigo-600 ring-4 ring-indigo-500/10' : 'border-slate-200/80 hover:border-slate-300'}`}
            >
              {/* Card Top Strip with Header Background */}
              <div 
                style={{ backgroundColor: comp.headerBgColor || '#1e1e5f' }}
                className="p-5 text-white relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    {comp.logoUrl ? (
                      <div className="w-12 h-12 bg-white rounded-2xl p-1 shadow-md border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={comp.logoUrl} alt={comp.name} className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center font-black text-lg shadow-md shrink-0">
                        <Building2 size={24} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base uppercase tracking-tight leading-snug drop-shadow-sm">
                          {comp.name}
                        </h3>
                        {comp.isDefault && (
                          <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                            ডিফল্ট
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-200 font-bold tracking-wide flex items-center gap-1.5 mt-0.5">
                        <Tag size={11} /> কোড: <span className="font-mono bg-white/20 px-1.5 py-0.2 rounded">{comp.code || 'N/A'}</span>
                        {comp.currency && <span className="text-white/80">({comp.currency})</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${comp.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {comp.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                        <CheckCircle2 size={10} /> বর্তমান
                      </span>
                    )}
                  </div>
                </div>

                {comp.tagline && (
                  <p className="text-[11px] text-slate-200/90 font-medium mt-3 italic truncate">
                    "{comp.tagline}"
                  </p>
                )}
              </div>

              {/* Card Body Information */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                {/* Contact & Location Details */}
                <div className="space-y-2 text-xs text-slate-600">
                  {comp.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="font-medium text-slate-700 leading-tight">{comp.address}</span>
                    </div>
                  )}
                  {comp.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-800">{comp.phone}</span>
                    </div>
                  )}
                  {comp.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-600">{comp.email}</span>
                    </div>
                  )}
                </div>

                {/* Company Admin & Login Info Box */}
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                      <KeyRound size={12} className="text-indigo-600" /> কোম্পানি লগইন অ্যাকাউন্ট
                    </span>
                    <button
                      onClick={() => copyCredentials(comp)}
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shadow-xs active:scale-95 transition-all"
                      title="লগইন তথ্য কপি করুন"
                    >
                      {copiedId === comp.id ? (
                        <>
                          <Check size={11} className="text-emerald-600" />
                          <span className="text-emerald-700">কপি হয়েছে!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>কপি করুন</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">এডমিন/ম্যানেজার:</span>
                      <span className="font-bold text-slate-900">{comp.adminName || 'এডমিন সেট করা হয়নি'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">লগইন ইমেইল:</span>
                      <span className="font-mono font-bold text-indigo-700 text-[11px] truncate max-w-[170px]">{adminEmail || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Branch Live Metrics */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">প্রোডাক্ট</span>
                    <span className="text-xs font-black text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                      <Package size={11} className="text-blue-500" />
                      {stats.productsCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">বিক্রয়</span>
                    <span className="text-xs font-black text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                      <ShoppingCart size={11} className="text-emerald-500" />
                      {stats.salesCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">কর্মচারী</span>
                    <span className="text-xs font-black text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                      <Users size={11} className="text-cyan-500" />
                      {stats.staffCount}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectCompany(comp.id)}
                      disabled={isActive}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95'}`}
                      id={`btn-select-company-${comp.id}`}
                    >
                      {isActive ? (
                        <>
                          <Check size={14} strokeWidth={3} /> বর্তমানে নির্বাচিত
                        </>
                      ) : (
                        <>
                          <ArrowRight size={14} /> এই ব্রাঞ্চে সুইচ করুন
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShareModalCompany(comp)}
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors border border-emerald-200/60"
                      title="কোম্পানির লগইন লিংক ও শেয়ার করুন"
                      id={`btn-share-company-${comp.id}`}
                    >
                      <Share2 size={16} />
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleOpenEditModal(comp)}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                        title="কোম্পানি তথ্য পরিবর্তন করুন"
                        id={`btn-edit-company-${comp.id}`}
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>

                  {/* Share Quick Link Button */}
                  <button
                    onClick={() => setShareModalCompany(comp)}
                    className="w-full py-2 px-3 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LinkIcon size={13} className="text-emerald-600" />
                    <span>সরাসরি লগইন ও শপ লিংক শেয়ার করুন</span>
                  </button>

                  {isAdmin && (
                    <div className="flex items-center justify-between pt-1">
                      {!comp.isDefault ? (
                        <button
                          onClick={() => setDefaultHandler(comp.id)}
                          className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline"
                        >
                          <Star size={12} /> ডিফল্ট হিসেবে সেট করুন
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <Star size={12} className="text-amber-500 fill-amber-500" /> প্রধান ডিফল্ট ব্রাঞ্চ
                        </span>
                      )}

                      {companies.length > 1 && !comp.isDefault && (
                        deleteConfirmId === comp.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-rose-600">নিশ্চিত?</span>
                            <button
                              onClick={() => handleDelete(comp.id)}
                              className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-md hover:bg-rose-700"
                            >
                              হ্যাঁ
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md"
                            >
                              না
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(comp.id)}
                            className="text-[11px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 hover:underline"
                          >
                            <Trash2 size={12} /> মুছে ফেলুন
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
            <Building2 size={32} />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-800">কোনো কোম্পানি বা ব্রাঞ্চ পাওয়া যায়নি</h4>
            <p className="text-xs text-slate-500 font-medium mt-1">অনুসন্ধান ফিল্টার পরিবর্তন করুন অথবা নতুন কোম্পানি তৈরি করুন।</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2"
            >
              <Plus size={15} /> নতুন ব্রাঞ্চ যোগ করুন
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[36px] border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div 
              style={{ backgroundColor: formData.headerBgColor || '#1e1e5f' }}
              className="p-6 text-white flex items-center justify-between transition-colors shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    {editingCompany ? 'কোম্পানি / ব্রাঞ্চ তথ্য ও লগইন সেটিংস' : 'নতুন কোম্পানি / ব্রাঞ্চ তৈরি'}
                  </h3>
                  <p className="text-[11px] text-amber-200/90 font-bold">
                    কোম্পানির নাম, এডমিন লগইন ইমেইল, ব্র্যান্ডিং ও ইনভয়েস সেটিংস নির্ধারণ করুন
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              {/* Basic Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5 border-b border-indigo-100 pb-1.5">
                  <Building2 size={14} /> সাধারণ ও যোগাযোগের তথ্য
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">কোম্পানির নাম *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="যেমন: REST BAZER (উত্তরা ব্রাঞ্চ)"
                      value={formData.name || ''}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value, headerTitle: prev.headerTitle || e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">ব্রাঞ্চ কোড (Branch Code) *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="যেমন: HQ-01, UTT-02"
                      value={formData.code || ''}
                      onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">মোবাইল / হেল্পলাইন নম্বর</label>
                    <input 
                      type="text" 
                      placeholder="যেমন: 017XXXXXXXX"
                      value={formData.phone || ''}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">কোম্পানির অফিশিয়াল ইমেইল</label>
                    <input 
                      type="email" 
                      placeholder="info@yourcompany.com"
                      value={formData.email || ''}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value, adminEmail: prev.adminEmail || e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">ঠিকানা ও লোকেশন</label>
                    <input 
                      type="text" 
                      placeholder="যেমন: সেক্টর ৩, উত্তরা, ঢাকা"
                      value={formData.address || ''}
                      onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">কারেন্সি সিম্বল (Currency)</label>
                    <input 
                      type="text" 
                      placeholder="৳, $, ₹ ইত্যাদি"
                      value={formData.currency || '৳'}
                      onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">ইনভয়েস প্রিফিক্স (Invoice Prefix)</label>
                    <input 
                      type="text" 
                      placeholder="যেমন: INV-HO-, INV-BR2-"
                      value={formData.invoicePrefix || ''}
                      onChange={e => setFormData(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Company Admin Account Setup */}
              <div className="space-y-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                  <KeyRound size={14} className="text-indigo-600" /> কোম্পানি অ্যাডমিন / ম্যানেজার লগইন একাউন্ট
                </h4>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  এই কোম্পানি বা ব্রাঞ্চের প্রধান এডমিন কে হবেন এবং তিনি কোন ইমেইল দিয়ে লগইন করবেন তা নির্ধারণ করুন:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">ম্যানেজার / এডমিনের নাম</label>
                    <input 
                      type="text" 
                      placeholder="যেমন: মো: আরিফুল ইসলাম"
                      value={formData.adminName || ''}
                      onChange={e => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">লগইন ইমেইল ঠিকানা (Login Email)</label>
                    <input 
                      type="email" 
                      placeholder="admin.uttara@company.com"
                      value={formData.adminEmail || ''}
                      onChange={e => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">এডমিনের মোবাইল নম্বর</label>
                    <input 
                      type="tel" 
                      placeholder="017XXXXXXXX"
                      value={formData.adminPhone || ''}
                      onChange={e => setFormData(prev => ({ ...prev, adminPhone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Branding & Logo */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5 border-b border-indigo-100 pb-1.5">
                  <Palette size={14} /> ব্র্যান্ডিং ও হেডার ডিজাইন
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">কোম্পানির স্লোগান / ক্যাশ মেমো ট্যাগলাইন</label>
                    <input 
                      type="text" 
                      placeholder="যেমন: পাইকারি ও খুচরা মূল্যে উন্নত মানের পণ্য"
                      value={formData.tagline || ''}
                      onChange={e => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">কোম্পানি লোগো (Company Logo)</label>
                    <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      {formData.logoUrl ? (
                        <div className="w-16 h-16 bg-white rounded-xl p-1 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                          <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">
                          <ImageIcon size={24} />
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleLogoUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 border border-indigo-200"
                        >
                          <Upload size={13} />
                          {isUploading ? 'প্রসেসিং হচ্ছে...' : 'লোগো ফাইল আপলোড করুন'}
                        </button>
                        {formData.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                            className="text-[11px] text-rose-500 hover:text-rose-700 font-bold block"
                          >
                            লোগো মুছে ফেলুন
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header Color Preset Palette */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">হেডার থিম কালার (Header Theme)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {HEADER_COLOR_PRESETS.map(preset => {
                        const isSelected = (formData.headerBgColor || '#1e1e5f').toLowerCase() === preset.bg.toLowerCase();
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, headerBgColor: preset.bg }))}
                            style={{ backgroundColor: preset.bg }}
                            className={`h-11 rounded-xl text-white text-[10px] font-bold p-1 flex flex-col items-center justify-center relative transition-all shadow-xs ${isSelected ? 'ring-3 ring-indigo-600 ring-offset-2 scale-105 shadow-md' : 'opacity-80 hover:opacity-100'}`}
                          >
                            <span className="truncate w-full text-center drop-shadow-xs">{preset.label}</span>
                            {isSelected && <Check size={12} strokeWidth={3} className="text-amber-400 absolute top-1 right-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Header Text */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">হেডারে প্রদর্শিত টাইটেল</label>
                    <input 
                      type="text" 
                      placeholder="যেমন: REST BAZER"
                      value={formData.headerTitle || ''}
                      onChange={e => setFormData(prev => ({ ...prev, headerTitle: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">হেডারে প্রদর্শিত সাব-টাইটেল</label>
                    <input 
                      type="text" 
                      placeholder="যেমন: উত্তরা ব্রাঞ্চ"
                      value={formData.headerSubtitle || ''}
                      onChange={e => setFormData(prev => ({ ...prev, headerSubtitle: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Options */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">ব্রাঞ্চ স্ট্যাটাস</label>
                    <select
                      value={formData.status || 'active'}
                      onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    >
                      <option value="active">সক্রিয় (Active)</option>
                      <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input 
                      type="checkbox"
                      id="chk-default-branch"
                      checked={!!formData.isDefault}
                      onChange={e => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="chk-default-branch" className="text-xs font-bold text-slate-800 cursor-pointer">
                      এই কোম্পানিকে প্রধান (Default) ব্রাঞ্চ হিসেবে নির্ধারণ করুন
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95 transition-all"
                  id="btn-save-company-modal"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> সংরক্ষণ হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Check size={14} strokeWidth={3} /> {editingCompany ? 'আপডেট করুন' : 'তৈরি করুন'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Company Login & Shop Share Modal */}
      {shareModalCompany && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl border border-emerald-100">
                  {shareModalCompany.logoUrl ? (
                    <img src={shareModalCompany.logoUrl} alt={shareModalCompany.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Building2 size={24} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{shareModalCompany.name}</h3>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-black border border-indigo-100">
                      {shareModalCompany.code || 'CMP'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">কোম্পানির সরাসরি লগইন ও পোর্টাল লিংক শেয়ার করুন</p>
                </div>
              </div>
              <button
                onClick={() => setShareModalCompany(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Link 1: Direct Admin / Staff Login Portal */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-indigo-600" />
                  <span>এডমিন ও স্টাফ সরাসরি লগইন লিংক</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                  Admin & Staff Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                এই লিংকে ঢুকলে ব্যবহারকারী সরাসরি <strong>{shareModalCompany.name}</strong> এর ব্রান্ডেড লগইন পেজে প্রবেশ করবে এবং লগইন করলে শুধুমাত্র এই কোম্পানির ডেটা দেখতে পাবে।
              </p>
              
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={getCompanyAdminLoginUrl(shareModalCompany)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getCompanyAdminLoginUrl(shareModalCompany));
                    setLinkCopiedType('admin');
                    setTimeout(() => setLinkCopiedType(null), 2500);
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all shadow-xs"
                >
                  {linkCopiedType === 'admin' ? (
                    <>
                      <Check size={14} />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>কপি</span>
                    </>
                  )}
                </button>
                <a
                  href={getCompanyAdminLoginUrl(shareModalCompany)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors shrink-0"
                  title="নতুন ট্যাবে খুলুন"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            {/* Link 2: Customer Online Shop Link */}
            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  <ShoppingCart size={14} className="text-emerald-600" />
                  <span>কাস্টমার অনলাইন শপ লিংক</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  Customer Shop
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                কাস্টমারদের এই লিংক দিলে তারা সরাসরি এই ব্রাঞ্চের পণ্য দেখতে এবং অর্ডার করতে পারবে।
              </p>
              
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={getCompanyShopUrl(shareModalCompany)}
                  className="flex-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getCompanyShopUrl(shareModalCompany));
                    setLinkCopiedType('shop');
                    setTimeout(() => setLinkCopiedType(null), 2500);
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all shadow-xs"
                >
                  {linkCopiedType === 'shop' ? (
                    <>
                      <Check size={14} />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>কপি</span>
                    </>
                  )}
                </button>
                <a
                  href={getCompanyShopUrl(shareModalCompany)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition-colors shrink-0"
                  title="নতুন ট্যাবে খুলুন"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            {/* Quick Share Buttons (WhatsApp & Full Details Copy) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  const adminUrl = getCompanyAdminLoginUrl(shareModalCompany);
                  const shopUrl = getCompanyShopUrl(shareModalCompany);
                  const email = shareModalCompany.adminEmail || shareModalCompany.email || 'info@company.com';
                  const text = `🏢 *${shareModalCompany.name}* (কোড: ${shareModalCompany.code || 'CMP'})\n\n🔐 *এডমিন/স্টাফ লগইন লিংক:*\n${adminUrl}\n\n🛍️ *অনলাইন শপ লিংক:*\n${shopUrl}\n\n📧 *লগইন ইমেইল:* ${email}\n📍 *ঠিকানা:* ${shareModalCompany.address || 'N/A'}\n\n👉 উপরের লিংকে ক্লিক করে সরাসরি আপনার কোম্পানি একাউন্টে লগইন করুন।`;
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                  window.open(whatsappUrl, '_blank');
                }}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <MessageSquare size={16} />
                <span>WhatsApp এ শেয়ার করুন</span>
              </button>

              <button
                onClick={() => {
                  const adminUrl = getCompanyAdminLoginUrl(shareModalCompany);
                  const shopUrl = getCompanyShopUrl(shareModalCompany);
                  const email = shareModalCompany.adminEmail || shareModalCompany.email || 'info@company.com';
                  const text = `🏢 কোম্পানি: ${shareModalCompany.name}\n🔖 ব্রাঞ্চ কোড: ${shareModalCompany.code || 'CMP'}\n👤 এডমিন: ${shareModalCompany.adminName || 'Admin'}\n📧 লগইন ইমেইল: ${email}\n📍 ঠিকানা: ${shareModalCompany.address || 'N/A'}\n\n🔐 এডমিন ও স্টাফ সরাসরি লগইন লিংক:\n${adminUrl}\n\n🛍️ কাস্টমার অনলাইন শপ লিংক:\n${shopUrl}\n\nএই লিংকে ক্লিক করে সরাসরি কোম্পানির ডেটা ও ড্যাশবোর্ড পরিচালনা করুন।`;
                  navigator.clipboard.writeText(text);
                  setLinkCopiedType('all');
                  setTimeout(() => setLinkCopiedType(null), 2500);
                }}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                {linkCopiedType === 'all' ? (
                  <>
                    <Check size={16} className="text-emerald-400" />
                    <span>সব তথ্য কপি হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>সব লগইন তথ্য কপি করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
