import { Chain, IndexTransactionRequest, TransactionRequest, RequestStatusResponse } from './types';

const RELAY_API_BASE = 'https://api.relay.link';

class RelayApiService {
  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${RELAY_API_BASE}${endpoint}`;
    console.log('Making request to:', url);
    console.log('Request options:', {
      method: options?.method || 'GET',
      headers: options?.headers,
      body: options?.body,
    });
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
    });

    console.log('Response status:', response.status, response.statusText);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.text();
        console.log('Error response body:', errorBody);
        
        // Try to parse as JSON to get more detailed error info
        try {
          const errorJson = JSON.parse(errorBody);
          console.log('Parsed error JSON:', errorJson);
          
          if (errorJson.message) {
            errorMessage = errorJson.message;
          } else if (errorJson.error) {
            errorMessage = errorJson.error;
          } else if (errorJson.details) {
            errorMessage = errorJson.details;
          } else if (typeof errorJson === 'string') {
            errorMessage = errorJson;
          }
        } catch {
          if (errorBody) {
            errorMessage += ` - ${errorBody}`;
          }
        }
      } catch (parseError) {
        console.log('Could not parse error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseData = await response.json();
      console.log('Success response:', responseData);
      return responseData;
    } else {
      // For non-JSON responses, return a generic success object
      console.log('Non-JSON response received');
      return { success: true } as T;
    }
  }

  async getChains(): Promise<Chain[]> {
    const response = await this.makeRequest<{ chains: Chain[] }>('/chains');
    return response.chains;
  }

  async indexTransaction(request: IndexTransactionRequest): Promise<{ success: boolean }> {
    console.log('Indexing transaction with request:', request);
    console.log('Request URL:', `${RELAY_API_BASE}/transactions/index`);
    
    // Validate the request data before sending
    if (!request.hash || !request.hash.startsWith('0x') || request.hash.length !== 66) {
      throw new Error(`Invalid hash format: ${request.hash}. Expected 0x followed by 64 hex characters.`);
    }
    
    if (!request.chainId || !Number.isInteger(request.chainId)) {
      throw new Error(`Invalid chainId: ${request.chainId}. Expected a valid integer.`);
    }
    
    // API actually expects 'txHash' not 'hash' based on the error message
    const requestBody = {
      txHash: request.hash,
      chainId: request.chainId
    };
    
    console.log('Request body being sent:', JSON.stringify(requestBody, null, 2));
    
    // According to https://docs.relay.link/references/api/transactions-index
    // The request should include txHash and chainId in the body
    const response = await this.makeRequest('/transactions/index', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    // The API returns success with a 200 status code
    // The response might be empty or contain minimal data
    return { success: true };
  }

  async getRequestsByTxHash(txHash: string): Promise<TransactionRequest[]> {
    // Using the correct endpoint as per https://docs.relay.link/references/api/get-requests
    // This endpoint allows us to get the request ID using the transaction hash
    const params = new URLSearchParams({ hash: txHash });
    console.log('Getting requests for tx hash:', txHash, 'from endpoint: /requests');
    const response = await this.makeRequest<{ requests: TransactionRequest[] }>(`/requests?${params}`);
    // API returns {requests: [...]} so we need to unwrap it
    return response.requests || [];
  }

  async getRequestStatus(requestId: string): Promise<RequestStatusResponse> {
    // Using the correct v3 endpoint as per https://docs.relay.link/references/api/get-intents-status-v3
    // This endpoint provides the complete status of the transaction using the request ID
    console.log('Getting status for request ID:', requestId, 'from endpoint: /intents/status/v3');
    const response = await this.makeRequest<Omit<RequestStatusResponse, 'requestId'>>(`/intents/status/v3?requestId=${requestId}`);
    // Add the requestId to the response since the API doesn't return it
    return {
      ...response,
      requestId,
    };
  }

  extractTxHashFromUrl(url: string): string | null {
    // If it's already a transaction hash, return it
    if (/^0x[a-fA-F0-9]{64}$/.test(url.trim())) {
      return url.trim();
    }

    // Common blockchain explorer patterns
    const patterns = [
      // Ethereum mainnet/testnets
      /etherscan\.io\/tx\/(0x[a-fA-F0-9]{64})/,
      /sepolia\.etherscan\.io\/tx\/(0x[a-fA-F0-9]{64})/,
      /goerli\.etherscan\.io\/tx\/(0x[a-fA-F0-9]{64})/,
      
      // Polygon
      /polygonscan\.com\/tx\/(0x[a-fA-F0-9]{64})/,
      /mumbai\.polygonscan\.com\/tx\/(0x[a-fA-F0-9]{64})/,
      
      // Arbitrum
      /arbiscan\.io\/tx\/(0x[a-fA-F0-9]{64})/,
      /nova\.arbiscan\.io\/tx\/(0x[a-fA-F0-9]{64})/,
      /testnet\.arbiscan\.io\/tx\/(0x[a-fA-F0-9]{64})/,
      
      // Optimism
      /optimistic\.etherscan\.io\/tx\/(0x[a-fA-F0-9]{64})/,
      /goerli-optimism\.etherscan\.io\/tx\/(0x[a-fA-F0-9]{64})/,
      
      // Base
      /basescan\.org\/tx\/(0x[a-fA-F0-9]{64})/,
      /goerli\.basescan\.org\/tx\/(0x[a-fA-F0-9]{64})/,
      
      // BSC
      /bscscan\.com\/tx\/(0x[a-fA-F0-9]{64})/,
      /testnet\.bscscan\.com\/tx\/(0x[a-fA-F0-9]{64})/,
      
      // HyperEVM
      /hyperevmscan\.io\/tx\/(0x[a-fA-F0-9]{64})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  async getSupportedChainNames(): Promise<string[]> {
    try {
      const chains = await this.getChains();
      const chainNames = chains
        .filter(chain => !chain.disabled && chain.depositEnabled)
        .map(chain => chain.displayName || chain.name)
        .sort();
      
      console.log('Supported chain names:', chainNames);
      return chainNames;
    } catch (error) {
      console.error('Error fetching supported chains:', error);
      // Fallback to static list
      return ['Ethereum', 'Polygon', 'Arbitrum', 'Base', 'BSC', 'Optimism'];
    }
  }

  async getChainIdFromUrl(url: string): Promise<number | null> {
    console.log('Getting chain ID for URL:', url);
    
    try {
      // Get all chains from the API first
      console.log('Fetching chains from API...');
      const chains = await this.getChains();
      console.log('Available chains:', chains.map(c => ({ id: c.id, name: c.name, explorer: c.explorerUrl })));
      
      // First, try to match by explorer URL from API
      for (const chain of chains) {
        if (chain.explorerUrl && url.includes(new URL(chain.explorerUrl).hostname)) {
          console.log(`Found chain by explorer URL: ${chain.name} (${chain.id}) - ${chain.explorerUrl}`);
          return chain.id;
        }
      }
      
      // Fallback to static mappings for common patterns
      const staticMappings: Record<string, number> = {
        'etherscan.io': 1,
        'sepolia.etherscan.io': 11155111,
        'goerli.etherscan.io': 5,
        'polygonscan.com': 137,
        'mumbai.polygonscan.com': 80001,
        'arbiscan.io': 42161,
        'nova.arbiscan.io': 42170,
        'testnet.arbiscan.io': 421613,
        'optimistic.etherscan.io': 10,
        'goerli-optimism.etherscan.io': 420,
        'basescan.org': 8453,
        'goerli.basescan.org': 84531,
        'bscscan.com': 56,
        'testnet.bscscan.com': 97,
        'hyperevmscan.io': 999, // HyperEVM
      };

      // Check static mappings and verify chain is supported
      for (const [domain, chainId] of Object.entries(staticMappings)) {
        if (url.includes(domain)) {
          const chainExists = chains.find(c => c.id === chainId);
          if (chainExists) {
            console.log(`Found supported chain: ${chainExists.name} (${chainId})`);
            return chainId;
          } else {
            console.log(`Chain ${chainId} found but not supported by Relay Protocol`);
          }
        }
      }

      // Try to extract chain ID from URL path
      const chainPathMatch = url.match(/\/chain\/(\d+)\//);
      if (chainPathMatch) {
        const chainId = parseInt(chainPathMatch[1]);
        const chainExists = chains.find(c => c.id === chainId);
        if (chainExists) {
          console.log(`Found supported chain from URL path: ${chainExists.name} (${chainId})`);
          return chainId;
        }
      }

      console.log('No supported chain found for URL:', url);
      return null;
    } catch (error) {
      console.error('Error detecting chain:', error);
      return null;
    }
  }
}

export const relayApi = new RelayApiService();