/*
 * ============================================================
 * AGRUPACIÓN Y ORDEN DEL CATÁLOGO (módulo independiente)
 * ============================================================
 * Permite crear grupos de productos en la página principal,
 * mover tarjetas entre grupos y ordenarlas. Todo se guarda en
 * localStorage (solo en este navegador).
 *
 * Estructura guardada:
 * {
 *   grupos:   [{ id, nombre, productos: [clave, ...] }, ...],
 *   sinGrupo: [clave, ...]   // orden de los productos sueltos
 * }
 *
 * "clave" es producto.clave del front principal.
 *
 * Los productos nuevos (que no estén en ninguna lista) aparecen
 * al final de "Sin grupo". Las claves que ya no existen se
 * ignoran al dibujar, pero no se borran del almacenamiento
 * (así una carga fallida no te hace perder la organización).
 * ============================================================
 */

const STORAGE_KEY = "catalogoAgrupacion_v1";

let config = null;
let modoEdicion = false;
let estado = cargarEstado();


/* ------------------------------------------------------------
 * API PÚBLICA
 * ------------------------------------------------------------
 * iniciarAgrupacion({
 *   obtenerProductos: () => [...productos.values()],
 *   crearTarjeta:     producto => HTMLElement,
 *   volverARenderizar: () => void
 * })
 */

export function iniciarAgrupacion(opciones) {

    config = opciones;

    crearBotonOrganizar();
}


/*
 * Devuelve true si dibujó el catálogo agrupado. Si devuelve
 * false, el front principal dibuja la grilla normal.
 */

export function renderizarAgrupado(contenedor, lista) {

    if (!config) {
        return false;
    }

    const hayGrupos =
        estado.grupos.length > 0;

    if (!hayGrupos && !modoEdicion) {
        return false;
    }

    const porClave =
        mapaProductos();

    // En modo edición se muestran todos (los movimientos
    // operan sobre la lista completa).
    const visibles =
        modoEdicion
            ? null
            : new Set(lista.map(p => p.clave));

    const pasa =
        clave =>
            porClave.has(clave) &&
            (!visibles || visibles.has(clave));


    contenedor.innerHTML = "";

    if (modoEdicion) {
        contenedor.appendChild(crearBarraEdicion());
    }

    estado.grupos.forEach((grupo, indice) => {

        const claves =
            grupo.productos.filter(pasa);

        if (!modoEdicion && !claves.length) {
            return;
        }

        contenedor.appendChild(
            crearSeccion(grupo, claves, porClave, indice)
        );
    });

    const libres =
        clavesSinGrupo(porClave).filter(pasa);

    if (libres.length || modoEdicion) {

        contenedor.appendChild(
            crearSeccion(null, libres, porClave, -1)
        );
    }

    return true;
}


/* ------------------------------------------------------------
 * PERSISTENCIA
 * ------------------------------------------------------------ */

function cargarEstado() {

    try {

        const guardado =
            JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            );

        if (
            guardado &&
            Array.isArray(guardado.grupos) &&
            Array.isArray(guardado.sinGrupo)
        ) {
            return guardado;
        }

    } catch {
        /* datos corruptos o sin storage */
    }

    return { grupos: [], sinGrupo: [] };
}


function guardarEstado() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(estado)
        );

    } catch (error) {

        console.warn(
            "No se pudo guardar la agrupación:",
            error
        );
    }
}


/* ------------------------------------------------------------
 * DATOS
 * ------------------------------------------------------------ */

function mapaProductos() {

    return new Map(
        config.obtenerProductos()
            .map(p => [p.clave, p])
    );
}


/*
 * Orden efectivo de los productos sin grupo: primero los que
 * ya tienen posición guardada, después los nuevos.
 */

function clavesSinGrupo(porClave) {

    const enGrupo =
        new Set(
            estado.grupos.flatMap(g => g.productos)
        );

    const orden = [];
    const vistos = new Set();

    for (const clave of estado.sinGrupo) {

        if (
            porClave.has(clave) &&
            !enGrupo.has(clave) &&
            !vistos.has(clave)
        ) {
            orden.push(clave);
            vistos.add(clave);
        }
    }

    for (const clave of porClave.keys()) {

        if (
            !vistos.has(clave) &&
            !enGrupo.has(clave)
        ) {
            orden.push(clave);
            vistos.add(clave);
        }
    }

    return orden;
}


/*
 * Fija en el estado el orden actual de "sin grupo" antes de
 * mover algo (incluye los productos nuevos).
 */

