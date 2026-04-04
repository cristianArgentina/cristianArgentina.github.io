
function renderAdminLayout() {
  const content = document.getElementById("content");

  content.innerHTML = `
  <header class="admin-header">
    <h1 class="admin-title">⚙️ Panel de administración</h1>

    <nav class="admin-nav">
      <button id="btn-ventas" class="nav-btn active">📊 Ventas</button>
      <button id="btn-productos" class="nav-btn">📦 Productos</button>
    </nav>
  </header>

  <section id="panel"></section>
`;
  // ahora asignás los eventos desde JS
  document.getElementById("btn-ventas").addEventListener("click", () => {
    setActiveButton("btn-ventas");
    showModule("ventas");
  });

  document.getElementById("btn-productos").addEventListener("click", () => {
    setActiveButton("btn-productos");
    showModule("productos");
  });
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

function setActiveButton(activeId) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  document.getElementById(activeId).classList.add("active");
}
