import { CompanyLoan, LoanPayment } from '../../types';

export interface LoanCalculationResult {
  totalInterest: number;
  totalPayable: number;
  installmentAmount: number;
  totalInstallments: number;
  calculatedDueDate: string;
}

/**
 * Calculates loan repayments based on interest type, rate, principal, and tenure.
 */
export function calculateLoanDetails(
  principal: number,
  interestRate: number, // in percent (e.g. 9 for 9%)
  interestType: 'monthly' | 'yearly' | 'flat' | 'reducing',
  tenure: number, // in months
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time' = 'monthly',
  startDate: string = new Date().toISOString().split('T')[0]
): LoanCalculationResult {
  const p = Math.max(0, Number(principal) || 0);
  const rate = Math.max(0, Number(interestRate) || 0);
  const tenureMonths = Math.max(1, Number(tenure) || 1);

  let totalInstallments = tenureMonths;
  if (frequency === 'weekly') {
    totalInstallments = Math.round((tenureMonths * 30.5) / 7);
  } else if (frequency === 'quarterly') {
    totalInstallments = Math.max(1, Math.round(tenureMonths / 3));
  } else if (frequency === 'yearly') {
    totalInstallments = Math.max(1, Math.round(tenureMonths / 12));
  } else if (frequency === 'one_time') {
    totalInstallments = 1;
  }

  let totalInterest = 0;
  let totalPayable = p;
  let installmentAmount = 0;

  if (p > 0) {
    if (interestType === 'monthly') {
      // Monthly simple interest: Principal * (rate/100) * months
      totalInterest = p * (rate / 100) * tenureMonths;
      totalPayable = p + totalInterest;
      installmentAmount = totalInstallments > 0 ? totalPayable / totalInstallments : totalPayable;
    } else if (interestType === 'flat' || interestType === 'yearly') {
      // Yearly flat interest: Principal * (rate/100) * (tenureMonths / 12)
      const years = tenureMonths / 12;
      totalInterest = p * (rate / 100) * years;
      totalPayable = p + totalInterest;
      installmentAmount = totalInstallments > 0 ? totalPayable / totalInstallments : totalPayable;
    } else if (interestType === 'reducing') {
      // Reducing balance (standard EMI calculation)
      // Monthly interest rate r
      const r = (rate / 100) / 12;
      if (r > 0 && totalInstallments > 0) {
        const emi = (p * r * Math.pow(1 + r, totalInstallments)) / (Math.pow(1 + r, totalInstallments) - 1);
        installmentAmount = Math.round(emi);
        totalPayable = installmentAmount * totalInstallments;
        totalInterest = Math.max(0, totalPayable - p);
      } else {
        installmentAmount = totalInstallments > 0 ? p / totalInstallments : p;
        totalPayable = p;
        totalInterest = 0;
      }
    }
  }

  // Calculate Due Date based on start date + tenure in months
  const sDate = startDate ? new Date(startDate) : new Date();
  const dDate = new Date(sDate);
  dDate.setMonth(dDate.getMonth() + tenureMonths);
  const calculatedDueDate = dDate.toISOString().split('T')[0];

  return {
    totalInterest: Math.round(totalInterest),
    totalPayable: Math.round(totalPayable),
    installmentAmount: Math.round(installmentAmount),
    totalInstallments,
    calculatedDueDate
  };
}

/**
 * Re-computes loan status, remaining balances, and next payment date from loan data and payments array.
 */
