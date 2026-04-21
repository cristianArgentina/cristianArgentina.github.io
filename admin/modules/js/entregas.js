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

  getHoyLocal() {

    const hoy = new Date();

    const year =
      hoy.getFullYear();

    const month =
      String(hoy.getMonth() + 1)
        .padStart(2, "0");

    const day =
      String(hoy.getDate())
        .padStart(2, "0");

    return `${year}-${month}-${day}`;

  }

  createSection(titulo, lista, tipo) {

    const section =
      document.createElement("div");

    section.className =
      "entrega-section";

    section.innerHTML = `
    <h3>${titulo}</h3>
    <div class="entregas-grid"></div>
  `;

    const grid =
      section.querySelector(
        ".entregas-grid"
      );

    const hoyStr =
      this.getHoyLocal();

    lista.forEach(e => {

      const card =
        document.createElement("div");

      const completa =
        this.esCompleta(e);

      let estadoClase = "";

      if (tipo === "inconclusas") {

        estadoClase = "inconclusa";

      } else {

        estadoClase =
          completa
            ? "ok"
            : "pending";

      }

      card.className =
        `entrega-card ${estadoClase}`;

      const fechaNormalizada =
        this.normalizarFecha(e.fecha);

      const esHoy =
        fechaNormalizada === hoyStr;

      const badgeHoy =
        esHoy
          ? `<span class="badge-hoy">HOY</span>`
          : "";

      card.innerHTML = `
      <div class="header">
        👤 ${e.contacto || "Sin contacto"}
        ${badgeHoy}
      </div>

      <div class="body">

        <div>
          📍 ${e.lugares || "-"}
        </div>

        <div>
          📅 ${e.fecha
          ? this.formatearFecha(e.fecha)
          : "-"
        }
        </div>

        <div>
          ⏰ ${e.hora
          ? new Date("1970-01-01T" + e.hora)
            .toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "-"
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

        <button
          class="delete"
          data-id="${e._id}">
          🗑️
        </button>

      </div>
    `;

      grid.appendChild(card);

    });

    return section;

  }

  normalizarFecha(fecha) {

    if (!fecha)
      return null;

    // si viene como Date
    if (fecha instanceof Date) {

      const year =
        fecha.getUTCFullYear();

      const month =
        String(fecha.getUTCMonth() + 1)
          .padStart(2, "0");

      const day =
        String(fecha.getUTCDate())
          .padStart(2, "0");

      return `${year}-${month}-${day}`;

    }

    // si viene como string ISO
    if (typeof fecha === "string") {

      return fecha.substring(0, 10);

    }

    return null;

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

    const hoyStr =
      this.getHoyLocal();

    const proximas = [];
    const inconclusas = [];

    this.entregas.forEach(e => {

      const fechaNormalizada =
        this.normalizarFecha(e.fecha);

      if (!fechaNormalizada) {

        proximas.push(e);

      } else if (fechaNormalizada >= hoyStr) {

        proximas.push(e);

      } else {

        inconclusas.push(e);

      }

    });

    /* ORDEN */

    // próximas → fecha creciente
    proximas.sort((a, b) => {

      const fa =
        new Date(`${a.fecha || "9999-12-31"}T${a.hora || "23:59"}`);

      const fb =
        new Date(`${b.fecha || "9999-12-31"}T${b.hora || "23:59"}`);

      return fa - fb;

    });

    // inconclusas → fecha decreciente
    inconclusas.sort((a, b) => {

      const fa =
        new Date(`${a.fecha || "1970-01-01"}T${a.hora || "00:00"}`);

      const fb =
        new Date(`${b.fecha || "1970-01-01"}T${b.hora || "00:00"}`);

      return fb - fa;

    });

    /* SECCIONES */

    container.appendChild(
      this.createSection(
        "📅 Próximas entregas",
        proximas,
        "proximas"
      )
    );

    container.appendChild(
      this.createSection(
        "🗂️ Inconclusas",
        inconclusas,
        "inconclusas"
      )
    );

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

    const fecha =
      this.normalizarFecha(fechaStr);

    if (!fecha)
      return "-";

    const [year, month, day] =
      fecha.split("-");

    return `${day}/${month}/${year}`;

  }
}

customElements.define(
  "entregas-panel",
  EntregasPanel
);
