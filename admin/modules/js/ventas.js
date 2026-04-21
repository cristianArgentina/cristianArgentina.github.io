// ventas.js

import { getSales, createSale, deleteSale, getProducts } from "../../../api.js";
import { showLoader, hideLoader } from "./loaderadmin.js";

class VentasPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.isSubmitting = false; // 🔥 clave
    this.formListenerSet = false;

    this.ventas = [];
    this.productos = [];
    this.productosMap = {};
    this.charts = {};
  }

  connectedCallback() {
    this.render();
    this.loadVentas();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/admin/modules/css/ventas.css">
      <style>
        section {
          padding: 1rem;
          font-family: sans-serif;
        }
        h2 {
          margin-bottom: 1rem;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 0.5rem;
          text-align: left;
        }
      </style>
      <section>
        <div id="vistaVentas" style="display:none;">  
          <div id="resumenVentas" class="resumen">
            <div class="kpi">📦 Producto más vendido: <span id="productoTop">-</span></div>
            <div class="kpi">💰 Total facturado: $<span id="totalFacturado">0</span></div>
            <div class="kpi">📈 Margen promedio: <span id="margenPromedio">0%</span></div>
            <div class="kpi">📅 Ventas totales: <span id="ventasHoy">0</span></div>
          </div>

          <div id="analytics">

  <div class="controls">
    <label>Desde: <input type="date" id="fechaInicio"></label>
    <label>Hasta: <input type="date" id="fechaFin"></label>

    <label>
      <input type="checkbox" id="toggleCostoCero">
      Excluir costo = 0
    </label>

    <button id="btnActualizar" class="btn-primary">Actualizar</button>
    <button id="btnMasInfo" class="btn-primary">Más info</button>
  </div>

  <div class="grid">

    <div class="card">
      <h3>🔥 Top productos vendidos</h3>
      <canvas id="chartTopProductos"></canvas>
    </div>

    <div class="card">
      <h3>💰 Facturación</h3>
      <canvas id="chartFacturacion"></canvas>
    </div>

    <div class="card">
      <h3>📈 Mayor ganancia</h3>
      <canvas id="chartGanancia"></canvas>
    </div>

    <div class="card">
      <h3>🧾 Cantidad de ventas</h3>
      <canvas id="chartVentas"></canvas>
    </div>

  </div>
</div>
</div>
        </div>
          <div class="ventas-toolbar">
            <button id="btnNuevaVenta" class="btn-fab">
              ➕ Nueva venta
            </button>
          </div>
        <div id="ventas-container">
        </div>
      </section>
    `;
  }

  async loadVentas() {
    showLoader("Cargando ventas... 🛒");
    try {
      const [ventas, productos] = await Promise.all([
        getSales(),
        getProducts()
      ]);

      this.ventas = ventas;
      this.productos = productos;

      // 🔥 map cacheado
      this.productosMap = {};
      productos.forEach(p => {
        this.productosMap[p.id] = p.name;
      });

      // 📦 indexar productos por id
      const productosMap = {};
      productos.forEach(p => { productosMap[p.id] = p.name });

      this.renderVentasCards(
        ventas,
        productosMap
      );

      // ✅ actualizar KPIs con productos
      this.actualizarKPIs(ventas, productosMap);

    } catch (err) {
      console.error("Error cargando ventas:", err);
    } finally {
      this.shadowRoot.getElementById("vistaVentas").style.display = "block";

      this.actualizarAnalytics();

      hideLoader();
    }
  }

  renderVentasCards(ventas, productosMap) {

    const container =
      this.shadowRoot
        .getElementById("ventas-container");

    container.innerHTML = "";

    const grupos =
      this.groupVentasByFecha(ventas);

    Object.entries(grupos)

      .sort((a, b) => {

        const fechaA =
          new Date(a[0].split("/").reverse().join("-"));

        const fechaB =
          new Date(b[0].split("/").reverse().join("-"));

        return fechaB - fechaA; // 👈 DESCENDENTE

      })

      .forEach(([fecha, ventasDelDia]) => {

        const totalDia =
          ventasDelDia.reduce(
            (sum, v) => sum +
              v.precioVenta * v.cantidad,
            0
          );
        const section =
          document.createElement("div");

        section.className =
          "ventas-dia";

        section.innerHTML = `
<h3 class="fecha">
 📅 ${fecha}
 💰 $${this.formatPrice(totalDia)}
</h3>

        <div class="ventas-grid"></div>
      `;

        const grid =
          section.querySelector(".ventas-grid");

        ventasDelDia.forEach(v => {

          const gananciaReal =
            (v.ganancia != null)
              ? v.ganancia
              : (v.precioVenta * v.cantidad);

          const card =
            document.createElement("div");

          card.className =
            "venta-card";

          card.innerHTML = `
          <div class="venta-header">
            <div class="venta-nombre">
              ${productosMap[v.productId] || "❓"}
            </div>
          </div>

          <div class="venta-info">
            <span>
              💲 ${this.formatPrice(v.precioVenta)}
            </span>

            ${v.precioCosto > 0
              ? `<span>📉 ${this.formatPrice(v.precioCosto)}</span>`
              : ""
            }

            <span>
              📦 x${v.cantidad}
            </span>

            <span>
              💰 +${this.formatPrice(gananciaReal)}
            </span>
          </div>

          <div class="venta-actions">
            <button
              class="action btn-delete"
              data-id="${v._id}">
              🗑️
            </button>
          </div>
        `;

          grid.appendChild(card);

        });

        container.appendChild(section);

      });
  }

  // KPIs
  procesarDatos(ventas, productosMap, desde, hasta, excluirCostoCero) {

    const filtradas = ventas.filter(v => {
      const fecha = new Date(v.createdAt);
      return (!desde || fecha >= desde) &&
        (!hasta || fecha <= hasta);
    });

    // 🔥 TOP PRODUCTOS
    const topProductos = {};
    filtradas.forEach(v => {
      topProductos[v.productId] = (topProductos[v.productId] || 0) + v.cantidad;
    });

    const top10 = Object.entries(topProductos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // 💰 FACTURACIÓN POR MES
    const facturacion = {};
    filtradas.forEach(v => {
      const mes = new Date(v.createdAt).toISOString().slice(0, 7);
      facturacion[mes] = (facturacion[mes] || 0) + v.precioVenta * v.cantidad;
    });

    // 📈 GANANCIA
    const ganancias = {};
    filtradas.forEach(v => {
      if (excluirCostoCero && (!v.precioCosto || v.precioCosto === 0)) return;

      ganancias[v.productId] = (ganancias[v.productId] || 0) + (v.ganancia || 0);
    });

    const topGanancia = Object.entries(ganancias)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // 🧾 CANTIDAD DE VENTAS
    const ventasPorMes = {};
    filtradas.forEach(v => {
      const mes = new Date(v.createdAt).toISOString().slice(0, 7);
      ventasPorMes[mes] = (ventasPorMes[mes] || 0) + 1;
    });

    return {
      top10,
      facturacion,
      topGanancia,
      ventasPorMes
    };
  }

  renderCharts(data, productosMap) {

    const createOrUpdate = (id, config) => {
      if (this.charts[id]) {
        this.charts[id].destroy();
      }
      this.charts[id] = new Chart(
        this.shadowRoot.getElementById(id),
        config
      );
    };

    // 🔥 TOP PRODUCTOS
    createOrUpdate("chartTopProductos", {
      type: "bar",
      data: {
        labels: data.top10.map(([id]) => productosMap[id] || id),
        datasets: [{
          label: "Cantidad",
          data: data.top10.map(([, v]) => v)
        }]
      }
    });

    // 💰 FACTURACIÓN
    createOrUpdate("chartFacturacion", {
      type: "line",
      data: {
        labels: Object.keys(data.facturacion).sort(),
        datasets: [{
          label: "Facturación",
          data: Object.values(data.facturacion)
        }]
      }
    });

    // 📈 GANANCIA
    createOrUpdate("chartGanancia", {
      type: "bar",
      data: {
        labels: data.topGanancia.map(([id]) => productosMap[id] || id),
        datasets: [{
          label: "Ganancia",
          data: data.topGanancia.map(([, v]) => v)
        }]
      }
    });

    // 🧾 VENTAS
    createOrUpdate("chartVentas", {
      type: "line",
      data: {
        labels: Object.keys(data.ventasPorMes),
        datasets: [{
          label: "Ventas",
          data: Object.values(data.ventasPorMes)
        }]
      }
    });
  }

  actualizarKPIs(ventas, productosMap) {
    const totalFacturado = ventas.reduce((sum, v) => sum + v.precioVenta * v.cantidad, 0);
    const totalGanancia = ventas.reduce((sum, v) => sum + (v.ganancia ?? 0), 0);
    const margenPromedio = totalFacturado ? ((totalGanancia / totalFacturado) * 100).toFixed(1) : 0;

    // 📦 conteo por producto
    const conteo = {};
    ventas.forEach(v => { conteo[v.productId] = (conteo[v.productId] || 0) + v.cantidad });
    const productoTopId = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const productoTop = productoTopId ? (productosMap[productoTopId] || productoTopId) : "-";

    // ⚡️ spans están fuera del shadow DOM
    this.shadowRoot.getElementById("ventasHoy").textContent = ventas.length;
    this.shadowRoot.getElementById("totalFacturado").textContent = totalFacturado.toFixed(2);
    this.shadowRoot.getElementById("margenPromedio").textContent = margenPromedio + "%";
    this.shadowRoot.getElementById("productoTop").textContent = productoTop;
  }

  handleNuevaVenta = async (e) => {
    e.preventDefault();

    // 🚫 bloqueo lógico (anti doble click REAL)
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    const form = e.target;
    const btn = form.querySelector("button[type=submit]");

    // 🔒 bloqueo visual
    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = "Procesando...";

    try {
      const productId = form.ventaProducto.value;
      const cantidad = parseInt(form.ventaCantidad.value);
      const precioVenta = parseFloat(form.ventaPrecio.value);

      await this.addVenta({ productId, cantidad, precioVenta });

      // cerrar modal
      document.getElementById("modalVenta").style.display = "none";

      // limpiar form
      form.reset();

    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {

        // 🔓 desbloqueo
        this.isSubmitting = false;
        btn.disabled = false;
        btn.textContent = textoOriginal;
      }, 500); // 🔥 evita rebotes rápidos
    }
  };

  async addVenta(nuevaVenta) {
    try {
      const venta = await createSale(nuevaVenta);
      console.log("Venta creada:", venta);
      this.loadVentas(); // recargar lista
    } catch (err) {
      console.error("Error al crear venta:", err);
    }
  }

  async actualizarAnalytics() {

    const ventas = this.ventas;
    const productosMap = this.productosMap;

    const desde = this.shadowRoot.getElementById("fechaInicio").value;
    const hasta = this.shadowRoot.getElementById("fechaFin").value;
    const excluir = this.shadowRoot.getElementById("toggleCostoCero").checked;

    const data = this.procesarDatos(
      ventas,
      productosMap,
      desde ? new Date(desde) : null,
      hasta ? new Date(hasta) : null,
      excluir
    );

    this.renderCharts(data, productosMap);
    console.log("Analytics data:", data);
  }

  groupVentasByFecha(ventas) {

    const grupos = {};

    ventas.forEach(v => {

      const fecha =
        new Date(v.createdAt)
          .toLocaleDateString();

      if (!grupos[fecha])
        grupos[fecha] = [];

      grupos[fecha].push(v);

    });

    return grupos;
  }

  setupEventListeners() {
    const btnNuevaVenta = this.shadowRoot.getElementById("btnNuevaVenta");

    // Modal global (fuera del shadow DOM)
    const modalVenta = document.getElementById("modalVenta");
    const closeModalVenta = document.getElementById("closeModalVenta");
    const formVenta = document.getElementById("formVenta");
    const ventaProducto = document.getElementById("ventaProducto");
    const ventaCantidad = document.getElementById("ventaCantidad");
    const ventaPrecio = document.getElementById("ventaPrecio");

    const autoUpdate = () => this.actualizarAnalytics();

    this.shadowRoot.getElementById("fechaInicio").addEventListener("change", autoUpdate);
    this.shadowRoot.getElementById("fechaFin").addEventListener("change", autoUpdate);
    this.shadowRoot.getElementById("toggleCostoCero").addEventListener("change", autoUpdate);

    this.shadowRoot.getElementById("btnActualizar").addEventListener("click", () => {
      this.actualizarAnalytics();
    });

    if (!this.formListenerSet) {

      formVenta.addEventListener(
        "submit",
        this.handleNuevaVenta
      );

      this.formListenerSet = true;

    }

    // abrir modal
    btnNuevaVenta.addEventListener("click", async () => {
      const productos = this.productos;
      ventaProducto.innerHTML = "";
      productos.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = p.name;
        ventaProducto.appendChild(option);
      });
      modalVenta.style.display = "flex"; // 👈 SOLO acá
    });

    // cerrar modal
    closeModalVenta.addEventListener("click", () => {
      modalVenta.style.display = "none";
    });
  }

  formatPrice(value) {

    return Math.round(value)
      .toLocaleString("es-AR");

  }
}

customElements.define("ventas-panel", VentasPanel);