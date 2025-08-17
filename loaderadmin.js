// loader.js
export function showLoader(message = "Cargando...") {
  const loader = document.createElement("div");
  loader.className = "loader-overlay";
  loader.innerHTML = `
    <div class="loader">
      <div class="chick">🐥</div>
      <p>${message}</p>
    </div>
  `;
  document.body.appendChild(loader);
}

export function hideLoader() {
  const loader = document.querySelector(".loader-overlay");
  if (loader) loader.remove();
}
