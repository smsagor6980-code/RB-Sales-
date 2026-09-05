import React, { useState } from 'react';
import { 
  Store, Loader2, AlertTriangle, Eye, EyeOff, Lock, Mail, Phone, 
  ShoppingBag, CheckCircle, ShieldCheck, LogOut, Building2, MapPin, 
  Sparkles, User, ArrowRight, ExternalLink, Copy, Check, ChevronRight, 
  ChevronLeft, Palette, FileText, Globe, Layers, CheckCircle2, Coins
} from 'lucide-react';
import { auth, db } from '../services/firebase';
import { doc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Staff, CompanyBranch } from '../types';

interface AuthProps {
  isOnline: boolean;
  onSetAdminMode: (isAdmin: boolean) => void;
  onStaffLogin: (staff: Staff | null) => void;
  onSwitchToShop: () => void;
  companies?: CompanyBranch[];
  activeCompanyId?: string;
  onSelectCompany?: (companyId: string) => void;
}

const Auth: React.FC<AuthProps> = ({ 
  isOnline, 
  onSetAdminMode, 
  onStaffLogin, 
  onSwitchToShop, 
  companies = [],
  activeCompanyId,
  onSelectCompany
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'register_company'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const p = new URLSearchParams(window.location.search);
        if (p.get('mode') === 'register_company' || p.get('tab') === 'register_company' || p.get('action') === 'new_company' || p.get('register') === 'company') {
          return 'register_company';
        }
        if (p.get('tab') === 'register' || p.get('mode') === 'register') {
          return 'register';
        }
      } catch (e) {}
    }
    return 'login';
  });
  
  // Detect targeted company from URL or activeCompanyId prop
  const urlCompanyParam = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('company') || new URLSearchParams(window.location.search).get('branch') || new URLSearchParams(window.location.search).get('code')) : null;
  const targetCompany = companies.find(c => 
    (urlCompanyParam && (c.id === urlCompanyParam || (c.code && c.code.toLowerCase() === urlCompanyParam.toLowerCase()))) ||
    (activeCompanyId && c.id === activeCompanyId)
  ) || null;

  // Login & Staff Register State
  const [identifier, setIdentifier] = useState(targetCompany?.adminEmail || ''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(targetCompany?.id || activeCompanyId || '');

  React.useEffect(() => {
    if (targetCompany) {
      setSelectedBranchId(targetCompany.id);
      if (targetCompany.adminEmail && !identifier) {
        setIdentifier(targetCompany.adminEmail);
      }
    }
  }, [targetCompany]);

  // Company Register Multi-Tab State
  const [companyStep, setCompanyStep] = useState<'info' | 'contact' | 'admin' | 'theme'>('info');
  const [companyName, setCompanyName] = useState('');
  const [companyTagline, setCompanyTagline] = useState('স্মার্ট ইনভেন্টরি ও সেলস সল্যুশন');
  const [companyOwnerName, setCompanyOwnerName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [companyConfirmPassword, setCompanyConfirmPassword] = useState('');
  const [companyCurrency, setCompanyCurrency] = useState('৳');
  const [companyInvoicePrefix, setCompanyInvoicePrefix] = useState('');
  const [companyHeaderBg, setCompanyHeaderBg] = useState('#1e1e5f');
  const [copiedLink, setCopiedLink] = useState(false);

  // Suggested clean company code
  const cleanCodePreview = React.useMemo(() => {
    return companyName.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'CMP';
  }, [companyName]);

  const handleCopySignupLink = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?mode=register_company`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (currentUser && companies && companies.length > 0) {
      const email = (currentUser.email || '').toLowerCase().trim();
      const isOwner = email === 'smsagor6980@gmail.com';
      const matchedComp = companies.find(c => 
        (c.adminEmail && c.adminEmail.toLowerCase().trim() === email) || 
        (c.email && c.email.toLowerCase().trim() === email)
      );

      if (isOwner || matchedComp) {
        onSetAdminMode(true);
        if (matchedComp) {
          const compStaff: Staff = {
            id: currentUser.uid,
            uid: currentUser.uid,
            name: matchedComp.adminName || matchedComp.name || 'Company Admin',
            email: email,
            phone: matchedComp.adminPhone || matchedComp.phone || '',
            designation: 'Admin',
            roleId: 'admin',
            companyId: matchedComp.id,
            companyName: matchedComp.name,
            status: 'active',
            isApproved: true,
            joinedDate: new Date().toISOString()
          };
          onStaffLogin(compStaff);
          try {
            localStorage.setItem('active_company_id', matchedComp.id);
          } catch (e) {}
        }
      }
    }
  }, [currentUser, companies, onSetAdminMode, onStaffLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!isOnline) {
      setError("আপনি অফলাইনে আছেন। ইন্টারনেট কানেকশন চেক করুন।");
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'register_company') {
        // -------------------------------------------------------------
        // NEW COMPANY REGISTRATION
        // -------------------------------------------------------------
        const email = companyEmail.trim().toLowerCase();
        const pass = companyPassword.trim();

        if (!companyName.trim()) {
          setError("কোম্পানি বা শপের নাম পূরণ করুন।");
          setCompanyStep('info');
          setLoading(false);
          return;
        }

        if (!companyPhone.trim()) {
          setError("কোম্পানির অফিশিয়াল মোবাইল নম্বরটি পূরণ করুন।");
          setCompanyStep('contact');
          setLoading(false);
          return;
        }

        if (!email) {
          setError("কোম্পানির অ্যাডমিন লগইন ইমেইল পূরণ করুন।");
          setCompanyStep('admin');
          setLoading(false);
          return;
        }

        if (pass.length < 6) {
          setError("পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।");
          setCompanyStep('admin');
          setLoading(false);
          return;
        }

        if (companyConfirmPassword && pass !== companyConfirmPassword.trim()) {
          setError("কনফার্ম পাসওয়ার্ডটি মূল পাসওয়ার্ডের সাথে মেলেনি।");
          setCompanyStep('admin');
          setLoading(false);
          return;
        }

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          if (db && userCredential.user) {
            const newCompanyId = `comp-${Date.now()}`;
            const cleanCode = companyName.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'CMP';
            const code = `${cleanCode}-${Math.floor(100 + Math.random() * 900)}`;
            const now = new Date().toISOString();

            // 1. Create Company Document
            const newCompany: CompanyBranch = {
              id: newCompanyId,
              name: companyName.trim(),
              code: code,
              phone: companyPhone.trim(),
              email: email,
              address: companyAddress.trim(),
              currency: companyCurrency || '৳',
              headerTitle: companyName.trim(),
              headerSubtitle: companyTagline || 'স্মার্ট বিজনেস ও ইনভেন্টরি সল্যুশন',
              headerBgColor: companyHeaderBg || '#1e1e5f',
              headerTextColor: '#ffffff',
              headerSubtitleColor: '#fcd34d',
              tagline: companyTagline || 'উন্নত সেবা ও নির্ভরযোগ্য ব্যবসা',
              invoicePrefix: companyInvoicePrefix.trim() || `INV-${cleanCode}-`,
              status: 'active',
              isDefault: false,
              adminEmail: email,
              adminName: companyOwnerName.trim() || companyName.trim(),
              adminPhone: companyPhone.trim(),
              createdAt: now,
              updatedAt: now
            };

            await setDoc(doc(db, 'companies', newCompanyId), newCompany);

            // 2. Create Admin Staff Document for this company
            const newAdminStaff: Staff = {
              id: userCredential.user.uid,
              uid: userCredential.user.uid,
              name: companyOwnerName.trim() || `${companyName.trim()} Admin`,
              email: email,
              phone: companyPhone.trim(),
              designation: 'Admin',
              roleId: 'admin',
              companyId: newCompanyId,
              companyName: companyName.trim(),
              status: 'active',
              isApproved: true,
              joinedDate: now
            };

            await setDoc(doc(db, 'staff', userCredential.user.uid), newAdminStaff);

            try {
              localStorage.setItem('active_company_id', newCompanyId);
            } catch (e) {}

            onSetAdminMode(true);
            onStaffLogin(newAdminStaff);

            setSuccess("🎉 অভিনন্দন! আপনার কোম্পানি ও অ্যাডমিন অ্যাকাউন্ট তৈরি সম্পন্ন হয়েছে। আপনি এখন সরাসরি কোম্পানি পরিচালনা করতে পারবেন।");
          }
        } catch (fbError: any) {
          console.warn("Company Register Auth Error:", fbError);
          if (fbError.code === 'auth/email-already-in-use') {
            setError("এই ইমেইলটি দিয়ে ইতিপূর্বে অ্যাকাউন্ট খোলা হয়েছে। অনুগ্রহ করে লগইন করুন বা অন্য ইমেইল দিন।");
            setCompanyStep('admin');
          } else if (fbError.code === 'auth/weak-password') {
            setError("পাসওয়ার্ডটি দুর্বল। অনুগ্রহ করে অন্তত ৬ অক্ষরের একটি পাসওয়ার্ড দিন।");
            setCompanyStep('admin');
          } else if (fbError.code === 'auth/invalid-email') {
            setError("ইমেইল ফরম্যাটটি সঠিক নয়।");
            setCompanyStep('admin');
          } else {
            setError(fbError.message || "কোম্পানি তৈরি করা সম্ভব হচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।");
          }
        }
      } else if (authMode === 'register') {
        // -------------------------------------------------------------
        // STAFF REGISTRATION
        // -------------------------------------------------------------
        const email = identifier.trim().toLowerCase();
        const pass = password.trim();

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          if (db && userCredential.user) {
            let existingStaffData: Partial<Staff> | null = null;
            let existingDocId: string | null = null;
            try {
              const emailLower = email.toLowerCase();
              const q = query(collection(db, 'staff'), where('email', '==', emailLower));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                const preCreatedDoc = querySnap.docs.find(d => d.id !== userCredential.user.uid);
                if (preCreatedDoc) {
                  existingDocId = preCreatedDoc.id;
                  existingStaffData = preCreatedDoc.data() as Staff;
                }
              }
            } catch (err) {
              console.warn("Could not check existing staff by email:", err);
            }

            const isOwner = email.toLowerCase() === 'smsagor6980@gmail.com';
            const assignedComp = companies.find(c => c.id === selectedBranchId);

            const newStaff: Staff = {
              id: userCredential.user.uid,
              uid: userCredential.user.uid,
              name: name.trim() || (isOwner ? 'Owner' : (existingStaffData?.name || '')),
              email: email,
              phone: phone.trim() || (existingStaffData?.phone || ''),
              designation: isOwner ? 'Owner' : (existingStaffData?.designation || 'Salesman'),
              companyId: selectedBranchId || existingStaffData?.companyId,
              companyName: assignedComp?.name || existingStaffData?.companyName,
              status: isOwner ? 'active' : (existingStaffData?.status || 'active'),
              isApproved: isOwner ? true : (existingStaffData ? (existingStaffData.isApproved !== undefined ? existingStaffData.isApproved : false) : false),
              joinedDate: existingStaffData?.joinedDate || new Date().toISOString()
            };

            await setDoc(doc(db, 'staff', userCredential.user.uid), newStaff);
            if (existingDocId && existingDocId !== userCredential.user.uid) {
              try {
                await deleteDoc(doc(db, 'staff', existingDocId));
              } catch (delErr) {
                console.warn("Could not delete old staff document in register:", delErr);
              }
            }
          }

          const isOwner = email.toLowerCase() === 'smsagor6980@gmail.com';
          if (isOwner) {
            setSuccess("মালিকের অ্যাকাউন্ট নিবন্ধন সফল হয়েছে! অনুগ্রহ করে লগইন করুন।");
          } else {
            setSuccess("নিবন্ধন সফল হয়েছে! অনুগ্রহ করে এডমিনের অনুমোদনের জন্য অপেক্ষা করুন।");
          }
          setAuthMode('login');
          setName('');
          setIdentifier('');
          setPhone('');
          setPassword('');
        } catch (fbError: any) {
          console.warn("Register Auth Error:", fbError);
          if (fbError.code === 'auth/email-already-in-use') {
            setError("এই ইমেইলটি দিয়ে ইতিপূর্বে অ্যাকাউন্ট খোলা হয়েছে। অনুগ্রহ করে লগইন করুন।");
          } else if (fbError.code === 'auth/weak-password') {
            setError("পাসওয়ার্ডটি দুর্বল। অনুগ্রহ করে অন্তত ৬ অক্ষরের একটি পাসওয়ার্ড দিন।");
          } else if (fbError.code === 'auth/invalid-email') {
            setError("ইমেইল ফরম্যাটটি সঠিক নয়।");
          } else {
            setError(fbError.message || "নিবন্ধন করা সম্ভব হচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।");
          }
        }
      } else {
        // -------------------------------------------------------------
        // USER / COMPANY ADMIN / STAFF LOGIN
        // -------------------------------------------------------------
        const email = identifier.trim().toLowerCase();
        const pass = password.trim();

        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, pass);
          
          const isOwner = email === 'smsagor6980@gmail.com';
          const matchedCompany = companies.find(c => 
            (c.adminEmail && c.adminEmail.toLowerCase().trim() === email) || 
            (c.email && c.email.toLowerCase().trim() === email)
          );

          if (isOwner || matchedCompany) {
            onSetAdminMode(true);
            if (matchedCompany) {
              const compStaff: Staff = {
                id: userCredential.user.uid,
                uid: userCredential.user.uid,
                name: matchedCompany.adminName || matchedCompany.name || 'Company Admin',
                email: email,
                phone: matchedCompany.adminPhone || matchedCompany.phone || '',
                designation: 'Admin',
                roleId: 'admin',
                companyId: matchedCompany.id,
                companyName: matchedCompany.name,
                status: 'active',
                isApproved: true,
                joinedDate: new Date().toISOString()
              };
              onStaffLogin(compStaff);
              try {
                localStorage.setItem('active_company_id', matchedCompany.id);
              } catch (e) {}
            }
          }
        } catch (fbError: any) {
          console.warn("Auth Error Code:", fbError.code);
          
          if (fbError.code === 'auth/user-not-found' || fbError.code === 'auth/invalid-credential' || fbError.code === 'auth/wrong-password') {
            let emailExistsInDb = false;
            let hasRegisteredProfile = false;
            if (db) {
              try {
                const q = query(collection(db, 'staff'), where('email', '==', email));
                const querySnap = await getDocs(q);
                if (!querySnap.empty) {
                  emailExistsInDb = true;
                  hasRegisteredProfile = querySnap.docs.some(doc => {
                    const d = doc.data();
                    return d.uid && d.uid.trim() !== '' && !doc.id.startsWith('STAFF-');
                  });
                }
              } catch (dbCheckErr) {
                console.warn("Check email in db failed:", dbCheckErr);
              }
            }

            if (emailExistsInDb && !hasRegisteredProfile) {
              setError("আপনার ইমেইলটি পূর্বে ড্যাশবোর্ডে যোগ করা হয়েছে কিন্তু অ্যাকাউন্টটি এখনো নিবন্ধিত হয়নি। অনুগ্রহ করে প্রথমে 'স্টাফ নিবন্ধন' ট্যাব থেকে একই ইমেইল দিয়ে অ্যাকাউন্ট তৈরি করে নিন।");
            } else {
              setError("ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়। অনুগ্রহ করে আবার যাচাই করুন।");
            }
          } else if (fbError.code === 'auth/wrong-password') {
            setError("ভুল পাসওয়ার্ড। আবার চেষ্টা করুন।");
          } else if (fbError.code === 'auth/invalid-email') {
            setError("ইমেইল ফরম্যাটটি সঠিক নয়।");
          } else if (fbError.code === 'auth/too-many-requests') {
            setError("বেশিবার ভুল ট্রাই করেছেন। কিছুক্ষণ পর আবার চেষ্টা করুন।");
          } else if (fbError.code === 'auth/network-request-failed') {
            setError("ইন্টারনেট সমস্যা। আপনার কানেকশন চেক করুন।");
          } else {
            setError("লগইন করা সম্ভব হচ্ছে না। সঠিক তথ্য প্রদান করুন।");
          }
          setLoading(false);
          return;
        }
      }
    } catch (err: any) {
      console.warn("General Auth Error:", err);
      setError(err.message || "একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="bg-primary p-10 text-center text-white">
            <Store size={48} className="mx-auto mb-4" />
            <h1 className="text-3xl font-black uppercase tracking-tight">REST BAZER</h1>
            <p className="text-[10px] opacity-50 font-bold uppercase tracking-[4px] mt-2">Business Solution</p>
          </div>
          <div className="p-8 text-center space-y-6">
            <div className="bg-rose-50 text-rose-600 p-6 rounded-[32px] border border-rose-100 font-bold flex flex-col items-center gap-3">
              <AlertTriangle size={32} />
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">অ্যাক্সেস অনুমোদিত নয়</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                আপনি বর্তমানে কাস্টমার হিসেবে লগইন আছেন (<span className="text-primary font-bold">{currentUser.email}</span>)। অ্যাডমিন বা স্টাফ প্যানেল অ্যাক্সেস করার অনুমতি আপনার অ্যাকাউন্টে নেই।
              </p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={async () => {
                  await auth.signOut();
                  setCurrentUser(null);
                }}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs shadow-2xl shadow-primary/20 flex justify-center items-center gap-2 active:scale-[0.98] transition-all"
              >
                <LogOut size={16} />
                লগআউট করে স্টাফ বা কোম্পানি লগইন পেজে যান
              </button>
              <button 
                onClick={onSwitchToShop}
                className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs flex justify-center items-center gap-2 hover:bg-slate-200 transition-all"
              >
                <ShoppingBag size={18} />
                সরাসরি শপে যান
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className={`bg-white rounded-[40px] shadow-2xl w-full transition-all duration-300 overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100 ${authMode === 'register_company' ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div 
          className="p-8 sm:p-10 text-center text-white relative transition-colors duration-300"
          style={{ backgroundColor: authMode === 'register_company' ? companyHeaderBg : (targetCompany?.headerBgColor || '#1e1e5f') }}
        >
          {targetCompany?.logoUrl && authMode !== 'register_company' ? (
            <div className="w-16 h-16 rounded-2xl bg-white p-1 mx-auto mb-3 shadow-lg flex items-center justify-center overflow-hidden">
              <img src={targetCompany.logoUrl} alt={targetCompany.name} className="w-full h-full object-contain rounded-xl" />
            </div>
          ) : (
            <Store size={44} className="mx-auto mb-3 text-amber-300" />
          )}
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ color: targetCompany?.headerTextColor || '#ffffff' }}>
            {authMode === 'register_company' ? (companyName.trim() || 'REST BAZER - NEW COMPANY') : (targetCompany ? targetCompany.name : 'REST BAZER')}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[3px] mt-1" style={{ color: targetCompany?.headerSubtitleColor || '#fcd34d' }}>
            {authMode === 'register_company' ? (companyTagline || 'অফিসিয়াল কোম্পানি সাইন-আপ ও অনবোর্ডিং') : (targetCompany ? (targetCompany.headerSubtitle || targetCompany.tagline || 'অফিসিয়াল কোম্পানি পোর্টাল') : 'Multi-Company & Inventory ERP')}
          </p>
          {targetCompany && authMode !== 'register_company' && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-xs rounded-full text-[10px] font-black tracking-wider text-white border border-white/20">
              <Building2 size={12} className="text-amber-300" />
              <span>কোম্পানি কোড: {targetCompany.code || 'CMP'}</span>
            </div>
          )}
        </div>

        {/* 3 Main Mode Tabs: Login, Staff Register, Register New Company */}
        <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 text-center">
          <button 
            type="button"
            className={`py-3.5 px-2 font-black text-[11px] uppercase tracking-wider transition-all ${authMode === 'login' ? 'bg-white text-primary border-t-4 border-primary shadow-xs' : 'text-slate-500 hover:text-slate-800'}`} 
            onClick={() => { setAuthMode('login'); setError(''); setSuccess(''); }}
          >
            লগইন
          </button>
          <button 
            type="button"
            className={`py-3.5 px-2 font-black text-[11px] uppercase tracking-wider transition-all ${authMode === 'register' ? 'bg-white text-primary border-t-4 border-primary shadow-xs' : 'text-slate-500 hover:text-slate-800'}`} 
            onClick={() => { setAuthMode('register'); setError(''); setSuccess(''); }}
          >
            স্টাফ নিবন্ধন
          </button>
          <button 
            type="button"
            className={`py-3.5 px-2 font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${authMode === 'register_company' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600 shadow-xs' : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100'}`} 
            onClick={() => { setAuthMode('register_company'); setError(''); setSuccess(''); }}
          >
            <Sparkles size={12} className="text-indigo-600 animate-pulse" />
            নতুন কোম্পানি
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {/* Company Signup Top Bar with "Open in New Tab" and "Copy Link" */}
          {authMode === 'register_company' && (
            <div className="mb-5 p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50/60 border border-indigo-100/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 size={16} />
                </div>
                <div>
                  <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <span>নতুন কোম্পানি সাইন-আপ পোর্টাল</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-indigo-200/80 text-indigo-800 rounded font-bold">New Tab Ready</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">নির্ধারিত ট্যাবে ধাপে ধাপে তথ্য পূরণ করুন</div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <a
                  href="?mode=register_company"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all hover:scale-102 active:scale-98"
                  title="ব্রাউজারের নতুন ট্যাবে সাইন আপ পোর্টাল খুলুন"
                >
                  <ExternalLink size={13} className="text-indigo-600" />
                  <span>নতুন ট্যাবে খুলুন ↗</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopySignupLink}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all"
                  title="সাইন আপ লিংক কপি করুন"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span className="text-[11px]">{copiedLink ? 'কপি হয়েছে' : 'লিংক'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Company Signup Sub-Tabs (৪ টি সুবিন্যস্ত ট্যাব) */}
          {authMode === 'register_company' && (
            <div className="mb-6 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setCompanyStep('info')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${companyStep === 'info' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                >
                  <Building2 size={13} />
                  <span>১. প্রতিষ্ঠান</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyStep('contact')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${companyStep === 'contact' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                >
                  <MapPin size={13} />
                  <span>২. যোগাযোগ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyStep('admin')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${companyStep === 'admin' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                >
                  <User size={13} />
                  <span>৩. অ্যাডমিন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyStep('theme')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${companyStep === 'theme' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                >
                  <Palette size={13} />
                  <span>৪. থিম ও প্রিভিউ</span>
                </button>
              </div>

              {/* Progress Indicator */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: companyStep === 'info' ? '25%' : companyStep === 'contact' ? '50%' : companyStep === 'admin' ? '75%' : '100%'
                  }}
                />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {success && (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs flex gap-3 border border-emerald-200 font-bold items-start leading-relaxed">
                <CheckCircle size={20} className="shrink-0 text-emerald-600 mt-0.5" /> 
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs flex gap-3 border border-rose-200 font-bold items-start leading-relaxed">
                <AlertTriangle size={20} className="shrink-0 text-rose-500 mt-0.5" /> 
                <span>{error}</span>
              </div>
            )}
            
            {/* ======================================================= */}
            {/* 1. NEW COMPANY REGISTRATION MULTI-TAB FORM              */}
            {/* ======================================================= */}
            {authMode === 'register_company' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* TAB 1: COMPANY PROFILE & INFO */}
                {companyStep === 'info' && (
                  <div className="space-y-3.5 animate-in fade-in">
                    <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-2xl text-xs text-indigo-900 font-bold flex items-center gap-2">
                      <Building2 size={18} className="text-indigo-600 shrink-0" />
                      <span>ধাপ ১: আপনার কোম্পানি বা শপের প্রাথমিক পরিচিতি লিখুন</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">কোম্পানি / প্রতিষ্ঠানের নাম *</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-3.5 text-slate-400" size={17} />
                        <input 
                          type="text" 
                          required 
                          className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white" 
                          placeholder="যেমন: আরএফএল ট্রেডিং, রহিম এন্টারপ্রাইজ" 
                          value={companyName} 
                          onChange={e => {
                            setCompanyName(e.target.value);
                            if (!companyInvoicePrefix) {
                              const clean = e.target.value.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
                              if (clean) setCompanyInvoicePrefix(`INV-${clean}-`);
                            }
                          }} 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">স্লোগান / ব্যবসার ট্যাগলাইন</label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-3.5 text-slate-400" size={17} />
                        <input 
                          type="text" 
                          className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white" 
                          placeholder="যেমন: পাইকারি ও খুচরা বিক্রেতা" 
                          value={companyTagline} 
                          onChange={e => setCompanyTagline(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>ইনভয়েস প্রিফিক্স কোড</span>
                        <span className="text-[10px] text-slate-400 font-mono">যেমন: INV-RFL-</span>
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-3.5 text-slate-400" size={17} />
                        <input 
                          type="text" 
                          className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white font-mono" 
                          placeholder={`INV-${cleanCodePreview}-`} 
                          value={companyInvoicePrefix} 
                          onChange={e => setCompanyInvoicePrefix(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!companyName.trim()) {
                            setError("অনুগ্রহ করে কোম্পানির নাম পূরণ করুন।");
                            return;
                          }
                          setError('');
                          setCompanyStep('contact');
                        }}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
                      >
                        <span>পরবর্তী ধাপ: যোগাযোগ ও ব্রাঞ্চ</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: CONTACT & LOCATION */}
                {companyStep === 'contact' && (
                  <div className="space-y-3.5 animate-in fade-in">
                    <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-2">
                      <MapPin size={18} className="text-emerald-600 shrink-0" />
                      <span>ধাপ ২: যোগাযোগ নম্বর, ঠিকানা ও কারেন্সি কনফিগার করুন</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">অফিসিয়াল মোবাইল নম্বর *</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 text-slate-400" size={17} />
                        <input 
                          type="tel" 
                          required 
                          className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white" 
                          placeholder="017XXXXXXXX" 
                          value={companyPhone} 
                          onChange={e => setCompanyPhone(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">ঠিকানা ও লোকেশন</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-3.5 text-slate-400" size={17} />
                        <input 
                          type="text" 
                          className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white" 
                          placeholder="দোকান নং / বাজার / থানা / জেলা" 
                          value={companyAddress} 
                          onChange={e => setCompanyAddress(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">ডিফল্ট কারেন্সি চিহ্ন</label>
                      <div className="relative">
                        <Coins className="absolute left-4 top-3.5 text-slate-400" size={17} />
                        <select
                          value={companyCurrency}
                          onChange={e => setCompanyCurrency(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
                        >
                          <option value="৳">৳ (BDT - বাংলাদেশি টাকা)</option>
                          <option value="$">$ (USD - ডলার)</option>
                          <option value="₹">₹ (INR - রুপি)</option>
                          <option value="€">€ (EUR - ইউরো)</option>
                          <option value="£">£ (GBP - পাউন্ড)</option>
                          <option value="SAR">SAR (সৌদি রিয়াল)</option>
                          <option value="AED">AED (ইউএই দিরহাম)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCompanyStep('info')}
                        className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all"
                      >
                        <ChevronLeft size={15} />
                        <span>আগের ধাপ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!companyPhone.trim()) {
                            setError("অনুগ্রহ করে মোবাইল নম্বরটি দিন।");
                            return;
                          }
                          setError('');
                          setCompanyStep('admin');
                        }}
                        className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                      >
                        <span>পরবর্তী ধাপ: অ্যাডমিন একাউন্ট</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: ADMIN ACCOUNT & PASSWORD */}
                {companyStep === 'admin' && (
                  <div className="space-y-3.5 animate-in fade-in">
                    <div className="p-3 bg-violet-50/80 border border-violet-100 rounded-2xl text-xs text-violet-900 font-bold flex items-center gap-2">
                      <User size={18} className="text-violet-600 shrink-0" />
                      <span>ধাপ ৩: কোম্পানির মালিক বা অ্যাডমিনের লগইন তথ্য নির্ধারণ করুন</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">মালিক / প্রতিনিধির নাম *</label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 text-slate-400" size={17} />
                        <input 
                          type="text" 
                          required 
                          className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white" 
                          placeholder="আপনার পূর্ণ নাম" 
                          value={companyOwnerName} 
                          onChange={e => setCompanyOwnerName(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">কোম্পানি অ্যাডমিন লগইন ইমেইল *</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 text-slate-400" size={17} />
                        <input 
                          type="email" 
                          required 
                          className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white" 
                          placeholder="admin@company.com" 
                          value={companyEmail} 
                          onChange={e => setCompanyEmail(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">লগইন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-3.5 text-slate-400" size={17} />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            required 
                            className="w-full border border-slate-200 rounded-xl pl-11 pr-10 py-3 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white" 
                            placeholder="পাসওয়ার্ড লিখুন" 
                            value={companyPassword} 
                            onChange={e => setCompanyPassword(e.target.value)} 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-3 top-3 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">পাসওয়ার্ড নিশ্চিত করুন</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-3.5 text-slate-400" size={17} />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white" 
                            placeholder="পুনরায় পাসওয়ার্ড লিখুন" 
                            value={companyConfirmPassword} 
                            onChange={e => setCompanyConfirmPassword(e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCompanyStep('contact')}
                        className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all"
                      >
                        <ChevronLeft size={15} />
                        <span>আগের ধাপ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!companyEmail.trim()) {
                            setError("অনুগ্রহ করে লগইন ইমেইল লিখুন।");
                            return;
                          }
                          if (companyPassword.length < 6) {
                            setError("পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।");
                            return;
                          }
                          if (companyConfirmPassword && companyPassword !== companyConfirmPassword.trim()) {
                            setError("কনফার্ম পাসওয়ার্ডটি মেলেনি।");
                            return;
                          }
                          setError('');
                          setCompanyStep('theme');
                        }}
                        className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                      >
                        <span>পরবর্তী ধাপ: থিম ও প্রিভিউ</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4: THEME & LIVE PREVIEW */}
                {companyStep === 'theme' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-3 bg-amber-50/80 border border-amber-100 rounded-2xl text-xs text-amber-900 font-bold flex items-center gap-2">
                      <Palette size={18} className="text-amber-600 shrink-0" />
                      <span>ধাপ ৪: কোম্পানির হেডার থিম কালার পছন্দ করুন ও লাইভ প্রিভিউ দেখুন</span>
                    </div>

                    {/* Color Theme Selector */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-700">হেডার কালার প্রিসেট</label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { id: '#1e1e5f', name: 'ডিপ নেভি', bg: '#1e1e5f' },
                          { id: '#064e3b', name: 'এমারেল্ড', bg: '#064e3b' },
                          { id: '#431407', name: 'চকলেট', bg: '#431407' },
                          { id: '#3b0764', name: 'পার্পল', bg: '#3b0764' },
                          { id: '#0f172a', name: 'মিডনাইট', bg: '#0f172a' },
                          { id: '#701a75', name: 'ম্যাজেন্টা', bg: '#701a75' },
                        ].map(theme => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setCompanyHeaderBg(theme.id)}
                            style={{ backgroundColor: theme.bg }}
                            className={`h-11 rounded-xl text-white text-[10px] font-bold flex flex-col items-center justify-center transition-all border-2 ${companyHeaderBg === theme.id ? 'border-amber-400 scale-105 shadow-md' : 'border-transparent opacity-85 hover:opacity-100'}`}
                          >
                            <span>{theme.name}</span>
                            {companyHeaderBg === theme.id && <Check size={12} className="text-amber-300 mt-0.5" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Preview Card */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700">লাইভ পোর্টাল কার্ড প্রিভিউ:</span>
                      <div 
                        style={{ backgroundColor: companyHeaderBg }} 
                        className="p-5 rounded-2xl text-white shadow-md border border-white/10 relative overflow-hidden transition-colors duration-300"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-amber-300 text-sm shrink-0 border border-white/20">
                              {cleanCodePreview}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base font-black truncate">{companyName || 'আপনার কোম্পানির নাম'}</h3>
                              <p className="text-[11px] text-amber-300 font-medium truncate">{companyTagline || 'অফিসিয়াল ব্রাঞ্চ পোর্টাল'}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                              কোড: {cleanCodePreview}-101
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-white/60 block">মালিক / এডমিন:</span>
                            <span className="font-bold text-white truncate block">{companyOwnerName || 'নাম লিখা হয়নি'}</span>
                          </div>
                          <div>
                            <span className="text-white/60 block">ইনভয়েস প্রিফিক্স:</span>
                            <span className="font-mono font-bold text-amber-300 truncate block">{companyInvoicePrefix || `INV-${cleanCodePreview}-`}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCompanyStep('admin')}
                        className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all"
                      >
                        <ChevronLeft size={15} />
                        <span>আগের ধাপ</span>
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-2/3 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all"
                      >
                        {loading ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={16} />}
                        <span>🎉 কোম্পানি তৈরি ও সক্রিয় করুন</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================= */}
            {/* 2. LOGIN OR STAFF REGISTER FORM                         */}
            {/* ======================================================= */}
            {authMode !== 'register_company' && (
              <div className="space-y-3.5">
                {targetCompany && (
                  <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-3 flex items-center justify-between text-xs text-indigo-950">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-indigo-600 shrink-0" />
                      <div>
                        <span className="font-bold">{targetCompany.name}</span>
                        <span className="text-[10px] text-slate-500 block">লগইন করলে সরাসরি এই কোম্পানির ডেটা দেখতে পারবেন</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-white text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 shadow-2xs shrink-0">
                      {targetCompany.code || 'CMP'}
                    </span>
                  </div>
                )}

                {authMode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">আপনার নাম *</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full border border-slate-200 rounded-xl p-3.5 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white" 
                      placeholder="পূর্ণ নাম লিখুন" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                    />
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">ইমেইল ঠিকানা *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-slate-400" size={17} />
                    <input 
                      type="email" 
                      required 
                      className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white" 
                      placeholder="example@mail.com" 
                      value={identifier} 
                      onChange={e => setIdentifier(e.target.value)} 
                    />
                  </div>
                </div>
                
                {authMode === 'register' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">ফোন নম্বর *</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 text-slate-400" size={17} />
                        <input 
                          type="tel" 
                          required 
                          className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white" 
                          placeholder="017XXXXXXXX" 
                          value={phone} 
                          onChange={e => setPhone(e.target.value)} 
                        />
                      </div>
                    </div>

                    {companies.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">কোম্পানি / ব্রাঞ্চ নির্ধারণ করুন</label>
                        <select
                          value={selectedBranchId}
                          onChange={e => setSelectedBranchId(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white"
                        >
                          <option value="">-- কোম্পানি নির্বাচন করুন (ঐচ্ছিক) --</option>
                          {companies.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code || 'BR'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">পাসওয়ার্ড *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-slate-400" size={17} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      className="w-full border border-slate-200 rounded-xl pl-11 pr-11 py-3.5 text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white" 
                      placeholder="পাসওয়ার্ড লিখুন" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {authMode !== 'register_company' && (
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl flex justify-center items-center gap-2 active:scale-[0.98] transition-all mt-4 bg-primary hover:bg-primary/90 shadow-primary/25"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18}/>
                ) : authMode === 'login' ? (
                  <>লগইন করুন <ArrowRight size={15} /></>
                ) : (
                  <>স্টাফ হিসেবে নিবন্ধন করুন</>
                )}
              </button>
            )}

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button 
                type="button"
                onClick={onSwitchToShop}
                className="w-full bg-slate-100 text-slate-600 py-3.5 rounded-2xl font-black uppercase text-xs flex justify-center items-center gap-2 hover:bg-slate-200 transition-all"
              >
                <ShoppingBag size={16} />
                সরাসরি অনলাইন শপে যান
              </button>
            </div>

            {/* Helpful Guide / instructions */}
            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] leading-relaxed space-y-2 text-slate-600 font-medium text-left">
              <p className="font-black text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5 mb-1 text-primary">
                <ShieldCheck size={14} /> নির্দেশাবলী / Instructions:
              </p>
              <p>
                🏢 <strong className="text-indigo-900">নতুন কোম্পানি:</strong> উপরের <strong>"নতুন কোম্পানি"</strong> ট্যাবে ক্লিক করে আপনার কোম্পানির নাম ও তথ্য দিয়ে সরাসরি অ্যাকাউন্ট খুলে নিন। আপনি আপনার কোম্পানির সম্পূর্ণ ডেটা ও অ্যাডমিন নিয়ন্ত্রণ পাবেন।
              </p>
              <p>
                🔑 <strong className="text-slate-800">মালিক / এডমিন:</strong> যেকোনো কোম্পানি এডমিন তার নির্ধারিত ইমেইল ও পাসওয়ার্ড দিয়ে সরাসরি লগইন করে নিজের ব্রাঞ্চ পরিচালনা করতে পারবেন।
              </p>
            </div>
            
            {!isOnline && (
              <p className="text-[10px] text-center text-rose-500 font-black uppercase mt-4 tracking-widest">You are currently offline</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;