import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { randomUUID } from 'crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { agentStore, challengeStore, type Agent } from '@/lib/store';

// Generate challenge for wallet signature
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Validate Solana address
    try {
      new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Solana wallet address' },
        { status: 400 }
      );
    }

    // Generate challenge
    const challenge = `SovereignLaunch Agent Registration\nWallet: ${wallet}\nTimestamp: ${Date.now()}\nNonce: ${randomUUID()}`;
    challengeStore.set(wallet, challenge);

    return NextResponse.json({ challenge });
  } catch (error) {
    console.error('Error generating challenge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Register agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, wallet, email, bio, signature } = body;

    // Validation
    if (!name || !wallet || !email || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: name, wallet, email, signature' },
        { status: 400 }
      );
    }

    // Validate name
    if (!/^[a-zA-Z0-9_]{1,120}$/.test(name)) {
      return NextResponse.json(
        { error: 'Name must be 1-120 alphanumeric characters or underscores, no spaces' },
        { status: 400 }
      );
    }

    // Check if name exists
    if (agentStore.getByName(name)) {
      return NextResponse.json(
        { error: 'Agent name already taken' },
        { status: 409 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if email exists
    if (agentStore.getByEmail(email)) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Validate wallet
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Solana wallet address' },
        { status: 400 }
      );
    }

    // Verify signature
    const challenge = challengeStore.get(wallet);
    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge expired or not found. Request a new challenge.' },
        { status: 400 }
      );
    }

    const messageBytes = new TextEncoder().encode(challenge);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = publicKey.toBytes();

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Clean up challenge
    challengeStore.delete(wallet);

    // Check if wallet already registered
    if (agentStore.getByWallet(wallet)) {
      return NextResponse.json(
        { error: 'Wallet already registered' },
        { status: 409 }
      );
    }

    // Create agent
    const agentId = randomUUID();
    const apiKey = `sl_agt_${bs58.encode(Buffer.from(randomUUID()))}`;

    const agent: Agent = {
      id: agentId,
      name,
      wallet,
      email,
      bio: bio || '',
      apiKey,
      createdAt: new Date().toISOString(),
      stats: {
        tokensLaunched: 0,
        totalVolume: 0,
        totalFees: 0,
        tradesExecuted: 0,
        followers: 0,
        following: 0
      },
      skills: [
        'token-launch',
        'fee-claim',
        'analytics',
        'social-post'
      ],
      settings: {
        autoLaunch: false,
        autoTrade: false,
        announceLaunches: true
      },
      following: []
    };

    agentStore.set(agentId, agent);

    // Log registration
    console.log(`[Agent Registered] ${name} (${wallet}) - ID: ${agentId}`);

    return NextResponse.json({
      success: true,
      apiKey,
      agentId,
      name,
      wallet,
      message: 'Agent registered successfully. Save your API key - it will not be shown again.'
    });

  } catch (error) {
    console.error('Error registering agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
