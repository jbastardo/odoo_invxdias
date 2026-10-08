import { useEffect, useState } from 'react';
import { Package, TrendingUp, Users, Calendar, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { OdooAPI } from './api/OdooAPI';
import './App.css';

function App() {
  const [data, setData] = useState({
    providers: [],
    sales: [],
    metrics: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const api = new OdooAPI();
        // Cargar datos en paralelo
        const [providersData, salesData, metricsData] = await Promise.all([
          api.getProviders().catch(() => []), 
          api.getHistoricalSales(10).catch(() => []),
          api.getInventoryMetrics().catch(() => [])
        ]);

        setData({
          providers: providersData,
          sales: salesData,
          metrics: metricsData
        });
      } catch (err: any) {
        setError(err.message || 'Error de conexión con Odoo');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Conectando con Odoo...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <nav className="sidebar">
        <div className="logo-container">
          <Package className="logo-icon" />
          <span className="logo-text">InvX</span>
        </div>
        <ul className="nav-links">
          <li className="active"><TrendingUp /> Dashboard</li>
          <li><Package /> Inventario</li>
          <li><Users /> Proveedores</li>
          <li><Calendar /> Ventas</li>
        </ul>
      </nav>

      <main className="main-content">
        <header className="header">
          <h1>Análisis de Inventario</h1>
          <div className="user-profile">Admin</div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle />
            <span>{error}</span>
            <p className="error-hint">(Verifica si necesitas autenticación de Odoo)</p>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><Package /></div>
            <div className="stat-info">
              <h3>Total Productos</h3>
              <p>{data.metrics.length || '---'}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Users /></div>
            <div className="stat-info">
              <h3>Proveedores</h3>
              <p>{data.providers.length || '---'}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><TrendingUp /></div>
            <div className="stat-info">
              <h3>Ventas Recientes</h3>
              <p>{data.sales.length || '---'}</p>
            </div>
          </div>
        </div>

        <div className="charts-container">
          <div className="data-panel">
            <h2>Últimas Ventas</h2>
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.length > 0 ? (
                    data.sales.map((sale: any) => (
                      <tr key={sale.id}>
                        <td>{sale.name}</td>
                        <td>{sale.partner_id ? sale.partner_id[1] : 'N/A'}</td>
                        <td>{sale.invoice_date}</td>
                        <td className="amount">${sale.amount_total}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="empty-state">No hay datos de ventas disponibles</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="data-panel side-panel">
            <h2>Alerta de Inventario</h2>
            <div className="alerts-list">
              {data.metrics.slice(0, 4).map((metric: any) => (
                <div key={metric.id} className="alert-item">
                  <div className="alert-content">
                    <h4>{metric.name}</h4>
                    <p>Stock: {metric.qty_available} ud.</p>
                  </div>
                  <ArrowUpRight className="alert-arrow" />
                </div>
              ))}
              {data.metrics.length === 0 && (
                <div className="empty-state">No hay alertas de inventario</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
