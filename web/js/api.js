const apiBase =
  typeof window !== "undefined" && window.location.port === "5500"
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : "";

async function solicitar(ruta, metodo = "GET", datos) {
  const opciones = {
    method: metodo,
    credentials: "include",
    headers: datos ? { "Content-Type": "application/json" } : {},
  };
  if (datos) opciones.body = JSON.stringify(datos);

  const respuesta = await fetch(`${apiBase}${ruta}`, opciones);
  const resultado = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(
      typeof resultado?.error === "string"
        ? resultado.error
        : `La solicitud falló (${respuesta.status}).`,
    );
  }
  return resultado;
}

export function iniciarSesion(email, contrasena, nombreRol) {
  return solicitar("/api/sesion", "POST", {
    email,
    password: contrasena,
    nombreRol,
  });
}

export function registrarUsuario(
  nombre,
  email,
  contrasena,
  nombreRol,
  codigoVeterinario,
) {
  return solicitar("/api/usuarios", "POST", {
    nombre,
    email,
    password: contrasena,
    nombreRol,
    codigoVeterinario,
  });
}

export function cerrarSesion() {
  return solicitar("/api/sesion", "DELETE");
}

export function obtenerUsuarioActual() {
  return solicitar("/api/usuarios/actual");
}

export function obtenerRoles() {
  return solicitar("/api/roles");
}

export function obtenerEspecies() {
  return solicitar("/api/especies");
}

export function obtenerTiposCita() {
  return solicitar("/api/tipos-cita");
}

export function obtenerMascotas() {
  return solicitar("/api/mascotas");
}

export function crearMascota(datos) {
  return solicitar("/api/mascotas", "POST", datos);
}

export function agendarCita(datos) {
  const fecha = new Date(datos.Fecha_Propuesta);
  if (Number.isNaN(fecha.getTime())) {
    throw new Error("Selecciona una fecha y hora válidas.");
  }
  return solicitar("/api/citas", "POST", {
    Id_Mascota: Number(datos.Id_Mascota),
    Tipo_Cita: datos.Tipo_Cita,
    Fecha_Propuesta: fecha.toISOString(),
  });
}

export function obtenerCitas() {
  return solicitar("/api/citas");
}

export function cambiarEstadoCita(idCita, estadoCita) {
  return solicitar(
    `/api/citas/${encodeURIComponent(idCita)}/estado`,
    "PATCH",
    { Estado_Cita: estadoCita },
  );
}

export function deshacerUltimaAccion() {
  return solicitar("/api/acciones/deshacer", "POST");
}

export function obtenerNotificaciones() {
  return solicitar("/api/notificaciones");
}
