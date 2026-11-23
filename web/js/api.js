const demora = 180;

const roles = [
  { Nombre_Rol: "Dueño" },
  { Nombre_Rol: "Veterinario" },
];

const especies = [
  { Id_Especie: 1, Nombre_Especie: "Perro" },
  { Id_Especie: 2, Nombre_Especie: "Gato" },
  { Id_Especie: 3, Nombre_Especie: "Ave" },
  { Id_Especie: 4, Nombre_Especie: "Conejo" },
  { Id_Especie: 5, Nombre_Especie: "Otro" },
];

const opcionesPreguntas = [
  {
    Pregunta: "¿Cuál es el síntoma principal?",
    Opciones: [
      { Texto_Opcion: "Ninguno claro", Puntos: 0 },
      { Texto_Opcion: "Vómito o diarrea", Puntos: 2 },
      { Texto_Opcion: "Cojera o dolor", Puntos: 2 },
      { Texto_Opcion: "Dificultad para respirar", Puntos: 7 },
    ],
  },
  {
    Pregunta: "¿Desde cuándo presenta el síntoma?",
    Opciones: [
      { Texto_Opcion: "Desde hoy", Puntos: 0 },
      { Texto_Opcion: "2 a 3 días", Puntos: 1 },
      { Texto_Opcion: "Más de una semana", Puntos: 2 },
    ],
  },
  {
    Pregunta: "¿Cómo está su apetito?",
    Opciones: [
      { Texto_Opcion: "Normal", Puntos: 0 },
      { Texto_Opcion: "Come poco", Puntos: 1 },
      { Texto_Opcion: "No quiere comer", Puntos: 2 },
    ],
  },
  {
    Pregunta: "¿Cómo está su energía?",
    Opciones: [
      { Texto_Opcion: "Normal", Puntos: 0 },
      { Texto_Opcion: "Decaído", Puntos: 1 },
      { Texto_Opcion: "No se levanta", Puntos: 3 },
    ],
  },
];

const recomendaciones = {
  Leve: "Vigila a tu mascota en casa y ajusta su comida.",
  Moderada: "Agenda una consulta veterinaria en las próximas 24-48 horas.",
  Grave: "Busca atención veterinaria de urgencia.",
};

let usuarios = [];
let mascotas = [];
let consultasAkinator = [];
let citas = [];
let observacionesMedicas = [];
let notificaciones = [];
let accionesDeshacer = [];
let usuarioActual = null;
let akiActual = null;
let siguienteUsuario = 1;
let siguienteMascota = 1;
let siguienteConsulta = 1;
let siguienteCita = 1;
let siguienteNotificacion = 1;

function copiar(valor) {
  return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
}

function conDemora(accion) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(copiar(accion()));
      } catch (error) {
        reject(error);
      }
    }, demora);
  });
}

function usuarioPublico(usuario) {
  if (!usuario) return null;
  return {
    Id_Usuario: usuario.Id_Usuario,
    Nombre_Usuario: usuario.Nombre_Usuario,
    Email_Usuario: usuario.Email_Usuario,
    Nombre_Rol: usuario.Nombre_Rol,
  };
}

function buscarMascota(idMascota) {
  return mascotas.find((mascota) => mascota.Id_Mascota === idMascota);
}

function gravedadPorPuntos(puntos) {
  if (puntos <= 3) return "Leve";
  if (puntos <= 6) return "Moderada";
  return "Grave";
}

function agregarNotificacion(mensaje, email, nombreRol) {
  const notificacion = {
    Id_Notificacion: siguienteNotificacion++,
    Mensaje_Notificacion: mensaje,
    Email_Usuario: email,
    Nombre_Rol: nombreRol,
    Fecha_Notificacion: new Date().toISOString(),
  };
  notificaciones.push(notificacion);
  return notificacion.Id_Notificacion;
}

function quitarNotificacion(idNotificacion) {
  notificaciones = notificaciones.filter(
    (notificacion) => notificacion.Id_Notificacion !== idNotificacion,
  );
}

function registrarDeshacer(tipoAccion, accion, datos = {}) {
  accionesDeshacer.push({ Tipo_Accion: tipoAccion, Ejecutar: accion, ...datos });
}

function preguntaActual() {
  const actual = opcionesPreguntas[akiActual.indicePregunta];
  return {
    Tipo_Respuesta: "Pregunta",
    Numero_Pregunta: akiActual.indicePregunta + 1,
    Total_Preguntas: opcionesPreguntas.length,
    Pregunta: actual.Pregunta,
    Opciones: actual.Opciones.map((opcion, indice) => ({
      Numero_Opcion: indice + 1,
      Texto_Opcion: opcion.Texto_Opcion,
    })),
  };
}

