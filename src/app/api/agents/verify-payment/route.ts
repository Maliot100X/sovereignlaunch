import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { agentStore, verifyApiKey } from '@/lib/store';

const PLATFORM_WALLET = 'Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx';
const MIN_PAYMENT_SOL = 0.1; // Minimum payment to verify
const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Helper to convert account keys to array
function getKeysArray(accountKeys: any): any[] {
  return Array.isArray(accountKeys) ? accountKeys : (accountKeys?.staticAccountKeys || []);
}

// Pending payment tracking
const pendingPayments = new Map<string, {
  agentId: string;
  amount: number;
  timestamp: number;
  purpose: string;
}>();

// Start payment verification request
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');
    if (!auth.valid || !auth.agent) {
      return NextResponse.json(
        { error: auth.error || 'Agent not found' },
        { status: 401 }
      );
    }

    const agent = auth.agent;
    const body = await request.json();
    const { amount, purpose = 'token_launch' } = body;

    if (!amount || amount < MIN_PAYMENT_SOL) {
      return NextResponse.json(
        { error: `Minimum payment is ${MIN_PAYMENT_SOL} SOL` },
        { status: 400 }
      );
    }

    // Generate unique payment ID
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store pending payment
    pendingPayments.set(paymentId, {
      agentId: agent.id,
      amount,
      timestamp: Date.now(),
      purpose
    });

    // Auto-cleanup after timeout
    setTimeout(() => pendingPayments.delete(paymentId), PAYMENT_TIMEOUT_MS);

    return NextResponse.json({
      success: true,
      paymentId,
      status: 'pending',
      instructions: {
        platformWallet: PLATFORM_WALLET,
        amount,
        purpose,
        message: `SovereignLaunch ${purpose} - ${agent.name}`,
        timeout: '5 minutes'
      },
      verifyUrl: `/api/agents/verify-payment?paymentId=${paymentId}`
    });

  } catch (error) {
    console.error('Error creating payment request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify payment was received
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const txHash = searchParams.get('txHash');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'paymentId required' },
        { status: 400 }
      );
    }

    const pending = pendingPayments.get(paymentId);
    if (!pending) {
      return NextResponse.json(
        { error: 'Payment request expired or not found' },
        { status: 404 }
      );
    }

    const agent = agentStore.getById(pending.agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check for payment on-chain
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );

    let verified = false;
    let foundTxHash = txHash;

    if (txHash) {
      // Verify specific transaction
      try {
        const tx = await connection.getTransaction(txHash, {
          commitment: 'confirmed'
        });

        if (tx && tx.meta) {
          // Check if transaction sent SOL to platform wallet
          const postBalances = tx.meta.postBalances;
          const preBalances = tx.meta.preBalances;
          const accountKeys = getKeysArray(tx.transaction.message.getAccountKeys());

          const platformWalletIndex = accountKeys.findIndex(
            (key) => key.toString() === PLATFORM_WALLET
          );

          if (platformWalletIndex >= 0) {
            const balanceChange = (postBalances[platformWalletIndex] - preBalances[platformWalletIndex]) / LAMPORTS_PER_SOL;
            if (balanceChange >= pending.amount * 0.99) { // Allow small variance for fees
              verified = true;
            }
          }
        }
      } catch (err) {
        console.error('Error verifying transaction:', err);
      }
    } else {
      // Look for recent payments to platform wallet from agent wallet
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(PLATFORM_WALLET),
        { limit: 20 }
      );

      for (const sig of signatures) {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            commitment: 'confirmed'
          });

          if (tx && tx.meta && tx.blockTime) {
            // Check if transaction is within timeout window
            const txTime = tx.blockTime * 1000;
            if (txTime < pending.timestamp || txTime > pending.timestamp + PAYMENT_TIMEOUT_MS) {
              continue;
            }

            // Check sender is agent wallet
            const accountKeys = getKeysArray(tx.transaction.message.getAccountKeys());
            const senderIndex = accountKeys.findIndex(
              (key) => key.toString() === agent.wallet
            );

            if (senderIndex >= 0) {
              const postBalances = tx.meta.postBalances;
              const preBalances = tx.meta.preBalances;
              const platformWalletIndex = accountKeys.findIndex(
                (key) => key.toString() === PLATFORM_WALLET
              );

              if (platformWalletIndex >= 0) {
                const balanceChange = (postBalances[platformWalletIndex] - preBalances[platformWalletIndex]) / LAMPORTS_PER_SOL;
                if (balanceChange >= pending.amount * 0.99) {
                  verified = true;
                  foundTxHash = sig.signature;
                  break;
                }
              }
            }
          }
        } catch (err) {
          continue;
        }
      }
    }

    if (verified) {
      // Mark payment as verified
      pendingPayments.delete(paymentId);

      // Update agent balance
      (agent as any).balance = ((agent as any).balance || 0) + pending.amount;

      return NextResponse.json({
        success: true,
        verified: true,
        paymentId,
        txHash: foundTxHash,
        amount: pending.amount,
        purpose: pending.purpose,
        agent: {
          id: agent.id,
          name: agent.name,
          wallet: agent.wallet
        },
        message: 'Payment verified successfully. You can now launch tokens.',
        platformWallet: PLATFORM_WALLET
      });
    }

    // Not yet verified
    return NextResponse.json({
      success: true,
      verified: false,
      paymentId,
      status: 'pending',
      platformWallet: PLATFORM_WALLET,
      requiredAmount: pending.amount,
      timeRemaining: Math.max(0, pending.timestamp + PAYMENT_TIMEOUT_MS - Date.now()),
      message: 'Payment not yet detected. Send SOL to the platform wallet and check again.'
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
