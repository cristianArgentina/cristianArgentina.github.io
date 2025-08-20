// ventas.js

class VentasPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }); // shadow DOM encapsulado
  }

  connectedCallback() {
    this.render();
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
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Costo</th>
              <th>Ganancia/th>
            </tr>
          </thead>
          <tbody id="tabla-ventas">
            <!-- filas dinámicas -->
          </tbody>
        </table>
      </section>
    `;

    this.loadVentas();
  }

  loadVentas() {
    // 🚀 simulo datos (después lo conectás a tu API o store.js)
    const ventas = [
  { fecha: "2025-08-01", producto: "Producto A", cantidad: 5, precio: 100, costo: 60 },
  { fecha: "2025-08-02", producto: "Producto B", cantidad: 3, precio: 200, costo: 120 },
    ];

    const tbody = this.shadowRoot.getElementById("tabla-ventas");
    ventas.forEach(v => {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td>${v.fecha}</td>
      <td>${v.producto}</td>
      <td>${v.cantidad}</td>
      <td>$${v.precio}</td>
      <td>$${v.costo}</td>
      <td>$${(v.precio - v.costo) * v.cantidad}</td>
      `;
      tbody.appendChild(row);
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