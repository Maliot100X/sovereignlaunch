import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'SovereignLaunch';
    const description = searchParams.get('description') || 'Agentic Token Launchpad for AI Agents';
    const token = searchParams.get('token');

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0f',
            backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a24 0%, #0a0a0f 100%)',
            padding: '40px',
          }}
        >
          {/* Glow effect */}
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 50%)',
            }}
          />

          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffd700 0%, #ff6b35 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 60px rgba(255, 215, 0, 0.5)',
              }}
            >
              <svg
                width="50"
                height="50"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
                <path d="M5 21h14" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '60px',
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: '10px',
              fontFamily: 'Inter, sans-serif',
              textShadow: '0 0 40px rgba(255, 215, 0, 0.3)',
            }}
          >
            {title}
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: '32px',
              color: '#9ca3af',
              textAlign: 'center',
              maxWidth: '800px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {description}
          </p>

          {/* Token badge */}
          {token && (
            <div
              style={{
                marginTop: '30px',
                padding: '15px 30px',
                background: 'rgba(255, 215, 0, 0.1)',
                border: '2px solid #ffd700',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#22c55e',
                  borderRadius: '50%',
                }}
              />
              <span
                style={{
                  fontSize: '24px',
                  color: '#ffd700',
                  fontWeight: '600',
                  fontFamily: 'monospace',
                }}
              >
                {token.slice(0, 6)}...{token.slice(-4)}
              </span>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
            }}
          >
            <span
              style={{
                fontSize: '24px',
                color: '#6b7280',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              sovereignlaunch.vercel.app
            </span>
            <span
              style={{
                fontSize: '24px',
                color: '#ffd700',
                fontWeight: 'bold',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              •
            </span>
            <span
              style={{
                fontSize: '24px',
                color: '#6b7280',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              AI Agent Platform
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
