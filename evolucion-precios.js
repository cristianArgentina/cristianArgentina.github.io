"use strict";

/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const SHEET_ID =
    "1l_2L8rGgCy97uscp-m4mk-0jLLrOA3C9a4ueVGoWB84";

const SHEET_GID =
    "1393518485";

const IMAGENES_SHEET_GID = "1823752636";

const SHEET_CSV_URL =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;

const CACHE_KEY = "evolucionPreciosCache";
const CACHE_MAX_AGE = 10 * 60 * 1000;


/*
 * ============================================================
 * ESTADO
 * ============================================================
 */

let productos = new Map();

let productoActual = null;

let vistaActual = "grid";


/*
 * ============================================================
 * COMERCIOS
 * ============================================================
 *
 * Estos nombres son los que actualmente utiliza tu recolector.
 */

const NOMBRES_SITIOS = {
    farmaonline: "Farmaonline",
    farmalife: "Farmalife",
    farmacity: "Farmacity",
    masonline: "MasOnline",
    perfumeriaspigmento: "Perfumerías Pigmento",
    farmaplus: "Farmaplus",
    josimar: "Josimar",
    carrefour: "Carrefour",
    diaonline: "Día",
    coto: "Coto",
    paradineiro: "Paradineiro"
};


/*
 * ============================================================
 * INICIO
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", iniciar);


async function iniciar() {

    configurarEventos();

    try {

        actualizarEstado(
            "Cargando datos..."
        );


        const [filas, imagenes] =
            await Promise.all([
                cargarDatos(),
                cargarImagenesProductos()
            ]);


        procesarFilas(
            filas,
            imagenes
        );


        renderizarCatalogo();


        actualizarEstado(
            `${productos.size} productos encontrados`
        );


    } catch (error) {

        console.error(error);


        actualizarEstado(
            "No se pudieron cargar los precios."
        );


        mostrarErrorCarga();
    }
}


/*
 * ============================================================
 * EVENTOS
 * ============================================================
 */

function configurarEventos() {

    document
        .getElementById("busqueda")
        .addEventListener("input", aplicarBusqueda);


    document
        .getElementById("vista-grid")
        .addEventListener("click", () => cambiarVista("grid"));


    document
        .getElementById("vista-lista")
        .addEventListener("click", () => cambiarVista("lista"));


    document
        .getElementById("volver-productos")
        .addEventListener("click", mostrarCatalogo);


    document
        .getElementById("cerrar-modal")
        .addEventListener("click", cerrarModal);


    document
        .getElementById("cerrar-modal-overlay")
        .addEventListener("click", cerrarModal);
}


/*
 * ============================================================
 * CARGA DE SHEETS
 * ============================================================
 */

async function cargarDatos() {

    const cache = obtenerCache();

    if (cache) {

        console.log(
            "Usando datos almacenados temporalmente."
        );

        return cache;
    }


    const respuesta = await fetch(
        SHEET_CSV_URL,
        {
            cache: "no-store"
        }
    );


    if (!respuesta.ok) {

        throw new Error(
            `Error HTTP ${respuesta.status}`
        );
    }


    const texto = await respuesta.text();

    const filas = parsearCSV(texto);


    guardarCache(filas);


    return filas;
}

