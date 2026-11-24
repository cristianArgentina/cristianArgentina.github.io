import {
  getEntregas,
  createEntrega,
  updateEntrega,
  deleteEntrega
} from "../../../api.js";

// import de namespace: si la API no exporta la función de productos, no rompe el módulo
import * as api from "../../../api.js";

import {
  showLoader,
  hideLoader
} from "./loaderadmin.js";

/* =========================
   ESTACIONES (Línea Roca)
   Ramales: La Plata y Bosques, vía Quilmes y vía Temperley
========================= */

const TRONCAL_QUILMES = [
  "Plaza Constitución",
  "Darío Santillán y Maximiliano Kosteki",
  "Sarandí",
  "Villa Domínico",
  "Wilde",
  "Don Bosco",
  "Bernal",
  "Quilmes",
  "Ezpeleta",
  "Berazategui"
];

const RAMALES = {
  "LP": [
    ...TRONCAL_QUILMES,
    "Plátanos",
    "Hudson",
    "Pereyra",
    "Villa Elisa",
    "Gonnet",
    "City Bell",
    "Ringuelet",
    "Tolosa",
    "La Plata"
  ],
  "VQ": [
    ...TRONCAL_QUILMES,
    "Villa España",
    "Ranelagh",
    "Sourigues",
    "Bosques",
    "Gutiérrez"
  ],
  "VT": [
    "Gerli",
    "Lanús",
    "Remedios de Escalada",
    "Banfield",
    "Lomas de Zamora",
    "Temperley",
    "Mármol",
    "Rafael Calzada",
    "Claypole",
    "Ardigó",
    "Florencio Varela",
  ]
};

// nombre de estación -> ramales en los que aparece
const ESTACIONES = (() => {

  const mapa = new Map();

  Object.entries(RAMALES).forEach(([ramal, lista]) => {
    lista.forEach(nombre => {
      if (!mapa.has(nombre)) mapa.set(nombre, []);
      mapa.get(nombre).push(ramal);
    });
  });

  return mapa;

})();

const CANALES = [
  "WhatsApp",
  "Facebook",
  "Llamada",
];

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/* =========================
   HELPERS
========================= */

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const pad = (n) => String(n).padStart(2, "0");

const toISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

