// ventas.js

import { getSales, createSale, deleteSale, getProducts } from "../../../api.js";
import { showLoader, hideLoader } from "./loaderadmin.js";

class VentasPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.isSubmitting = false; // 🔥 clave
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
        <h2>📊 Ventas</h2>
        <div id="vistaVentas" style="display:none;">  
          <div id="resumenVentas" class="resumen">
            <div class="kpi">📅 Ventas hoy: <span id="ventasHoy">0</span></div>
            <div class="kpi">💰 Total facturado: $<span id="totalFacturado">0</span></div>
            <div class="kpi">📈 Margen promedio: <span id="margenPromedio">0%</span></div>
            <div class="kpi">📦 Producto más vendido: <span id="productoTop">-</span></div>
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

          <!-- Filtros -->
          <div class="filtros">
            <label>Desde: <input type="date" id="fechaInicio"></label>
            <label>Hasta: <input type="date" id="fechaFin"></label>
            <button id="btnFiltrar" class="btn-primary">Filtrar</button>
            <button id="btnExportarCSV" class="btn-primary">⬇ Exportar CSV</button>
            <button id="btnNuevaVenta" class="btn-primary">➕ Registrar venta</button>
         </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Costo</th>.
              <th>Ganancia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tabla-ventas">
            <!-- filas dinámicas -->
          </tbody>
        </table>
      </section>
    `;
  }

  async loadVentas() {
    showLoader("Cargando ventas... 🐥");
    try {
      const [ventas, productos] = await Promise.all([
        getSales(),
        getProducts()
      ]);

      // 📦 indexar productos por id
      const productosMap = {};
      productos.forEach(p => { productosMap[p.id] = p.name });

      const tbody = this.shadowRoot.getElementById("tabla-ventas");
      tbody.innerHTML = "";

      ventas.forEach(v => {
        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${new Date(v.createdAt).toLocaleDateString()}</td>
        <td>${productosMap[v.productId] || "❓"}</td>
        <td>${v.cantidad}</td>
        <td>$${v.precioVenta}</td>
        <td>$${v.precioCosto?.toFixed(2) ?? "-"}</td>
        <td>$${v.ganancia?.toFixed(2) ?? "-"}</td>
          <td>
            <button class="btn-delete" data-id="${v._id}">
              🗑️
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });

      // ✅ actualizar KPIs con productos
      this.actualizarKPIs(ventas, productosMap);

    } catch (err) {
      console.error("Error cargando ventas:", err);
    } finally {
      this.shadowRoot.getElementById("vistaVentas").style.display = "block";
      hideLoader();
    }
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

    // 🔥 TOP PRODUCTOS
    new Chart(this.shadowRoot.getElementById("chartTopProductos"), {
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
    new Chart(this.shadowRoot.getElementById("chartFacturacion"), {
      type: "line",
      data: {
        labels: Object.keys(data.facturacion),
        datasets: [{
          label: "Facturación",
          data: Object.values(data.facturacion)
        }]
      }
    });

    // 📈 GANANCIA
    new Chart(this.shadowRoot.getElementById("chartGanancia"), {
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
    new Chart(this.shadowRoot.getElementById("chartVentas"), {
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
      // 🔓 desbloqueo
      this.isSubmitting = false;
      btn.disabled = false;
      btn.textContent = textoOriginal;
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

    const ventas = await getSales();
    const productos = await getProducts();

    const productosMap = {};
    productos.forEach(p => productosMap[p.id] = p.name);

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

    this.shadowRoot.getElementById("btnActualizar").addEventListener("click", () => {
      this.actualizarAnalytics();
    });

    // 👉 ESTA ES LA LÍNEA QUE FALTABA
    formVenta.addEventListener("submit", this.handleNuevaVenta);

    // abrir modal
    btnNuevaVenta.addEventListener("click", async () => {
      const productos = await getProducts();
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

    const tbody = this.shadowRoot.getElementById("tabla-ventas");

    tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest(".btn-delete");
      if (!btn) return;

      const id = btn.dataset.id;

      const confirmDelete = confirm("¿Eliminar esta venta? Se restaurará el stock.");
      if (!confirmDelete) return;

      btn.disabled = true;
      btn.textContent = "⏳";

      try {
        await deleteSale(id);
        this.loadVentas();
      } catch (err) {
        console.error(err);
        alert("Error al eliminar venta");
        btn.disabled = false;
        btn.textContent = "🗑️";
      }
    });
  }
}

customElements.define("ventas-panel", VentasPanel);
