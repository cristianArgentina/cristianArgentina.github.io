// ventas.js

import { getSales, createSale, getProducts } from "../../../api.js";
import { showLoader, hideLoader } from "./loaderadmin.js";

class VentasPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }); // shadow DOM encapsulado
  }

  connectedCallback() {
    this.render();
    this.loadVentas();
    this.setupEventListeners();
   }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url("../css/ventas.css");
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

          <!-- Filtros -->
          <div class="filtros">
            <label>Desde: <input type="date" id="fechaInicio"></label>
            <label>Hasta: <input type="date" id="fechaFin"></label>
            <button id="btnFiltrar" class="btn-primary">Filtrar</button>
            <button id="btnExportarCSV" class="btn-primary">⬇ Exportar CSV</button>
            <button id="btnNuevaVenta" class="btn-primary">➕ Registrar venta</button>
         </div>
        </div>
        <button id="btnNuevaVenta" class="btn-primary">➕ Registrar venta</button>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Costo</th>
              <th>Ganancia</th>
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
      `;
      tbody.appendChild(row);
    });

    // ✅ actualizar KPIs con productos
    this.actualizarKPIs(ventas, productosMap);

  } catch (err) {
    console.error("Error cargando ventas:", err);
  } finally {
    hideLoader();
  }
}

// KPIs
actualizarKPIs(ventas, productosMap) {
  const totalFacturado = ventas.reduce((sum, v) => sum + v.precioVenta * v.cantidad, 0);
  const totalGanancia = ventas.reduce((sum, v) => sum + (v.ganancia ?? 0), 0);
  const margenPromedio = totalFacturado ? ((totalGanancia / totalFacturado) * 100).toFixed(1) : 0;

  // 📦 conteo por producto
  const conteo = {};
  ventas.forEach(v => { conteo[v.productId] = (conteo[v.productId] || 0) + v.cantidad });
  const productoTopId = Object.entries(conteo).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
  const productoTop = productoTopId ? (productosMap[productoTopId] || productoTopId) : "-";

  // ⚡️ spans están fuera del shadow DOM
  this.shadowRoot.getElementById("ventasHoy").textContent = ventas.length;
  this.shadowRoot.getElementById("totalFacturado").textContent = totalFacturado.toFixed(2);
  this.shadowRoot.getElementById("margenPromedio").textContent = margenPromedio + "%";
  this.shadowRoot.getElementById("productoTop").textContent = productoTop;
}


async addVenta(nuevaVenta) {
  try {
    const venta = await createSale(nuevaVenta);
    console.log("Venta creada:", venta);
    this.loadVentas(); // recargar lista
  } catch (err) {
    console.error("Error al crear venta:", err);
  }
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

    // guardar venta
    formVenta.addEventListener("submit", async (e) => {
      e.preventDefault();

      const productId = ventaProducto.value;
      const cantidad = parseInt(ventaCantidad.value);
      const precioVenta = parseFloat(ventaPrecio.value);

      await this.addVenta({ productId, cantidad, precioVenta });

      modalVenta.style.display = "none";
    });
  }
}

customElements.define("ventas-panel", VentasPanel);
