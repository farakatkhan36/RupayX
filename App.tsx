import React, { useState, useEffect } from 'react';
import { View, Transaction, TransactionStatus, TransactionType, UpiAccount, UpiApp, User, DepositTask } from './types';
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
  Database,
  TrendingUp,
  Package,
  Filter,
  Home,
  Share2,
  Gift,
  User as UserIcon,
  Lock,
  Mail,
  Key,
  Ticket
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
        <span className="font-mono text-white select-all text-right">{value}</span>
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
    [TransactionStatus.COMPLETED]: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    [TransactionStatus.PENDING]: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    [TransactionStatus.REJECTED]: "text-red-400 bg-red-500/10 border-red-500/20",
  };
  
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${styles[status]}`}>
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
      <p className="text-xs text-indigo-300 font-semibold uppercase">Notification</p>
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
  ADMIN_PASS: 'rx_admin_pass',
  DEPOSIT_TASKS: 'rx_deposit_tasks'
};

// --- Main App Component ---

const App: React.FC = () => {
  // Navigation & Auth State
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  // User Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referCodeInput, setReferCodeInput] = useState(''); // New State for Referral Code Input
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
      { uid: '10001', email: 'user@example.com', password: 'password', balance: 0.00, isBanned: false, joinedDate: '2023-10-01', referralCode: 'RX1001' }
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

  const [depositTasks, setDepositTasks] = useState<DepositTask[]>(() => {
    const saved = localStorage.getItem(DB_KEYS.DEPOSIT_TASKS);
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Starter Plan', amount: 500 },
      { id: '2', title: 'Pro Plan', amount: 1000 },
      { id: '3', title: 'Business Plan', amount: 5000 },
    ];
  });

  // Forms
  const [newUpiId, setNewUpiId] = useState('');
  const [newUpiApp, setNewUpiApp] = useState<UpiApp>(UpiApp.PHONEPE);
  
  // Buy Flow State
  const [selectedTask, setSelectedTask] = useState<DepositTask | null>(null);
  const [tempOrderId, setTempOrderId] = useState<string>(''); // For displaying ID before submit
  const [buyStep, setBuyStep] = useState(0); // 0 = List, 1 = Payment Details
  const [buyUtr, setBuyUtr] = useState('');
  const [buyScreenshot, setBuyScreenshot] = useState<File | null>(null);
  
  const [sellAmount, setSellAmount] = useState('');
  const [sellUpi, setSellUpi] = useState('');
  
  // Bill Flow State
  const [historyFilter, setHistoryFilter] = useState<TransactionStatus | 'ALL'>('ALL');
  
  // Chat
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Admin Management Forms
  const [manageUserEmail, setManageUserEmail] = useState('');
  const [manageAmount, setManageAmount] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  
  // Admin Task Forms
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAmount, setNewTaskAmount] = useState('');

  // Profile Change Password State
  const [userChangePassMode, setUserChangePassMode] = useState(false);
  const [currentUserOldPass, setCurrentUserOldPass] = useState('');
  const [currentUserNewPass, setCurrentUserNewPass] = useState('');

  // Derived State
  const currentUser = users.find(u => u.email === currentUserEmail) || { 
    uid: '00000', 
    email: 'guest', 
    balance: 0, 
    isBanned: false, 
    joinedDate: new Date().toISOString().split('T')[0],
    referralCode: 'GUEST',
    password: ''
  };
  
  // Fix for existing users without referral code
  if (currentUser.email !== 'guest' && !currentUser.referralCode) {
    currentUser.referralCode = `RX${currentUser.uid.substring(0, 4)}`;
  }

  const userTransactions = transactions.filter(t => t.userEmail === currentUserEmail);
  const buyTransactions = userTransactions.filter(t => t.type === TransactionType.BUY);

  // Filtered History
  const filteredTransactions = historyFilter === 'ALL' 
    ? userTransactions 
    : userTransactions.filter(t => t.status === historyFilter);

  // --- Effects for Persistence (The "Database") ---

  useEffect(() => { localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(DB_KEYS.UPI_LIST, JSON.stringify(upiList)); }, [upiList]);
  useEffect(() => { localStorage.setItem(DB_KEYS.BANK_DETAILS, JSON.stringify(bankDetails)); }, [bankDetails]);
  useEffect(() => { localStorage.setItem(DB_KEYS.HELP_CONFIG, JSON.stringify(helpConfig)); }, [helpConfig]);
  useEffect(() => { localStorage.setItem(DB_KEYS.ADMIN_PASS, adminPass); }, [adminPass]);
  useEffect(() => { localStorage.setItem(DB_KEYS.DEPOSIT_TASKS, JSON.stringify(depositTasks)); }, [depositTasks]);

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

  const handleRegisterStart = async (isResend = false) => {
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      setError('Email already registered. Please login.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    const code = generateOtp();
    setGeneratedOtp(code);
    
    // Attempt to send email
    const emailSent = await sendOtpEmail(email, code);
    
    setIsLoading(false);
    
    if (emailSent) {
      setNotification(`Code sent to ${email} (Check Spam)`);
    } else {
      setNotification(`Email Service Busy. Your Code: ${code}`);
    }
    
    // Set timer for 60 seconds
    setTimer(60);
    
    if (!isResend) {
      setCurrentView(View.VERIFY);
    }
  };

  const handleResendOtp = () => {
    handleRegisterStart(true);
    setOtpInput('');
  };

  const handleVerifyRegister = () => {
    // STRICT VERIFICATION
    if (otpInput === generatedOtp) { 
      // Generate User Data
      const uid = Math.floor(100000 + Math.random() * 900000).toString();
      // Generate Unique Referral Code: RX + random 4 digits + random letter
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
      const uniqueReferralCode = `RX${Math.floor(1000 + Math.random() * 9000)}${randomLetter}`;

      const newUser: User = { 
        uid: uid,
        email, 
        password: password,
        balance: 99, 
        isBanned: false, 
        joinedDate: new Date().toISOString().split('T')[0],
        referralCode: uniqueReferralCode,
        referredBy: referCodeInput || undefined
      };
      setUsers([...users, newUser]);

      // Record Bonus Transaction
      const bonusTx: Transaction = {
        id: `BONUS${Math.floor(1000 + Math.random() * 9000)}`,
        type: TransactionType.BUY,
        amount: 99,
        date: new Date().toISOString().split('T')[0],
        status: TransactionStatus.COMPLETED,
        details: 'Auto-Credit',
        userEmail: email,
        taskTitle: 'Welcome Bonus'
      };
      setTransactions([bonusTx, ...transactions]);
      
      setNotification('🎉 Registration Successful! ₹99 Bonus Added');
      setCurrentUserEmail(email);
      setCurrentView(View.HOME);
      setError('');
    } else {
      setError('Failed: Incorrect Code');
    }
  };

  const handleLogin = () => {
    if (!email || !password) {
      setError('Enter email and password');
      return;
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      setError('User not found. Please register.');
      return;
    }

    if (user.isBanned) {
      setError('This account has been banned. Contact support.');
      return;
    }

    // Check Password
    if (user.password && user.password !== password) {
      setError('Incorrect password');
      return;
    }

    setNotification('Login Successful');
    setCurrentUserEmail(email);
    setCurrentView(View.HOME);
    setError('');
  };

  const handleLogout = () => {
    setCurrentUserEmail('');
    setEmail('');
    setPassword('');
    setOtpInput('');
    setBuyStep(0);
    setSelectedTask(null);
    setReferCodeInput('');
    setCurrentView(View.LOGIN);
    setAuthMode('LOGIN');
    setUserChangePassMode(false);
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

  const handleSelectTask = (task: DepositTask) => {
    setSelectedTask(task);
    // Generate Order ID immediately
    setTempOrderId(`ORD${Math.floor(10000000 + Math.random() * 90000000)}`);
    setBuyStep(1); // Go to Payment directly
    setError('');
  };

  const handleBuySubmit = () => {
    if (!buyUtr || buyUtr.length !== 12) {
      setError('Please enter a valid 12-digit UTR');
      return;
    }
    if (!selectedTask) return;
    
    const commission = selectedTask.amount * 0.05;

    const newTx: Transaction = {
      id: tempOrderId, // Use the ID generated at start
      type: TransactionType.BUY,
      amount: selectedTask.amount,
      commission: commission,
      date: new Date().toISOString().split('T')[0],
      status: TransactionStatus.PENDING,
      details: buyUtr,
      userEmail: currentUserEmail,
      screenshot: buyScreenshot ? buyScreenshot.name : undefined,
      taskTitle: selectedTask.title
    };
    
    setTransactions([newTx, ...transactions]);
    setBuyUtr('');
    setBuyStep(0); // Go back to list
    setSelectedTask(null);
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
      id: `ORD${Math.floor(10000000 + Math.random() * 90000000)}`,
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

  const handleUserChangePassword = () => {
    if (!currentUserOldPass || !currentUserNewPass) {
      setError("Please fill all fields");
      return;
    }
    
    if (currentUser.password && currentUserOldPass !== currentUser.password) {
      setError("Old password incorrect");
      return;
    }

    if (currentUserNewPass.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setUsers(users.map(u => 
      u.email === currentUserEmail ? { ...u, password: currentUserNewPass } : u
    ));
    
    setNotification("Password Changed Successfully");
    setUserChangePassMode(false);
    setCurrentUserOldPass('');
    setCurrentUserNewPass('');
    setError('');
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

  const handleAddTask = () => {
    if(!newTaskTitle || !newTaskAmount) return;
    const newTask: DepositTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      amount: parseFloat(newTaskAmount)
    };
    setDepositTasks([...depositTasks, newTask]);
    setNewTaskTitle('');
    setNewTaskAmount('');
  };

  const handleDeleteTask = (id: string) => {
    setDepositTasks(depositTasks.filter(t => t.id !== id));
  };

  const handleTxStatus = (txId: string, newStatus: TransactionStatus) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    if (tx.type === TransactionType.BUY && newStatus === TransactionStatus.COMPLETED && tx.status !== TransactionStatus.COMPLETED) {
      // Add funds + commission
      const totalCredit = tx.amount + (tx.commission || 0);
      updateUserBalance(tx.userEmail, totalCredit);
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

  // LOGIN / REGISTER VIEW
  if (currentView === View.LOGIN) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative">
        {notification && <NotificationToast message={notification} onClose={() => setNotification(null)} />}
        <div className="w-full max-w-sm">
          <h1 className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">RupayX</h1>
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Tabs */}
            <div className="grid grid-cols-2 border-b border-slate-800">
              <button 
                onClick={() => { setAuthMode('LOGIN'); setError(''); }}
                className={`py-4 font-semibold text-sm transition-colors ${authMode === 'LOGIN' ? 'bg-indigo-600/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                LOGIN
              </button>
              <button 
                onClick={() => { setAuthMode('REGISTER'); setError(''); }}
                className={`py-4 font-semibold text-sm transition-colors ${authMode === 'REGISTER' ? 'bg-indigo-600/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                REGISTER
              </button>
            </div>

            <div className="p-6">
              {authMode === 'LOGIN' ? (
                // LOGIN FORM
                <>
                   <div className="space-y-4">
                     <Input 
                        label="Email" 
                        placeholder="user@example.com" 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<Mail size={18} />}
                      />
                      <Input 
                        label="Password" 
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={error}
                        icon={<Lock size={18} />}
                      />
                   </div>
                   <Button 
                      className="mt-6" 
                      fullWidth 
                      onClick={handleLogin}
                      disabled={isLoading}
                    >
                      Login
                    </Button>
                </>
              ) : (
                // REGISTER FORM
                <>
                   <div className="space-y-4">
                     <Input 
                        label="Email Address" 
                        placeholder="user@example.com" 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Input 
                        label="Create Password" 
                        type="password"
                        placeholder="Min 6 chars"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Input 
                        label="Referral Code (Optional)" 
                        placeholder="Enter Code"
                        value={referCodeInput}
                        onChange={(e) => setReferCodeInput(e.target.value)}
                        icon={<Ticket size={18} />}
                        error={error}
                      />
                   </div>
                   <Button 
                      className="mt-6" 
                      fullWidth 
                      onClick={() => handleRegisterStart(false)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send OTP'}
                    </Button>
                </>
              )}

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

  // OTP VERIFY VIEW (ONLY FOR REGISTER)
  if (currentView === View.VERIFY) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative">
        {notification && <NotificationToast message={notification} onClose={() => setNotification(null)} />}
        <div className="w-full max-w-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Verify Email</h2>
            <p className="text-slate-400 text-sm mb-6">Enter code sent to <br/><span className="text-white font-bold">{email}</span></p>
            
            <Input 
              placeholder="000000" 
              className="text-center text-2xl tracking-widest"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              error={error}
            />
            
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={handleVerifyRegister} fullWidth variant="success">
                Verify & Register
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
                onClick={() => { setCurrentView(View.LOGIN); setAuthMode('REGISTER'); }}
                className="text-slate-500 text-sm hover:text-slate-400"
              >
                Change Email?
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
                    <h3 className="font-bold text-lg">Manage Buy Orders</h3>
                    <p className="text-slate-400 text-sm">Bank Details & Tasks</p>
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
           <div className="space-y-6">
             <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
               <h2 className="text-xl font-bold mb-4">Manage Deposit Bank Details</h2>
               <Input label="Bank Name" value={bankDetails.bankName} onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})} />
               <Input label="Account Name" value={bankDetails.accountName} onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})} />
               <Input label="Account Number" value={bankDetails.accountNumber} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})} />
               <Input label="IFSC Code" value={bankDetails.ifsc} onChange={e => setBankDetails({...bankDetails, ifsc: e.target.value})} />
               <Input label="UPI ID" value={bankDetails.upiId} onChange={e => setBankDetails({...bankDetails, upiId: e.target.value})} />
             </div>

             <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
                <h2 className="text-xl font-bold mb-2">Manage Buy Orders (Tasks)</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Input placeholder="Task Title (e.g. VIP Plan)" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
                  <Input placeholder="Amount" type="number" value={newTaskAmount} onChange={e => setNewTaskAmount(e.target.value)} />
                  <Button className="col-span-2" onClick={handleAddTask}>Add New Order</Button>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-500 uppercase">Active Orders</h3>
                  {depositTasks.map(task => (
                    <div key={task.id} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                       <div>
                         <p className="font-bold">{task.title}</p>
                         <p className="text-sm text-emerald-400">₹{task.amount}</p>
                       </div>
                       <button onClick={() => handleDeleteTask(task.id)} className="text-red-400 p-2 hover:bg-slate-700 rounded-lg">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  ))}
                </div>
             </div>
             
             <Button fullWidth onClick={() => {
                setNotification("Changes Saved!");
                setTimeout(() => setCurrentView(View.ADMIN_HOME), 1000);
             }}>Save All Changes</Button>
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
                   <div className="flex flex-col">
                     <span className="font-bold text-emerald-400">+{tx.amount}</span>
                     {tx.commission && <span className="text-xs text-yellow-400">+ {tx.commission} (5% Comm.)</span>}
                   </div>
                   <span className="text-xs text-slate-500">{tx.date}</span>
                 </div>
                 <p className="text-sm text-white mb-1 font-semibold">{tx.taskTitle || 'Unknown Order'}</p>
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
                     {u.referredBy && <p className="text-xs text-indigo-400">Ref by: {u.referredBy}</p>}
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
         // Navigate back logic for Buy flow
         if (currentView === View.BUY && buyStep === 1) {
           setBuyStep(0);
           setSelectedTask(null);
         } else if (currentView !== View.HOME) {
           setCurrentView(View.HOME);
         }
      }}
    >
      <div className="pb-32"> {/* Increased padding for Bottom Nav + Safe Area */}
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
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Package className="text-indigo-400" />
                    Available Orders
                  </h3>
                  {depositTasks.length === 0 && (
                    <div className="text-center py-8 bg-slate-900 rounded-2xl border border-slate-800">
                      <p className="text-slate-400">No active orders available right now.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4">
                    {depositTasks.map(task => (
                      <div key={task.id} className="bg-slate-900 border border-slate-700 p-5 rounded-2xl flex flex-col gap-3 hover:border-indigo-500 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-lg text-white">{task.title}</h4>
                              <p className="text-2xl font-bold text-emerald-400 mt-1">₹{task.amount}</p>
                            </div>
                            <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-1 rounded-full font-bold">
                              +5% Profit
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-slate-400 border-t border-slate-800 pt-3">
                            <span>Commission: ₹{task.amount * 0.05}</span>
                            <Button className="!py-2 !px-6" onClick={() => handleSelectTask(task)}>Start</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4 pt-6 border-t border-slate-800">
                  <h3 className="text-lg font-semibold text-slate-300 px-1">Order History</h3>
                  {buyTransactions.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-slate-500">No Buy History</p>
                    </div>
                  )}
                  {buyTransactions.map(tx => (
                    <div key={tx.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{tx.taskTitle || 'Buy Order'}</p>
                        <p className="text-xs text-slate-400">#{tx.id} • {tx.date}</p>
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
            
            {buyStep === 1 && selectedTask && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-r from-indigo-900/50 to-slate-900 p-4 rounded-xl border border-indigo-500/30">
                  <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-slate-400">ORDER ID</p>
                      <p className="text-lg font-mono font-bold text-white bg-slate-800 px-2 py-1 rounded select-all">{tempOrderId}</p>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-700/50 pt-3">
                    <div>
                        <p className="text-sm text-slate-400">Payable Amount</p>
                        <p className="text-2xl font-bold text-emerald-400">₹{selectedTask.amount}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Total Return</p>
                        <p className="text-lg font-bold text-yellow-400">₹{selectedTask.amount + (selectedTask.amount * 0.05)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Bank Details</h3>
                  <div className="space-y-3">
                    <DetailRow label="Account No" value={bankDetails.accountNumber} copyable />
                    <DetailRow label="IFSC Code" value={bankDetails.ifsc} copyable />
                    <DetailRow label="Bank Name" value={bankDetails.bankName} />
                    <DetailRow label="Name" value={bankDetails.accountName} />
                    <DetailRow label="UPI ID" value={bankDetails.upiId} copyable />
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-lg font-semibold">Confirm Payment</h3>
                  
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
                      setSelectedTask(null);
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold px-1">Transactions</h3>
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {['ALL', TransactionStatus.PENDING, TransactionStatus.COMPLETED, TransactionStatus.REJECTED].map((status) => (
                    <button
                      key={status}
                      onClick={() => setHistoryFilter(status as any)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${historyFilter === status ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      {status === 'ALL' ? 'All' : status}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTransactions.length === 0 && <p className="text-slate-500 text-center text-sm py-8 bg-slate-900 rounded-xl border border-slate-800">No transactions found</p>}
              
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === TransactionType.BUY ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {tx.type === TransactionType.BUY ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                    </div>
                    <div>
                      <p className="font-medium text-white">{tx.type}</p>
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

        {currentView === View.REFER && (
          <div className="space-y-6 animate-fadeIn">
             <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-3xl flex flex-col items-center text-center shadow-2xl border border-indigo-500/30 relative overflow-hidden">
                <Gift size={48} className="text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Refer & Earn</h2>
                <p className="text-slate-300 text-sm mb-6">Share your unique code with friends.</p>
                
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 w-full mb-4">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Your Referral Code</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-bold text-indigo-400 tracking-wider select-all">
                      {currentUser.referralCode || 'N/A'}
                    </span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.referralCode || '');
                        setNotification('Code Copied!');
                        setTimeout(() => setNotification(null), 2000);
                      }}
                      className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 text-white"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>

                <Button fullWidth className="flex items-center justify-center gap-2">
                   <Share2 size={18} /> Share Now
                </Button>
             </div>
             
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
               <h3 className="text-lg font-bold mb-4">Referral Rules</h3>
               <ul className="space-y-3 text-sm text-slate-400">
                 <li className="flex items-start gap-2">
                   <div className="min-w-[6px] h-[6px] rounded-full bg-indigo-500 mt-1.5"></div>
                   <span>Share your code with friends.</span>
                 </li>
                 <li className="flex items-start gap-2">
                   <div className="min-w-[6px] h-[6px] rounded-full bg-indigo-500 mt-1.5"></div>
                   <span>Friend enters code during registration.</span>
                 </li>
                 <li className="flex items-start gap-2">
                   <div className="min-w-[6px] h-[6px] rounded-full bg-indigo-500 mt-1.5"></div>
                   <span>You get rewarded when they make their first deposit!</span>
                 </li>
               </ul>
             </div>
          </div>
        )}

        {currentView === View.PROFILE && (
           <div className="space-y-6 animate-fadeIn">
             <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl flex flex-col items-center text-center shadow-2xl border border-slate-700 relative overflow-hidden">
                <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                  <span className="text-3xl font-bold text-white">{currentUserEmail[0].toUpperCase()}</span>
                </div>
                
                {/* Profile Details List */}
                <div className="w-full space-y-3 mt-2">
                  <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                    <span className="text-sm text-slate-400">Email</span>
                    <span className="text-sm font-semibold text-white">{currentUserEmail}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                    <span className="text-sm text-slate-400">UID</span>
                    <span className="text-sm font-mono font-semibold text-indigo-400">{currentUser.uid || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                    <span className="text-sm text-slate-400">Total Commission</span>
                    <span className="text-sm font-bold text-emerald-400">
                      ₹{userTransactions.reduce((sum, t) => sum + (t.commission || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
             </div>
             
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <Shield size={20} className="text-indigo-400" /> Security
               </h3>
               
               {!userChangePassMode ? (
                 <Button 
                    variant="secondary" 
                    fullWidth 
                    className="flex items-center justify-center gap-2"
                    onClick={() => setUserChangePassMode(true)}
                  >
                   <Key size={18} /> Change Password
                 </Button>
               ) : (
                 <div className="space-y-4 animate-fadeIn">
                   <Input 
                      label="Old Password" 
                      type="password" 
                      value={currentUserOldPass}
                      onChange={(e) => setCurrentUserOldPass(e.target.value)}
                   />
                   <Input 
                      label="New Password" 
                      type="password"
                      placeholder="Min 6 characters"
                      value={currentUserNewPass}
                      onChange={(e) => setCurrentUserNewPass(e.target.value)}
                      error={error}
                   />
                   <div className="grid grid-cols-2 gap-3 mt-2">
                     <Button variant="danger" onClick={() => {
                       setUserChangePassMode(false);
                       setCurrentUserOldPass('');
                       setCurrentUserNewPass('');
                       setError('');
                     }}>Cancel</Button>
                     <Button variant="success" onClick={handleUserChangePassword}>Update</Button>
                   </div>
                 </div>
               )}
             </div>
           </div>
        )}
      </div>

      {/* FIXED BOTTOM NAVIGATION */}
      {/* Updated max-width to 430px and added safe-area padding for iPhone 16 home indicator */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-2 pb-[env(safe-area-inset-bottom,20px)] flex justify-between items-center z-50">
        <button 
          onClick={() => setCurrentView(View.HOME)} 
          className={`flex flex-col items-center gap-1 p-2 w-full rounded-xl transition-colors ${currentView === View.HOME || currentView === View.BUY || currentView === View.SELL || currentView === View.UPI || currentView === View.BILL || currentView === View.HELP ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Home size={24} />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button 
          onClick={() => setCurrentView(View.REFER)} 
          className={`flex flex-col items-center gap-1 p-2 w-full rounded-xl transition-colors ${currentView === View.REFER ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Gift size={24} />
          <span className="text-[10px] font-bold">Refer</span>
        </button>
        <button 
          onClick={() => setCurrentView(View.PROFILE)} 
          className={`flex flex-col items-center gap-1 p-2 w-full rounded-xl transition-colors ${currentView === View.PROFILE ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <UserIcon size={24} />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>

    </Layout>
  );
};

export default App;