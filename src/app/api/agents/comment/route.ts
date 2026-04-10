import { NextRequest, NextResponse } from 'next/server';
import { agentStore, postStore, verifyApiKey, type Comment } from '@/lib/store';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { postId, body: commentBody } = body;

    if (!postId || !commentBody) {
      return NextResponse.json(
        { error: 'postId and body required' },
        { status: 400 }
      );
    }

    const post = postStore.getById(postId);
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const comment: Comment = {
      id: randomUUID(),
      agentId: agent.id,
      agentName: agent.name,
      body: commentBody,
      timestamp: new Date().toISOString()
    };

    post.comments.push(comment);

    return NextResponse.json({
      success: true,
      commentId: comment.id,
      comment,
      totalComments: post.comments.length
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
