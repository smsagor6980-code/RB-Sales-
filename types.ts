export interface RewardMilestone {
  id: string;
  title: string;
  desc: string;
  target: number;
  type: 'spent' | 'orders';
  reward: string;
  status: 'active' | 'inactive';
}

export interface LuckyReward {
  id: string;
  value: string;
  code: string;
  chance: number; // 0-100
}

export interface ShopSettings {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  logoUrl?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  headerTagline?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  headerSubtitleColor?: string;
  logoWidth?: number;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  deliveryCharge?: number;
  minOrderAmount?: number;
  shopStatus?: 'open' | 'closed';
  featuredCategories?: string[];
  showNewsletter?: boolean;
  showFeatures?: boolean;
  sliderImages?: {
    id: string;
    imageUrl: string;
    title?: string;
    subtitle?: string;
    active: boolean;
  }[];
  luckyRewards?: {
    enabled: boolean;
    rewards: LuckyReward[];
  };
  targetRewards?: {
    enabled: boolean;
    milestones: RewardMilestone[];
  };
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  purchasePrice: number;
  salePrice: number; // Retail Price
  wholesalePrice: number; // Wholesale Price
  distributorPrice: number; // Distributor Price
  dealerPrice?: number;
  unit: 'pcs' | 'kg' | 'box' | 'pkt' | 'liter' | 'meter' | 'bag' | 'gm' | string;
  stock: number;
  minStock?: number;
  category: string;
  description?: string;
  imageUrl?: string;
  dateAdded: string;
  status?: 'active' | 'inactive';
  productType?: 'finished_good' | 'raw_material';
  rawMaterialCategory?: string;
  supplierId?: string;
  supplierName?: string;
}

export interface ProductionBatchItem {
  rawMaterialId: string;
  rawMaterialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
}

export interface ProductionBatch {
  id: string;
  batchNo: string;
  date: string;
  producedProductId: string;
  producedProductName: string;
  producedQuantity: number;
  unit: string;
  unitProductionCost: number;
  totalProducedValue: number;
  rawMaterialsUsed: ProductionBatchItem[];
  totalRawMaterialCost: number;
  laborCost?: number;
  otherCost?: number;
  totalBatchCost: number;
  notes?: string;
  addedBy?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

export interface AppRole {
  id: string;
  name: string;
  permissions: string[];
  isDefault?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  total: number;
  priceType: 'retail' | 'wholesale' | 'distributor';
  orderedQuantity?: number;
  deliveredQuantity?: number;
  undeliveredQuantity?: number;
  deliveryStatus?: 'delivered' | 'undelivered' | 'partial' | 'pending';
  shortageReason?: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productType?: 'finished_good' | 'raw_material';
  unit?: string;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  supplierId: string;
  supplierName?: string;
  supplierPhone?: string;
  date: string;
  items: PurchaseItem[];
  subtotal?: number;
  discount?: number;
  transportCost?: number;
  tax?: number;
  total: number;
  paid: number;
  due: number;
  paymentMethod?: string;
  status: 'paid' | 'due' | 'pending';
  notes?: string;
  receivedBy?: string;
  addedBy?: string;
}

export interface SupplierReturn {
  id: string;
  returnNo: string;
  supplierId: string;
  supplierName?: string;
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  refundType: 'reduce_due' | 'cash_refund';
  reason: string;
  addedBy?: string;
}

export interface CustomerReward {
  id: string;
  date: string;
  type: 'monthly' | 'yearly' | 'lifetime' | 'rank_achievement' | 'milestone' | 'lucky';
  description: string;
}

export interface RankConfig {
  id: string;
  name: string;
  minAmount: number;
  level: number;
  rewardDescription: string;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  dateAdded: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'offer' | 'system';
  status: 'unread' | 'read';
  date: string;
}

export interface Customer {
  id: string;
  uid?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nameColor?: string;
  imageUrl?: string;
  photoUrl?: string;
  profileColor?: string;
  dueAmount: number;
  type: 'retail' | 'wholesale' | 'distributor';
  status: string;
  dateAdded: string;
  totalPurchase: number;
  totalPaid: number;
  creditLimit?: number;
  targets?: {
    monthly: number;
    yearly: number;
    lifetime: number;
  };
  rewards?: CustomerReward[];
  lastPurchaseDate?: string;
  lastSpinDate?: string;
  addedBy?: string; // Track who added the customer
  wishlist?: WishlistItem[];
  notifications?: AppNotification[];
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  companyName: string;
  contactPerson?: string;
  address: string;
  dueAmount: number;
  dateAdded: string;
  totalPurchase: number;
  status?: 'active' | 'inactive';
  category?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankBranch?: string;
  routingNo?: string;
  bkashNo?: string;
  nagadNo?: string;
  notes?: string;
  addedBy?: string;
}

export interface SupplierPayment {
  id: string;
  voucherNo?: string;
  supplierId: string;
  supplierName?: string;
  amount: number;
  method: string;
  date: string;
  note?: string;
  chequeNo?: string;
  transactionId?: string;
  addedBy?: string;
}

export interface Staff {
  id: string;
  uid?: string;
  name: string;
  designation: string; 
  roleId?: string;     
  phone: string;
  email: string;
  password?: string;
  status: 'active' | 'inactive';
  joinedDate: string;
  assignedCategories?: string[];
  isApproved: boolean;
  targets?: {
    monthly: number;
    yearly: number;
  };
  imageUrl?: string;
  address?: string;
  nid?: string;
  department?: string;
  salaryStructure?: {
    basic: number;
    travelAllowance: number;
    foodAllowance: number;
    mobileAllowance: number;
  };
  leaveBalance?: {
    casual: number;
    sick: number;
    annual: number;
  };
  bkashNo?: string;
  nagadNo?: string;
  bankAccountNo?: string;
  bankName?: string;
  dutyStartTime?: string;
  dutyEndTime?: string;
  dutyHours?: number;
  shiftName?: string;
  pawnaTaka?: number;
  openingAdvance?: number;
  overtimeRatePerHour?: number;
}

export interface Attendance {
  id: string;
  staffId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  checkIn?: string;
  checkOut?: string;
  location?: { lat: number; lng: number };
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  type: 'Casual' | 'Sick' | 'Annual';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedDate: string;
}

export interface PayrollPaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: string;
  note?: string;
  paidBy?: string;
}

