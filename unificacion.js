"use strict";

/*
 * ============================================================
 * UNIFICACIÓN MANUAL DESDE LA PANTALLA PRINCIPAL (solo admin)
 * ============================================================
 * Modo "🔗 Unificar":
 *   - tocás las tarjetas que son el mismo producto (se marcan),
 *   - una barra inferior muestra lo seleccionado,
 *   - "Unificar" abre un cuadro para elegir el nombre del grupo
 *     (grupo_id existente, nombre detectado, o uno nuevo),
 *   - las tarjetas que ya son un grupo unificado tienen "✂ Separar"
 *     para deshacer la unificación.
 *
 * La selección sobrevive a la búsqueda: podés buscar, marcar,
 * buscar otra cosa, marcar, y unificar todo junto.
 *
 * Este módulo solo maneja la interfaz. Los pedidos al Apps Script y la
 * actualización del estado los hace app.js (onUnificar / onSeparar).
 * ============================================================
 */

const ID_CONTROLES = "unif-controles";
const ID_BARRA = "unif-barra";
const ID_MODAL = "unif-modal";

let config = null;
let modo = false;
let mostrandoLogin = false;
let apagandoOrganizar = false;
let estilosInyectados = false;

// clave de producto -> producto
const seleccion = new Map();


/* ------------------------------------------------------------
 * UTILIDADES
 * ------------------------------------------------------------ */

