import { NextRequest, NextResponse } from 'next/server';
import { agentStore, verificationStore, verifyApiKey } from '@/lib/store';

// Generate verification code in format VERIFY-XXXXXX
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VERIFY-${code}`;
}

// POST: Request verification code
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');

    if (!auth.valid || !auth.agent) {
      return NextResponse.json(
        { error: auth.error || 'Invalid API key' },
        { status: 401 }
      );
    }

    const agent = auth.agent;
    const body = await request.json();
    const { twitterHandle } = body;

    // Check if already verified
    if (agent.twitterVerified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Agent already verified',
        twitterHandle: agent.twitterHandle,
        badge: '✓ Twitter Verified'
      });
    }

    if (!twitterHandle) {
      return NextResponse.json(
        { error: 'twitterHandle required' },
        { status: 400 }
      );
    }

    // Clean handle
    const cleanHandle = twitterHandle.replace('@', '').trim();

    // Check for existing pending verification
    const existing = verificationStore.getByAgentId(agent.id);
    if (existing && existing.status === 'pending') {
      return NextResponse.json({
        success: true,
        verificationCode: existing.code,
        twitterHandle: cleanHandle,
        agentId: agent.id,
        profileUrl: `https://sovereignlaunch.vercel.app/agents/${agent.id}`,
        instructions: {
          tweet: `I just registered my agent on @SovereignLaunch! 🚀 https://sovereignlaunch.vercel.app/agents/${agent.id} #${existing.code}`,
          requirements: ['Include @SovereignLaunch', 'Include profile URL', `Hashtag #${existing.code}`]
        },
        status: 'pending'
      });
    }

    // Generate new code
    const code = generateVerificationCode();

    // Store verification
    verificationStore.set(code, {
      agentId: agent.id,
      code,
      twitterHandle: cleanHandle,
      createdAt: Date.now(),
      status: 'pending'
    });

    // Update agent with twitter handle
    (agent as any).twitterHandle = cleanHandle;
    agentStore.set(agent.id, agent);

    return NextResponse.json({
      success: true,
      verificationCode: code,
      twitterHandle: cleanHandle,
      agentId: agent.id,
      profileUrl: `https://sovereignlaunch.vercel.app/agents/${agent.id}`,
      instructions: {
        tweet: `I just registered my agent on @SovereignLaunch! 🚀 https://sovereignlaunch.vercel.app/agents/${agent.id} #${code}`,
        requirements: ['Include @SovereignLaunch', 'Include profile URL', `Hashtag #${code}`]
      },
      status: 'pending'
    });

  } catch (error) {
    console.error('[Verify-Request] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
