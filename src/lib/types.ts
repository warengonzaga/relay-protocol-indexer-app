export interface Chain {
  id: string;
  name: string;
  displayName: string;
  icon?: string;
  vmType?: string;
}

export interface IndexTransactionRequest {
  hash: string;
  chainId: number;
}

export interface TransactionRequest {
  id: string; // API returns 'id' not 'requestId'
  status: string;
  user: string;
  recipient: string;
  data: any; // Complex nested structure
  createdAt: string;
  updatedAt: string;
}

export interface TransactionStep {
  id: string;
  action: string;
  status: string;
  chainId: string;
  txHash?: string;
  gasUsed?: string;
  blockNumber?: string;
  items: StepItem[];
}

export interface StepItem {
  recipient: string;
  amount: string;
  currency: Currency;
}

export interface Currency {
  chainId: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface TransactionFee {
  amount: string;
  currency: Currency;
}

export interface RequestStatusResponse {
  requestId: string; // We'll add this from the request object
  status: 'pending' | 'success' | 'failed' | string;
  inTxHashes: string[];
  txHashes: string[];
  updatedAt: number;
  originChainId: number;
  destinationChainId: number;
}

export interface MonitoringState {
  isMonitoring: boolean;
  transactionHash: string;
  requestId?: string;
  lastChecked?: Date | string;
  error?: string;
  transactionDetails?: RequestStatusResponse;
}