import React, { useState } from 'react';
import { Store, Loader2, AlertTriangle, Eye, EyeOff, Lock, Mail, Phone, ShoppingBag, CheckCircle, ShieldCheck, LogOut } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { doc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Staff } from '../types';

interface AuthProps {
  isOnline: boolean;
  onSetAdminMode: (isAdmin: boolean) => void;
  onStaffLogin: (staff: Staff | null) => void;
  onSwitchToShop: () => void;
}

const Auth: React.FC<AuthProps> = ({ isOnline, onSetAdminMode, onStaffLogin, onSwitchToShop }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!isOnline) {
      setError("আপনি অফলাইনে আছেন। ইন্টারনেট কানেকশন চেক করুন।");
      return;
    }

    setLoading(true);
    const email = identifier.trim().toLowerCase();
    const pass = password.trim();

    try {
      if (authMode === 'register') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          if (db && userCredential.user) {
            // Pre-check if there's an existing staff profile with this email address
            // Since we are now authenticated, we can read the staff collection to look up the pre-created profile
            let existingStaffData: Partial<Staff> | null = null;
            let existingDocId: string | null = null;
            try {
              const emailLower = email.toLowerCase();
              const q = query(collection(db, 'staff'), where('email', '==', emailLower));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                // Find a pre-created record (which has a different ID, like STAFF-xxxx)
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
            const newStaff: Staff = {
              id: userCredential.user.uid,
              uid: userCredential.user.uid,
              name: name.trim() || (isOwner ? 'Owner' : (existingStaffData?.name || '')),
              email: email,
              phone: phone.trim() || (existingStaffData?.phone || ''),
              designation: isOwner ? 'Owner' : (existingStaffData?.designation || 'Salesman'),
              status: isOwner ? 'active' : (existingStaffData?.status || 'inactive'),
              isApproved: isOwner ? true : (existingStaffData ? (existingStaffData.isApproved !== undefined ? existingStaffData.isApproved : false) : false),
              joinedDate: existingStaffData?.joinedDate || new Date().toISOString()
            };
            try {
              await setDoc(doc(db, 'staff', userCredential.user.uid), newStaff);
              if (existingDocId && existingDocId !== userCredential.user.uid) {
                try {
                  await deleteDoc(doc(db, 'staff', existingDocId));
                } catch (delErr) {
                  console.warn("Could not delete old staff document in register:", delErr);
                }
              }
            } catch (dbErr: any) {
               console.warn("DB Write during register failed:", dbErr.message);
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
        try {
          await signInWithEmailAndPassword(auth, email, pass);
        } catch (fbError: any) {
          console.warn("Auth Error Code:", fbError.code);
          
          if (fbError.code === 'auth/user-not-found' || fbError.code === 'auth/invalid-credential' || fbError.code === 'auth/wrong-password') {
            // Check if this email exists in Firestore staff collection but is not yet registered in Firebase Auth
            let emailExistsInDb = false;
            let hasRegisteredProfile = false;
            if (db) {
              try {
                const q = query(collection(db, 'staff'), where('email', '==', email));
                const querySnap = await getDocs(q);
                if (!querySnap.empty) {
                  emailExistsInDb = true;
                  // If there is any doc with a uid, then they have a registered profile
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
              setError("আপনার ইমেইলটি পূর্বে ড্যাশবোর্ডে যোগ করা হয়েছে কিন্তু অ্যাকাউন্টটি এখনো নিবন্ধিত হয়নি। অনুগ্রহ করে প্রথমে 'নিবন্ধন' ট্যাব থেকে একই ইমেইল দিয়ে অ্যাকাউন্ট তৈরি করে নিন।");
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
                লগআউট করে স্টাফ লগইন পেজে যান
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
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-primary p-10 text-center text-white">
          <Store size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl font-black uppercase tracking-tight">REST BAZER</h1>
          <p className="text-[10px] opacity-50 font-bold uppercase tracking-[4px] mt-2">Business Solution</p>
        </div>

        <div className="flex bg-slate-50 border-b border-slate-200">
          <button className={`flex-1 py-4 font-black text-xs uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-white text-primary border-t-4 border-primary' : 'text-slate-400'}`} onClick={() => { setAuthMode('login'); setError(''); setSuccess(''); }}>লগইন</button>
          <button className={`flex-1 py-4 font-black text-xs uppercase tracking-widest transition-all ${authMode === 'register' ? 'bg-white text-primary border-t-4 border-primary' : 'text-slate-400'}`} onClick={() => { setAuthMode('register'); setError(''); setSuccess(''); }}>নিবন্ধন</button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {success && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-xs flex gap-3 border border-emerald-100 font-bold items-center"><CheckCircle size={18}/> {success}</div>}
            {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs flex gap-3 border border-rose-100 font-bold items-center"><AlertTriangle size={18}/> {error}</div>}
            
            {authMode === 'register' && (
              <input type="text" required className="w-full border rounded-xl p-4 text-sm bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/10" placeholder="আপনার নাম" value={name} onChange={e => setName(e.target.value)} />
            )}
            
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-300" size={18} />
              <input type="email" required className="w-full border rounded-xl pl-12 pr-4 py-4 text-sm bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/10" placeholder="ইমেইল" value={identifier} onChange={e => setIdentifier(e.target.value)} />
            </div>
            
            {authMode === 'register' && (
              <div className="relative">
                <Phone className="absolute left-4 top-4 text-slate-300" size={18} />
                <input type="tel" required className="w-full border rounded-xl pl-12 pr-4 py-4 text-sm bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/10" placeholder="ফোন নম্বর" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-300" size={18} />
              <input type={showPassword ? "text" : "password"} required className="w-full border rounded-xl pl-12 pr-12 py-4 text-sm bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/10" placeholder="পাসওয়ার্ড" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-300 hover:text-primary transition-colors">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase text-xs shadow-2xl shadow-primary/20 flex justify-center items-center gap-3 active:scale-[0.98] transition-all">
              {loading ? <Loader2 className="animate-spin" size={20}/> : (authMode === 'login' ? 'লগইন করুন' : 'নিবন্ধন করুন')}
            </button>

            <div className="pt-4 border-t border-slate-100">
              <button 
                type="button"
                onClick={onSwitchToShop}
                className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs flex justify-center items-center gap-2 hover:bg-slate-200 transition-all"
              >
                <ShoppingBag size={18} />
                সরাসরি শপে যান
              </button>
            </div>

            {/* Helpful Guide / instructions */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-150 rounded-2xl text-[11px] leading-relaxed space-y-2 text-slate-500 font-medium text-left">
              <p className="font-black text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5 mb-1 text-primary">
                <ShieldCheck size={14} /> নির্দেশাবলী / Instructions:
              </p>
              <p>
                🔑 <strong className="text-slate-800">মালিক (Owner):</strong> আপনি যদি শপের মালিক হন, তবে প্রথমে "নিবন্ধন" ট্যাব থেকে <strong className="text-primary">smsagor6980@gmail.com</strong> ইমেইলটি ব্যবহার করে অ্যাকাউন্ট তৈরি করে নিন। নিবন্ধনের পর লগইন করলে আপনি সরাসরি অ্যাডমিন ড্যাশবোর্ড পাবেন।
              </p>
              <p>
                👤 <strong className="text-slate-800">স্টাফ (Staff):</strong> আপনার যেকোনো ইমেইল দিয়ে প্রথমে "নিবন্ধন" করে নিন। নিবন্ধনের পর লগইন করলে আপনার অ্যাকাউন্টটি মালিকের কাছে অনুমোদনের জন্য পেন্ডিং দেখাবে। মালিক তার অ্যাডমিন প্যানেল থেকে আপনার অ্যাকাউন্টটি অনুমোদন করলেই আপনার অ্যাক্সেস চালু হয়ে যাবে।
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