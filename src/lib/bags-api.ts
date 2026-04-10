import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  TokenInfo,
  TokenLaunchParams,
  LaunchResponse,
  TradeParams,
  TradeResponse,
  TokenMetrics,
  FeeClaimInfo,
  LaunchpadStats,
  BAGSAPIResponse,
  ChartDataPoint,
  HolderInfo
} from '@/types';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://public-api-v2.bags.fm/api/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || '';

class BAGSAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BAGS_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BAGS_API_KEY,
        'Accept': 'application/json'
      }
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`[BAGS API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[BAGS API Error]', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: any): string {
    if (error.response) {
      const data = error.response.data as any;
      return data?.error || data?.message || `API Error: ${error.response.status}`;
    }
    if (error.request) {
      return 'Network error. Please check your connection.';
    }
    return error.message || 'Unknown error occurred';
  }

  async getTokens(params?: { limit?: number; offset?: number; sortBy?: string }): Promise<BAGSAPIResponse<TokenInfo[]>> {
    try {
      const response = await this.client.get('/tokens', { params });
      return { success: true, data: response.data.tokens };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async getToken(address: string): Promise<BAGSAPIResponse<TokenInfo>> {
    try {
      const response = await this.client.get(`/tokens/${address}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async getTokenMetrics(address: string): Promise<BAGSAPIResponse<TokenMetrics>> {
    try {
      const response = await this.client.get(`/tokens/${address}/metrics`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async getTokenHolders(address: string): Promise<BAGSAPIResponse<HolderInfo[]>> {
    try {
      const response = await this.client.get(`/tokens/${address}/holders`);
      return { success: true, data: response.data.holders };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async getTokenChart(address: string, timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<BAGSAPIResponse<ChartDataPoint[]>> {
    try {
      const response = await this.client.get(`/tokens/${address}/chart`, {
        params: { timeframe }
      });
      return { success: true, data: response.data.chart };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async launchToken(params: TokenLaunchParams & { agentFeeShare?: number; platformWallet?: string }): Promise<LaunchResponse> {
    try {
      const PLATFORM_WALLET = params.platformWallet || 'Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx';
      const AGENT_FEE_SHARE = params.agentFeeShare || 6500; // 65% in bps
      const PLATFORM_FEE_SHARE = 3500; // 35% in bps

      const response = await this.client.post('/tokens/launch', {
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        image: params.image,
        decimals: params.decimals || 9,
        totalSupply: params.totalSupply || '1000000000',
        initialLiquidity: params.initialLiquidity || '1',
        launchType: params.launchType,
        creatorWallet: params.creatorWallet,
        socialLinks: params.socialLinks,
        // Fee distribution: 65% agent, 35% platform
        feeDistribution: {
          creator: AGENT_FEE_SHARE,        // 65% to agent
          platform: PLATFORM_FEE_SHARE,   // 35% to platform
          creatorWallet: params.creatorWallet, // Agent wallet gets 65%
          platformWallet: PLATFORM_WALLET    // Platform wallet gets 35%
        }
      });

      return {
        success: true,
        tokenAddress: response.data.tokenAddress,
        transactionSignature: response.data.signature,
        metadataUrl: response.data.metadataUrl,
        message: 'Token launched successfully!',
        feeDistribution: {
          user: 65,
          platform: 35,
          partner: 0,
          agentWallet: params.creatorWallet,
          platformWallet: PLATFORM_WALLET
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
        message: 'Failed to launch token'
      };
    }
  }

  async executeTrade(params: TradeParams): Promise<TradeResponse> {
    try {
      const endpoint = params.type === 'buy' ? '/trades/buy' : '/trades/sell';
      const response = await this.client.post(endpoint, {
        tokenAddress: params.tokenAddress,
        amount: params.amount,
        slippage: params.slippage || 0.5,
        walletAddress: params.walletAddress
      });

      return {
        success: true,
        transactionSignature: response.data.signature,
        amountReceived: response.data.amountReceived,
        price: response.data.price,
        message: `Trade executed successfully!`
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
        message: `Failed to ${params.type} token`
      };
    }
  }

  async getFeesForClaim(walletAddress: string): Promise<BAGSAPIResponse<FeeClaimInfo[]>> {
    try {
      const response = await this.client.get(`/fees/claimable`, {
        params: { wallet: walletAddress }
      });
      return { success: true, data: response.data.fees };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async claimFees(tokenAddress: string, walletAddress: string): Promise<BAGSAPIResponse<{ signature: string; amount: string }>> {
    try {
      const response = await this.client.post(`/fees/claim`, {
        tokenAddress,
        walletAddress
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async getLaunchpadStats(): Promise<BAGSAPIResponse<LaunchpadStats>> {
    try {
      const response = await this.client.get('/stats');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async estimateLaunchCost(params: Partial<TokenLaunchParams>): Promise<BAGSAPIResponse<{ cost: string; breakdown: Record<string, string> }>> {
    try {
      const response = await this.client.post('/tokens/estimate', params);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async validateTokenSymbol(symbol: string): Promise<BAGSAPIResponse<{ available: boolean; suggestions?: string[] }>> {
    try {
      const response = await this.client.get('/tokens/validate-symbol', {
        params: { symbol }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async uploadImage(file: File): Promise<BAGSAPIResponse<{ url: string }>> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await this.client.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }
}

export const bagsApi = new BAGSAPI();
export default bagsApi;
