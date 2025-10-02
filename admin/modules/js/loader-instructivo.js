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

  const cards = [
    document.getElementById("card1"),
    document.getElementById("card2"),
    document.getElementById("card3")
  ];

  const loaderOverlay = document.getElementById("loader-overlay"); // 👈 aquí

  // Mostrar tarjetas con delay
  setTimeout(() => {
    cards[0].classList.add("show"); // derecha
  }, 500);

  setTimeout(() => {
    cards[1].classList.add("from-left", "show"); // izquierda
  }, 3500);

  setTimeout(() => {
    cards[2].classList.add("show"); // derecha
  }, 6500);

  // Si backend tarda más de 9.5s, mostrar loader overlay
  const loaderTimeout = setTimeout(() => {
    loaderOverlay.style.display = "flex";
  }, 9500);

  // función para ocultarlo
  return function hideLoaderInstructivo() {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 500);
  };
}
