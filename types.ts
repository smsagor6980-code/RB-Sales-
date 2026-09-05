export interface CompanyBranch {
  id: string;
  name: string;
  code?: string; // e.g. "HQ-01", "DHK-02"
  phone?: string;
  email?: string;
  address?: string;
  currency?: string; // e.g. '৳', '$', '₹'
  logoUrl?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  headerSubtitleColor?: string;
  tagline?: string;
  invoicePrefix?: string;
  status: 'active' | 'inactive';
  isDefault?: boolean;
  notes?: string;
  adminEmail?: string;
  adminName?: string;
  adminPhone?: string;
  createdAt: string;
  updatedAt?: string;
}

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

export type GatewayAccountType = 'merchant' | 'personal' | 'agent' | 'bank';
export type GatewayType = 'mobile_banking' | 'wallet' | 'bank' | 'cod' | 'card' | 'other';

export interface PaymentGateway {
  id: string; // 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cellfin' | 'bank_transfer' | 'cash_on_delivery' | 'rest_pay' | custom
  name: string; // e.g. "বিকাশ (bKash)"
  nameEn: string; // e.g. "bKash"
  type: GatewayType;
  accountType: GatewayAccountType;
  number?: string; // Account / Merchant / Phone number
  qrCodeUrl?: string;
  chargePercentage?: number; // e.g. 1.5% or 0
  discountPercentage?: number; // e.g. 2% cashback/discount
  instructions?: string;
  minAmount?: number;
  maxAmount?: number;
  status: 'active' | 'inactive';
  isDefault?: boolean;
  sortOrder?: number;
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    branchName?: string;
    routingNumber?: string;
  };
}

export interface WalletSettings {
  enabled: boolean;
  currency: string;
  welcomeBonus: number;
  cashbackPercentage: number;
  minTopupAmount: number;
  maxTopupAmount: number;
  allowWithdrawal: boolean;
  withdrawalMinAmount: number;
  topupInstructions?: string;
}

export type WalletTransactionType = 
  | 'topup' 
  | 'payment' 
  | 'purchase'
  | 'cashback' 
  | 'refund' 
  | 'adjustment_add' 
  | 'adjustment_deduct' 
  | 'adjustment'
  | 'bonus' 
  | 'withdrawal';

export type WalletTransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface WalletTransaction {
  id: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  profileType?: 'customer' | 'staff' | 'supplier' | 'admin';
  profileId?: string;
  profileName?: string;
  profilePhone?: string;
  type: WalletTransactionType;
  amount: number;
  gatewayId?: string;
  gatewayName?: string;
  senderNumber?: string;
  trxId?: string;
  invoiceNo?: string;
  referenceId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  note?: string;
  notes?: string;
  status: WalletTransactionStatus;
  date?: string;
  approvedBy?: string;
  approvedByName?: string;
  rejectedReason?: string;
  createdAt: string;
  companyId?: string;
}

