import * as api from "./api.js";
import * as vistas from "./vistas.js";

const app = document.querySelector("#app");
const accionesCabecera = document.querySelector("#acciones-cabecera");
const aviso = document.querySelector("#aviso");
const preferenciaSistema = window.matchMedia("(prefers-color-scheme: dark)");

let roles = [];
let usuario = null;
let rolSeleccionado = "";
let modoAcceso = "login";
let vistaActual = "mascotas";
let idMascotaChat = "";
let mensajesChat = [];
let progresoChat = 0;
let escribiendo = false;
let perfilAbierto = false;
let notificacionesAbiertas = false;
let notificaciones = [];
let temaManual = null;
let modoOscuro = preferenciaSistema.matches;
let temporizadorAviso;

try {
  const guardado = localStorage.getItem("verito-tema");
  if (guardado === "claro" || guardado === "oscuro") temaManual = guardado;
} catch (error) {
  console.warn("No se pudo leer la preferencia del tema.", error);
}

if (temaManual) modoOscuro = temaManual === "oscuro";
document.documentElement.dataset.tema = modoOscuro ? "oscuro" : "claro";

function mostrarAviso(texto, esError = false) {
  aviso.textContent = texto;
  aviso.classList.toggle("aviso-error", esError);
  aviso.classList.add("visible");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove("visible"), 3500);
}

function manejarError(error) {
  mostrarAviso(error instanceof Error ? error.message : "Ocurrió un error.", true);
}

async function renderizar() {
  if (!usuario) {
    accionesCabecera.innerHTML = vistas.encabezado(
      null,
      modoOscuro,
      false,
      false,
      [],
    );
    app.innerHTML = vistas.login(roles, modoAcceso, rolSeleccionado);
    return;
  }

  try {
    notificaciones = await api.obtenerNotificaciones();
    accionesCabecera.innerHTML = vistas.encabezado(
      usuario,
      modoOscuro,
      perfilAbierto,
      notificacionesAbiertas,
      notificaciones,
    );

    let contenido;
    if (usuario.Nombre_Rol === "Dueño" && vistaActual === "mascotas") {
      const [mascotas, especies] = await Promise.all([
        api.obtenerMascotas(),
        api.obtenerEspecies(),
      ]);
      contenido = vistas.vistaMascotas(mascotas, especies);
    } else if (usuario.Nombre_Rol === "Dueño" && vistaActual === "akinator") {
      const [mascotas, citas] = await Promise.all([
        api.obtenerMascotas(),
        api.obtenerCitas(),
      ]);
      mensajesChat
        .filter((mensaje) => mensaje.Tipo === "resultado")
        .forEach((mensaje) => {
          const cita = citas.find(
            (item) =>
              item.Id_Consulta_Akinator ===
              mensaje.Consulta.Id_Consulta_Akinator,
          );
          mensaje.CitaId = cita?.Id_Cita ?? null;
          mensaje.Estado_Cita = cita?.Estado_Cita ?? "";
          mensaje.Fecha_Cita = cita?.Fecha_Propuesta ?? "";
        });
      contenido = vistas.vistaAkinator(
        mascotas,
        idMascotaChat,
        mensajesChat,
        progresoChat,
        escribiendo,
      );
    } else if (usuario.Nombre_Rol === "Dueño" && vistaActual === "agendar") {
      const [mascotas, tiposCita] = await Promise.all([
        api.obtenerMascotas(),
        api.obtenerTiposCita(),
      ]);
      contenido = vistas.vistaAgendarCita(mascotas, tiposCita);
    } else {
      const citas = await api.obtenerCitas();
      contenido = vistas.vistaCitas(citas, usuario.Nombre_Rol === "Veterinario");
    }

    app.innerHTML = `
      ${vistas.menu(usuario.Nombre_Rol, vistaActual)}
      <div class="contenido-vista">${contenido}</div>`;
    const chat = document.querySelector("#mensajes-chat");
    if (chat) chat.scrollTop = chat.scrollHeight;
  } catch (error) {
    manejarError(error);
  }
}

