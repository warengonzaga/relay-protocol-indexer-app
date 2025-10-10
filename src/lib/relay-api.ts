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
    return this.makeRequest<Chain[]>('/chains');
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
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  async getChainIdFromUrl(url: string): Promise<number | null> {
    console.log('Getting chain ID for URL:', url);
    
    // First try static mappings for common explorers
    const staticMappings: Record<string, number> = {
      'etherscan.io': 1, // Ethereum mainnet
      'sepolia.etherscan.io': 11155111, // Sepolia
      'goerli.etherscan.io': 5, // Goerli (deprecated but still in use)
      'polygonscan.com': 137, // Polygon
      'mumbai.polygonscan.com': 80001, // Polygon Mumbai testnet
      'arbiscan.io': 42161, // Arbitrum One
      'nova.arbiscan.io': 42170, // Arbitrum Nova
      'testnet.arbiscan.io': 421613, // Arbitrum Goerli
      'optimistic.etherscan.io': 10, // Optimism
      'goerli-optimism.etherscan.io': 420, // Optimism Goerli
      'basescan.org': 8453, // Base
      'goerli.basescan.org': 84531, // Base Goerli
      'bscscan.com': 56, // BSC
      'testnet.bscscan.com': 97, // BSC testnet
    };

    // Check static mappings first
    for (const [domain, chainId] of Object.entries(staticMappings)) {
      if (url.includes(domain)) {
        console.log(`Found static mapping: ${domain} -> ${chainId}`);
        return chainId;
      }
    }

    // Try to extract from path patterns like /chain/1/tx/
    const chainPathMatch = url.match(/\/chain\/(\d+)\//);
    if (chainPathMatch) {
      const chainId = parseInt(chainPathMatch[1]);
      console.log(`Found chain ID in URL path: ${chainId}`);
      return chainId;
    }

    // If no static mapping found, try to get from API and match by explorer domains
    try {
      console.log('Fetching chains from API to resolve chain ID...');
      const chains = await this.getChains();
      console.log('Available chains:', chains.map(c => ({ id: c.id, name: c.name })));
      
      // Try to match based on explorer domain patterns
      if (url.includes('arbiscan.io') && !url.includes('nova') && !url.includes('testnet')) {
        const arbitrumChain = chains.find(chain => 
          chain.id === '42161' || // Direct match for Arbitrum One
          (chain.name.toLowerCase().includes('arbitrum') && 
           (chain.name.toLowerCase().includes('one') || chain.name.toLowerCase() === 'arbitrum'))
        );
        if (arbitrumChain) {
          console.log(`Found Arbitrum chain: ${arbitrumChain.name} (${arbitrumChain.id})`);
          return parseInt(arbitrumChain.id);
        }
      }
      
      if (url.includes('nova.arbiscan.io')) {
        const arbitrumNovaChain = chains.find(chain => 
          chain.id === '42170' || 
          chain.name.toLowerCase().includes('nova')
        );
        if (arbitrumNovaChain) {
          console.log(`Found Arbitrum Nova chain: ${arbitrumNovaChain.name} (${arbitrumNovaChain.id})`);
          return parseInt(arbitrumNovaChain.id);
        }
      }
      
      if (url.includes('polygonscan.com') && !url.includes('mumbai')) {
        const polygonChain = chains.find(chain => 
          chain.id === '137' ||
          (chain.name.toLowerCase().includes('polygon') && 
           !chain.name.toLowerCase().includes('mumbai') &&
           !chain.name.toLowerCase().includes('test'))
        );
        if (polygonChain) {
          console.log(`Found Polygon chain: ${polygonChain.name} (${polygonChain.id})`);
          return parseInt(polygonChain.id);
        }
      }
      
      if (url.includes('bscscan.com') && !url.includes('testnet')) {
        const bscChain = chains.find(chain => 
          chain.id === '56' ||
          chain.name.toLowerCase().includes('bsc') || 
          chain.name.toLowerCase().includes('binance')
        );
        if (bscChain) {
          console.log(`Found BSC chain: ${bscChain.name} (${bscChain.id})`);
          return parseInt(bscChain.id);
        }
      }
      
      if (url.includes('basescan.org') && !url.includes('goerli')) {
        const baseChain = chains.find(chain => 
          chain.id === '8453' ||
          (chain.name.toLowerCase().includes('base') && 
           !chain.name.toLowerCase().includes('goerli') &&
           !chain.name.toLowerCase().includes('test'))
        );
        if (baseChain) {
          console.log(`Found Base chain: ${baseChain.name} (${baseChain.id})`);
          return parseInt(baseChain.id);
        }
      }
      
      if (url.includes('optimistic.etherscan.io') && !url.includes('goerli')) {
        const optimismChain = chains.find(chain => 
          chain.id === '10' ||
          (chain.name.toLowerCase().includes('optimism') && 
           !chain.name.toLowerCase().includes('goerli') &&
           !chain.name.toLowerCase().includes('test'))
        );
        if (optimismChain) {
          console.log(`Found Optimism chain: ${optimismChain.name} (${optimismChain.id})`);
          return parseInt(optimismChain.id);
        }
      }
      
      if (url.includes('etherscan.io') && !url.includes('sepolia') && !url.includes('goerli')) {
        const ethereumChain = chains.find(chain => 
          chain.id === '1' ||
          chain.name.toLowerCase() === 'ethereum' ||
          chain.name.toLowerCase() === 'mainnet'
        );
        if (ethereumChain) {
          console.log(`Found Ethereum chain: ${ethereumChain.name} (${ethereumChain.id})`);
          return parseInt(ethereumChain.id);
        }
      }
      
      console.warn('No matching chain found in API response');
    } catch (error) {
      console.warn('Failed to fetch chains from API:', error);
    }

    // Return null instead of defaulting to 1, so we can show a proper error
    console.warn('Could not determine chain ID from URL');
    return null;
  }
}

export const relayApi = new RelayApiService();