export const DEFAULT_PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: 'bkash',
    name: 'বিকাশ (bKash)',
    nameEn: 'bKash',
    type: 'mobile_banking',
    accountType: 'merchant',
    number: '01700000000',
    chargePercentage: 0,
    discountPercentage: 0,
    instructions: '১. আপনার বিকাশ অ্যাপ ওপেন করুন অথবা *247# ডায়াল করুন\n২. "Payment" অথবা "Send Money" অপশনে যান\n৩. উপরের বিকাশ নম্বরে নির্ধারিত টাকা পাঠান\n৪. সফল পেমেন্টের পর প্রাপ্ত Transaction ID (TrxID) ও আপনার নম্বরটি নিচে লিখুন।',
    minAmount: 10,
    maxAmount: 25000,
    status: 'active',
    isDefault: true,
    sortOrder: 1
  },
  {
    id: 'nagad',
    name: 'নগদ (Nagad)',
    nameEn: 'Nagad',
    type: 'mobile_banking',
    accountType: 'personal',
    number: '01800000000',
    chargePercentage: 0,
    discountPercentage: 0,
    instructions: '১. নগদ অ্যাপ ওপেন করুন অথবা *167# ডায়াল করুন\n২. "Send Money" অথবা "Merchant Pay" অপশন নির্বাচন করুন\n৩. উপরের নগদ নম্বরে টাকা সেন্ড করুন\n৪. TrxID এবং প্রেরকের নম্বর নিচে লিখে কনফার্ম করুন।',
    minAmount: 10,
    maxAmount: 25000,
    status: 'active',
    sortOrder: 2
  },
  {
    id: 'rocket',
    name: 'রকেট (Rocket)',
    nameEn: 'Rocket',
    type: 'mobile_banking',
    accountType: 'personal',
    number: '01900000000-1',
    chargePercentage: 0,
    discountPercentage: 0,
    instructions: '১. আপনার রকেট অ্যাপ বা *322# ডায়াল করুন\n২. Send Money / Merchant Pay অপশন বেছে নিন\n৩. উপরের রকেট অ্যাকাউন্ট নম্বরে সঠিক টাকা পাঠান\n৪. প্রাপ্ত Transaction ID নিচে লিখে সাবমিট করুন।',
    minAmount: 10,
    maxAmount: 25000,
    status: 'active',
    sortOrder: 3
  },
  {
    id: 'upay',
    name: 'উপায় (Upay)',
    nameEn: 'Upay',
    type: 'mobile_banking',
    accountType: 'personal',
    number: '01500000000',
    chargePercentage: 0,
    discountPercentage: 0,
    instructions: 'উপায় অ্যাপ থেকে Send Money বা পেমেন্ট করে TrxID প্রদান করুন।',
    minAmount: 10,
    maxAmount: 25000,
    status: 'inactive',
    sortOrder: 4
  },
  {
    id: 'rest_pay',
    name: 'রেস্ট পে ওয়ালেট (Rest Pay Wallet)',
    nameEn: 'Rest Pay Wallet',
    type: 'wallet',
    accountType: 'personal',
    instructions: 'আপনার রেস্ট পে ওয়ালেট ব্যালেন্স থেকে ১-ক্লিকে তাৎক্ষণিক পেমেন্ট সম্পন্ন করুন। কোনো অতিরিক্ত ফি প্রযোজ্য নয় এবং ক্যাশব্যাক সুবিধা পাবেন।',
    status: 'active',
    sortOrder: 0
  },
  {
    id: 'cash_on_delivery',
    name: 'ক্যাশ অন ডেলিভারি (Cash on Delivery)',
    nameEn: 'Cash on Delivery',
    type: 'cod',
    accountType: 'personal',
    instructions: 'পণ্য হাতে পেয়ে ডেলিভারি ম্যানের কাছে নগদ মূল্য পরিশোধ করুন।',
    status: 'active',
    sortOrder: 5
  },
  {
    id: 'bank_transfer',
    name: 'ব্যাংক ট্রান্সফার (Bank Transfer)',
    nameEn: 'Bank Transfer',
    type: 'bank',
    accountType: 'bank',
    bankDetails: {
      bankName: 'Islami Bank Bangladesh Ltd.',
      accountName: 'REST BAZER ENTERPRISE',
      accountNumber: '2050XXXXXXXXXXXXX',
      branchName: 'Savar Branch, Dhaka',
      routingNumber: '12526XXXX'
    },
    instructions: 'উল্লেখিত ব্যাংক অ্যাকাউন্টে ডিপোজিট / ফান্ড ট্রান্সফার করে স্লিপ বা রেফারেন্স নম্বর দিন।',
    status: 'inactive',
    sortOrder: 6
  }
];

export const DEFAULT_WALLET_SETTINGS: WalletSettings = {
  enabled: true,
  currency: '৳',
  welcomeBonus: 50,
  cashbackPercentage: 2,
  minTopupAmount: 50,
  maxTopupAmount: 50000,
  allowWithdrawal: false,
  withdrawalMinAmount: 500,
  topupInstructions: 'বিকাশ, নগদ বা রকেট এর মাধ্যমে আপনার ওয়ালেটে টাকা রিচার্জ করতে পারবেন। এডমিন কর্তৃক ট্রানজেকশন ভেরিফাই হওয়ার সাথে সাথে ওয়ালেটে ব্যালেন্স যুক্ত হবে।'
};

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
  paymentGateways?: PaymentGateway[];
  walletSettings?: WalletSettings;
  authSettings?: AuthSecuritySettings;
}

