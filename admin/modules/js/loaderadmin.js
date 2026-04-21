// loader.js
export function showLoader(texto = "Cargando...") {

  const loader = document.createElement("div");

  loader.id = "global-loader";

  loader.innerHTML = `
    <div class="loader-box">

      <div class="loader-spinner"></div>

      <div class="loader-text">
        ${texto}
      </div>

    </div>
  `;

  document.body.appendChild(loader);

}

export function hideLoader() {

  const loader =
    document.getElementById("global-loader");

  if (!loader)
    return;

  loader.style.opacity = "0";

  setTimeout(() => {

    loader.remove();

  }, 200);

}