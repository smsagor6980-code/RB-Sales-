import React, { useState, useMemo } from 'react';
import { Sale, Product, Customer, Staff, CartItem } from '../types';
import { 
  Truck, X, AlertTriangle, CheckCircle2, XCircle, Printer, 
  FileText, Package, ArrowRight, RefreshCw, Sparkles, Building2, 
  User, Phone, Calendar, ArrowDownRight, Layers, FileSpreadsheet, ShieldAlert, Trash2
} from 'lucide-react';
import InvoiceContent from './InvoiceContent';

interface DeliverySplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  products: Product[];
  customers: Customer[];
  shopSettings?: any;
  currentStaff?: Staff | null;
  isAdmin?: boolean;
  onDeleteSale?: (sale: Sale) => void;
  onConfirmSplitDelivery: (
    deliveredSale: Sale,
    newUndeliveredSale: Sale | null,
    updatedProducts: Product[],
    updatedCustomers: Customer[]
  ) => void;
}

const DeliverySplitModal: React.FC<DeliverySplitModalProps> = ({
  isOpen,
  onClose,
  sale,
  products,
  customers,
  shopSettings,
  currentStaff,
  isAdmin,
  onDeleteSale,
  onConfirmSplitDelivery
}) => {
  if (!isOpen || !sale) return null;

  // Delivery quantities mapped by item.id or productId
  const [deliveryQtys, setDeliveryQtys] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    sale.items.forEach(item => {
      // Default to already recorded deliveredQuantity if any, or full quantity
      initial[item.id] = item.deliveredQuantity !== undefined ? item.deliveredQuantity : item.quantity;
    });
    return initial;
  });

  // Per-item shortage / undelivered reason
  const [itemReasons, setItemReasons] = useState<Record<string, string>>({});

  // Delivery Metadata
  const [driverName, setDriverName] = useState(sale.deliveredBy || currentStaff?.name || '');
  const [vehicleNo, setVehicleNo] = useState(sale.vehicleNo || '');
  const [driverPhone, setDriverPhone] = useState(sale.driverPhone || '');
  const [deliveryNote, setDeliveryNote] = useState(sale.undeliveredNote || sale.undeliveredReason || '');

  // Result state after successful split
  const [splitResult, setSplitResult] = useState<{
    deliveredSale: Sale;
    newUndeliveredSale: Sale | null;
  } | null>(null);

  const [activeResultTab, setActiveResultTab] = useState<'delivered' | 'undelivered'>('delivered');
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper to get stock of a product
  const getProductStock = (productId: string): number => {
    const p = products.find(prod => prod.id === productId);
    return p ? (Number(p.stock) || 0) : 0;
  };

  const customer = useMemo(() => {
    return customers.find(c => c.id === sale.customerId);
  }, [customers, sale.customerId]);

  // Calculations for the live split
  const splitCalculations = useMemo(() => {
    let totalOrderedQty = 0;
    let totalDeliveredQty = 0;
    let totalUndeliveredQty = 0;
    let deliveredSubtotal = 0;
    let undeliveredSubtotal = 0;

    sale.items.forEach(item => {
      const ordQty = Number(item.quantity) || 0;
      const delQty = Math.max(0, Math.min(ordQty, deliveryQtys[item.id] !== undefined ? deliveryQtys[item.id] : ordQty));
      const undelQty = Math.max(0, ordQty - delQty);

      totalOrderedQty += ordQty;
      totalDeliveredQty += delQty;
      totalUndeliveredQty += undelQty;

      deliveredSubtotal += delQty * (item.unitPrice || 0);
      undeliveredSubtotal += undelQty * (item.unitPrice || 0);
    });

    const isFullDelivered = totalUndeliveredQty === 0;
    const isFullUndelivered = totalDeliveredQty === 0;
    const isPartial = totalDeliveredQty > 0 && totalUndeliveredQty > 0;

    // Prorated discount and VAT
    const originalSubtotal = sale.subTotal || 1;
    const deliveredRatio = deliveredSubtotal / originalSubtotal;
    const undeliveredRatio = undeliveredSubtotal / originalSubtotal;

    const deliveredDiscount = Math.round((sale.discount || 0) * deliveredRatio);
    const undeliveredDiscount = (sale.discount || 0) - deliveredDiscount;

    const deliveredVat = Math.round((sale.vat || 0) * deliveredRatio);
    const undeliveredVat = (sale.vat || 0) - deliveredVat;

    const deliveredTotal = Math.max(0, deliveredSubtotal - deliveredDiscount + deliveredVat);
    const undeliveredTotal = Math.max(0, undeliveredSubtotal - undeliveredDiscount + undeliveredVat);

    // Proposed new undelivered invoice number
    let proposedUndeliveredInvoiceNo = `${sale.invoiceNo}-UNDEL`;
    if (sale.invoiceNo.includes('-UNDEL')) {
      proposedUndeliveredInvoiceNo = `${sale.invoiceNo}-2`;
    }

    return {
      totalOrderedQty,
      totalDeliveredQty,
      totalUndeliveredQty,
      deliveredSubtotal,
      undeliveredSubtotal,
      deliveredDiscount,
      undeliveredDiscount,
      deliveredVat,
      undeliveredVat,
      deliveredTotal,
      undeliveredTotal,
      isFullDelivered,
      isFullUndelivered,
      isPartial,
      proposedUndeliveredInvoiceNo
    };
  }, [sale, deliveryQtys]);

  // Handle setting all to stock available
  const handleAutoAdjustToStock = () => {
    const updated: Record<string, number> = {};
    sale.items.forEach(item => {
      const stock = getProductStock(item.productId);
      updated[item.id] = Math.min(item.quantity, Math.max(0, stock));
    });
    setDeliveryQtys(updated);
  };

  // Handle setting all to full delivery
  const handleSetAllDelivered = () => {
    const updated: Record<string, number> = {};
    sale.items.forEach(item => {
      updated[item.id] = item.quantity;
    });
    setDeliveryQtys(updated);
  };

  // Handle setting all to 0
  const handleSetAllUndelivered = () => {
    const updated: Record<string, number> = {};
    sale.items.forEach(item => {
      updated[item.id] = 0;
    });
    setDeliveryQtys(updated);
  };

  // Execute the split & update inventory/sales/customers
  const handleConfirmSplit = () => {
    setIsProcessing(true);

    try {
      const now = new Date().toISOString();
      const updatedProductsList = [...products];

      // 1. If full delivery (0 undelivered items)
      if (splitCalculations.isFullDelivered) {
        // Deduct products stock if this sale wasn't already delivered
        if (sale.status !== 'delivered') {
          sale.items.forEach(item => {
            const pIndex = updatedProductsList.findIndex(p => p.id === item.productId);
            if (pIndex !== -1) {
              const currentStock = Number(updatedProductsList[pIndex].stock) || 0;
              updatedProductsList[pIndex] = {
                ...updatedProductsList[pIndex],
                stock: Math.max(0, currentStock - item.quantity)
              };
            }
          });
        }

        const deliveredSale: Sale = {
          ...sale,
          status: 'delivered',
          deliveryStatus: 'delivered',
          deliveredAt: now,
          deliveredBy: driverName || currentStaff?.name || 'Staff',
          vehicleNo,
          driverPhone,
          undeliveredNote: deliveryNote,
          items: sale.items.map(item => ({
            ...item,
            deliveredQuantity: item.quantity,
            undeliveredQuantity: 0,
            deliveryStatus: 'delivered'
          }))
        };

        onConfirmSplitDelivery(deliveredSale, null, updatedProductsList, customers);
        setSplitResult({
          deliveredSale,
          newUndeliveredSale: null
        });
        setActiveResultTab('delivered');
        setIsProcessing(false);
        return;
      }

      // 2. If completely undelivered (0 items delivered)
      if (splitCalculations.isFullUndelivered) {
        const undeliveredSale: Sale = {
          ...sale,
          status: 'undelivered',
          deliveryStatus: 'undelivered',
          isUndeliveredChallan: true,
          undeliveredReason: deliveryNote || 'সম্পূর্ণ স্টক ঘাটতিজনিত অনডেলিভারী',
          undeliveredNote: deliveryNote,
          vehicleNo,
          driverPhone,
          items: sale.items.map(item => ({
            ...item,
            deliveredQuantity: 0,
            undeliveredQuantity: item.quantity,
            deliveryStatus: 'undelivered'
          }))
        };

        onConfirmSplitDelivery(undeliveredSale, null, updatedProductsList, customers);
        setSplitResult({
          deliveredSale: undeliveredSale,
          newUndeliveredSale: null
        });
        setActiveResultTab('delivered');
        setIsProcessing(false);
        return;
      }

      // 3. Partial Delivery -> Split into Delivered Invoice AND New Undelivered Invoice
      const deliveredItems: CartItem[] = [];
      const undeliveredItems: CartItem[] = [];
      const undeliveredSummaries: any[] = [];

      sale.items.forEach(item => {
        const ordQty = Number(item.quantity) || 0;
        const delQty = Math.max(0, Math.min(ordQty, deliveryQtys[item.id] !== undefined ? deliveryQtys[item.id] : ordQty));
        const undelQty = Math.max(0, ordQty - delQty);

        if (delQty > 0) {
          deliveredItems.push({
            ...item,
            quantity: delQty,
            orderedQuantity: ordQty,
            deliveredQuantity: delQty,
            undeliveredQuantity: undelQty,
            total: delQty * item.unitPrice,
            deliveryStatus: undelQty > 0 ? 'partial' : 'delivered'
          });

          // Deduct warehouse stock for delivered items
          const pIndex = updatedProductsList.findIndex(p => p.id === item.productId);
          if (pIndex !== -1) {
            const currentStock = Number(updatedProductsList[pIndex].stock) || 0;
            updatedProductsList[pIndex] = {
              ...updatedProductsList[pIndex],
              stock: Math.max(0, currentStock - delQty)
            };
          }
        }

        if (undelQty > 0) {
          undeliveredItems.push({
            ...item,
            id: `${item.id}-undel-${Date.now()}`,
            quantity: undelQty,
            orderedQuantity: ordQty,
            deliveredQuantity: 0,
            undeliveredQuantity: undelQty,
            total: undelQty * item.unitPrice,
            deliveryStatus: 'undelivered'
          });

          undeliveredSummaries.push({
            productId: item.productId,
            productName: item.productName || (item as any).name || 'Unknown Product',
            orderedQuantity: ordQty,
            deliveredQuantity: delQty,
            undeliveredQuantity: undelQty,
            unitPrice: item.unitPrice,
            total: undelQty * item.unitPrice,
            shortageReason: item.shortageReason || deliveryNote
          });
        }
      });

      // Updated Original Delivered Sale
      const deliveredPaid = Math.min(sale.paid, splitCalculations.deliveredTotal);
      const deliveredDue = Math.max(0, splitCalculations.deliveredTotal - deliveredPaid);

      const deliveredSale: Sale = {
        ...sale,
        items: deliveredItems.length > 0 ? deliveredItems : sale.items.map(i => ({
          ...i,
          orderedQuantity: i.quantity,
          deliveredQuantity: 0,
          undeliveredQuantity: i.quantity,
          deliveryStatus: 'undelivered'
        })),
        originalItems: sale.items,
        undeliveredItems: undeliveredSummaries,
        undeliveredInvoiceNo: splitCalculations.proposedUndeliveredInvoiceNo,
        undeliveredItemsCount: splitCalculations.totalUndeliveredQty,
        subTotal: splitCalculations.deliveredSubtotal,
        discount: splitCalculations.deliveredDiscount,
        vat: splitCalculations.deliveredVat,
        total: splitCalculations.deliveredTotal,
        paid: deliveredPaid,
        due: deliveredDue,
        status: 'delivered',
        deliveryStatus: 'partial',
        deliveredAt: now,
        deliveredBy: driverName || currentStaff?.name || 'Staff',
        vehicleNo,
        driverPhone,
        undeliveredNote: `আংশিক ডেলিভারি সম্পন্ন। বাকি ${splitCalculations.totalUndeliveredQty}টি পণ্যের জন্য নতুন অনডেলিভারী ইনভয়েস #${splitCalculations.proposedUndeliveredInvoiceNo} তৈরি করা হয়েছে। ${deliveryNote ? `(নোট: ${deliveryNote})` : ''}`
      };

      // Newly Created Undelivered Sale (Backorder Invoice)
      const remainingPrepaid = Math.max(0, sale.paid - deliveredPaid);
      const undeliveredDue = Math.max(0, splitCalculations.undeliveredTotal - remainingPrepaid);

      const newUndeliveredSale: Sale = {
        id: `UNDEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        invoiceNo: splitCalculations.proposedUndeliveredInvoiceNo,
        customerId: sale.customerId,
        customerName: sale.customerName || customer?.name,
        customerPhone: sale.customerPhone || customer?.phone,
        customerAddress: sale.customerAddress || customer?.address,
        customerType: sale.customerType,
        date: now,
        items: undeliveredItems,
        subTotal: splitCalculations.undeliveredSubtotal,
        discount: splitCalculations.undeliveredDiscount,
        vat: splitCalculations.undeliveredVat,
        total: splitCalculations.undeliveredTotal,
        paid: remainingPrepaid,
        due: undeliveredDue,
        tendered: 0,
        change: 0,
        paymentMethod: sale.paymentMethod,
        notes: `অনডেলিভারী চালান - মূল ইনভয়েস #${sale.invoiceNo} হতে ঘাটতিজনিত বকেয়া পণ্য। ${deliveryNote ? `নোট: ${deliveryNote}` : ''}`,
        status: 'undelivered',
        deliveryStatus: 'undelivered',
        isUndeliveredChallan: true,
        originalInvoiceNo: sale.invoiceNo,
        splitFromSaleId: sale.id,
        undeliveredReason: deliveryNote || 'স্টক ঘাটতিজনিত বকেয়া পণ্য',
        undeliveredItemsCount: splitCalculations.totalUndeliveredQty,
        soldBy: sale.soldBy || currentStaff?.name,
        soldById: sale.soldById || currentStaff?.id,
        vehicleNo,
        driverPhone
      };

      // Update customer ledger
      let updatedCustomersList = [...customers];
      if (sale.customerId) {
        const cIndex = updatedCustomersList.findIndex(c => c.id === sale.customerId);
        if (cIndex !== -1) {
          const targetCustomer = updatedCustomersList[cIndex];
          // Recalculate total purchase or due adjustment
          const diffTotal = sale.total - (splitCalculations.deliveredTotal + splitCalculations.undeliveredTotal);
          updatedCustomersList[cIndex] = {
            ...targetCustomer,
            dueAmount: Math.max(0, (targetCustomer.dueAmount || 0) - (sale.due - (deliveredDue + undeliveredDue)))
          };
        }
      }

      onConfirmSplitDelivery(deliveredSale, newUndeliveredSale, updatedProductsList, updatedCustomersList);

      setSplitResult({
        deliveredSale,
        newUndeliveredSale
      });
      setActiveResultTab('delivered');
    } catch (err) {
      console.error('Error during delivery split:', err);
      alert('ডেলিভারি প্রসেস করার সময় সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsProcessing(false);
    }
  };

  // Print function
  const handlePrint = (targetSale: Sale) => {
    const printContent = document.getElementById(`print-split-invoice-${targetSale.id}`);
    if (!printContent) return;

    const WinPrint = window.open('', '', 'width=900,height=650');
    if (WinPrint) {
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(style => style.outerHTML)
        .join('\n');

      WinPrint.document.write('<!DOCTYPE html><html><head><title>Print Invoice</title>');
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
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[150] flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-[36px] w-full max-w-4xl shadow-2xl border border-slate-100 animate-in zoom-in duration-200 my-auto flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 md:p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary-300 flex items-center justify-center border border-white/10 shadow-lg">
              <Truck size={24} className="text-primary-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-white">
                  পণ্য ডেলিভারি ও অনডেলিভারী চালান তৈরি
                </h3>
                <span className="bg-primary/20 text-primary-300 border border-primary/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono">
                  #{sale.invoiceNo}
                </span>
              </div>
              <p className="text-[11px] font-bold text-white/60 mt-1">
                কতগুলো পণ্য সরবরাহ হবে তা ইনপুট দিন। কম ডেলিভারি হলে স্বয়ংক্রিয়ভাবে নতুন অনডেলিভারী চালান তৈরি হবে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDeleteSale && (
              <button 
                onClick={() => {
                  onDeleteSale(sale);
                }}
                className="px-3.5 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 transition-all flex items-center gap-1.5 text-xs font-bold"
                title="অর্ডার স্থায়ীভাবে ডিলিট করুন"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">ডিলিট</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
              title="বন্ধ করুন"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Controls OR Split Success View */}
        {!splitResult ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
            
            {/* Customer & Order Information Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100">
                  <User size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">গ্রাহক / ডিলার</div>
                  <div className="text-xs font-black text-slate-800 uppercase">{customer?.name || sale.customerName || 'Cash Customer'}</div>
                  <div className="text-[10px] font-bold text-slate-400">{customer?.phone || sale.customerPhone || 'N/A'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100">
                  <Calendar size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">ইনভয়েস তারিখ ও টাইপ</div>
                  <div className="text-xs font-black text-slate-800">{sale.date ? sale.date.split('T')[0] : 'N/A'}</div>
                  <div className="text-[10px] font-black text-primary uppercase">
                    {sale.customerType === 'distributor' ? 'ডিলার অর্ডার' : sale.customerType === 'wholesale' ? 'পাইকারি' : 'খুচরা'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-amber-600 shadow-sm border border-slate-100">
                  <Package size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">মূল ইনভয়েস মূল্য</div>
                  <div className="text-sm font-black text-slate-800 font-mono">৳{sale.total.toLocaleString()}</div>
                  <div className="text-[10px] font-bold text-slate-400">মোট আইটেম: {sale.items.length} প্রকার ({splitCalculations.totalOrderedQty} পিস)</div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <div className="text-xs font-black text-slate-700 uppercase flex items-center gap-2">
                <Layers size={16} className="text-primary" />
                পণ্যের ডেলিভারি পরিমাণ নির্ধারণ (Delivery Quantities)
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAutoAdjustToStock}
                  className="text-[10px] font-black text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-all uppercase flex items-center gap-1.5"
                >
                  <Sparkles size={12} /> গুদাম স্টক অনুযায়ী অটো-এডজাস্ট
                </button>
                <button
                  type="button"
                  onClick={handleSetAllDelivered}
                  className="text-[10px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-all uppercase"
                >
                  সব ডেলিভারি (All)
                </button>
                <button
                  type="button"
                  onClick={handleSetAllUndelivered}
                  className="text-[10px] font-black text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-all uppercase"
                >
                  সব অনডেলিভারী (0)
                </button>
              </div>
            </div>

            {/* Items Delivery List */}
            <div className="border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-sm">
              {sale.items.map((item, idx) => {
                const stock = getProductStock(item.productId);
                const ordQty = Number(item.quantity) || 0;
                const delQty = deliveryQtys[item.id] !== undefined ? deliveryQtys[item.id] : ordQty;
                const undelQty = Math.max(0, ordQty - delQty);
                const isShortage = stock < ordQty;
                const isItemUndelivered = undelQty > 0;

                return (
                  <div 
                    key={item.id || idx} 
                    className={`p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isItemUndelivered ? 'bg-amber-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Item Info */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                          {item.productName || (item as any).name}
                        </span>
                        {isShortage && (
                          <span className="bg-rose-100 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShieldAlert size={10} /> গুদামে স্টক কম ({stock}টি আছে)
                          </span>
                        )}
                        {undelQty > 0 && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-md">
                            {undelQty}টি অনডেলিভারী হবে
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400 uppercase">
                        <span>দর: <b className="text-slate-700">৳{item.unitPrice}</b></span>
                        <span>অর্ডার করা: <b className="text-slate-700 font-mono">{ordQty}টি</b></span>
                        <span>গুদাম স্টক: <b className={stock >= ordQty ? 'text-emerald-600 font-mono' : stock > 0 ? 'text-amber-600 font-mono' : 'text-rose-600 font-mono'}>{stock}টি</b></span>
                        <span>আইটেম মোট: <b className="text-slate-700 font-mono">৳{(ordQty * item.unitPrice).toLocaleString()}</b></span>
                      </div>
                    </div>

                    {/* Delivery Input Controls */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                        <span className="text-[10px] font-black text-slate-500 uppercase px-2">ডেলিভারি:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(0, delQty - 1);
                              setDeliveryQtys(prev => ({ ...prev, [item.id]: newQty }));
                            }}
                            className="w-7 h-7 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-all"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={ordQty}
                            value={delQty}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(ordQty, parseInt(e.target.value) || 0));
                              setDeliveryQtys(prev => ({ ...prev, [item.id]: val }));
                            }}
                            className="w-16 text-center bg-white border border-slate-200 rounded-xl py-1 text-xs font-black outline-none focus:border-primary font-mono shadow-sm"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.min(ordQty, delQty + 1);
                              setDeliveryQtys(prev => ({ ...prev, [item.id]: newQty }));
                            }}
                            className="w-7 h-7 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-all"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 px-2">/ {ordQty}টি</span>
                      </div>

                      {/* Status pill */}
                      {undelQty > 0 ? (
                        <div className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-2 rounded-2xl text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                          <AlertTriangle size={12} className="text-rose-500" /> অনডেলিভারী: {undelQty}টি
                        </div>
                      ) : (
                        <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-2 rounded-2xl text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 size={12} className="text-emerald-500" /> সম্পূর্ণ
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Split Dispatch Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Delivered Invoice Plan */}
              <div className="p-5 rounded-3xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                      ডেলিভারি চালান (Delivered Challan)
                    </h4>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                    #{sale.invoiceNo}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>ডেলিভারি দেওয়া পণ্য:</span>
                    <span className="font-black text-slate-800 font-mono">{splitCalculations.totalDeliveredQty} পিস</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ডেলিভারি পণ্যের মূল্য:</span>
                    <span className="font-black text-emerald-700 font-mono text-sm">৳{splitCalculations.deliveredTotal.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-700/80 pt-1">
                    ✓ গুদাম থেকে শুধুমাত্র এই {splitCalculations.totalDeliveredQty}টি পণ্যের স্টক কাটা হবে।
                  </div>
                </div>
              </div>

              {/* Undelivered Invoice Plan */}
              <div className={`p-5 rounded-3xl border space-y-3 transition-all ${
                splitCalculations.totalUndeliveredQty > 0 
                  ? 'bg-rose-50/60 border-rose-200/80' 
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle size={18} className={splitCalculations.totalUndeliveredQty > 0 ? "text-rose-600" : "text-slate-400"} />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      অনডেলিভারী নতুন ইনভয়েস (New Undelivered Invoice)
                    </h4>
                  </div>
                  {splitCalculations.totalUndeliveredQty > 0 && (
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                      #{splitCalculations.proposedUndeliveredInvoiceNo}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>অনডেলিভারী পণ্য:</span>
                    <span className="font-black text-slate-800 font-mono">{splitCalculations.totalUndeliveredQty} পিস</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>অনডেলিভারী মূল্য:</span>
                    <span className="font-black text-rose-700 font-mono text-sm">৳{splitCalculations.undeliveredTotal.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 pt-1">
                    {splitCalculations.totalUndeliveredQty > 0 
                      ? '⚠️ স্বয়ংক্রিয়ভাবে নতুন অনডেলিভারী ইনভয়েস তৈরি হবে এবং পরবর্তীতে স্টক আসলে ডেলিভারি দেওয়া যাবে।'
                      : '✓ কোনো পণ্য বকেয়া নেই।'}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Metadata Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  ডেলিভারিম্যান / ড্রাইভারের নাম
                </label>
                <input
                  type="text"
                  placeholder="যেমন: রফিক ইসলাম"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  গাড়ি / ট্রাক নং (Vehicle No)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ঢাকা মেট্রো-ন ১২-৩৪৫৬"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  ড্রাইভারের মোবাইল নং
                </label>
                <input
                  type="text"
                  placeholder="০১৭xxxxxxxx"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-primary"
                />
              </div>

              <div className="col-span-full">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  অনডেলিভারী / ডেলিভারি নোট (Delivery & Shortage Note)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: স্টক ঘাটতির কারণে আংশিক ডেলিভারি হলো, আগামী সোমবারে অবশিষ্ট পণ্য যাবে..."
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-primary"
                />
              </div>
            </div>

          </div>
        ) : (
          /* Post-Split Success Screen with Invoice Switcher & Print */
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
            {/* Success Banner */}
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-base font-black text-emerald-950 uppercase tracking-tight">
                    ডেলিভারি সম্পন্ন ও ইনভয়েস সফলভাবে স্প্লিট হয়েছে!
                  </h4>
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">
                    {splitResult.newUndeliveredSale 
                      ? `মূল ইনভয়েস #${splitResult.deliveredSale.invoiceNo} ডেলিভারি আপডেট হয়েছে এবং নতুন অনডেলিভারী চালান #${splitResult.newUndeliveredSale.invoiceNo} তৈরি হয়েছে।`
                      : `ইনভয়েস #${splitResult.deliveredSale.invoiceNo} সম্পূর্ণ ডেলিভারি হিসেবে রেকর্ড করা হয়েছে।`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(activeResultTab === 'delivered' ? splitResult.deliveredSale : (splitResult.newUndeliveredSale || splitResult.deliveredSale))}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  <Printer size={16} /> চালান প্রিন্ট করুন
                </button>
              </div>
            </div>

            {/* Invoices Switcher Tabs */}
            <div className="flex gap-3 border-b border-slate-200 pb-3">
              <button
                onClick={() => setActiveResultTab('delivered')}
                className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                  activeResultTab === 'delivered'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Truck size={16} />
                ডেলিভারি চালান (#{splitResult.deliveredSale.invoiceNo})
              </button>

              {splitResult.newUndeliveredSale && (
                <button
                  onClick={() => setActiveResultTab('undelivered')}
                  className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                    activeResultTab === 'undelivered'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <XCircle size={16} />
                  অনডেলিভারী চালান (#{splitResult.newUndeliveredSale.invoiceNo})
                </button>
              )}
            </div>

            {/* Selected Invoice Preview */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md">
              {activeResultTab === 'delivered' ? (
                <div>
                  <div id={`print-split-invoice-${splitResult.deliveredSale.id}`}>
                    <InvoiceContent
                      sale={splitResult.deliveredSale}
                      customer={customer}
                      shopSettings={shopSettings}
                      id={`printable-split-${splitResult.deliveredSale.id}`}
                    />
                  </div>
                </div>
              ) : (
                splitResult.newUndeliveredSale && (
                  <div>
                    <div id={`print-split-invoice-${splitResult.newUndeliveredSale.id}`}>
                      <InvoiceContent
                        sale={splitResult.newUndeliveredSale}
                        customer={customer}
                        shopSettings={shopSettings}
                        id={`printable-split-${splitResult.newUndeliveredSale.id}`}
                      />
                    </div>
                  </div>
                )
              )}
            </div>

          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 shrink-0">
          {!splitResult ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  বাতিল করুন
                </button>
                {onDeleteSale && (
                  <button
                    type="button"
                    onClick={() => onDeleteSale(sale)}
                    className="px-5 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                    title="অর্ডার স্থায়ীভাবে ডিলিট করুন"
                  >
                    <Trash2 size={16} />
                    <span>ডিলিট</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmSplit}
                  className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  {isProcessing ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Truck size={16} />
                  )}
                  {splitCalculations.isFullDelivered
                    ? 'সম্পূর্ণ ডেলিভারি নিশ্চিত করুন'
                    : splitCalculations.isFullUndelivered
                    ? 'সম্পূর্ণ অনডেলিভারী চিহ্নিত করুন'
                    : 'আংশিক ডেলিভারি ও অনডেলিভারী চালান তৈরি করুন'}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20"
              >
                সম্পন্ন করুন (Close)
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DeliverySplitModal;
