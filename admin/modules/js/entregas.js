import {
  getEntregas,
  createEntrega,
  updateEntrega,
  deleteEntrega
} from "../../../api.js";

import {
  showLoader,
  hideLoader
} from "./loaderadmin.js";

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

  async loadEntregas() {

    showLoader("Cargando entregas... 📅");

    try {
      this.entregas =
        await getEntregas();

      this.renderEntregas();

    } catch (err) {
      console.error(
        "Error cargando entregas:",
        err
      );

    } finally {
      hideLoader();
    }
  }

  async addEntrega(nuevaEntrega) {

    try {

      await createEntrega(
        nuevaEntrega
      );

      await this.loadEntregas();

    } catch (err) {

      console.error(
        "Error creando entrega:",
        err
      );

    }

  }

  async removeEntrega(id) {

    try {

      await deleteEntrega(id);

      await this.loadEntregas();

    } catch (err) {

      console.error(
        "Error eliminando entrega:",
        err
      );

    }

  }

  async editEntrega(id, data) {

    try {

      await updateEntrega(
        id,
        data
      );

      await this.loadEntregas();

    } catch (err) {

      console.error(
        "Error actualizando entrega:",
        err
      );

    }

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

      const fechaA =
        new Date(
          `${a.fecha || "9999-12-31"}T${a.hora || "23:59"}`
        );

      const fechaB =
        new Date(
          `${b.fecha || "9999-12-31"}T${b.hora || "23:59"}`
        );

      return fechaA - fechaB;

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
              📅 ${e.fecha
            ? this.formatearFecha(e.fecha)
            : (e.fechaTexto || "-")
          }
            </div>

            <div>
              ⏰ ${e.hora
            ? new Date("1970-01-01T" + e.hora)
              .toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit"
              })
            : (e.horaTexto || "-")
          }
            </div>

            <div>
              📦 ${e.productos || "-"}
            </div>

            <div>
              💬 ${e.canal || "-"}
            </div>

          </div>

          <div class="actions">

            <button
            class="edit"
            data-id="${e._id}">
            ✏️
            </button>

            <button class="delete"
            data-id="${e._id}">
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

    const formEntrega =
      document.getElementById("formEntrega");

    formEntrega.addEventListener(
      "submit",
      this.handleNuevaEntrega
    );

    this.shadowRoot
      .getElementById("entregas-container")
      .addEventListener("click",
        async (e) => {

          /* 🗑️ DELETE */

          const btnDelete =
            e.target.closest(".delete");

          if (btnDelete) {

            const id =
              btnDelete.dataset.id;

            const confirmDelete =
              confirm(
                "¿Eliminar esta entrega?"
              );

            if (!confirmDelete)
              return;

            await this.removeEntrega(id);

            return;
          }


          /* ✏️ EDIT */

          const btnEdit =
            e.target.closest(".edit");

          if (btnEdit) {

            const id =
              btnEdit.dataset.id;

            const entrega =
              this.entregas.find(
                e => e._id === id
              );

            if (!entrega)
              return;

            this.fillEntregaModal(
              entrega
            );

            document
              .getElementById("modalEntrega")
              .style.display = "flex";

          }

        });

    this.shadowRoot
      .getElementById("btnNuevaEntrega")
      .addEventListener("click", () => {

        const form =
          document.getElementById("formEntrega");

        form.reset();

        form.entregaId.value = "";

        document
          .getElementById("modalEntrega")
          .style.display = "flex";


      });

    /* ❌ CERRAR MODAL */

    document
      .querySelectorAll("#modalEntrega .close")
      .forEach(btn => {

        btn.addEventListener("click", () => {

          document
            .getElementById("modalEntrega")
            .style.display = "none";

        });

      });

    /* Cerrar haciendo click fuera */

    window.addEventListener("click", (e) => {

      const modal =
        document.getElementById("modalEntrega");

      if (e.target === modal) {

        modal.style.display = "none";

      }

    });
  }
  handleNuevaEntrega = async (e) => {

    e.preventDefault();

    const form = e.target;

    const id =
      form.entregaId?.value || null;

    const nuevaEntrega = {

      contacto:
        form.contacto?.value || "",

      lugares:
        form.lugares?.value || "",

      // ahora usamos los campos reales
      fecha:
        form.fecha?.value || null,

      hora:
        form.hora?.value || null,

      productos:
        form.productos?.value || "",

      canal:
        form.canal?.value || ""

    };

    try {

      if (id) {

        await this.editEntrega(
          id,
          nuevaEntrega
        );

      } else {

        await this.addEntrega(
          nuevaEntrega
        );

      }

      form.reset();

      form.entregaId.value = "";

      document
        .getElementById("modalEntrega")
        .style.display = "none";

    } catch (err) {

      console.error(
        "Error creando entrega:",
        err
      );

    }

  };

  fillEntregaModal(entrega) {

    const form =
      document.getElementById("formEntrega");

    form.entregaId.value =
      entrega._id;

    form.contacto.value =
      entrega.contacto || "";

    form.lugares.value =
      entrega.lugares || "";

    form.fecha.value =
      entrega.fecha
        ? entrega.fecha.substring(0, 10)
        : "";

    form.hora.value =
      entrega.hora || "";

    form.productos.value =
      entrega.productos || "";

    form.canal.value =
      entrega.canal || "";

  }

  formatearFecha(fechaStr) {

    if (!fechaStr)
      return "-";

    const [year, month, day] =
      fechaStr.split("-");

    return `${day}/${month}/${year}`;
  }
}

customElements.define(
  "entregas-panel",
  EntregasPanel
);
