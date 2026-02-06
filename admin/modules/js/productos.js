import {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct, addLote, deleteLote
} from "../../../api.js";
import { showLoader, hideLoader } from "./loaderadmin.js";

class ProductosPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.productos = [];
    this.sortKey = null;
    this.sortDir = 1; // 1 asc | -1 desc
    this.filters = {
      search: "",
      category: "",
      stockMin: 0
    };
  }

  debounce(func, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  }

connectedCallback() {
  this.render();
  this.setupEventListeners(); // primero DOM listo
  this.loadProductos();       // después datos
}

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      * {
        box-sizing: border-box;
      }

      h2 {
        font-size: 1.3rem;
        margin-bottom: 1rem;
        font-family: sans-serif;
      }

      button {
        cursor: pointer;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-family: sans-serif;
        font-size: 0.9rem;
      }

      th, td {
        border: 1px solid #ccc;
        padding: 0.6rem;
        text-align: left;
      }

      th {
        background: #353535;
      }

      .btn-primary {
        background: #0078d4;
        color: #fff;
        border: none;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 0.9rem;
        margin-bottom: 1rem;
      }
      .btn-primary:hover {
        background: #005fa3;
      }

      /* --- Responsive --- */
      @media (max-width: 768px) {
        table, thead, tbody, th, td, tr {
          display: block;
        }

        thead tr {
          display: none; /* Ocultamos cabecera */
        }

        tr {
          margin-bottom: 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 0.5rem;
          background: #2a2a2a;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        td {
          border: none;
          padding: 0.5rem;              
          position: relative;
          text-align: right;
        }

        td::before {
          content: attr(data-label);
          position: absolute;
          left: 0;
          width: 50%;
          font-weight: bold;
          text-align: left;
        }

        td:last-child {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
        }

        .action {
          padding: 6px;
          font-size: 1rem;
          border: none;
          background: none;
          cursor: pointer;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
      }
    </style>

    <h2>📦 Productos</h2>
<div class="toolbar">
  <button id="btnNuevo" class="btn-primary">➕ Agregar nuevo producto</button>
  <button id="btnExportar" class="btn-primary">⬇️ Exportar JSON</button>

  <input id="searchInput" placeholder="Buscar nombre..." />

  <select id="filterCategoria">
    <option value="">Todas categorías</option>
  </select>

  <input id="filterStock" type="number" min="0" placeholder="Stock mín" style="width:90px">
</div>

<table>
  <thead>
    <tr>
      <th data-sort="name">Nombre ⬍</th>
      <th data-sort="price">Precio ⬍</th>
      <th data-sort="stock">Stock ⬍</th>
      <th data-sort="category">Categoría ⬍</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody id="tabla-productos"></tbody>
    </table>
  `;
  }

async loadProductos() {
  showLoader("Cargando productos... 🐥");

  try {
    this.productos = await getProducts();
    this.renderCategorias();
    this.renderTabla();
  } finally {
    hideLoader();
  }
}

  renderCategorias() {
  const select = this.shadowRoot.getElementById("filterCategoria");

  const cats = [...new Set(this.productos.map(p => p.category))]
    .sort((a, b) => a.localeCompare(b));

  select.innerHTML =
    `<option value="">Todas categorías</option>` +
    cats.map(c => `<option value="${c}">${c}</option>`).join("");
}

  renderTabla() {
  const tbody = this.shadowRoot.getElementById("tabla-productos");
  tbody.innerHTML = "";

  let data = [...this.productos];

  /* -------- FILTROS -------- */
  if (this.filters.search) {
    data = data.filter(p =>
      p.name.toLowerCase().includes(this.filters.search)
    );
  }

  if (this.filters.category) {
    data = data.filter(p => p.category === this.filters.category);
  }

  if (this.filters.stockMin) {
    data = data.filter(p => p.stock >= this.filters.stockMin);
  }

  /* -------- ORDEN -------- */
  if (this.sortKey) {
    data.sort((a, b) => {
      let v1 = a[this.sortKey];
      let v2 = b[this.sortKey];

      if (typeof v1 === "string")
        return v1.localeCompare(v2) * this.sortDir;

      return (v1 - v2) * this.sortDir;
    });
  }

  /* -------- RENDER -------- */
  data.forEach(p => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td data-label="Nombre">${p.name}</td>
      <td data-label="Precio">$${p.price.toFixed(2)}</td>
      <td data-label="Stock">${p.stock}</td>
      <td data-label="Categoría">${p.category}</td>
      <td data-label="Acciones">
        <button class="action btnEditar" data-id="${p.id}">✏️</button>
        <button class="action btnEliminar" data-id="${p.id}">🗑️</button>
        <button class="action btnLote" data-id="${p.id}">➕ Lote</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

  
  setupEventListeners() {

   this.shadowRoot.querySelectorAll("th[data-sort]").forEach(th => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;

    if (this.sortKey === key) {
      this.sortDir *= -1;
    } else {
      this.sortKey = key;
      this.sortDir = 1;
    }

    this.renderTabla();
  });
});

    const searchInput = this.shadowRoot.getElementById("searchInput");
const filterCategoria = this.shadowRoot.getElementById("filterCategoria");
const filterStock = this.shadowRoot.getElementById("filterStock");

searchInput.addEventListener(
  "input",
  this.debounce(e => {
    this.filters.search = e.target.value.toLowerCase();
    this.renderTabla();
  }, 300)
);

filterCategoria.addEventListener("change", e => {
  this.filters.category = e.target.value;
  this.renderTabla();
});

filterStock.addEventListener("input", e => {
  this.filters.stockMin = Number(e.target.value) || 0;
  this.renderTabla();
});

    const btnNuevo = this.shadowRoot.getElementById("btnNuevo");

    // Abrir modal agregar producto
    btnNuevo.addEventListener("click", () => {
      document.getElementById("modalNuevoProducto").style.display = "flex";
    });

    const btnExportar = this.shadowRoot.getElementById("btnExportar");

    btnExportar.addEventListener("click", () => {
      this.exportarJSON();
    });

    // Delegación de eventos en tabla
    this.shadowRoot.getElementById("tabla-productos").addEventListener("click", async (e) => {
      if (e.target.classList.contains("btnEditar")) {
        const id = e.target.dataset.id;
        const producto = await getProductById(id);
        this.fillEditarProductoModal(producto);
        document.getElementById("modalEditarProducto").style.display = "flex";
      }
      if (e.target.classList.contains("btnEliminar")) {
        const id = e.target.dataset.id;
        if (confirm("¿Seguro que deseas eliminar este producto?")) {
          await deleteProduct(id);
          this.loadProductos();
        }
      }
      if (e.target.classList.contains("btnLote")) {
        const id = e.target.dataset.id;
        document.getElementById("loteProductoId").value = id;
        document.getElementById("modalLote").style.display = "flex";
      }
    });

    // Modal cerrar genérico
    document.querySelectorAll(".modal .close").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.closest(".modal").style.display = "none";
      });
    });

    // Cerrar al hacer click fuera del contenido del modal
    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
      }
    });

    document.getElementById("formNuevoProducto").addEventListener("submit", this.handleNuevoProducto);
    document.getElementById("formEditarProducto").addEventListener("submit", this.handleEditarProducto);
    document.getElementById("formLote").addEventListener("submit", this.handleNuevoLote);

  }

  handleNuevoProducto = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;

    try {
      const nuevo = {
        name: form.nombre.value,
        description: form.descripcion.value,
        price: parseFloat(form.precio.value),
        stock: parseInt(form.stock.value),
        category: form.categoria.value,
        image: form.urlImage.value
      };

      await createProduct(nuevo);

      this.loadProductos();
      form.reset();
      document.getElementById("modalNuevoProducto").style.display = "none";

    } finally {
      btn.disabled = false;
    }
  };

  handleEditarProducto = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;

    try {
      const id = form.productoId.value;

      const actualizado = {
        name: form.nombre.value,
        description: form.descripcion.value,
        price: parseFloat(form.precio.value),
        stock: parseInt(form.stock.value),
        category: form.categoria.value,
        image: form.urlImage.value
      };

      await updateProduct(id, actualizado);

      this.loadProductos();
      document.getElementById("modalEditarProducto").style.display = "none";

    } finally {
      btn.disabled = false;
    }
  };

  handleNuevoLote = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;

    try {
      const productId = form.loteProductoId.value;
      const cantidad = parseInt(form.loteUnidades.value);
      const costoUnitario = parseFloat(form.loteCosto.value);
      const fecha = form.loteFecha.value;

      await addLote(productId, { cantidad, costoUnitario, fecha });

      this.loadProductos();
      document.getElementById("modalLote").style.display = "none";

    } finally {
      btn.disabled = false;
    }
  };

  async exportarJSON() {
    try {
      showLoader("Generando JSON... 📄");

      const productos = await getProducts();

      // Normalización defensiva
      const data = productos.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        category: p.category,
        price: Number(p.price),
        stock: Number(p.stock),
        image: p.image ?? null,
        videos: Array.isArray(p.videos) ? p.videos : [],
        lotes: Array.isArray(p.lotes) ? p.lotes : []
      }));

      const jsonContent = JSON.stringify(data, null, 2);

      const blob = new Blob([jsonContent], {
        type: "application/json;charset=utf-8;"
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `productos_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();

      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error exportando JSON:", err);
      alert("No se pudo exportar el archivo JSON");
    } finally {
      hideLoader();
    }
  }

  fillEditarProductoModal(producto) {
    const form = document.getElementById("formEditarProducto");
    form.productoId.value = producto.id;
    form.nombre.value = producto.name;
    form.precio.value = producto.price;
    form.stock.value = producto.stock;
    form.categoria.value = producto.category;
    form.descripcion.value = producto.description;
    form.urlImage.value = producto.image;

    // Tabla de lotes
    const lotesTbody = document.getElementById("editarLotes");
    lotesTbody.innerHTML = "";

    producto.lotes?.forEach(l => {
      const row = document.createElement("tr");

      row.innerHTML = `
      <td>${l.fechaIngreso ? new Date(l.fechaIngreso).toLocaleDateString() : "-"}</td>
      <td>${l.cantidad ?? "-"}</td>
      <td>$${l.costoUnitario != null ? l.costoUnitario.toFixed(2) : "-"}</td>
      <td><button class="btn-del">❌</button></td>
    `;

      const btnDel = row.querySelector(".btn-del");
      btnDel.addEventListener("click", async () => {
        if (confirm("¿Seguro que deseas eliminar este lote?")) {
          await deleteLote(producto.id, l._id);
          this.fillEditarProductoModal(await getProductById(producto.id));
          this.loadProductos();
        }
      });

      lotesTbody.appendChild(row);
    });
  }
}

customElements.define("productos-panel", ProductosPanel);