export interface AuthSecuritySettings {
  allowCustomerRegistration: boolean; // গ্রাহক স্বয়ংক্রিয় রেজিস্ট্রেশন চালু/বন্ধ
  allowStaffRegistration: boolean; // স্টাফ রেজিস্ট্রেশন চালু/বন্ধ
  requireCustomerApproval: boolean; // নতুন গ্রাহকের জন্য অ্যাডমিন অনুমোদন আবশ্যক কিনা
  requireStaffApproval: boolean; // নতুন স্টাফের জন্য অ্যাডমিন অনুমোদন আবশ্যক কিনা
  maintenanceMode: boolean; // সম্পূর্ণ সিস্টেম মেইনটেন্যান্স মোড (শুধুমাত্র অ্যাডমিন লগইন)
  maintenanceMessage?: string; // মেইনটেন্যান্স বার্তা
  customerLoginEnabled: boolean; // গ্রাহক লগইন চালু/বন্ধ
  staffLoginEnabled: boolean; // স্টাফ লগইন চালু/বন্ধ
  registrationDisabledNotice?: string; // রেজিস্ট্রেশন বন্ধ থাকলে গ্রাহককে দেখানো নোটিস
  defaultBranchForNewUsers?: string; // নতুনদের ডিফল্ট অফিস/শাখা
}

export const DEFAULT_AUTH_SETTINGS: AuthSecuritySettings = {
  allowCustomerRegistration: true,
  allowStaffRegistration: false,
  requireCustomerApproval: false,
  requireStaffApproval: true,
  maintenanceMode: false,
  maintenanceMessage: 'সিস্টেমটি বর্তমানে রক্ষণাবেক্ষণে রয়েছে। সাময়িক অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত।',
  customerLoginEnabled: true,
  staffLoginEnabled: true,
  registrationDisabledNotice: 'বর্তমানে নতুন গ্রাহক রেজিস্ট্রেশন সাময়িকভাবে স্থগিত রয়েছে। সহযোগিতার জন্য সরাসরি অ্যাডমিনের সাথে যোগাযোগ করুন।',
  defaultBranchForNewUsers: 'company-main',
};

export interface Product {
  id: string;
  companyId?: string;
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
  images?: string[];
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
  companyId?: string;
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
  companyId?: string;
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
  verifiedPhone?: boolean;
  verifiedEmail?: boolean;
  verifiedAt?: string;
  authProvider?: string;
  walletBalance?: number;
  totalWalletSpent?: number;
  totalWalletTopup?: number;
  walletPoints?: number;
  walletStatus?: 'active' | 'frozen' | 'suspended';
  canLogin?: boolean;
  isApproved?: boolean;
  plainPassword?: string;
  branchName?: string;
  blockedReason?: string;
}

export interface Supplier {
  id: string;
  companyId?: string;
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
  walletBalance?: number;
  totalWalletDeposited?: number;
  totalWalletUsed?: number;
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
  companyId?: string;
  companyName?: string;
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
    salaryType?: 'monthly' | 'daily' | 'hourly';
    travelAllowance?: number;
    travelAllowanceReason?: string;
    foodAllowance?: number;
    foodAllowanceReason?: string;
    mobileAllowance?: number;
    mobileAllowanceReason?: string;
    houseRentAllowance?: number;
    houseRentReason?: string;
    medicalAllowance?: number;
    medicalReason?: string;
    specialAllowance?: number;
    specialReason?: string;
    otherAllowance?: number;
    otherAllowanceReason?: string;
    dailyAllowance?: number;
    overtimeRatePerHour?: number;
    fixedBonus?: number;
    fixedBonusReason?: string;
    providentFundDeduction?: number;
    taxDeduction?: number;
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
  walletBalance?: number;
  totalWalletEarned?: number;
  totalWalletWithdrawn?: number;
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

export interface SalaryBreakdownItem {
  id: string;
  type: 'basic' | 'allowance' | 'bonus' | 'commission' | 'overtime' | 'pawna' | 'other_addition' | 'absent_cut' | 'late_cut' | 'advance_recovery' | 'loan_recovery' | 'fine' | 'tax_pf' | 'damage' | 'other_deduction';
  category: 'addition' | 'deduction';
  title: string;
  amount: number;
  reason?: string;
  calculationNote?: string;
  date?: string;
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
  companyId?: string;
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
  
  // Detailed reasons & itemized breakdowns for reports
  breakdowns?: SalaryBreakdownItem[];
  basicSalaryReason?: string;
  travelAllowance?: number;
  travelAllowanceReason?: string;
  foodAllowance?: number;
  foodAllowanceReason?: string;
  mobileAllowance?: number;
  mobileAllowanceReason?: string;
  houseRentAllowance?: number;
  houseRentReason?: string;
  medicalAllowance?: number;
  medicalReason?: string;
  specialAllowance?: number;
  specialReason?: string;
  dailyAllowance?: number;
  bonusReason?: string;
  commissionReason?: string;
  overtimeHours?: number;
  overtimeRate?: number;
  overtimeReason?: string;
  pawnaAmount?: number;
  pawnaReason?: string;
  otherAdditions?: number;
  otherAdditionsReason?: string;

