
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { auth, db } from './services/firebase';
import { collection, doc, setDoc, onSnapshot, getDoc, getDocs, query, where, orderBy, limit, writeBatch, deleteDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

import { Product, Customer, Sale, Collection, Activity, Expense, ProductCategory, Staff, Supplier, RankConfig, AppRole, ProductReturn, Purchase, Attendance, LeaveRequest, Payroll, AdvanceLoan, CustomerLoan, CustomerLoanRepayment, ExpenseReimbursement, WishlistItem, AppNotification, CartItem, ShopSettings, SupplierPayment, SupplierReturn, StockEntry, ProductionBatch } from './types';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Sales from './components/Sales';
import Products from './components/Products';
import Customers from './components/Customers';
import Suppliers from './components/Suppliers';
import DuePayments from './components/DuePayments';
import Reports from './components/Reports';
import Expenses from './components/Expenses';
import Settings from './components/Settings';
import OrderApprovals from './components/OrderApprovals';
import Returns from './components/Returns';
import Employees from './components/Employees';
import PayrollModule from './components/Payroll';

import { EcommerceLayout, ShopHome, CustomerAuth, CartDrawer, CheckoutModal, CustomerProfile, ProductDetailModal, OrderDetailModal } from './components/ecommerce';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Loader2, Clock, AlertTriangle, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';

const DEFAULT_RANKS: RankConfig[] = [
  { id: 'rank-1', name: 'Bronze', minAmount: 0, level: 1, rewardDescription: 'Bronze Welcome Kit' },
  { id: 'rank-2', name: 'Silver', minAmount: 50000, level: 2, rewardDescription: 'Silver Discount Card' },
  { id: 'rank-3', name: 'Gold', minAmount: 150000, level: 3, rewardDescription: 'Gold Privilege Gift' },
  { id: 'rank-4', name: 'Platinum', minAmount: 500000, level: 4, rewardDescription: 'Platinum Home Appliance' },
  { id: 'rank-5', name: 'Diamond', minAmount: 1000000, level: 5, rewardDescription: 'Diamond Luxury Gift' }
];

const App: React.FC = () => {
  const [user, setUser] = useState<{ email: string; uid: string } | null>(null);
  const [activeStaff, setActiveStaff] = useState<Staff | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [viewMode, setViewMode] = useState<'admin' | 'shop'>('shop');
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    id: 'default',
    name: 'REST BAZER',
    phone: '017XXXXXXXX',
    email: 'info@restbazer.com',
    address: 'Savar, Dhaka, Bangladesh',
    currency: '৳',
    heroTitle: 'Quality Products for Your Daily Needs',
    heroSubtitle: 'Shop the best deals on groceries, electronics, and more.',
    heroImageUrl: 'https://picsum.photos/seed/shop/1920/1080',
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
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      setStorageAvailable(true);
    } catch (e) {
      setStorageAvailable(false);
    }
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rankConfigs, setRankConfigs] = useState<RankConfig[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSupplierList] = useState<Supplier[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([]);
  
  // E-commerce State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'overview' | 'orders' | 'wishlist' | 'notifications' | 'settings'>('overview');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
  const [shopPage, setShopPage] = useState<'home' | 'categories' | 'search'>('home');
  const [shopSearchQuery, setShopSearchQuery] = useState('');
  
  // HR & Payroll State
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loans, setLoans] = useState<AdvanceLoan[]>([]);
  const [customerLoans, setCustomerLoans] = useState<CustomerLoan[]>([]);
  const [reimbursements, setReimbursements] = useState<ExpenseReimbursement[]>([]);
  
  const [activePage, setActivePage] = useState('dashboard');

  const listenersRef = useRef<(() => void)[]>([]);
  const ownerEmail = "smsagor6980@gmail.com";

  const ensureArray = (val: any): any[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    try {
      return Object.entries(val).map(([id, data]: [string, any]) => {
        if (typeof data === 'object' && data !== null) {
          return { ...data, id: data.id || id };
        }
        return { id, value: data };
      });
    } catch (e) { return []; }
  };

  const generateId = (prefix: string = '') => {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleFirestoreError = useCallback((error: any, operationType: OperationType, path: string | null) => {
    const isUnavailable = error?.code === 'unavailable' || error?.message?.includes('unavailable') || error?.message?.includes('Could not reach Cloud Firestore backend');
    const isPermissionDenied = error?.message?.includes('permission-denied') || error?.code === 'permission-denied';
    
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };

    if (isUnavailable) {
      console.warn('Firestore offline/reconnecting: operating in cached offline mode.', { path, operationType });
      return;
    }

    console.error('Firestore Error: ', JSON.stringify(errInfo));
    if (isPermissionDenied) {
      setPermissionError(`অ্যাক্সেস অনুমোদিত নয়: ${path}`);
      throw new Error(JSON.stringify(errInfo));
    }
  }, []);

  const updateFirebase = useCallback(async (path: string, data: any, id?: string) => {
    if (!db || !user) {
      console.warn(`Update skipped: db=${!!db}, user=${!!user}`);
      return;
    }
    setIsSyncing(true);
    try {
      // Remove undefined values recursively to avoid Firestore errors
      const clean = (val: any): any => {
        if (val === undefined) return null;
        if (Array.isArray(val)) return val.map(clean);
        if (val !== null && typeof val === 'object') {
          return Object.fromEntries(
            Object.entries(val).map(([k, v]) => [k, clean(v)])
          );
        }
        return val;
      };

      const cleanData = clean(data);
      console.log(`Syncing to Firebase: ${path} ${id ? `(${id})` : ''}`, { isArray: Array.isArray(cleanData) });
      
      if (id) {
        await setDoc(doc(db, path, id), cleanData, { merge: true });
      } else if (Array.isArray(cleanData)) {
        if (cleanData.length === 0) return;
        
        const validItems = cleanData.filter(item => item && item.id);
        if (validItems.length < cleanData.length) {
          console.warn(`Some items in ${path} array are missing IDs and will not be synced individually.`);
        }

        for (let i = 0; i < validItems.length; i += 500) {
          const chunk = validItems.slice(i, i + 500);
          const batch = writeBatch(db);
          chunk.forEach((item) => {
            const docRef = doc(db, path, item.id);
            batch.set(docRef, item, { merge: true });
          });
          await batch.commit();
        }
      } else if (cleanData && typeof cleanData === 'object' && cleanData.id) {
        await setDoc(doc(db, path, cleanData.id), cleanData, { merge: true });
      } else {
        // Fallback for document paths or objects without ID
        const pathSegments = path.split('/').filter(Boolean);
        if (pathSegments.length % 2 === 0) {
          await setDoc(doc(db, path), cleanData, { merge: true });
        } else {
          console.error(`Update failed: Collection path ${path} provided without document ID or data doesn't have an 'id' field.`);
          throw new Error(`Cannot sync to ${path}: Missing ID`);
        }
      }
      console.log(`Sync successful for ${path}`);
    } catch (err: any) {
      console.error(`Sync error for ${path}:`, err);
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally { setIsSyncing(false); }
  }, [user, handleFirestoreError]);

  const deleteFirebase = useCallback(async (path: string, id: string) => {
    if (!db || !user) return;
    setIsSyncing(true);
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
    } finally { setIsSyncing(false); }
  }, [user, handleFirestoreError]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Consolidate activeStaff and permissions logic
  useEffect(() => {
    if (user) {
      const isOwner = user.email === ownerEmail;
      const emailLower = user.email.toLowerCase();
      
      const currentStaffData = staff.find(s => s.id === user.uid || (s.email && s.email.toLowerCase() === emailLower));
      const currentCustomerData = customers.find(c => c.uid === user.uid || (c.email && c.email.toLowerCase() === emailLower));

      if (isOwner) {
        setIsAdminSession(true);
        setPermissionError(null);
        if (currentStaffData) {
          setActiveStaff(currentStaffData);
        } else {
          setActiveStaff(prev => {
            if (prev && prev.email === user.email && prev.id === user.uid) return prev;
            return {
              id: user.uid,
              uid: user.uid,
              name: 'Owner',
              email: user.email,
              phone: '',
              designation: 'Owner',
              status: 'active',
              isApproved: true,
              joinedDate: new Date().toISOString()
            };
          });
        }
      } else if (currentStaffData) {
        setActiveStaff(currentStaffData);
        const isPrivileged = ['Admin', 'Owner', 'Manager'].includes(currentStaffData.designation);
        setIsAdminSession(isPrivileged);
        
        if (!currentStaffData.isApproved) {
          setPermissionError("আপনার একাউন্টটি এখনো অনুমোদিত হয়নি। এডমিনের অনুমোদনের জন্য অপেক্ষা করুন।");
        } else {
          setPermissionError(null);
        }
      } else {
        // Not a staff member
        setIsAdminSession(false);
        setActiveStaff(null);
      }

      if (currentCustomerData) {
        setActiveCustomer(currentCustomerData);
      } else {
        setActiveCustomer(null);
      }
    }
  }, [staff, customers, user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 3000);

    const safetyTimer = setTimeout(() => {
      console.warn("Bypassing splash screen automatically due to initialization delay");
      setLoading(false);
    }, 5000);
    
    if (!auth) { 
      console.error("Firebase Auth not initialized!");
      setLoading(false); 
      clearTimeout(timer);
      clearTimeout(safetyTimer);
      return; 
    }
    
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
      listenersRef.current.forEach(u => u());
      listenersRef.current = [];
      setPermissionError(null);
      setLoading(true);
      setLoadingTimeout(false);
      
      if (db) {
        try {
          // 1. Load Public Data
          const publicSchema = [
            { path: 'products', setter: setProducts },
            { path: 'categories', setter: setCategories },
            { path: 'ranks', setter: (v: any) => setRankConfigs(ensureArray(v).length > 0 ? v : DEFAULT_RANKS) },
            { path: 'settings', setter: (v: any) => v && setShopSettings(v) },
          ];

          publicSchema.forEach(({ path, setter }) => {
            const colRef = collection(db, path);
            const unsubscribe = onSnapshot(colRef, (snapshot) => {
              const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
              if (path === 'settings') {
                const config = data.find(d => d.id === 'config') || data[0];
                if (config) setter(config);
              } else {
                setter(ensureArray(data));
              }
            }, (err) => {
              console.warn(`Initial public load error for ${path}:`, err.message);
            });
            listenersRef.current.push(unsubscribe);
          });

          if (currentUser) {
            const email = (currentUser.email || '').toLowerCase();
            setUser({ email, uid: currentUser.uid });
            const isOwner = email === ownerEmail;
            if (isOwner) setIsAdminSession(true);

            // 2. Load staff list (Attempt - might fail for non-staff, handle silently)
            const staffUnsubscribe = onSnapshot(collection(db, 'staff'), (snap) => {
              const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
              setStaff(data as Staff[]);
            }, (err) => {
              console.warn("Staff list sync limited or restricted.");
            });
            listenersRef.current.push(staffUnsubscribe);

            if (isOwner) {
              setViewMode('admin');
              const adminCollections = [
                { path: 'roles', setter: setRoles },
                { path: 'customers', setter: setCustomers },
                { path: 'suppliers', setter: setSupplierList },
                { path: 'supplier_payments', setter: setSupplierPayments },
                { path: 'sales', setter: (v: any) => setSales(ensureArray(v).sort((a: any, b: any) => (b.id || '').localeCompare(a.id || ''))) },
                { path: 'purchases', setter: (v: any) => setPurchases(ensureArray(v).sort((a: any, b: any) => (b.id || '').localeCompare(a.id || ''))) },
                { path: 'collections', setter: setCollections },
                { path: 'expenses', setter: setExpenses },
                { path: 'activities', setter: (v: any) => setActivities(ensureArray(v).slice(0, 100)) },
                { path: 'returns', setter: setReturns },
                { path: 'attendances', setter: setAttendances },
                { path: 'leaves', setter: setLeaves },
                { path: 'payrolls', setter: setPayrolls },
                { path: 'loans', setter: setLoans },
                { path: 'customer_loans', setter: setCustomerLoans },
                { path: 'reimbursements', setter: setReimbursements },
                { path: 'stock_entries', setter: setStockEntries },
                { path: 'production_batches', setter: setProductionBatches },
              ];

              adminCollections.forEach(({ path, setter }) => {
                const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
                  setter(ensureArray(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
                }, (err) => {
                  console.warn(`Admin data error for ${path}:`, err.message);
                });
                listenersRef.current.push(unsubscribe);
              });
              setLoading(false);
            } else {
              // Limited view for customers (standard non-blocking path)
              setViewMode('shop');
              const customerUnsubscribe = onSnapshot(doc(db, 'customers', currentUser.uid), (snap) => {
                const data = snap.data() as Customer;
                if (data) {
                  setActiveCustomer(data);
                  setCustomers([data]);
                }
              }, (err) => {
                console.warn("Customer profile restricted.");
              });
              listenersRef.current.push(customerUnsubscribe);

              const salesQuery = query(collection(db, 'sales'), where('customerId', '==', currentUser.uid));
              const salesUnsubscribe = onSnapshot(salesQuery, (snapshot) => {
                setSales(ensureArray(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
              }, (err) => {
                console.warn("Customer sales restricted.");
              });
              listenersRef.current.push(salesUnsubscribe);

              // Real-time listener for the current user's specific staff record
              let adminSubscribed = false;
              const staffSelfUnsubscribe = onSnapshot(doc(db, 'staff', currentUser.uid), async (snap) => {
                try {
                  if (snap.exists()) {
                    const foundStaff = snap.data() as Staff;
                    
                    // Set the staff state so the consolidation and components work correctly
                    setStaff(prev => {
                      if (prev.some(s => s.id === foundStaff.id)) {
                        return prev.map(s => s.id === foundStaff.id ? foundStaff : s);
                      }
                      return [...prev, foundStaff];
                    });

                    if (foundStaff.isApproved) {
                      setActiveStaff(foundStaff);
                      const isPrivileged = ['Admin', 'Owner', 'Manager'].includes(foundStaff.designation);
                      setIsAdminSession(isPrivileged);
                      setViewMode('admin');
                      setPermissionError(null);

                      // Subscribe to administrative collections if not already done
                      if (!adminSubscribed) {
                        adminSubscribed = true;
                        const adminCollections = [
                          { path: 'roles', setter: setRoles },
                          { path: 'customers', setter: setCustomers },
                          { path: 'suppliers', setter: setSupplierList },
                          { path: 'supplier_payments', setter: setSupplierPayments },
                          { path: 'sales', setter: (v: any) => setSales(ensureArray(v).sort((a: any, b: any) => (b.id || '').localeCompare(a.id || ''))) },
                          { path: 'purchases', setter: (v: any) => setPurchases(ensureArray(v).sort((a: any, b: any) => (b.id || '').localeCompare(a.id || ''))) },
                          { path: 'collections', setter: setCollections },
                          { path: 'expenses', setter: setExpenses },
                          { path: 'activities', setter: (v: any) => setActivities(ensureArray(v).slice(0, 100)) },
                          { path: 'returns', setter: setReturns },
                          { path: 'attendances', setter: setAttendances },
                          { path: 'leaves', setter: setLeaves },
                          { path: 'payrolls', setter: setPayrolls },
                          { path: 'loans', setter: setLoans },
                          { path: 'customer_loans', setter: setCustomerLoans },
                          { path: 'reimbursements', setter: setReimbursements },
                          { path: 'stock_entries', setter: setStockEntries },
                          { path: 'supplier_returns', setter: setSupplierReturns },
                        ];

                        adminCollections.forEach(({ path, setter }) => {
                          const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
                            setter(ensureArray(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
                          }, (err) => {
                            console.warn(`Admin data error for ${path}:`, err.message);
                          });
                          listenersRef.current.push(unsubscribe);
                        });
                      }
                    } else {
                      // Check if there's another document under a different ID (e.g. STAFF-xxxx) that is approved
                      let mergedApproved = false;
                      if (currentUser.email) {
                        try {
                          const emailLower = currentUser.email.toLowerCase();
                          const q = query(collection(db, 'staff'), where('email', '==', emailLower));
                          const querySnap = await getDocs(q);
                          const approvedDoc = querySnap.docs.find(d => d.id !== currentUser.uid && d.data().isApproved);
                          if (approvedDoc) {
                            const approvedData = approvedDoc.data() as Staff;
                            const linkedStaff = {
                              ...approvedData,
                              id: currentUser.uid,
                              uid: currentUser.uid,
                              isApproved: true,
                              status: approvedData.status
                            };
                            await setDoc(doc(db, 'staff', currentUser.uid), linkedStaff);
                            try {
                              await deleteDoc(doc(db, 'staff', approvedDoc.id));
                            } catch (delErr) {
                              console.warn("Could not delete old approved doc:", delErr);
                            }
                            mergedApproved = true;
                          }
                        } catch (err) {
                          console.warn("Error looking up alternative approved staff record:", err);
                        }
                      }
                      
                      if (!mergedApproved) {
                        setPermissionError("আপনার একাউন্টটি এখনো অনুমোদিত হয়নি। এডমিনের অনুমোদনের জন্য অপেক্ষা করুন।");
                      }
                    }
                  } else {
                    // Fallback: If not found by UID directly, search by email to find any pre-configured record
                    if (currentUser.email) {
                      try {
                        const emailLower = currentUser.email.toLowerCase();
                        const q = query(collection(db, 'staff'), where('email', '==', emailLower));
                        const querySnap = await getDocs(q);
                        if (!querySnap.empty) {
                          const matchedDoc = querySnap.docs.find(d => d.data().isApproved) || querySnap.docs[0];
                          if (matchedDoc.id !== currentUser.uid) {
                            const staffData = matchedDoc.data() as Staff;
                            const linkedStaff = { 
                              ...staffData, 
                              id: currentUser.uid, 
                              uid: currentUser.uid,
                              isApproved: staffData.isApproved,
                              status: staffData.status
                            };
                            // Link user to the correct pre-created staff doc path
                            await setDoc(doc(db, 'staff', currentUser.uid), linkedStaff);
                            
                            // Clean up the duplicate pre-created STAFF-... document
                            try {
                              await deleteDoc(doc(db, 'staff', matchedDoc.id));
                            } catch (delErr) {
                              console.warn("Could not delete old staff document:", delErr);
                            }
                          }
                        }
                      } catch (qErr) {
                        console.warn("Searching staff by email failed:", qErr);
                      }
                    }
                  }
                } catch (snapErr) {
                  console.warn("Error processing staff listener update:", snapErr);
                }
              }, (err) => {
                console.warn("Self-staff profile snapshot failed:", err);
              });
              listenersRef.current.push(staffSelfUnsubscribe);

              setLoading(false);
            }
          } else {
            setUser(null);
            setActiveStaff(null);
            setActiveCustomer(null);
            setIsAdminSession(false);
            setViewMode('shop');
            setLoading(false);
          }
        } catch (err) {
          console.error("Critical Data Context Failure:", err);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      listenersRef.current.forEach(u => u());
    };
  }, []);

  const handleUpdate = async (type: string, data: any) => {
    // Optimistic Update for better UX
    if (type === 'products') {
      const items = Array.isArray(data) ? data : [data];
      setProducts(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(p => p.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.unshift({ ...item }); // unshift new products
        });
        return next;
      });
    } else if (type === 'categories') {
      const items = Array.isArray(data) ? data : [data];
      setCategories(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(c => c.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
    } else if (type === 'attendances') {
      const items = Array.isArray(data) ? data : [data];
      setAttendances(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(a => a.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
    } else if (type === 'leaves') {
      const items = Array.isArray(data) ? data : [data];
      setLeaves(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(l => l.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
    } else if (type === 'customers') {
      const items = Array.isArray(data) ? data : [data];
      setCustomers(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(c => c.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
      // Also update activeCustomer if applicable
      const updatedActive = items.find(item => item.id === activeCustomer?.id);
      if (updatedActive) {
        setActiveCustomer(prev => prev ? { ...prev, ...updatedActive } : null);
      }
    } else if (type === 'staff') {
      const items = Array.isArray(data) ? data : [data];
      setStaff(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(s => s.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
    } else if (type === 'sales') {
      const items = Array.isArray(data) ? data : [data];
      setSales(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(s => s.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.unshift({ ...item });
        });
        return next;
      });
    } else if (type === 'purchases') {
      const items = Array.isArray(data) ? data : [data];
      setPurchases(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(p => p.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.unshift({ ...item });
        });
        return next;
      });
    } else if (type === 'suppliers') {
      const items = Array.isArray(data) ? data : [data];
      setSupplierList(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(s => s.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
    } else if (type === 'payrolls') {
      const items = Array.isArray(data) ? data : [data];
      setPayrolls(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(p => p.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
    } else if (type === 'loans') {
      const items = Array.isArray(data) ? data : [data];
      setLoans(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(l => l.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
    } else if (type === 'customer_loans') {
      const items = Array.isArray(data) ? data : [data];
      setCustomerLoans(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(l => l.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.unshift({ ...item });
        });
        return next;
      });
    } else if (type === 'reimbursements') {
      const items = Array.isArray(data) ? data : [data];
      setReimbursements(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(r => r.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
    } else if (type === 'roles') {
      const items = Array.isArray(data) ? data : [data];
      setRoles(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(r => r.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
    } else if (type === 'ranks') {
      const items = Array.isArray(data) ? data : [data];
      setRankConfigs(prev => {
        const next = [...prev];
        items.forEach(item => {
          const idx = next.findIndex(r => r.id === item.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...item };
          else next.push({ ...item });
        });
        return next;
      });
    }

    try {
      await updateFirebase(type, data);
    } catch (err: any) {
      console.error(`Update failed for ${type}:`, err);
      // If it's a permission error, updateFirebase/handleFirestoreError already handles it by showing the error screen
      // For other errors, we might want to alert the user
       if (!err.message.includes('permission-denied')) {
         alert(`ডেটা সেভ করা সম্ভব হয়নি। এরর: ${err.message || 'Unknown Error'}`);
       }
       throw err;
    }
  };

  const handleDelete = (type: string, id: string) => {
    if (type === 'staff') {
      setStaff(prev => prev.filter(s => s.id !== id));
    } else if (type === 'products') {
      setProducts(prev => prev.filter(p => p.id !== id));
    } else if (type === 'customers') {
      setCustomers(prev => prev.filter(c => c.id !== id));
    } else if (type === 'suppliers') {
      setSupplierList(prev => prev.filter(s => s.id !== id));
    } else if (type === 'categories') {
      setCategories(prev => prev.filter(c => c.id !== id));
    } else if (type === 'sales') {
      setSales(prev => prev.filter(s => s.id !== id));
    } else if (type === 'expenses') {
      setExpenses(prev => prev.filter(e => e.id !== id));
    } else if (type === 'payrolls') {
      setPayrolls(prev => prev.filter(p => p.id !== id));
    } else if (type === 'loans') {
      setLoans(prev => prev.filter(l => l.id !== id));
    } else if (type === 'customer_loans') {
      setCustomerLoans(prev => prev.filter(l => l.id !== id));
    } else if (type === 'reimbursements') {
      setReimbursements(prev => prev.filter(r => r.id !== id));
    } else if (type === 'activities') {
      setActivities(prev => prev.filter(a => a.id !== id));
    } else if (type === 'production_batches') {
      setProductionBatches(prev => prev.filter(b => b.id !== id));
    }
    deleteFirebase(type, id);
  };

  const handleProductionBatchComplete = (newBatch: ProductionBatch, updatedProducts: Product[], newEntries: StockEntry[]) => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      type: 'stock_update',
      title: `উৎপাদন ব্যাচ: #${newBatch.batchNo}`,
      description: `${newBatch.producedQuantity} ${newBatch.unit} ${newBatch.producedProductName} তৈরি করা হয়েছে। কাঁচামাল স্টক সমন্বয় হয়েছে।`,
      amount: newBatch.totalProducedValue,
      date: newBatch.date,
      addedBy: activeStaff?.id
    };

    setProductionBatches(prev => [newBatch, ...prev]);
    setProducts(updatedProducts);
    setStockEntries(prev => [...newEntries, ...prev]);
    setActivities(prev => [newActivity, ...prev].slice(0, 100));

    updateFirebase('production_batches', newBatch);
    updateFirebase('activities', newActivity);
    newEntries.forEach(entry => updateFirebase('stock_entries', entry));
    
    // Sync changed products
    const changedProducts = updatedProducts.filter(p => {
      const original = products.find(o => o.id === p.id);
      return original && original.stock !== p.stock;
    });
    if (changedProducts.length > 0) {
      updateFirebase('products', changedProducts);
    }
  };

  const handleSaleComplete = (newSale: Sale, updatedProducts: Product[], updatedCustomers: Customer[]) => {
    const designation = activeStaff?.designation || 'Salesman';
    const isOwner = user?.email === ownerEmail;
    const isPrivileged = isOwner || ['Admin', 'Owner', 'Manager'].includes(designation);
    
    const isApprovalRequired = !isPrivileged;
    const saleStatus: Sale['status'] = isApprovalRequired ? 'pending' : 'approved';
    const saleData: Sale = { 
      ...newSale, 
      status: saleStatus, 
      soldBy: activeStaff?.name || 'Unknown',
      soldById: activeStaff?.id
    };

    const newActivity: Activity = {
      id: Date.now().toString(),
      type: 'sale',
      title: `${saleStatus === 'pending' ? 'অর্ডার' : 'বিক্রয়'}: #${newSale.invoiceNo}`,
      description: `${newSale.items.length}টি পণ্য ${saleStatus === 'pending' ? 'অর্ডার করেছেন' : 'বিক্রয় হয়েছে'}`,
      amount: newSale.total,
      date: newSale.date,
      addedBy: activeStaff?.id
    };
    
    setSales(prev => [saleData, ...prev]);
    setActivities(prev => [newActivity, ...prev].slice(0, 100));

    // Surgical updates
    updateFirebase('sales', saleData);
    updateFirebase('activities', newActivity);

    if (!isApprovalRequired) {
      setProducts(updatedProducts);
      setCustomers(updatedCustomers);
      
      const changedProducts = newSale.items.map(item => 
        updatedProducts.find(p => p.id === item.productId)
      ).filter(Boolean);
      
      const changedCustomer = updatedCustomers.find(c => c.id === newSale.customerId);

      if (changedProducts.length > 0) updateFirebase('products', changedProducts);
      if (changedCustomer) updateFirebase('customers', changedCustomer);
    }
  };

  const handleProcessSplitDelivery = (
    deliveredSale: Sale,
    newUndeliveredSale: Sale | null,
    updatedProducts: Product[],
    updatedCustomers: Customer[]
  ) => {
    // 1. Update sales state and Firebase
    setSales(prev => {
      let next = prev.map(s => s.id === deliveredSale.id ? deliveredSale : s);
      if (newUndeliveredSale && !next.some(s => s.id === newUndeliveredSale.id)) {
        next = [newUndeliveredSale, ...next];
      }
      return next;
    });
    updateFirebase('sales', deliveredSale);
    if (newUndeliveredSale) {
      updateFirebase('sales', newUndeliveredSale);
    }

    // 2. Update products state and Firebase
    setProducts(updatedProducts);
    const affectedProductIds = new Set(deliveredSale.items.map(i => i.productId));
    const changedProducts = updatedProducts.filter(p => affectedProductIds.has(p.id));
    if (changedProducts.length > 0) {
      updateFirebase('products', changedProducts);
    }

    // 3. Update customers state and Firebase
    setCustomers(updatedCustomers);
    const changedCustomer = updatedCustomers.find(c => c.id === deliveredSale.customerId);
    if (changedCustomer) {
      updateFirebase('customers', changedCustomer);
    }

    // 4. Log Activity
    const newActivity: Activity = {
      id: Date.now().toString(),
      type: 'delivery',
      title: `ডেলিভারি ও চালান: #${deliveredSale.invoiceNo}`,
      description: newUndeliveredSale 
        ? `ইনভয়েস #${deliveredSale.invoiceNo} আংশিক ডেলিভারি দেওয়া হয়েছে এবং অবশিষ্ট পণ্যের জন্য নতুন অনডেলিভারী চালান #${newUndeliveredSale.invoiceNo} তৈরি করা হয়েছে।`
        : `ইনভয়েস #${deliveredSale.invoiceNo} পণ্য ডেলিভারি সম্পন্ন হয়েছে।`,
      amount: deliveredSale.total,
      date: new Date().toISOString(),
      addedBy: activeStaff?.id
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 100));
    updateFirebase('activities', newActivity);
  };

  const handlePurchaseComplete = (newPurchase: Purchase, updatedSuppliers: Supplier[], updatedProducts: Product[]) => {
    if (!isAdminSession) return;
    
    const newActivity: Activity = {
      id: Date.now().toString(),
      type: 'purchase',
      title: `পণ্য ক্রয়: #${newPurchase.purchaseNo}`,
      description: `${newPurchase.items.length}টি পণ্য সাপ্লায়ার থেকে ক্রয় করা হয়েছে। স্টক আপডেট করা হয়েছে।`,
      amount: newPurchase.total,
      date: newPurchase.date,
      addedBy: activeStaff?.id
    };
    
    setPurchases(prev => [newPurchase, ...prev]);
    setSupplierList(updatedSuppliers);
    setProducts(updatedProducts);
    setActivities(prev => [newActivity, ...prev].slice(0, 100));

    // Record initial payment if any
    if (newPurchase.paid > 0) {
      const newPayment: SupplierPayment = {
        id: `PAY-${Date.now()}`,
        supplierId: newPurchase.supplierId,
        amount: newPurchase.paid,
        method: 'Initial Payment',
        date: newPurchase.date,
        note: `Purchase #${newPurchase.purchaseNo}`,
        addedBy: activeStaff?.id
      };
      setSupplierPayments(prev => [newPayment, ...prev]);
      updateFirebase('supplier_payments', newPayment);
    }

    // Surgical updates
    updateFirebase('purchases', newPurchase);
    updateFirebase('activities', newActivity);
    
    const changedSupplier = updatedSuppliers.find(s => s.id === newPurchase.supplierId);
    if (changedSupplier) updateFirebase('suppliers', changedSupplier);

    const changedProducts = newPurchase.items.map(item => 
      updatedProducts.find(p => p.id === item.productId)
    ).filter(Boolean);
    if (changedProducts.length > 0) updateFirebase('products', changedProducts);
  };

  const handleReturn = (ret: ProductReturn) => {
    const returnWithAuthor = { ...ret, addedBy: activeStaff?.id };
    setReturns(prev => [returnWithAuthor, ...prev]);
    updateFirebase('returns', returnWithAuthor);

    const targetProduct = products.find(p => p.id === ret.productId);
    if (targetProduct) {
      const updatedProduct = { ...targetProduct, stock: targetProduct.stock + ret.quantity };
      setProducts(prev => prev.map(p => p.id === ret.productId ? updatedProduct : p));
      updateFirebase('products', updatedProduct);
    }

    const newActivity: Activity = {
      id: generateId('ACT-'),
      type: 'return',
      title: `${ret.type === 'damage' ? 'ড্যামেজ' : 'রিটার্ন'}: ${ret.productName}`,
      description: `${ret.quantity}টি পণ্য ফেরত এসেছে।`,
      amount: ret.amount,
      date: ret.date,
      addedBy: activeStaff?.id
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 100));
    updateFirebase('activities', newActivity);
  };

  const handleSupplierReturn = (ret: SupplierReturn, updatedSuppliers: Supplier[], updatedProducts: Product[]) => {
    const returnWithAuthor = { ...ret, addedBy: activeStaff?.id };
    setSupplierReturns(prev => [returnWithAuthor, ...prev]);
    setSupplierList(updatedSuppliers);
    setProducts(updatedProducts);

    updateFirebase('supplier_returns', returnWithAuthor);

    const changedSupplier = updatedSuppliers.find(s => s.id === ret.supplierId);
    if (changedSupplier) updateFirebase('suppliers', changedSupplier);

    const changedProduct = updatedProducts.find(p => p.id === ret.productId);
    if (changedProduct) updateFirebase('products', changedProduct);

    const newActivity: Activity = {
      id: generateId('ACT-'),
      type: 'return',
      title: `সাপ্লায়ার পণ্য ফেরত: ${ret.productName}`,
      description: `${ret.quantity}টি পণ্য সাপ্লায়ারের নিকট ফেরত দেওয়া হয়েছে। পরিমাণ: ৳${ret.totalAmount}`,
      amount: ret.totalAmount,
      date: ret.date,
      addedBy: activeStaff?.id
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 100));
    updateFirebase('activities', newActivity);
  };

  const handleUpdateShopSettings = (settings: any) => {
    setShopSettings(settings);
    updateFirebase('settings', settings, 'config');
  };

  const handleBackupData = useCallback(() => {
    const data = {
      products,
      categories,
      customers,
      suppliers,
      sales,
      purchases,
      collections,
      expenses,
      staff,
      roles,
      rankConfigs,
      shopSettings,
      activities,
      backupDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rest-bazer-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [products, categories, customers, suppliers, sales, purchases, collections, expenses, staff, roles, rankConfigs, shopSettings, activities]);

  const handleRestoreData = async (jsonData: any) => {
    if (!db || !isAdminSession) return;
    
    try {
      setIsSyncing(true);
      
      const collectionsToRestore = [
        { key: 'products', data: jsonData.products },
        { key: 'categories', data: jsonData.categories },
        { key: 'customers', data: jsonData.customers },
        { key: 'suppliers', data: jsonData.suppliers },
        { key: 'sales', data: jsonData.sales },
        { key: 'purchases', data: jsonData.purchases },
        { key: 'collections', data: jsonData.collections },
        { key: 'expenses', data: jsonData.expenses },
        { key: 'staff', data: jsonData.staff },
        { key: 'roles', data: jsonData.roles },
        { key: 'ranks', data: jsonData.rankConfigs || jsonData.ranks },
        { key: 'activities', data: jsonData.activities }
      ];

      for (const col of collectionsToRestore) {
        if (col.data && Array.isArray(col.data)) {
          await updateFirebase(col.key, col.data);
        }
      }

      if (jsonData.shopSettings) {
        await updateFirebase('settings', jsonData.shopSettings, 'config');
      }

      alert('ডেটা সফলভাবে রিস্টোর করা হয়েছে। পেজটি রিলোড হবে।');
      window.location.reload();
    } catch (error) {
      console.error("Restore failed:", error);
      alert('রিস্টোর করতে সমস্যা হয়েছে। অনুগ্রহ করে ফাইলটি চেক করুন।');
    } finally {
      setIsSyncing(false);
    }
  };

  // E-commerce Handlers
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice } : item);
      }
      const newItem: CartItem = {
        id: Date.now().toString(),
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        quantity: 1,
        unitPrice: product.salePrice,
        purchasePrice: product.purchasePrice,
        total: product.salePrice,
        priceType: 'retail'
      };
      return [...prev, newItem];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number, absoluteQty?: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = absoluteQty !== undefined ? Math.max(0, absoluteQty) : Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty, total: newQty * item.unitPrice };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleAddToWishlist = (product: Product) => {
    if (!activeCustomer) {
      alert("উইশলিস্টে যোগ করতে লগইন করুন।");
      return;
    }
    const currentWishlist = activeCustomer.wishlist || [];
    let updatedWishlist;
    if (currentWishlist.some(w => w.productId === product.id)) {
      updatedWishlist = currentWishlist.filter(w => w.productId !== product.id);
    } else {
      const newItem: WishlistItem = { id: Date.now().toString(), productId: product.id, dateAdded: new Date().toISOString() };
      updatedWishlist = [...currentWishlist, newItem];
    }
    const updatedCustomer = { ...activeCustomer, wishlist: updatedWishlist };
    setActiveCustomer(updatedCustomer);
    const updatedCustomers = customers.map(c => c.id === activeCustomer.id ? updatedCustomer : c);
    setCustomers(updatedCustomers);
    updateFirebase('customers', updatedCustomer, activeCustomer.id);
  };

  const handlePlaceOrder = async (orderData: any) => {
    if (!db) return;
    
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const newSale: Sale = {
      id: Date.now().toString(),
      invoiceNo,
      customerId: activeCustomer?.id || null,
      customerType: 'retail',
      date: new Date().toISOString(),
      items: cart,
      subTotal: orderData.subtotal,
      discount: 0,
      vat: 0,
      total: orderData.total,
      paid: 0,
      due: orderData.total,
      tendered: 0,
      change: 0,
      paymentMethod: orderData.paymentMethod,
      notes: orderData.notes,
      status: 'pending',
      soldBy: 'Online Customer',
      customerName: orderData.name,
      customerPhone: orderData.phone,
      customerAddress: orderData.address
    };

    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    await updateFirebase('sales', newSale, newSale.id);

    // Update product stock - only for items in cart
    const itemsToUpdate = (cart.map(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        return { ...p, stock: Math.max(0, (Number(p.stock) || 0) - item.quantity) };
      }
      return null;
    }).filter(p => p !== null) as Product[]);

    if (itemsToUpdate.length > 0) {
      const updatedProducts = products.map(p => {
        const updated = itemsToUpdate.find(u => u.id === p.id);
        return updated || p;
      });
      setProducts(updatedProducts);
      await updateFirebase('products', itemsToUpdate);
    }

    // Add activity
    const newActivity: Activity = {
      id: Date.now().toString(),
      type: 'sale',
      title: `অনলাইন অর্ডার: #${invoiceNo}`,
      description: `${orderData.name} এর কাছ থেকে ${cart.length}টি পণ্যের অর্ডার।`,
      amount: orderData.total,
      date: new Date().toISOString()
    };
    const updatedActivities = [newActivity, ...activities].slice(0, 100);
    setActivities(updatedActivities);
    await updateFirebase('activities', newActivity, newActivity.id);

    setCart([]);
  };

  const handleConfirmOrder = (order: Sale) => {
    const updatedOrder = { ...order, status: 'approved' as const };
    const updatedSales = sales.map(s => s.id === order.id ? updatedOrder : s);
    setSales(updatedSales);
    updateFirebase('sales', updatedOrder, order.id);
  };

  if (loading) return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center text-white relative overflow-hidden p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)] animate-pulse"></div>
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-[32px] flex items-center justify-center mb-8 border border-white/20 shadow-2xl animate-bounce">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-[0.3em] mb-2">REST BAZER</h1>
        <div className="flex items-center gap-3 mb-8">
          <div className="h-[1px] w-8 bg-white/30"></div>
          <p className="text-[10px] font-black uppercase tracking-[4px] text-white/60">System Initializing</p>
          <div className="h-[1px] w-8 bg-white/30"></div>
        </div>

        {loadingTimeout && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            {!isOnline && (
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-widest mb-2">
                <AlertTriangle size={14} /> আপনি অফলাইনে আছেন
              </div>
            )}
            {!storageAvailable && (
              <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-center mb-4">
                <p className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">Storage is disabled. Auth might not persist.</p>
              </div>
            )}
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest">লোড হতে সময় নিচ্ছে?</p>
            <button 
              onClick={() => setLoading(false)}
              className="bg-white text-primary px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all flex items-center gap-2"
            >
              সরাসরি অ্যাপে যান <ArrowRight size={16} />
            </button>
            <p className="text-[10px] text-white/40 mt-2">ইন্টারনেট কানেকশন চেক করুন</p>
          </motion.div>
        )}
      </div>
      <div className="absolute bottom-12 text-[9px] font-black uppercase tracking-[2px] opacity-30">© 2026 REST BAZER • Enterprise Edition</div>
    </div>
  );

  // 4. Admin Login View
  const isPrivileged = isAdminSession || !!activeStaff;
  if (viewMode === 'admin' && (!user || !isPrivileged)) {
    return <Auth isOnline={isOnline} onSetAdminMode={setIsAdminSession} onStaffLogin={setActiveStaff} onSwitchToShop={() => setViewMode('shop')} />;
  }

  if (viewMode === 'shop') {
    return (
      <EcommerceLayout
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        wishlistCount={(activeCustomer?.wishlist || []).length}
        notificationCount={(activeCustomer?.notifications || []).filter(n => n.status === 'unread').length}
        onSearch={(q) => { 
          setShopSearchQuery(q);
          setShopPage('search'); 
        }}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => { 
          setProfileTab('wishlist');
          setIsProfileOpen(true);
        }}
        onOpenProfile={() => {
          setProfileTab('overview');
          setIsProfileOpen(true);
        }}
        onOpenNotifications={() => {
          if (activeCustomer) {
            setProfileTab('notifications');
            setIsProfileOpen(true);
          }
        }}
        onGoHome={() => setShopPage('home')}
        onGoCategories={() => setShopPage('categories')}
        onLogout={() => { auth?.signOut(); setActiveCustomer(null); }}
        customerName={activeCustomer?.name}
        isAdmin={isAdminSession || !!activeStaff}
        onSwitchToAdmin={() => setViewMode('admin')}
        shopSettings={shopSettings}
      >
        {shopSettings?.shopStatus === 'closed' && !isAdminSession && !activeStaff && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 text-center">
            <div className="max-w-md">
              <div className="w-24 h-24 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <Clock size={48} />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter mb-4 uppercase">শপ বর্তমানে বন্ধ আছে</h2>
              <p className="text-slate-400 font-bold text-lg mb-10 leading-relaxed">
                দুঃখিত, আমাদের শপ বর্তমানে সাময়িকভাবে বন্ধ আছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।
              </p>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <p className="text-xs font-black text-white/40 uppercase tracking-[4px] mb-2">যোগাযোগ</p>
                <p className="text-white font-bold">{shopSettings?.phone || 'আমাদের সাথে যোগাযোগ করুন'}</p>
              </div>
            </div>
          </div>
        )}
        {!activeCustomer && (isCheckoutOpen || isProfileOpen) ? (
          <CustomerAuth onSuccess={(c) => { setActiveCustomer(c); }} onBack={() => { setIsCheckoutOpen(false); setIsProfileOpen(false); }} />
        ) : (
          <>
            <ShopHome 
              products={products}
              categories={categories}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleAddToWishlist}
              onViewDetails={setSelectedProduct}
              cartItems={cart}
              wishlist={activeCustomer?.wishlist || []}
              onUpdateCartQuantity={handleUpdateCartQuantity}
              shopPage={shopPage}
              externalSearchQuery={shopSearchQuery}
              shopSettings={shopSettings}
            />

            <CartDrawer 
              isOpen={isCartOpen}
              onClose={() => setIsCartOpen(false)}
              items={cart}
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemoveItem={handleRemoveFromCart}
              onCheckout={() => { 
                setIsCartOpen(false); 
                if (!activeCustomer) {
                  setIsCheckoutOpen(true);
                } else {
                  setIsCheckoutOpen(true);
                }
              }}
            />

            <CheckoutModal 
              isOpen={isCheckoutOpen}
              onClose={() => setIsCheckoutOpen(false)}
              items={cart}
              customer={activeCustomer}
              onPlaceOrder={handlePlaceOrder}
            />

            <ProductDetailModal 
              product={selectedProduct}
              isOpen={!!selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleAddToWishlist}
              isInWishlist={activeCustomer?.wishlist?.some(w => w.productId === selectedProduct?.id)}
              isInCart={cart.some(item => item.productId === selectedProduct?.id)}
              cartQuantity={cart.find(item => item.productId === selectedProduct?.id)?.quantity}
              onUpdateCartQuantity={handleUpdateCartQuantity}
            />

            <AnimatePresence>
              {selectedOrder && (
                <OrderDetailModal
                  order={selectedOrder}
                  products={products}
                  onClose={() => setSelectedOrder(null)}
                  shopSettings={shopSettings}
                />
              )}
            </AnimatePresence>

            {isProfileOpen && activeCustomer && (
              <CustomerProfile 
                customer={activeCustomer}
                orders={sales.filter(s => s.customerId === activeCustomer.id)}
                wishlist={activeCustomer.wishlist || []}
                notifications={activeCustomer.notifications || []}
                products={products}
                rankConfigs={rankConfigs}
                shopSettings={shopSettings}
                initialTab={profileTab}
                onLogout={() => { auth?.signOut(); setActiveCustomer(null); setIsProfileOpen(false); }}
                onClose={() => setIsProfileOpen(false)}
                onViewOrder={(order) => {
                  setSelectedOrder(order);
                }}
                onConfirmOrder={handleConfirmOrder}
                onRemoveFromWishlist={handleAddToWishlist}
                onAddToCart={handleAddToCart}
                onUpdateCustomer={(data) => handleUpdate('customers', data)}
              />
            )}
          </>
        )}
      </EcommerceLayout>
    );
  }

  if (permissionError) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md bg-white p-10 rounded-[40px] shadow-2xl border border-rose-100">
        <Clock size={64} className="text-amber-500 mx-auto mb-6 animate-pulse" />
        <h2 className="text-2xl font-black text-slate-800 mb-4">অ্যাক্সেস সমস্যা</h2>
        <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">{permissionError}</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => window.location.reload()} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs">রিলোড করুন</button>
          <button onClick={() => auth?.signOut()} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs">লগআউট</button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout 
      activePage={activePage} 
      setActivePage={setActivePage} 
      isOnline={isOnline} 
      onLogout={() => auth?.signOut()} 
      userEmail={user?.email || ''} 
      isAdmin={isAdminSession}
      userRoleName={activeStaff?.designation || 'Salesman'}
      roles={roles}
      onSwitchToShop={() => setViewMode('shop')}
      products={products}
      shopSettings={shopSettings}
      onUpdateShopSettings={handleUpdateShopSettings}
    >
      <div className="relative">
        {!isOnline && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-rose-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-400 shadow-xl">অফলাইন মোড</div>}
        {isSyncing && <div className="fixed top-20 right-8 z-[100] bg-white shadow-2xl rounded-full p-3 animate-spin border-2 border-primary/20"><RefreshCw size={20} className="text-primary" /></div>}
        
        {activePage === 'dashboard' && <Dashboard sales={sales} collections={collections} activities={activities} products={products} expenses={expenses} customers={customers} setActivePage={setActivePage} isAdmin={isAdminSession} currentStaff={activeStaff} />}
        {activePage === 'sales' && <Sales products={products} customers={customers} sales={sales} onSaleComplete={handleSaleComplete} onAddReturn={handleReturn} onSplitDelivery={handleProcessSplitDelivery} staff={activeStaff ? [activeStaff] : []} isAdmin={isAdminSession} currentStaff={activeStaff} shopSettings={shopSettings} />}
        {activePage === 'approvals' && <OrderApprovals sales={sales} products={products} customers={customers} onUpdateSales={(data) => handleUpdate('sales', data)} onDeleteSale={(id) => handleDelete('sales', id)} onUpdateProducts={(data) => handleUpdate('products', data)} onUpdateCustomers={(data) => handleUpdate('customers', data)} onSplitDelivery={handleProcessSplitDelivery} isAdmin={isAdminSession} currentStaff={activeStaff} shopSettings={shopSettings} />}
        {activePage === 'products' && <Products 
          products={products} 
          purchases={purchases} 
          suppliers={suppliers}
          productionBatches={productionBatches}
          onProductionBatchComplete={handleProductionBatchComplete}
          onDeleteProductionBatch={(id) => handleDelete('production_batches', id)}
          onUpdate={(data) => handleUpdate('products', data)} 
          onDelete={(id) => handleDelete('products', id)} 
          categories={categories} 
          onCategoryUpdate={(data) => handleUpdate('categories', data)} 
          stockEntries={stockEntries} 
          onStockUpdate={(entry, updatedProducts) => {
            setStockEntries(prev => [entry, ...prev]);
            setProducts(updatedProducts);
            updateFirebase('stock_entries', entry);
            // Only sync the single product that changed in Firebase to avoid syncing other unchanged products
            const changedProduct = updatedProducts.find(p => {
              const original = products.find(o => o.id === p.id);
              return original && original.stock !== p.stock;
            });
            if (changedProduct) {
              updateFirebase('products', changedProduct);
            }
          }} 
          currentStaff={activeStaff} 
        />}
        {activePage === 'customers' && <Customers customers={customers} onUpdate={(data) => handleUpdate('customers', data)} onDelete={(id) => handleDelete('customers', id)} sales={sales} collections={collections} shopSettings={shopSettings} onCollection={(col, cust) => {
          const colWithAuthor = { ...col, addedBy: activeStaff?.id };
          setCollections(prev => [colWithAuthor, ...prev]); 
          setCustomers(prev => prev.map(c => c.id === cust.id ? cust : c));
          updateFirebase('collections', colWithAuthor); 
          updateFirebase('customers', cust);
        }} rankConfigs={rankConfigs} customerLoans={customerLoans} onUpdateCustomerLoans={(data) => handleUpdate('customer_loans', data)} onDeleteCustomerLoan={(id) => handleDelete('customer_loans', id)} isAdmin={isAdminSession} currentStaff={activeStaff} />}
        {activePage === 'suppliers' && <Suppliers 
          suppliers={suppliers} 
          products={products} 
          purchases={purchases} 
          payments={supplierPayments} 
          returns={supplierReturns}
          onUpdate={(data) => handleUpdate('suppliers', data)} 
          onDelete={(id) => handleDelete('suppliers', id)}
          onPurchaseComplete={handlePurchaseComplete} 
          onPayment={(pay, updatedSuppliers) => {
            const payWithAuthor = { ...pay, addedBy: activeStaff?.id };
            setSupplierPayments(prev => [payWithAuthor, ...prev]);
            setSupplierList(updatedSuppliers);
            updateFirebase('supplier_payments', payWithAuthor);
            const changedSupplier = updatedSuppliers.find(s => s.id === pay.supplierId);
            if (changedSupplier) updateFirebase('suppliers', changedSupplier);
          }} 
          onSupplierReturn={handleSupplierReturn}
          categories={categories} 
          isAdmin={isAdminSession}
          currentStaff={activeStaff}
          shopSettings={shopSettings}
        />}
        {activePage === 'returns' && <Returns returns={returns} sales={sales} products={products} onAddReturn={handleReturn} />}
        {activePage === 'employees' && <Employees 
          staff={staff} 
          onUpdateStaff={(data) => handleUpdate('staff', data)} 
          onDeleteStaff={(id) => handleDelete('staff', id)} 
          attendances={attendances} 
          onUpdateAttendances={(data) => handleUpdate('attendances', data)} 
          leaves={leaves} 
          onUpdateLeaves={(data) => handleUpdate('leaves', data)} 
          sales={sales} 
          currentStaff={activeStaff} 
          isAdmin={isAdminSession} 
          payrolls={payrolls}
          onUpdatePayrolls={(data) => handleUpdate('payrolls', data)}
          onAddExpense={(exp) => {
            const expWithAuthor = { ...exp, addedBy: activeStaff?.id };
            setExpenses(prev => [expWithAuthor, ...prev]); 
            updateFirebase('expenses', expWithAuthor);
          }}
          shopSettings={shopSettings}
        />}
        {activePage === 'payroll' && <PayrollModule 
          staff={staff} 
          customers={customers}
          payrolls={payrolls} 
          onUpdatePayrolls={(data) => handleUpdate('payrolls', data)} 
          loans={loans} 
          onUpdateLoans={(data) => handleUpdate('loans', data)} 
          customerLoans={customerLoans}
          onUpdateCustomerLoans={(data) => handleUpdate('customer_loans', data)}
          reimbursements={reimbursements} 
          onUpdateReimbursements={(data) => handleUpdate('reimbursements', data)} 
          attendances={attendances}
          leaves={leaves}
          shopSettings={shopSettings}
          onAddExpense={(exp) => {
            const expWithAuthor = { ...exp, addedBy: activeStaff?.id };
            setExpenses(prev => [expWithAuthor, ...prev]); 
            updateFirebase('expenses', expWithAuthor);
          }}
          isAdmin={isAdminSession} 
          currentStaff={activeStaff} 
        />}
        {activePage === 'due' && <DuePayments customers={customers} sales={sales} collections={collections} onCollection={(col, cust) => {
          const colWithAuthor = { ...col, addedBy: activeStaff?.id };
          setCollections(prev => [colWithAuthor, ...prev]); 
          setCustomers(prev => prev.map(c => c.id === cust.id ? cust : c));
          updateFirebase('collections', colWithAuthor); 
          updateFirebase('customers', cust);
        }} customerLoans={customerLoans} onUpdateCustomerLoans={(data) => handleUpdate('customer_loans', data)} onDeleteCustomerLoan={(id) => handleDelete('customer_loans', id)} rankConfigs={rankConfigs} isAdmin={isAdminSession} currentStaff={activeStaff} shopSettings={shopSettings} />}
        {activePage === 'reports' && <Reports 
          sales={sales} 
          products={products} 
          customers={customers} 
          collections={collections} 
          expenses={expenses} 
          returns={returns} 
          purchases={purchases}
          productionBatches={productionBatches}
          suppliers={suppliers}
          currentUser={activeStaff} 
          isAdmin={isAdminSession} 
          allStaff={staff} 
          onCollection={() => {}} 
          onUpdateSales={(data) => handleUpdate('sales', data)} 
          onDeleteSale={(id) => handleDelete('sales', id)} 
          onSplitDelivery={handleProcessSplitDelivery}
          stockEntries={stockEntries} 
          shopSettings={shopSettings} 
        />}
        {activePage === 'expenses' && <Expenses expenses={expenses} onAddExpense={(exp) => {
          const expWithAuthor = { ...exp, addedBy: activeStaff?.id };
          setExpenses(prev => [expWithAuthor, ...prev]); 
          updateFirebase('expenses', expWithAuthor);
        }} onDeleteExpense={(id) => handleDelete('expenses', id)} isAdmin={isAdminSession} currentStaff={activeStaff} />}
        {activePage === 'settings' && <Settings staff={staff} onUpdateStaff={(data) => handleUpdate('staff', data)} roles={roles} onUpdateRoles={(data) => handleUpdate('roles', data)} categories={categories} rankConfigs={rankConfigs} onUpdateRanks={(data) => handleUpdate('ranks', data)} shopSettings={shopSettings} onUpdateShopSettings={handleUpdateShopSettings} onBackup={handleBackupData} onRestore={handleRestoreData} isAdmin={isAdminSession} />}
      </div>
    </Layout>
  );
};

export default App;
