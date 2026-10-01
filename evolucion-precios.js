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

const DESCUENTOS_SHEET_GID = "1075623142";

const LOGOS_COMERCIOS_SHEET_GID = "247832143";

// Match_Productos se referencia por NOMBRE de pestaña (no por gid),
// para no depender de su posición dentro del spreadsheet.
const MATCH_PRODUCTOS_SHEET_NOMBRE = "Match_Productos";

const SHEET_CSV_URL =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;

const MATCH_PRODUCTOS_CSV_URL =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(MATCH_PRODUCTOS_SHEET_NOMBRE)}`;

const CACHE_KEY = "evolucionPreciosCache";
const CACHE_MAX_AGE = 10 * 60 * 1000;

const MAX_EDAD_LECTURA_MS = 48 * 60 * 60 * 1000;
/*
 * ============================================================
 * ESTADO
 * ============================================================
 */

let productos = new Map();

let productoActual = null;

let vistaActual = "grid";

let descuentosPorComercio = {};

let logosPorComercio = {};

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

        const [filas, imagenes, , , mapaGrupos] =
            await Promise.all([
                cargarDatos(),
                cargarImagenesProductos(),
                cargarDescuentos(),
                cargarLogosComercios(),
                cargarMatchProductos()
            ]);

        procesarFilas(
            filas,
            imagenes,
            mapaGrupos
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

    const indiceSku =
        encabezados.indexOf("sku");

    const indiceSitio =
        encabezados.indexOf("sitio");


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

        const sku =
            indiceSku !== -1
                ? limpiar(filas[i][indiceSku])
                : "";

        const sitio =
            indiceSitio !== -1
                ? limpiar(filas[i][indiceSitio])
                : "";

        if (!imageurl) {
            continue;
        }

        /*
         * Misma convención de clave que construirIdentificador():
         * "ean:<valor>" si hay EAN, o "sku:<sitio>:<valor>" si no
         * (combos/kits de Maxiconsumo, Farmacity, Farmaonline, etc.
         * que no exponen EAN real). Así una imagen guardada por
         * sku+sitio se puede encontrar con el mismo identificador
         * que arma procesarFilas() para esa fila.
         */

        const clave =
            construirIdentificador(
                ean,
                sku,
                sitio
            );

        if (clave) {

            imagenes.set(
                clave,
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
 * ------------------------------------------------------------
 * MATCH DE PRODUCTOS (agrupación unificada)
 * ------------------------------------------------------------
 * Lee la pestaña "Match_Productos" (identificador | nombre_detectado |
 * linea | sitios | grupo_id) y arma un mapa:
 *
 *     identificador ("ean:123..." o "sku:sitio:456") -> grupo_id
 *
 * Solo se cargan las filas que YA tienen grupo_id asignado (las que
 * unificar_grupos.py todavía no resolvió quedan afuera del mapa, y el
 * producto se sigue mostrando por su propio identificador, sin agrupar
 * con nada más).
 *
 * Es tolerante a fallos: si la pestaña todavía no existe o falla la
 * carga, devuelve un mapa vacío en vez de romper todo el catálogo — la
 * agrupación unificada es una mejora, no algo de lo que dependa poder
 * mostrar los precios.
 * ------------------------------------------------------------
 */
async function cargarMatchProductos() {

    try {

        const respuesta = await fetch(
            MATCH_PRODUCTOS_CSV_URL,
            {
                cache: "no-store"
            }
        );

        if (!respuesta.ok) {

            console.warn(
                `No se pudo cargar Match_Productos (HTTP ${respuesta.status}). Se sigue sin agrupación unificada.`
            );

            return new Map();
        }

        const texto =
            await respuesta.text();

        const filas =
            parsearCSV(texto);

        const mapa =
            new Map();

        if (!filas.length) {
            return mapa;
        }

        const encabezados =
            filas[0].map(
                valor =>
                    valor.trim().toLowerCase()
            );

        const indiceId =
            encabezados.indexOf("identificador");

        const indiceGrupo =
            encabezados.indexOf("grupo_id");

        if (
            indiceId === -1 ||
            indiceGrupo === -1
        ) {

            console.warn(
                "Match_Productos no tiene las columnas 'identificador'/'grupo_id' esperadas."
            );

            return mapa;
        }

        for (
            let i = 1;
            i < filas.length;
            i++
        ) {

            const identificador =
                limpiar(
                    filas[i][indiceId]
                ).toLowerCase();

            const grupoId =
                limpiar(
                    filas[i][indiceGrupo]
                );

            if (
                identificador &&
                grupoId
            ) {

                mapa.set(
                    identificador,
                    grupoId
                );
            }
        }

        console.log(
            `Grupos unificados cargados: ${mapa.size}`
        );

        return mapa;

    } catch (error) {

        console.warn(
            "No se pudo cargar Match_Productos:",
            error
        );

        return new Map();
    }
}

async function cargarLogosComercios() {

    const url =
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${LOGOS_COMERCIOS_SHEET_GID}`;

    const respuesta = await fetch(
        url,
        {
            cache: "no-store"
        }
    );

    if (!respuesta.ok) {

        throw new Error(
            `Error HTTP logos comercios ${respuesta.status}`
        );
    }

    const texto =
        await respuesta.text();

    const filas =
        parsearCSV(texto);

    logosPorComercio = {};

    if (!filas.length) {
        return;
    }

    const encabezados =
        filas[0].map(
            valor =>
                valor
                    .trim()
                    .toLowerCase()
        );

    const indiceComercio =
        encabezados.indexOf("comercio");

    const indiceNombre =
        encabezados.indexOf("nombre");

    const indiceLogo =
        encabezados.indexOf("logo_url");

    if (
        indiceComercio === -1 ||
        indiceLogo === -1
    ) {

        console.warn(
            "Logos_Comercios no contiene las columnas comercio y logo_url."
        );

        return;
    }

    for (
        let i = 1;
        i < filas.length;
        i++
    ) {

        const comercio =
            limpiar(
                filas[i][indiceComercio]
            )
                .toLowerCase();

        const nombre =
            indiceNombre !== -1
                ? limpiar(
                    filas[i][indiceNombre]
                )
                : "";

        const logo =
            limpiar(
                filas[i][indiceLogo]
            );

        if (
            comercio &&
            logo
        ) {

            logosPorComercio[
                comercio
            ] = {

                logo,

                nombre:
                    nombre ||
                    NOMBRES_SITIOS[comercio] ||
                    comercio
            };
        }
    }

    console.log(
        "Logos de comercios cargados:",
        Object.keys(logosPorComercio).length
    );
}