// luego: fetch("/api/sesion", { method: "POST" })
export async function iniciarSesion(email, contrasena, nombreRol) {
  const res = await fetch("/api/sesion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: contrasena, nombreRol }),
  });
  const datos = await res.json();
  if (!res.ok) throw new Error(datos.error);
  return datos;
}


// luego: fetch("/api/usuarios", { method: "POST" })
export async function registrarUsuario(nombre, email, contrasena, nombreRol) {
  const res = await fetch("/api/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, password: contrasena, nombreRol }),
  });
  const datos = await res.json();
  if (!res.ok) throw new Error(datos.error);
  return datos;
}


// luego: fetch("/api/sesion", { method: "DELETE" })
export async function cerrarSesion() {
  await fetch("/api/sesion", { method: "DELETE" });
  return true;
}


// luego: fetch("/api/usuarios/actual")

// luego: fetch("/api/roles")
export async function obtenerUsuarioActual() {
  const res = await fetch("/api/usuarios/actual");
  return await res.json();
}

export async function obtenerRoles() {
  const res = await fetch("/api/roles");
  return await res.json();
}

// luego: fetch("/api/especies")
export function obtenerEspecies() {
  return conDemora(() => especies);
}

// luego: fetch("/api/mascotas")
export async function obtenerMascotas() {
  return [];
}

// luego: fetch("/api/mascotas", { method: "POST" })
export function crearMascota(datos) {
  return conDemora(() => {
    if (!usuarioActual) throw new Error("Inicia sesión para agregar una mascota.");
    const mascota = {
      Id_Mascota: siguienteMascota++,
      Email_Usuario: usuarioActual.Email_Usuario,
      Nombre_Especie: datos.Nombre_Especie,
      Nombre_Mascota: datos.Nombre_Mascota.trim(),
      Edad_Mascota: Number(datos.Edad_Mascota),
      Peso_Mascota: Number(datos.Peso_Mascota),
    };
    mascotas.push(mascota);
    registrarDeshacer("Mascota", () => {
      mascotas = mascotas.filter((item) => item.Id_Mascota !== mascota.Id_Mascota);
    });
    return mascota;
  });
}

// luego: fetch("/api/akinator/iniciar", { method: "POST" })
export function iniciarAkinator(idMascota) {
  return conDemora(() => {
    const mascota = buscarMascota(Number(idMascota));
    if (!usuarioActual || !mascota) throw new Error("Selecciona una mascota válida.");
    if (
      usuarioActual.Nombre_Rol !== "Veterinario" &&
      mascota.Email_Usuario !== usuarioActual.Email_Usuario
    ) {
      throw new Error("No puedes iniciar una consulta para esa mascota.");
    }

    akiActual = {
      Id_Mascota: mascota.Id_Mascota,
      Email_Usuario: usuarioActual.Email_Usuario,
      indicePregunta: 0,
      Puntos: 0,
      Sintomas: [],
    };
    return preguntaActual();
  });
}

// luego: fetch("/api/akinator/responder", { method: "POST" })
export function responderAkinator(numeroOpcion) {
  return conDemora(() => {
    if (!akiActual) throw new Error("Inicia primero el Akinator.");
    const pregunta = opcionesPreguntas[akiActual.indicePregunta];
    const opcion = pregunta?.Opciones[Number(numeroOpcion) - 1];
    if (!opcion) throw new Error("Selecciona una opción válida.");

    akiActual.Puntos += opcion.Puntos;
    akiActual.Sintomas.push(opcion.Texto_Opcion);
    akiActual.indicePregunta += 1;

    if (akiActual.indicePregunta < opcionesPreguntas.length) {
      return preguntaActual();
    }

    const consulta = {
      Id_Consulta_Akinator: siguienteConsulta++,
      Id_Mascota: akiActual.Id_Mascota,
      Email_Usuario: akiActual.Email_Usuario,
      Sintomas_Cap: akiActual.Sintomas.join(", "),
      Resultado_Prel: gravedadPorPuntos(akiActual.Puntos),
      Fecha_Consulta: new Date().toISOString(),
      Puntos_Akinator: akiActual.Puntos,
    };
    consultasAkinator.push(consulta);
    akiActual = null;
    return { Tipo_Respuesta: "Resultado", ...consulta };
  });
}

