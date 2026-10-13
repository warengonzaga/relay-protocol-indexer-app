function App() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Community project notice
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Relay Protocol Indexer App
          </h1>
          <p className="text-lg text-muted-foreground">
            This community project has been discontinued. Relay's API is changing,
            and public read-only access is no longer available in a sustainable way.
            Providing an API key would require hosting a server, so development has ended.
          </p>
        </header>

        <section className="rounded-xl border bg-card p-6 shadow-sm" aria-labelledby="demo-title">
          <h2 id="demo-title" className="text-xl font-semibold">Static demo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The previous interface is represented here with illustrative data only.
            No transaction is submitted, indexed, or checked.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-muted p-4">
              <dt className="text-sm text-muted-foreground">Example transaction</dt>
              <dd className="mt-1 font-medium">Ethereum → Base</dd>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <dt className="text-sm text-muted-foreground">Example status</dt>
              <dd className="mt-1 font-medium">Demo only · not live</dd>
            </div>
          </dl>
        </section>

        <nav className="flex flex-wrap gap-4 text-sm">
          <a
            className="font-medium text-primary underline underline-offset-4"
            href="https://docs.relay.link/references/api/api_guides/migrating-to-requests-v3"
            target="_blank"
            rel="noreferrer"
          >
            Relay Requests v3 migration guide
          </a>
          <a
            className="font-medium text-primary underline underline-offset-4"
            href="https://github.com/warengonzaga/relay-protocol-indexer-app"
            target="_blank"
            rel="noreferrer"
          >
            Project repository
          </a>
        </nav>
      </div>
    </main>
  );
}

export default App;
