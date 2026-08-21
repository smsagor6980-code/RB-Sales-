import React, { useState } from 'react';
import { Store, Loader2, AlertTriangle, Eye, EyeOff, Lock, Mail, Phone, User, MapPin, ArrowLeft } from 'lucide-react';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Customer } from '../../types';
import { motion } from 'framer-motion';

interface CustomerAuthProps {
  onSuccess: (customer: Customer) => void;
  onBack: () => void;
}

const CustomerAuth: React.FC<CustomerAuthProps> = ({ onSuccess, onBack }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        if (db && userCredential.user) {
          const newCustomer: Customer = {
            id: userCredential.user.uid,
            uid: userCredential.user.uid,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            address: address.trim(),
            dueAmount: 0,
            type: 'retail',
            status: 'active',
            dateAdded: new Date().toISOString(),
            totalPurchase: 0,
            totalPaid: 0,
            wishlist: [],
            notifications: []
          };
          
          try {
            await setDoc(doc(db, 'customers', userCredential.user.uid), newCustomer);
          } catch (dbErr: any) {
            console.error("Database Write Error:", dbErr);
            // If write fails, we still have the auth account, but the profile is missing
            // We'll try to handle this in the app
          }
          onSuccess(newCustomer);
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        if (db && userCredential.user) {
          try {
            const customerDocRef = doc(db, 'customers', userCredential.user.uid);
            const snapshot = await getDoc(customerDocRef);
            if (snapshot.exists()) {
              onSuccess(snapshot.data() as Customer);
            } else {
              // If user exists in Auth but not in customers table, create a basic entry
              const basicCustomer: Customer = {
                id: userCredential.user.uid,
                uid: userCredential.user.uid,
                name: userCredential.user.displayName || 'Customer',
                email: userCredential.user.email || '',
                phone: '',
                dueAmount: 0,
                type: 'retail',
                status: 'active',
                dateAdded: new Date().toISOString(),
                totalPurchase: 0,
                totalPaid: 0
              };
              await setDoc(doc(db, 'customers', userCredential.user.uid), basicCustomer);
              onSuccess(basicCustomer);
            }
          } catch (dbErr: any) {
            console.error("Database Read Error:", dbErr);
            // Fallback for permission denied on profile read
            const fallbackCustomer: Customer = {
              id: userCredential.user.uid,
              uid: userCredential.user.uid,
              name: 'Customer',
              email: userCredential.user.email || '',
              phone: '',
              dueAmount: 0,
              type: 'retail',
              status: 'active',
              dateAdded: new Date().toISOString(),
              totalPurchase: 0,
              totalPaid: 0
            };
            onSuccess(fallbackCustomer);
          }
        }
      }
    } catch (err: any) {
      console.warn("Customer Auth Warning:", err?.code || err);
      if (err.code === 'auth/email-already-in-use') {
        setError("এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে লগইন করুন।");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়। অনুগ্রহ করে আবার যাচাই করুন।");
      } else if (err.code === 'auth/invalid-email') {
        setError("ইমেইল ফরম্যাটটি সঠিক নয়।");
      } else if (err.code === 'auth/too-many-requests') {
        setError("অতিরিক্ত চেষ্টা করার জন্য সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।");
      } else if (err.code === 'auth/weak-password') {
        setError("পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।");
      } else {
        setError("একটি সমস্যা হয়েছে। অনুগ্রহ করে সঠিক তথ্য দিয়ে চেষ্টা করুন।");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="bg-primary p-10 text-center text-white relative">
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <Store size={32} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight">REST BAZER</h1>
          <p className="text-[10px] opacity-50 font-bold uppercase tracking-[4px] mt-2">Customer Portal</p>
        </div>

        <div className="flex bg-slate-50 border-b border-slate-200">
          <button 
            className={`flex-1 py-4 font-black text-xs uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-white text-primary border-t-4 border-primary' : 'text-slate-400'}`} 
            onClick={() => setAuthMode('login')}
          >
            লগইন
          </button>
          <button 
            className={`flex-1 py-4 font-black text-xs uppercase tracking-widest transition-all ${authMode === 'register' ? 'bg-white text-primary border-t-4 border-primary' : 'text-slate-400'}`} 
            onClick={() => setAuthMode('register')}
          >
            নিবন্ধন
          </button>
        </div>

        <div className="p-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs flex gap-3 border border-rose-100 font-bold items-center">
                <AlertTriangle size={18}/> {error}
              </div>
            )}
            
            {authMode === 'register' && (
              <div className="relative">
                <User className="absolute left-4 top-4 text-slate-300" size={18} />
                <input 
                  type="text" 
                  required 
                  className="w-full border-2 border-slate-50 rounded-2xl pl-12 pr-4 py-4 text-sm bg-slate-50 font-bold outline-none focus:border-primary/20 focus:bg-white transition-all" 
                  placeholder="আপনার নাম" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-300" size={18} />
              <input 
                type="email" 
                required 
                className="w-full border-2 border-slate-50 rounded-2xl pl-12 pr-4 py-4 text-sm bg-slate-50 font-bold outline-none focus:border-primary/20 focus:bg-white transition-all" 
                placeholder="ইমেইল এড্রেস" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
            
            {authMode === 'register' && (
              <>
                <div className="relative">
                  <Phone className="absolute left-4 top-4 text-slate-300" size={18} />
                  <input 
                    type="tel" 
                    required 
                    className="w-full border-2 border-slate-50 rounded-2xl pl-12 pr-4 py-4 text-sm bg-slate-50 font-bold outline-none focus:border-primary/20 focus:bg-white transition-all" 
                    placeholder="ফোন নম্বর" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    required 
                    className="w-full border-2 border-slate-50 rounded-2xl pl-12 pr-4 py-4 text-sm bg-slate-50 font-bold outline-none focus:border-primary/20 focus:bg-white transition-all" 
                    placeholder="ডেলিভারি ঠিকানা" 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-300" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                className="w-full border-2 border-slate-50 rounded-2xl pl-12 pr-12 py-4 text-sm bg-slate-50 font-bold outline-none focus:border-primary/20 focus:bg-white transition-all" 
                placeholder="পাসওয়ার্ড" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-4 top-4 text-slate-300 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase text-xs shadow-2xl shadow-primary/20 flex justify-center items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : (authMode === 'login' ? 'লগইন করুন' : 'নিবন্ধন করুন')}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {authMode === 'login' ? 'একাউন্ট নেই?' : 'ইতিমধ্যে একাউন্ট আছে?'}
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="ml-2 text-primary hover:underline"
              >
                {authMode === 'login' ? 'নিবন্ধন করুন' : 'লগইন করুন'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuth;
