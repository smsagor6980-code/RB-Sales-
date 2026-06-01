import React, { useState } from 'react';
import { Store, Loader2, AlertTriangle, Eye, EyeOff, Lock, Mail, Phone, ShoppingBag } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
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
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isOnline) {
      setError("আপনি অফলাইনে আছেন। ইন্টারনেট কানেকশন চেক করুন।");
      return;
    }

    setLoading(true);
    const email = identifier.trim().toLowerCase();
    const pass = password.trim();

    try {
      if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        if (db && userCredential.user) {
          const newStaff: Staff = {
            id: userCredential.user.uid,
            uid: userCredential.user.uid,
            name: name.trim(),
            email: email,
            phone: phone.trim(),
            designation: 'Salesman',
            status: 'inactive',
            isApproved: false,
            joinedDate: new Date().toISOString()
          };
          try {
            await setDoc(doc(db, 'staff', userCredential.user.uid), newStaff);
          } catch (dbErr: any) {
             console.warn("DB Write during register failed:", dbErr.message);
          }
        }
        alert("নিবন্ধন সফল! এডমিনের অনুমোদনের জন্য অপেক্ষা করুন।");
        setAuthMode('login');
      } else {
        try {
          await signInWithEmailAndPassword(auth, email, pass);
        } catch (fbError: any) {
          console.error("Auth Error Code:", fbError.code);
          
          if (fbError.code === 'auth/user-not-found' || fbError.code === 'auth/invalid-credential') {
            setError("ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়। অনুগ্রহ করে আবার যাচাই করুন।");
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
      console.error("General Auth Error:", err);
      setError("একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-md:max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-primary p-10 text-center text-white">
          <Store size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl font-black uppercase tracking-tight">REST BAZER</h1>
          <p className="text-[10px] opacity-50 font-bold uppercase tracking-[4px] mt-2">Business Solution</p>
        </div>

        <div className="flex bg-slate-50 border-b border-slate-200">
          <button className={`flex-1 py-4 font-black text-xs uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-white text-primary border-t-4 border-primary' : 'text-slate-400'}`} onClick={() => setAuthMode('login')}>লগইন</button>
          <button className={`flex-1 py-4 font-black text-xs uppercase tracking-widest transition-all ${authMode === 'register' ? 'bg-white text-primary border-t-4 border-primary' : 'text-slate-400'}`} onClick={() => setAuthMode('register')}>নিবন্ধন</button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
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