export function recalculateLoanStatus(loan: CompanyLoan, paymentsList?: LoanPayment[]): Partial<CompanyLoan> {
  const payments = paymentsList || loan.payments || [];
  
  const totalPaidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPrincipalPaid = payments.reduce((sum, p) => sum + (Number(p.principalPaid) || 0), 0);
  const totalInterestPaid = payments.reduce((sum, p) => sum + (Number(p.interestPaid) || 0), 0);
  const totalPenaltyPaid = payments.reduce((sum, p) => sum + (Number(p.penaltyPaid) || 0), 0);

  const totalPayable = Number(loan.totalPayable) || (Number(loan.principalAmount) + (Number(loan.totalInterest) || 0));
  const principalAmount = Number(loan.principalAmount) || 0;

  const remainingLoan = Math.max(0, totalPayable - totalPaidAmount);
  const remainingPrincipal = Math.max(0, principalAmount - totalPrincipalPaid);

  let status = loan.status;
  if (remainingLoan <= 0 && totalPayable > 0) {
    status = 'completed';
  } else if (loan.status === 'closed') {
    status = 'closed';
  } else {
    // Check if next payment or due date is overdue
    const today = new Date().toISOString().split('T')[0];
    if (loan.dueDate && today > loan.dueDate && remainingLoan > 0) {
      status = 'overdue';
    } else if (loan.nextPaymentDate && today > loan.nextPaymentDate && remainingLoan > 0) {
      status = 'overdue';
    } else {
      status = 'active';
    }
  }

  // Estimate next payment date if active
  let nextPaymentDate = loan.nextPaymentDate || loan.firstPaymentDate || loan.loanDate;
  if (payments.length > 0 && status === 'active') {
    // sort payments by date
    const sorted = [...payments].sort((a, b) => (a.paymentDate || '').localeCompare(b.paymentDate || ''));
    const lastPayment = sorted[sorted.length - 1];
    if (lastPayment && lastPayment.paymentDate) {
      const lastDate = new Date(lastPayment.paymentDate);
      if (loan.installmentFrequency === 'weekly') {
        lastDate.setDate(lastDate.getDate() + 7);
      } else if (loan.installmentFrequency === 'quarterly') {
        lastDate.setMonth(lastDate.getMonth() + 3);
      } else if (loan.installmentFrequency === 'yearly') {
        lastDate.setFullYear(lastDate.getFullYear() + 1);
      } else {
        lastDate.setMonth(lastDate.getMonth() + 1);
      }
      nextPaymentDate = lastDate.toISOString().split('T')[0];
    }
  }

  const nextPaymentAmount = remainingLoan > 0 ? Math.min(remainingLoan, Number(loan.installmentAmount) || remainingLoan) : 0;

  return {
    totalPaidAmount,
    totalPrincipalPaid,
    totalInterestPaid,
    totalPenaltyPaid,
    remainingLoan,
    remainingPrincipal,
    nextPaymentDate,
    nextPaymentAmount,
    status
  };
}

/**
 * Formats currency in Bangladeshi Taka style.
 */
export function formatBDT(amount: number | undefined | null): string {
  const val = Number(amount) || 0;
  return '৳' + val.toLocaleString('en-IN');
}

/**
 * Export loan list / report to CSV.
 */
export function exportLoansToCSV(loans: CompanyLoan[], fileName = 'company_loans_report.csv') {
  if (!loans || loans.length === 0) {
    alert('কোনো ঋণের তথ্য পাওয়া যায়নি।');
    return;
  }

  const headers = [
    'Loan ID',
    'Provider Name',
    'Provider Type',
    'Loan Type',
    'Loan Date',
    'Principal Amount (৳)',
    'Interest Rate (%)',
    'Interest Type',
    'Total Payable (৳)',
    'Total Paid (৳)',
    'Principal Paid (৳)',
    'Interest Paid (৳)',
    'Remaining Loan (৳)',
    'Next Payment Date',
    'Next Amount (৳)',
    'Due Date',
    'Status',
    'Reference No'
  ];

  const rows = loans.map(l => [
    `"${l.loanIdNumber || l.id}"`,
    `"${l.providerName || ''}"`,
    `"${l.providerType || ''}"`,
    `"${l.loanType || ''}"`,
    `"${l.loanDate || ''}"`,
    l.principalAmount || 0,
    l.interestRate || 0,
    `"${l.interestType || ''}"`,
    l.totalPayable || 0,
    l.totalPaidAmount || 0,
    l.totalPrincipalPaid || 0,
    l.totalInterestPaid || 0,
    l.remainingLoan || 0,
    `"${l.nextPaymentDate || ''}"`,
    l.nextPaymentAmount || 0,
    `"${l.dueDate || ''}"`,
    `"${l.status || ''}"`,
    `"${l.referenceNumber || ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
