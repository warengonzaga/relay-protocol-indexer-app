import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, CircleNotch, Info } from '@phosphor-icons/react';
import { relayApi } from '@/lib/relay-api';

interface TransactionInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function TransactionInput({ onSubmit, isLoading, error }: TransactionInputProps) {
  const [url, setUrl] = useState('');
  const [detectedChain, setDetectedChain] = useState<{chainId: number, hash: string} | null>(null);

  useEffect(() => {
    const detectChainAndHash = async () => {
      if (!url.trim()) {
        setDetectedChain(null);
        return;
      }

      try {
        const hash = relayApi.extractTxHashFromUrl(url.trim());
        if (hash) {
          const chainId = await relayApi.getChainIdFromUrl(url.trim());
          if (chainId) {
            setDetectedChain({ chainId, hash });
          } else {
            setDetectedChain(null);
          }
        } else {
          setDetectedChain(null);
        }
      } catch (error) {
        console.warn('Error detecting chain:', error);
        setDetectedChain(null);
      }
    };

    const timeoutId = setTimeout(detectChainAndHash, 500);
    return () => clearTimeout(timeoutId);
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link weight="bold" />
          Transaction Re-indexer
        </CardTitle>
        <CardDescription>
          Monitor your Relay Protocol bridge transactions by entering the original transaction hash from your bridge operation
        </CardDescription>
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="bg-gray-900/50 border border-gray-700 p-3 rounded-lg">
            <div className="text-purple-400 font-medium mb-1">🔧 When to use this app:</div>
            <div className="text-gray-300 space-y-1">
              <div>• Your transaction doesn't appear on <code className="bg-gray-800 text-purple-300 px-1 rounded">relay.link/transactions</code></div>
              <div>• The relay transaction URL shows only loading/spinner indefinitely</div>
              <div>• Your deposit transaction seems "stuck" or not indexed by Relay Protocol</div>
              <div>• You need to manually re-index a transaction to see its bridge status</div>
            </div>
          </div>
          <div className="text-accent font-medium">📋 How to use:</div>
          <div>Step 1: Copy the transaction hash from your Relay Protocol bridge transaction</div>
          <div>Step 2: Enter the blockchain explorer URL containing that transaction hash</div>
          <div>Step 3: Click "Index Transaction" to start monitoring the relay status</div>
          <div>Step 4: View real-time updates as your transaction is processed through the bridge</div>
          <div className="text-purple-400 text-xs">✨ Supports Etherscan, Polygonscan, Arbiscan, Basescan, BSCScan, and more!</div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="transaction-url" className="text-sm font-medium">
              Transaction URL
            </label>
            <Input
              id="transaction-url"
              type="url"
              placeholder="https://etherscan.io/tx/0x1234... or just paste transaction hash"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Supported: Etherscan, Polygonscan, Arbiscan, Basescan, BSCScan, and more
            </p>
            {detectedChain && (
              <div className="flex items-center gap-2 p-2 bg-accent/10 border border-accent/20 rounded-md">
                <Info className="h-4 w-4 text-accent" />
                <span className="text-xs text-foreground">
                  Detected: Chain ID <code className="bg-muted px-1 rounded font-mono">{detectedChain.chainId}</code> 
                  {' '}• Hash <code className="bg-muted px-1 rounded font-mono">{detectedChain.hash.slice(0, 10)}...</code>
                </span>
              </div>
            )}
          </div>
          
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md space-y-2">
              <div className="font-medium">Error:</div>
              <div>{error}</div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Show troubleshooting help
                </summary>
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                  <div className="text-accent font-medium">Common Issues:</div>
                  <div>• Wrong transaction - make sure you're using the original bridge transaction hash</div>
                  <div>• Invalid URL format - ensure you're using a blockchain explorer URL</div>
                  <div>• Unsupported network - check if your blockchain is supported by Relay Protocol</div>
                  <div>• Transaction not found - verify the bridge transaction exists and is confirmed</div>
                  <div>• Network timeout - try again in a few seconds</div>
                  <div className="text-purple-400">💡 Tip: Use the transaction hash from when you initiated the bridge</div>
                </div>
              </details>
            </div>
          )}
          
          <Button type="submit" disabled={!detectedChain || isLoading} className="w-full">
            {isLoading ? (
              <>
                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                Indexing...
              </>
            ) : (
              'Index Transaction'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}