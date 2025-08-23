import {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct, addLote, deleteLote
} from "../../../api.js";
import { showLoader, hideLoader } from "./loaderadmin.js";

class ProductosPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.loadProductos();
    this.setupEventListeners();
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
        background: #f5f5f5;
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
          text-align:  left !important;;
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
      }
    </style>

    <h2>📦 Productos</h2>
    <button id="btnNuevo" class="btn-primary">➕ Agregar nuevo producto</button>
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Precio</th>
          <th>Stock</th>
          <th>Categoría</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="tabla-productos"></tbody>
    </table>
  `;
}

  async loadProductos() {
    const tbody = this.shadowRoot.getElementById("tabla-productos");
    tbody.innerHTML = "";
    showLoader("Cargando productos... 🐥");
    try {
      const productos = await getProducts();
      productos.forEach(p => {
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
    } catch (err) {
      console.error("Error cargando productos:", err);
    } finally {
      hideLoader();
    }
  }

  setupEventListeners() {
    const btnNuevo = this.shadowRoot.getElementById("btnNuevo");

    // Abrir modal agregar producto
    btnNuevo.addEventListener("click", () => {
      document.getElementById("modalNuevoProducto").style.display = "flex";
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

    // Form nuevo producto
    document.getElementById("formNuevoProducto").addEventListener("submit", async (e) => {
      e.preventDefault();
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
      e.target.reset();
      document.getElementById("modalNuevoProducto").style.display = "none";
    });

    // Form editar producto
    document.getElementById("formEditarProducto").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = e.target.productoId.value;
      const actualizado = {
        name: e.target.nombre.value,
        description: e.target.descripcion.value,
        price: parseFloat(e.target.precio.value),
        stock: parseInt(e.target.stock.value),
        category: e.target.categoria.value,
        image: e.target.urlImage.value
      };
      await updateProduct(id, actualizado);
      this.loadProductos();
      document.getElementById("modalEditarProducto").style.display = "none";
    });

    // Form agregar lote
    document.getElementById("formLote").addEventListener("submit", async (e) => {
      e.preventDefault();
      const productId = e.target.loteProductoId.value;
      const cantidad = parseInt(e.target.loteUnidades.value);
      const costoUnitario = parseFloat(e.target.loteCosto.value)
      const fecha = e.target.loteFecha.value;
      await addLote(productId, { cantidad, costoUnitario, fecha });
      this.loadProductos();
      document.getElementById("modalLote").style.display = "none";
    });
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