class EntregasPanel extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.entregas = [];
    this.lugaresSel = [];
    this.productosSel = [];
    this.catalogo = [];
    this.filtro = "";
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.loadEntregas();
    this.loadProductos();
  }

  /* =========================
     CATÁLOGO DE PRODUCTOS
  ========================= */

  async loadProductos() {

    // ajustá acá el nombre si tu api.js exporta otra función
    const fn = api.getProductos || api.getProducts;

    if (typeof fn !== "function") {
      console.warn("api.js no exporta getProductos: el campo queda como texto libre.");
      return;
    }

    try {

      const lista = await fn();

      this.catalogo = [...new Set(
        (lista || [])
          .map(p => typeof p === "string" ? p : (p.nombre || p.name || p.titulo))
          .filter(Boolean)
          .map(n => String(n).trim())
      )].sort((a, b) => a.localeCompare(b, "es"));

      const dl = this.shadowRoot.getElementById("listaProductos");

      if (dl) {
        dl.innerHTML = this.catalogo
          .map(n => `<option value="${esc(n)}"></option>`)
          .join("");
      }

    } catch (err) {
      console.error("Error cargando productos:", err);
    }
  }

  /* =========================
     RENDER BASE
  ========================= */

  render() {

    const options = [...ESTACIONES.entries()]
      .map(([nombre, ramales]) =>
        `<option value="${esc(nombre)}" label="${esc(ramales.join(" · "))}"></option>`
      )
      .join("");

    const canales = CANALES
      .map(c => `<option value="${esc(c)}">${esc(c)}</option>`)
      .join("");

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/admin/modules/css/entregas.css">

      <style>
        .toolbar { display:flex; gap:.5rem; margin:.5rem 0 1rem; }
        .toolbar input { flex:1; padding:.5rem .75rem; }

        .badge-hoy, .badge-manana {
          font-size:.7rem; font-weight:700; padding:.1rem .4rem;
          border-radius:.5rem; margin-left:.4rem; color:#fff;
        }
        .badge-hoy { background:#e53935; }
        .badge-manana { background:#fb8c00; }

        .vacio { opacity:.6; padding:.5rem 0; }

        .lugares { display:flex; flex-wrap:wrap; gap:.25rem; }
        .lugares span {
          background:#e8f0fe; border-radius:1rem;
          padding:.1rem .5rem; font-size:.85rem;
        }

        dialog#modalEntrega {
          border:none; border-radius:12px; padding:0;
          width:min(480px, 94vw);
          box-shadow:0 10px 40px rgba(0,0,0,.3);
        }
        dialog#modalEntrega::backdrop { background:rgba(0,0,0,.5); }

        #formEntrega { display:flex; flex-direction:column; gap:.75rem; padding:1.25rem; }
        #formEntrega label { display:flex; flex-direction:column; gap:.25rem; font-weight:600; font-size:.9rem; }
        #formEntrega input, #formEntrega select, #formEntrega textarea {
          padding:.55rem; font:inherit; border:1px solid #ccc; border-radius:8px;
        }
        .fila { display:flex; gap:.5rem; align-items:flex-end; }
        .fila > label { flex:1; }
        .atajos { display:flex; gap:.25rem; }
        .atajos button, .modal-actions button, .chip button {
          cursor:pointer; border:1px solid #ccc; background:#f5f5f5;
          border-radius:8px; padding:.45rem .7rem; font:inherit;
        }
        .chips { display:flex; flex-wrap:wrap; gap:.35rem; }
        .chip {
          display:inline-flex; align-items:center; gap:.25rem;
          background:#e8f0fe; border-radius:1rem; padding:.15rem .3rem .15rem .65rem;
          font-size:.85rem; font-weight:400;
        }
        .chip button { border:none; background:transparent; padding:0 .3rem; }
        .hint { font-weight:400; font-size:.75rem; opacity:.65; }
        .modal-actions { display:flex; justify-content:flex-end; gap:.5rem; margin-top:.25rem; }
        .modal-actions .primary { background:#1a73e8; color:#fff; border-color:#1a73e8; }
        .error-msg { color:#c62828; font-size:.85rem; min-height:1em; }
      </style>

      <section>

        <h2>📅 Entregas</h2>

        <div class="toolbar">
          <input
            id="buscador"
            type="search"
            placeholder="🔍 Buscar por contacto, lugar, producto..."
          >
        </div>

        <div id="entregas-container"></div>

        <button id="btnNuevaEntrega" class="btn-fab">
          ➕ Nueva entrega
        </button>

      </section>

      <dialog id="modalEntrega">
        <form id="formEntrega" method="dialog" novalidate>

          <h3 id="modalTitulo">Nueva entrega</h3>

          <input type="hidden" name="entregaId">

          <label>
            Contacto *
            <input name="contacto" required placeholder="Nombre o teléfono">
          </label>

          <label>
            Lugares de entrega
            <div class="chips" id="chipsLugares"></div>
            <input
              id="inputLugar"
              list="listaEstaciones"
              placeholder="Escribí una estación y elegí de la lista..."
              autocomplete="off"
            >
            <datalist id="listaEstaciones">${options}</datalist>
            <span class="hint">
              Enter para agregar. Podés sumar varias estaciones o escribir un lugar libre.
            </span>
          </label>

          <div class="fila">
            <label>
              Fecha *
              <input type="date" name="fecha" required>
            </label>
            <div class="atajos">
              <button type="button" data-dia="0">Hoy</button>
              <button type="button" data-dia="1">Mañana</button>
            </div>
          </div>

          <label>
            Hora
            <input type="time" name="hora" step="300">
          </label>

          <label>
            Productos
            <div class="chips" id="chipsProductos"></div>
            <input
              id="inputProducto"
              list="listaProductos"
              placeholder="Escribí el nombre de un producto..."
              autocomplete="off"
            >
            <datalist id="listaProductos"></datalist>
            <span class="hint">
              Enter para agregar. Podés sumar varios y aclarar cantidad, ej: "2 x Alfajor".
            </span>
          </label>

          <label>
            Canal
            <select name="canal">
              <option value="">— Elegir —</option>
              ${canales}
            </select>
          </label>

          <div class="error-msg" id="errorMsg"></div>

          <div class="modal-actions">
            <button type="button" class="close">Cancelar</button>
            <button type="submit" class="primary">Guardar</button>
          </div>

        </form>
      </dialog>
    `;
  }

  /* =========================
     CARGA DE DATOS
  ========================= */

  async loadEntregas() {

    showLoader("Cargando entregas... 📅");

    try {
      this.entregas = await getEntregas();
      this.renderEntregas();
    } catch (err) {
      console.error("Error cargando entregas:", err);
    } finally {
      hideLoader();
    }
  }

  async addEntrega(nuevaEntrega) {
    await createEntrega(nuevaEntrega);
    await this.loadEntregas();
  }

  async removeEntrega(id) {
    try {
      await deleteEntrega(id);
      await this.loadEntregas();
    } catch (err) {
      console.error("Error eliminando entrega:", err);
      alert("No se pudo eliminar la entrega.");
    }
  }

  async editEntrega(id, data) {
    await updateEntrega(id, data);
    await this.loadEntregas();
  }

  /* =========================
     LÓGICA
  ========================= */

  esCompleta(e) {
    return Boolean(
      e.contacto && e.lugares && e.fecha &&
      e.hora && e.productos && e.canal
    );
  }

  getHoyLocal() {
    return toISO(new Date());
  }

  addDias(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return toISO(d);
  }

  normalizarFecha(fecha) {

    if (!fecha) return null;

    if (fecha instanceof Date) {
      return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`;
    }

    if (typeof fecha === "string") {
      return fecha.substring(0, 10);
    }

    return null;
  }

  formatearFecha(fechaStr) {

    const fecha = this.normalizarFecha(fechaStr);
    if (!fecha) return "-";

    const [year, month, day] = fecha.split("-").map(Number);
    const dia = DIAS[new Date(year, month - 1, day).getDay()];

    return `${dia} ${pad(day)}/${pad(month)}/${year}`;
  }

  formatearHora(hora) {
    return hora ? String(hora).slice(0, 5) : "-";
  }

  parseLugares(str) {
    return String(str || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }

  coincideFiltro(e) {

    if (!this.filtro) return true;

    const texto = [e.contacto, e.lugares, e.productos, e.canal]
      .join(" ")
      .toLowerCase();

    return texto.includes(this.filtro);
  }

  /* =========================
     RENDER LISTADO
  ========================= */

  createSection(titulo, lista, tipo) {

    const section = document.createElement("div");
    section.className = "entrega-section";

    section.innerHTML = `
      <h3>${titulo} <small>(${lista.length})</small></h3>
      <div class="entregas-grid"></div>
    `;

    const grid = section.querySelector(".entregas-grid");

    if (!lista.length) {
      grid.innerHTML = `<div class="vacio">Sin entregas.</div>`;
      return section;
    }

    const hoyStr = this.getHoyLocal();
    const mananaStr = this.addDias(1);

    lista.forEach(e => {

      const card = document.createElement("div");

      const estadoClase =
        tipo === "inconclusas"
          ? "inconclusa"
          : this.esCompleta(e) ? "ok" : "pending";

      card.className = `entrega-card ${estadoClase}`;

      const fecha = this.normalizarFecha(e.fecha);

      const badge =
        fecha === hoyStr
          ? `<span class="badge-hoy">HOY</span>`
          : fecha === mananaStr
            ? `<span class="badge-manana">MAÑANA</span>`
            : "";

      const lugares = this.parseLugares(e.lugares);

      const lugaresHtml = lugares.length
        ? `<div class="lugares">${lugares.map(l => `<span>${esc(l)}</span>`).join("")}</div>`
        : "-";

      card.innerHTML = `
        <div class="header">
          👤 ${esc(e.contacto) || "Sin contacto"}
          ${badge}
        </div>

        <div class="body">
          <div>📍 ${lugaresHtml}</div>
          <div>📅 ${esc(this.formatearFecha(e.fecha))}</div>
          <div>⏰ ${esc(this.formatearHora(e.hora))}</div>
          <div>📦 ${esc(e.productos) || "-"}</div>
          <div>💬 ${esc(e.canal) || "-"}</div>
        </div>

        <div class="actions">
          <button class="edit" data-id="${esc(e._id)}" title="Editar">✏️</button>
          <button class="delete" data-id="${esc(e._id)}" title="Eliminar">🗑️</button>
        </div>
      `;

      grid.appendChild(card);
    });

    return section;
  }

  renderEntregas() {

    const container =
      this.shadowRoot.getElementById("entregas-container");

    container.innerHTML = "";

    const hoyStr = this.getHoyLocal();

    const proximas = [];
    const inconclusas = [];

    this.entregas
      .filter(e => this.coincideFiltro(e))
      .forEach(e => {

        const fecha = this.normalizarFecha(e.fecha);

        if (!fecha || fecha >= hoyStr) {
          proximas.push(e);
        } else {
          inconclusas.push(e);
        }
      });

    const clave = (e, fFecha, fHora) =>
      `${this.normalizarFecha(e.fecha) || fFecha}T${this.formatearHora(e.hora) === "-" ? fHora : this.formatearHora(e.hora)}`;

    // próximas → fecha creciente
    proximas.sort((a, b) =>
      clave(a, "9999-12-31", "23:59").localeCompare(clave(b, "9999-12-31", "23:59"))
    );

    // inconclusas → fecha decreciente
    inconclusas.sort((a, b) =>
      clave(b, "1970-01-01", "00:00").localeCompare(clave(a, "1970-01-01", "00:00"))
    );

    container.appendChild(
      this.createSection("🚚 Próximas entregas", proximas, "proximas")
    );

    container.appendChild(
      this.createSection("🗂️ Inconclusas", inconclusas, "inconclusas")
    );
  }

  /* =========================
     LUGARES (chips)
  ========================= */

  renderChips() {

    const cont = this.shadowRoot.getElementById("chipsLugares");

    cont.innerHTML = this.lugaresSel
      .map((l, i) => `
        <span class="chip">
          ${esc(l)}
          <button type="button" data-i="${i}" aria-label="Quitar ${esc(l)}">✕</button>
        </span>
      `)
      .join("");
  }

  agregarLugar(valor) {

    const v = String(valor || "").trim().replace(/,/g, " ");

    if (!v) return;

    if (!this.lugaresSel.some(l => l.toLowerCase() === v.toLowerCase())) {
      this.lugaresSel.push(v);
      this.renderChips();
    }
  }

  /* =========================
     PRODUCTOS (chips)
  ========================= */

  renderChipsProductos() {

    this.shadowRoot.getElementById("chipsProductos").innerHTML =
      this.productosSel
        .map((p, i) => `
          <span class="chip">
            ${esc(p)}
            <button type="button" data-p="${i}" aria-label="Quitar ${esc(p)}">✕</button>
          </span>
        `)
        .join("");
  }

  agregarProducto(valor) {

    const v = String(valor || "").trim().replace(/,/g, " ");

    if (!v) return;

    if (!this.productosSel.some(p => p.toLowerCase() === v.toLowerCase())) {
      this.productosSel.push(v);
      this.renderChipsProductos();
    }
  }

  /* =========================
     MODAL
  ========================= */

  abrirModal(entrega = null) {

    const root = this.shadowRoot;
    const form = root.getElementById("formEntrega");

    form.reset();
    root.getElementById("errorMsg").textContent = "";

    if (entrega) {

      root.getElementById("modalTitulo").textContent = "Editar entrega";

      form.entregaId.value = entrega._id;
      form.contacto.value = entrega.contacto || "";
      form.fecha.value = this.normalizarFecha(entrega.fecha) || "";
      form.hora.value = entrega.hora ? String(entrega.hora).slice(0, 5) : "";
      this.productosSel = this.parseLugares(entrega.productos);

      // si el canal guardado no está en la lista, se agrega para no perderlo
      if (entrega.canal && !CANALES.includes(entrega.canal)) {
        const opt = document.createElement("option");
        opt.value = opt.textContent = entrega.canal;
        form.canal.appendChild(opt);
      }
      form.canal.value = entrega.canal || "";

      this.lugaresSel = this.parseLugares(entrega.lugares);

    } else {

      root.getElementById("modalTitulo").textContent = "Nueva entrega";
      form.entregaId.value = "";
      this.lugaresSel = [];
      this.productosSel = [];
    }

    root.getElementById("inputLugar").value = "";
    root.getElementById("inputProducto").value = "";
    this.renderChips();
    this.renderChipsProductos();

    root.getElementById("modalEntrega").showModal();
  }

  cerrarModal() {
    this.shadowRoot.getElementById("modalEntrega").close();
  }

  /* =========================
     EVENTOS
  ========================= */

  setupEventListeners() {

    const root = this.shadowRoot;
    const modal = root.getElementById("modalEntrega");
    const form = root.getElementById("formEntrega");
    const inputLugar = root.getElementById("inputLugar");

    // buscador
    root.getElementById("buscador").addEventListener("input", (ev) => {
      this.filtro = ev.target.value.trim().toLowerCase();
      this.renderEntregas();
    });

    // editar / eliminar
    root.getElementById("entregas-container")
      .addEventListener("click", async (ev) => {

        const btnDelete = ev.target.closest(".delete");

        if (btnDelete) {
          if (!confirm("¿Eliminar esta entrega?")) return;
          await this.removeEntrega(btnDelete.dataset.id);
          return;
        }

        const btnEdit = ev.target.closest(".edit");

        if (btnEdit) {
          const entrega = this.entregas.find(x => x._id === btnEdit.dataset.id);
          if (entrega) this.abrirModal(entrega);
        }
      });

    // nueva entrega
    root.getElementById("btnNuevaEntrega")
      .addEventListener("click", () => this.abrirModal());

    // cerrar
    modal.querySelector(".close")
      .addEventListener("click", () => this.cerrarModal());

    // click en el fondo oscuro
    modal.addEventListener("click", (ev) => {
      if (ev.target === modal) this.cerrarModal();
    });

    // atajos de fecha: hoy / mañana
    modal.querySelectorAll("[data-dia]").forEach(btn => {
      btn.addEventListener("click", () => {
        form.fecha.value = this.addDias(Number(btn.dataset.dia));
      });
    });

    // lugares: agregar con Enter o al elegir de la lista
    inputLugar.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        this.agregarLugar(inputLugar.value);
        inputLugar.value = "";
      }
    });

    inputLugar.addEventListener("change", () => {
      this.agregarLugar(inputLugar.value);
      inputLugar.value = "";
    });

    // quitar chip
    root.getElementById("chipsLugares").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-i]");
      if (!btn) return;
      this.lugaresSel.splice(Number(btn.dataset.i), 1);
      this.renderChips();
    });

    // productos: agregar con Enter o al elegir de la lista
    const inputProducto = root.getElementById("inputProducto");

    inputProducto.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        this.agregarProducto(inputProducto.value);
        inputProducto.value = "";
      }
    });

    inputProducto.addEventListener("change", () => {
      this.agregarProducto(inputProducto.value);
      inputProducto.value = "";
    });

    root.getElementById("chipsProductos").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-p]");
      if (!btn) return;
      this.productosSel.splice(Number(btn.dataset.p), 1);
      this.renderChipsProductos();
    });

    form.addEventListener("submit", this.handleNuevaEntrega);
  }

  handleNuevaEntrega = async (ev) => {

    ev.preventDefault();

    const root = this.shadowRoot;
    const form = ev.target;
    const errorMsg = root.getElementById("errorMsg");

    // por si quedó un lugar escrito sin confirmar
    const inputLugar = root.getElementById("inputLugar");
    this.agregarLugar(inputLugar.value);
    inputLugar.value = "";

    const inputProducto = root.getElementById("inputProducto");
    this.agregarProducto(inputProducto.value);
    inputProducto.value = "";

    if (!form.contacto.value.trim() || !form.fecha.value) {
      errorMsg.textContent = "Completá al menos contacto y fecha.";
      return;
    }

    const id = form.entregaId.value || null;

    const data = {
      contacto: form.contacto.value.trim(),
      lugares: this.lugaresSel.join(", "),
      fecha: form.fecha.value || null,
      hora: form.hora.value || null,
      productos: this.productosSel.join(", "),
      canal: form.canal.value || ""
    };

    try {

      if (id) {
        await this.editEntrega(id, data);
      } else {
        await this.addEntrega(data);
      }

      this.cerrarModal();

    } catch (err) {
      console.error("Error guardando entrega:", err);
      errorMsg.textContent = "No se pudo guardar. Probá de nuevo.";
    }
  };
}

customElements.define("entregas-panel", EntregasPanel);
