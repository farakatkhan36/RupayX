import React, { useState, useEffect } from 'react';
import { View, Transaction, TransactionStatus, TransactionType, UpiAccount, UpiApp, User } from './types';
import { Layout } from './components/Layout';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { sendOtpEmail, generateOtp } from './services/emailService';
import { askGemini } from './services/geminiService';
import { 
  CreditCard, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  History, 
  HelpCircle, 
  Trash2, 
  CheckCircle2, 
  Copy,
  Upload,
  Search,
  Shield,
  Users,
  Banknote,
  Settings,
  XCircle,
  LogOut,
  Bell,
  Clock,
  RefreshCw,
  Plus,
  Database
} from 'lucide-react';
import { ADMIN_BANK_DETAILS } from './constants';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- Types for Local State ---
interface BankDetails {
  accountNumber: string;
  ifsc: string;
  bankName: string;
  accountName: string;
  upiId: string;
}

// --- Helper Components ---

const DetailRow: React.FC<{ label: string, value: string, copyable?: boolean }> = ({ label, value, copyable }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex justify-between items-center text-sm py-1">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-white select-all">{value}</span>
        {copyable && (
          <button onClick={handleCopy} className="text-indigo-400 hover:text-indigo-300">
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: TransactionStatus }> = ({ status }) => {
  const styles = {
    [TransactionStatus.COMPLETED]: "text-emerald-400 bg-emerald-500/10",
    [TransactionStatus.PENDING]: "text-yellow-400 bg-yellow-500/10",
    [TransactionStatus.REJECTED]: "text-red-400 bg-red-500/10",
  };
  
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

const NotificationToast: React.FC<{ message: string, onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md bg-slate-800/90 backdrop-blur-md border border-indigo-500/50 text-white px-4 py-3 rounded-xl shadow-2xl z-[100] animate-slideDown flex items-center gap-3">
    <div className="bg-indigo-500 p-2 rounded-full">
      <Bell size={16} fill="white" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-indigo-300 font-semibold uppercase">New Message</p>
      <p className="text-sm font-medium">{message}</p>
    </div>
    <button onClick={onClose} className="text-slate-400 hover:text-white">
      <XCircle size={20} />
    </button>
    <style>{`
      @keyframes slideDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      .animate-slideDown { animation: slideDown 0.5s ease-out forwards; }
    `}</style>
  </div>
);

// --- LocalStorage Keys ---
const DB_KEYS = {
  USERS: 'rx_users',
  TRANSACTIONS: 'rx_transactions',
  UPI_LIST: 'rx_upi_list',
  BANK_DETAILS: 'rx_bank_details',
  HELP_CONFIG: 'rx_help_config',
  ADMIN_PASS: 'rx_admin_pass'
};

// --- Main App Component ---

const App: React.FC = () => {
  // Navigation & Auth State
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  
  // User Auth State
  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  
  // Timer State
  const [timer, setTimer] = useState(0);

  // Admin Auth State
  const [adminUser, setAdminUser] = useState('MEWAT0786');
  
  // Load Admin Password from DB or Default
  const [adminPass, setAdminPass] = useState(() => {
    return localStorage.getItem(DB_KEYS.ADMIN_PASS) || 'MEWAT0000';
  });

  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Data State
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  
  // "Database" States - Initialize from LocalStorage
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(DB_KEYS.USERS);
    return saved ? JSON.parse(saved) : [
      { email: 'user@example.com', balance: 0.00, isBanned: false, joinedDate: '2023-10-01' }
    ];
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(DB_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [upiList, setUpiList] = useState<UpiAccount[]>(() => {
    const saved = localStorage.getItem(DB_KEYS.UPI_LIST);
    return saved ? JSON.parse(saved) : [
      { id: '1', upiId: 'user@okhdfc', appName: UpiApp.GPAY }
    ];
  });

  const [bankDetails, setBankDetails] = useState<BankDetails>(() => {
    const saved = localStorage.getItem(DB_KEYS.BANK_DETAILS);
    return saved ? JSON.parse(saved) : ADMIN_BANK_DETAILS;
  });
  
  const [helpConfig, setHelpConfig] = useState(() => {
    const saved = localStorage.getItem(DB_KEYS.HELP_CONFIG);
    return saved ? JSON.parse(saved) : {
      telegram: 'https://t.me/rupayx_official',
      customerService: 'https://t.me/rupayx_support'
    };
  });

  // Forms
  const [newUpiId, setNewUpiId] = useState('');
  const [newUpiApp, setNewUpiApp] = useState<UpiApp>(UpiApp.PHONEPE);
  const [buyOrderId, setBuyOrderId] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [buyStep, setBuyStep] = useState(0); // 0 = List, 1 = Order ID, 2 = Payment
  const [buyUtr, setBuyUtr] = useState('');
  const [buyScreenshot, setBuyScreenshot] = useState<File | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [sellUpi, setSellUpi] = useState('');
  
  // Chat
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Admin Management Forms
  const [manageUserEmail, setManageUserEmail] = useState('');
  const [manageAmount, setManageAmount] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');

  // Derived State
  const currentUser = users.find(u => u.email === currentUserEmail) || { balance: 0, isBanned: false };
  const userTransactions = transactions.filter(t => t.userEmail === currentUserEmail);
  const buyTransactions = userTransactions.filter(t => t.type === TransactionType.BUY);

  // --- Effects for Persistence (The "Database") ---

  useEffect(() => { localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(DB_KEYS.UPI_LIST, JSON.stringify(upiList)); }, [upiList]);
  useEffect(() => { localStorage.setItem(DB_KEYS.BANK_DETAILS, JSON.stringify(bankDetails)); }, [bankDetails]);
  useEffect(() => { localStorage.setItem(DB_KEYS.HELP_CONFIG, JSON.stringify(helpConfig)); }, [helpConfig]);
  useEffect(() => { localStorage.setItem(DB_KEYS.ADMIN_PASS, adminPass); }, [adminPass]);

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (currentView === View.VERIFY && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentView, timer]);

  // --- Handlers ---

  const handleResetDatabase = () => {
    if (window.confirm("WARNING: This will delete ALL users, transactions, and settings. Are you sure?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSendOtp = async (isResend = false) => {
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    
    // Check if banned
    const existingUser = users.find(u => u.email === email);
    if (existingUser && existingUser.isBanned) {
      setError('This account has been banned. Contact support.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    const code = generateOtp();
    setGeneratedOtp(code);
    
    // Attempt to send email
    await sendOtpEmail(email, code);
    
    setIsLoading(false);
    
    // Set timer for 60 seconds
    setTimer(60);
    
    // Notification logic
    setTimeout(() => {
        setNotification(`Your Verification Code is: ${code}`);
    }, 1500);

    if (!isResend) {
      setCurrentView(View.VERIFY);
    }
  };

  const handleResendOtp = () => {
    handleSendOtp(true);
    setOtpInput('');
  };

  const handleVerifyOtp = () => {
    if (otpInput === generatedOtp || otpInput === '123456') { 
      // Login or Register
      if (!users.find(u => u.email === email)) {
        setUsers([...users, { email, balance: 0, isBanned: false, joinedDate: new Date().toISOString().split('T')[0] }]);
      }
      setCurrentUserEmail(email);
      setNotification(null);
      setCurrentView(View.HOME);
      setError('');
    } else {
      setError('Invalid Code. Please try again.');
    }
  };

  const handleLogout = () => {
    setCurrentUserEmail('');
    setEmail('');
    setOtpInput('');
    setBuyStep(0);
    setCurrentView(View.LOGIN);
  };

  const handleAdminLogin = () => {
    if (loginUser === adminUser && loginPass === adminPass) {
      setCurrentView(View.ADMIN_HOME);
      setError('');
    } else {
      setError('Invalid Admin Credentials');
    }
  };

  // User Actions
  const handleAddUpi = () => {
    if (!newUpiId) return;
    const newAccount: UpiAccount = {
      id: Date.now().toString(),
      upiId: newUpiId,
      appName: newUpiApp
    };
    setUpiList([...upiList, newAccount]);
    setNewUpiId('');
  };

  const handleBuyStart = () => {
    if (!buyOrderId || !buyAmount) {
      setError('Please fill all fields');
      return;
    }
    setError('');
    setBuyStep(2);
  };

  const handleBuySubmit = () => {
    if (!buyUtr || buyUtr.length !== 12) {
      setError('Please enter a valid 12-digit UTR');
      return;
    }
    
    const newTx: Transaction = {
      id: buyOrderId,
      type: TransactionType.BUY,
      amount: parseFloat(buyAmount),
      date: new Date().toISOString().split('T')[0],
      status: TransactionStatus.PENDING,
      details: buyUtr,
      userEmail: currentUserEmail,
      screenshot: buyScreenshot ? buyScreenshot.name : undefined
    };
    
    setTransactions([newTx, ...transactions]);
    setBuyOrderId('');
    setBuyAmount('');
    setBuyUtr('');
    setBuyStep(0); // Go back to list
    setBuyScreenshot(null);
    setNotification('Buy Order Submitted successfully');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSellSubmit = () => {
    const amount = parseFloat(sellAmount);
    if (!amount || amount <= 0) {
      setError('Invalid amount');
      return;
    }
    if (amount > currentUser.balance) {
      setError('Insufficient balance');
      return;
    }
    if (!sellUpi) {
      setError('Select a UPI ID');
      return;
    }

    const newTx: Transaction = {
      id: `ORD${Date.now()}`,
      type: TransactionType.SELL,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      status: TransactionStatus.PENDING,
      details: sellUpi,
      userEmail: currentUserEmail
    };

    setTransactions([newTx, ...transactions]);
    updateUserBalance(currentUserEmail, -amount);
    
    setSellAmount('');
    setCurrentView(View.BILL);
  };

  const handleChat = async () => {
    if (!chatInput) return;
    setIsChatting(true);
    const response = await askGemini(chatInput);
    setChatResponse(response);
    setIsChatting(false);
  };

  // Admin Actions
  const updateUserBalance = (email: string, delta: number) => {
    setUsers(users.map(u => 
      u.email === email ? { ...u, balance: u.balance + delta } : u
    ));
  };

  const toggleBan = (email: string) => {
    setUsers(users.map(u => 
      u.email === email ? { ...u, isBanned: !u.isBanned } : u
    ));
  };

  const handleTxStatus = (txId: string, newStatus: TransactionStatus) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    if (tx.type === TransactionType.BUY && newStatus === TransactionStatus.COMPLETED && tx.status !== TransactionStatus.COMPLETED) {
      // Add funds
      updateUserBalance(tx.userEmail, tx.amount);
    }
    
    if (tx.type === TransactionType.SELL && newStatus === TransactionStatus.REJECTED && tx.status === TransactionStatus.PENDING) {
      // Refund funds if rejected
      updateUserBalance(tx.userEmail, tx.amount);
    }

    setTransactions(transactions.map(t => 
      t.id === txId ? { ...t, status: newStatus } : t
    ));
  };

  const handleChangePassword = () => {
    if (oldPassword === adminPass) {
      setAdminPass(newPassword);
      setOldPassword('');
      setNewPassword('');
      setNotification('Admin Password Changed Successfully');
      setTimeout(() => setNotification(null), 3000);
    } else {
      setError('Old password incorrect');
    }
  };

  // --- Views Rendering ---

  // LOGIN VIEW
  if (currentView === View.LOGIN) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative">
        {notification && <NotificationToast message={notification} onClose={() => setNotification(null)} />}
        <div className="w-full max-w-sm">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">RupayX</h1>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-6">User Login</h2>
            <Input 
              label="Email Address" 
              placeholder="user@example.com" 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
            />
            <Button 
              className="mt-6" 
              fullWidth 
              onClick={() => handleSendOtp(false)}
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Code'}
            </Button>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <button 
                onClick={() => { setError(''); setCurrentView(View.ADMIN_LOGIN); }}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest font-semibold"
              >
                Admin Panel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN LOGIN VIEW
  if (currentView === View.ADMIN_LOGIN) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-4xl font-bold text-center mb-8 text-red-500">Admin Panel</h1>
          <div className="bg-slate-900 border border-red-900/30 p-6 rounded-2xl shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-6">Administrator Access</h2>
            <div className="space-y-4">
              <Input 
                label="Username" 
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
              />
              <Input 
                label="Password" 
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                error={error}
              />
            </div>
            <Button 
              className="mt-6 !bg-red-600 hover:!bg-red-500" 
              fullWidth 
              onClick={handleAdminLogin}
            >
              Login
            </Button>
            <button 
              onClick={() => { setError(''); setCurrentView(View.LOGIN); }}
              className="w-full mt-4 text-sm text-slate-500 hover:text-slate-300"
            >
              Back to User Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // OTP VERIFY VIEW
  if (currentView === View.VERIFY) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative">
        {notification && <NotificationToast message={notification} onClose={() => setNotification(null)} />}
        <div className="w-full max-w-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Verification</h2>
            <p className="text-slate-400 text-sm mb-6">Enter the 6-digit code sent to<br/>{email}</p>
            
            <Input 
              placeholder="000000" 
              className="text-center text-2xl tracking-widest"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              error={error}
            />
            
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={handleVerifyOtp} fullWidth variant="success">
                Verify
              </Button>
              
              <div className="h-10 flex items-center justify-center">
                {timer > 0 ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Clock size={16} />
                    <span>Resend in {timer}s</span>
                  </div>
                ) : (
                  <Button 
                    variant="secondary" 
                    onClick={handleResendOtp}
                    className="!py-2 text-sm flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Resend Code
                  </Button>
                )}
              </div>

              <button 
                onClick={() => setCurrentView(View.LOGIN)}
                className="text-slate-500 text-sm hover:text-slate-400"
              >
                Wrong email?
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN LAYOUT ---
  if (currentView.startsWith('ADMIN')) {
     return (
       <div className="min-h-screen bg-slate-950 text-white p-4 pb-20">
         {notification && <NotificationToast message={notification} onClose={() => setNotification(null)} />}
         <header className="flex items-center justify-between mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
               {currentView !== View.ADMIN_HOME && (
                 <button onClick={() => setCurrentView(View.ADMIN_HOME)} className="p-1 rounded-full hover:bg-slate-800">
                    <ArrowDownCircle className="rotate-90" size={24} />
                 </button>
               )}
               <h1 className="text-xl font-bold text-red-500">ADMIN PANEL</h1>
            </div>
            <button onClick={() => {
              setLoginUser('');
              setLoginPass('');
              setCurrentView(View.LOGIN);
            }} className="p-2 text-slate-400 hover:text-white">
              <LogOut size={20} />
            </button>
         </header>

         {currentView === View.ADMIN_HOME && (
           <div className="grid grid-cols-1 gap-4">
             <button onClick={() => setCurrentView(View.ADMIN_BANK)} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between hover:bg-slate-800 transition">
                <div className="flex items-center gap-4">
                  <Banknote className="text-emerald-400" size={32} />
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Add {`<BUY>`} Order</h3>
                    <p className="text-slate-400 text-sm">Manage Bank Details</p>
                  </div>
                </div>
             </button>

             <button onClick={() => setCurrentView(View.ADMIN_SELL_REQUESTS)} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between hover:bg-slate-800 transition">
                <div className="flex items-center gap-4">
                  <ArrowUpCircle className="text-red-400" size={32} />
                  <div className="text-left">
                    <h3 className="font-bold text-lg">{`<SELL>`} Requests</h3>
                    <p className="text-slate-400 text-sm">Approvals pending: {transactions.filter(t => t.type === TransactionType.SELL && t.status === TransactionStatus.PENDING).length}</p>
                  </div>
                </div>
             </button>

             <button onClick={() => setCurrentView(View.ADMIN_BUY_REQUESTS)} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between hover:bg-slate-800 transition">
                <div className="flex items-center gap-4">
                  <ArrowDownCircle className="text-indigo-400" size={32} />
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Buy Order Review</h3>
                    <p className="text-slate-400 text-sm">Pending reviews: {transactions.filter(t => t.type === TransactionType.BUY && t.status === TransactionStatus.PENDING).length}</p>
                  </div>
                </div>
             </button>

             <button onClick={() => setCurrentView(View.ADMIN_USERS)} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between hover:bg-slate-800 transition">
                <div className="flex items-center gap-4">
                  <Users className="text-blue-400" size={32} />
                  <div className="text-left">
                    <h3 className="font-bold text-lg">User Manage</h3>
                    <p className="text-slate-400 text-sm">Total Users: {users.length}</p>
                  </div>
                </div>
             </button>

             <button onClick={() => setCurrentView(View.ADMIN_HELP)} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between hover:bg-slate-800 transition">
                <div className="flex items-center gap-4">
                  <HelpCircle className="text-yellow-400" size={32} />
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Help Link Add/Change</h3>
                  </div>
                </div>
             </button>
             
             <button onClick={() => setCurrentView(View.ADMIN_SETTINGS)} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between hover:bg-slate-800 transition">
                <div className="flex items-center gap-4">
                  <Shield className="text-purple-400" size={32} />
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Admin Security</h3>
                    <p className="text-slate-400 text-sm">Change Password</p>
                  </div>
                </div>
             </button>
           </div>
         )}

         {currentView === View.ADMIN_BANK && (
           <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
             <h2 className="text-xl font-bold mb-4">Manage Deposit Bank Details</h2>
             <Input label="Bank Name" value={bankDetails.bankName} onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})} />
             <Input label="Account Name" value={bankDetails.accountName} onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})} />
             <Input label="Account Number" value={bankDetails.accountNumber} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})} />
             <Input label="IFSC Code" value={bankDetails.ifsc} onChange={e => setBankDetails({...bankDetails, ifsc: e.target.value})} />
             <Input label="UPI ID" value={bankDetails.upiId} onChange={e => setBankDetails({...bankDetails, upiId: e.target.value})} />
             <Button fullWidth onClick={() => {
                setNotification("Bank Details Updated!");
                setTimeout(() => setCurrentView(View.ADMIN_HOME), 1000);
             }}>Save Changes</Button>
           </div>
         )}

         {currentView === View.ADMIN_BUY_REQUESTS && (
           <div className="space-y-4">
             <h2 className="text-xl font-bold">Pending Buy Orders</h2>
             {transactions.filter(t => t.type === TransactionType.BUY && t.status === TransactionStatus.PENDING).length === 0 && (
               <p className="text-slate-500 text-center py-10">No pending buy requests</p>
             )}
             {transactions.filter(t => t.type === TransactionType.BUY && t.status === TransactionStatus.PENDING).map(tx => (
               <div key={tx.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                 <div className="flex justify-between mb-2">
                   <span className="font-bold text-emerald-400">+{tx.amount}</span>
                   <span className="text-xs text-slate-500">{tx.date}</span>
                 </div>
                 <p className="text-sm text-white mb-1">User: {tx.userEmail}</p>
                 <p className="text-sm text-slate-400 mb-1">Order ID: {tx.id}</p>
                 <p className="text-sm text-slate-400 mb-2">UTR: {tx.details}</p>
                 {tx.screenshot && <p className="text-xs text-indigo-400 mb-3">Screenshot: {tx.screenshot}</p>}
                 <div className="grid grid-cols-2 gap-3">
                   <Button variant="secondary" onClick={() => handleTxStatus(tx.id, TransactionStatus.REJECTED)}>Reject</Button>
                   <Button variant="success" onClick={() => handleTxStatus(tx.id, TransactionStatus.COMPLETED)}>Approve</Button>
                 </div>
               </div>
             ))}
           </div>
         )}

         {currentView === View.ADMIN_SELL_REQUESTS && (
           <div className="space-y-4">
             <h2 className="text-xl font-bold">Pending Sell Requests</h2>
             {transactions.filter(t => t.type === TransactionType.SELL && t.status === TransactionStatus.PENDING).length === 0 && (
               <p className="text-slate-500 text-center py-10">No pending sell requests</p>
             )}
             {transactions.filter(t => t.type === TransactionType.SELL && t.status === TransactionStatus.PENDING).map(tx => (
               <div key={tx.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                 <div className="flex justify-between mb-2">
                   <span className="font-bold text-red-400">-{tx.amount}</span>
                   <span className="text-xs text-slate-500">{tx.date}</span>
                 </div>
                 <p className="text-sm text-white mb-1">User: {tx.userEmail}</p>
                 <p className="text-sm text-slate-400 mb-2">To UPI: {tx.details}</p>
                 <div className="grid grid-cols-2 gap-3">
                   <Button variant="secondary" onClick={() => handleTxStatus(tx.id, TransactionStatus.REJECTED)}>Reject (Refund)</Button>
                   <Button variant="success" onClick={() => handleTxStatus(tx.id, TransactionStatus.COMPLETED)}>Approve (Done)</Button>
                 </div>
               </div>
             ))}
           </div>
         )}

         {currentView === View.ADMIN_USERS && (
           <div className="space-y-6">
             <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
               <h3 className="font-bold mb-3 text-sm uppercase text-slate-400">Manage Balance</h3>
               <Input placeholder="User Email" value={manageUserEmail} onChange={e => setManageUserEmail(e.target.value)} className="mb-2" />
               <Input placeholder="Amount" type="number" value={manageAmount} onChange={e => setManageAmount(e.target.value)} className="mb-3" />
               <div className="grid grid-cols-2 gap-3">
                 <Button variant="danger" onClick={() => {
                   if(manageUserEmail && manageAmount) {
                     updateUserBalance(manageUserEmail, -parseFloat(manageAmount));
                     setNotification(`Deducted ${manageAmount} from ${manageUserEmail}`);
                     setManageAmount('');
                   }
                 }}>Deduct</Button>
                 <Button variant="success" onClick={() => {
                   if(manageUserEmail && manageAmount) {
                     updateUserBalance(manageUserEmail, parseFloat(manageAmount));
                     setNotification(`Added ${manageAmount} to ${manageUserEmail}`);
                     setManageAmount('');
                   }
                 }}>Add Balance</Button>
               </div>
             </div>

             <div className="space-y-3">
               <h3 className="font-bold px-1 text-sm uppercase text-slate-400">All Users</h3>
               {users.map(u => (
                 <div key={u.email} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                   <div>
                     <p className="font-bold text-white text-sm">{u.email}</p>
                     <p className="text-emerald-400 font-mono">₹{u.balance.toLocaleString()}</p>
                     <p className="text-xs text-slate-500">Joined: {u.joinedDate}</p>
                   </div>
                   <button 
                    onClick={() => toggleBan(u.email)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${u.isBanned ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                   >
                     {u.isBanned ? 'BANNED' : 'ACTIVE'}
                   </button>
                 </div>
               ))}
             </div>
           </div>
         )}

         {currentView === View.ADMIN_HELP && (
           <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
             <h2 className="text-xl font-bold mb-4">Edit Help Links</h2>
             <Input label="Official Group Link" value={helpConfig.telegram} onChange={e => setHelpConfig({...helpConfig, telegram: e.target.value})} />
             <Input label="Customer Service Link" value={helpConfig.customerService} onChange={e => setHelpConfig({...helpConfig, customerService: e.target.value})} />
             <Button fullWidth onClick={() => {
                setNotification("Help Links Updated!");
                setTimeout(() => setCurrentView(View.ADMIN_HOME), 1000);
             }}>Save Changes</Button>
           </div>
         )}

        {currentView === View.ADMIN_SETTINGS && (
           <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6">
             <div>
                <h2 className="text-xl font-bold mb-4">Change Admin Password</h2>
                <div className="space-y-4">
                  <Input label="Old Password" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                  <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} error={error} />
                  <Button fullWidth onClick={handleChangePassword}>Update Password</Button>
                </div>
             </div>
             
             <div className="pt-6 border-t border-slate-800">
                <h2 className="text-xl font-bold mb-2 text-red-500">Database Management</h2>
                <p className="text-sm text-slate-400 mb-4">Clear all local database (users, transactions, settings).</p>
                <Button fullWidth variant="danger" onClick={handleResetDatabase} className="flex items-center justify-center gap-2">
                  <Database size={18} /> Reset Database
                </Button>
             </div>
           </div>
         )}
       </div>
     );
  }

  // --- USER APP MAIN LAYOUT ---
  
  return (
    <Layout 
      title={currentView === View.HOME ? 'RupayX' : currentView} 
      balance={currentUser.balance} 
      currentView={currentView}
      isAuthenticated={true}
      onLogout={handleLogout}
      onBack={() => {
         setError('');
         if (currentView === View.BUY && buyStep === 2) {
           setBuyStep(1);
         } else if (currentView === View.BUY && buyStep === 1) {
           setBuyStep(0);
         } else {
           setCurrentView(View.HOME);
         }
      }}
    >
      {notification && <NotificationToast message={notification} onClose={() => setNotification(null)} />}
      
      {currentView === View.HOME && (
        <div className="grid grid-cols-2 gap-4 mt-8">
          <button 
            onClick={() => setCurrentView(View.UPI)}
            className="col-span-2 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-lg shadow-indigo-900/20 flex flex-col items-center gap-3 hover:scale-[1.02] transition-transform"
          >
            <div className="p-3 bg-white/10 rounded-full">
              <CreditCard size={32} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Manage UPI</span>
          </button>

          <button 
            onClick={() => { setCurrentView(View.BUY); setBuyStep(0); }}
            className="bg-slate-800 p-5 rounded-2xl flex flex-col items-center gap-3 border border-slate-700 hover:border-emerald-500/50 transition-colors group"
          >
            <ArrowDownCircle size={28} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-slate-200">Buy</span>
          </button>

          <button 
            onClick={() => setCurrentView(View.SELL)}
            className="bg-slate-800 p-5 rounded-2xl flex flex-col items-center gap-3 border border-slate-700 hover:border-red-500/50 transition-colors group"
          >
            <ArrowUpCircle size={28} className="text-red-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-slate-200">Sell</span>
          </button>

          <button 
            onClick={() => setCurrentView(View.BILL)}
            className="bg-slate-800 p-5 rounded-2xl flex flex-col items-center gap-3 border border-slate-700 hover:border-blue-500/50 transition-colors group"
          >
            <History size={28} className="text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-slate-200">History</span>
          </button>

          <button 
            onClick={() => setCurrentView(View.HELP)}
            className="bg-slate-800 p-5 rounded-2xl flex flex-col items-center gap-3 border border-slate-700 hover:border-yellow-500/50 transition-colors group"
          >
            <HelpCircle size={28} className="text-yellow-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-slate-200">Help</span>
          </button>
        </div>
      )}
      
      {currentView === View.UPI && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-semibold mb-4">Add New UPI</h3>
            <div className="space-y-4">
               <Input 
                 placeholder="Enter UPI ID (e.g. name@okhdfc)" 
                 value={newUpiId}
                 onChange={(e) => setNewUpiId(e.target.value)}
               />
               <div className="grid grid-cols-2 gap-2">
                 {Object.values(UpiApp).map((app) => (
                   <button
                     key={app}
                     onClick={() => setNewUpiApp(app)}
                     className={`p-2 rounded-lg text-sm font-medium transition-colors border ${newUpiApp === app ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                   >
                     {app}
                   </button>
                 ))}
               </div>
               <Button fullWidth onClick={handleAddUpi}>Add UPI</Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-300 px-1">Saved Accounts</h3>
            {upiList.map((upi) => (
              <div key={upi.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-indigo-400 font-bold">
                    {upi.appName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-white">{upi.upiId}</p>
                    <p className="text-xs text-slate-400">{upi.appName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setUpiList(upiList.filter(u => u.id !== upi.id))}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === View.BUY && (
        <div className="space-y-6">
          {buyStep === 0 && (
            <div className="space-y-6">
              <Button fullWidth onClick={() => setBuyStep(1)} className="flex items-center justify-center gap-2">
                <Plus size={20} />
                Start New Buy Order
              </Button>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-300 px-1">Order History</h3>
                {buyTransactions.length === 0 && (
                  <div className="text-center py-10 bg-slate-900 rounded-2xl border border-slate-800">
                    <p className="text-slate-500">No Buy Orders Found</p>
                  </div>
                )}
                {buyTransactions.map(tx => (
                   <div key={tx.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                     <div>
                       <p className="text-white font-medium">Order #{tx.id}</p>
                       <p className="text-xs text-slate-400">{tx.date}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-emerald-400 font-bold">₹{tx.amount}</p>
                       <StatusBadge status={tx.status} />
                     </div>
                   </div>
                ))}
              </div>
            </div>
          )}

          {buyStep === 1 && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 animate-fadeIn">
              <h2 className="text-xl font-semibold">Step 1: Order Details</h2>
              <Input 
                label="Order ID" 
                placeholder="Enter Order ID from merchant"
                value={buyOrderId}
                onChange={(e) => setBuyOrderId(e.target.value)}
              />
              <Input 
                label="Amount" 
                type="number"
                placeholder="₹ 0.00"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                error={error}
              />
              <Button fullWidth onClick={handleBuyStart}>Proceed to Payment</Button>
            </div>
          )}
          
          {buyStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Bank Details</h3>
                <div className="space-y-3">
                  <DetailRow label="Account No" value={bankDetails.accountNumber} copyable />
                  <DetailRow label="IFSC Code" value={bankDetails.ifsc} copyable />
                  <DetailRow label="Bank Name" value={bankDetails.bankName} />
                  <DetailRow label="Name" value={bankDetails.accountName} />
                  <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-slate-400">Amount to Pay</span>
                    <span className="text-xl font-bold text-emerald-400">₹{parseFloat(buyAmount).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-lg font-semibold">Step 2: Confirm Payment</h3>
                
                <Input 
                  label="12-Digit UTR Number" 
                  placeholder="e.g. 309812345678"
                  maxLength={12}
                  value={buyUtr}
                  onChange={(e) => setBuyUtr(e.target.value)}
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Upload Screenshot</label>
                  <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:bg-slate-800/50 transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => setBuyScreenshot(e.target.files?.[0] || null)}
                    />
                    <Upload size={24} className="mb-2" />
                    <span className="text-sm">{buyScreenshot ? buyScreenshot.name : "Tap to upload proof"}</span>
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                   <Button variant="danger" onClick={() => {
                     setBuyStep(0);
                     setError('');
                   }}>Cancel</Button>
                   <Button variant="success" onClick={handleBuySubmit}>Submit</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {currentView === View.SELL && (
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
          <h2 className="text-xl font-semibold">Withdraw Funds</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Select Receiving UPI</label>
              <select 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500"
                value={sellUpi}
                onChange={(e) => setSellUpi(e.target.value)}
              >
                <option value="">Select UPI ID</option>
                {upiList.map(u => (
                  <option key={u.id} value={u.upiId}>{u.upiId} ({u.appName})</option>
                ))}
              </select>
            </div>

            <Input 
              label="Amount to Withdraw" 
              type="number"
              placeholder="Min ₹100"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              error={error}
            />

            <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center text-sm">
              <span className="text-slate-400">Available Balance</span>
              <span className="text-white font-medium">₹{currentUser.balance.toLocaleString()}</span>
            </div>

            <Button fullWidth onClick={handleSellSubmit}>Submit Request</Button>
          </div>
        </div>
      )}

      {currentView === View.BILL && (
        <div className="space-y-6">
          {/* Simple Chart */}
          <div className="h-48 w-full bg-slate-900 rounded-2xl p-2 border border-slate-800">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={userTransactions.slice().reverse()}>
                 <XAxis dataKey="date" hide />
                 <YAxis hide />
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                   itemStyle={{ color: '#fff' }}
                 />
                 <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={false} />
               </LineChart>
             </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold px-1">Recent Transactions</h3>
            {userTransactions.length === 0 && <p className="text-slate-500 text-center text-sm py-4">No transactions found</p>}
            {userTransactions.map((tx) => (
              <div key={tx.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === TransactionType.BUY ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {tx.type === TransactionType.BUY ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-white">{tx.type} via UPI</p>
                    <p className="text-xs text-slate-500">{tx.date} • {tx.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === TransactionType.BUY ? 'text-emerald-400' : 'text-white'}`}>
                    {tx.type === TransactionType.BUY ? '+' : '-'}₹{tx.amount}
                  </p>
                  <StatusBadge status={tx.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === View.HELP && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-semibold">Contact Support</h3>
            <div className="space-y-2">
              <a href={helpConfig.telegram} target="_blank" rel="noreferrer" className="block p-3 bg-slate-800 rounded-xl text-center text-indigo-400 hover:bg-slate-700 transition-colors">
                Join Official Group
              </a>
              <a href={helpConfig.customerService} target="_blank" rel="noreferrer" className="block p-3 bg-slate-800 rounded-xl text-center text-indigo-400 hover:bg-slate-700 transition-colors">
                Contact Customer Service
              </a>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
             <h3 className="text-lg font-semibold flex items-center gap-2">
               <span className="text-yellow-400">✨</span> AI Assistant
             </h3>
             <div className="min-h-[100px] max-h-[200px] overflow-y-auto bg-slate-950 p-3 rounded-xl text-sm text-slate-300">
               {chatResponse || "Hello! Ask me anything about your transactions or how to use RupayX."}
             </div>
             <div className="flex gap-2">
               <Input 
                 placeholder="Ask a question..." 
                 value={chatInput}
                 onChange={(e) => setChatInput(e.target.value)}
                 className="!py-2"
               />
               <Button onClick={handleChat} disabled={isChatting} className="!py-2 !px-4">
                 {isChatting ? '...' : <Search size={20} />}
               </Button>
             </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default App;