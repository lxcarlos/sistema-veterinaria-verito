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

export function obtenerMascotas() {
  return solicitar("/api/mascotas");
}

export function crearMascota(datos) {
  return solicitar("/api/mascotas", "POST", datos);
}

export function iniciarAkinator(idMascota) {
  return solicitar("/api/akinator/iniciar", "POST", {
    Id_Mascota: Number(idMascota),
  });
}

export function responderAkinator(numeroOpcion) {
  return solicitar("/api/akinator/responder", "POST", {
    Numero_Opcion: Number(numeroOpcion),
  });
}

export function obtenerRecomendacion(idConsulta) {
  return solicitar(
    `/api/recomendaciones/${encodeURIComponent(idConsulta)}`,
  );
}

export function agendarCita(idConsulta, fechaPropuesta) {
  const fecha = new Date(fechaPropuesta);
  if (Number.isNaN(fecha.getTime())) {
    throw new Error("Selecciona una fecha y hora válidas.");
  }
  return solicitar("/api/citas", "POST", {
    Id_Consulta_Akinator: Number(idConsulta),
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

export function obtenerExpediente(idCita) {
  return solicitar(
    `/api/citas/${encodeURIComponent(idCita)}/expediente`,
  );
}

export function guardarExpediente(idCita, diagnostico, receta) {
  return solicitar(
    `/api/citas/${encodeURIComponent(idCita)}/expediente`,
    "PUT",
    {
      Diagnostico_Medico: diagnostico,
      Receta_Instrucciones: receta,
    },
  );
}

export function deshacerUltimaAccion() {
  return solicitar("/api/acciones/deshacer", "POST");
}

export function obtenerNotificaciones() {
  return solicitar("/api/notificaciones");
}
