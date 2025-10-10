import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowClockwise, ArrowSquareOut, Clock, CheckCircle, XCircle, CircleNotch } from '@phosphor-icons/react';
import { MonitoringState } from '@/lib/types';

interface MonitoringStatusProps {
  monitoringState: MonitoringState;
  onManualRefresh: () => void;
  onStopMonitoring: () => void;
  isLoading: boolean;
  pollCount?: number;
}

export function MonitoringStatus({ 
  monitoringState, 
  onManualRefresh, 
  onStopMonitoring, 
  isLoading,
  pollCount = 0
}: MonitoringStatusProps) {
  const { 
    transactionHash, 
    requestId, 
    transactionDetails, 
    lastChecked, 
    isMonitoring 
  } = monitoringState || {};

  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(dateObj);
    } catch {
      return 'Invalid date';
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusBadge = () => {
    if (requestId && transactionDetails) {
      const status = transactionDetails.status;
      switch (status) {
        case 'success':
          return <Badge variant="default" className="bg-accent text-accent-foreground"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
        case 'pending':
          return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
        case 'failed':
          return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
        default:
          return <Badge variant="outline">Unknown</Badge>;
      }
    }
    return <Badge variant="secondary"><CircleNotch className="mr-1 h-3 w-3 animate-spin" />Indexing</Badge>;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Transaction Status</CardTitle>
              <CardDescription className="font-mono text-xs">
                {transactionHash || 'Loading...'}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Last checked: {formatTime(lastChecked)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onManualRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircleNotch className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowClockwise className="h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onStopMonitoring}
              >
                Stop Monitoring
              </Button>
            </div>
          </div>

          {isMonitoring && !requestId && (
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                <CircleNotch className="inline mr-2 h-4 w-4 animate-spin" />
                Polling requests endpoint for indexed transaction... 
                {pollCount < 30 ? (
                  <span className="text-accent font-medium"> (optimized: every 2s for first minute)</span>
                ) : (
                  <span> (every 10s)</span>
                )}
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Poll #{pollCount + 1} • Endpoint: <code className="bg-muted px-1 rounded">api.relay.link/requests?hash={transactionHash?.slice(0, 10)}...</code></div>
                <div>
                  {pollCount < 30 ? (
                    <span className="text-accent">⚡ Fast polling during indexing phase</span>
                  ) : (
                    <span>Slower polling - transaction indexing can take time on some networks</span>
                  )}
                </div>
                <div className="text-xs text-green-600">Most transactions that exist return data immediately without polling!</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {requestId && transactionDetails && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Transaction Details</CardTitle>
              <Button asChild>
                <a
                  href={`https://relay.link/transaction/${requestId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  View Relay Transaction
                  <ArrowSquareOut className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-primary">Origin Chain</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chain ID:</span>
                    <span className="font-mono">{transactionDetails.originChainId}</span>
                  </div>
                  {transactionDetails.inTxHashes && transactionDetails.inTxHashes.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Input Transaction(s):</span>
                      {transactionDetails.inTxHashes.map((hash, idx) => (
                        <p key={idx} className="font-mono text-xs break-all" title={hash}>
                          {hash.slice(0, 10)}...{hash.slice(-8)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-primary">Destination Chain</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chain ID:</span>
                    <span className="font-mono">{transactionDetails.destinationChainId}</span>
                  </div>
                  {transactionDetails.txHashes && transactionDetails.txHashes.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Output Transaction(s):</span>
                      {transactionDetails.txHashes.map((hash, idx) => (
                        <p key={idx} className="font-mono text-xs break-all" title={hash}>
                          {hash.slice(0, 10)}...{hash.slice(-8)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">Request ID</span>
                <p className="font-mono text-xs break-all">{requestId}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Last Updated</span>
                <p className="font-mono text-xs">
                  {transactionDetails.updatedAt 
                    ? new Date(transactionDetails.updatedAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Status</span>
                <p className="capitalize">{transactionDetails.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}