// --- Actualización en sitio del chat (sin reconstruir #app) ---
function esRelevante(nodo) {
  return (
    nodo.nodeType === Node.ELEMENT_NODE ||
    (nodo.nodeType === Node.TEXT_NODE && nodo.nodeValue.trim() !== "")
  );
}

function sincronizarAtributos(actual, nuevo) {
  Array.from(actual.attributes).forEach((atributo) => {
    if (!nuevo.hasAttribute(atributo.name)) actual.removeAttribute(atributo.name);
  });
  Array.from(nuevo.attributes).forEach((atributo) => {
    if (actual.getAttribute(atributo.name) !== atributo.value) {
      actual.setAttribute(atributo.name, atributo.value);
    }
  });
}

function sincronizarHijos(actual, nuevo) {
  const viejos = Array.from(actual.childNodes).filter(esRelevante);
  const nuevos = Array.from(nuevo.childNodes).filter(esRelevante);

  nuevos.forEach((hijoNuevo, indice) => {
    const hijoViejo = viejos[indice];
    if (!hijoViejo) {
      actual.appendChild(hijoNuevo);
    } else if (
      hijoViejo.nodeType === hijoNuevo.nodeType &&
      hijoViejo.nodeName === hijoNuevo.nodeName
    ) {
      if (hijoViejo.nodeType === Node.TEXT_NODE) {
        if (hijoViejo.nodeValue !== hijoNuevo.nodeValue) {
          hijoViejo.nodeValue = hijoNuevo.nodeValue;
        }
      } else {
        sincronizarAtributos(hijoViejo, hijoNuevo);
        sincronizarHijos(hijoViejo, hijoNuevo);
      }
    } else {
      actual.replaceChild(hijoNuevo, hijoViejo);
    }
  });

  viejos.slice(nuevos.length).forEach((nodo) => nodo.remove());
}

// Devuelve false si el chat no está montado (entonces se usa renderizar()).
function actualizarChat() {
  const contenedor = document.querySelector("#mensajes-chat");
  const tarjeta = contenedor?.closest(".chat-tarjeta");
  if (!tarjeta || usuario?.Nombre_Rol !== "Dueño" || vistaActual !== "akinator") {
    return false;
  }

  const plantilla = document.createElement("template");
  plantilla.innerHTML = vistas.contenidoMensajes(mensajesChat, escribiendo);
  sincronizarHijos(contenedor, plantilla.content);

  const valorProgreso = tarjeta.querySelector(".chat-progreso-cabecera strong");
  if (valorProgreso) valorProgreso.textContent = `${progresoChat}%`;
  const barra = tarjeta.querySelector(".progreso-chat span");
  if (barra) barra.style.width = `${progresoChat}%`;

  const reinicio = tarjeta.querySelector(".reiniciar-chat");
  if (reinicio) reinicio.hidden = !idMascotaChat;
  const selector = tarjeta.querySelector("[data-mascota-chat]");
  if (selector && selector.value !== String(idMascotaChat)) {
    selector.value = idMascotaChat;
  }

  contenedor.scrollTop = contenedor.scrollHeight;
  return true;
}

async function refrescarChat() {
  if (!actualizarChat()) await renderizar();
}

async function esperarEscritura(texto, inicio) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const duracion = Math.min(1800, Math.max(650, texto.length * 19 + Math.random() * 320));
  const restante = duracion - (performance.now() - inicio);
  if (restante > 0) {
    await new Promise((resolve) => setTimeout(resolve, restante));
  }
}