function materializar() {

    estado.sinGrupo =
        clavesSinGrupo(mapaProductos());
}


function listaDe(grupoId) {

    if (!grupoId) {
        return estado.sinGrupo;
    }

    return estado.grupos.find(
        g => g.id === grupoId
    )?.productos || null;
}


/* ------------------------------------------------------------
 * OPERACIONES
 * ------------------------------------------------------------ */

function cambioHecho() {

    guardarEstado();

    config.volverARenderizar();
}


function moverProducto(clave, grupoDestino, antesDe = null) {

    materializar();

    const destino =
        listaDe(grupoDestino);

    if (!destino) {
        return;
    }

    for (const lista of [
        estado.sinGrupo,
        ...estado.grupos.map(g => g.productos)
    ]) {

        const i = lista.indexOf(clave);

        if (i !== -1) {
            lista.splice(i, 1);
        }
    }

    const posicion =
        antesDe
            ? destino.indexOf(antesDe)
            : -1;

    if (posicion >= 0) {
        destino.splice(posicion, 0, clave);
    } else {
        destino.push(clave);
    }

    cambioHecho();
}


function desplazarProducto(clave, grupoId, delta) {

    materializar();

    const lista =
        listaDe(grupoId);

    if (!lista) {
        return;
    }

    const i = lista.indexOf(clave);
    const j = i + delta;

    if (i === -1 || j < 0 || j >= lista.length) {
        return;
    }

    [lista[i], lista[j]] =
        [lista[j], lista[i]];

    cambioHecho();
}


function crearGrupo() {

    const nombre =
        prompt("Nombre del nuevo grupo:");

    if (!nombre || !nombre.trim()) {
        return;
    }

    materializar();

    estado.grupos.push({
        id:
            "g" +
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 6),
        nombre: nombre.trim(),
        productos: []
    });

    cambioHecho();
}


function renombrarGrupo(grupo) {

    const nombre =
        prompt("Nuevo nombre del grupo:", grupo.nombre);

    if (!nombre || !nombre.trim()) {
        return;
    }

    grupo.nombre = nombre.trim();

    cambioHecho();
}


function desplazarGrupo(indice, delta) {

    const j = indice + delta;

    if (j < 0 || j >= estado.grupos.length) {
        return;
    }

    [estado.grupos[indice], estado.grupos[j]] =
        [estado.grupos[j], estado.grupos[indice]];

    cambioHecho();
}


function eliminarGrupo(grupo) {

    if (
        !confirm(
            `¿Eliminar el grupo "${grupo.nombre}"?\n` +
            "Sus productos pasan a \"Sin grupo\"."
        )
    ) {
        return;
    }

    materializar();

    estado.sinGrupo.push(...grupo.productos);

    estado.grupos =
        estado.grupos.filter(g => g !== grupo);

    cambioHecho();
}


function restablecer() {

    if (
        !confirm(
            "Se borrarán todos los grupos y el orden personalizado.\n\n¿Continuar?"
        )
    ) {
        return;
    }

    estado = { grupos: [], sinGrupo: [] };

    cambioHecho();
}


/* ------------------------------------------------------------
 * INTERFAZ
 * ------------------------------------------------------------ */

function el(etiqueta, clase, texto) {

    const nodo =
        document.createElement(etiqueta);

    if (clase) {
        nodo.className = clase;
    }

    if (texto !== undefined) {
        nodo.textContent = texto;
    }

    return nodo;
}


function boton(texto, titulo, alClick, clase = "") {

    const b =
        el("button", `org-btn ${clase}`.trim(), texto);

    b.type = "button";
    b.title = titulo;

    b.addEventListener("click", event => {
        event.stopPropagation();
        alClick();
    });

    return b;
}


function crearBotonOrganizar() {

    const referencia =
        document.getElementById("vista-lista");

    if (
        !referencia ||
        document.getElementById("btn-organizar")
    ) {
        return;
    }

    const b =
        el("button", "", "🗂️ Organizar");

    b.type = "button";
    b.id = "btn-organizar";

    b.className =
        referencia.className
            .replace("activo", "")
            .trim();

    b.addEventListener("click", () => {

        modoEdicion = !modoEdicion;

        if (modoEdicion) {

            const busqueda =
                document.getElementById("busqueda");

            if (busqueda) {
                busqueda.value = "";
            }
        }

        b.classList.toggle("activo", modoEdicion);

        config.volverARenderizar();
    });

    referencia.parentElement.appendChild(b);
}