export interface Payroll {
  id: string;
  staffId: string;
  month: string; // YYYY-MM
  basic: number;
  allowances: number;
  commission: number;
  bonus: number;
  overtime: number;
  deductions: number;
  netSalary: number;
  status: 'Draft' | 'Paid' | 'Partial';
  paymentDate?: string;
  paidAmount?: number;
  dueAmount?: number;
  paymentMethod?: string;
  note?: string;
  workedDays?: number;
  totalDays?: number;
  dailyRate?: number;
  payments?: PayrollPaymentRecord[];
}

export interface AdvanceLoan {
  id: string;
  staffId: string;
  applicantType?: 'customer' | 'staff';
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  loanType?: 'advance' | 'loan';
  amount: number;
  date: string;
  dueDate?: string;
  disbursedMethod?: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  remainingAmount: number;
  installmentAmount: number;
}

export interface CustomerLoanRepayment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  paymentMethod: string;
  notes?: string;
  collectedBy?: string;
  collectedByName?: string;
}

export interface CustomerLoan {
  id: string;
  loanNo?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  type: 'loan' | 'advance';
  amount: number;
  remainingAmount: number;
  installmentAmount?: number;
  totalInstallments?: number;
  interestRate?: number;
  date: string;
  dueDate?: string;
  disbursedMethod: string;
  purpose: string;
  status: 'active' | 'repaid' | 'overdue' | 'cancelled';
  repayments: CustomerLoanRepayment[];
  notes?: string;
  approvedBy?: string;
  approvedByName?: string;
  addedBy?: string;
}

export interface ExpenseReimbursement {
  id: string;
  staffId: string;
  amount: number;
  date: string;
  reason: string;
  attachmentUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
}

export interface UndeliveredItemSummary {
  productId: string;
  productName: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  undeliveredQuantity: number;
  unitPrice: number;
  total: number;
  shortageReason?: string;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  customerId: string | null;
  customerType: 'retail' | 'wholesale' | 'distributor';
  date: string;
  items: CartItem[];
  subTotal: number;
  discount: number;
  discountNote?: string;
  vat: number;
  total: number;
  paid: number;
  due: number;
  tendered: number;
  change: number;
  paymentMethod: string;
  notes?: string;
  status: 'pending' | 'approved' | 'delivered' | 'cancelled' | 'due' | 'paid' | 'undelivered' | 'partial';
  deliveryStatus?: 'delivered' | 'undelivered' | 'partial' | 'pending';
  undeliveredNote?: string;
  undeliveredItemsCount?: number;
  deliveredAt?: string;
  deliveredBy?: string;
  soldBy?: string;
  soldById?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  originalInvoiceNo?: string;
  isUndeliveredChallan?: boolean;
  splitFromSaleId?: string;
  undeliveredReason?: string;
  vehicleNo?: string;
  driverPhone?: string;
  originalItems?: CartItem[];
  undeliveredItems?: UndeliveredItemSummary[];
  undeliveredInvoiceNo?: string;
}

export interface ProductReturn {
  id: string;
  saleId?: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
  reason: string;
  type: 'return' | 'damage';
  date: string;
  staffName: string;
  addedBy?: string;
}

export interface Collection {
  id: string;
  customerId: string;
  customerName?: string;
  amount: number;
  paymentMethod: string;
  date: string;
  notes?: string;
  addedBy?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  addedBy?: string;
}

export interface StockEntry {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  date: string;
  addedBy?: string;
  note?: string;
  productType?: 'finished_good' | 'raw_material';
  entryType?: 'purchase' | 'manual_add' | 'production_output' | 'production_consumed' | 'adjustment';
  unit?: string;
}

export interface Activity {
  id: string;
  type: 'sale' | 'collection' | 'expense' | 'stock_update' | 'return' | 'purchase' | 'delivery';
  title: string;
  description: string;
  amount: number;
  date: string;
  addedBy?: string;
}

export function calculateLowStockAlerts(products: Product[]): Product[] {
  return (products || []).filter(p => {
    if (p.status === 'inactive') return false;
    const minThreshold = p.minStock !== undefined && p.minStock !== null ? Number(p.minStock) : 5;
    return Number(p.stock) <= minThreshold;
  });
}