// luego: fetch("/api/recomendaciones")
export function obtenerRecomendacion(idConsulta) {
  return conDemora(() => {
    const consulta = consultasAkinator.find(
      (item) => item.Id_Consulta_Akinator === Number(idConsulta),
    );
    if (!consulta) throw new Error("No se encontró el resultado del Akinator.");

    const mascota = buscarMascota(consulta.Id_Mascota);
    return {
      Gravedad: consulta.Resultado_Prel,
      Texto_Recomendacion: `${recomendaciones[consulta.Resultado_Prel]} (${mascota.Nombre_Especie}, ${mascota.Peso_Mascota} kg).`,
    };
  });
}

// luego: fetch("/api/citas", { method: "POST" })
export function agendarCita(idConsulta, fechaPropuesta) {
  return conDemora(() => {
    if (!usuarioActual || usuarioActual.Nombre_Rol !== "Dueño") {
      throw new Error("Inicia sesión como dueño para solicitar una cita.");
    }

    const consulta = consultasAkinator.find(
      (item) => item.Id_Consulta_Akinator === Number(idConsulta),
    );
    if (!consulta || consulta.Email_Usuario !== usuarioActual.Email_Usuario) {
      throw new Error("No se encontró un pre-triage tuyo para solicitar la cita.");
    }
    if (consulta.Resultado_Prel !== "Grave") {
      throw new Error("Solo los resultados graves permiten solicitar una cita.");
    }

    const fecha = new Date(fechaPropuesta);
    if (!fechaPropuesta || Number.isNaN(fecha.getTime()) || fecha <= new Date()) {
      throw new Error("Selecciona una fecha y hora futuras.");
    }
    if (
      fecha.getMinutes() % 30 !== 0 ||
      fecha.getSeconds() !== 0 ||
      fecha.getMilliseconds() !== 0
    ) {
      throw new Error("Selecciona un horario en intervalos de 30 minutos.");
    }

    const solicitudActiva = citas.some(
      (cita) =>
        cita.Id_Consulta_Akinator === consulta.Id_Consulta_Akinator &&
        ["Pendiente", "Aceptada", "Completada"].includes(cita.Estado_Cita),
    );
    if (solicitudActiva) {
      throw new Error("Este pre-triage ya tiene una solicitud activa.");
    }

    const horarioOcupado = citas.some(
      (cita) =>
        new Date(cita.Fecha_Propuesta).getTime() === fecha.getTime() &&
        ["Pendiente", "Aceptada"].includes(cita.Estado_Cita),
    );
    if (horarioOcupado) {
      throw new Error("Ese horario ya está solicitado. Elige otro.");
    }

    const cita = {
      Id_Cita: siguienteCita++,
      Id_Consulta_Akinator: consulta.Id_Consulta_Akinator,
      Id_Mascota: consulta.Id_Mascota,
      Email_Usuario: usuarioActual.Email_Usuario,
      Resultado_Prel: consulta.Resultado_Prel,
      Sintomas_Cap: consulta.Sintomas_Cap,
      Fecha_Propuesta: fecha.toISOString(),
      Estado_Cita: "Pendiente",
    };
    citas.push(cita);
    const notificacionesCreadas = [
      agregarNotificacion(
        "Tu solicitud de cita quedó pendiente.",
        usuarioActual.Email_Usuario,
        "",
      ),
      agregarNotificacion(
        "Hay una nueva solicitud de cita pendiente.",
        "",
        "Veterinario",
      ),
    ];
    registrarDeshacer(
      "Cita",
      () => {
        citas = citas.filter((item) => item.Id_Cita !== cita.Id_Cita);
        notificacionesCreadas.forEach(quitarNotificacion);
      },
      { Id_Cita: cita.Id_Cita },
    );
    return cita;
  });
}

