class EntregasPanel extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.entregas = [];
  }

  connectedCallback() {
    this.render();
    this.loadEntregas();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/admin/modules/css/entregas.css">

      <section>

        <h2>📅 Entregas</h2>

        <div id="entregas-container"></div>

        <button id="btnNuevaEntrega" class="btn-fab">
          ➕ Nueva entrega
        </button>

      </section>
    `;
  }

  /* =========================
     CARGA DE DATOS
  ========================= */

  loadEntregas() {

    const data =
      localStorage.getItem("entregas");

    this.entregas =
      data ? JSON.parse(data) : [];

    this.renderEntregas();
  }

  saveEntregas() {

    localStorage.setItem(
      "entregas",
      JSON.stringify(this.entregas)
    );

  }

  /* =========================
     LOGICA
  ========================= */

  esCompleta(e) {

    return (
      e.contacto &&
      e.lugares &&
      e.fecha &&
      e.hora &&
      e.productos &&
      e.canal
    );

  }

  /* =========================
     RENDER
  ========================= */

  renderEntregas() {

    const container =
      this.shadowRoot.getElementById(
        "entregas-container"
      );

    container.innerHTML = "";

    const completas = [];
    const pendientes = [];

    this.entregas.forEach(e => {

      this.esCompleta(e)
        ? completas.push(e)
        : pendientes.push(e);

    });

    // 🟢 ordenar completas por fecha
    completas.sort((a, b) => {

      return new Date(
        a.fecha + " " + a.hora
      ) - new Date(
        b.fecha + " " + b.hora
      );

    });

    // pendientes primero
    [...pendientes, ...completas]
      .forEach(e => {

        const card =
          document.createElement("div");

        const completa =
          this.esCompleta(e);

        card.className =
          "entrega-card " +
          (completa ? "ok" : "pending");

        card.innerHTML = `
          <div class="header">
            👤 ${e.contacto || "Sin contacto"}
          </div>

          <div class="body">

            <div>
              📍 ${e.lugares || "-"}
            </div>

            <div>
              📅 ${e.fecha || e.fechaTexto || "-"}
            </div>

            <div>
              ⏰ ${e.hora || e.horaTexto || "-"}
            </div>

            <div>
              📦 ${e.productos || "-"}
            </div>

            <div>
              💬 ${e.canal || "-"}
            </div>

          </div>

          <div class="actions">

            <button class="edit">
              ✏️
            </button>

            <button class="delete">
              🗑️
            </button>

          </div>
        `;

        container.appendChild(card);

      });

  }

  /* =========================
     EVENTOS
  ========================= */

  setupEventListeners() {

    this.shadowRoot
      .getElementById("btnNuevaEntrega")
      .addEventListener("click", () => {

        document
          .getElementById("modalEntrega")
          .style.display = "flex";

      });

  }

}

customElements.define(
  "entregas-panel",
  EntregasPanel
);