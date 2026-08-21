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
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  deliveryCharge?: number;
  minOrderAmount?: number;
  shopStatus?: 'open' | 'closed';
  featuredCategories?: string[];
  showNewsletter?: boolean;
  showFeatures?: boolean;
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
  unit: 'pcs' | 'kg' | 'box' | 'pkt';
  stock: number;
  minStock?: number;
  category: string;
  description?: string;
  imageUrl?: string;
  dateAdded: string;
  status?: 'active' | 'inactive';
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
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
}

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  supplierId: string;
  date: string;
  items: PurchaseItem[];
  total: number;
  paid: number;
  due: number;
  status: 'paid' | 'due' | 'pending';
  notes?: string;
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
  companyName: string;
  address: string;
  dueAmount: number;
  dateAdded: string;
  totalPurchase: number;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  amount: number;
  method: string;
  date: string;
  note?: string;
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
  status: 'Draft' | 'Paid';
  paymentDate?: string;
}

export interface AdvanceLoan {
  id: string;
  staffId: string;
  amount: number;
  date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  remainingAmount: number;
  installmentAmount: number;
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
  status: 'pending' | 'approved' | 'delivered' | 'cancelled' | 'due' | 'paid';
  soldBy?: string;
  soldById?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
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
}

export interface CustomerLoan {
  id: string;
  customerId: string;
  customerName?: string;
  amount: number;
  date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  remainingAmount: number;
  installmentAmount: number;
  addedBy?: string;
}

export interface CustomerLoanRepayment {
  id: string;
  loanId: string;
  customerId: string;
  amount: number;
  date: string;
  paymentMethod: string;
  note?: string;
  addedBy?: string;
}

export interface SupplierReturn {
  id: string;
  supplierId: string;
  supplierName?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  reason: string;
  date: string;
  addedBy?: string;
}

export interface ProductionBatch {
  id: string;
  batchNo: string;
  producedProductName: string;
  producedQuantity: number;
  unit: string;
  totalProducedValue: number;
  date: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  costPerUnit?: number;
  totalCost?: number;
  status?: 'planned' | 'in_progress' | 'completed';
  startDate?: string;
  completionDate?: string;
  notes?: string;
  addedBy?: string;
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