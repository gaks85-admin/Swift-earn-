import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { dbManager, hashPassword } from './server/db.js';
import {
  createSessionToken,
  requireUserAuth,
  requireAdminAuth,
  AuthenticatedRequest,
} from './server/auth.js';
import {
  getPaymentProvider,
  isPaystackConfigured,
  realPaymentProvider,
} from './server/paymentProviders/index.js';
import { rewardedVideoService } from './server/rewards/RewardedVideoService.js';
import { runRewardedVideoSuite } from './server/rewards/tests/rewardedVideoTests.js';

async function startServer() {
  const app = express();
  
  // Parse port from command line arguments (--port 3000) or environment
  const args = process.argv.slice(2);
  let portArg: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (!isNaN(parsed)) {
        portArg = parsed;
        break;
      }
    }
  }
  const PORT = portArg || Number(process.env.APP_PORT) || 3000;

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // ----------------------------------------------------
  // Health & Public Stats
  // ----------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), platform: 'Swift Earn' });
  });

  app.get('/api/stats/public', (req, res) => {
    const config = dbManager.getConfig();
    res.json({
      stats: config.public_stats,
      demoMode: config.demo_mode,
      minimumWithdrawal: config.minimum_withdrawal,
    });
  });

  // ----------------------------------------------------
  // Auth: User Sign Up & Login
  // ----------------------------------------------------
  app.post('/api/auth/signup', (req, res) => {
    try {
      const { fullName, email, password, confirmPassword, referralCode, agreeTerms } = req.body;

      if (!agreeTerms) {
        return res.status(400).json({ error: 'You must agree to the Terms and Conditions and Privacy Policy.' });
      }

      if (!fullName || !email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'All required fields must be completed.' });
      }

      if (fullName.trim().length < 2) {
        return res.status(400).json({ error: 'Full name must be at least 2 characters long.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
      }

      const existingUser = dbManager.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email address already exists.' });
      }

      // Check self-referral prevention if referral code provided
      let validReferralCode = undefined;
      if (referralCode && referralCode.trim()) {
        const referrer = dbManager.findUserByReferralCode(referralCode.trim());
        if (referrer && referrer.email.toLowerCase() === email.toLowerCase()) {
          // Self-referral attempt
          dbManager.recordFraudEvent({
            riskScore: 60,
            flagReason: 'Self-referral attempt detected during sign up',
            details: { email, code: referralCode },
          });
        } else if (referrer) {
          validReferralCode = referralCode.trim();
        }
      }

      const { user, profile, wallet } = dbManager.createUser({
        email,
        password,
        fullName,
        referralCodeInput: validReferralCode,
      });

      const token = createSessionToken({ userId: user.id, role: 'user', email: user.email });

      res.status(201).json({
        message: 'Account created successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
          referralCode: user.referral_code,
        },
        profile,
        wallet,
      });
    } catch (err: any) {
      console.error('Sign up error:', err);
      res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Please provide both email and password.' });
      }

      const user = dbManager.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const hash = hashPassword(password);
      if (user.password_hash !== hash) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      }

      const profile = dbManager.findProfileByUserId(user.id);
      const wallet = dbManager.getWallet(user.id);
      const token = createSessionToken({ userId: user.id, role: 'user', email: user.email });

      res.json({
        message: 'Logged in successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
          referralCode: user.referral_code,
        },
        profile,
        wallet,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Authentication failed.' });
    }
  });

  app.get('/api/auth/me', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const profile = dbManager.findProfileByUserId(user.id);
    const wallet = dbManager.getWallet(user.id);
    const notifications = dbManager.getNotifications(user.id);
    const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        referralCode: user.referral_code,
        createdAt: user.created_at,
      },
      profile,
      wallet,
      unreadNotificationsCount,
    });
  });

  // ----------------------------------------------------
  // Admin Authentication
  // ----------------------------------------------------
  app.post('/api/admin/login', (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = dbManager.findAdminByEmail(email);

      if (!admin || admin.password_hash !== hashPassword(password)) {
        return res.status(401).json({ error: 'Invalid admin credentials.' });
      }

      const token = createSessionToken({ userId: admin.id, role: 'admin', email: admin.email });
      res.json({
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          fullName: admin.full_name,
          role: admin.role,
        },
      });
    } catch (err: any) {
      console.error('Admin login error:', err);
      res.status(500).json({ error: 'Admin login error.' });
    }
  });

  app.get('/api/admin/me', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const admin = req.admin!;
    res.json({
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.full_name,
        role: admin.role,
      },
    });
  });

  // ----------------------------------------------------
  // User Wallet & Ledger Endpoints
  // ----------------------------------------------------
  app.get('/api/wallet', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const wallet = dbManager.getWallet(req.user!.id);
    res.json({ wallet });
  });

  app.get('/api/wallet/transactions', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const transactions = dbManager.getLedgerEntries(req.user!.id);
    res.json({ transactions });
  });

  // ----------------------------------------------------
  // Rewarded Opportunities & Session State Machine
  // ----------------------------------------------------
  app.get('/api/rewards/opportunities', (req, res) => {
    const opportunities = dbManager.getOpportunities();
    res.json({ opportunities });
  });

  app.get('/api/rewards/history', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const history = dbManager.getUserRewardHistory(req.user!.id);
    res.json(history);
  });

  // ----------------------------------------------------
  // Withdrawals Endpoints
  // ----------------------------------------------------
  app.post('/api/withdrawals/request', requireUserAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { amount, paymentMethod, accountDetails } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid withdrawal amount.' });
      }

      if (!paymentMethod) {
        return res.status(400).json({ error: 'Please select a supported payment method.' });
      }

      if (!accountDetails) {
        return res.status(400).json({ error: 'Payment destination details are required.' });
      }

      if (paymentMethod === 'Bank Transfer') {
        if (!accountDetails.bank_name || !accountDetails.account_number || !accountDetails.account_name) {
          return res.status(400).json({ error: 'Please provide Bank Name, Account Number, and Account Name.' });
        }
        if (accountDetails.account_number.length < 10) {
          return res.status(400).json({ error: 'Account number must be at least 10 digits.' });
        }
      }

      const result = dbManager.requestWithdrawal({
        userId: req.user!.id,
        amount: numAmount,
        paymentMethod,
        accountDetails,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      const wallet = dbManager.getWallet(req.user!.id);
      res.status(201).json({
        message: 'Withdrawal request submitted successfully.',
        withdrawal: result.withdrawal,
        wallet,
      });
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      res.status(500).json({ error: 'Failed to submit withdrawal request.' });
    }
  });

  app.get('/api/withdrawals/my', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const list = dbManager.getWithdrawals(req.user!.id);
    res.json({ withdrawals: list });
  });

  // ----------------------------------------------------
  // Referrals Endpoints
  // ----------------------------------------------------
  app.get('/api/referrals/my-stats', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const stats = dbManager.getReferrals(user.id);
    const config = dbManager.getConfig();

    res.json({
      referralCode: user.referral_code,
      referralBonusAmount: config.referral_bonus_amount,
      totalCount: stats.totalCount,
      totalBonusEarned: stats.totalBonusEarned,
      referrals: stats.referrals,
    });
  });

  // ----------------------------------------------------
  // Profile & Settings
  // ----------------------------------------------------
  app.get('/api/user/profile', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const profile = dbManager.findProfileByUserId(req.user!.id);
    res.json({ profile });
  });

  app.put('/api/user/profile', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const { fullName, phone, bank_name, account_number, account_name, preferred_payment_method } = req.body;
    const cleanName = fullName ? fullName.trim() : undefined;
    const initials = cleanName
      ? cleanName
          .split(' ')
          .filter(Boolean)
          .map((n: string) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : undefined;

    const updated = dbManager.updateProfile(req.user!.id, {
      full_name: cleanName,
      avatar_initials: initials,
      phone,
      bank_name,
      account_number,
      account_name,
      preferred_payment_method,
    });

    res.json({ profile: updated });
  });

  app.put('/api/user/password', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = req.user!;

    if (user.password_hash !== hashPassword(currentPassword)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    user.password_hash = hashPassword(newPassword);
    user.updated_at = new Date().toISOString();
    res.json({ message: 'Password updated successfully.' });
  });

  // ----------------------------------------------------
  // Reward Sessions & Crediting Endpoints
  // ----------------------------------------------------
  app.post('/api/rewards/sessions/start', requireUserAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { opportunityId } = req.body;
      const userId = req.user!.id;
      if (!opportunityId) {
        return res.status(400).json({ error: 'opportunityId is required' });
      }

      const result = dbManager.createRewardSession({
        userId,
        opportunityId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        sessionId: result.session.id,
        userId,
        providerSessionId: result.session.provider_session_id,
        opportunity: result.opportunity,
        token: result.token,
        startedAt: result.session.started_at,
        expiresAt: result.session.expires_at,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to start reward session' });
    }
  });

  app.post('/api/rewards/sessions/:id/verify-and-claim', requireUserAuth, (req: AuthenticatedRequest, res) => {
    try {
      const sessionId = req.params.id;
      const userId = req.user!.id;
      const { idempotencyKey } = req.body;

      const claimResult = dbManager.verifyRewardSession({
        sessionId,
        userId,
        idempotencyKey,
      });

      res.json({
        success: true,
        message: claimResult.message || 'Reward confirmed!',
        pointsEarned: claimResult.pointsEarned,
        newBalance: claimResult.newBalance,
        transactionReference: claimResult.transactionReference,
        providerTransactionId: claimResult.transactionReference,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to verify and claim reward' });
    }
  });

  app.get('/api/rewards/daily-counts', requireUserAuth, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const opps = dbManager.getOpportunities();
      const counts: Record<string, number> = {};
      for (const opp of opps) {
        counts[opp.id] = dbManager.getUserDailyCompletedRewardCount(userId, opp.id);
      }
      res.json({ counts });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to fetch daily counts' });
    }
  });

  // ----------------------------------------------------
  // Rewarded Video Provider Architecture Endpoints
  // ----------------------------------------------------
  app.get('/api/rewards/video/provider-status', (req, res) => {
    const isAvailable = rewardedVideoService.isAvailable();
    const provider = rewardedVideoService.getProvider();
    res.json({
      available: isAvailable,
      providerName: isAvailable && provider ? provider.providerName : null,
      isDemo: Boolean(provider?.isDemo),
    });
  });

  app.post('/api/rewards/video/sessions/start', requireUserAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { opportunityId } = req.body;
      const userId = req.user!.id;

      if (!opportunityId) {
        return res.status(400).json({ error: 'opportunityId is required' });
      }

      const sessionResult = await rewardedVideoService.startSession({
        userId,
        opportunityId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(sessionResult);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to start rewarded video session.' });
    }
  });

  app.post('/api/rewards/video/sessions/:id/verify', requireUserAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const sessionId = req.params.id;
      const userId = req.user!.id;
      const { providerTransactionId, idempotencyKey, elapsedSeconds } = req.body;

      const verificationResult = await rewardedVideoService.verifyCompletion({
        sessionId,
        userId,
        providerTransactionId,
        idempotencyKey,
        elapsedSeconds,
      });

      res.json(verificationResult);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to verify rewarded video completion.' });
    }
  });

  // Server-to-server callback / webhook from certified ad network
  app.post('/api/rewards/video/callback', async (req, res) => {
    try {
      const {
        providerName,
        providerTransactionId,
        sessionId,
        userId,
        rewardAmount,
        currency,
        signature,
        timestamp,
      } = req.body;

      if (!sessionId || !userId || !providerTransactionId) {
        return res.status(400).json({ error: 'Missing required callback parameters.' });
      }

      const result = await rewardedVideoService.processCallback({
        providerName: providerName || 'demo_rewarded_video',
        providerTransactionId,
        sessionId,
        userId,
        rewardAmount,
        currency,
        signature,
        timestamp,
        rawPayload: req.body,
        ipAddress: req.ip,
      });

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Callback verification failed.' });
    }
  });

  // Diagnostic Test Runner for Rewarded Video Architecture
  app.get('/api/rewards/video/run-tests', async (_req, res) => {
    try {
      const suiteResults = await runRewardedVideoSuite();
      res.json(suiteResults);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Test suite execution failed.' });
    }
  });

  // ----------------------------------------------------
  // Notifications Endpoints
  // ----------------------------------------------------
  app.get('/api/notifications', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const list = dbManager.getNotifications(req.user!.id);
    res.json({ notifications: list });
  });

  app.post('/api/notifications/:id/read', requireUserAuth, (req: AuthenticatedRequest, res) => {
    dbManager.markNotificationRead(req.params.id, req.user!.id);
    res.json({ success: true });
  });

  app.post('/api/notifications/read-all', requireUserAuth, (req: AuthenticatedRequest, res) => {
    dbManager.markAllNotificationsRead(req.user!.id);
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // Admin Portal Endpoints
  // ----------------------------------------------------
  app.get('/api/admin/overview', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const stats = dbManager.getAdminStats();
    const fraudEvents = dbManager.getFraudEvents().slice(0, 5);
    const pendingWithdrawals = dbManager.getWithdrawals().filter((w) => w.status === 'pending').slice(0, 5);

    // Dynamic 7-day trend metrics for charts
    const chartData = [
      { day: 'Mon', rewardsCount: 42, withdrawalsTotal: 15000, revenue: 26000, newUsers: 18 },
      { day: 'Tue', rewardsCount: 56, withdrawalsTotal: 18000, revenue: 32000, newUsers: 24 },
      { day: 'Wed', rewardsCount: 68, withdrawalsTotal: 12000, revenue: 39000, newUsers: 31 },
      { day: 'Thu', rewardsCount: 61, withdrawalsTotal: 22000, revenue: 36000, newUsers: 27 },
      { day: 'Fri', rewardsCount: 84, withdrawalsTotal: 29000, revenue: 48000, newUsers: 45 },
      { day: 'Sat', rewardsCount: 95, withdrawalsTotal: 34000, revenue: 54000, newUsers: 52 },
      { day: 'Sun', rewardsCount: 88, withdrawalsTotal: 25000, revenue: 51000, newUsers: 39 },
    ];

    res.json({
      stats,
      chartData,
      recentFraudEvents: fraudEvents,
      recentPendingWithdrawals: pendingWithdrawals,
    });
  });

  app.get('/api/admin/users', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const list = dbManager.getAllUsers();
    res.json({ users: list });
  });

  app.post('/api/admin/users/:id/status', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const { status } = req.body;
    const admin = req.admin!;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

    const success = dbManager.updateUserStatus(req.params.id, status, admin.id, ip);
    if (!success) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ success: true, status });
  });

  app.get('/api/admin/rewards', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const sessions = dbManager.getAllRewardSessions();
    const fraudEvents = dbManager.getFraudEvents();
    const opportunities = dbManager.getAllOpportunities();
    res.json({ sessions, fraudEvents, opportunities });
  });

  app.get('/api/admin/rewards/opportunities', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const opportunities = dbManager.getAllOpportunities();
    res.json({ opportunities });
  });

  app.post('/api/admin/rewards/opportunities', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { name, title, description, reward_amount, reward_points, estimated_duration, estimated_seconds, daily_limit, daily_cap, provider, category, status } = req.body;
      const admin = req.admin!;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

      const opp = dbManager.createOpportunity(
        {
          name: name || title,
          title: title || name,
          description,
          reward_amount: reward_amount || reward_points,
          reward_points: reward_points || reward_amount,
          estimated_duration: estimated_duration || estimated_seconds,
          estimated_seconds: estimated_seconds || estimated_duration,
          daily_limit: daily_limit || daily_cap,
          daily_cap: daily_cap || daily_limit,
          provider: provider || 'Demo',
          category: category || 'video',
          status: status || 'active',
        },
        admin.id,
        ip
      );

      res.status(201).json({ success: true, opportunity: opp });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create opportunity.' });
    }
  });

  app.put('/api/admin/rewards/opportunities/:id', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    try {
      const admin = req.admin!;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const updated = dbManager.updateOpportunity(req.params.id, req.body, admin.id, ip);

      if (!updated) {
        return res.status(404).json({ error: 'Reward opportunity not found.' });
      }

      res.json({ success: true, opportunity: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update opportunity.' });
    }
  });

  app.patch('/api/admin/rewards/opportunities/:id/toggle', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    try {
      const admin = req.admin!;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const current = dbManager.getOpportunityById(req.params.id);
      if (!current) {
        return res.status(404).json({ error: 'Reward opportunity not found.' });
      }

      const newActive = !current.active;
      const updated = dbManager.updateOpportunity(
        req.params.id,
        { active: newActive, status: newActive ? 'active' : 'inactive' },
        admin.id,
        ip
      );

      res.json({ success: true, opportunity: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to toggle opportunity status.' });
    }
  });

  // ----------------------------------------------------
  // Paystack & Banking Payout Gateway Routes
  // ----------------------------------------------------
  app.get('/api/paystack/status', (req, res) => {
    const configured = isPaystackConfigured();
    const provider = getPaymentProvider();
    res.json({
      configured,
      provider: provider.name,
      isDemo: provider.isDemo,
      modeText: configured ? 'LIVE PAYSTACK PAYOUTS' : 'TEST MODE — NO REAL PAYMENT',
    });
  });

  let cachedBanks: any[] = [];
  let cachedBanksTime = 0;

  app.get('/api/paystack/banks', async (req, res) => {
    try {
      if (cachedBanks.length > 0 && Date.now() - cachedBanksTime < 3600000) {
        return res.json({ success: true, banks: cachedBanks });
      }

      if (isPaystackConfigured()) {
        const banks = await realPaymentProvider.getBanks();
        cachedBanks = banks;
        cachedBanksTime = Date.now();
        return res.json({ success: true, banks });
      }

      // Safe fallback list for Demo / Test mode when secret key is not set
      const demoBanks = [
        { id: 1, name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'gtbank' },
        { id: 2, name: 'Access Bank', code: '044', slug: 'access-bank' },
        { id: 3, name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
        { id: 4, name: 'OPay', code: '999992', slug: 'opay' },
        { id: 5, name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
        { id: 6, name: 'PalmPay', code: '999991', slug: 'palmpay' },
        { id: 7, name: 'Moniepoint Microfinance Bank', code: '50515', slug: 'moniepoint' },
        { id: 8, name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
        { id: 9, name: 'United Bank for Africa (UBA)', code: '033', slug: 'united-bank-for-africa' },
        { id: 10, name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
      ];
      return res.json({ success: true, banks: demoBanks, isDemo: true });
    } catch (err: any) {
      console.error('Error fetching bank list:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch Nigerian bank list.' });
    }
  });

  app.post('/api/paystack/resolve-account', requireUserAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { accountNumber, bankCode } = req.body;
      if (!accountNumber || !bankCode) {
        return res.status(400).json({ error: 'Account number and bank code are required.' });
      }

      if (!isPaystackConfigured()) {
        return res.json({
          success: true,
          account_name: 'TEST DEMO ACCOUNT HOLDER',
          account_number: accountNumber,
          bank_code: bankCode,
          isDemo: true,
        });
      }

      const result = await realPaymentProvider.resolveAccount(accountNumber, bankCode);
      if (!result.success) {
        return res.status(400).json({ error: result.message || 'Paystack account resolution failed.' });
      }

      return res.json({
        success: true,
        account_name: result.accountName,
        account_number: result.accountNumber,
        bank_code: result.bankCode,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error resolving bank account.' });
    }
  });

  app.get('/api/admin/fraud-events', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const fraudEvents = dbManager.getFraudEvents();
    res.json({ fraudEvents });
  });

  app.get('/api/admin/withdrawals', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const withdrawals = dbManager.getWithdrawals();
    res.json({ withdrawals });
  });

  app.post('/api/admin/withdrawals/:id/review', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { status, adminNotes, rejectionReason, providerReference } = req.body;
      const admin = req.admin!;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

      const withdrawal = dbManager.getWithdrawals().find((w) => w.id === req.params.id);
      if (!withdrawal) {
        return res.status(404).json({ error: 'Withdrawal not found.' });
      }

      // 1. Terminal State Check: Prevent modifying already completed/failed withdrawals
      const terminalStates = ['completed', 'paid', 'rejected', 'failed', 'cancelled'];
      if (terminalStates.includes(withdrawal.status)) {
        return res.status(400).json({
          error: `Withdrawal has already reached terminal status (${withdrawal.status.toUpperCase()}) and cannot be modified.`,
        });
      }

      // 2. Rejection & Refund Flow
      if (status === 'rejected' || status === 'failed') {
        const note = rejectionReason || adminNotes || 'Admin rejected request';
        const result = dbManager.updateWithdrawalStatus(req.params.id, status, note, admin.id, ip, providerReference);
        return res.json({ success: true, withdrawal: result.withdrawal });
      }

      // 3. Approval Flow (Real Paystack Transfer vs Demo Mode)
      if (status === 'approved' || status === 'processing' || status === 'completed' || status === 'paid') {
        // Double-Payout & Idempotency Guard
        if (withdrawal.provider_reference || withdrawal.status === 'processing') {
          return res.status(400).json({
            error: `Transfer has already been initiated for this withdrawal (Ref: ${withdrawal.provider_reference || withdrawal.reference}). Cannot initiate duplicate transfer.`,
          });
        }

        if (isPaystackConfigured()) {
          // Real Paystack Payout Initiation
          const payResult = await realPaymentProvider.createPayment({
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount,
            currency: withdrawal.currency || 'NGN',
            paymentMethod: withdrawal.payment_method,
            accountDetails: withdrawal.account_details || {},
            reference: withdrawal.reference,
          });

          if (!payResult.success) {
            return res.status(400).json({
              error: payResult.message || 'Paystack transfer request was rejected.',
              details: payResult.rawResponse,
            });
          }

          const targetStatus = payResult.status === 'completed' ? 'paid' : 'processing';
          const note = `[PAYSTACK TRANSFER] Initiated via Paystack (${payResult.providerReference})`;
          const result = dbManager.updateWithdrawalStatus(
            withdrawal.id,
            targetStatus,
            note,
            admin.id,
            ip,
            payResult.providerReference
          );

          return res.json({
            success: true,
            paystackResult: payResult,
            withdrawal: result.withdrawal,
          });
        } else {
          // Demo Provider Sandbox Approval
          const note = adminNotes || (status === 'completed' ? 'Payout verified & settled in demo sandbox' : 'Status updated by admin');
          const result = dbManager.updateWithdrawalStatus(req.params.id, status, note, admin.id, ip, providerReference);
          return res.json({ success: true, withdrawal: result.withdrawal });
        }
      }

      return res.status(400).json({ error: 'Invalid withdrawal status transition requested.' });
    } catch (err: any) {
      console.error('Error reviewing withdrawal:', err);
      return res.status(500).json({ error: err.message || 'Server error reviewing withdrawal.' });
    }
  });

  app.post('/api/admin/withdrawals/:id/simulate-demo', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    const admin = req.admin!;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const withdrawal = dbManager.getWithdrawals().find((w) => w.id === req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found.' });
    }

    const { demoPaymentProvider } = await import('./server/paymentProviders/DemoPaymentProvider');
    const payResult = await demoPaymentProvider.createPayment({
      withdrawalId: withdrawal.id,
      amount: withdrawal.amount,
      currency: withdrawal.currency || 'NGN',
      paymentMethod: withdrawal.payment_method,
      accountDetails: withdrawal.account_details || {},
      reference: withdrawal.reference,
    });

    const targetStatus = payResult.status === 'failed' ? 'failed' : 'completed';
    const note = payResult.message || `[DEMO TEST GATEWAY] Processed via ${payResult.provider}`;
    const result = dbManager.updateWithdrawalStatus(
      withdrawal.id,
      targetStatus,
      note,
      admin.id,
      ip,
      payResult.providerReference
    );

    res.json({
      success: true,
      simulation: payResult,
      withdrawal: result.withdrawal,
    });
  });

  /**
   * Official Paystack Webhook Handler
   * Verifies x-paystack-signature HMAC SHA512 against PAYSTACK_SECRET_KEY over rawBody.
   * Handles transfer.success and transfer.failed event callbacks idempotently.
   */
  app.post('/api/webhooks/paystack', async (req: any, res) => {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

      if (isPaystackConfigured()) {
        const isValid = realPaymentProvider.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
          console.warn('Rejected Paystack Webhook: Invalid HMAC SHA512 signature.');
          return res.status(401).json({ error: 'Unauthorized: Invalid Paystack signature.' });
        }
      }

      const payload = req.body;
      const data = payload?.data || payload;
      const ref = data?.reference || payload?.reference;

      if (!ref) {
        return res.status(400).json({ error: 'Missing payment reference in Paystack webhook payload.' });
      }

      const callbackResult = await realPaymentProvider.processCallback(payload);

      const allWithdrawals = dbManager.getWithdrawals();
      const targetWithdrawal = allWithdrawals.find(
        (w) =>
          w.reference?.toLowerCase() === callbackResult.reference?.toLowerCase() ||
          w.provider_reference === callbackResult.providerReference ||
          (w.account_details && w.account_details.paystack_reference === callbackResult.reference)
      );

      if (!targetWithdrawal) {
        return res.status(200).json({
          handled: true,
          message: 'Webhook received successfully. Target reference not found.',
        });
      }

      // Idempotency check: Ignore if already in terminal state
      if (['completed', 'paid', 'rejected', 'failed', 'cancelled'].includes(targetWithdrawal.status)) {
        return res.status(200).json({
          handled: true,
          message: 'Idempotent webhook: Withdrawal is already in terminal state.',
          status: targetWithdrawal.status,
        });
      }

      const nextStatus = callbackResult.newStatus === 'completed' ? 'paid' : callbackResult.newStatus;
      const updateRes = dbManager.updateWithdrawalStatus(
        targetWithdrawal.id,
        nextStatus,
        callbackResult.failureReason || `Settled via Paystack Webhook (${callbackResult.providerReference})`,
        'PAYSTACK_WEBHOOK',
        (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        callbackResult.providerReference
      );

      return res.status(200).json({
        handled: true,
        success: updateRes.success,
        withdrawal: updateRes.withdrawal,
      });
    } catch (err: any) {
      console.error('Error handling Paystack webhook:', err);
      return res.status(500).json({ error: 'Internal server error processing Paystack webhook.' });
    }
  });

  app.post('/api/webhooks/payout', async (req: any, res) => {
    // Alias to /api/webhooks/paystack
    return app._router.handle(req, res, () => {});
  });

  app.get('/api/admin/referrals', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const referrals = dbManager.getAllReferrals();
    res.json({ referrals });
  });

  app.post('/api/admin/referrals/:id/review', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const referralId = req.params.id;
    const { status, qualification_status } = req.body;
    const admin = req.admin!;
    try {
      const updated = dbManager.adminUpdateReferralStatus(referralId, status, qualification_status, admin.id);
      res.json({ success: true, referral: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update referral status' });
    }
  });

  app.get('/api/admin/fraud-events', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const fraudEvents = dbManager.getFraudEvents();
    res.json({ fraudEvents });
  });

  app.post('/api/admin/fraud-events/:id/resolve', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const eventId = req.params.id;
    const { resolution, resolved } = req.body;
    const admin = req.admin!;
    try {
      const updated = dbManager.updateFraudEventResolution(eventId, resolution, resolved !== false, admin.id);
      res.json({ success: true, event: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update fraud event' });
    }
  });

  app.post('/api/admin/users/:id/status', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;
    const { status } = req.body;
    const admin = req.admin!;
    if (!['active', 'restricted', 'suspended', 'flagged'].includes(status)) {
      return res.status(400).json({ error: 'Invalid account status' });
    }
    try {
      const updatedUser = dbManager.updateUserAccountStatus(userId, status, admin.id);
      res.json({ success: true, user: updatedUser });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update user status' });
    }
  });

  app.get('/api/admin/settings', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const config = dbManager.getConfig();
    res.json({ config });
  });

  app.put('/api/admin/settings', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const updates = req.body;
    const admin = req.admin!;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

    const updated = dbManager.updateConfig(updates, admin.id, ip);
    res.json({ config: updated });
  });

  app.get('/api/admin/audit-logs', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const logs = dbManager.getAuditLogs();
    res.json({ auditLogs: logs });
  });

  // ----------------------------------------------------
  // Vite Middleware Setup
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Swift Earn Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
