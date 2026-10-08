import { useEffect, useState, useMemo } from 'react';
import { Package, TrendingUp, Calendar, AlertTriangle, Filter, RefreshCw, Box } from 'lucide-react';
import { OdooAPI } from './api/OdooAPI';
import './App.css';

// Interfaz para el producto procesado
interface ProcessedProduct {
  id: number;
  name: string;
  category: string;
  brand: string;
  supplier: string;
  stock: number;
  salesInPeriod: number;
  salesVelocityPerDay: number;
  daysOfInventory: number | typeof Infinity;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw data from API
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<any[]>([]);

  // Period settings (in days)
  const [periodDays, setPeriodDays] = useState(90);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');

  useEffect(() => {
    fetchData();
  }, [periodDays]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const api = new OdooAPI();

      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateTo.getDate() - periodDays);

      const toStr = dateTo.toISOString().split('T')[0];
      const fromStr = dateFrom.toISOString().split('T')[0];

      const [prods, supps, lines] = await Promise.all([
        api.getProducts().catch(() => []),
        api.getSupplierInfo().catch(() => []),
        api.getInvoiceLines(fromStr, toStr).catch(() => [])
      ]);

      setProducts(prods);
      setSuppliers(supps);
      setInvoiceLines(lines);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con Odoo');
    } finally {
      setLoading(false);
    }
  };

  // --- Data Processing --- //
  const processedData = useMemo(() => {
    if (!products.length) return [];

    // Map suppliers by ID
    const suppMap: Record<number, string> = {};
    suppliers.forEach((s) => {
      // In Odoo, partner could be in partner_id or name
      const partner = s.partner_id || s.name;
      if (Array.isArray(partner) && partner.length > 1) {
        suppMap[s.id] = partner[1];
      } else if (typeof partner === 'string') {
        suppMap[s.id] = partner;
      } else {
        suppMap[s.id] = 'Desconocido';
      }
    });

    // Sum sales by product_id
    const salesMap: Record<number, number> = {};
    invoiceLines.forEach((line) => {
      const prodId = line.product_id[0];
      salesMap[prodId] = (salesMap[prodId] || 0) + line.quantity;
    });

    return products.map((p): ProcessedProduct => {
      // Find main supplier
      let supplierName = 'No asignado';
      if (p.seller_ids && p.seller_ids.length > 0) {
        supplierName = suppMap[p.seller_ids[0]] || 'Proveedor ID ' + p.seller_ids[0];
      }

      const salesInPeriod = salesMap[p.id] || 0;
      const salesVelocityPerDay = salesInPeriod / periodDays;
      
      let daysOfInventory = Infinity;
      if (salesVelocityPerDay > 0) {
        daysOfInventory = Math.round(p.qty_available / salesVelocityPerDay);
      }

      return {
        id: p.id,
        name: p.display_name,
        category: p.categ_id ? p.categ_id[1] : 'Sin Categoría',
        brand: p.brand_id ? p.brand_id[1] : 'Genérico',
        supplier: supplierName,
        stock: p.qty_available || 0,
        salesInPeriod,
        salesVelocityPerDay,
        daysOfInventory
      };
    });
  }, [products, suppliers, invoiceLines, periodDays]);

  // --- Filtering --- //
  const filteredData = useMemo(() => {
    return processedData.filter(p => {
      const matchCat = selectedCategory ? p.category === selectedCategory : true;
      const matchBrand = selectedBrand ? p.brand === selectedBrand : true;
      const matchSupp = selectedSupplier ? p.supplier === selectedSupplier : true;
      return matchCat && matchBrand && matchSupp;
    });
  }, [processedData, selectedCategory, selectedBrand, selectedSupplier]);

  // --- Unique Options for Selects --- //
  const categories = Array.from(new Set(processedData.map(p => p.category))).sort();
  const brands = Array.from(new Set(processedData.map(p => p.brand))).sort();
  const supplierNames = Array.from(new Set(processedData.map(p => p.supplier))).sort();

  // --- Metrics --- //
  const totalStock = filteredData.reduce((acc, p) => acc + p.stock, 0);
  const totalSales = filteredData.reduce((acc, p) => acc + p.salesInPeriod, 0);
  
  // Promedio ponderado de días de inventario
  let avgDays = Infinity;
  const avgSalesPerDay = totalSales / periodDays;
  if (avgSalesPerDay > 0) {
    avgDays = Math.round(totalStock / avgSalesPerDay);
  }

  return (
    <div className="dashboard-container">
      <nav className="sidebar">
        <div className="logo-container">
          <Box className="logo-icon" />
          <span className="logo-text">InvX</span>
        </div>
        <ul className="nav-links">
          <li className="active"><TrendingUp /> Análisis Días</li>
          <li onClick={fetchData} style={{ cursor: 'pointer', marginTop: 'auto', color: 'var(--text-secondary)' }}>
            <RefreshCw size={18} style={{ marginRight: 8 }} /> Actualizar Datos
          </li>
        </ul>
      </nav>

      <main className="main-content">
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Análisis de Días de Inventario</h1>
          
          <div className="period-selector">
            <span style={{ marginRight: '10px', fontWeight: 600 }}>Período de Ventas:</span>
            <select 
              value={periodDays} 
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="modern-select"
            >
              <option value={30}>Último Mes (30 días)</option>
              <option value={90}>Último Trimestre (Q - 90 días)</option>
              <option value={180}>Último Semestre (180 días)</option>
              <option value={365}>Último Año (365 días)</option>
            </select>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-screen" style={{ minHeight: '400px' }}>
            <div className="loader"></div>
            <p>Calculando promedios y conectando con Odoo...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><Package /></div>
                <div className="stat-info">
                  <h3>Total Unidades en Stock</h3>
                  <p>{totalStock.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><TrendingUp /></div>
                <div className="stat-info">
                  <h3>Unid. Vendidas (Período)</h3>
                  <p>{totalSales.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card" style={{ borderLeft: avgDays > 180 ? '4px solid var(--danger-color)' : '4px solid var(--success-color)' }}>
                <div className="stat-icon"><Calendar /></div>
                <div className="stat-info">
                  <h3>Promedio Días Inv.</h3>
                  <p>{avgDays === Infinity ? 'Estancado' : avgDays + ' días'}</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="filters-bar" style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: 'var(--surface-color)', padding: '15px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Filter size={18} />
                <strong>Filtros:</strong>
              </div>
              <select className="modern-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="">Todas las Categorías</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="modern-select" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
                <option value="">Todas las Marcas</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select className="modern-select" value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
                <option value="">Todos los Proveedores</option>
                {supplierNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Data Table */}
            <div className="data-panel">
              <h2>Análisis Detallado por Producto</h2>
              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Marca</th>
                      <th>Categoría</th>
                      <th>Proveedor</th>
                      <th>Ventas ({periodDays}d)</th>
                      <th>Stock Actual</th>
                      <th>Días de Inv.</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((item) => {
                        // Determinar color de alerta
                        let statusColor = 'var(--success-color)';
                        let statusText = 'Saludable';
                        
                        if (item.stock <= 0) {
                          statusColor = 'gray';
                          statusText = 'Agotado';
                        } else if (item.daysOfInventory === Infinity) {
                          statusColor = 'var(--danger-color)';
                          statusText = 'Estancado';
                        } else if (item.daysOfInventory > 180) {
                          statusColor = '#f59e0b'; // Warning/Yellow
                          statusText = 'Lento (>180d)';
                        } else if (item.daysOfInventory < 15) {
                          statusColor = '#3b82f6'; // Blue
                          statusText = 'Próx. a Agotarse';
                        }

                        return (
                          <tr key={item.id}>
                            <td><strong>{item.name}</strong></td>
                            <td>{item.brand}</td>
                            <td>{item.category}</td>
                            <td><span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>{item.supplier}</span></td>
                            <td>{item.salesInPeriod}</td>
                            <td style={{ fontWeight: 'bold' }}>{item.stock}</td>
                            <td style={{ fontWeight: 'bold', color: item.daysOfInventory === Infinity ? 'var(--danger-color)' : 'inherit' }}>
                              {item.daysOfInventory === Infinity ? '∞' : item.daysOfInventory}
                            </td>
                            <td>
                              <span style={{ 
                                background: statusColor + '20', 
                                color: statusColor, 
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '0.85em',
                                fontWeight: 600
                              }}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="empty-state">No hay productos que coincidan con los filtros</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