async function cargarDescuentos() {

    const url =
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${DESCUENTOS_SHEET_GID}`;

    const respuesta = await fetch(
        url,
        {
            cache: "no-store"
        }
    );

    if (!respuesta.ok) {
        throw new Error(
            `Error HTTP descuentos ${respuesta.status}`
        );
    }

    const texto =
        await respuesta.text();

    const filas =
        parsearCSV(texto);

    descuentosPorComercio = {};

    if (!filas.length) {
        return;
    }

    const encabezados =
        filas[0].map(
            valor =>
                valor
                    .trim()
                    .toLowerCase()
        );

    const indiceComercio =
        encabezados.indexOf(
            "comercio"
        );

    const indiceDescuento =
        encabezados.indexOf(
            "descuento"
        );

    if (
        indiceComercio === -1 ||
        indiceDescuento === -1
    ) {
        console.warn(
            "No se encontraron las columnas Comercio y Descuento."
        );
        return;
    }

    for (
        let i = 1;
        i < filas.length;
        i++
    ) {

        const comercio =
            String(
                filas[i][indiceComercio] || ""
            )
                .trim()
                .toLowerCase();

        let descuento =
            String(
                filas[i][indiceDescuento] || ""
            )
                .trim();

        if (!comercio) {
            continue;
        }

        /*
         * Ejemplos:
         * 20,00%
         * 30,00%
         * 42,50%
         */

        descuento =
            descuento
                .replace("%", "")
                .replace(",", ".");

        const numero =
            Number(descuento);

        if (
            Number.isFinite(numero) &&
            numero >= 0 &&
            numero <= 100
        ) {
            descuentosPorComercio[
                comercio
            ] = numero;
        }
    }

    console.log(
        "Descuentos cargados:",
        descuentosPorComercio
    );
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
 * IDENTIFICADOR / AGRUPACIÓN
 * ============================================================
 * Misma convención que usan generar_match_productos.py y
 * unificar_grupos.py del lado del backend:
 *
 *     "ean:<valor>"          si la fila tiene EAN
 *     "sku:<sitio>:<valor>"  si no tiene EAN pero sí SKU
 *     null                   si no tiene ninguno de los dos
 *
 * obtenerClaveProducto() traduce ese identificador a la clave real que
 * se usa para agrupar en el catálogo: si Match_Productos ya tiene un
 * grupo_id para ese identificador, se usa el grupo_id (así se agrupan
 * variantes con distinto EAN/SKU entre comercios); si todavía no fue
 * unificado, se usa el identificador tal cual (se agrupa solo consigo
 * mismo, como venía funcionando antes con el EAN).
 * ============================================================
 */

function construirIdentificador(ean, sku, sitio) {

    ean = limpiar(ean);
    sku = limpiar(sku);
    sitio = limpiar(sitio).toLowerCase();

    /*
     * Algunos sitios (confirmado en Farmacity, para varios
     * combos/kits) devuelven literalmente "0" como EAN en vez de
     * dejarlo vacío. Si se lo trata como EAN real, productos
     * distintos con ean="0" terminan agrupados como si fueran el
     * mismo producto. Mismo criterio que limpiar_ean() en
     * buscador_precios.py.
     */
    if (ean && /^0+$/.test(ean)) {
        ean = "";
    }

    if (ean) {
        return `ean:${ean}`.toLowerCase();
    }

    if (sku && sitio) {
        return `sku:${sitio}:${sku}`.toLowerCase();
    }

    return null;
}


function obtenerClaveProducto(identificador, mapaGrupos) {

    if (!identificador) {
        return null;
    }

    const grupoId =
        mapaGrupos?.get(identificador);

    if (grupoId) {
        return `grupo:${grupoId.toLowerCase()}`;
    }

    return identificador;
}


function formatearIdentificador(identificador) {

    if (!identificador) {
        return "";
    }

    if (identificador.startsWith("ean:")) {
        return `EAN ${identificador.slice(4)}`;
    }

    const match =
        identificador.match(/^sku:([^:]+):(.+)$/);

    if (match) {

        const sitioNombre =
            NOMBRES_SITIOS[match[1]] ||
            match[1];

        return `SKU ${match[2]} (${sitioNombre})`;
    }

    return identificador;
}


/*
 * ============================================================
 * PROCESAMIENTO
 * ============================================================
 */

function procesarFilas(
    filas,
    imagenes = new Map(),
    mapaGrupos = new Map()
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
            encabezados.indexOf("ean"),

        sku:
            encabezados.indexOf("sku")
    };


    for (
        let i = 1;
        i < filas.length;
        i++
    ) {

        const fila = filas[i];


        const sitio =
            limpiar(fila[indice.sitio]);


        if (!sitio) {
            continue;
        }


        const ean =
            limpiar(fila[indice.ean]);


        const sku =
            indice.sku !== -1
                ? limpiar(fila[indice.sku])
                : "";


        /*
         * Sin EAN ni SKU no podemos garantizar
         * que sea el mismo producto entre lecturas.
         */

        const identificador =
            construirIdentificador(
                ean,
                sku,
                sitio
            );

        if (!identificador) {
            continue;
        }


        const clave =
            obtenerClaveProducto(
                identificador,
                mapaGrupos
            );


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

        if (!productos.has(clave)) {

            productos.set(
                clave,

                {
                    clave,

                    identificador,

                    ean: ean || null,

                    nombre:
                        productoNombre ||
                        "Producto sin nombre",

                    linea,

                    imagen:
                        imagenes.get(identificador) ||
                        null,

                    sitios: {}
                }
            );
        }


        const producto =
            productos.get(clave);


        /*
         * Conservamos el primer EAN "real" que
         * encontremos, por si el producto se
         * armó primero a partir de una fila sin
         * EAN (agrupado por grupo_id/SKU) y
         * después aparece una fila con EAN.
         */

        if (
            !producto.ean &&
            ean
        ) {

            producto.ean = ean;
        }


        /*
         * Si todavía no tenemos imagen, probamos con
         * el identificador de ESTA fila (puede ser una
         * fila con EAN o una fila sku+sitio distinta a
         * la que creó el producto, si vino agrupado por
         * Match_Productos).
         */

        if (!producto.imagen) {

            producto.imagen =
                imagenes.get(identificador) ||
                null;
        }


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
         *
         * Nota: como la clave del producto ya puede
         * venir de un grupo_id unificado, dos
         * identificadores distintos (ej. dos EANs de
         * un mismo producto unificados a mano) que
         * vendan en el MISMO sitio van a acumular sus
         * lecturas en el mismo arreglo "lecturas" de
         * ese sitio, conservando el histórico completo.
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

            sitio.penultima =
                sitio.lecturas.length >= 2
                    ? sitio.lecturas[
                        sitio.lecturas.length - 2
                    ]
                    : null;
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

function lecturaEstaActualizada(lectura) {

    if (!lectura || !lectura.fecha) {
        return false;
    }

    const timestamp =
        convertirFecha(lectura.fecha);

    if (!timestamp) {
        return false;
    }

    return (
        Date.now() - timestamp
        <= MAX_EDAD_LECTURA_MS
    );
}

function sitioEstaActualizado(sitio) {

    return lecturaEstaActualizada(
        sitio?.ultima
    );
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
                producto.clave
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

    const comercioMinimo =
        obtenerComercioPrecioMinimo(
            producto
        );

    const logoComercioMinimo =
        comercioMinimo
            ? obtenerLogoComercio(
                comercioMinimo.id
            )
            : null;    

    const tendencia =
        obtenerTendenciaPrecioMinimo(
            producto,
            precio
        );

    const sitios =
        contarSitiosDisponibles(
            producto
        );


    const etiquetaIdentificador =
        producto.ean
            ? `EAN ${producto.ean}`
            : formatearIdentificador(
                producto.identificador
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

            ${
                etiquetaIdentificador
                    ? `
                        <div class="producto-ean">
                            ${escaparHTML(etiquetaIdentificador)}
                        </div>
                    `
                    : ""
            }

            <div class="producto-resumen">

                <div class="producto-precio-bloque">

                    <div class="producto-desde">
                        Desde
                    </div>

                    <div class="producto-precio-fila">

                        <div class="producto-precio">
                            ${
                                precio !== null
                                    ? formatearPrecio(precio)
                                    : "Sin precio"
                            }
                        </div>

                        ${
                            logoComercioMinimo
                                ? `
                                    <div class="producto-mejor-comercio">
                                        <img
                                            src="${escaparHTML(logoComercioMinimo)}"
                                            alt="${escaparHTML(comercioMinimo.nombre)}"
                                            loading="lazy"
                                            onerror="this.parentElement.style.display='none';"
                                        >
                                    </div>
                                `
                                : ""
                        }

                    </div>

                    ${tendencia}

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
            sitioEstaActualizado(sitio) &&
            typeof sitio.ultima.precio === "number" &&
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

function obtenerComercioPrecioMinimo(producto) {

    let mejor = null;

    for (const [id, sitio] of Object.entries(producto.sitios)) {

        if (
            !sitioEstaActualizado(sitio) ||
            typeof sitio.ultima?.precio !== "number" ||
            sitio.ultima.precio <= 0
        ) {
            continue;
        }

        if (
            !mejor ||
            sitio.ultima.precio < mejor.precio
        ) {
            mejor = {
                id,
                nombre: sitio.nombre,
                precio: sitio.ultima.precio
            };
        }
    }

    return mejor;
}

/*
 * ============================================================
 * TENDENCIA DEL PRECIO MÍNIMO
 * ============================================================
 */
function obtenerLecturaPreviaValida(sitio) {

    for (let i = sitio.lecturas.length - 2; i >= 0; i--) {

        const precio = sitio.lecturas[i].precio;

        if (typeof precio === "number" && precio > 0) {
            return sitio.lecturas[i];
        }
    }

    return null;
}


function obtenerMinimoDeLecturaAnterior(producto) {

    const anteriores = [];

    for (const sitio of Object.values(producto.sitios)) {

        // Solo comercios con precio vigente (mismo criterio que el precio actual)
        if (
            !sitioEstaActualizado(sitio) ||
            typeof sitio.ultima?.precio !== "number" ||
            sitio.ultima.precio <= 0
        ) {
            continue;
        }

        const previa = obtenerLecturaPreviaValida(sitio);

        // Si el comercio no tiene lectura previa, se toma su precio actual
        // (no aporta ni suba ni baja).
        anteriores.push(
            previa ? previa.precio : sitio.ultima.precio
        );
    }

    return anteriores.length
        ? Math.min(...anteriores)
        : null;
}


function obtenerTendenciaPrecioMinimo(
    producto,
    precioActual
) {

    if (
        typeof precioActual !== "number" ||
        precioActual <= 0
    ) {
        return "";
    }

    const precioAnterior =
        obtenerMinimoDeLecturaAnterior(
            producto
        );

    if (
        typeof precioAnterior !== "number" ||
        precioAnterior <= 0
    ) {
        return "";
    }

    const variacion =
        calcularVariacionPrecio(
            precioActual,
            precioAnterior
        );

    if (variacion === null) {
        return "";
    }

    if (variacion < 0) {

        return `
            <div class="tendencia-precio tendencia-baja">
                ↓ Bajó ${Math.abs(variacion).toFixed(2)}%
            </div>
        `;
    }

    if (variacion > 0) {

        return `
            <div class="tendencia-precio tendencia-sube">
                ↑ Subió ${variacion.toFixed(2)}%
            </div>
        `;
    }

    return `
        <div class="tendencia-precio tendencia-igual">
            = Sin cambios
        </div>
    `;
}
/*
 * ============================================================
 * DETALLE
 * ============================================================
 */

function mostrarDetalle(clave) {

    const producto =
        productos.get(clave);


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


    const etiquetaIdentificador =
        producto.ean
            ? `EAN: ${producto.ean}`
            : formatearIdentificador(
                producto.identificador
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

                ${
                    etiquetaIdentificador
                        ? `
                            <div class="detalle-ean">
                                ${escaparHTML(etiquetaIdentificador)}
                            </div>
                        `
                        : ""
                }

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

            const actualizadoA =
                sitioEstaActualizado(a);

            const actualizadoB =
                sitioEstaActualizado(b);

            if (actualizadoA !== actualizadoB) {
                return actualizadoA
                    ? -1
                    : 1;
            }

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

            const actualizado =
                sitioEstaActualizado(sitio);

            const descuento =
                obtenerDescuento(
                    productoActual.ean ||
                        productoActual.clave,
                    id
                );

            const precio =
                actualizado
                    ? sitio.ultima?.precio
                    : null;

            const efectivo =
                actualizado
                    ? calcularPrecioEfectivo(
                        precio,
                        descuento
                    )
                    : null;


            return {
                id,
                sitio,
                descuento,
                precio,
                efectivo,
                actualizado
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

function calcularVariacionPrecio(
    actual,
    anterior
) {

    if (
        typeof actual !== "number" ||
        typeof anterior !== "number" ||
        anterior <= 0
    ) {
        return null;
    }

    return (
        (actual - anterior) /
        anterior
    ) * 100;
}

function obtenerTextoTendencia(
    actual,
    anterior
) {

    const variacion =
        calcularVariacionPrecio(
            actual,
            anterior
        );

    if (variacion === null) {
        return "";
    }

    if (variacion < 0) {

        return `
            <div class="tendencia-precio tendencia-baja">
                ↓ Bajó ${Math.abs(variacion).toFixed(2)}%
            </div>
        `;
    }

    if (variacion > 0) {

        return `
            <div class="tendencia-precio tendencia-sube">
                ↑ Subió ${variacion.toFixed(2)}%
            </div>
        `;
    }

    return `
        <div class="tendencia-precio tendencia-igual">
            = Sin cambios
        </div>
    `;
}

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


    const actualizado =
        sitioEstaActualizado(sitio);

    tarjeta.className =
        "comercio-card" +
        (
            esMejor
                ? " mejor"
                : ""
        ) +
        (
            actualizado
                ? ""
                : " lectura-desactualizada"
        );


    const ultima =
        sitio.ultima;

    const previa =
        obtenerLecturaPreviaValida(sitio);

    // Un precio desactualizado no tiene tendencia que mostrar
    const tendencia =
        actualizado
            ? obtenerTextoTendencia(
                ultima?.precio,
                previa?.precio
            )
            : "";


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


        <div class="comercio-identidad">

            ${
                obtenerLogoComercio(id)
                    ? `
                        <div class="comercio-logo">

                            <img
                                src="${escaparHTML(
                                    obtenerLogoComercio(id)
                                )}"
                                alt="${escaparHTML(
                                    sitio.nombre
                                )}"
                                loading="lazy"
                                onerror="
                                    this.parentElement.style.display='none';
                                "
                            >

                        </div>
                    `
                    : ""
            }

            <div class="comercio-nombre">
                ${escaparHTML(
                    sitio.nombre
                )}
            </div>

        </div>

        ${
            actualizado
                ? ""
                : `
                    <div class="alerta-lectura">
                        ⚠️ Lectura desactualizada
                    </div>
                `
        }


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
        ${tendencia}

        <div class="descuento-fila">

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
        
        </div>

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
                productoActual.ean ||
                    productoActual.clave,
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

        return (
            descuentosPorComercio[
                String(sitio)
                    .trim()
                    .toLowerCase()
            ] ?? 0
        );
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

                    producto.identificador,

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

function obtenerLogoComercio(id) {

    const comercio =
        String(id || "")
            .trim()
            .toLowerCase();

    return (
        logosPorComercio[comercio]?.logo ||
        null
    );
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


function contarSitiosDisponibles(producto) {

    return Object.values(
        producto.sitios
    ).filter(
        sitio =>
            sitioEstaActualizado(sitio) &&
            typeof sitio.ultima.precio === "number" &&
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
