/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    domains: ['bags.fm', 'public-api-v2.bags.fm', 'arweave.net', 'ipfs.io']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    // Handle optional dependencies
    config.externals.push('pino-pretty');
    return config;
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-API-KEY, Content-Type' }
        ]
      }
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
    NEXT_PUBLIC_PLATFORM_WALLET: process.env.NEXT_PUBLIC_PLATFORM_WALLET,
    NEXT_PUBLIC_PLATFORM_NAME: process.env.NEXT_PUBLIC_PLATFORM_NAME || 'SovereignLaunch',
    NEXT_PUBLIC_PLATFORM_FEE_PERCENT: process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT || '25',
    NEXT_PUBLIC_USER_FEE_PERCENT: process.env.NEXT_PUBLIC_USER_FEE_PERCENT || '70',
    NEXT_PUBLIC_PARTNER_FEE_PERCENT: process.env.NEXT_PUBLIC_PARTNER_FEE_PERCENT || '5'
  }
};

module.exports = nextConfig;
