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
let idCitaExpediente = "";
let expediente = null;
let modoOscuro = preferenciaSistema.matches;
let temaManual = null;
let temporizadorAviso;

try {
  const guardado = localStorage.getItem("verito-tema");
  if (guardado === "claro" || guardado === "oscuro") temaManual = guardado;
} catch {}

if (temaManual) {
  modoOscuro = temaManual === "oscuro";
  document.documentElement.dataset.tema = temaManual;
}

function mostrarAviso(texto, esError = false) {
  aviso.textContent = texto;
  aviso.classList.toggle("aviso-error", esError);
  aviso.classList.add("visible");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove("visible"), 2800);
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

    let contenido = "";
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
        .filter((mensaje) => mensaje.Tipo === "resultado" && mensaje.CitaId)
        .forEach((mensaje) => {
          const cita = citas.find((item) => item.Id_Cita === mensaje.CitaId);
          mensaje.Estado_Cita = cita?.Estado_Cita ?? "";
          mensaje.Fecha_Cita = cita?.Fecha_Propuesta ?? "";
          if (!cita) mensaje.CitaId = null;
        });
      contenido = vistas.vistaAkinator(
        mascotas,
        idMascotaChat,
        mensajesChat,
        progresoChat,
        escribiendo,
      );
    } else if (usuario.Nombre_Rol === "Veterinario" && vistaActual === "expediente") {
      const citas = await api.obtenerCitas();
      contenido = vistas.vistaExpediente(citas, idCitaExpediente, expediente);
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

async function iniciarChat(idMascota) {
  idMascotaChat = idMascota;
  mensajesChat = [];
  progresoChat = 0;
  escribiendo = Boolean(idMascota);
  await renderizar();
  if (!idMascota) return;

  try {
    const pregunta = await api.iniciarAkinator(idMascota);
    mensajesChat.push({ Tipo: "bot", Texto: pregunta.Pregunta, Opciones: pregunta.Opciones });
    escribiendo = false;
    await renderizar();
  } catch (error) {
    escribiendo = false;
    manejarError(error);
    await renderizar();
  }
}

async function responder(numeroOpcion) {
  const ultimaPregunta = mensajesChat[mensajesChat.length - 1];
  if (!ultimaPregunta || ultimaPregunta.Tipo !== "bot" || !ultimaPregunta.Opciones.length) {
    return;
  }

  const opcion = ultimaPregunta.Opciones.find(
    (item) => item.Numero_Opcion === numeroOpcion,
  );
  if (!opcion) return;

  ultimaPregunta.Opciones = [];
  mensajesChat.push({ Tipo: "usuario", Texto: opcion.Texto_Opcion });
  escribiendo = true;
  await renderizar();

  try {
    const respuesta = await api.responderAkinator(numeroOpcion);
    if (respuesta.Tipo_Respuesta === "Pregunta") {
      progresoChat =
        ((respuesta.Numero_Pregunta - 1) / respuesta.Total_Preguntas) * 100;
      mensajesChat.push({
        Tipo: "bot",
        Texto: respuesta.Pregunta,
        Opciones: respuesta.Opciones,
      });
    } else {
      const recomendacion = await api.obtenerRecomendacion(
        respuesta.Id_Consulta_Akinator,
      );
      progresoChat = 100;
      mensajesChat.push({
        Tipo: "resultado",
        Consulta: respuesta,
        Recomendacion: recomendacion,
        CitaId: null,
        Estado_Cita: "",
        Fecha_Cita: "",
      });
    }
    escribiendo = false;
    await renderizar();
  } catch (error) {
    escribiendo = false;
    manejarError(error);
    await renderizar();
  }
}

async function seleccionarExpediente(idCita) {
  idCitaExpediente = idCita;
  expediente = null;
  if (idCita) {
    try {
      expediente = await api.obtenerExpediente(idCita);
    } catch (error) {
      manejarError(error);
    }
  }
  await renderizar();
}

document.addEventListener("click", async (evento) => {
  const elemento = evento.target instanceof Element ? evento.target : null;
  if (!elemento) return;

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

  const opcion = elemento.closest("[data-opcion]");
  if (opcion) {
    await responder(Number(opcion.dataset.opcion));
    return;
  }

  const botonEstado = elemento.closest("[data-estado][data-cita]");
  if (botonEstado) {
    try {
      await api.cambiarEstadoCita(
        botonEstado.dataset.cita,
        botonEstado.dataset.estado,
      );
      const avisos = {
        Aceptada: "Solicitud aceptada; la cita quedó confirmada.",
        Rechazada: "Solicitud rechazada; el horario quedó disponible.",
        Completada: "Cita marcada como completada.",
      };
      mostrarAviso(avisos[botonEstado.dataset.estado] ?? "Estado actualizado.");
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
        } catch {}
        await renderizar();
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
        if (!resultado.Deshecha) {
          mostrarAviso("No hay acciones para deshacer.", true);
        } else {
          if (resultado.Tipo_Accion === "Cita") {
            const resultadoChat = mensajesChat.find(
              (item) => item.Tipo === "resultado" && item.CitaId === resultado.Id_Cita,
            );
            if (resultadoChat) {
              resultadoChat.CitaId = null;
              resultadoChat.Estado_Cita = "";
              resultadoChat.Fecha_Cita = "";
            }
          }
          if (resultado.Tipo_Accion === "Expediente" && idCitaExpediente) {
            expediente = await api.obtenerExpediente(idCitaExpediente);
          }
          mostrarAviso("Se deshizo la última acción.");
        }
        await renderizar();
        break;
      }
      case "reiniciar-chat":
        await iniciarChat(idMascotaChat);
        break;
      case "editar-expediente":
        vistaActual = "expediente";
        await seleccionarExpediente(boton.dataset.cita);
        break;
    }
  } catch (error) {
    manejarError(error);
  }
});

document.addEventListener("change", async (evento) => {
  const elemento = evento.target;
  if (!(elemento instanceof HTMLSelectElement)) return;

  if (elemento.matches("[data-mascota-chat]")) {
    await iniciarChat(elemento.value);
  }
  if (elemento.matches("[data-cita-expediente]")) {
    await seleccionarExpediente(elemento.value);
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
    } else if (formulario.dataset.formulario === "solicitud-cita") {
      const cita = await api.agendarCita(
        formulario.dataset.consulta,
        datos.Fecha_Propuesta,
      );
      const resultadoChat = mensajesChat.find(
        (mensaje) =>
          mensaje.Tipo === "resultado" &&
          mensaje.Consulta.Id_Consulta_Akinator === cita.Id_Consulta_Akinator,
      );
      if (resultadoChat) {
        resultadoChat.CitaId = cita.Id_Cita;
        resultadoChat.Estado_Cita = cita.Estado_Cita;
        resultadoChat.Fecha_Cita = cita.Fecha_Propuesta;
      }
      mostrarAviso("Solicitud enviada; está pendiente de aprobación.");
    } else if (formulario.dataset.formulario === "expediente") {
      expediente = await api.guardarExpediente(
        datos.Id_Cita,
        datos.Diagnostico_Medico,
        datos.Receta_Instrucciones,
      );
      mostrarAviso("Expediente guardado.");
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
