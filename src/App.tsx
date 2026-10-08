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
  const [activeTab, setActiveTab] = useState('dashboard'); // Estado para la navegación

  useEffect(() => {
    const fetchData = async () => {
      try {
        const api = new OdooAPI();
        // Cargar datos en paralelo
        const [providersData, salesData, metricsData] = await Promise.all([
          api.getProviders().catch(() => []), 
          api.getHistoricalSales(100).catch(() => []), // Cargar más ventas para la tabla de ventas
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

  // --- Renderizado de Vistas --- //

  const renderDashboard = () => (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Package /></div>
          <div className="stat-info">
            <h3>Total Productos</h3>
            <p>{data.metrics.length || '0'}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users /></div>
          <div className="stat-info">
            <h3>Proveedores</h3>
            <p>{data.providers.length || '0'}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><TrendingUp /></div>
          <div className="stat-info">
            <h3>Ventas Históricas</h3>
            <p>{data.sales.length || '0'}</p>
          </div>
        </div>
      </div>

      <div className="charts-container">
        <div className="data-panel">
          <h2>Últimas Ventas (Top 10)</h2>
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
                  data.sales.slice(0, 10).map((sale: any) => (
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
            {data.metrics.slice(0, 5).map((metric: any) => (
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
    </>
  );

  const renderInventario = () => (
    <div className="data-panel" style={{ marginTop: '20px' }}>
      <h2>Todos los Productos ({data.metrics.length})</h2>
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Stock Disponible</th>
              <th>Stock Virtual</th>
              <th>Costo Estándar</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((item: any) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td style={{ color: item.qty_available <= 0 ? 'var(--danger-color)' : 'inherit' }}>
                  {item.qty_available}
                </td>
                <td>{item.virtual_available}</td>
                <td className="amount">${item.standard_price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProveedores = () => (
    <div className="data-panel" style={{ marginTop: '20px' }}>
      <h2>Lista de Proveedores ({data.providers.length})</h2>
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {data.providers.length > 0 ? (
              data.providers.map((prov: any) => (
                <tr key={prov.id}>
                  <td>{prov.id}</td>
                  <td>{prov.name}</td>
                  <td>{prov.phone || 'N/A'}</td>
                  <td>{prov.email || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="empty-state">No hay proveedores registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderVentas = () => (
    <div className="data-panel" style={{ marginTop: '20px' }}>
      <h2>Historial de Ventas ({data.sales.length})</h2>
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>ID Odoo</th>
              <th>Ref / Factura</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total ($)</th>
            </tr>
          </thead>
          <tbody>
            {data.sales.map((sale: any) => (
              <tr key={sale.id}>
                <td>{sale.id}</td>
                <td>{sale.name}</td>
                <td>{sale.partner_id ? sale.partner_id[1] : 'N/A'}</td>
                <td>{sale.invoice_date}</td>
                <td className="amount">${sale.amount_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Análisis de Inventario';
      case 'inventario': return 'Gestión de Inventario';
      case 'proveedores': return 'Directorio de Proveedores';
      case 'ventas': return 'Registro de Ventas';
      default: return 'Análisis de Inventario';
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="sidebar">
        <div className="logo-container">
          <Package className="logo-icon" />
          <span className="logo-text">InvX</span>
        </div>
        <ul className="nav-links">
          <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            <TrendingUp /> Dashboard
          </li>
          <li className={activeTab === 'inventario' ? 'active' : ''} onClick={() => setActiveTab('inventario')}>
            <Package /> Inventario
          </li>
          <li className={activeTab === 'proveedores' ? 'active' : ''} onClick={() => setActiveTab('proveedores')}>
            <Users /> Proveedores
          </li>
          <li className={activeTab === 'ventas' ? 'active' : ''} onClick={() => setActiveTab('ventas')}>
            <Calendar /> Ventas
          </li>
        </ul>
      </nav>

      <main className="main-content">
        <header className="header">
          <h1>{getPageTitle()}</h1>
          <div className="user-profile">Admin</div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'inventario' && renderInventario()}
        {activeTab === 'proveedores' && renderProveedores()}
        {activeTab === 'ventas' && renderVentas()}

      </main>
    </div>
  );
}

export default App;
