export enum View {
  LOGIN = 'LOGIN',
  VERIFY = 'VERIFY',
  HOME = 'HOME',
  UPI = 'UPI',
  BUY = 'BUY',
  SELL = 'SELL',
  BILL = 'BILL',
  HELP = 'HELP',
  // Admin Views
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_HOME = 'ADMIN_HOME',
  ADMIN_BANK = 'ADMIN_BANK',
  ADMIN_BUY_REQUESTS = 'ADMIN_BUY_REQUESTS',
  ADMIN_SELL_REQUESTS = 'ADMIN_SELL_REQUESTS',
  ADMIN_USERS = 'ADMIN_USERS',
  ADMIN_HELP = 'ADMIN_HELP',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS'
}

export enum TransactionStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  REJECTED = 'Rejected'
}

export enum TransactionType {
  BUY = 'Buy',
  SELL = 'Sell'
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  status: TransactionStatus;
  details?: string; // UTR or UPI ID
  screenshot?: string; // URL or name
  userEmail: string;
}

export interface UpiAccount {
  id: string;
  upiId: string;
  appName: string;
}

export interface User {
  email: string;
  balance: number;
  isBanned: boolean;
  joinedDate: string;
}

export enum UpiApp {
  PHONEPE = 'PhonePe',
  PAYTM = 'Paytm',
  GPAY = 'Gpay',
  FAMPAY = 'FamPay'
}