// luego: fetch("/api/citas")
export function obtenerCitas() {
  return conDemora(() => {
    if (!usuarioActual) throw new Error("Inicia sesión para ver las citas.");
    return citas
      .filter(
        (cita) =>
          usuarioActual.Nombre_Rol === "Veterinario" ||
          cita.Email_Usuario === usuarioActual.Email_Usuario,
      )
      .map((cita) => {
        const mascota = buscarMascota(cita.Id_Mascota);
        const usuario = usuarios.find(
          (item) => item.Email_Usuario === cita.Email_Usuario,
        );
        const acciones =
          cita.Estado_Cita === "Pendiente"
            ? [
                {
                  Estado_Cita: "Aceptada",
                  Texto_Accion: "Aceptar",
                  Estilo_Accion: "principal",
                },
                {
                  Estado_Cita: "Rechazada",
                  Texto_Accion: "Rechazar",
                  Estilo_Accion: "secundario",
                },
              ]
            : cita.Estado_Cita === "Aceptada"
              ? [
                  {
                    Estado_Cita: "Completada",
                    Texto_Accion: "Completar",
                    Estilo_Accion: "principal",
                  },
                ]
              : [];
        return {
          ...cita,
          Nombre_Mascota: mascota?.Nombre_Mascota ?? "",
          Nombre_Especie: mascota?.Nombre_Especie ?? "",
          Nombre_Usuario: usuario?.Nombre_Usuario ?? "",
          Acciones_Disponibles: acciones,
        };
      });
  });
}

// luego: fetch(`/api/citas/${idCita}/estado`, { method: "PATCH" })
export function cambiarEstadoCita(idCita, estadoCita) {
  return conDemora(() => {
    if (!usuarioActual || usuarioActual.Nombre_Rol !== "Veterinario") {
      throw new Error("Solo un veterinario puede actualizar la solicitud.");
    }

    const cita = citas.find((item) => item.Id_Cita === Number(idCita));
    const transicionesPermitidas = {
      Pendiente: ["Aceptada", "Rechazada"],
      Aceptada: ["Completada"],
    };
    if (
      !cita ||
      !transicionesPermitidas[cita.Estado_Cita]?.includes(estadoCita)
    ) {
      throw new Error("No se pudo actualizar el estado de la cita.");
    }

    const estadoAnterior = cita.Estado_Cita;
    cita.Estado_Cita = estadoCita;
    const idNotificacion = agregarNotificacion(
      `El estado de tu cita cambió a ${estadoCita}.`,
      cita.Email_Usuario,
      "",
    );
    registrarDeshacer("Estado_Cita", () => {
      cita.Estado_Cita = estadoAnterior;
      quitarNotificacion(idNotificacion);
    });
    return cita;
  });
}

// luego: fetch(`/api/citas/${idCita}/expediente`)
export function obtenerExpediente(idCita) {
  return conDemora(() => {
    const cita = citas.find((item) => item.Id_Cita === Number(idCita));
    if (!cita) throw new Error("No se encontró la cita.");
    return (
      observacionesMedicas.find((item) => item.Id_Cita === cita.Id_Cita) ?? {
        Id_Cita: cita.Id_Cita,
        Diagnostico_Medico: "",
        Receta_Instrucciones: "",
      }
    );
  });
}

// luego: fetch(`/api/citas/${idCita}/expediente`, { method: "PUT" })
export function guardarExpediente(idCita, diagnostico, receta) {
  return conDemora(() => {
    const cita = citas.find((item) => item.Id_Cita === Number(idCita));
    if (!cita) throw new Error("No se encontró la cita.");
    const indice = observacionesMedicas.findIndex(
      (item) => item.Id_Cita === cita.Id_Cita,
    );
    const anterior = indice === -1 ? null : copiar(observacionesMedicas[indice]);
    const expediente = {
      Id_Cita: cita.Id_Cita,
      Diagnostico_Medico: diagnostico.trim(),
      Receta_Instrucciones: receta.trim(),
      Fecha_Observacion: new Date().toISOString(),
    };

    if (indice === -1) observacionesMedicas.push(expediente);
    else observacionesMedicas[indice] = expediente;

    registrarDeshacer("Expediente", () => {
      const actual = observacionesMedicas.findIndex(
        (item) => item.Id_Cita === cita.Id_Cita,
      );
      if (anterior) observacionesMedicas[actual] = anterior;
      else if (actual !== -1) observacionesMedicas.splice(actual, 1);
    });
    return expediente;
  });
}

// luego: fetch("/api/acciones/deshacer", { method: "POST" })
export function deshacerUltimaAccion() {
  return conDemora(() => {
    const deshacer = accionesDeshacer.pop();
    if (!deshacer) return { Deshecha: false };
    deshacer.Ejecutar();
    return {
      Deshecha: true,
      Tipo_Accion: deshacer.Tipo_Accion,
      Id_Cita: deshacer.Id_Cita,
    };
  });
}

// luego: fetch("/api/notificaciones")
export async function obtenerNotificaciones() {
  const res = await fetch("/api/notificaciones");
  return await res.json();
}

