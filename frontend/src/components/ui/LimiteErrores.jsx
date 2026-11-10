/**
 * components/ui/LimiteErrores.jsx
 * Si una vista falla (por ejemplo, no se pudo descargar Plotly), muestra
 * un aviso en su lugar en vez de dejar toda la página en blanco.
 */
import React from 'react';

export class LimiteErrores extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(`[${this.props.nombre ?? 'vista'}]`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="chart-card" role="alert">
        <h2 className="chart-title">{this.props.nombre ?? 'Vista'}: no se pudo mostrar</h2>
        <p className="texto-secundario">{this.state.error.message}</p>
        <button type="button" className="btn-tms btn-secundario" onClick={() => this.setState({ error: null })}>Reintentar</button>
      </section>
    );
  }
}
