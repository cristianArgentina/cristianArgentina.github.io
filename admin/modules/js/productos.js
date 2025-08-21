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
        table { width: 100%; border-collapse: collapse; font-family: sans-serif; }
        th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
        .btn-primary { background: #0078d4; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
        .btn-primary:hover { background: #005fa3; }
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
          <td>${p.name}</td>
          <td>$${p.price.toFixed(2)}</td>
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
        description: parseFloat(e.target.descripcion.value),
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

    // Lotes del producto
    const lotesDiv = document.getElementById("editarLotes");
    const fecha = l.fechaIngreso ?? "Sin fecha";
    const unidades = l.unidades ?? 0;
    const costo = l.costoUnitario != null ? `$${l.costoUnitario.toFixed(2)}` : "N/A";

    lotesDiv.innerHTML = "";
    producto.lotes?.forEach(l => {
      const loteEl = document.createElement("div");
      loteEl.textContent = `Lote ${l.id} - Cantidad: ${unidades} - Costo unitario: $${costo} - Fecha: ${fecha}`;
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
