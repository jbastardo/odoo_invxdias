import axios from 'axios';

export class OdooAPI {
  private url: string;

  private db = 'binaural-dev-onprotec-16-release-8815487';
  private uid: number | null = null;

  constructor() {
    // Usa el proxy local que creamos en Vite o Express
    this.url = '/odoo_api';
  }

  async authenticate() {
    const response = await axios.post(`${this.url}/web/session/authenticate`, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        db: this.db,
        login: "juan@onprotec.com",
        password: "9803"
      }
    });

    if (response.data.error) {
      console.error("Odoo Auth Error:", response.data.error);
      throw new Error(response.data.error.data?.message || "Error de Autenticación");
    }
    
    this.uid = response.data.result.uid;
  }

  /**
   * Método base para llamadas JSON-RPC a Odoo
   */
  async callKw(model: string, method: string, args: any[], kwargs: any = {}) {
    if (!this.uid) {
      await this.authenticate();
    }

    try {
      const response = await axios.post(`${this.url}/web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: model,
          method: method,
          args: args,
          kwargs: kwargs,
        }
      }, {
        withCredentials: true
      });

      if (response.data.error) {
        throw new Error(response.data.error.data?.message || response.data.error.message || 'Error en la API de Odoo');
      }
      return response.data.result;
    } catch (error) {
      console.error(`Error al invocar ${model}.${method}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de proveedores
   */
  async getProviders() {
    return this.callKw('res.partner', 'search_read', [
      [['supplier_rank', '>', 0]] // Filtro para obtener proveedores
    ], {
      fields: ['id', 'name', 'phone', 'email'],
      limit: 100
    });
  }

  /**
   * Obtiene ventas históricas (Facturas publicadas)
   */
  async getHistoricalSales(limit: number = 50) {
    return this.callKw('account.move', 'search_read', [
      [['move_type', '=', 'out_invoice'], ['state', '=', 'posted']]
    ], {
      fields: ['id', 'name', 'partner_id', 'invoice_date', 'amount_total'],
      limit: limit,
      order: 'invoice_date desc'
    });
  }

  /**
   * Obtiene métricas de inventario por producto
   */
  async getInventoryMetrics() {
    return this.callKw('product.product', 'search_read', [
      [['type', '=', 'product']]
    ], {
      fields: ['id', 'name', 'qty_available', 'virtual_available', 'standard_price'],
      limit: 100
    });
  }
}