function crearBarraEdicion() {

    const barra =
        el("div", "org-barra");

    barra.appendChild(
        el(
            "span",
            "org-ayuda",
            "Modo organizar: arrastrá las tarjetas o usá los controles de cada una."
        )
    );

    barra.appendChild(
        boton("＋ Nuevo grupo", "Crear grupo", crearGrupo)
    );

    barra.appendChild(
        boton("↺ Restablecer", "Borrar la organización", restablecer)
    );

    barra.appendChild(
        boton(
            "✔ Listo",
            "Salir del modo organizar",
            () => document.getElementById("btn-organizar")?.click(),
            "org-btn-principal"
        )
    );

    return barra;
}


function crearSeccion(grupo, claves, porClave, indice) {

    const seccion =
        el("section", "catalogo-grupo");

    const grupoId =
        grupo ? grupo.id : "";

    if (grupo || estado.grupos.length) {

        const cabecera =
            el("div", "catalogo-grupo-cabecera");

        cabecera.appendChild(
            el(
                "h3",
                "catalogo-grupo-titulo",
                grupo ? grupo.nombre : "Sin grupo"
            )
        );

        cabecera.appendChild(
            el("span", "catalogo-grupo-cantidad", String(claves.length))
        );

        if (modoEdicion && grupo) {

            cabecera.append(
                boton("✏️", "Renombrar", () => renombrarGrupo(grupo)),
                boton("↑", "Subir grupo", () => desplazarGrupo(indice, -1)),
                boton("↓", "Bajar grupo", () => desplazarGrupo(indice, 1)),
                boton("🗑️", "Eliminar grupo", () => eliminarGrupo(grupo))
            );
        }

        seccion.appendChild(cabecera);
    }

    const grilla =
        el("div", "catalogo-grupo-items");

    grilla.dataset.grupo = grupoId;

    if (modoEdicion) {

        // Soltar en el área vacía = agregar al final del grupo.
        grilla.addEventListener("dragover", event => {
            event.preventDefault();
        });

        grilla.addEventListener("drop", event => {

            event.preventDefault();

            const origen =
                event.dataTransfer.getData("text/plain");

            if (origen) {
                moverProducto(origen, grupoId || null);
            }
        });

        if (!claves.length) {

            grilla.appendChild(
                el(
                    "div",
                    "org-vacio",
                    "Arrastrá productos acá"
                )
            );
        }
    }

    for (const clave of claves) {

        grilla.appendChild(
            crearItem(
                porClave.get(clave),
                clave,
                grupoId
            )
        );
    }

    seccion.appendChild(grilla);

    return seccion;
}


function crearItem(producto, clave, grupoId) {

    const item =
        el("div", "org-item");

    item.dataset.clave = clave;

    const envoltorio =
        el("div", "org-tarjeta");

    envoltorio.appendChild(
        config.crearTarjeta(producto)
    );

    item.appendChild(envoltorio);

    if (!modoEdicion) {
        return item;
    }

    item.classList.add("org-editando");

    // En modo organizar, el click no abre el detalle.
    envoltorio.addEventListener(
        "click",
        event => {
            event.stopPropagation();
            event.preventDefault();
        },
        true
    );

    item.draggable = true;

    item.addEventListener("dragstart", event => {

        event.dataTransfer.setData("text/plain", clave);
        event.dataTransfer.effectAllowed = "move";

        item.classList.add("org-arrastrando");
    });

    item.addEventListener("dragend", () => {
        item.classList.remove("org-arrastrando");
    });

    item.addEventListener("dragover", event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    });

    item.addEventListener("drop", event => {

        event.preventDefault();
        event.stopPropagation();

        const origen =
            event.dataTransfer.getData("text/plain");

        if (origen && origen !== clave) {
            moverProducto(origen, grupoId || null, clave);
        }
    });

    // Controles (también sirven en pantallas táctiles).
    const controles =
        el("div", "org-controles");

    const selector =
        el("select", "org-select");

    selector.title = "Mover a otro grupo";

    selector.add(new Option("Sin grupo", ""));

    for (const g of estado.grupos) {
        selector.add(new Option(g.nombre, g.id));
    }

    selector.value = grupoId;

    selector.addEventListener("change", () => {
        moverProducto(clave, selector.value || null);
    });

    controles.append(
        boton("◀", "Mover antes", () => desplazarProducto(clave, grupoId || null, -1)),
        selector,
        boton("▶", "Mover después", () => desplazarProducto(clave, grupoId || null, 1))
    );

    item.appendChild(controles);

    return item;
}
