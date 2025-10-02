// loader-instructivo.js

export function initLoaderInstructivo() {
  const loader = document.createElement("div");
  loader.id = "loader-instructivo";
  loader.innerHTML = `
    <div class="instructivo-step" id="card1">
      <div class="instructivo-icon">✅</div>
      <p>Marca los productos que te interesen en la casilla de verificación.</p>
    </div>
    <div class="instructivo-step" id="card2">
      <div class="instructivo-icon">🛒</div>
      <p>Puedes seleccionar varios artículos a la vez.</p>
    </div>
    <div class="instructivo-step" id="card3">
      <div class="instructivo-icon">📲</div>
      <p>Haz clic en el ícono de WhatsApp para consultarnos por los seleccionados.</p>
    </div>

    <!-- Loader overlay oculto por defecto -->
    <div id="loader-overlay">
      <div class="loader"></div>
    </div>
  `;

  document.body.appendChild(loader);

  // referencias
  const card1 = document.getElementById("card1");
  const card2 = document.getElementById("card2");
  const card3 = document.getElementById("card3");
  const loaderOverlay = document.getElementById("loader-overlay");


  // Animaciones secuenciales
  setTimeout(() => card1.classList.add("show"), 500);    // derecha
  setTimeout(() => card2.classList.add("show"), 3500);   // izquierda
  setTimeout(() => card3.classList.add("show"), 6500);   // derecha

  // Loader overlay si tarda demasiado
  setTimeout(() => {
    loaderOverlay.style.display = "flex";
  }, 9500);

  // función para ocultar instructivo
  return function hideLoaderInstructivo() {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 500);
  };
}