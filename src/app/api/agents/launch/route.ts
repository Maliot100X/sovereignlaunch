import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { telegramBot } from '@/lib/telegram-server';
import { bagsApi } from '@/lib/bags-api';
import { randomUUID } from 'crypto';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const PLATFORM_WALLET = 'Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx';
const LAUNCH_FEE_SOL = 0.05;

// Verify payment was made
async function verifyLaunchPayment(agentWallet: string, txHash?: string): Promise<{ verified: boolean; txHash?: string; error?: string }> {
  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );

    if (txHash) {
      const tx = await connection.getTransaction(txHash, { commitment: 'confirmed' });
      if (!tx || !tx.meta) {
        return { verified: false, error: 'Transaction not found' };
      }

      // Get account keys - handle both old and new Solana web3.js formats
      const message = tx.transaction.message;
      let keysArray: string[] = [];
      if ('staticAccountKeys' in message && Array.isArray(message.staticAccountKeys)) {
        keysArray = message.staticAccountKeys.map((key: any) => key.toString());
      } else {
        keysArray = [...(message.getAccountKeys() as any)].map((key: any) => key.toString());
      }

      const platformWalletIndex = keysArray.findIndex(
        (key) => key === PLATFORM_WALLET
      );

      if (platformWalletIndex >= 0) {
        const balanceChange = (tx.meta.postBalances[platformWalletIndex] - tx.meta.preBalances[platformWalletIndex]) / LAMPORTS_PER_SOL;
        if (balanceChange >= LAUNCH_FEE_SOL * 0.99) {
          return { verified: true, txHash };
        }
      }
      return { verified: false, error: 'Payment amount insufficient' };
    }

    // Look for recent payments to platform wallet
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(PLATFORM_WALLET),
      { limit: 50 }
    );

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    for (const sig of signatures) {
      const tx = await connection.getTransaction(sig.signature, { commitment: 'confirmed' });
      if (!tx || !tx.meta || !tx.blockTime) continue;

      const txTime = tx.blockTime * 1000;
      if (txTime < fiveMinutesAgo) continue;

      // Get account keys - handle both old and new Solana web3.js formats
      const message = tx.transaction.message;
      let keysArray: string[] = [];
      if ('staticAccountKeys' in message && Array.isArray(message.staticAccountKeys)) {
        keysArray = message.staticAccountKeys.map((key: any) => key.toString());
      } else {
        keysArray = [...(message.getAccountKeys() as any)].map((key: any) => key.toString());
      }

      const senderIndex = keysArray.findIndex(
        (key) => key === agentWallet
      );

      if (senderIndex >= 0) {
        const platformWalletIndex = keysArray.findIndex(
          (key) => key === PLATFORM_WALLET
        );

        if (platformWalletIndex >= 0) {
          const balanceChange = (tx.meta.postBalances[platformWalletIndex] - tx.meta.preBalances[platformWalletIndex]) / LAMPORTS_PER_SOL;
          if (balanceChange >= LAUNCH_FEE_SOL * 0.99) {
            return { verified: true, txHash: sig.signature };
          }
        }
      }
    }

    return { verified: false, error: `Please send ${LAUNCH_FEE_SOL} SOL to ${PLATFORM_WALLET} first` };
  } catch (err) {
    console.error('Payment verification error:', err);
    return { verified: false, error: 'Failed to verify payment' };
  }
}

// POST: Launch token via BAGS API
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
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
    const body = await request.json();

    const {
      name,
      symbol,
      description,
      imageUrl,
      launchType = 'gasless',
      initialBuyLamports = 0,
      social,
      announce = true,
      txHash
    } = body;

    // Validation
    if (!name || !symbol) {
      return NextResponse.json(
        { error: 'Token name and symbol required' },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9]{2,10}$/.test(symbol.toUpperCase())) {
      return NextResponse.json(
        { error: 'Symbol must be 2-10 uppercase alphanumeric characters' },
        { status: 400 }
      );
    }

    // Verify payment
    const paymentCheck = await verifyLaunchPayment(agent.wallet, txHash);
    if (!paymentCheck.verified) {
      return NextResponse.json({
        error: 'Launch fee payment required',
        details: paymentCheck.error,
        launchFee: {
          amount: LAUNCH_FEE_SOL,
          platformWallet: PLATFORM_WALLET,
          message: `Send ${LAUNCH_FEE_SOL} SOL to ${PLATFORM_WALLET} before launching`
        }
      }, { status: 402 });
    }

    // Launch token via BAGS API
    const launchResult = await bagsApi.launchToken({
      name,
      symbol: symbol.toUpperCase(),
      description: description || `Launched by ${agent.name} on SovereignLaunch`,
      image: imageUrl,
      launchType,
      decimals: 9,
      totalSupply: '1000000000',
      initialLiquidity: (initialBuyLamports / 1e9).toString(),
      creatorWallet: agent.wallet,
      socialLinks: social,
      agentFeeShare: 6500,
      platformWallet: PLATFORM_WALLET
    });

    if (!launchResult.success) {
      return NextResponse.json(
        { error: launchResult.error || 'Token launch failed' },
        { status: 400 }
      );
    }

    // Record launch in Redis
    const launchId = randomUUID();
    const launch = {
      id: launchId,
      agentId,
      agentName: agent.name,
      tokenAddress: launchResult.tokenAddress!,
      transactionSignature: launchResult.transactionSignature!,
      name,
      symbol: symbol.toUpperCase(),
      launchType,
      initialBuyLamports,
      timestamp: new Date().toISOString(),
      announced: false
    };

    await redis.set(`token:${launchId}`, JSON.stringify(launch));
    await redis.set(`token:mint:${launchResult.tokenAddress}`, launchId);
    await redis.lpush('tokens:list', launchId);
    await redis.sadd(`agent:tokens:${agentId}`, launchId);

    // Update agent stats
    agent.tokensLaunched = (agent.tokensLaunched || 0) + 1;
    agent.stats.tokensLaunched = agent.tokensLaunched;
    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    // Announce on Telegram
    if (announce) {
      try {
        await telegramBot.notifyLaunch(
          launchResult.tokenAddress!,
          symbol.toUpperCase(),
          name,
          agent.wallet
        );
        launch.announced = true;
        await redis.set(`token:${launchId}`, JSON.stringify(launch));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }
    }

    console.log(`[Token Launched] ${name} ($${symbol}) by ${agent.name} - ${launchResult.tokenAddress}`);

    return NextResponse.json({
      success: true,
      launchId,
      tokenAddress: launchResult.tokenAddress,
      transactionSignature: launchResult.transactionSignature,
      metadataUrl: launchResult.metadataUrl,
      message: 'Token launched successfully',
      announced: launch.announced,
      feeDistribution: {
        agent: '65%',
        platform: '35%',
        agentWallet: agent.wallet,
        platformWallet: PLATFORM_WALLET
      },
      paymentTx: paymentCheck.txHash
    });

  } catch (error) {
    console.error('Error launching token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get agent's launches
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
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

    // Get agent's launches
    const tokenIds = await redis.smembers(`agent:tokens:${agentId}`);
    const launches = await Promise.all(
      tokenIds.map(async (id) => {
        const data = await redis.get(`token:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    // Sort by timestamp desc
    launches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        wallet: agent.wallet,
        stats: agent.stats
      },
      launches: launches.filter(Boolean),
      launchFee: {
        amount: LAUNCH_FEE_SOL,
        platformWallet: PLATFORM_WALLET
      }
    });

  } catch (error) {
    console.error('Error getting agent launches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
