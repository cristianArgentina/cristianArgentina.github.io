
function renderAdminLayout() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <nav>
      <button id="btn-ventas">Ventas</button>
      <button id="btn-productos">Productos</button>
    </nav>
    <section id="panel"></section>
  `;
  // ahora asignás los eventos desde JS
  document.getElementById("btn-ventas").addEventListener("click", () => showModule("ventas"));
  document.getElementById("btn-productos").addEventListener("click", () => showModule("productos"));
}

function showModule(name) {
  const panel = document.getElementById("panel");
  panel.innerHTML = ""; // limpiar contenido previo

  switch (name) {
    case "ventas":
      import("./modules/js/ventas.js").then(() => {
        panel.appendChild(document.createElement("ventas-panel"));
      });
      break;
    case "productos":
      import("./modules/js/productos.js").then(() => {
        panel.appendChild(document.createElement("productos-panel"));
      });
      break;
  }
}
// Evento global de login exitoso
document.addEventListener("loginSuccess", () => {
  const content = document.getElementById("content");
  content.innerHTML = ""; // limpiar login
  renderAdminLayout();
});
