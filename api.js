import { API_URL } from "./config.js";

/* ---------------------- PRODUCTOS ---------------------- */

// Obtener todos los productos
export async function getProducts() {
  const res = await fetch(`${API_URL}/products`);
  if (!res.ok) throw new Error("Error al obtener productos");
  return await res.json();
}

// Obtener un producto por ID
export async function getProductById(id) {
  const res = await fetch(`${API_URL}/products/${id}`);
  if (!res.ok) throw new Error(`Error al obtener producto ${id}`);
  return await res.json();
}

// Crear un nuevo producto
export async function createProduct(productData) {
  const res = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData)
  });
  if (!res.ok) throw new Error("Error al crear producto");
  return await res.json();
}

// Actualizar un producto
export async function updateProduct(id, updatedData) {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedData)
  });
  if (!res.ok) throw new Error(`Error al actualizar producto ${id}`);
  return await res.json();
}

// Eliminar un producto
export async function deleteProduct(id) {
  const res = await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Error al eliminar producto ${id}`);
  return await res.json();
}

/* ---------------------- VENTAS ---------------------- */

// Obtener todas las ventas
export async function getSales() {
  const res = await fetch(`${API_URL}/sales`);
  if (!res.ok) throw new Error("Error al obtener ventas");
  return await res.json();
}

// Crear una nueva venta
export async function createSale(saleData) {
  const res = await fetch(`${API_URL}/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(saleData)
  });
  if (!res.ok) throw new Error("Error al registrar venta");
  return await res.json();
}

// Eliminar una venta
export async function deleteSale(id) {
  const res = await fetch(`${API_URL}/sales/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) throw new Error(`Error al eliminar venta ${id}`);
  return await res.json();
}

/* ---------------------- LOTES ---------------------- */

export async function addLote(productId, loteData) {
  const res = await fetch(`${API_URL}/products/${productId}/lotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loteData)
  });
  return res.json();
}

export async function deleteLote(productId, loteId) {
  const res = await fetch(`${API_URL}/products/${productId}/lotes/${loteId}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Error al eliminar lote");
  return await res.json();
}

/* ---------------------- ENTREGAS ---------------------- */

// Obtener todas las entregas
export async function getEntregas() {

  const res = await fetch(`${API_URL}/entregas`);

  if (!res.ok)
    throw new Error("Error al obtener entregas");

  return await res.json();

}

// Crear nueva entrega
export async function createEntrega(entregaData) {

  const res = await fetch(`${API_URL}/entregas`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify(entregaData)

  });

  if (!res.ok)
    throw new Error("Error al crear entrega");

  return await res.json();

}

// Actualizar entrega
export async function updateEntrega(id, data) {

  const res = await fetch(`${API_URL}/entregas/${id}`, {

    method: "PUT",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify(data)

  });

  if (!res.ok)
    throw new Error("Error al actualizar entrega");

  return await res.json();

}

// Eliminar entrega
export async function deleteEntrega(id) {

  const res = await fetch(`${API_URL}/entregas/${id}`, {

    method: "DELETE"

  });

  if (!res.ok)
    throw new Error("Error al eliminar entrega");

  return await res.json();

}

>>>>>>> 1e0eebc55c5dd8a8d0257e6abef699f89d2e4b73