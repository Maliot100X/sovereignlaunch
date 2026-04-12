import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const PLATFORM_WALLET = 'Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx';
const LAUNCH_FEE_SOL = 0.05;

// POST: Verify payment transaction by txHash
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required in x-api-key header' },
        { status: 401 }
      );
    }

    // Find agent by API key
    const agentId = await redis.get(`agent:apikey:${apiKey}`);
    if (!agentId) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Get agent data
    const agentData = await redis.get(`agent:${agentId}`);
    if (!agentData) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agent = JSON.parse(agentData);
    const agentWallet = agent.wallet;

    if (!agentWallet) {
      return NextResponse.json(
        { error: 'Agent has no wallet configured' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { txHash } = body;

    if (!txHash) {
      return NextResponse.json(
        { error: 'txHash required' },
        { status: 400 }
      );
    }

    // Connect to Solana
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    // Get transaction
    const tx = await connection.getTransaction(txHash, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!tx || !tx.meta) {
      return NextResponse.json({
        valid: false,
        error: 'Transaction not found or not confirmed yet. Please wait a moment and try again.',
        txHash
      }, { status: 404 });
    }

    // Get account keys from transaction
    const accountKeys = tx.transaction.message.getAccountKeys();
    const keysArray = Array.from(accountKeys);

    // Find sender (first account is usually signer)
    const senderIndex = 0;
    const sender = keysArray[senderIndex]?.toString();

    // Find platform wallet index
    const platformWalletIndex = keysArray.findIndex(
      (key) => key.toString() === PLATFORM_WALLET
    );

    if (platformWalletIndex < 0) {
      return NextResponse.json({
        valid: false,
        error: 'Payment was not sent to the platform wallet. Please send to: ' + PLATFORM_WALLET,
        txHash,
        expectedWallet: PLATFORM_WALLET
      }, { status: 400 });
    }

    // Check if sender matches agent's registered wallet
    const senderMatchesAgent = sender === agentWallet;

    // Calculate amount received by platform wallet
    const preBalance = tx.meta.preBalances[platformWalletIndex] || 0;
    const postBalance = tx.meta.postBalances[platformWalletIndex] || 0;
    const amountReceived = (postBalance - preBalance) / LAMPORTS_PER_SOL;

    // Check minimum payment (allow small variance for fees)
    const minRequired = LAUNCH_FEE_SOL * 0.99;

    if (amountReceived < minRequired) {
      return NextResponse.json({
        valid: false,
        error: `Payment amount insufficient. Required: ${LAUNCH_FEE_SOL} SOL, Received: ${amountReceived.toFixed(6)} SOL`,
        txHash,
        amountReceived,
        required: LAUNCH_FEE_SOL,
        sender,
        senderMatchesAgent
      }, { status: 400 });
    }

    // All checks passed
    return NextResponse.json({
      valid: true,
      amount: amountReceived,
      sender,
      senderMatchesAgent,
      txHash,
      confirmed: true,
      platformWallet: PLATFORM_WALLET,
      agentWallet,
      message: senderMatchesAgent
        ? 'Payment verified successfully!'
        : 'Payment verified, but sender wallet does not match your registered agent wallet. This is okay but ensure you own this wallet.'
    });

  } catch (error) {
    console.error('[Verify Payment] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET: Check payment status (optional polling endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get('txHash');

    if (!txHash) {
      return NextResponse.json(
        { error: 'txHash required as query parameter' },
        { status: 400 }
      );
    }

    // Connect to Solana
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    // Get transaction
    const tx = await connection.getTransaction(txHash, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      return NextResponse.json({
        found: false,
        confirmed: false,
        txHash
      });
    }

    if (!tx.meta) {
      return NextResponse.json({
        found: true,
        confirmed: false,
        txHash
      });
    }

    // Transaction confirmed
    return NextResponse.json({
      found: true,
      confirmed: true,
      txHash,
      blockTime: tx.blockTime,
      slot: tx.slot
    });

  } catch (error) {
    console.error('[Verify Payment GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
