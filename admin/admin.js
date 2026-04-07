
function renderAdminLayout() {
  const content = document.getElementById("content");

  content.innerHTML = `
  <header class="admin-header">
    <h1>⚙️ Panel de administración</h1>

    <nav>
      <button id="btn-ventas">📊 Ventas</button>
      <button id="btn-productos">📦 Productos</button>
      <button id="btn-entregas">📅 Entregas</button>
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

  document.getElementById("btn-entregas").addEventListener("click", () => {
    setActiveButton("btn-entregas");
    showModule("entregas");
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
    case "entregas":
      import("./modules/js/entregas.js").then(() => {
        panel.appendChild(document.createElement("entregas-panel"));
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
