import { NextRequest, NextResponse } from 'next/server';
import { bagsApi } from '@/lib/bags-api';
import { telegramBot } from '@/lib/telegram-server';
import { randomUUID } from 'crypto';
import { agentStore, launchStore, verifyApiKey, type Launch } from '@/lib/store';

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
      announce = true
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
      socialLinks: social
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
        // Telegram notification
        await telegramBot.notifyLaunch(
          launchResult.tokenAddress!,
          symbol.toUpperCase(),
          name,
          agent.wallet
        );

        launch.announced = true;
        launchStore.set(launchId, launch);

        // TODO: Twitter announcement
        // TODO: On-chain social protocols
      } catch (error) {
        console.error('Error sending announcements:', error);
        // Don't fail the launch if announcements fail
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
      announced: launch.announced
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

    // Get agent's launches
    const agentLaunches = launchStore.getByAgentId(agent.id);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        wallet: agent.wallet,
        stats: agent.stats
      },
      launches: agentLaunches
    });

  } catch (error) {
    console.error('Error getting agent launches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
