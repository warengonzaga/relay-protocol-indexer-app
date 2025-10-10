import { useState, useEffect, useCallback } from 'react';
import { useKV } from '@github/spark/hooks';
import { relayApi } from '@/lib/relay-api';
import { MonitoringState, RequestStatusResponse } from '@/lib/types';

const POLLING_INTERVAL = 2 * 1000; // 2 seconds for very fast updates
const MAX_FAST_POLLS = 30; // Poll every 2s for first minute (30 * 2s = 60s)
const SLOW_POLLING_INTERVAL = 10 * 1000; // Then every 10 seconds (more responsive)

export function useTransactionMonitoring() {
  const [monitoringState, setMonitoringState] = useKV<MonitoringState | null>('monitoring-state', null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const checkTransactionStatus = useCallback(async (txHash: string): Promise<RequestStatusResponse | null> => {
    try {
      console.log('🔍 Polling for transaction status, hash:', txHash);
      
      // Step 1: Check /requests endpoint for request ID
      console.log('📡 Calling requests endpoint...');
      const requests = await relayApi.getRequestsByTxHash(txHash);
      console.log('📋 Received requests:', requests);
      
      if (!requests || requests.length === 0) {
        console.log('⏳ No requests found yet - transaction still being processed');
        return null;
      }

      // Get the latest request (most recent)
      const latestRequest = requests[0];
      console.log('📄 Latest request found:', latestRequest);
      
      if (!latestRequest?.id) {
        console.warn('⚠️ Latest request missing id:', latestRequest);
        return null;
      }
      
      console.log('✅ Found request ID:', latestRequest.id);
      
      // Step 2: Get detailed status using request ID
      console.log('📡 Calling status endpoint for request ID:', latestRequest.id);
      const statusDetails = await relayApi.getRequestStatus(latestRequest.id);
      console.log('📊 Received status details:', statusDetails);
      
      return statusDetails;
    } catch (err) {
      console.error('❌ Error checking transaction status:', err);
      throw err;
    }
  }, []);

  const startMonitoring = useCallback(async (transactionUrl: string) => {
    setIsLoading(true);
    setError(null);
    setPollCount(0);

    try {
      // Step 1: Get chain ID and transaction hash from URL
      const txHash = relayApi.extractTxHashFromUrl(transactionUrl);
      if (!txHash) {
        throw new Error('Invalid transaction URL. Please provide a valid blockchain explorer URL (e.g., Etherscan, Polygonscan, Arbiscan, HyperEVM, etc.)');
      }

      const chainId = await relayApi.getChainIdFromUrl(transactionUrl);
      if (!chainId) {
        throw new Error('Could not determine chain ID from URL. Please use a supported blockchain explorer (Etherscan, Arbiscan, Polygonscan, etc.) or check that the URL is correct.');
      }

      console.log(`� RE-INDEXER FLOW: Processing transaction ${txHash} on chain ${chainId}`);

      // Set initial monitoring state
      setMonitoringState({
        isMonitoring: true,
        transactionHash: txHash,
        lastChecked: new Date(),
      });

      // Step 2: ALWAYS INDEX FIRST (This is a re-indexer tool!)
      console.log('📦 Step 1: Force indexing transaction (ensuring fresh data)...');
      const indexResult = await relayApi.indexTransaction({ hash: txHash, chainId });
      console.log('✅ Index result:', indexResult);

      // Step 3: Start polling for request ID after indexing
      console.log('🔄 Step 2: Starting polling for request ID after indexing...');
      
      // Check once immediately after indexing
      const freshDetails = await checkTransactionStatus(txHash);
      if (freshDetails) {
        console.log('🎉 Found transaction details immediately after indexing:', freshDetails);
        setMonitoringState(prev => prev ? {
          ...prev,
          requestId: freshDetails.requestId,
          transactionDetails: freshDetails,
          isMonitoring: false,
        } : null);
      } else {
        console.log('⏳ No immediate results, starting polling (every 2s for first minute)...');
      }
    } catch (err) {
      console.error('Error starting monitoring:', err);
      let errorMessage = 'An error occurred while processing the transaction';
      
      if (err instanceof Error) {
        if (err.message.includes('404')) {
          errorMessage = 'Transaction not found. Please ensure the transaction URL is correct and the transaction exists on the blockchain.';
        } else if (err.message.includes('400')) {
          errorMessage = 'Invalid request. Please check that the transaction URL is from a supported blockchain explorer.';
        } else if (err.message.includes('500')) {
          errorMessage = 'Relay service is temporarily unavailable. Please try again in a few minutes.';
        } else if (err.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setMonitoringState(null);
      setPollCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [setMonitoringState, checkTransactionStatus]);

  const manualRefresh = useCallback(async () => {
    if (!monitoringState?.transactionHash) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Manual refresh: checking transaction status...');
      const details = await checkTransactionStatus(monitoringState.transactionHash);
      
      setMonitoringState(prev => prev ? {
        ...prev,
        lastChecked: new Date(),
        ...(details ? {
          requestId: details.requestId,
          transactionDetails: details,
          isMonitoring: false,
        } : {}),
      } : null);
      
      if (details) {
        console.log('Manual refresh: found transaction details');
      } else {
        console.log('Manual refresh: no transaction details found yet');
      }
    } catch (err) {
      console.error('Manual refresh error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during refresh';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [monitoringState?.transactionHash, setMonitoringState, checkTransactionStatus]);

  const stopMonitoring = useCallback(() => {
    setMonitoringState(null);
    setError(null);
    setPollCount(0);
  }, [setMonitoringState]);

  // Auto-polling effect with progressive intervals
  useEffect(() => {
    if (!monitoringState?.isMonitoring || !monitoringState.transactionHash) {
      return;
    }

    // Use faster polling initially, then slow down
    const currentInterval = pollCount < MAX_FAST_POLLS ? POLLING_INTERVAL : SLOW_POLLING_INTERVAL;
    const intervalName = pollCount < MAX_FAST_POLLS ? 'fast' : 'slow';
    
    console.log(`Starting ${intervalName} polling (attempt ${pollCount + 1}) - checking every ${currentInterval}ms`);

    const interval = setInterval(async () => {
      try {
        console.log(`Auto-polling (${intervalName}, attempt ${pollCount + 1}): checking transaction status...`);
        const details = await checkTransactionStatus(monitoringState.transactionHash);
        
        if (details) {
          console.log('Auto-polling: found transaction details, stopping monitoring');
          setMonitoringState(prev => prev ? {
            ...prev,
            requestId: details.requestId,
            transactionDetails: details,
            isMonitoring: false,
            lastChecked: new Date(),
          } : null);
          setPollCount(0);
        } else {
          console.log(`Auto-polling: no details yet (attempt ${pollCount + 1}), updating last checked time`);
          setMonitoringState(prev => prev ? {
            ...prev,
            lastChecked: new Date(),
          } : null);
          setPollCount(prev => prev + 1);
        }
      } catch (err) {
        console.error('Auto-polling error:', err);
        // Don't stop monitoring on error, just log it and increment poll count
        setPollCount(prev => prev + 1);
      }
    }, currentInterval);

    return () => clearInterval(interval);
  }, [monitoringState?.isMonitoring, monitoringState?.transactionHash, setMonitoringState, checkTransactionStatus, pollCount]);

  return {
    monitoringState,
    isLoading,
    error,
    startMonitoring,
    manualRefresh,
    stopMonitoring,
    pollCount,
  };
}