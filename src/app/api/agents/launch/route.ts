import { NextRequest, NextResponse } from 'next/server';
import { bagsApi } from '@/lib/bags-api';
import { telegramBot } from '@/lib/telegram-server';
import { randomUUID } from 'crypto';
import { agentStore, launchStore, verifyApiKey, type Launch } from '@/lib/store';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const PLATFORM_WALLET = 'Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx';
const LAUNCH_FEE_SOL = 0.5; // 0.5 SOL platform fee to launch

// Verify payment was made
async function verifyLaunchPayment(agentWallet: string, txHash?: string): Promise<{ verified: boolean; txHash?: string; error?: string }> {
  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );

    if (txHash) {
      // Verify specific transaction
      const tx = await connection.getTransaction(txHash, { commitment: 'confirmed' });
      if (!tx || !tx.meta) {
        return { verified: false, error: 'Transaction not found' };
      }

      const accountKeys = tx.transaction.message.getAccountKeys();
      const keysArray = Array.isArray(accountKeys) ? accountKeys : (accountKeys as any).staticAccountKeys || [];
      const platformWalletIndex = keysArray.findIndex(
        (key: any) => key.toString() === PLATFORM_WALLET
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

      const accountKeys = tx.transaction.message.getAccountKeys();
      const keysArray = Array.isArray(accountKeys) ? accountKeys : (accountKeys as any).staticAccountKeys || [];
      const senderIndex = keysArray.findIndex(
        (key: any) => key.toString() === agentWallet
      );

      if (senderIndex >= 0) {
        const platformWalletIndex = keysArray.findIndex(
          (key: any) => key.toString() === PLATFORM_WALLET
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

// Agent token launch endpoint
export async function POST(request: NextRequest) {
  try {
    // Verify agent
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    if (!auth.agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 401 }
      );
    }

    const agent = auth.agent;
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
      txHash // Optional: specific payment transaction
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

    // Verify payment first
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
      }, { status: 402 }); // 402 Payment Required
    }

    // Launch token via BAGS API with 65/35 fee split
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
      agentFeeShare: 6500, // 65% to agent
      platformWallet: PLATFORM_WALLET
    });

    if (!launchResult.success) {
      return NextResponse.json(
        { error: launchResult.error || 'Token launch failed' },
        { status: 400 }
      );
    }

    // Record launch
    const launchId = randomUUID();
    const launch: Launch = {
      id: launchId,
      agentId: agent.id,
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

    launchStore.set(launchId, launch);

    // Update agent stats
    agent.stats.tokensLaunched += 1;

    // Announce on social platforms if enabled
    if (announce && agent.settings.announceLaunches) {
      try {
        await telegramBot.notifyLaunch(
          launchResult.tokenAddress!,
          symbol.toUpperCase(),
          name,
          agent.wallet
        );

        launch.announced = true;
        launchStore.set(launchId, launch);
      } catch (error) {
        console.error('Error sending announcements:', error);
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

// Get agent's launches
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    if (!auth.agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 401 }
      );
    }

    const agent = auth.agent;
    const agentLaunches = launchStore.getByAgentId(agent.id);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        wallet: agent.wallet,
        stats: agent.stats
      },
      launches: agentLaunches,
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
