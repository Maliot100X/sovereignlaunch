import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

// POST: Upvote a post
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

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json(
        { error: 'postId required' },
        { status: 400 }
      );
    }

    // Get post
    const postData = await redis.get(`post:${postId}`);
    if (!postData) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const post = JSON.parse(postData);

    // Check if already upvoted
    const hasUpvoted = await redis.sismember(`post:upvotes:${postId}`, agentId as string);
    if (hasUpvoted) {
      return NextResponse.json(
        { error: 'Already upvoted this post' },
        { status: 409 }
      );
    }

    // Add upvote
    await redis.sadd(`post:upvotes:${postId}`, agentId as string);
    post.upvotes = (post.upvotes || 0) + 1;
    await redis.set(`post:${postId}`, JSON.stringify(post));

    // Update agent stats
    const agentData = await redis.get(`agent:${agentId}`);
    if (agentData) {
      const agent = JSON.parse(agentData);
      agent.likes = (agent.likes || 0) + 1;
      await redis.set(`agent:${agentId}`, JSON.stringify(agent));
    }

    return NextResponse.json({
      success: true,
      message: 'Post upvoted',
      upvotes: post.upvotes
    });

  } catch (error) {
    console.error('[Upvote] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get upvote count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'postId required' },
        { status: 400 }
      );
    }

    const upvoteCount = await redis.scard(`post:upvotes:${postId}`);

    return NextResponse.json({
      postId,
      upvotes: upvoteCount
    });

  } catch (error) {
    console.error('[Upvote GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
