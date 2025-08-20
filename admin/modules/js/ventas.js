// ventas.js

import { getSales, createSale, getProducts } from "../../../api.js";

class VentasPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }); // shadow DOM encapsulado
  }

  connectedCallback() {
    this.render();
    this.loadVentas();
    this.setupEventListeners(); // <-- inicializamos eventos
  }

  render() {
    this.shadowRoot.innerHTML = `
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
          <!--Modal Venta-- >
      <div id="modalVenta" class="modal">
        <div class="modal-content">
          <span id="closeModalVenta" class="close">&times;</span>
          <h2>Registrar Venta</h2>
          <form id="formVenta">
            <label>Producto:</label>
            <select id="ventaProducto" required></select>

            <label>Cantidad:</label>
            <input type="number" id="ventaCantidad" required min="1">

              <label>Precio de venta unitario:</label>
              <input type="number" id="ventaPrecio" required step="0.01">

                <button type="submit" class="btn-primary">💾 Guardar</button>
              </form>
            </div>
        </div>
      </section>
    `;
  }

    async loadVentas() {
    try {
      const ventas = await getSales(); // 🚀 desde la API
      const tbody = this.shadowRoot.getElementById("tabla-ventas");

      ventas.forEach(v => {
        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${new Date(v.createdAt).toLocaleDateString()}</td>
        <td>${v.productId}</td>
        <td>${v.cantidad}</td>
        <td>$${v.precioVenta}</td>
        <td>$${v.precioCosto?.toFixed(2)}</td>
        <td>$${v.ganancia?.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
      });
    } catch (err) {
      console.error("Error cargando ventas:", err);
    }
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
  const modalVenta = this.shadowRoot.getElementById("modalVenta");
  const closeModalVenta = this.shadowRoot.getElementById("closeModalVenta");
  const formVenta = this.shadowRoot.getElementById("formVenta");
  const ventaProducto = this.shadowRoot.getElementById("ventaProducto");
  const ventaCantidad = this.shadowRoot.getElementById("ventaCantidad");
  const ventaPrecio = this.shadowRoot.getElementById("ventaPrecio");

  // Abrir modal
  btnNuevaVenta.addEventListener("click", async () => {
    const productos = await getProducts();
    ventaProducto.innerHTML = "";
    productos.forEach(p => {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.name;
      ventaProducto.appendChild(option);
    });
    modalVenta.style.display = "block";
  });

  // Cerrar modal
  closeModalVenta.addEventListener("click", () => {
    modalVenta.style.display = "none";
  });

  // Guardar venta
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
/*
  actualizarKPIs();

// KPIs
function actualizarKPIs() {
  const totalFacturado = ventasData.reduce((sum, v) => sum + v.precio * v.cantidad, 0);
  const totalGanancia = ventasData.reduce((sum, v) => sum + (v.precio - v.costo) * v.cantidad, 0);
  const margenPromedio = totalFacturado ? ((totalGanancia / totalFacturado) * 100).toFixed(1) : 0;

  const conteo = {};
  ventasData.forEach(v => { conteo[v.producto] = (conteo[v.producto] || 0) + v.cantidad });
  const productoTop = Object.entries(conteo).sort((a,b) => b[1]-a[1])[0]?.[0] || "-";

  document.getElementById("ventasHoy").textContent = ventasData.length;
  document.getElementById("totalFacturado").textContent = totalFacturado;
  document.getElementById("margenPromedio").textContent = margenPromedio + "%";
  document.getElementById("productoTop").textContent = productoTop;
}
*/