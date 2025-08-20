// Datos de prueba (luego lo cambiamos por fetch a la API)
const ventasData = [
  { fecha: "2025-08-01", producto: "Producto A", cantidad: 5, precio: 100, costo: 60 },
  { fecha: "2025-08-02", producto: "Producto B", cantidad: 3, precio: 200, costo: 120 },
  { fecha: "2025-08-03", producto: "Producto A", cantidad: 2, precio: 100, costo: 60 },
  { fecha: "2025-08-03", producto: "Producto C", cantidad: 1, precio: 500, costo: 300 },
];

// Renderizar tabla
function renderTablaVentas() {
  const tbody = document.querySelector("#tablaVentas tbody");
  tbody.innerHTML = "";
  ventasData.forEach(v => {
    const tr = document.createElement("tr");
    const ganancia = (v.precio - v.costo) * v.cantidad;
    tr.innerHTML = `
      <td>${v.fecha}</td>
      <td>${v.producto}</td>
      <td>${v.cantidad}</td>
      <td>$${v.precio}</td>
      <td>$${v.costo}</td>
      <td>$${ganancia}</td>
    `;
    tbody.appendChild(tr);
  });
}

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

// Gráfico
function renderGrafico() {
  const ctx = document.getElementById('graficoVentas').getContext('2d');
  const ventasPorDia = {};

  ventasData.forEach(v => {
    ventasPorDia[v.fecha] = (ventasPorDia[v.fecha] || 0) + v.precio * v.cantidad;
  });

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: Object.keys(ventasPorDia),
      datasets: [{
        label: 'Ventas ($)',
        data: Object.values(ventasPorDia),
        borderColor: '#4cafef',
        backgroundColor: 'rgba(76,175,239,0.2)',
        fill: true,
        tension: 0.3
      }]
    }
  });
}

// Inicializar cuando se abra la vista de ventas
function initVentas() {
  renderTablaVentas();
  actualizarKPIs();
  renderGrafico();
}
