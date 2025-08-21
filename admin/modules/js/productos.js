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
        section {
          padding: 1rem;
          font-family: sans-serif;
        }
        h2 { margin-bottom: 1rem; }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 0.5rem;
          text-align: left;
        }
        button.action {
          margin: 0 2px;
          padding: 0.2rem 0.5rem;
          font-size: 0.9rem;
        }
      </style>
      <section>
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
          <tbody id="tabla-productos">
            <!-- filas dinámicas -->
          </tbody>
        </table>
      </section>
    `;
  }

  async loadProductos() {
          showLoader("Cargando productos... 🐥");
    try {
      const productos = await getProducts();
      const tbody = this.shadowRoot.getElementById("tabla-productos");
      tbody.innerHTML = "";

      productos.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${p.name}</td>
          <td>$${p.price}</td>
          <td>${p.stock}</td>
          <td>${p.category}</td>
          <td>
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

    // Form nuevo producto
    document.getElementById("formNuevoProducto").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nuevo = {
        name: e.target.nombre.value,
        price: parseFloat(e.target.precio.value),
        stock: parseInt(e.target.stock.value),
        category: e.target.categoria.value
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
        price: parseFloat(e.target.precio.value),
        stock: parseInt(e.target.stock.value),
        category: e.target.categoria.value
      };
      await updateProduct(id, actualizado);
      this.loadProductos();
      document.getElementById("modalEditarProducto").style.display = "none";
    });

    // Form agregar lote
    document.getElementById("formLote").addEventListener("submit", async (e) => {
      e.preventDefault();
      const productId = e.target.loteProductoId.value;
      const cantidad = parseInt(e.target.cantidad.value);
      const fecha = e.target.fecha.value;
      await addLote(productId, { cantidad, fecha });
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

    // Lotes del producto
    const lotesDiv = document.getElementById("editarLotes");
    lotesDiv.innerHTML = "";
    producto.lotes?.forEach(l => {
      const loteEl = document.createElement("div");
      loteEl.textContent = `Lote ${l.id} - Cantidad: ${l.cantidad} - Fecha: ${l.fecha}`;
      const btnDel = document.createElement("button");
      btnDel.textContent = "❌";
      btnDel.addEventListener("click", async () => {
        await deleteLote(producto.id, l.id);
        this.fillEditarProductoModal(await getProductById(producto.id));
        this.loadProductos();
      });
      loteEl.appendChild(btnDel);
      lotesDiv.appendChild(loteEl);
    });
  }
}

customElements.define("productos-panel", ProductosPanel);
