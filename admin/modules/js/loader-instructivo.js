// loader-instructivo.js

export function initLoaderInstructivo() {
  const loader = document.createElement("div");
  loader.id = "loader-instructivo";
  loader.innerHTML = `
    <div class="instructivo-step">
      <div class="instructivo-icon">✅</div>
      <p>Marca los productos que te interesen en la casilla de verificación.</p>
    </div>
    <div class="instructivo-step">
      <div class="instructivo-icon">🛒</div>
      <p>Puedes seleccionar varios artículos a la vez.</p>
    </div>
    <div class="instructivo-step">
      <div class="instructivo-icon">📲</div>
      <p>Haz clic en el ícono de WhatsApp para consultarnos por los seleccionados.</p>
    </div>
  `;
  document.body.appendChild(loader);

  // función para ocultarlo
  return function hideLoaderInstructivo() {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 500);
  };
}
