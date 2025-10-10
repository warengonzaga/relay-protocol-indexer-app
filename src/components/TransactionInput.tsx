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
          Submit a blockchain transaction URL to re-index it with Relay Protocol and monitor its status
        </CardDescription>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="text-accent font-medium">⚡ Optimized Flow:</div>
          <div>Step 1: <span className="text-accent">Fast check</span> via <code className="bg-muted px-1 rounded">api.relay.link/requests?hash=0x...</code> (instant if exists)</div>
          <div>Step 2: Index via <code className="bg-muted px-1 rounded">api.relay.link/transactions/index</code> (only if needed)</div>
          <div>Step 3: Poll via <code className="bg-muted px-1 rounded">api.relay.link/requests?hash=0x...</code> (until request ID appears)</div>
          <div>Step 4: Get status via <code className="bg-muted px-1 rounded">api.relay.link/intents/status/v3?requestId=...</code> (final details)</div>
          <div className="text-green-600 text-xs">✨ Most transactions return instantly without polling!</div>
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
                  Show technical details
                </summary>
                <div className="mt-2 p-2 bg-muted/50 rounded font-mono text-xs space-y-1">
                  <div className="text-accent font-medium">Optimized Flow:</div>
                  <div>Step 1 - Fast Check: GET api.relay.link/requests?hash=0x... (instant)</div>
                  <div>Step 2 - Index: POST api.relay.link/transactions/index (if needed)</div>
                  <div>Step 3 - Poll: GET api.relay.link/requests?hash=0x... (until requestId)</div>
                  <div>Step 4 - Status: GET api.relay.link/intents/status?id=... (final details)</div>
                  <div>Expected format: {`{ txHash: "0x...", chainId: number }`}</div>
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