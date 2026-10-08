import axios from 'axios';

export class OdooAPI {
  private url: string;
  private db = 'binaural-dev-onprotec-16-release-8815487';
  private uid: number | null = null;

  constructor() {
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
      throw new Error(response.data.error.data?.message || "Error de Autenticación");
    }
    
    this.uid = response.data.result.uid;
  }

  async callKw(model: string, method: string, args: any[], kwargs: any = {}) {
    if (!this.uid) {
      await this.authenticate();
    }

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
      throw new Error(response.data.error.data?.message || response.data.error.message || 'Error en Odoo');
    }
    return response.data.result;
  }

  /**
   * Obtiene todos los productos vendibles y almacenables con su inventario.
   */
  async getProducts() {
    return this.callKw('product.product', 'search_read', [
      [['type', '=', 'product'], ['sale_ok', '=', true]]
    ], {
      fields: ['id', 'display_name', 'qty_available', 'categ_id', 'brand_id', 'seller_ids'],
      limit: 0
    });
  }

  /**
   * Obtiene la información de proveedores asociados a los productos.
   */
  async getSupplierInfo() {
    return this.callKw('product.supplierinfo', 'search_read', [
      []
    ], {
      fields: ['id', 'name', 'product_id', 'product_tmpl_id'],
      limit: 0
    });
  }

  /**
   * Obtiene las líneas de factura (ventas reales) de un período de tiempo.
   * @param dateFrom Fecha inicio (YYYY-MM-DD)
   * @param dateTo Fecha fin (YYYY-MM-DD)
   */
  async getInvoiceLines(dateFrom: string, dateTo: string) {
    return this.callKw('account.move.line', 'search_read', [
      [
        ['move_id.move_type', '=', 'out_invoice'],
        ['move_id.state', '=', 'posted'],
        ['display_type', '=', 'product'],
        ['date', '>=', dateFrom],
        ['date', '<=', dateTo]
      ]
    ], {
      fields: ['id', 'product_id', 'quantity', 'date', 'price_subtotal'],
      limit: 0
    });
  }
}

