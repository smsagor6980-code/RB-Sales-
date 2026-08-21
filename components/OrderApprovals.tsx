import React, { useMemo, useState } from 'react';
import { Sale, Product, Customer, CartItem, Staff, ShopSettings } from '../types';
import { 
  ClipboardCheck, Check, X, Eye, User, ShoppingBag, Clock, ShieldAlert, 
  Truck, AlertTriangle, CheckCircle2, AlertCircle, Search, Filter, 
  Printer, ArrowRight, Package, Info, RefreshCw, FileText, CheckCheck, XCircle, Trash2
} from 'lucide-react';
import InvoiceContent from './InvoiceContent';
import DeliverySplitModal from './DeliverySplitModal';

interface OrderApprovalsProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  onUpdateSales: (sales: Sale[]) => void;
  onDeleteSale?: (id: string) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
  onSplitDelivery?: (deliveredSale: Sale, newUndeliveredSale: Sale | null, updatedProducts: Product[], updatedCustomers: Customer[]) => void;
  isAdmin: boolean;
  currentStaff?: Staff | null;
  shopSettings?: ShopSettings;
}

const OrderApprovals: React.FC<OrderApprovalsProps> = ({ 
  sales, 
  products, 
  customers, 
  onUpdateSales, 
  onDeleteSale,
  onUpdateProducts, 
  onUpdateCustomers, 
  onSplitDelivery,
  isAdmin,
  currentStaff,
  shopSettings
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'undelivered' | 'partial' | 'delivered' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Delivery modal state
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [splitOrderTarget, setSplitOrderTarget] = useState<Sale | null>(null);
  const [deliveryQtys, setDeliveryQtys] = useState<Record<string, number>>({});
  const [undeliveredNote, setUndeliveredNote] = useState<string>('');
  const [printOrder, setPrintOrder] = useState<Sale | null>(null);

  // In-app Delete & Reject modal states (eliminates browser confirm/alert issues in iframe)
  const [orderToDelete, setOrderToDelete] = useState<Sale | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);
  const [orderToReject, setOrderToReject] = useState<Sale | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Helper to get product stock
  const getProductStock = (productId: string): number => {
    const product = products.find(p => p.id === productId);
    return product ? (Number(product.stock) || 0) : 0;
  };

  // Helper to check order stock status
  const getOrderStockSummary = (order: Sale) => {
    let hasShortage = false;
    let isCompletelyOutOfStock = true;
    let shortageCount = 0;

    order.items.forEach(item => {
      const stock = getProductStock(item.productId);
      if (stock < item.quantity) {
        hasShortage = true;
        shortageCount += (item.quantity - Math.max(0, stock));
      }
      if (stock > 0) {
        isCompletelyOutOfStock = false;
      }
    });

    return {
      hasShortage,
      isCompletelyOutOfStock,
      shortageCount
    };
  };

  // Filter sales based on tab and search
  const filteredOrders = useMemo(() => {
    return sales.filter(order => {
      // Tab matching
      let matchesTab = true;
      if (activeTab === 'pending') {
        matchesTab = order.status === 'pending';
      } else if (activeTab === 'undelivered') {
        matchesTab = order.status === 'undelivered' || order.deliveryStatus === 'undelivered';
      } else if (activeTab === 'partial') {
        matchesTab = order.status === 'partial' || order.deliveryStatus === 'partial';
      } else if (activeTab === 'delivered') {
        matchesTab = order.status === 'delivered' || order.status === 'approved' || order.status === 'paid' || order.status === 'due';
      }

      // Search matching
      const q = searchQuery.toLowerCase().trim();
      const customer = customers.find(c => c.id === order.customerId);
      const matchesSearch = !q || 
        (order.invoiceNo || '').toLowerCase().includes(q) ||
        (order.customerName || customer?.name || '').toLowerCase().includes(q) ||
        (order.customerPhone || customer?.phone || '').toLowerCase().includes(q) ||
        (order.soldBy || '').toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [sales, activeTab, searchQuery, customers]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    return {
      pending: sales.filter(s => s.status === 'pending').length,
      undelivered: sales.filter(s => s.status === 'undelivered' || s.deliveryStatus === 'undelivered').length,
      partial: sales.filter(s => s.status === 'partial' || s.deliveryStatus === 'partial').length,
      delivered: sales.filter(s => s.status === 'delivered' || s.status === 'approved' || s.status === 'paid' || s.status === 'due').length,
      all: sales.length
    };
  }, [sales]);

  // Open delivery modal and initialize quantities
  const handleOpenDeliveryModal = (order: Sale) => {
    setSelectedOrder(order);
    const initialQtys: Record<string, number> = {};
    
    order.items.forEach(item => {
      const stock = getProductStock(item.productId);
      if (item.deliveredQuantity !== undefined) {
        initialQtys[item.id] = item.deliveredQuantity;
      } else {
        // Default to maximum deliverable (min of ordered and stock)
        initialQtys[item.id] = Math.min(item.quantity, Math.max(0, stock));
      }
    });

    setDeliveryQtys(initialQtys);
    setUndeliveredNote(order.undeliveredNote || '');
  };

  // Calculations for current delivery modal
  const deliveryCalculations = useMemo(() => {
    if (!selectedOrder) return { deliveredSubtotal: 0, undeliveredSubtotal: 0, deliveredTotal: 0, undeliveredCount: 0, isPartial: false, isFullUndelivered: false, isFullDelivered: true };

    let deliveredSubtotal = 0;
    let undeliveredSubtotal = 0;
    let undeliveredCount = 0;
    let totalOrderedCount = 0;
    let totalDeliveredCount = 0;

    selectedOrder.items.forEach(item => {
      const delQty = deliveryQtys[item.id] !== undefined ? deliveryQtys[item.id] : item.quantity;
      const undelQty = Math.max(0, item.quantity - delQty);
      
      deliveredSubtotal += (delQty * item.unitPrice);
      undeliveredSubtotal += (undelQty * item.unitPrice);
      
      if (undelQty > 0) undeliveredCount += undelQty;
      totalOrderedCount += item.quantity;
      totalDeliveredCount += delQty;
    });

    const isFullUndelivered = totalDeliveredCount === 0;
    const isFullDelivered = totalDeliveredCount === totalOrderedCount;
    const isPartial = totalDeliveredCount > 0 && totalDeliveredCount < totalOrderedCount;

    // Proportionally apply discount if any
    const discountRatio = selectedOrder.subTotal > 0 ? (selectedOrder.discount / selectedOrder.subTotal) : 0;
    const deliveredDiscount = Math.round(deliveredSubtotal * discountRatio);
    const deliveredTotal = Math.max(0, deliveredSubtotal - deliveredDiscount);
    const deliveredDue = Math.max(0, deliveredTotal - Math.min(selectedOrder.paid, deliveredTotal));

    return {
      deliveredSubtotal,
      undeliveredSubtotal,
      deliveredTotal,
      deliveredDue,
      undeliveredCount,
      isPartial,
      isFullUndelivered,
      isFullDelivered
    };
  }, [selectedOrder, deliveryQtys]);

  // Execute delivery / approval process
  const handleConfirmDelivery = (mode: 'custom' | 'undelivered_all') => {
    if (!selectedOrder) return;

    if (mode === 'undelivered_all') {
      // Mark entire order as undelivered
      const updatedItems: CartItem[] = selectedOrder.items.map(item => ({
        ...item,
        deliveredQuantity: 0,
        undeliveredQuantity: item.quantity,
        deliveryStatus: 'undelivered',
        shortageReason: undeliveredNote || 'স্টক ঘাটতির কারণে অনডেলিভারী'
      }));

      const updatedSale: Sale = {
        ...selectedOrder,
        status: 'undelivered',
        deliveryStatus: 'undelivered',
        items: updatedItems,
        undeliveredNote: undeliveredNote || 'পণ্য ঘাটতির কারণে সম্পূর্ণ অর্ডার অনডেলিভারী রাখা হয়েছে',
        undeliveredItemsCount: selectedOrder.items.length,
        deliveredAt: new Date().toISOString(),
        deliveredBy: currentStaff?.name || 'Admin'
      };

      const updatedSales = sales.map(s => s.id === selectedOrder.id ? updatedSale : s);
      onUpdateSales(updatedSales);
      setSelectedOrder(null);
      return;
    }

    // Process delivery (either full or partial)
    const { isFullDelivered, isFullUndelivered, deliveredTotal, deliveredDue, undeliveredCount } = deliveryCalculations;

    if (isFullUndelivered) {
      if (confirm('আপনি কোনো পণ্য ডেলিভারি দিচ্ছেন না। অর্ডারটি কি "অনডেলিভারী" হিসেবে চিহ্নিত করবেন?')) {
        handleConfirmDelivery('undelivered_all');
      }
      return;
    }

    // Prepare updated items
    const updatedItems: CartItem[] = selectedOrder.items.map(item => {
      const delQty = deliveryQtys[item.id] !== undefined ? deliveryQtys[item.id] : item.quantity;
      const undelQty = Math.max(0, item.quantity - delQty);
      return {
        ...item,
        deliveredQuantity: delQty,
        undeliveredQuantity: undelQty,
        deliveryStatus: undelQty === 0 ? 'delivered' : (delQty === 0 ? 'undelivered' : 'partial'),
        shortageReason: undelQty > 0 ? (undeliveredNote || 'স্টক ঘাটতি') : undefined
      };
    });

    // Deduct stock for delivered quantities only
    const updatedProducts = products.map(p => {
      const item = selectedOrder.items.find(i => i.productId === p.id);
      if (!item) return p;
      const delQty = deliveryQtys[item.id] !== undefined ? deliveryQtys[item.id] : item.quantity;
      return { ...p, stock: Math.max(0, p.stock - delQty) };
    });

    // Update Customer records with the delivered financial value
    const updatedCustomers = customers.map(c => {
      if (c.id === selectedOrder.customerId) {
        return {
          ...c,
          dueAmount: Math.round((c.dueAmount || 0) + deliveredDue),
          totalPurchase: Math.round((c.totalPurchase || 0) + deliveredTotal),
          totalPaid: Math.round((c.totalPaid || 0) + Math.min(selectedOrder.paid, deliveredTotal)),
          lastPurchaseDate: selectedOrder.date
        };
      }
      return c;
    });

    // Determine order final status
    const finalStatus: Sale['status'] = isFullDelivered ? 'delivered' : 'partial';
    const finalDeliveryStatus: Sale['deliveryStatus'] = isFullDelivered ? 'delivered' : 'partial';

    const updatedSale: Sale = {
      ...selectedOrder,
      status: finalStatus,
      deliveryStatus: finalDeliveryStatus,
      items: updatedItems,
      total: isFullDelivered ? selectedOrder.total : deliveredTotal,
      due: isFullDelivered ? selectedOrder.due : deliveredDue,
      undeliveredNote: undeliveredCount > 0 ? (undeliveredNote || `${undeliveredCount}টি পণ্য স্টক ঘাটতির কারণে অনডেলিভারী`) : undefined,
      undeliveredItemsCount: undeliveredCount,
      deliveredAt: new Date().toISOString(),
      deliveredBy: currentStaff?.name || 'Admin'
    };

    const updatedSales = sales.map(s => s.id === selectedOrder.id ? updatedSale : s);

    onUpdateProducts(updatedProducts);
    onUpdateCustomers(updatedCustomers);
    onUpdateSales(updatedSales);
    setSelectedOrder(null);
  };

  // Trigger in-app delete modal
  const handleDeleteOrder = (order: Sale) => {
    // Default to true for stock restoration if order was already delivered or partially fulfilled
    const wasDelivered = order.status === 'delivered' || order.status === 'partial' || order.status === 'approved' || order.status === 'paid' || order.status === 'due';
    setRestoreStockOnDelete(wasDelivered);
    setOrderToDelete(order);
  };

  // Execute deletion safely without browser confirm/alert issues
  const executeDeleteOrder = () => {
    if (!orderToDelete) return;
    const order = orderToDelete;

    try {
      // 1. If restoreStockOnDelete is true and this order was delivered / partial, restore product stock
      const wasStockDeducted = order.status === 'delivered' || order.status === 'partial' || order.status === 'approved' || order.status === 'paid' || order.status === 'due';
      if (restoreStockOnDelete && wasStockDeducted && order.items && order.items.length > 0) {
        const updatedProducts = products.map(p => {
          const item = order.items.find(i => i.productId === p.id);
          if (!item) return p;
          const delQty = item.deliveredQuantity !== undefined ? Number(item.deliveredQuantity) : Number(item.quantity);
          return { ...p, stock: (Number(p.stock) || 0) + (delQty || 0) };
        });
        onUpdateProducts(updatedProducts);
      }

      // 2. Adjust customer balances if previously accounted
      if (order.customerId && wasStockDeducted) {
        const updatedCustomers = customers.map(c => {
          if (c.id === order.customerId) {
            return {
              ...c,
              dueAmount: Math.max(0, (c.dueAmount || 0) - (order.due || 0)),
              totalPurchase: Math.max(0, (c.totalPurchase || 0) - (order.total || 0)),
              totalPaid: Math.max(0, (c.totalPaid || 0) - (order.paid || 0))
            };
          }
          return c;
        });
        onUpdateCustomers(updatedCustomers);
      }

      // 3. Remove order from state and persistence
      if (onDeleteSale) {
        onDeleteSale(order.id);
      } else {
        onUpdateSales(sales.filter(s => s.id !== order.id));
      }

      // 4. Close any open views
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
      }
      if (splitOrderTarget?.id === order.id) {
        setShowSplitModal(false);
        setSplitOrderTarget(null);
      }

      setOrderToDelete(null);
      showToast(`অর্ডার #${order.invoiceNo} সফলভাবে মুছে ফেলা হয়েছে!`, 'success');
    } catch (err: any) {
      console.error('Delete order failed:', err);
      showToast('অর্ডার ডিলিট করতে সমস্যা হয়েছে: ' + (err.message || 'Error'), 'error');
    }
  };

  // Trigger in-app rejection modal
  const handleReject = (order: Sale) => {
    setRejectionReason(undeliveredNote || '');
    setOrderToReject(order);
  };

  // Execute rejection safely
  const executeRejectOrder = () => {
    if (!orderToReject) return;
    const order = orderToReject;
    const note = rejectionReason || 'অর্ডার বাতিল করা হয়েছে';

    const updatedSale: Sale = { 
      ...order, 
      status: 'cancelled' as const, 
      deliveryStatus: 'undelivered' as const,
      undeliveredNote: note 
    };
    const updatedSales = sales.map(s => s.id === order.id ? updatedSale : s);
    onUpdateSales(updatedSales);
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(null);
    }
    setOrderToReject(null);
    setRejectionReason('');
    showToast(`অর্ডার #${order.invoiceNo} সফলভাবে বাতিল করা হয়েছে।`, 'success');
  };

  const handlePrint = (order: Sale) => {
    setPrintOrder(order);
    setTimeout(() => {
      const printContent = document.getElementById('printable-approval-receipt');
      if (!printContent) return;
      const WinPrint = window.open('', '', 'width=900,height=800');
      if (WinPrint) {
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(el => el.outerHTML)
          .join('\n');
        WinPrint.document.write('<html><head><title>Delivery Invoice</title>');
        WinPrint.document.write(styles);
        WinPrint.document.write('<style>');
        WinPrint.document.write(`
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff !important; }
          }
        `);
        WinPrint.document.write('</style></head><body style="background: white; padding: 20px;">');
        WinPrint.document.write('<div class="invoice-container">');
        WinPrint.document.write(printContent.innerHTML);
        WinPrint.document.write('</div></body></html>');
        WinPrint.document.close();
        WinPrint.focus();
        setTimeout(() => {
          WinPrint.print();
          WinPrint.close();
        }, 500);
      }
    }, 150);
  };

  const getStatusBadge = (order: Sale) => {
    if (order.status === 'undelivered' || order.deliveryStatus === 'undelivered') {
      return (
        <span className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <XCircle size={12} className="text-rose-500" /> অনডেলিভারী (Undelivered)
        </span>
      );
    }
    if (order.status === 'partial' || order.deliveryStatus === 'partial') {
      return (
        <span className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <AlertTriangle size={12} className="text-amber-500" /> আংশিক ডেলিভারি (Partial)
        </span>
      );
    }
    if (order.status === 'delivered' || order.status === 'approved') {
      return (
        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <CheckCircle2 size={12} className="text-emerald-500" /> ডেলিভারড (Delivered)
        </span>
      );
    }
    if (order.status === 'cancelled') {
      return (
        <span className="bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <X size={12} /> বাতিল (Cancelled)
        </span>
      );
    }
    return (
      <span className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
        <Clock size={12} className="text-blue-500" /> অপেক্ষমান (Pending)
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
              <Truck size={22} />
            </div>
            অর্ডার অনুমোদন ও ডেলিভারি ব্যবস্থাপনা
          </h2>
          <p className="text-slate-500 font-bold text-xs mt-1">
            ডিলার ও কাস্টমারদের অর্ডার যাচাই, স্টক ঘাটতি থাকলে অনডেলিভারী চিহ্নিতকরণ এবং আংশিক ডেলিভারি প্রদান করুন।
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ইনভয়েস বা কাস্টমার খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:bg-white focus:border-primary transition-all outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'pending', label: 'অপেক্ষমান অর্ডার', count: tabCounts.pending, color: 'text-blue-600' },
          { id: 'undelivered', label: 'অনডেলিভারী (ঘাটতি)', count: tabCounts.undelivered, color: 'text-rose-600' },
          { id: 'partial', label: 'আংশিক ডেলিভারি', count: tabCounts.partial, color: 'text-amber-600' },
          { id: 'delivered', label: 'ডেলিভারড / অনুমোদিত', count: tabCounts.delivered, color: 'text-emerald-600' },
          { id: 'all', label: 'সকল অর্ডার', count: tabCounts.all, color: 'text-slate-600' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all whitespace-nowrap active:scale-95 ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Order Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map(order => {
          const customer = customers.find(c => c.id === order.customerId);
          const stockSummary = getOrderStockSummary(order);
          const isPending = order.status === 'pending';

          return (
            <div 
              key={order.id} 
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between relative group"
            >
              <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  {getStatusBadge(order)}
                  <span className="text-[10px] font-black text-slate-400 uppercase font-mono">#{order.invoiceNo}</span>
                </div>

                {/* Customer Info */}
                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-primary font-black shadow-inner">
                      <User size={20}/>
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-800 uppercase tracking-tight">
                        {order.customerName || customer?.name || 'অতিথি কাস্টমার'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {order.customerType === 'distributor' ? 'ডিলার (Dealer)' : order.customerType === 'wholesale' ? 'পাইকারি (Wholesale)' : 'খুচরা (Retail)'} • {order.customerPhone || customer?.phone || 'ফোন নেই'}
                      </div>
                    </div>
                  </div>

                  {/* Financial & Items */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                      <span>মোট অর্ডার মূল্য:</span>
                      <span className="text-base font-black text-primary">৳{order.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                      <span>পণ্য সংখ্যা:</span>
                      <span>{order.items.length} প্রকার ({order.items.reduce((sum, i) => sum + i.quantity, 0)} পিস)</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                      <span>তারিখ:</span>
                      <span>{order.date ? order.date.split('T')[0] : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Stock Availability Indicator for Pending orders */}
                  {isPending && (
                    <div className="mt-3">
                      {stockSummary.isCompletelyOutOfStock ? (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700">
                          <XCircle size={16} className="shrink-0 text-rose-500" />
                          <div className="text-[11px] font-black">স্টক শূন্য - পণ্য ডেলিভারি সম্ভব নয় (অনডেলিভারী)</div>
                        </div>
                      ) : stockSummary.hasShortage ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-amber-700">
                          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
                          <div className="text-[11px] font-black">আংশিক স্টক ঘাটতি রয়েছে ({stockSummary.shortageCount} পিস ঘাটতি)</div>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-700">
                          <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                          <div className="text-[11px] font-black">পর্যাপ্ত স্টক রয়েছে (ডেলিভারির জন্য প্রস্তুত)</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Undelivered note if any */}
                  {order.undeliveredNote && (
                    <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl text-[10px] font-bold text-rose-600">
                      <span className="font-black">অনডেলিভারী নোট:</span> {order.undeliveredNote}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                <button 
                  onClick={() => {
                    setSplitOrderTarget(order);
                    setShowSplitModal(true);
                  }}
                  className="flex-1 bg-primary/10 hover:bg-primary hover:text-white text-primary py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  title="পণ্য সংখ্যা ইনপুট দিয়ে ডেলিভারি ও অনডেলিভারী চালান তৈরি করুন"
                >
                  <Truck size={14} /> 📦 ডেলিভারি ও চালান
                </button>
                <button 
                  onClick={() => handleOpenDeliveryModal(order)} 
                  className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  title="অর্ডার বিবরণ ও স্টক সমন্বয়"
                >
                  <Eye size={14} />
                </button>
                <button 
                  onClick={() => handlePrint(order)} 
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all"
                  title="মেমো প্রিন্ট করুন"
                >
                  <Printer size={16} />
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteOrder(order)} 
                    className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl transition-all"
                    title="অর্ডার স্থায়ীভাবে ডিলিট করুন"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <ClipboardCheck size={56} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">কোনো অর্ডার পাওয়া যায়নি</p>
          </div>
        )}
      </div>

      {/* Interactive Delivery Dispatch Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in duration-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">
                    অর্ডার ডেলিভারি ও স্টক সমন্বয়
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    ইনভয়েস: #{selectedOrder.invoiceNo} • কাস্টমার: {selectedOrder.customerName || 'Customer'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteOrder(selectedOrder)}
                    className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all flex items-center gap-1.5 text-xs font-bold"
                    title="অর্ডার স্থায়ীভাবে মুছে ফেলুন"
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">ডিলিট</span>
                  </button>
                )}
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2.5 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-6 py-6 custom-scrollbar pr-1">
              {/* Shortage Alert Banner */}
              {selectedOrder.status === 'pending' && deliveryCalculations.undeliveredCount > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-3 text-amber-800">
                  <AlertTriangle size={20} className="shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">স্টক ঘাটতি চিহ্নিত হয়েছে!</h4>
                    <p className="text-[11px] font-bold mt-1 text-amber-700 leading-relaxed">
                      অর্ডারের {deliveryCalculations.undeliveredCount}টি পণ্যের পর্যাপ্ত স্টক নেই। আপনি বিদ্যমান স্টক দিয়ে **"আংশিক ডেলিভারি"** দিতে পারেন, যা অপর্যাপ্ত পণ্যগুলোকে স্বয়ংক্রিয়ভাবে **"অনডেলিভারী"** হিসেবে রেকর্ড করবে।
                    </p>
                  </div>
                </div>
              )}

              {/* Items Table / List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">পণ্যের তালিকা ও ডেলিভারি পরিমাণ নির্ধারণ</span>
                  {selectedOrder.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const maxQtys: Record<string, number> = {};
                          selectedOrder.items.forEach(i => {
                            const stock = getProductStock(i.productId);
                            maxQtys[i.id] = Math.min(i.quantity, Math.max(0, stock));
                          });
                          setDeliveryQtys(maxQtys);
                        }}
                        className="text-[10px] font-black text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-all uppercase"
                      >
                        স্টক অনুযায়ী অটো-এডজাস্ট
                      </button>
                      <button
                        onClick={() => {
                          const zeroQtys: Record<string, number> = {};
                          selectedOrder.items.forEach(i => {
                            zeroQtys[i.id] = 0;
                          });
                          setDeliveryQtys(zeroQtys);
                        }}
                        className="text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-all uppercase"
                      >
                        সব অনডেলিভারী করুন
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-slate-100 rounded-3xl overflow-hidden divide-y divide-slate-100 bg-slate-50/50">
                  {selectedOrder.items.map(item => {
                    const stock = getProductStock(item.productId);
                    const delQty = deliveryQtys[item.id] !== undefined ? deliveryQtys[item.id] : item.quantity;
                    const undelQty = Math.max(0, item.quantity - delQty);
                    const isShortage = stock < item.quantity;
                    const isEditable = selectedOrder.status === 'pending';

                    return (
                      <div key={item.id} className="p-4 bg-white hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Item Details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{item.productName}</span>
                            {isShortage && isEditable && (
                              <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-md">
                                স্টক কম
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-400 uppercase mt-1">
                            <span>দর: ৳{item.unitPrice}</span>
                            <span>অর্ডার: <b className="text-slate-700">{item.quantity}টি</b></span>
                            <span>গুদাম স্টক: <b className={stock >= item.quantity ? 'text-emerald-600' : stock > 0 ? 'text-amber-600' : 'text-rose-600'}>{stock}টি</b></span>
                          </div>
                        </div>

                        {/* Delivery Control */}
                        <div className="flex items-center gap-4 shrink-0">
                          {isEditable ? (
                            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                              <span className="text-[10px] font-black text-slate-500 uppercase px-2">ডেলিভারি:</span>
                              <input
                                type="number"
                                min={0}
                                max={item.quantity}
                                value={delQty}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(item.quantity, parseInt(e.target.value) || 0));
                                  setDeliveryQtys(prev => ({ ...prev, [item.id]: val }));
                                }}
                                className="w-16 text-center bg-white border border-slate-200 rounded-xl py-1 text-xs font-black outline-none focus:border-primary"
                              />
                              <span className="text-[10px] font-bold text-slate-400 pr-2">টি</span>
                            </div>
                          ) : (
                            <div className="text-right">
                              <div className="text-xs font-black text-emerald-600">
                                ডেলিভারি: {item.deliveredQuantity !== undefined ? item.deliveredQuantity : item.quantity}টি
                              </div>
                              {(item.undeliveredQuantity || 0) > 0 && (
                                <div className="text-[10px] font-black text-rose-500">
                                  অনডেলিভারী: {item.undeliveredQuantity}টি
                                </div>
                              )}
                            </div>
                          )}

                          {/* Undelivered Status Badge */}
                          {undelQty > 0 ? (
                            <div className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap">
                              অনডেলিভারী: {undelQty}টি
                            </div>
                          ) : (
                            <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap">
                              সম্পূর্ণ
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note / Shortage reason input */}
              {selectedOrder.status === 'pending' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    অনডেলিভারী / ডেলিভারি নোট (Shortage Note)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: সাময়িক স্টক ঘাটতি, আগামী সপ্তাহে বাকি পণ্য সরবরাহ করা হবে..."
                    value={undeliveredNote}
                    onChange={(e) => setUndeliveredNote(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-primary transition-all"
                  />
                </div>
              )}

              {/* Delivery Financial Summary Card */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-3 shadow-xl">
                <div className="flex justify-between items-center text-xs font-bold text-white/60">
                  <span>মূল অর্ডার মোট মূল্য:</span>
                  <span className="text-white font-mono">৳{selectedOrder.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                  <span>প্রকৃত ডেলিভারি পণ্যের মূল্য:</span>
                  <span className="font-mono font-black text-sm">৳{deliveryCalculations.deliveredTotal.toLocaleString()}</span>
                </div>
                {deliveryCalculations.undeliveredSubtotal > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-rose-400">
                    <span>অনডেলিভারী পণ্যের মূল্য (বাদ যাবে):</span>
                    <span className="font-mono font-black text-sm">-৳{deliveryCalculations.undeliveredSubtotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="h-[1px] bg-white/10 my-2" />
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-black uppercase tracking-wider text-primary">চূড়ান্ত সমন্বয়কৃত দেয় বিল:</div>
                    <div className="text-[10px] text-white/50 font-bold">
                      {deliveryCalculations.isFullDelivered ? 'সম্পূর্ণ ডেলিভারি' : deliveryCalculations.isFullUndelivered ? 'সম্পূর্ণ অনডেলিভারী (০ বিল)' : 'আংশিক ডেলিভারি বিল'}
                    </div>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    ৳{deliveryCalculations.deliveredTotal.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3 shrink-0">
              {isAdmin && (
                <button 
                  onClick={() => handleDeleteOrder(selectedOrder)}
                  className="px-5 bg-rose-50 hover:bg-rose-100 text-rose-600 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-rose-200"
                  title="অর্ডার সম্পূর্ণ মুছে ফেলুন (Delete)"
                >
                  <Trash2 size={16} />
                  <span>ডিলিট করুন</span>
                </button>
              )}

              {selectedOrder.status === 'pending' ? (
                <>
                  <button 
                    onClick={() => handleReject(selectedOrder)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                  >
                    অর্ডার বাতিল করুন
                  </button>

                  <button 
                    onClick={() => handleConfirmDelivery('undelivered_all')}
                    className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                  >
                    সম্পূর্ণ অনডেলিভারী চিহ্নিত করুন
                  </button>

                  <button 
                    onClick={() => handleConfirmDelivery('custom')}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-primary/20 active:scale-95 transition-all"
                  >
                    {deliveryCalculations.isFullDelivered ? 'ডেলিভারি অনুমোদন করুন' : 'আংশিক ডেলিভারি নিশ্চিত করুন'}
                  </button>
                </>
              ) : (
                <div className="flex-1 flex gap-3">
                  <button 
                    onClick={() => handlePrint(selectedOrder)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Printer size={16} /> ইনভয়েস প্রিন্ট করুন
                  </button>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delivery and Undelivery Split Modal */}
      {showSplitModal && splitOrderTarget && (
        <DeliverySplitModal
          isOpen={showSplitModal}
          onClose={() => {
            setShowSplitModal(false);
            setSplitOrderTarget(null);
          }}
          sale={splitOrderTarget}
          products={products}
          customers={customers}
          shopSettings={shopSettings}
          currentStaff={currentStaff}
          isAdmin={isAdmin}
          onDeleteSale={(sale) => setOrderToDelete(sale)}
          onConfirmSplitDelivery={(deliveredSale, newUndeliveredSale, updatedProducts, updatedCustomers) => {
            if (onSplitDelivery) {
              onSplitDelivery(deliveredSale, newUndeliveredSale, updatedProducts, updatedCustomers);
            } else {
              let nextSales = sales.map(s => s.id === deliveredSale.id ? deliveredSale : s);
              if (newUndeliveredSale) {
                nextSales = [newUndeliveredSale, ...nextSales];
              }
              onUpdateSales(nextSales);
              onUpdateProducts(updatedProducts);
              onUpdateCustomers(updatedCustomers);
            }
          }}
        />
      )}

      {/* In-App Delete Confirmation Modal (Robust & Iframe-Safe) */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[36px] w-full max-w-lg p-6 md:p-8 shadow-2xl border border-rose-100 animate-in zoom-in duration-200 flex flex-col">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  অর্ডার ডিলিট নিশ্চিতকরণ
                </h3>
                <p className="text-xs text-rose-600 font-bold">
                  এই কাজটি অপরিবর্তনযোগ্য (Irreversible)
                </p>
              </div>
            </div>

            <div className="py-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-500">ইনভয়েস নম্বর:</span>
                  <span className="font-black text-slate-800 font-mono">#{orderToDelete.invoiceNo}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-500">গ্রাহকের নাম:</span>
                  <span className="font-black text-slate-800">{orderToDelete.customerName || 'Cash Customer'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-500">মোট মূল্য:</span>
                  <span className="font-black text-emerald-600 font-mono">৳{orderToDelete.total?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-500">বর্তমান স্ট্যাটাস:</span>
                  <span className="font-black uppercase text-primary">
                    {orderToDelete.status === 'delivered' ? 'ডেলিভার্ড' :
                     orderToDelete.status === 'partial' ? 'আংশিক ডেলিভারি' :
                     orderToDelete.status === 'undelivered' ? 'অনডেলিভারী' : 'অপেক্ষমাণ (Pending)'}
                  </span>
                </div>
              </div>

              {(orderToDelete.status === 'delivered' || orderToDelete.status === 'partial' || orderToDelete.status === 'approved' || orderToDelete.status === 'paid' || orderToDelete.status === 'due') && (
                <label className="flex items-start gap-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl cursor-pointer hover:bg-amber-100/60 transition-all">
                  <input
                    type="checkbox"
                    checked={restoreStockOnDelete}
                    onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-amber-300 text-amber-600 focus:ring-amber-500 mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-black text-amber-900">
                      📦 পণ্য স্টক গুদামে ফেরত (Restore Stock) যুক্ত করুন
                    </div>
                    <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                      চেক করা থাকলে এই অর্ডারের পণ্যের পরিমাণ ইনভেন্টরি স্টকে ফেরত যাবে এবং গ্রাহকের বকেয়া/ক্রয় সমন্বয় হবে।
                    </div>
                  </div>
                </label>
              )}

              <p className="text-xs text-slate-500 text-center font-medium">
                আপনি কি নিশ্চিত যে <span className="font-black text-slate-800">#{orderToDelete.invoiceNo}</span> অর্ডারটি সম্পূর্ণ মুছে ফেলতে চান?
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                onClick={executeDeleteOrder}
                className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                <span>হ্যাঁ, ডিলিট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Reject Confirmation Modal */}
      {orderToReject && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[36px] w-full max-w-lg p-6 md:p-8 shadow-2xl border border-slate-100 animate-in zoom-in duration-200 flex flex-col">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  অর্ডার বাতিল নিশ্চিতকরণ
                </h3>
                <p className="text-xs text-slate-400 font-bold">
                  ইনভয়েস: #{orderToReject.invoiceNo}
                </p>
              </div>
            </div>

            <div className="py-5 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-2">
                  বাতিলের কারণ (নোট):
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="যেমন: স্টক ঘাটতি, গ্রাহকের অনুরোধ..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:bg-white focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {['স্টক স্বল্পতা', 'গ্রাহক বাতিল করেছেন', 'ভুল অর্ডার এন্ট্রি'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setRejectionReason(tag)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black transition-all"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setOrderToReject(null)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
              >
                বন্ধ
              </button>
              <button
                type="button"
                onClick={executeRejectOrder}
                className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <XCircle size={16} />
                <span>অর্ডার বাতিল করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-[250] px-5 py-4 rounded-2xl shadow-2xl text-white font-black text-xs flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 ${
          toastMsg.type === 'success' ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-rose-600 shadow-rose-600/30'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Hidden Printable Invoice Element */}
      {printOrder && (
        <div className="hidden">
          <InvoiceContent 
            sale={printOrder} 
            customer={customers.find(c => c.id === printOrder.customerId)} 
            shopSettings={shopSettings || { name: 'RB SHAD FOOD PRODUCT LTD', phone: '', email: '', address: '' }} 
            id="printable-approval-receipt" 
          />
        </div>
      )}
    </div>
  );
};

export default OrderApprovals;