async function cargarImagenesProductos() {

    const url =
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${IMAGENES_SHEET_GID}`;

    const respuesta = await fetch(
        url,
        {
            cache: "no-store"
        }
    );

    if (!respuesta.ok) {

        throw new Error(
            `Error HTTP imágenes ${respuesta.status}`
        );
    }

    const texto =
        await respuesta.text();

    const filas =
        parsearCSV(texto);

    const imagenes =
        new Map();

    if (!filas.length) {
        return imagenes;
    }

    const encabezados =
        filas[0].map(
            valor =>
                valor.trim().toLowerCase()
        );

    const indiceEAN =
        encabezados.indexOf("ean");

    const indiceImagen =
        encabezados.indexOf("imageurl");


    if (
        indiceEAN === -1 ||
        indiceImagen === -1
    ) {

        console.warn(
            "Imagenes_Productos no contiene las columnas ean e imageurl."
        );

        return imagenes;
    }


    for (
        let i = 1;
        i < filas.length;
        i++
    ) {

        const ean =
            limpiar(
                filas[i][indiceEAN]
            );

        const imageurl =
            limpiar(
                filas[i][indiceImagen]
            );


        if (
            ean &&
            imageurl
        ) {

            imagenes.set(
                ean,
                imageurl
            );
        }
    }


    console.log(
        `Imágenes cargadas: ${imagenes.size}`
    );


    return imagenes;
}

/*
 * ============================================================
 * CACHE
 * ============================================================
 */

function obtenerCache() {

    try {

        const guardado =
            sessionStorage.getItem(CACHE_KEY);

        if (!guardado) {
            return null;
        }

        const objeto =
            JSON.parse(guardado);

        if (
            Date.now() - objeto.timestamp
            > CACHE_MAX_AGE
        ) {

            sessionStorage.removeItem(
                CACHE_KEY
            );

            return null;
        }

        return objeto.filas;

    } catch {

        return null;
    }
}


function guardarCache(filas) {

    try {

        sessionStorage.setItem(
            CACHE_KEY,

            JSON.stringify({
                timestamp: Date.now(),
                filas
            })
        );

    } catch (error) {

        console.warn(
            "No se pudo guardar cache:",
            error
        );
    }
}


/*
 * ============================================================
 * CSV
 * ============================================================
 */

function parsearCSV(texto) {

    const filas = [];

    let fila = [];
    let campo = "";
    let dentroComillas = false;


    for (let i = 0; i < texto.length; i++) {

        const caracter = texto[i];
        const siguiente = texto[i + 1];


        if (caracter === '"') {

            if (
                dentroComillas &&
                siguiente === '"'
            ) {

                campo += '"';
                i++;

            } else {

                dentroComillas =
                    !dentroComillas;
            }

            continue;
        }


        if (
            caracter === "," &&
            !dentroComillas
        ) {

            fila.push(campo);
            campo = "";

            continue;
        }


        if (
            (caracter === "\n" ||
             caracter === "\r") &&
            !dentroComillas
        ) {

            if (
                caracter === "\r" &&
                siguiente === "\n"
            ) {
                i++;
            }

            fila.push(campo);
            campo = "";

            if (
                fila.some(
                    valor => valor.trim() !== ""
                )
            ) {

                filas.push(fila);
            }

            fila = [];

            continue;
        }


        campo += caracter;
    }


    if (campo !== "" || fila.length) {

        fila.push(campo);

        if (
            fila.some(
                valor => valor.trim() !== ""
            )
        ) {

            filas.push(fila);
        }
    }


    return filas;
}


/*
 * ============================================================
 * PROCESAMIENTO
 * ============================================================
 */

function procesarFilas(
    filas,
    imagenes = new Map()
) {

    productos.clear();


    if (!filas.length) {
        return;
    }


    const encabezados =
        filas[0].map(
            valor =>
                valor.trim().toLowerCase()
        );


    const indice = {

        fecha: encabezados.indexOf("fecha"),

        linea: encabezados.indexOf("linea"),

        producto: encabezados.indexOf("producto"),

        sitio: encabezados.indexOf("sitio"),

        precio: encabezados.indexOf("precio"),

        disponibilidad:
            encabezados.indexOf(
                "disponibilidad"
            ),

        error:
            encabezados.indexOf("error"),

        url:
            encabezados.indexOf("url"),

        ean:
            encabezados.indexOf("ean")
    };


    for (
        let i = 1;
        i < filas.length;
        i++
    ) {

        const fila = filas[i];


        const ean =
            limpiar(fila[indice.ean]);


        /*
         * Sin EAN no podemos garantizar
         * que sea el mismo producto.
         */

        if (!ean) {
            continue;
        }


        const sitio =
            limpiar(fila[indice.sitio]);


        if (!sitio) {
            continue;
        }


        const fecha =
            limpiar(fila[indice.fecha]);


        const productoNombre =
            limpiar(
                fila[indice.producto]
            );


        const linea =
            limpiar(
                fila[indice.linea]
            );


        const precio =
            convertirPrecio(
                fila[indice.precio]
            );


        const disponibilidad =
            limpiar(
                fila[indice.disponibilidad]
            );


        const error =
            limpiar(
                fila[indice.error]
            );


        const url =
            limpiar(
                fila[indice.url]
            );


        /*
         * Crear producto.
         */

        if (!productos.has(ean)) {

            productos.set(
                ean,

                {
                    ean,

                    nombre:
                        productoNombre ||
                        "Producto sin nombre",

                    linea,

                    imagen:
                        imagenes.get(ean) || null,

                    sitios: {}
                }
            );
        }


        const producto =
            productos.get(ean);


        /*
         * Conservamos el nombre más completo.
         */

        if (
            productoNombre &&
            productoNombre.length >
            producto.nombre.length
        ) {

            producto.nombre =
                productoNombre;
        }


        if (!producto.linea && linea) {
            producto.linea = linea;
        }


        /*
         * Crear comercio.
         */

        if (!producto.sitios[sitio]) {

            producto.sitios[sitio] = {

                nombre:
                    NOMBRES_SITIOS[sitio]
                    || sitio,

                lecturas: []
            };
        }


        /*
         * Agregamos TODAS las lecturas.
         */

        producto.sitios[sitio]
            .lecturas.push({

                fecha,

                precio,

                disponibilidad,

                error,

                url
            });
    }


    /*
     * Después de cargar todo,
     * determinamos última lectura.
     */

    for (const producto of productos.values()) {

        for (
            const sitio of
            Object.values(producto.sitios)
        ) {

            sitio.lecturas.sort(
                compararFechas
            );


            sitio.ultima =
                sitio.lecturas[
                    sitio.lecturas.length - 1
                ];
        }
    }
}


/*
 * ============================================================
 * ORDENAR FECHAS
 * ============================================================
 */

function compararFechas(a, b) {

    return convertirFecha(a.fecha)
        - convertirFecha(b.fecha);
}


function convertirFecha(valor) {

    if (!valor) {
        return 0;
    }


    /*
     * Google suele devolver:
     *
     * 2026-09-04 9:41
     */

    const partes =
        valor.trim().split(/\s+/);


    if (partes.length < 2) {

        const fecha =
            new Date(valor);

        return isNaN(fecha)
            ? 0
            : fecha.getTime();
    }


    const [anio, mes, dia] =
        partes[0].split("-").map(Number);


    const [hora, minuto = 0] =
        partes[1]
            .split(":")
            .map(Number);


    return new Date(
        anio,
        mes - 1,
        dia,
        hora || 0,
        minuto || 0
    ).getTime();
}


/*
 * ============================================================
 * CATALOGO
 * ============================================================
 */

function renderizarCatalogo(lista = null) {

    const catalogo =
        document.getElementById(
            "catalogo-productos"
        );

    const detalle =
        document.getElementById(
            "detalle-producto"
        );


    detalle.classList.add("oculto");

    catalogo.classList.remove("oculto");


    const productosMostrar =
        lista ||
        [...productos.values()];


    catalogo.innerHTML = "";


    if (!productosMostrar.length) {

        document
            .getElementById(
                "sin-resultados"
            )
            .classList.remove("oculto");

        return;
    }


    document
        .getElementById(
            "sin-resultados"
        )
        .classList.add("oculto");


    for (
        const producto of productosMostrar
    ) {

        catalogo.appendChild(
            crearTarjetaProducto(
                producto
            )
        );
    }
}


/*
 * ============================================================
 * TARJETA
 * ============================================================
 */

function crearTarjetaProducto(producto) {

    const tarjeta =
        document.createElement("article");


    tarjeta.className =
        "producto-card";


    tarjeta.addEventListener(
        "click",
        () =>
            mostrarDetalle(
                producto.ean
            )
    );


    const imagen =
        obtenerImagenProducto(
            producto
        );


    const precio =
        obtenerPrecioMinimo(
            producto
        );


    const sitios =
        contarSitiosDisponibles(
            producto
        );


    tarjeta.innerHTML = `

        <div class="producto-imagen">

            ${
                imagen
                    ? `
                        <img
                            src="${escaparHTML(imagen)}"
                            alt="${escaparHTML(producto.nombre)}"
                            loading="lazy"
                            onerror="this.style.display='none';"
                        >
                    `
                    : `
                        <div class="imagen-placeholder">
                            🛍️
                        </div>
                    `
            }

        </div>


        <div class="producto-info">

            <div class="producto-linea">
                ${escaparHTML(
                    producto.linea || ""
                )}
            </div>


            <div class="producto-nombre">
                ${escaparHTML(
                    producto.nombre
                )}
            </div>


            <div class="producto-ean">
                EAN ${escaparHTML(
                    producto.ean
                )}
            </div>


            <div class="producto-resumen">

                <div>

                    <div class="producto-desde">
                        Desde
                    </div>

                    <div class="producto-precio">
                        ${
                            precio !== null
                                ? formatearPrecio(
                                    precio
                                )
                                : "Sin precio"
                        }
                    </div>

                </div>


                <div class="producto-sitios">
                    ${sitios}
                    ${
                        sitios === 1
                            ? " comercio"
                            : " comercios"
                    }
                </div>

            </div>

        </div>
    `;


    return tarjeta;
}


/*
 * ============================================================
 * PRECIO MÍNIMO ACTUAL
 * ============================================================
 */

function obtenerPrecioMinimo(producto) {

    const precios = [];


    for (
        const sitio of
        Object.values(producto.sitios)
    ) {

        if (
            sitio.ultima &&
            typeof sitio.ultima.precio ===
                "number" &&
            sitio.ultima.precio > 0
        ) {

            precios.push(
                sitio.ultima.precio
            );
        }
    }


    if (!precios.length) {
        return null;
    }


    return Math.min(...precios);
}


/*
 * ============================================================
 * DETALLE
 * ============================================================
 */

function mostrarDetalle(ean) {

    const producto =
        productos.get(ean);


    if (!producto) {
        return;
    }


    productoActual =
        producto;


    document
        .getElementById(
            "catalogo-productos"
        )
        .classList.add("oculto");


    document
        .getElementById(
            "sin-resultados"
        )
        .classList.add("oculto");


    const detalle =
        document.getElementById(
            "detalle-producto"
        );


    detalle.classList.remove("oculto");


    renderizarDetalle();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function renderizarDetalle() {

    const producto =
        productoActual;


    const detalle =
        document.getElementById(
            "detalle-contenido"
        );


    const imagen =
        obtenerImagenProducto(
            producto
        );


    detalle.innerHTML = `

        <div class="detalle-cabecera">

            <div class="detalle-imagen">

                ${
                    imagen
                        ? `
                            <img
                                src="${escaparHTML(imagen)}"
                                alt="${escaparHTML(producto.nombre)}"
                            >
                        `
                        : `
                            <div class="imagen-placeholder">
                                🛍️
                            </div>
                        `
                }

            </div>


            <div class="detalle-datos">

                <div class="producto-linea">
                    ${escaparHTML(
                        producto.linea || ""
                    )}
                </div>

                <h2>
                    ${escaparHTML(
                        producto.nombre
                    )}
                </h2>

                <div class="detalle-ean">
                    EAN:
                    ${escaparHTML(
                        producto.ean
                    )}
                </div>

            </div>

        </div>


        <h2 class="comparacion-titulo">
            Precios actuales
        </h2>


        <div
            id="lista-comercios"
            class="comercios"
        ></div>
    `;


    renderizarComercios();
}


/*
 * ============================================================
 * COMERCIOS
 * ============================================================
 */

function renderizarComercios() {

    const contenedor =
        document.getElementById(
            "lista-comercios"
        );


    const comercios =
        Object.entries(
            productoActual.sitios
        );


    /*
     * Ordenamos por precio actual.
     */

    comercios.sort(
        ([, a], [, b]) => {

            const precioA =
                a.ultima?.precio ?? Infinity;

            const precioB =
                b.ultima?.precio ?? Infinity;

            return precioA - precioB;
        }
    );


    contenedor.innerHTML = "";


    /*
     * Primero calculamos precios efectivos
     * para poder encontrar el mejor.
     */

    const datos = comercios.map(
        ([id, sitio]) => {

            const descuento =
                obtenerDescuento(
                    productoActual.ean,
                    id
                );


            const precio =
                sitio.ultima?.precio;


            const efectivo =
                calcularPrecioEfectivo(
                    precio,
                    descuento
                );


            return {
                id,
                sitio,
                descuento,
                precio,
                efectivo
            };
        }
    );


    const disponibles =
        datos.filter(
            item =>
                item.efectivo !== null
        );


    const mejorPrecio =
        disponibles.length
            ? Math.min(
                ...disponibles.map(
                    item =>
                        item.efectivo
                )
            )
            : null;


    for (const item of datos) {

        const esMejor =
            mejorPrecio !== null &&
            item.efectivo === mejorPrecio;


        contenedor.appendChild(
            crearTarjetaComercio(
                item,
                esMejor
            )
        );
    }
}


/*
 * ============================================================
 * TARJETA COMERCIO
 * ============================================================
 */

function crearTarjetaComercio(
    item,
    esMejor
) {

    const {
        id,
        sitio,
        descuento,
        precio,
        efectivo
    } = item;


    const tarjeta =
        document.createElement("article");


    tarjeta.className =
        "comercio-card" +
        (
            esMejor
                ? " mejor"
                : ""
        );


    const ultima =
        sitio.ultima;


    tarjeta.innerHTML = `

        ${
            esMejor
                ? `
                    <div class="mejor-badge">
                        🏆 Mejor precio
                    </div>
                `
                : ""
        }


        <div class="comercio-nombre">
            ${escaparHTML(
                sitio.nombre
            )}
        </div>


        <div class="comercio-precio-publicado">

            Precio publicado

            <strong>
                ${
                    precio !== undefined &&
                    precio !== null
                        ? formatearPrecio(
                            precio
                        )
                        : "Sin precio"
                }
            </strong>

        </div>


        <label class="descuento-label">

            Tu descuento (%)

        </label>


        <input
            class="descuento-input"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value="${descuento}"
            data-sitio="${escaparHTML(id)}"
        >


        <div class="precio-efectivo">

            <span>
                Precio que pagarías
            </span>

            <strong>
                ${
                    efectivo !== null
                        ? formatearPrecio(
                            efectivo
                        )
                        : "—"
                }
            </strong>

        </div>


        <div class="comercio-fecha">

            Última lectura:
            ${
                ultima?.fecha
                    ? formatearFecha(
                        ultima.fecha
                    )
                    : "sin fecha"
            }

        </div>


        <div class="comercio-acciones">

            ${
                ultima?.url
                    ? `
                        <a
                            class="btn-comercio"
                            href="${escaparHTML(ultima.url)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Ver comercio
                        </a>
                    `
                    : ""
            }


            <button
                class="btn-comercio btn-historico"
                type="button"
            >
                📈 Histórico
            </button>

        </div>
    `;


    /*
     * Descuento
     */

    const input =
        tarjeta.querySelector(
            ".descuento-input"
        );


    input.addEventListener(
        "input",
        () => {

            guardarDescuento(
                productoActual.ean,
                id,
                input.value
            );


            renderizarComercios();
        }
    );


    /*
     * Histórico
     */

    tarjeta
        .querySelector(
            ".btn-historico"
        )
        .addEventListener(
            "click",
            () =>
                mostrarHistorico(
                    id
                )
        );


    /*
     * Evitamos que el click del input
     * provoque comportamientos inesperados.
     */

    input.addEventListener(
        "click",
        event =>
            event.stopPropagation()
    );


    return tarjeta;
}


/*
 * ============================================================
 * DESCUENTOS PERSONALES
 * ============================================================
 */

function obtenerClaveDescuento(
    ean,
    sitio
) {

    return `descuento_${ean}_${sitio}`;
}


function obtenerDescuento(
    ean,
    sitio
) {

    const valor =
        localStorage.getItem(
            obtenerClaveDescuento(
                ean,
                sitio
            )
        );


    if (valor === null) {
        return 0;
    }


    const numero =
        Number(valor);


    if (
        !Number.isFinite(numero) ||
        numero < 0
    ) {

        return 0;
    }


    return Math.min(
        numero,
        100
    );
}


function guardarDescuento(
    ean,
    sitio,
    valor
) {

    let numero =
        Number(valor);


    if (!Number.isFinite(numero)) {
        numero = 0;
    }


    numero =
        Math.max(
            0,
            Math.min(
                numero,
                100
            )
        );


    localStorage.setItem(
        obtenerClaveDescuento(
            ean,
            sitio
        ),
        String(numero)
    );
}


function calcularPrecioEfectivo(
    precio,
    descuento
) {

    if (
        typeof precio !== "number" ||
        precio <= 0
    ) {

        return null;
    }


    return precio *
        (1 - descuento / 100);
}


/*
 * ============================================================
 * HISTÓRICO
 * ============================================================
 */

function mostrarHistorico(sitioId) {

    const sitio =
        productoActual.sitios[
            sitioId
        ];


    if (!sitio) {
        return;
    }


    const lecturas =
        [...sitio.lecturas]
            .sort(compararFechas);


    const precios =
        lecturas
            .map(
                lectura =>
                    lectura.precio
            )
            .filter(
                precio =>
                    typeof precio ===
                        "number" &&
                    precio > 0
            );


    const minimo =
        precios.length
            ? Math.min(...precios)
            : null;


    const maximo =
        precios.length
            ? Math.max(...precios)
            : null;


    const actual =
        sitio.ultima?.precio;


    const inicial =
        precios.length
            ? precios[0]
            : null;


    let variacion = null;


    if (
        inicial &&
        actual !== undefined &&
        actual !== null
    ) {

        variacion =
            (
                (actual - inicial) /
                inicial
            ) * 100;
    }


    document
        .getElementById(
            "historico-contenido"
        )
        .innerHTML = `

        <h2 class="historico-titulo">

            Evolución —
            ${escaparHTML(
                sitio.nombre
            )}

        </h2>


        <div class="historico-subtitulo">

            ${escaparHTML(
                productoActual.nombre
            )}

        </div>


        <div class="estadisticas-historico">

            <div>
                <small>Precio actual</small>
                <strong>
                    ${
                        actual
                            ? formatearPrecio(
                                actual
                            )
                            : "—"
                    }
                </strong>
            </div>

            <div>
                <small>Precio inicial</small>
                <strong>
                    ${
                        inicial
                            ? formatearPrecio(
                                inicial
                            )
                            : "—"
                    }
                </strong>
            </div>

            <div>
                <small>Mínimo histórico</small>
                <strong>
                    ${
                        minimo
                            ? formatearPrecio(
                                minimo
                            )
                            : "—"
                    }
                </strong>
            </div>

            <div>
                <small>Máximo histórico</small>
                <strong>
                    ${
                        maximo
                            ? formatearPrecio(
                                maximo
                            )
                            : "—"
                    }
                </strong>
            </div>

            <div>
                <small>Variación</small>
                <strong>
                    ${
                        variacion !== null
                            ? formatearPorcentaje(
                                variacion
                            )
                            : "—"
                    }
                </strong>
            </div>

        </div>


        <table class="historico-tabla">

            <thead>

                <tr>
                    <th>Fecha</th>
                    <th>Precio</th>
                    <th>Disponibilidad</th>
                </tr>

            </thead>


            <tbody>

                ${
                    lecturas
                        .slice()
                        .reverse()
                        .map(
                            lectura => `

                            <tr>

                                <td>
                                    ${escaparHTML(
                                        formatearFecha(
                                            lectura.fecha
                                        )
                                    )}
                                </td>

                                <td>
                                    ${
                                        lectura.precio
                                            ? formatearPrecio(
                                                lectura.precio
                                            )
                                            : "—"
                                    }
                                </td>

                                <td>
                                    ${escaparHTML(
                                        lectura.disponibilidad ||
                                        "—"
                                    )}
                                </td>

                            </tr>
                        `
                        )
                        .join("")
                }

            </tbody>

        </table>
    `;


    document
        .getElementById(
            "modal-historico"
        )
        .classList.remove("oculto");
}


function cerrarModal() {

    document
        .getElementById(
            "modal-historico"
        )
        .classList.add("oculto");
}


/*
 * ============================================================
 * BÚSQUEDA
 * ============================================================
 */

function aplicarBusqueda(event) {

    const texto =
        event.target.value
            .trim()
            .toLowerCase();


    if (!texto) {

        renderizarCatalogo();

        return;
    }


    const resultados =
        [...productos.values()]
            .filter(producto => {

                const contenido = [

                    producto.nombre,

                    producto.linea,

                    producto.ean,

                    ...Object.values(
                        producto.sitios
                    ).map(
                        sitio =>
                            sitio.nombre
                    )

                ]
                    .join(" ")
                    .toLowerCase();


                return contenido.includes(
                    texto
                );
            });


    renderizarCatalogo(
        resultados
    );
}


/*
 * ============================================================
 * VISTA
 * ============================================================
 */

function cambiarVista(vista) {

    vistaActual = vista;


    const catalogo =
        document.getElementById(
            "catalogo-productos"
        );


    document
        .getElementById("vista-grid")
        .classList.toggle(
            "activo",
            vista === "grid"
        );


    document
        .getElementById("vista-lista")
        .classList.toggle(
            "activo",
            vista === "lista"
        );


    catalogo.classList.toggle(
        "lista",
        vista === "lista"
    );
}


/*
 * ============================================================
 * VOLVER
 * ============================================================
 */

function mostrarCatalogo() {

    productoActual = null;


    document
        .getElementById(
            "detalle-producto"
        )
        .classList.add("oculto");


    document
        .getElementById(
            "catalogo-productos"
        )
        .classList.remove("oculto");


    aplicarBusqueda({
        target: document.getElementById(
            "busqueda"
        )
    });
}


/*
 * ============================================================
 * IMÁGENES
 * ============================================================
 */

function obtenerImagenProducto(producto) {

    /*
     * Por ahora no hacemos fetch al sitio
     * del comercio desde GitHub Pages.
     *
     * Dejamos preparado el campo para
     * incorporar imágenes después.
     */

    return producto.imagen || null;
}


/*
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

function limpiar(valor) {

    if (
        valor === undefined ||
        valor === null
    ) {

        return "";
    }


    return String(valor).trim();
}


function convertirPrecio(valor) {

    if (
        valor === undefined ||
        valor === null ||
        String(valor).trim() === ""
    ) {

        return null;
    }


    let texto =
        String(valor)
            .trim()
            .replace(/\$/g, "")
            .replace(/\s/g, "");


    /*
     * Adaptamos tanto:
     *
     * 9800
     * 9.800
     * 9800,50
     * 9.800,50
     */

    if (
        texto.includes(".") &&
        texto.includes(",")
    ) {

        texto =
            texto
                .replace(/\./g, "")
                .replace(",", ".");

    } else if (
        texto.includes(",")
    ) {

        texto =
            texto.replace(",", ".");
    }


    const numero =
        Number(texto);


    return Number.isFinite(numero)
        ? numero
        : null;
}


function contarSitiosDisponibles(
    producto
) {

    return Object.values(
        producto.sitios
    ).filter(
        sitio =>
            sitio.ultima &&
            typeof sitio.ultima.precio ===
                "number" &&
            sitio.ultima.precio > 0
    ).length;
}


function formatearPrecio(valor) {

    return new Intl.NumberFormat(
        "es-AR",
        {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 2
        }
    ).format(valor);
}


function formatearPorcentaje(valor) {

    const signo =
        valor > 0
            ? "+"
            : "";

    return (
        signo +
        valor.toFixed(2) +
        "%"
    );
}


function formatearFecha(valor) {

    const timestamp =
        convertirFecha(valor);


    if (!timestamp) {
        return valor || "—";
    }


    return new Intl.DateTimeFormat(
        "es-AR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    ).format(
        new Date(timestamp)
    );
}


function escaparHTML(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function actualizarEstado(texto) {

    document
        .getElementById(
            "estado-datos"
        )
        .textContent = texto;
}


function mostrarErrorCarga() {

    const catalogo =
        document.getElementById(
            "catalogo-productos"
        );


    catalogo.innerHTML = `

        <div class="sin-resultados">

            <div>⚠️</div>

            <h2>
                No pudimos cargar los precios
            </h2>

            <p>
                Revisá tu conexión e intentá
                nuevamente.
            </p>

        </div>
    `;
}