async function iniciarArbol(idMascota) {
  idMascotaChat = idMascota;
  mensajesChat = [];
  progresoChat = 0;
  escribiendo = Boolean(idMascota);
  await refrescarChat();
  if (!idMascota) return;

  try {
    const inicioEscritura = performance.now();
    const pregunta = await api.iniciarAkinator(idMascota);
    await esperarEscritura(pregunta.Pregunta, inicioEscritura);
    mensajesChat.push({
      Tipo: "bot",
      Texto: pregunta.Pregunta,
      Opciones: pregunta.Opciones,
    });
    escribiendo = false;
    await refrescarChat();
  } catch (error) {
    escribiendo = false;
    manejarError(error);
    await refrescarChat();
  }
}

async function responderArbol(numeroOpcion) {
  const ultimaPregunta = mensajesChat[mensajesChat.length - 1];
  if (!ultimaPregunta || ultimaPregunta.Tipo !== "bot" || !ultimaPregunta.Opciones?.length) {
    return;
  }
  const opcion = ultimaPregunta.Opciones.find(
    (item) => item.Numero_Opcion === numeroOpcion,
  );
  if (!opcion) return;

  ultimaPregunta.Opciones = [];
  mensajesChat.push({ Tipo: "usuario", Texto: opcion.Texto_Opcion });
  escribiendo = true;
  await refrescarChat();

  try {
    const inicioEscritura = performance.now();
    const respuesta = await api.responderAkinator(numeroOpcion);
    const textoRespuesta =
      respuesta.Tipo_Respuesta === "Pregunta"
        ? respuesta.Pregunta
        : respuesta.Texto_Recomendacion;
    await esperarEscritura(textoRespuesta, inicioEscritura);
    if (respuesta.Tipo_Respuesta === "Pregunta") {
      progresoChat =
        ((respuesta.Numero_Pregunta - 1) / respuesta.Total_Preguntas) * 100;
      mensajesChat.push({
        Tipo: "bot",
        Texto: respuesta.Pregunta,
        Opciones: respuesta.Opciones,
      });
    } else {
      progresoChat = 100;
      mensajesChat.push({
        Tipo: "resultado",
        Consulta: respuesta,
        CitaId: null,
        Estado_Cita: "",
        Fecha_Cita: "",
      });
    }
    escribiendo = false;
    await refrescarChat();
  } catch (error) {
    escribiendo = false;
    manejarError(error);
    await refrescarChat();
  }
}

document.addEventListener("click", async (evento) => {
  const elemento = evento.target instanceof Element ? evento.target : null;
  if (!elemento) return;

  const opcionArbol = elemento.closest("[data-opcion]");
  if (opcionArbol) {
    await responderArbol(Number(opcionArbol.dataset.opcion));
    return;
  }

  const botonRol = elemento.closest("[data-rol]");
  if (botonRol) {
    rolSeleccionado = botonRol.dataset.rol;
    await renderizar();
    return;
  }

  const enlace = elemento.closest("[data-vista]");
  if (enlace) {
    vistaActual = enlace.dataset.vista;
    perfilAbierto = false;
    notificacionesAbiertas = false;
    await renderizar();
    return;
  }

  const botonEstado = elemento.closest("[data-estado][data-cita]");
  if (botonEstado) {
    try {
      await api.cambiarEstadoCita(
        botonEstado.dataset.cita,
        botonEstado.dataset.estado,
      );
      mostrarAviso(`Cita actualizada: ${botonEstado.dataset.estado.toLowerCase()}.`);
      await renderizar();
    } catch (error) {
      manejarError(error);
    }
    return;
  }

  const boton = elemento.closest("[data-accion]");
  if (!boton) return;

  try {
    switch (boton.dataset.accion) {
      case "modo-login":
        modoAcceso = "login";
        await renderizar();
        break;
      case "modo-registro":
        modoAcceso = "registro";
        await renderizar();
        break;
      case "tema":
        modoOscuro = !modoOscuro;
        temaManual = modoOscuro ? "oscuro" : "claro";
        document.documentElement.dataset.tema = temaManual;
        try {
          localStorage.setItem("verito-tema", temaManual);
        } catch (error) {
          console.warn("No se pudo guardar la preferencia del tema.", error);
        }
        await renderizar();
        break;
      case "reiniciar-chat":
        await iniciarArbol(idMascotaChat);
        break;
      case "perfil":
        perfilAbierto = !perfilAbierto;
        notificacionesAbiertas = false;
        await renderizar();
        break;
      case "notificaciones":
        notificacionesAbiertas = !notificacionesAbiertas;
        perfilAbierto = false;
        await renderizar();
        break;
      case "cerrar-sesion":
        await api.cerrarSesion();
        usuario = null;
        idMascotaChat = "";
        mensajesChat = [];
        vistaActual = "mascotas";
        rolSeleccionado = roles[0]?.Nombre_Rol ?? "";
        modoAcceso = "login";
        await renderizar();
        break;
      case "deshacer": {
        const resultado = await api.deshacerUltimaAccion();
        mostrarAviso(
          resultado.Deshecha
            ? "Se deshizo la última acción."
            : "No hay acciones para deshacer.",
          !resultado.Deshecha,
        );
        await renderizar();
        break;
      }
    }
  } catch (error) {
    manejarError(error);
  }
});

