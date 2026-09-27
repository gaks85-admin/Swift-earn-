import crypto from 'crypto';
import { rewardedVideoService } from '../RewardedVideoService.js';
import { dbManager } from '../../db.js';

/**
 * rewardedVideoTests.ts
 *
 * Comprehensive test suite verifying all 11 core scenarios required for the
 * Rewarded Video Provider Architecture:
 *
 * 1. Session creation
 * 2. Valid completion
 * 3. Duplicate completion (Idempotency)
 * 4. Invalid session
 * 5. Wrong user (Unauthorized claim)
 * 6. Invalid provider transaction ID / session mapping
 * 7. Replay attempt (Expired timestamp)
 * 8. Expired session
 * 9. Provider verification failure (Tampered signature)
 * 10. Successful verified reward (Authoritative balance & ledger)
 * 11. Demo provider blocked in production (Environment safety guard)
 */
export async function runRewardedVideoSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Array<{ test: string; passed: boolean; message?: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; message?: string }> = [];

  const logTest = (name: string, passed: boolean, message?: string) => {
    results.push({ test: name, passed, message });
    if (!passed) {
      console.error(`❌ TEST FAILED: ${name} - ${message}`);
    } else {
      console.log(`✅ TEST PASSED: ${name}`);
    }
  };

  // Setup test user and opportunity
  const testUser = dbManager.createUser({
    email: `test_video_${Date.now()}@swiftearn.test`,
    password: 'password123',
    fullName: 'Video Tester',
  });
  const userId = testUser.user.id;

  const opps = dbManager.getOpportunities();
  const opp = opps[0];
  if (!opp) {
    throw new Error('No opportunities available to run test suite.');
  }

  // ----------------------------------------------------
  // Scenario 1: Session creation
  // ----------------------------------------------------
  let sessionResult: any;
  try {
    sessionResult = await rewardedVideoService.startSession({
      userId,
      opportunityId: opp.id,
      ipAddress: '127.0.0.1',
      userAgent: 'TestSuite/1.0',
    });

    const passed =
      Boolean(sessionResult.sessionId) &&
      sessionResult.userId === userId &&
      sessionResult.status === 'initiated' &&
      Boolean(sessionResult.token);

    logTest('1. Session creation', passed);
  } catch (err: any) {
    logTest('1. Session creation', false, err.message);
  }

  // ----------------------------------------------------
  // Scenario 2: Valid completion
  // ----------------------------------------------------
  const balanceBefore = dbManager.getWallet(userId).available_balance;
  let completionResult: any;
  try {
    completionResult = await rewardedVideoService.verifyCompletion({
      sessionId: sessionResult.sessionId,
      userId,
      providerTransactionId: `PROV-TX-001`,
      idempotencyKey: `test_idemp_${sessionResult.sessionId}`,
    });

    const balanceAfter = dbManager.getWallet(userId).available_balance;
    const passed =
      completionResult.success === true &&
      completionResult.status === 'claimed' &&
      balanceAfter > balanceBefore &&
      completionResult.alreadyProcessed === false;

    logTest('2. Valid completion', passed);
  } catch (err: any) {
    console.error('TEST 2 ERROR:', err);
    logTest('2. Valid completion', false, err.message);
  }

  // ----------------------------------------------------
  // Scenario 3: Duplicate completion (Idempotency)
  // ----------------------------------------------------
  try {
    const balanceBeforeDup = dbManager.getWallet(userId).available_balance;
    const dupResult = await rewardedVideoService.verifyCompletion({
      sessionId: sessionResult.sessionId,
      userId,
      providerTransactionId: `PROV-TX-001`,
      idempotencyKey: `test_idemp_${sessionResult.sessionId}`,
    });

    const balanceAfterDup = dbManager.getWallet(userId).available_balance;
    const passed =
      dupResult.success === true &&
      dupResult.alreadyProcessed === true &&
      balanceAfterDup === balanceBeforeDup; // Absolutely no double crediting

    logTest('3. Duplicate completion', passed);
  } catch (err: any) {
    console.error('TEST 3 ERROR:', err);
    logTest('3. Duplicate completion', false, err.message);
  }

  // ----------------------------------------------------
  // Scenario 4: Invalid session
  // ----------------------------------------------------
  try {
    await rewardedVideoService.verifyCompletion({
      sessionId: 'ses_invalid_fake_id_12345',
      userId,
    });
    logTest('4. Invalid session', false, 'Expected invalid session to throw.');
  } catch (err: any) {
    const passed = err.message.includes('not found');
    logTest('4. Invalid session', passed, err.message);
  }

  // ----------------------------------------------------
  // Scenario 5: Wrong user (Unauthorized claim)
  // ----------------------------------------------------
  try {
    const freshSession = await rewardedVideoService.startSession({
      userId,
      opportunityId: opp.id,
    });

    const intruderUser = dbManager.createUser({
      email: `intruder_${Date.now()}@swiftearn.test`,
      password: 'password123',
      fullName: 'Intruder User',
    });

    await rewardedVideoService.verifyCompletion({
      sessionId: freshSession.sessionId,
      userId: intruderUser.user.id, // Wrong user!
    });
    logTest('5. Wrong user', false, 'Expected wrong user to be rejected.');
  } catch (err: any) {
    const passed = err.message.includes('does not match the active user');
    logTest('5. Wrong user', passed, err.message);
  }

  // ----------------------------------------------------
  // Scenario 6: Invalid provider transaction ID / Callback session mismatch
  // ----------------------------------------------------
  try {
    await rewardedVideoService.processCallback({
      providerName: 'demo_rewarded_video',
      providerTransactionId: 'TX-TEST-INVALID',
      sessionId: 'ses_does_not_exist_9999',
      userId,
      rawPayload: {},
    });
    logTest('6. Invalid provider transaction ID', false, 'Expected missing session to fail.');
  } catch (err: any) {
    const passed = err.message.includes('not found');
    logTest('6. Invalid provider transaction ID', passed, err.message);
  }

  // ----------------------------------------------------
  // Scenario 7: Replay attempt (Expired timestamp)
  // ----------------------------------------------------
  try {
    const freshSession7 = await rewardedVideoService.startSession({
      userId,
      opportunityId: opp.id,
    });

    const expiredTimestamp = Date.now() - 20 * 60 * 1000; // 20 minutes ago
    await rewardedVideoService.processCallback({
      providerName: 'demo_rewarded_video',
      providerTransactionId: 'TX-REPLAY-OLD',
      sessionId: freshSession7.sessionId,
      userId,
      timestamp: expiredTimestamp,
      rawPayload: {},
    });
    logTest('7. Replay attempt', false, 'Expected expired timestamp callback to be rejected.');
  } catch (err: any) {
    const passed = err.message.includes('REPLAY_DETECTED');
    logTest('7. Replay attempt', passed, err.message);
  }

  // ----------------------------------------------------
  // Scenario 8: Expired session
  // ----------------------------------------------------
  try {
    const freshSession8 = await rewardedVideoService.startSession({
      userId,
      opportunityId: opp.id,
    });

    // Manually force session expiration
    const sessionObj = dbManager.findRewardSession(freshSession8.sessionId);
    if (sessionObj) {
      sessionObj.expires_at = new Date(Date.now() - 5000).toISOString();
    }

    await rewardedVideoService.verifyCompletion({
      sessionId: freshSession8.sessionId,
      userId,
    });
    logTest('8. Expired session', false, 'Expected expired session to be rejected.');
  } catch (err: any) {
    const passed = err.message.includes('expired');
    logTest('8. Expired session', passed, err.message);
  }

  // ----------------------------------------------------
  // Scenario 9: Provider verification failure (Tampered signature)
  // ----------------------------------------------------
  try {
    const freshSession9 = await rewardedVideoService.startSession({
      userId,
      opportunityId: opp.id,
    });

    await rewardedVideoService.processCallback({
      providerName: 'demo_rewarded_video',
      providerTransactionId: 'TX-FORGED-001',
      sessionId: freshSession9.sessionId,
      userId,
      timestamp: Date.now(),
      signature: 'bad_forged_tampered_signature_hex_value',
      rawPayload: {},
    });
    logTest('9. Provider verification failure', false, 'Expected tampered signature to be rejected.');
  } catch (err: any) {
    const passed = err.message.includes('INVALID_SIGNATURE');
    logTest('9. Provider verification failure', passed, err.message);
  }

  // ----------------------------------------------------
  // Scenario 10: Successful verified reward (Authoritative signature & ledger)
  // ----------------------------------------------------
  try {
    const freshSession10 = await rewardedVideoService.startSession({
      userId,
      opportunityId: opp.id,
    });

    const secret = process.env.REWARD_PROVIDER_SECRET || 'swift-earn-crypto-reward-secret-v1-production';
    const txId = `CERT-TX-${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${freshSession10.sessionId}:${userId}:${txId}`)
      .digest('hex');

    const verifiedResult = await rewardedVideoService.processCallback({
      providerName: 'demo_rewarded_video',
      providerTransactionId: txId,
      sessionId: freshSession10.sessionId,
      userId,
      timestamp: Date.now(),
      signature: validSignature,
      rawPayload: { verified: true },
    });

    const passed =
      verifiedResult.success === true &&
      verifiedResult.status === 'claimed' &&
      Boolean(verifiedResult.transactionReference) &&
      verifiedResult.alreadyProcessed === false;

    logTest('10. Successful verified reward', passed);
  } catch (err: any) {
    logTest('10. Successful verified reward', false, err.message);
  }

  // ----------------------------------------------------
  // Scenario 11: Demo provider blocked in production
  // ----------------------------------------------------
  try {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_DEMO_REWARDS;

    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DEMO_REWARDS = 'false';

    try {
      const provider = rewardedVideoService.getProvider('demo_rewarded_video');
      const isBlocked = provider === null;
      logTest(
        '11. Demo provider blocked in production',
        isBlocked,
        isBlocked ? undefined : 'Expected Demo provider to be blocked in production.'
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_DEMO_REWARDS = originalAllow;
    }
  } catch (err: any) {
    logTest('11. Demo provider blocked in production', false, err.message);
  }

  // ----------------------------------------------------
  // Scenario 12: Adcash provider loads
  // ----------------------------------------------------
  try {
    const adcashProvider = rewardedVideoService.getProvider('adcash');
    const passed = Boolean(adcashProvider) && adcashProvider?.providerName === 'adcash' && adcashProvider?.isDemo === false;
    logTest('12. Adcash provider loads', passed);
  } catch (err: any) {
    logTest('12. Adcash provider loads', false, err.message);
  }

  // ----------------------------------------------------
  // Scenario 13: Adcash session creation & pending verification
  // ----------------------------------------------------
  try {
    const adcashSession = await rewardedVideoService.startSession({
      userId,
      opportunityId: opp.id,
    }, 'adcash');

    const verifyRes = await rewardedVideoService.verifyCompletion({
      sessionId: adcashSession.sessionId,
      userId,
    });

    const passed =
      Boolean(adcashSession.sessionId) &&
      adcashSession.providerName === 'adcash' &&
      adcashSession.metadata?.adTagUrl === 'https://youradexchange.com/video/select.php?r=12224982' &&
      verifyRes.success === false &&
      verifyRes.error === 'SERVER_VERIFICATION_PENDING';

    logTest('13. Adcash session & pending verification', passed);
  } catch (err: any) {
    logTest('13. Adcash session & pending verification', false, err.message);
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`\n========================================`);
  console.log(`TEST SUITE COMPLETE: ${passedCount}/${results.length} PASSED`);
  console.log(`========================================\n`);

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
