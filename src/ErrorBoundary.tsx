import { Component, ReactNode } from 'react';

/** Si une page plante, on affiche un message et un bouton pour recharger, au lieu d'une page blanche. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="wrap" style={{ padding: '64px 16px', textAlign: 'center' }}>
        <div className="stack" style={{ justifyItems: 'center' }}>
          <h1>Oups, un souci d’affichage</h1>
          <p className="muted">La page n’a pas pu s’afficher correctement. Rechargez-la pour continuer.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn" onClick={() => window.location.reload()}>Recharger la page</button>
            <a className="btn secondary" href="#/" onClick={() => setTimeout(() => window.location.reload(), 0)}>Accueil</a>
          </div>
        </div>
      </main>
    );
  }
}