document.addEventListener("change", async (evento) => {
  const elemento = evento.target;
  if (elemento instanceof HTMLSelectElement && elemento.matches("[data-mascota-chat]")) {
    await iniciarArbol(elemento.value);
  }
});

document.addEventListener("submit", async (evento) => {
  const formulario = evento.target;
  if (!(formulario instanceof HTMLFormElement)) return;
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData(formulario).entries());

  try {
    if (formulario.dataset.formulario === "login") {
      usuario = await api.iniciarSesion(
        datos.Email_Usuario,
        datos.Contrasena,
        rolSeleccionado,
      );
      vistaActual = usuario.Nombre_Rol === "Veterinario" ? "citas" : "mascotas";
      mostrarAviso("Sesión iniciada.");
    } else if (formulario.dataset.formulario === "registro") {
      usuario = await api.registrarUsuario(
        datos.Nombre_Usuario,
        datos.Email_Usuario,
        datos.Contrasena,
        rolSeleccionado,
      );
      vistaActual = usuario.Nombre_Rol === "Veterinario" ? "citas" : "mascotas";
      mostrarAviso("Cuenta creada.");
    } else if (formulario.dataset.formulario === "mascota") {
      await api.crearMascota(datos);
      formulario.reset();
      mostrarAviso("Mascota guardada.");
    } else if (formulario.dataset.formulario === "agendar-cita") {
      const cita = await api.agendarCita(datos);
      formulario.reset();
      if (datos.Id_Consulta_Akinator) {
        const resultado = mensajesChat.find(
          (mensaje) =>
            mensaje.Tipo === "resultado" &&
            mensaje.Consulta.Id_Consulta_Akinator ===
              cita.Id_Consulta_Akinator,
        );
        if (resultado) {
          resultado.CitaId = cita.Id_Cita;
          resultado.Estado_Cita = cita.Estado_Cita;
          resultado.Fecha_Cita = cita.Fecha_Propuesta;
        }
        mostrarAviso("Solicitud enviada; está pendiente de aprobación.");
      } else {
        mostrarAviso(`Solicitud enviada. ${cita.Texto_Recomendacion}`);
      }
    }
    perfilAbierto = false;
    notificacionesAbiertas = false;
    await renderizar();
  } catch (error) {
    manejarError(error);
  }
});

preferenciaSistema.addEventListener("change", async (evento) => {
  if (temaManual) return;
  modoOscuro = evento.matches;
  document.documentElement.dataset.tema = modoOscuro ? "oscuro" : "claro";
  await renderizar();
});

async function iniciarAplicacion() {
  try {
    roles = await api.obtenerRoles();
    rolSeleccionado = roles[0]?.Nombre_Rol ?? "";
    usuario = await api.obtenerUsuarioActual();
    await renderizar();
  } catch (error) {
    manejarError(error);
  }
}

iniciarAplicacion();