import * as api from "./api.js";
import * as vistas from "./vistas.js";

const app = document.querySelector("#app");
const accionesCabecera = document.querySelector("#acciones-cabecera");
const aviso = document.querySelector("#aviso");

let roles = [];
let usuario = null;
let rolSeleccionado = "";
let modoAcceso = "login";
let vistaActual = "mascotas";
let perfilAbierto = false;
let notificacionesAbiertas = false;
let notificaciones = [];
let temporizadorAviso;

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
  } catch (error) {
    manejarError(error);
  }
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
        datos.Codigo_Veterinario,
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
      mostrarAviso(`Solicitud enviada. ${cita.Texto_Recomendacion}`);
    }
    perfilAbierto = false;
    notificacionesAbiertas = false;
    await renderizar();
  } catch (error) {
    manejarError(error);
  }
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
