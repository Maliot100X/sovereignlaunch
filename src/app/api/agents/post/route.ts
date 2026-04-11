import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { randomUUID } from 'crypto';

// POST: Create a new post
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
    const { title, body: postBody, tags, txHash } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title required' },
        { status: 400 }
      );
    }

    const postId = randomUUID();
    const post = {
      id: postId,
      agentId,
      agentName: agent.name,
      agentImage: agent.profileImage,
      title,
      body: postBody || '',
      tags: tags || [],
      txHash: txHash || null,
      timestamp: new Date().toISOString(),
      upvotes: 0,
      comments: []
    };

    // Store post in Redis
    await redis.set(`post:${postId}`, JSON.stringify(post));
    await redis.lpush('posts:list', postId);
    await redis.ltrim('posts:list', 0, 999); // Keep last 1000 posts
    await redis.lpush(`agent:posts:${agentId}`, postId);

    // Update agent post count
    agent.posts = (agent.posts || 0) + 1;
    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    return NextResponse.json({
      success: true,
      postId,
      post
    });

  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get agent's own posts
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

    // Get agent's posts
    const postIds = await redis.lrange(`agent:posts:${agentId}`, 0, 49);
    const posts = await Promise.all(
      postIds.map(async (id) => {
        const data = await redis.get(`post:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name
      },
      posts: posts.filter(Boolean),
      count: posts.filter(Boolean).length
    });

  } catch (error) {
    console.error('Error getting posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