  // Deductions with Reasons
  providentFundDeduction?: number;
  providentFundReason?: string;
  taxDeduction?: number;
  taxReason?: string;
  absentDays?: number;
  absentDeduction?: number;
  absentReason?: string;
  lateDays?: number;
  lateDeduction?: number;
  lateReason?: string;
  advanceDeduction?: number;
  advanceReason?: string;
  loanDeduction?: number;
  loanReason?: string;
  fineAmount?: number;
  fineReason?: string;
  damageCompensation?: number;
  damageReason?: string;
  taxOrPfDeduction?: number;
  taxOrPfReason?: string;
  otherDeductions?: number;
  otherDeductionsReason?: string;
  approvedBy?: string;
  approvedByName?: string;
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
  companyId?: string;
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
  paymentGatewayId?: string;
  paymentGatewayName?: string;
  senderNumber?: string;
  trxId?: string;
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

export interface ExpenseCategory {
  id: string;
  name: string;
  nameBn: string;
  icon?: string;
  color?: string;
  budgetMonthly?: number;
  isDefault?: boolean;
}

export interface Expense {
  id: string;
  companyId?: string;
  expenseNo?: string;
  amount: number;
  category: string;
  categoryName?: string;
  description: string;
  date: string;
  time?: string;
  paymentMethod?: string;
  paidTo?: string;
  referenceNo?: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
  addedBy?: string;
  addedByName?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type LoanInterestType = 'monthly' | 'yearly' | 'flat' | 'reducing';
export type LoanInstallmentFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time';
export type LoanStatus = 'active' | 'completed' | 'overdue' | 'closed';
export type LoanType = 'bank_loan' | 'ngo_loan' | 'sme_loan' | 'personal_loan' | 'mortgage' | 'microcredit' | 'credit_line' | 'other';

export interface LoanDocument {
  id: string;
  name: string;
  type: string; // 'agreement' | 'bank_statement' | 'receipt' | 'cheque' | 'collateral' | 'other'
  fileUrl: string; // base64 or URL
  fileSize?: string;
  uploadDate: string;
  notes?: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  installmentNo?: number;
  paymentDate: string;
  amount: number; // Total paid
  principalPaid: number; // Principal portion
  interestPaid: number; // Interest portion
  penaltyPaid?: number; // Late fee or penalty portion
  paymentMethod: 'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad' | 'rocket' | 'other';
  bankAccount?: string;
  transactionRef?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  notes?: string;
  isEarlyPayment?: boolean;
  addedBy?: string;
  addedByName?: string;
  createdAt: string;
}

export interface CompanyLoan {
  id: string;
  companyId?: string;
  loanIdNumber?: string; // Display Loan ID, e.g. "LOAN-2026-001"
  providerName: string; // Bank, NGO, Company, Person name
  providerType: 'bank' | 'ngo' | 'company' | 'individual' | 'financial_institution';
  providerPhone?: string;
  providerEmail?: string;
  providerAddress?: string;
  loanType: LoanType;
  principalAmount: number; // Asol taka
  loanDate: string; // Loan taken date
  firstPaymentDate: string;
  dueDate: string; // Final maturity date
  
  interestRate: number; // %
  interestType: LoanInterestType;
  loanTenure: number; // in months/periods
  installmentFrequency: LoanInstallmentFrequency;
  
  totalInstallments: number;
  installmentAmount: number;
  totalInterest: number;
  totalPayable: number;
  
  totalPaidAmount: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalPenaltyPaid: number;
  totalPenaltyDue: number;
  
  remainingLoan: number; // Outstanding total
  remainingPrincipal: number; // Outstanding principal
  
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  
  collateralSecurity?: string;
  bankAccountNumber?: string;
  referenceNumber?: string;
  notes?: string;
  
  documents: LoanDocument[];
  payments: LoanPayment[];
  
  status: LoanStatus; // 'active' | 'completed' | 'overdue' | 'closed'
  closedDate?: string;
  closureReason?: string;
  
  createdAt: string;
  updatedAt: string;
  addedBy?: string;
  addedByName?: string;
}

export function calculateLowStockAlerts(products: Product[]): Product[] {
  return (products || []).filter(p => {
    if (p.status === 'inactive') return false;
    const minThreshold = p.minStock !== undefined && p.minStock !== null ? Number(p.minStock) : 5;
    return Number(p.stock) <= minThreshold;
  });
}