function esc(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function el(etiqueta, clase, texto) {

    const nodo = document.createElement(etiqueta);

    if (clase) {
        nodo.className = clase;
    }

    if (texto !== undefined) {
        nodo.textContent = texto;
    }

    return nodo;
}


function inyectarEstilos() {

    if (estilosInyectados) {
        return;
    }

    estilosInyectados = true;

    const style = document.createElement("style");

    style.textContent = `
        .unif-controles { display: inline-flex; gap: 6px; align-items: center; margin-left: 6px; }

        /* Tarjetas en modo unificar */
        .unif-modo { position: relative; cursor: pointer; user-select: none; }
        .unif-modo.unif-seleccionada {
            outline: 3px solid #2563eb; outline-offset: -3px;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, .25);
        }
        .unif-check {
            position: absolute; top: 8px; left: 8px; z-index: 3;
            width: 26px; height: 26px; border-radius: 50%;
            background: #fff; border: 2px solid #9ca3af; color: transparent;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: .9rem;
        }
        .unif-seleccionada .unif-check {
            background: #2563eb; border-color: #2563eb; color: #fff;
        }
        .unif-grupo-tag {
            position: absolute; top: 8px; right: 8px; z-index: 3;
            background: #ede9fe; color: #5b21b6; border-radius: 999px;
            padding: 2px 8px; font-size: .72rem; font-weight: 600;
        }
        .unif-separar {
            position: absolute; bottom: 8px; right: 8px; z-index: 3;
            background: #fff; color: #b91c1c; border: 1px solid #fca5a5;
            border-radius: 6px; padding: 4px 8px; font-size: .75rem; cursor: pointer;
        }
        .unif-separar:hover { background: #fee2e2; }

        /* Barra inferior */
        body.unif-activo { padding-bottom: 110px; }
        #unif-barra {
            position: fixed; left: 0; right: 0; bottom: 0; z-index: 900;
            background: #111827; color: #fff; padding: 10px 14px;
            display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, .3);
        }
        .unif-barra-texto { font-size: .85rem; opacity: .85; flex: 1 1 220px; }
        .unif-barra-chips {
            display: flex; gap: 6px; overflow-x: auto; flex: 3 1 260px;
            max-height: 64px; flex-wrap: wrap;
        }
        .unif-chip-sel {
            background: #1f2937; border: 1px solid #374151; border-radius: 999px;
            padding: 3px 4px 3px 10px; font-size: .75rem; white-space: nowrap;
            max-width: 220px; overflow: hidden; text-overflow: ellipsis;
            display: inline-flex; align-items: center; gap: 4px;
        }
        .unif-chip-sel button {
            background: none; border: 0; color: #9ca3af; cursor: pointer;
            font-size: .9rem; line-height: 1; padding: 0 4px;
        }
        .unif-barra-botones { display: flex; gap: 8px; margin-left: auto; }

        /* Botones y modal */
        .unif-btn {
            border: 1px solid #d1d5db; background: #fff; color: #1f2937;
            border-radius: 8px; padding: 8px 14px; cursor: pointer; font-size: .9rem;
        }
        .unif-btn-primario { background: #2563eb; border-color: #2563eb; color: #fff; }
        .unif-btn:disabled { opacity: .5; cursor: not-allowed; }

        .unif-overlay {
            position: fixed; inset: 0; z-index: 1000;
            background: rgba(0, 0, 0, .55);
            display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .unif-caja {
            background: #fff; color: #1f2937; width: 100%; max-width: 640px;
            max-height: 92vh; overflow: auto; border-radius: 12px; padding: 20px 22px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, .3);
        }
        .unif-caja h2 { margin: 0 0 4px; font-size: 1.2rem; }
        .unif-caja h3 { margin: 16px 0 8px; font-size: .95rem; }
        .unif-ayuda { margin: 0; font-size: .85rem; color: #6b7280; }
        .unif-item {
            display: flex; gap: 10px; align-items: center;
            border: 1px solid #e5e7eb; border-radius: 8px;
            padding: 8px 10px; margin-bottom: 6px;
        }
        .unif-item img {
            width: 48px; height: 48px; object-fit: contain; flex: none;
            background: #f9fafb; border-radius: 6px;
        }
        .unif-item-info { min-width: 0; flex: 1; }
        .unif-item-nombre { font-weight: 600; font-size: .9rem; word-break: break-word; }
        .unif-item-meta { font-size: .75rem; color: #6b7280; margin-top: 2px; }
        .unif-aviso {
            background: #fef3c7; border: 1px solid #f59e0b; color: #92400e;
            border-radius: 8px; padding: 10px 12px; margin-top: 10px; font-size: .85rem;
        }
        .unif-aviso ul { margin: 6px 0 0 18px; padding: 0; }
        .unif-opcion {
            display: flex; gap: 8px; align-items: center;
            padding: 6px 2px; cursor: pointer; font-size: .9rem;
        }
        .unif-opcion small { color: #6b7280; }
        .unif-opcion input[type="text"] {
            flex: 1; padding: 6px 10px; border: 1px solid #d1d5db;
            border-radius: 6px; font-size: .9rem;
        }
        .unif-error { color: #b91c1c; font-size: .85rem; margin-top: 10px; min-height: 1em; }
        .unif-botones { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
    `;

    document.head.appendChild(style);
}


/* ------------------------------------------------------------
 * API PÚBLICA
 * ------------------------------------------------------------
 * iniciarUnificacion({
 *   obtenerAdmin: () => ({ activo, googleListo }),
 *   renderLogin: contenedor => void,       // dibuja el botón de Google
 *   formatearIdentificador: id => string,
 *   volverARenderizar: () => void,
 *   onUnificar: ({ identificadores, grupoId }) => Promise<{ ok, error? }>,
 *   onSeparar:  ({ identificadores })          => Promise<{ ok, error? }>
 * })
 */

export function iniciarUnificacion(opciones) {

    config = opciones;

    inyectarEstilos();

    const referencia = document.getElementById("vista-lista");

    if (!referencia || document.getElementById(ID_CONTROLES)) {
        return;
    }

    const contenedor = el("span", "unif-controles");
    contenedor.id = ID_CONTROLES;

    referencia.parentElement.appendChild(contenedor);

    // "Organizar" y "Unificar" no pueden estar activos a la vez.
    document
        .getElementById("btn-organizar")
        ?.addEventListener("click", () => {

            if (modo && !apagandoOrganizar) {
                salirModo();
            }
        });

    actualizarControlesUnificar();
}


/* Llamar cada vez que cambie la sesión admin o esté listo Google. */

export function actualizarControlesUnificar() {

    if (!config) {
        return;
    }

    const contenedor = document.getElementById(ID_CONTROLES);

    if (!contenedor) {
        return;
    }

    const { activo, googleListo } = config.obtenerAdmin();

    if (!activo && modo) {
        salirModo();
    }

    const referencia = document.getElementById("vista-lista");

    const claseBase =
        (referencia?.className || "")
            .replace("activo", "")
            .trim();

    contenedor.innerHTML = "";

    if (activo) {

        mostrandoLogin = false;

        const b = el("button", claseBase, "🔗 Unificar");

        b.type = "button";
        b.title = "Unificar productos que son el mismo";
        b.classList.toggle("activo", modo);

        b.addEventListener("click", () => {

            if (modo) {
                salirModo();
            } else {
                entrarModo();
            }
        });

        contenedor.appendChild(b);

        return;
    }

    if (!googleListo) {
        return;
    }

    if (mostrandoLogin) {

        const zona = el("span");

        contenedor.appendChild(zona);

        config.renderLogin(zona);

        return;
    }

    const b = el("button", claseBase, "🔒 Admin");

    b.type = "button";
    b.title = "Iniciar sesión de administrador";

    b.addEventListener("click", () => {
        mostrandoLogin = true;
        actualizarControlesUnificar();
    });

    contenedor.appendChild(b);
}


/*
 * Se llama desde el click de cada tarjeta. Devuelve true si el click
 * fue consumido por el modo unificar (y entonces NO hay que abrir el
 * detalle).
 */

export function clickEnModoUnificar(producto) {

    if (!modo) {
        return false;
    }

    if (seleccion.has(producto.clave)) {
        seleccion.delete(producto.clave);
    } else {
        seleccion.set(producto.clave, producto);
    }

    refrescarMarcas();
    renderBarra();

    return true;
}


/* Se llama al terminar de crear cada tarjeta (no hace nada fuera del modo). */

export function decorarTarjetaUnificar(tarjeta, producto) {

    if (!modo) {
        return;
    }

    tarjeta.dataset.unifClave = producto.clave;

    tarjeta.classList.add("unif-modo");

    tarjeta.classList.toggle(
        "unif-seleccionada",
        seleccion.has(producto.clave)
    );

    tarjeta.appendChild(el("div", "unif-check", "✓"));

    if (producto.clave.startsWith("grupo:")) {

        const etiqueta =
            el("div", "unif-grupo-tag", `🔗 ${producto.identificadores.size}`);

        etiqueta.title =
            `Producto unificado (${producto.identificadores.size} identificadores)`;

        tarjeta.appendChild(etiqueta);

        const separar = el("button", "unif-separar", "✂ Separar");

        separar.type = "button";
        separar.title = "Deshacer la unificación de este producto";

        separar.addEventListener("click", event => {
            event.stopPropagation();
            separarProducto(producto);
        });

        tarjeta.appendChild(separar);
    }
}


/* ------------------------------------------------------------
 * MODO
 * ------------------------------------------------------------ */

function entrarModo() {

    const organizar = document.getElementById("btn-organizar");

    if (organizar?.classList.contains("activo")) {

        apagandoOrganizar = true;
        organizar.click();
        apagandoOrganizar = false;
    }

    modo = true;

    renderBarra();
    actualizarControlesUnificar();
    config.volverARenderizar();
}


function salirModo() {

    modo = false;

    seleccion.clear();

    cerrarModal();
    renderBarra();
    actualizarControlesUnificar();
    config.volverARenderizar();
}


function refrescarMarcas() {

    document
        .querySelectorAll("[data-unif-clave]")
        .forEach(nodo => {
            nodo.classList.toggle(
                "unif-seleccionada",
                seleccion.has(nodo.dataset.unifClave)
            );
        });
}


/* ------------------------------------------------------------
 * BARRA INFERIOR
 * ------------------------------------------------------------ */

function renderBarra() {

    let barra = document.getElementById(ID_BARRA);

    if (!modo) {

        barra?.remove();
        document.body.classList.remove("unif-activo");

        return;
    }

    document.body.classList.add("unif-activo");

    if (!barra) {

        barra = el("div");
        barra.id = ID_BARRA;

        barra.addEventListener("click", event => {

            const boton = event.target.closest("[data-accion]");

            if (!boton) {
                return;
            }

            const accion = boton.dataset.accion;

            if (accion === "quitar") {

                seleccion.delete(boton.dataset.clave);
                refrescarMarcas();
                renderBarra();

            } else if (accion === "limpiar") {

                seleccion.clear();
                refrescarMarcas();
                renderBarra();

            } else if (accion === "unificar") {

                abrirConfirmacion();

            } else if (accion === "salir") {

                salirModo();
            }
        });

        document.body.appendChild(barra);
    }

    const elegidos = [...seleccion.values()];

    barra.innerHTML = `
        <div class="unif-barra-texto">
            ${elegidos.length
                ? `<strong>${elegidos.length}</strong> seleccionado${elegidos.length === 1 ? "" : "s"}`
                : "Tocá las tarjetas que son el mismo producto."}
            ${elegidos.length === 1 ? " Elegí al menos otra." : ""}
        </div>

        <div class="unif-barra-chips">
            ${elegidos.map(p => `
                <span class="unif-chip-sel" title="${esc(p.nombre)}">
                    ${esc(p.nombre)}
                    <button type="button" data-accion="quitar"
                            data-clave="${esc(p.clave)}">×</button>
                </span>
            `).join("")}
        </div>

        <div class="unif-barra-botones">
            <button type="button" class="unif-btn" data-accion="limpiar"
                    ${elegidos.length ? "" : "disabled"}>
                Limpiar
            </button>
            <button type="button" class="unif-btn unif-btn-primario"
                    data-accion="unificar"
                    ${elegidos.length >= 2 ? "" : "disabled"}>
                🔗 Unificar (${elegidos.length})
            </button>
            <button type="button" class="unif-btn" data-accion="salir">
                Salir
            </button>
        </div>
    `;
}


/* ------------------------------------------------------------
 * SEPARAR (deshacer una unificación)
 * ------------------------------------------------------------ */

async function separarProducto(producto) {

    const n = producto.identificadores.size;

    const ok = confirm(
        `Vas a deshacer la unificación de "${producto.nombre}".\n\n` +
        `Se separa en ${n} producto${n === 1 ? "" : "s"} ` +
        `independiente${n === 1 ? "" : "s"} (uno por identificador).\n\n` +
        "¿Continuar?"
    );

    if (!ok) {
        return;
    }

    let resultado;

    try {

        resultado = await config.onSeparar({
            identificadores: [...producto.identificadores]
        });

    } catch (error) {

        console.error(error);
        resultado = { ok: false, error: "Error de conexión al separar." };
    }

    if (!resultado?.ok) {

        alert(resultado?.error || "No se pudo separar.");

        return;
    }

    seleccion.delete(producto.clave);
    renderBarra();
}


/* ------------------------------------------------------------
 * CONFIRMACIÓN: ELEGIR NOMBRE DEL GRUPO
 * ------------------------------------------------------------ */

function cerrarModal() {

    document.getElementById(ID_MODAL)?.remove();
    document.removeEventListener("keydown", escapeModal);
}


function escapeModal(event) {

    if (event.key === "Escape") {
        cerrarModal();
    }
}


function abrirConfirmacion() {

    const elegidos = [...seleccion.values()];

    if (elegidos.length < 2) {
        return;
    }

    cerrarModal();

    const { formatearIdentificador } = config;

    let elegido = null;
    let usarLibre = false;
    let libre = "";
    let ocupado = false;


    /* ---------- datos ---------- */

    // grupo_id actuales (se deducen de las claves "grupo:<id>")
    const gruposDe = producto =>
        producto.clave.startsWith("grupo:")
            ? [producto.grupoNombre || producto.clave.slice(6)]
            : [];

    const grupos = new Map();

    for (const p of elegidos) {
        for (const g of gruposDe(p)) {
            grupos.set(g.toLowerCase(), g);
        }
    }

    const opciones = (() => {

        const vistos = new Set();
        const lista = [];

        const agregar = texto => {

            const t = String(texto || "").trim();

            if (t && !vistos.has(t.toLowerCase())) {
                vistos.add(t.toLowerCase());
                lista.push(t);
            }
        };

        [...grupos.values()].forEach(agregar);

        for (const p of elegidos) {

            agregar(p.nombre);

            for (const n of (p.nombres || [])) {
                agregar(n);
            }
        }

        return lista;
    })();

    elegido = opciones[0] ?? null;

    const nombreFinal = () =>
        (usarLibre ? libre : (elegido || "")).trim();


    /* ---------- DOM ---------- */

    const overlay = el("div", "unif-overlay");

    overlay.id = ID_MODAL;

    overlay.innerHTML = `
        <div class="unif-caja" role="dialog" aria-modal="true">

            <h2>🔗 Unificar ${elegidos.length} productos</h2>

            <p class="unif-ayuda">
                No se aplica ningún filtro de similitud: lo que confirmes
                se guarda tal cual.
            </p>

            <h3>Productos</h3>

            ${elegidos.map(p => `
                <div class="unif-item">
                    ${p.imagen
                        ? `<img src="${esc(p.imagen)}" alt="" loading="lazy"
                                onerror="this.style.display='none'">`
                        : ""}
                    <div class="unif-item-info">
                        <div class="unif-item-nombre">${esc(p.nombre)}</div>
                        <div class="unif-item-meta">
                            ${esc(p.linea || "sin línea")}
                            · ${[...p.identificadores]
                                .map(id => esc(formatearIdentificador(id)))
                                .join(" · ")}
                        </div>
                        <div class="unif-item-meta">
                            ${gruposDe(p).length
                                ? `Grupo actual: ${gruposDe(p).map(esc).join(", ")}`
                                : "Sin grupo asignado"}
                        </div>
                    </div>
                </div>
            `).join("")}

            ${grupos.size > 1 ? `
                <div class="unif-aviso">
                    ⚠️ Estos productos ya tienen grupo_id <strong>distintos</strong>:
                    <ul>${[...grupos.values()].map(g => `<li>${esc(g)}</li>`).join("")}</ul>
                    Si confirmás, se unifican todos bajo el mismo nombre.
                </div>
            ` : ""}

            <h3>Nombre del grupo</h3>

            <div id="unif-nombre">
                ${opciones.map((o, i) => `
                    <label class="unif-opcion">
                        <input type="radio" name="unif-nombre" value="${i}"
                               ${i === 0 ? "checked" : ""}>
                        <span>
                            ${esc(o)}
                            ${grupos.has(o.toLowerCase())
                                ? "<small>(grupo existente)</small>" : ""}
                        </span>
                    </label>
                `).join("")}

                <label class="unif-opcion">
                    <input type="radio" name="unif-nombre" value="libre">
                    <span>Otro:</span>
                    <input type="text" id="unif-libre"
                           placeholder="Escribí un nombre canónico">
                </label>
            </div>

            <div class="unif-error" id="unif-error"></div>

            <div class="unif-botones">
                <button type="button" class="unif-btn" id="unif-cancelar">
                    Cancelar
                </button>
                <button type="button" class="unif-btn unif-btn-primario"
                        id="unif-confirmar">
                    Unificar
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(overlay);
    document.addEventListener("keydown", escapeModal);

    const $ = selector => overlay.querySelector(selector);

    const actualizarBoton = () => {
        $("#unif-confirmar").disabled = ocupado || !nombreFinal();
    };

    overlay.addEventListener("click", event => {

        if (event.target === overlay) {
            cerrarModal();
        }
    });

    overlay.addEventListener("change", event => {

        if (event.target.name !== "unif-nombre") {
            return;
        }

        if (event.target.value === "libre") {

            usarLibre = true;

        } else {

            usarLibre = false;
            elegido = opciones[Number(event.target.value)] ?? null;
        }

        actualizarBoton();
    });

    overlay.addEventListener("input", event => {

        if (event.target.id !== "unif-libre") {
            return;
        }

        libre = event.target.value;
        usarLibre = true;

        overlay
            .querySelector('input[name="unif-nombre"][value="libre"]')
            .checked = true;

        actualizarBoton();
    });

    $("#unif-cancelar").addEventListener("click", cerrarModal);

    $("#unif-confirmar").addEventListener("click", async () => {

        const grupoId = nombreFinal();

        if (!grupoId) {
            return;
        }

        const identificadores = [
            ...new Set(elegidos.flatMap(p => [...p.identificadores]))
        ];

        ocupado = true;
        $("#unif-error").textContent = "";
        $("#unif-confirmar").textContent = "Guardando...";
        actualizarBoton();

        let resultado;

        try {

            resultado = await config.onUnificar({ identificadores, grupoId });

        } catch (error) {

            console.error(error);
            resultado = { ok: false, error: "Error de conexión al unificar." };
        }

        if (resultado?.ok) {

            seleccion.clear();
            cerrarModal();
            refrescarMarcas();
            renderBarra();

            return;
        }

        ocupado = false;
        $("#unif-confirmar").textContent = "Unificar";
        $("#unif-error").textContent =
            resultado?.error || "No se pudo unificar.";
        actualizarBoton();
    });

    actualizarBoton();
}
