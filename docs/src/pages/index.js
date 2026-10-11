import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home() {
  return (
    <Layout
      title="Open Game Server"
      description="Open specification for the architecture of multiplayer game servers">
      <main style={{padding: '4rem 2rem', textAlign: 'center'}}>
        <h1>Open Game Server</h1>
        <p>
          Open, standardized, and generic specification for the architecture of
          multiplayer game servers.
        </p>
        <Link className="button button--primary button--lg" to="/docs/intro">
          View the documentation
        </Link>
      </main>
    </Layout>
  );
}
