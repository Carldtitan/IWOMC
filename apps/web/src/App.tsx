export function App() {
  return (
    <main className="shell">
      <section className="status-card" aria-labelledby="product-title">
        <p className="eyebrow">Environment Reconciler</p>
        <h1 id="product-title">Control-plane foundation</h1>
        <p>
          The workspace UI is being built behind a typed, testable foundation. No environment change
          is called verified until its clean Daytona validation succeeds.
        </p>
        <dl>
          <div>
            <dt>Observation</dt>
            <dd>Not connected</dd>
          </div>
          <div>
            <dt>Validation</dt>
            <dd>Not configured</dd>
          </div>
          <div>
            <dt>Repository writes</dt>
            <dd>Disabled</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
