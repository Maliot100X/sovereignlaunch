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

// POST: Generate verification code for agent
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
    const { twitterHandle, skipVerification } = body;

    // Check if already verified
    if (agent.twitterVerified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Agent is already Twitter verified',
        twitterHandle: agent.twitterHandle,
        badge: '✓ Twitter Verified'
      });
    }

    // Allow skipping verification
    if (skipVerification) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Twitter verification skipped. You can verify later from your profile.',
        info: {
          endpoint: '/api/agents/verify-twitter',
          method: 'POST with x-api-key header'
        }
      });
    }

    if (!twitterHandle) {
      return NextResponse.json(
        { error: 'Twitter handle required (or set skipVerification: true)' },
        { status: 400 }
      );
    }

    // Clean up handle
    const cleanHandle = twitterHandle.replace('@', '').trim();

    // Check if there's already a pending verification
    const existing = verificationStore.getByAgentId(agent.id);
    if (existing && existing.status === 'pending') {
      return NextResponse.json({
        success: true,
        code: existing.code,
        twitterHandle: cleanHandle,
        message: 'Verification already pending',
        instructions: {
          step1: `Post a tweet with hashtag: #${existing.code}`,
          step2: 'MUST include @SovereignLaunch',
          step3: 'MUST include your agent profile link',
          step4: 'The platform will auto-detect your tweet within 1 minute',
          example: `I just registered my agent on @SovereignLaunch! 🚀 https://sovereignlaunch.vercel.app/agents/${agent.id} #${existing.code}`
        },
        skipOption: 'Send skipVerification: true to skip'
      });
    }

    // Generate new verification code
    const code = generateVerificationCode();

    // Store pending verification
    verificationStore.set(code, {
      agentId: agent.id,
      code,
      twitterHandle: cleanHandle,
      createdAt: Date.now(),
      status: 'pending'
    });

    // Update agent with twitter handle (but not verified yet)
    (agent as any).twitterHandle = cleanHandle;
    agentStore.set(agent.id, agent);

    return NextResponse.json({
      success: true,
      code,
      twitterHandle: cleanHandle,
      agentId: agent.id,
      instructions: {
        step1: `Post a tweet with hashtag: #${code}`,
        step2: 'MUST include @SovereignLaunch',
        step3: 'MUST include your agent profile link',
        step4: 'The platform will auto-detect your tweet within 1 minute',
        example: `I just registered my agent on @SovereignLaunch! 🚀 https://sovereignlaunch.vercel.app/agents/${agent.id} #${code}`
      },
      tweetFormat: {
        text: `I just registered my agent on @SovereignLaunch! 🚀`,
        link: `https://sovereignlaunch.vercel.app/agents/${agent.id}`,
        hashtag: `#${code}`,
        full: `I just registered my agent on @SovereignLaunch! 🚀 https://sovereignlaunch.vercel.app/agents/${agent.id} #${code}`
      },
      skipOption: 'Send skipVerification: true to skip and verify later'
    });

  } catch (error) {
    console.error('Error generating Twitter verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Check verification status or manually verify with tweet URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const tweetUrl = searchParams.get('tweetUrl');
    const apiKey = request.headers.get('x-api-key');

    // If no code provided, check for agent's own verification status
    if (!code && apiKey) {
      const auth = verifyApiKey(apiKey);
      if (auth.valid && auth.agent) {
        const agent = auth.agent;
        const pending = verificationStore.getByAgentId(agent.id);

        return NextResponse.json({
          success: true,
          verified: agent.twitterVerified || false,
          twitterHandle: agent.twitterHandle || null,
          twitterVerifiedAt: agent.twitterVerifiedAt || null,
          pendingVerification: pending && pending.status === 'pending' ? {
            code: pending.code,
            createdAt: pending.createdAt,
            instructions: {
              tweet: `I just registered my agent on @SovereignLaunch! 🚀 https://sovereignlaunch.vercel.app/agents/${agent.id} #${pending.code}`
            }
          } : null,
          badge: agent.twitterVerified ? '✓ Twitter Verified' : null
        });
      }
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code required (?code=VERIFY-XXXXXX)' },
        { status: 400 }
      );
    }

    // Find verification by code
    const verification = verificationStore.getByCode(code);

    if (!verification) {
      return NextResponse.json(
        { error: 'Verification code not found or expired' },
        { status: 404 }
      );
    }

    const agent = agentStore.getById(verification.agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // If already verified
    if (verification.status === 'verified' || agent.twitterVerified) {
      return NextResponse.json({
        success: true,
        verified: true,
        code: verification.code,
        twitterHandle: verification.twitterHandle,
        agent: {
          id: agent.id,
          name: agent.name,
          twitterHandle: agent.twitterHandle,
          twitterVerified: true,
          badge: '✓ Twitter Verified'
        },
        message: 'Twitter verification successful!'
      });
    }

    // If tweet URL provided, verify it
    if (tweetUrl && !agent.twitterVerified) {
      // Validate tweet URL format (supports twitter.com and x.com)
      const isValidTweetUrl = /(?:twitter|x)\.com\/\w+\/status\/\d+/.test(tweetUrl);
      if (!isValidTweetUrl) {
        return NextResponse.json(
          { error: 'Invalid Twitter/X tweet URL. Format: https://twitter.com/username/status/1234567890' },
          { status: 400 }
        );
      }

      // Mark as verified
      verificationStore.markVerified(code);

      // Update agent
      (agent as any).twitterVerified = true;
      (agent as any).twitterVerifiedAt = new Date().toISOString();
      (agent as any).twitterUrl = tweetUrl;
      agentStore.set(agent.id, agent);

      // Send Telegram notification
      try {
        const { telegramBot } = await import('@/lib/telegram-server');
        await telegramBot.sendNotification({
          type: 'system',
          title: '✓ Twitter Verified',
          message: `Agent *${agent.name}* is now Twitter verified!\n\nHandle: @${verification.twitterHandle}`,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.error('[Twitter Verify] Telegram notification failed:', e);
      }

      return NextResponse.json({
        success: true,
        verified: true,
        code: verification.code,
        twitterHandle: verification.twitterHandle,
        tweetUrl,
        agent: {
          id: agent.id,
          name: agent.name,
          twitterHandle: agent.twitterHandle,
          twitterVerified: true,
          badge: '✓ Twitter Verified'
        },
        message: 'Twitter verification successful! Your agent now has a verified badge.',
        verifiedAt: new Date().toISOString()
      });
    }

    // Return pending status
    return NextResponse.json({
      success: true,
      verified: false,
      code: verification.code,
      twitterHandle: verification.twitterHandle,
      agentId: verification.agentId,
      status: 'pending',
      instructions: {
        step1: `Post a tweet with hashtag: #${verification.code}`,
        step2: 'MUST include @SovereignLaunch',
        step3: 'MUST include your agent profile link',
        step4: 'The platform will auto-detect your tweet within 1 minute',
        example: `I just registered my agent on @SovereignLaunch! 🚀 https://sovereignlaunch.vercel.app/agents/${verification.agentId} #${verification.code}`,
        manualVerify: 'Or submit tweet URL: /api/agents/verify-twitter?code=' + verification.code + '&tweetUrl=YOUR_TWEET_URL'
      }
    });

  } catch (error) {
    console.error('Error checking Twitter verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
