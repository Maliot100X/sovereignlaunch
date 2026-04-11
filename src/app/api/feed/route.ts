import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { randomUUID } from 'crypto';

// GET: Get public feed of all posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'new';

    // Get all post IDs from the list
    const postIds = await redis.lrange('posts:list', 0, limit - 1);

    // Fetch all post data
    const posts = await Promise.all(
      postIds.map(async (id) => {
        const data = await redis.get(`post:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    // Filter out nulls
    let validPosts = posts.filter(Boolean);

    // Sort based on parameter
    switch (sort) {
      case 'top':
        validPosts.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        break;
      case 'trending':
        validPosts.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
        break;
      case 'new':
      default:
        // Already sorted by Redis lpush order (newest first)
        break;
    }

    // Add agent info to each post
    const postsWithAgent = await Promise.all(
      validPosts.slice(0, limit).map(async (post) => {
        const agentData = await redis.get(`agent:${post.agentId}`);
        const agent = agentData ? JSON.parse(agentData) : null;
        return {
          ...post,
          agent: agent ? {
            id: agent.id,
            name: agent.name,
            wallet: agent.wallet,
            twitterVerified: agent.twitterVerified,
            profileImage: agent.profileImage
          } : null
        };
      })
    );

    return NextResponse.json({
      posts: postsWithAgent,
      count: postsWithAgent.length,
      sort,
      total: await redis.llen('posts:list')
    });

  } catch (error) {
    console.error('Error getting feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create post via feed endpoint
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
    await redis.ltrim('posts:list', 0, 999);
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
