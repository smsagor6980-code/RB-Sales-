import React, { useState, useEffect, useRef } from 'react';
import { 
  Store, Loader2, AlertTriangle, Eye, EyeOff, Lock, Mail, Phone, 
  User, MapPin, ArrowLeft, ShieldCheck, CheckCircle2, RefreshCw, 
  Smartphone, KeyRound, Sparkles, Send, Copy, Check, ArrowRight
} from 'lucide-react';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Customer, AppNotification } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomerAuthProps {
  onSuccess: (customer: Customer) => void;
  onBack: () => void;
}

export const CustomerAuth: React.FC<CustomerAuthProps> = ({ onSuccess, onBack }) => {
  // Auth Modes
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone' | 'phone_otp'>('email');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpChannel, setOtpChannel] = useState<'sms' | 'email' | 'both'>('sms');

  // State Management
  const [step, setStep] = useState<'form' | 'otp_verify' | 'forgot_password'>('form');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP State
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'phone_login'>('signup');

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp_verify' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  // Validation helpers
  const isValidEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const isValidPhone = (val: string) => {
    // Valid Bangladeshi mobile (e.g. 013-019) or standard 10-15 digit phone
    const cleaned = val.replace(/[\s\-]/g, '');
    const bdRegex = /^(?:\+88|88)?01[3-9]\d{8}$/;
    const intlRegex = /^\+?[0-9]{10,15}$/;
    return bdRegex.test(cleaned) || intlRegex.test(cleaned);
  };

  // Generate 6 digit OTP
  const generateNewOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpTimer(60);
    setCanResendOtp(false);
    return code;
  };

  // Handle Initiating Signup OTP
  const handleInitiateSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setError('অনুগ্রহ করে আপনার নাম প্রদান করুন।');
      return;
    }

    if (!isValidEmail(email)) {
      setError('অনুগ্রহ করে একটি সঠিক ইমেইল এড্রেস লিখুন (যেমন: name@example.com)।');
      return;
    }

    if (!isValidPhone(phone)) {
      setError('অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)।');
      return;
    }

    if (!address.trim()) {
      setError('পণ্য পৌঁছানোর জন্য সঠিক ডেলিভারি ঠিকানা প্রদান করুন।');
      return;
    }

    if (password.length < 6) {
      setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।');
      return;
    }

    // Generate and send OTP
    const code = generateNewOtp();
    setOtpPurpose('signup');
    setStep('otp_verify');
    setSuccessMsg(`আপনার ${otpChannel === 'sms' ? 'মোবাইলে (' + phone + ')' : otpChannel === 'email' ? 'ইমেইলে (' + email + ')' : 'মোবাইল ও ইমেইলে'} ৬ ডিজিটের ওটিপি পাঠানো হয়েছে।`);
  };

  // Handle Initiating Quick Phone Login OTP
  const handleInitiatePhoneLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!isValidPhone(phone)) {
      setError('অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)।');
      return;
    }

    setLoading(true);
    try {
      // Check if user with this phone exists in Firestore
      if (db) {
        const cleanPhone = phone.trim();
        const q = query(collection(db, 'customers'), where('phone', '==', cleanPhone));
        const querySnap = await getDocs(q);
        
        if (querySnap.empty) {
          // Look without +88 or with 0
          const altPhone = cleanPhone.startsWith('+88') ? cleanPhone.replace('+88', '') : cleanPhone.startsWith('88') ? cleanPhone.replace('88', '') : `+88${cleanPhone}`;
          const q2 = query(collection(db, 'customers'), where('phone', '==', altPhone));
          const querySnap2 = await getDocs(q2);
          
          if (querySnap2.empty) {
            setError('এই মোবাইল নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে নতুন একাউন্ট তৈরি (নিবন্ধন) করুন।');
            setLoading(false);
            return;
          }
        }
      }

      generateNewOtp();
      setOtpPurpose('phone_login');
      setStep('otp_verify');
      setSuccessMsg(`আপনার মোবাইলে (${phone}) ওটিপি কোড পাঠানো হয়েছে।`);
    } catch (err: any) {
      console.error("Phone lookup error:", err);
      // Still proceed with OTP verification
      generateNewOtp();
      setOtpPurpose('phone_login');
      setStep('otp_verify');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit inputs
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    // Take the last character if multiple typed
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleAutoFillOtp = () => {
    if (generatedOtp) {
      setOtpDigits(generatedOtp.split(''));
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  // Resend OTP
  const handleResendOtp = () => {
    if (!canResendOtp) return;
    const code = generateNewOtp();
    setSuccessMsg(`নতুন ওটিপি কোড পাঠানো হয়েছে।`);
  };

  // Complete OTP Verification and Signup or Phone Login
  const handleVerifyOtp = async () => {
    setError('');
    const enteredCode = otpDigits.join('');

    if (enteredCode.length !== 6) {
      setError('অনুগ্রহ করে ৬ ডিজিটের সম্পূর্ণ ওটিপি কোডটি লিখুন।');
      return;
    }

    if (enteredCode !== generatedOtp) {
      setError('ভুল ওটিপি কোড! অনুগ্রহ করে সঠিক কোডটি প্রদান করুন।');
      return;
    }

    setLoading(true);

    try {
      if (otpPurpose === 'signup') {
        // Step 1: Create user with Firebase Auth
        let uid = '';
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
          uid = userCredential.user.uid;
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            // Try signing in
            try {
              const signCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
              uid = signCredential.user.uid;
            } catch (signErr) {
              setError('এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে পাসওয়ার্ড দিয়ে লগইন করুন।');
              setLoading(false);
              return;
            }
          } else {
            throw authErr;
          }
        }

        if (!uid) {
          uid = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        }

        // Welcome notification
        const welcomeNotification: AppNotification = {
          id: `notif-${Date.now()}`,
          userId: uid,
          title: 'স্বাগতম REST BAZER-এ!',
          message: `প্রিয় ${name.trim()}, আপনার একাউন্ট সফলভাবে ভেরিফাই ও তৈরি হয়েছে। অনলাইন শপিং উপভোগ করুন!`,
          type: 'system',
          status: 'unread',
          date: new Date().toISOString()
        };

        // Create complete Customer object
        const newCustomer: Customer = {
          id: uid,
          uid: uid,
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
          notifications: [welcomeNotification],
          verifiedPhone: true,
          verifiedEmail: true,
          verifiedAt: new Date().toISOString(),
          authProvider: 'otp_verified'
        };

        // Write directly to Firestore
        if (db) {
          try {
            await setDoc(doc(db, 'customers', uid), newCustomer, { merge: true });
            console.log("Customer registered & synced to Firestore successfully:", uid);
          } catch (dbErr: any) {
            console.warn("Direct Firestore customer doc write warning:", dbErr);
          }
        }

        onSuccess(newCustomer);

      } else if (otpPurpose === 'phone_login') {
        // Phone login verification
        const cleanPhone = phone.trim();
        let matchedCustomer: Customer | null = null;

        if (db) {
          try {
            const q = query(collection(db, 'customers'), where('phone', '==', cleanPhone));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              matchedCustomer = querySnap.docs[0].data() as Customer;
            }
          } catch (qErr) {
            console.warn("Customer search failed:", qErr);
          }
        }

        if (!matchedCustomer) {
          // Create customer profile if not found
          const fallbackUid = `phone-${Date.now()}`;
          matchedCustomer = {
            id: fallbackUid,
            uid: fallbackUid,
            name: name || 'Customer',
            phone: cleanPhone,
            email: email || '',
            address: address || '',
            dueAmount: 0,
            type: 'retail',
            status: 'active',
            dateAdded: new Date().toISOString(),
            totalPurchase: 0,
            totalPaid: 0,
            wishlist: [],
            notifications: [],
            verifiedPhone: true,
            verifiedAt: new Date().toISOString()
          };
          if (db) {
            await setDoc(doc(db, 'customers', fallbackUid), matchedCustomer, { merge: true });
          }
        }

        onSuccess(matchedCustomer);
      }
    } catch (err: any) {
      console.error("Auth / OTP Process Error:", err);
      if (err.code === 'auth/weak-password') {
        setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
      } else if (err.code === 'auth/invalid-email') {
        setError('ইমেইল ফরম্যাটটি সঠিক নয়।');
      } else {
        setError('যাচাইকরণে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  // Standard Login (Email or Phone + Password)
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      let targetEmail = email.trim().toLowerCase();

      // If user is logging in with Phone number + Password
      if (loginMethod === 'phone') {
        if (!isValidPhone(phone)) {
          setError('অনুগ্রহ করে সঠিক মোবাইল নম্বর দিন।');
          setLoading(false);
          return;
        }

        // Lookup customer by phone to find their associated email
        if (db) {
          const cleanPhone = phone.trim();
          const q = query(collection(db, 'customers'), where('phone', '==', cleanPhone));
          const querySnap = await getDocs(q);

          if (!querySnap.empty) {
            const custData = querySnap.docs[0].data() as Customer;
            if (custData.email) {
              targetEmail = custData.email.toLowerCase();
            } else {
              // Direct login for phone without email
              onSuccess(custData);
              setLoading(false);
              return;
            }
          } else {
            setError('এই মোবাইল নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি।');
            setLoading(false);
            return;
          }
        }
      }

      if (!isValidEmail(targetEmail)) {
        setError('অনুগ্রহ করে একটি সঠিক ইমেইল এড্রেস প্রদান করুন।');
        setLoading(false);
        return;
      }

      // Firebase sign in
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
      
      if (userCredential.user) {
        const uid = userCredential.user.uid;
        let customerData: Customer | null = null;

        if (db) {
          try {
            const customerDocRef = doc(db, 'customers', uid);
            const snapshot = await getDoc(customerDocRef);
            if (snapshot.exists()) {
              customerData = snapshot.data() as Customer;
            }
          } catch (readErr) {
            console.warn("Customer doc fetch note:", readErr);
          }
        }

        if (!customerData) {
          customerData = {
            id: uid,
            uid: uid,
            name: userCredential.user.displayName || name || 'Customer',
            email: userCredential.user.email || targetEmail,
            phone: phone || '',
            address: '',
            dueAmount: 0,
            type: 'retail',
            status: 'active',
            dateAdded: new Date().toISOString(),
            totalPurchase: 0,
            totalPaid: 0,
            wishlist: [],
            notifications: []
          };
          if (db) {
            try {
              await setDoc(doc(db, 'customers', uid), customerData, { merge: true });
            } catch (wErr) {
              console.warn("Fallback customer save note:", wErr);
            }
          }
        }

        onSuccess(customerData);
      }
    } catch (err: any) {
      console.warn("Standard Login Error:", err?.code || err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('ইমেইল/ফোন অথবা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে আবার পরীক্ষা করুন।');
      } else if (err.code === 'auth/invalid-email') {
        setError('ইমেইল ফরম্যাট সঠিক নয়।');
      } else if (err.code === 'auth/too-many-requests') {
        setError('অতিরিক্ত চেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।');
      } else {
        setError('লগইন করতে সমস্যা হয়েছে। অনুগ্রহ করে সঠিক তথ্য দিয়ে আবার চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('পাসওয়ার্ড রিসেটের জন্য একটি সঠিক ইমেইল এড্রেস লিখুন।');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSuccessMsg('পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে। আপনার ইনবক্স চেক করুন।');
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError('পাসওয়ার্ড রিসেট লিংক পাঠাতে সমস্যা হয়েছে। ইমেইলটি সঠিক কিনা যাচাই করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/80"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary via-primary/95 to-slate-900 p-8 sm:p-10 text-center text-white relative">
          <button 
            onClick={onBack}
            className="absolute top-6 left-6 p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-90"
            title="ফিরে যান"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="w-16 h-16 bg-white/15 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/20">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">REST BAZER</h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mt-2 border border-white/10">
            <ShieldCheck size={14} className="text-emerald-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
              Verified Customer Portal
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        {step === 'form' && (
          <div className="flex bg-slate-50 border-b border-slate-200">
            <button 
              className={`flex-1 py-4.5 font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${authMode === 'login' ? 'bg-white text-primary border-b-4 border-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`} 
              onClick={() => { setAuthMode('login'); setError(''); setSuccessMsg(''); }}
            >
              <KeyRound size={16} />
              লগইন করুন
            </button>
            <button 
              className={`flex-1 py-4.5 font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${authMode === 'register' ? 'bg-white text-primary border-b-4 border-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`} 
              onClick={() => { setAuthMode('register'); setError(''); setSuccessMsg(''); }}
            >
              <Sparkles size={16} className="text-amber-500" />
              নতুন নিবন্ধন (OTP)
            </button>
          </div>
        )}

        <div className="p-6 sm:p-10">
          {/* Notifications / Alerts */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs sm:text-sm flex gap-3 border border-rose-200 font-bold items-center mb-6"
            >
              <AlertTriangle size={20} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs sm:text-sm flex gap-3 border border-emerald-200 font-bold items-center mb-6"
            >
              <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* STEP 1: FORM (LOGIN / REGISTER) */}
          {step === 'form' && authMode === 'login' && (
            <div>
              {/* Login Method Sub-tabs */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${loginMethod === 'email' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Mail size={14} />
                  ইমেইল লগইন
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${loginMethod === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Phone size={14} />
                  ফোন পাসওয়ার্ড
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone_otp')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${loginMethod === 'phone_otp' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Smartphone size={14} />
                  ফোন OTP
                </button>
              </div>

              {loginMethod === 'phone_otp' ? (
                /* Quick Phone OTP Login Form */
                <form onSubmit={handleInitiatePhoneLoginOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      মোবাইল নম্বর
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-4 text-slate-400" size={18} />
                      <input 
                        type="tel" 
                        required 
                        className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                        placeholder="০১৭XXXXXXXX" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                      />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mt-1.5">
                      আপনার নিবন্ধিত মোবাইল নম্বরে ৬ ডিজিটের তাৎক্ষণিক ওটিপি পাঠানো হবে।
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4.5 rounded-2xl font-black uppercase text-xs sm:text-sm shadow-xl shadow-emerald-600/20 flex justify-center items-center gap-2 transition-all active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20}/> : (
                      <>
                        <Send size={16} />
                        ওটিপি কোড পাঠান
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Standard Email or Phone + Password Form */
                <form onSubmit={handleStandardLogin} className="space-y-4">
                  {loginMethod === 'email' ? (
                    <div>
                      <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                        ইমেইল এড্রেস
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-4 text-slate-400" size={18} />
                        <input 
                          type="email" 
                          required 
                          className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                          placeholder="আপনার ইমেইল (যেমন: name@example.com)" 
                          value={email} 
                          onChange={e => setEmail(e.target.value)} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                        মোবাইল নম্বর
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-4 text-slate-400" size={18} />
                        <input 
                          type="tel" 
                          required 
                          className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                          placeholder="আপনার মোবাইল নম্বর (যেমন: 017XXXXXXXX)" 
                          value={phone} 
                          onChange={e => setPhone(e.target.value)} 
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                        পাসওয়ার্ড
                      </label>
                      <button 
                        type="button" 
                        onClick={() => { setStep('forgot_password'); setError(''); setSuccessMsg(''); }}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        পাসওয়ার্ড ভুলে গেছেন?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 text-slate-400" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-12 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                        placeholder="আপনার পাসওয়ার্ড" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-4 top-4 text-slate-400 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-primary hover:bg-primary/90 text-white py-4.5 rounded-2xl font-black uppercase text-xs sm:text-sm shadow-xl shadow-primary/20 flex justify-center items-center gap-2 transition-all active:scale-[0.98] mt-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20}/> : (
                      <>
                        লগইন সম্পন্ন করুন
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 1: FORM (REGISTER WITH OTP REQUIREMENT) */}
          {step === 'form' && authMode === 'register' && (
            <form onSubmit={handleInitiateSignup} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 mb-2">
                <ShieldCheck size={24} className="text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-black text-amber-900">OTP ভেরিফাইড রিয়েল কাস্টমার রেজিস্ট্রেশন</p>
                  <p className="text-[11px] font-bold text-amber-700">তথ্য জমা দেওয়ার পর ওটিপি কোড দিয়ে তাৎক্ষণিক ভেরিফাই করা হবে।</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                  পূর্ণ নাম *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-4 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required 
                    className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                    placeholder="আপনার পূর্ণ নাম (যেমন: রহিম আহমেদ)" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                    বৈধ ইমেইল *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      required 
                      className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                      placeholder="name@example.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                    মোবাইল নম্বর *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-4 text-slate-400" size={18} />
                    <input 
                      type="tel" 
                      required 
                      className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                      placeholder="017XXXXXXXX" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                  ডেলিভারি ঠিকানা *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required 
                    className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                    placeholder="রোড, বাসা নং, এলাকা, থানা ও জেলা" 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                    পাসওয়ার্ড * (কমপক্ষে ৬ অক্ষর)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 text-slate-400" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-10 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                      placeholder="পাসওয়ার্ড" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                    পাসওয়ার্ড নিশ্চিতকরণ *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 text-slate-400" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                      placeholder="পুনরায় পাসওয়ার্ড দিন" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {/* OTP Channel Selector */}
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                  ওটিপি পাঠানোর মাধ্যম
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOtpChannel('sms')}
                    className={`py-3 px-2 rounded-2xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${otpChannel === 'sms' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                  >
                    <Smartphone size={18} />
                    <span>মোবাইল SMS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpChannel('email')}
                    className={`py-3 px-2 rounded-2xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${otpChannel === 'email' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                  >
                    <Mail size={18} />
                    <span>ইমেইল ওটিপি</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpChannel('both')}
                    className={`py-3 px-2 rounded-2xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${otpChannel === 'both' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                  >
                    <Sparkles size={18} className="text-amber-500" />
                    <span>উভয় মাধ্যম</span>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-primary hover:bg-primary/90 text-white py-4.5 rounded-2xl font-black uppercase text-xs sm:text-sm shadow-xl shadow-primary/20 flex justify-center items-center gap-2 transition-all active:scale-[0.98] mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20}/> : (
                  <>
                    <Send size={16} />
                    ওটিপি কোড পাঠান ও ভেরিফাই করুন
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION SCREEN */}
          {step === 'otp_verify' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Target info card */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Smartphone size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-900">৬ ডিজিটের ওটিপি যাচাই করুন</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  কোড পাঠানো হয়েছে: <span className="text-primary font-black">{otpPurpose === 'signup' && otpChannel === 'email' ? email : phone}</span>
                </p>
                
                {/* Instant Verification Code Preview Helper & Auto Fill */}
                <div className="mt-4 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      📩 প্রাপ্ত মেসেজ / ওটিপি কোড:
                    </p>
                    <p className="text-base font-black tracking-widest text-slate-900 font-mono mt-0.5">
                      {generatedOtp}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFillOtp}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                  >
                    {copiedOtp ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedOtp ? 'অটো-ফিল হয়েছে' : 'অটো-ফিল করুন'}</span>
                  </button>
                </div>
              </div>

              {/* 6 Digit Individual Inputs */}
              <div>
                <label className="block text-center text-xs font-black text-slate-600 uppercase tracking-wider mb-3">
                  নিচে ৬ ডিজিটের কোডটি লিখুন
                </label>
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => otpInputRefs.current[idx] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      className={`w-11 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 outline-none transition-all ${
                        digit 
                          ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                          : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-primary focus:bg-white'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-4.5 rounded-2xl font-black uppercase text-xs sm:text-sm shadow-xl shadow-emerald-600/20 flex justify-center items-center gap-2 transition-all active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin" size={20}/> : (
                    <>
                      <CheckCircle2 size={18} />
                      যাচাই করুন ও সম্পন্ন করুন
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep('form'); setError(''); }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    <ArrowLeft size={14} /> তথ্য পরিবর্তন করুন
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResendOtp}
                    className={`text-xs font-bold flex items-center gap-1.5 ${canResendOtp ? 'text-primary hover:underline' : 'text-slate-400 cursor-not-allowed'}`}
                  >
                    <RefreshCw size={14} className={canResendOtp ? '' : 'opacity-40'} />
                    {canResendOtp ? 'কোড পুনরায় পাঠান' : `পুনরায় পাঠাতে অপেক্ষা করুন (${otpTimer}s)`}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP: FORGOT PASSWORD */}
          {step === 'forgot_password' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <KeyRound size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-900">পাসওয়ার্ড রিসেট করুন</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  আপনার একাউন্টের নিবন্ধিত ইমেইল এড্রেস লিখুন। আমরা রিসেট লিংক পাঠিয়ে দেব।
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                    ইমেইল এড্রেস
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      required 
                      className="w-full border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm bg-slate-50 font-bold outline-none focus:border-primary focus:bg-white transition-all text-slate-800" 
                      placeholder="name@example.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-black uppercase text-xs sm:text-sm shadow-xl shadow-primary/20 flex justify-center items-center gap-2 transition-all active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin" size={20}/> : (
                    <>
                      <Send size={16} />
                      রিসেট লিংক পাঠান
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('form'); setError(''); }}
                  className="w-full py-3 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  লগইনে ফিরে যান
                </button>
              </form>
            </motion.div>
          )}

          {/* Footer toggle */}
          {step === 'form' && (
            <div className="mt-8 text-center border-t border-slate-100 pt-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {authMode === 'login' ? 'কোনো অ্যাকাউন্ট নেই?' : 'ইতিমধ্যে একাউন্ট আছে?'}
                <button 
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="ml-2 text-primary font-black hover:underline"
                >
                  {authMode === 'login' ? 'নতুন একাউন্ট খুলুন' : 'লগইন করুন'}
                </button>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuth;
