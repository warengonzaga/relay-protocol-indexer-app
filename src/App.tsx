import { TransactionInput } from '@/components/TransactionInput';
import { MonitoringStatus } from '@/components/MonitoringStatus';
import { useTransactionMonitoring } from '@/hooks/use-transaction-monitoring';

function App() {
  const {
    monitoringState,
    isLoading,
    error,
    startMonitoring,
    manualRefresh,
    stopMonitoring,
    pollCount,
  } = useTransactionMonitoring();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Relay Protocol Transaction Re-indexer
            </h1>
            <p className="text-muted-foreground text-lg">
              Submit blockchain transactions for re-indexing with real-time status monitoring
            </p>
          </div>

          {!monitoringState ? (
            <TransactionInput
              onSubmit={startMonitoring}
              isLoading={isLoading}
              error={error}
            />
          ) : (
            <MonitoringStatus
              monitoringState={monitoringState}
              onManualRefresh={manualRefresh}
              onStopMonitoring={stopMonitoring}
              isLoading={isLoading}
              pollCount={pollCount}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;