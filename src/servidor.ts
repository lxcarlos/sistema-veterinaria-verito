import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import path from "node:path";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { ConexionBaseDatos } from "./Patrones/singleton/ConexionBaseDatos";

type Rol = "Dueño" | "Veterinario";

interface UsuarioPublico {
  Id_Usuario: number;
  Nombre_Usuario: string;
  Email_Usuario: string;
  Nombre_Rol: Rol;
}

interface Sesion {
  token: string;
  usuario: UsuarioPublico;
}

interface OpcionPregunta {
  Texto_Opcion: string;
  Puntos: number;
}

interface Pregunta {
  Pregunta: string;
  Opciones: OpcionPregunta[];
}

interface PretriageActivo {
  Id_Mascota: number;
  Indice_Pregunta: number;
  Puntos: number;
  Sintomas: string[];
}

interface CitaDb {
  Id_Cita: number;
  Id_Consulta_Akinator: number;
  Id_Mascota: number;
  Email_Usuario: string;
  Nombre_Usuario: string;
  Nombre_Mascota: string;
  Nombre_Especie: string;
  Resultado_Prel: string;
  Sintomas_Cap: string;
  Fecha_Propuesta: Date;
  Estado_Cita: string;
}

interface CitaPublica extends CitaDb {
  Acciones_Disponibles: {
    Estado_Cita: string;
    Texto_Accion: string;
    Estilo_Accion: string;
  }[];
}

interface ExpedientePrevio {
  Diagnostico_Medico: string;
  Receta_Instrucciones: string;
}

type AccionDeshacer =
  | { Tipo: "Mascota"; Id_Mascota: number; Id_Usuario: number }
  | { Tipo: "Cita"; Id_Cita: number; Id_Usuario: number }
  | {
      Tipo: "Estado_Cita";
      Id_Cita: number;
      Id_Veterinario: number;
      Estado_Anterior: string;
      Estado_Nuevo: string;
    }
  | {
      Tipo: "Expediente";
      Id_Cita: number;
      Id_Veterinario: number;
      Anterior: ExpedientePrevio | null;
    };

class ErrorHttp extends Error {
  public constructor(
    public readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

const app = express();
const db = ConexionBaseDatos.getInstancia();
const cookieSesion = "verito_session";
const sesiones = new Map<string, UsuarioPublico>();
const pretriagesActivos = new Map<string, PretriageActivo>();
const historialDeshacer = new Map<string, AccionDeshacer[]>();

const preguntas: Pregunta[] = [
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

const recomendaciones: Record<string, string> = {
  Leve: "Vigila a tu mascota y consulta a un veterinario si empeora.",
  Moderada: "Contacta a tu veterinario para recibir orientación.",
  Grave: "Busca atención veterinaria de urgencia; no esperes una respuesta de la plataforma.",
};

app.use(
  cors({
    origin: process.env.APP_ORIGIN ?? "http://localhost:5500",
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));

function errorHttp(estado: number, mensaje: string): ErrorHttp {
  return new ErrorHttp(estado, mensaje);
}

function textoRequerido(valor: unknown, campo: string, maximo: number): string {
  if (typeof valor !== "string" || !valor.trim() || valor.length > maximo) {
    throw errorHttp(400, `${campo} es obligatorio y no debe exceder ${maximo} caracteres.`);
  }
  return valor.trim();
}

function enteroPositivo(valor: unknown, campo: string): number {
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < 1) {
    throw errorHttp(400, `${campo} debe ser un entero positivo.`);
  }
  return numero;
}

function numeroSql(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "number" in error &&
    typeof error.number === "number"
  ) {
    return error.number;
  }
  return undefined;
}

function leerSesion(req: Request): Sesion | null {
  const cookies = req.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const [nombre, ...partes] = cookie.trim().split("=");
    if (nombre === cookieSesion) {
      const token = partes.join("=");
      const usuario = sesiones.get(token);
      return usuario ? { token, usuario } : null;
    }
  }
  return null;
}

function exigirSesion(req: Request): Sesion {
  const sesion = leerSesion(req);
  if (!sesion) throw errorHttp(401, "Inicia sesión para continuar.");
  return sesion;
}

function exigirRol(sesion: Sesion, rol: Rol): void {
  if (sesion.usuario.Nombre_Rol !== rol) {
    throw errorHttp(403, "No tienes permiso para realizar esta acción.");
  }
}

function iniciarSesion(res: Response, usuario: UsuarioPublico): string {
  const token = randomBytes(32).toString("hex");
  sesiones.set(token, usuario);
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${cookieSesion}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${seguro}`,
  );
  return token;
}

function agregarAccionDeshacer(token: string, accion: AccionDeshacer): void {
  const historial = historialDeshacer.get(token) ?? [];
  historial.push(accion);
  historialDeshacer.set(token, historial);
}

function gravedadPorPuntos(puntos: number): string {
  if (puntos <= 3) return "Leve";
  if (puntos <= 6) return "Moderada";
  return "Grave";
}

function preguntaActual(pretriage: PretriageActivo) {
  const pregunta = preguntas[pretriage.Indice_Pregunta];
  if (!pregunta) throw errorHttp(400, "El pre-triage ya terminó.");
  return {
    Tipo_Respuesta: "Pregunta",
    Numero_Pregunta: pretriage.Indice_Pregunta + 1,
    Total_Preguntas: preguntas.length,
    Pregunta: pregunta.Pregunta,
    Opciones: pregunta.Opciones.map((opcion, indice) => ({
      Numero_Opcion: indice + 1,
      Texto_Opcion: opcion.Texto_Opcion,
    })),
  };
}

function accionesDisponibles(estado: string) {
  if (estado === "Pendiente") {
    return [
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
    ];
  }
  if (estado === "Aceptada") {
    return [
      {
        Estado_Cita: "Completada",
        Texto_Accion: "Completar",
        Estilo_Accion: "principal",
      },
    ];
  }
  return [];
}

async function consultarCitas(sesion: Sesion): Promise<CitaPublica[]> {
  const filas = await db.consultar<CitaDb>(
    `SELECT
       c.PK_ID_Cita AS Id_Cita,
       c.FK_ID_Consulta AS Id_Consulta_Akinator,
       m.PK_ID_Mascota AS Id_Mascota,
       dueno.Email_Usuario AS Email_Usuario,
       dueno.Nombre_Usuario AS Nombre_Usuario,
       m.Nombre_Mascota AS Nombre_Mascota,
       e.Nombre_Especie AS Nombre_Especie,
       q.Resultado_Prel AS Resultado_Prel,
       q.Sintomas_Cap AS Sintomas_Cap,
       c.Fecha_Propuesta AS Fecha_Propuesta,
       c.Estado_Cita AS Estado_Cita
     FROM Citas c
     INNER JOIN Consultas_Akinator q ON q.PK_ID_Consulta = c.FK_ID_Consulta
     INNER JOIN Mascotas m ON m.PK_ID_Mascota = q.FK_ID_Mascota
     INNER JOIN Especies e ON e.PK_ID_Especie = m.FK_ID_Especie
     INNER JOIN Usuarios dueno ON dueno.PK_ID_Usuario = m.FK_ID_Usuario
     WHERE (c.FK_ID_Usuario = @idUsuario AND @esVeterinario = 1)
        OR (m.FK_ID_Usuario = @idUsuario AND @esVeterinario = 0)
     ORDER BY c.Fecha_Propuesta DESC`,
    {
      esVeterinario: sesion.usuario.Nombre_Rol === "Veterinario" ? 1 : 0,
      idUsuario: sesion.usuario.Id_Usuario,
    },
  );
  return filas.map((cita) => ({
    ...cita,
    Acciones_Disponibles: accionesDisponibles(cita.Estado_Cita),
  }));
}

function derivarClave(contrasena: string, sal: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(contrasena, sal, 64, (error, clave) => {
      if (error) {
        reject(error);
      } else {
        resolve(clave);
      }
    });
  });
}

async function crearHashContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(16).toString("hex");
  const clave = await derivarClave(contrasena, sal);
  return `scrypt$${sal}$${clave.toString("hex")}`;
}

async function verificarContrasena(
  contrasena: string,
  hash: string,
): Promise<boolean> {
  const [algoritmo, sal, claveGuardada] = hash.split("$");
  if (hash.startsWith("scrypt$")) {
    if (algoritmo !== "scrypt" || !sal || !claveGuardada) return false;
    const claveEsperada = Buffer.from(claveGuardada, "hex");
    const claveIngresada = await derivarClave(contrasena, sal);
    return (
      claveEsperada.length === claveIngresada.length &&
      timingSafeEqual(claveEsperada, claveIngresada)
    );
  }

  const claveAnterior = Buffer.from(hash);
  const claveIngresada = Buffer.from(contrasena);
  return (
    claveAnterior.length === claveIngresada.length &&
    timingSafeEqual(claveAnterior, claveIngresada)
  );
}

app.get("/api/roles", async (_req, res) => {
  const roles = await db.consultar(
    `SELECT PK_ID_Rol AS Id_Rol, Nombre_Rol
     FROM Roles
     ORDER BY PK_ID_Rol`,
  );
  res.json(roles);
});

app.get("/api/especies", async (_req, res) => {
  const especies = await db.consultar(
    `SELECT PK_ID_Especie AS Id_Especie, Nombre_Especie
     FROM Especies
     ORDER BY Nombre_Especie`,
  );
  res.json(especies);
});

app.post("/api/usuarios", async (req, res) => {
  const nombre = textoRequerido(req.body?.nombre, "El nombre", 100);
  const email = textoRequerido(req.body?.email, "El correo", 100).toLowerCase();
  const contrasena =
    typeof req.body?.password === "string" ? req.body.password : "";
  const rolSolicitado = textoRequerido(req.body?.nombreRol, "El rol", 50);

  if (rolSolicitado === "Veterinario") {
    const codigoConfigurado = process.env.VETERINARIAN_REGISTRATION_CODE;
    const codigoIngresado =
      typeof req.body?.codigoVeterinario === "string"
        ? req.body.codigoVeterinario
        : "";
    if (!codigoConfigurado) {
      throw errorHttp(503, "El registro veterinario no está habilitado.");
    }
    const esperado = Buffer.from(codigoConfigurado);
    const ingresado = Buffer.from(codigoIngresado);
    if (
      esperado.length !== ingresado.length ||
      !timingSafeEqual(esperado, ingresado)
    ) {
      throw errorHttp(403, "El código de invitación veterinaria no es válido.");
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw errorHttp(400, "Ingresa un correo válido.");
  }
  if (contrasena.length < 8 || contrasena.length > 128) {
    throw errorHttp(400, "La contraseña debe tener entre 8 y 128 caracteres.");
  }

  const roles = await db.consultar<{ Id_Rol: number; Nombre_Rol: Rol }>(
    `SELECT PK_ID_Rol AS Id_Rol, Nombre_Rol
     FROM Roles
     WHERE Nombre_Rol = @nombreRol`,
    { nombreRol: rolSolicitado },
  );
  const rol = roles[0];
  if (!rol) throw errorHttp(400, "El rol seleccionado no existe.");

  const hash = await crearHashContrasena(contrasena);
  let usuarios: { Id_Usuario: number }[];
  try {
    usuarios = await db.consultar<{ Id_Usuario: number }>(
      `INSERT INTO Usuarios
         (FK_ID_Rol, Nombre_Usuario, Email_Usuario, Password_Hash)
       OUTPUT INSERTED.PK_ID_Usuario AS Id_Usuario
       VALUES (@idRol, @nombre, @email, @passwordHash)`,
      {
        idRol: rol.Id_Rol,
        nombre,
        email,
        passwordHash: hash,
      },
    );
  } catch (error) {
    const numero = numeroSql(error);
    if (numero === 2627 || numero === 2601) {
      throw errorHttp(409, "Ese correo ya está registrado.");
    }
    throw error;
  }

  const usuario: UsuarioPublico = {
    Id_Usuario: usuarios[0].Id_Usuario,
    Nombre_Usuario: nombre,
    Email_Usuario: email,
    Nombre_Rol: rol.Nombre_Rol,
  };
  iniciarSesion(res, usuario);
  res.status(201).json(usuario);
});

app.post("/api/sesion", async (req, res) => {
  const email = textoRequerido(req.body?.email, "El correo", 100).toLowerCase();
  const contrasena =
    typeof req.body?.password === "string" ? req.body.password : "";
  const rolSolicitado = textoRequerido(req.body?.nombreRol, "El rol", 50);
  const filas = await db.consultar<
    UsuarioPublico & { Password_Hash: string }
  >(
    `SELECT
       u.PK_ID_Usuario AS Id_Usuario,
       u.Nombre_Usuario AS Nombre_Usuario,
       u.Email_Usuario AS Email_Usuario,
       r.Nombre_Rol AS Nombre_Rol,
       u.Password_Hash AS Password_Hash
     FROM Usuarios u
     INNER JOIN Roles r ON r.PK_ID_Rol = u.FK_ID_Rol
     WHERE LOWER(u.Email_Usuario) = @email`,
    { email },
  );
  const usuario = filas[0];
  if (
    !usuario ||
    usuario.Nombre_Rol !== rolSolicitado
  ) {
    throw errorHttp(401, "Revisa el correo, la contraseña y el rol.");
  }
  const contrasenaValida = await verificarContrasena(
    contrasena,
    usuario.Password_Hash,
  );
  if (!contrasenaValida) {
    throw errorHttp(401, "Revisa el correo, la contraseña y el rol.");
  }
  if (!usuario.Password_Hash.startsWith("scrypt$")) {
    const hashActualizado = await crearHashContrasena(contrasena);
    await db.consultar(
      `UPDATE Usuarios
       SET Password_Hash = @passwordHash
       WHERE PK_ID_Usuario = @idUsuario`,
      {
        passwordHash: hashActualizado,
        idUsuario: usuario.Id_Usuario,
      },
    );
  }

  const usuarioPublico: UsuarioPublico = {
    Id_Usuario: usuario.Id_Usuario,
    Nombre_Usuario: usuario.Nombre_Usuario,
    Email_Usuario: usuario.Email_Usuario,
    Nombre_Rol: usuario.Nombre_Rol,
  };
  iniciarSesion(res, usuarioPublico);
  res.json(usuarioPublico);
});

app.delete("/api/sesion", (req, res) => {
  const sesion = leerSesion(req);
  if (sesion) {
    sesiones.delete(sesion.token);
    pretriagesActivos.delete(sesion.token);
    historialDeshacer.delete(sesion.token);
  }
  res.setHeader(
    "Set-Cookie",
    `${cookieSesion}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  );
  res.json({ Cerrada: true });
});

app.get("/api/usuarios/actual", (req, res) => {
  res.json(leerSesion(req)?.usuario ?? null);
});

app.get("/api/mascotas", async (req, res) => {
  const sesion = exigirSesion(req);
  const mascotas = await db.consultar(
    `SELECT
       m.PK_ID_Mascota AS Id_Mascota,
       m.Nombre_Mascota AS Nombre_Mascota,
       e.Nombre_Especie AS Nombre_Especie,
       m.Edad_Mascota AS Edad_Mascota,
       m.Peso_Mascota AS Peso_Mascota
     FROM Mascotas m
     INNER JOIN Especies e ON e.PK_ID_Especie = m.FK_ID_Especie
     WHERE (@esVeterinario = 1 OR m.FK_ID_Usuario = @idUsuario)
     ORDER BY m.Nombre_Mascota`,
    {
      esVeterinario: sesion.usuario.Nombre_Rol === "Veterinario" ? 1 : 0,
      idUsuario: sesion.usuario.Id_Usuario,
    },
  );
  res.json(mascotas);
});

app.post("/api/mascotas", async (req, res) => {
  const sesion = exigirSesion(req);
  exigirRol(sesion, "Dueño");
  const nombre = textoRequerido(req.body?.Nombre_Mascota, "El nombre de la mascota", 50);
  const nombreEspecie = textoRequerido(req.body?.Nombre_Especie, "La especie", 50);
  const edad = Number(req.body?.Edad_Mascota);
  const peso = Number(req.body?.Peso_Mascota);
  if (!Number.isInteger(edad) || edad < 0 || edad > 100) {
    throw errorHttp(400, "La edad de la mascota no es válida.");
  }
  if (!Number.isFinite(peso) || peso <= 0 || peso > 999.99) {
    throw errorHttp(400, "El peso de la mascota no es válido.");
  }

  const especies = await db.consultar<{ Id_Especie: number }>(
    `SELECT PK_ID_Especie AS Id_Especie
     FROM Especies
     WHERE Nombre_Especie = @nombre`,
    { nombre: nombreEspecie },
  );
  if (!especies[0]) throw errorHttp(400, "La especie seleccionada no existe.");

  const filas = await db.consultar<{ Id_Mascota: number }>(
    `INSERT INTO Mascotas
       (FK_ID_Especie, FK_ID_Usuario, Nombre_Mascota, Edad_Mascota, Peso_Mascota)
     OUTPUT INSERTED.PK_ID_Mascota AS Id_Mascota
     VALUES (@idEspecie, @idUsuario, @nombre, @edad, @peso)`,
    {
      idEspecie: especies[0].Id_Especie,
      idUsuario: sesion.usuario.Id_Usuario,
      nombre,
      edad,
      peso,
    },
  );
  agregarAccionDeshacer(sesion.token, {
    Tipo: "Mascota",
    Id_Mascota: filas[0].Id_Mascota,
    Id_Usuario: sesion.usuario.Id_Usuario,
  });
  res.status(201).json({
    Id_Mascota: filas[0].Id_Mascota,
    Nombre_Mascota: nombre,
    Nombre_Especie: nombreEspecie,
    Edad_Mascota: edad,
    Peso_Mascota: peso,
  });
});

app.post("/api/akinator/iniciar", async (req, res) => {
  const sesion = exigirSesion(req);
  exigirRol(sesion, "Dueño");
  const idMascota = enteroPositivo(req.body?.Id_Mascota, "La mascota");
  const mascotas = await db.consultar<{ Id_Mascota: number }>(
    `SELECT PK_ID_Mascota AS Id_Mascota
     FROM Mascotas
     WHERE PK_ID_Mascota = @idMascota
       AND FK_ID_Usuario = @idUsuario`,
    { idMascota, idUsuario: sesion.usuario.Id_Usuario },
  );
  if (!mascotas[0]) throw errorHttp(404, "No se encontró una mascota tuya con ese ID.");

  const pretriage: PretriageActivo = {
    Id_Mascota: idMascota,
    Indice_Pregunta: 0,
    Puntos: 0,
    Sintomas: [],
  };
  pretriagesActivos.set(sesion.token, pretriage);
  res.json(preguntaActual(pretriage));
});

app.post("/api/akinator/responder", async (req, res) => {
  const sesion = exigirSesion(req);
  exigirRol(sesion, "Dueño");
  const pretriage = pretriagesActivos.get(sesion.token);
  if (!pretriage) throw errorHttp(400, "Inicia primero el pre-triage.");

  const pregunta = preguntas[pretriage.Indice_Pregunta];
  const numeroOpcion = Number(req.body?.Numero_Opcion);
  if (!pregunta || !Number.isInteger(numeroOpcion)) {
    throw errorHttp(400, "La respuesta no es válida.");
  }
  const opcion = pregunta.Opciones[numeroOpcion - 1];
  if (!opcion) throw errorHttp(400, "Selecciona una opción válida.");

  pretriage.Puntos += opcion.Puntos;
  pretriage.Sintomas.push(opcion.Texto_Opcion);
  pretriage.Indice_Pregunta += 1;
  if (pretriage.Indice_Pregunta < preguntas.length) {
    res.json(preguntaActual(pretriage));
    return;
  }

  const gravedad = gravedadPorPuntos(pretriage.Puntos);
  const consultas = await db.consultar<{ Id_Consulta_Akinator: number }>(
    `INSERT INTO Consultas_Akinator
       (FK_ID_Mascota, Sintomas_Cap, Resultado_Prel)
     OUTPUT INSERTED.PK_ID_Consulta AS Id_Consulta_Akinator
     VALUES (@idMascota, @sintomas, @resultado)`,
    {
      idMascota: pretriage.Id_Mascota,
      sintomas: pretriage.Sintomas.join(", "),
      resultado: gravedad,
    },
  );
  pretriagesActivos.delete(sesion.token);
  res.json({
    Tipo_Respuesta: "Resultado",
    Id_Consulta_Akinator: consultas[0].Id_Consulta_Akinator,
    Id_Mascota: pretriage.Id_Mascota,
    Sintomas_Cap: pretriage.Sintomas.join(", "),
    Resultado_Prel: gravedad,
    Puntos_Akinator: pretriage.Puntos,
    Fecha_Consulta: new Date().toISOString(),
  });
});

app.get("/api/recomendaciones/:idConsulta", async (req, res) => {
  const sesion = exigirSesion(req);
  const idConsulta = enteroPositivo(req.params.idConsulta, "La consulta");
  const consultas = await db.consultar<{
    Resultado_Prel: string;
    Nombre_Especie: string;
    Peso_Mascota: number;
  }>(
    `SELECT
       q.Resultado_Prel AS Resultado_Prel,
       e.Nombre_Especie AS Nombre_Especie,
       m.Peso_Mascota AS Peso_Mascota
     FROM Consultas_Akinator q
     INNER JOIN Mascotas m ON m.PK_ID_Mascota = q.FK_ID_Mascota
     INNER JOIN Especies e ON e.PK_ID_Especie = m.FK_ID_Especie
     WHERE q.PK_ID_Consulta = @idConsulta
       AND (@esVeterinario = 1 OR m.FK_ID_Usuario = @idUsuario)`,
    {
      idConsulta,
      esVeterinario: sesion.usuario.Nombre_Rol === "Veterinario" ? 1 : 0,
      idUsuario: sesion.usuario.Id_Usuario,
    },
  );
  const consulta = consultas[0];
  if (!consulta) throw errorHttp(404, "No se encontró el resultado del pre-triage.");
  res.json({
    Gravedad: consulta.Resultado_Prel,
    Texto_Recomendacion: `${recomendaciones[consulta.Resultado_Prel]} (${consulta.Nombre_Especie}, ${consulta.Peso_Mascota} kg).`,
  });
});

app.post("/api/citas", async (req, res) => {
  const sesion = exigirSesion(req);
  exigirRol(sesion, "Dueño");
  const idConsulta = enteroPositivo(
    req.body?.Id_Consulta_Akinator,
    "La consulta",
  );
  const fechaPropuesta =
    typeof req.body?.Fecha_Propuesta === "string"
      ? new Date(req.body.Fecha_Propuesta)
      : new Date(Number.NaN);
  if (Number.isNaN(fechaPropuesta.getTime()) || fechaPropuesta <= new Date()) {
    throw errorHttp(400, "Selecciona una fecha y hora futuras.");
  }
  if (
    fechaPropuesta.getUTCMinutes() % 30 !== 0 ||
    fechaPropuesta.getUTCSeconds() !== 0 ||
    fechaPropuesta.getUTCMilliseconds() !== 0
  ) {
    throw errorHttp(400, "Selecciona un horario en intervalos de 30 minutos.");
  }

  const consultas = await db.consultar<{
    Id_Mascota: number;
    Resultado_Prel: string;
    Sintomas_Cap: string;
  }>(
    `SELECT
       q.FK_ID_Mascota AS Id_Mascota,
       q.Resultado_Prel AS Resultado_Prel,
       q.Sintomas_Cap AS Sintomas_Cap
     FROM Consultas_Akinator q
     INNER JOIN Mascotas m ON m.PK_ID_Mascota = q.FK_ID_Mascota
     WHERE q.PK_ID_Consulta = @idConsulta
       AND m.FK_ID_Usuario = @idUsuario`,
    { idConsulta, idUsuario: sesion.usuario.Id_Usuario },
  );
  const consulta = consultas[0];
  if (!consulta) throw errorHttp(404, "No se encontró un pre-triage tuyo.");
  if (consulta.Resultado_Prel !== "Grave") {
    throw errorHttp(403, "Solo los resultados graves permiten solicitar una cita.");
  }

  const veterinarios = await db.consultar<{ Id_Usuario: number }>(
    `SELECT TOP (1) u.PK_ID_Usuario AS Id_Usuario
     FROM Usuarios u
     INNER JOIN Roles r ON r.PK_ID_Rol = u.FK_ID_Rol
     WHERE r.Nombre_Rol = 'Veterinario'
     ORDER BY u.PK_ID_Usuario`,
  );
  if (!veterinarios[0]) {
    throw errorHttp(409, "Todavía no hay un veterinario registrado para recibir solicitudes.");
  }

  const citas = await db.consultar<{
    Id_Cita?: number;
    Conflicto?: string;
  }>(
    `SET XACT_ABORT ON;
     BEGIN TRY
       BEGIN TRANSACTION;

       IF EXISTS (
         SELECT 1
         FROM Citas WITH (UPDLOCK, HOLDLOCK)
         WHERE FK_ID_Consulta = @idConsulta
           AND Estado_Cita IN ('Pendiente', 'Aceptada', 'Completada')
       )
       BEGIN
         ROLLBACK TRANSACTION;
         SELECT 'pretriage' AS Conflicto;
         RETURN;
       END;

       IF EXISTS (
         SELECT 1
         FROM Citas WITH (UPDLOCK, HOLDLOCK)
         WHERE Fecha_Propuesta = @fecha
           AND Estado_Cita IN ('Pendiente', 'Aceptada')
       )
       BEGIN
         ROLLBACK TRANSACTION;
         SELECT 'horario' AS Conflicto;
         RETURN;
       END;

       INSERT INTO Citas
         (FK_ID_Consulta, FK_ID_Usuario, Fecha_Propuesta, Estado_Cita)
       OUTPUT INSERTED.PK_ID_Cita AS Id_Cita
       VALUES (@idConsulta, @idVeterinario, @fecha, 'Pendiente');

       COMMIT TRANSACTION;
     END TRY
     BEGIN CATCH
       IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
       THROW;
     END CATCH;`,
    {
      idConsulta,
      idVeterinario: veterinarios[0].Id_Usuario,
      fecha: fechaPropuesta,
    },
  );
  if (citas[0]?.Conflicto === "pretriage") {
    throw errorHttp(409, "Este pre-triage ya tiene una solicitud activa.");
  }
  if (citas[0]?.Conflicto === "horario") {
    throw errorHttp(409, "Ese horario ya está solicitado. Elige otro.");
  }
  if (!citas[0]?.Id_Cita) {
    throw new Error("No se pudo guardar la solicitud de cita.");
  }
  const cita = {
    Id_Cita: citas[0].Id_Cita,
    Id_Consulta_Akinator: idConsulta,
    Id_Mascota: consulta.Id_Mascota,
    Email_Usuario: sesion.usuario.Email_Usuario,
    Resultado_Prel: consulta.Resultado_Prel,
    Sintomas_Cap: consulta.Sintomas_Cap,
    Fecha_Propuesta: fechaPropuesta.toISOString(),
    Estado_Cita: "Pendiente",
  };
  agregarAccionDeshacer(sesion.token, {
    Tipo: "Cita",
    Id_Cita: cita.Id_Cita,
    Id_Usuario: sesion.usuario.Id_Usuario,
  });
  res.status(201).json(cita);
});

app.get("/api/citas", async (req, res) => {
  const sesion = exigirSesion(req);
  res.json(await consultarCitas(sesion));
});

app.patch("/api/citas/:idCita/estado", async (req, res) => {
  const sesion = exigirSesion(req);
  exigirRol(sesion, "Veterinario");
  const idCita = enteroPositivo(req.params.idCita, "La cita");
  const estadoNuevo = textoRequerido(req.body?.Estado_Cita, "El estado", 30);
  const citas = await db.consultar<{
    Estado_Cita: string;
    Fecha_Propuesta: Date;
    Id_Veterinario: number;
  }>(
    `SELECT
       Estado_Cita,
       Fecha_Propuesta,
       FK_ID_Usuario AS Id_Veterinario
     FROM Citas
     WHERE PK_ID_Cita = @idCita`,
    { idCita },
  );
  const cita = citas[0];
  if (!cita) throw errorHttp(404, "No se encontró la solicitud.");
  if (cita.Id_Veterinario !== sesion.usuario.Id_Usuario) {
    throw errorHttp(403, "Esta solicitud está asignada a otro veterinario.");
  }

  const transiciones: Record<string, string[]> = {
    Pendiente: ["Aceptada", "Rechazada"],
    Aceptada: ["Completada"],
  };
  if (!transiciones[cita.Estado_Cita]?.includes(estadoNuevo)) {
    throw errorHttp(409, "La transición de estado solicitada no está permitida.");
  }
  if (
    estadoNuevo === "Aceptada" &&
    new Date(cita.Fecha_Propuesta).getTime() <= Date.now()
  ) {
    throw errorHttp(409, "No se puede aceptar una fecha que ya pasó.");
  }

  const actualizadas = await db.consultar<{ Estado_Cita: string }>(
    `UPDATE Citas
     SET Estado_Cita = @estadoNuevo
     OUTPUT INSERTED.Estado_Cita AS Estado_Cita
     WHERE PK_ID_Cita = @idCita
       AND Estado_Cita = @estadoAnterior`,
    {
      idCita,
      estadoNuevo,
      estadoAnterior: cita.Estado_Cita,
    },
  );
  if (!actualizadas[0]) {
    throw errorHttp(409, "La solicitud cambió; actualiza la agenda e inténtalo otra vez.");
  }

  agregarAccionDeshacer(sesion.token, {
    Tipo: "Estado_Cita",
    Id_Cita: idCita,
    Id_Veterinario: sesion.usuario.Id_Usuario,
    Estado_Anterior: cita.Estado_Cita,
    Estado_Nuevo: estadoNuevo,
  });
  res.json({ Id_Cita: idCita, Estado_Cita: actualizadas[0].Estado_Cita });
});

async function exigirCitaEditable(
  sesion: Sesion,
  idCita: number,
): Promise<void> {
  const citas = await db.consultar<{
    Estado_Cita: string;
    Id_Veterinario: number;
  }>(
    `SELECT
       Estado_Cita,
       FK_ID_Usuario AS Id_Veterinario
     FROM Citas
     WHERE PK_ID_Cita = @idCita`,
    { idCita },
  );
  if (!citas[0]) throw errorHttp(404, "No se encontró la cita.");
  if (citas[0].Id_Veterinario !== sesion.usuario.Id_Usuario) {
    throw errorHttp(403, "Esta cita está asignada a otro veterinario.");
  }
  if (!["Aceptada", "Completada"].includes(citas[0].Estado_Cita)) {
    throw errorHttp(
      409,
      "El expediente solo está disponible para citas aceptadas o completadas.",
    );
  }
}

app.get("/api/citas/:idCita/expediente", async (req, res) => {
  const sesion = exigirSesion(req);
  exigirRol(sesion, "Veterinario");
  const idCita = enteroPositivo(req.params.idCita, "La cita");
  await exigirCitaEditable(sesion, idCita);
  const expedientes = await db.consultar<ExpedientePrevio>(
    `SELECT
       Diagnostico_Medico AS Diagnostico_Medico,
       Receta_Instrucciones AS Receta_Instrucciones
     FROM Observaciones_Medicas
     WHERE FK_ID_Cita = @idCita`,
    { idCita },
  );
  res.json({
    Id_Cita: idCita,
    Diagnostico_Medico: expedientes[0]?.Diagnostico_Medico ?? "",
    Receta_Instrucciones: expedientes[0]?.Receta_Instrucciones ?? "",
  });
});

app.put("/api/citas/:idCita/expediente", async (req, res) => {
  const sesion = exigirSesion(req);
  exigirRol(sesion, "Veterinario");
  const idCita = enteroPositivo(req.params.idCita, "La cita");
  const diagnostico = textoRequerido(
    req.body?.Diagnostico_Medico,
    "El diagnóstico",
    4000,
  );
  const receta = textoRequerido(
    req.body?.Receta_Instrucciones,
    "Las instrucciones",
    4000,
  );
  await exigirCitaEditable(sesion, idCita);

  const expedientesPrevios = await db.consultar<ExpedientePrevio>(
    `SELECT
       Diagnostico_Medico AS Diagnostico_Medico,
       Receta_Instrucciones AS Receta_Instrucciones
     FROM Observaciones_Medicas
     WHERE FK_ID_Cita = @idCita`,
    { idCita },
  );
  const anterior = expedientesPrevios[0] ?? null;
  await db.consultar(
    `SET XACT_ABORT ON;
     BEGIN TRY
       BEGIN TRANSACTION;

       UPDATE Observaciones_Medicas WITH (UPDLOCK, HOLDLOCK)
       SET Diagnostico_Medico = @diagnostico,
           Receta_Instrucciones = @receta
       WHERE FK_ID_Cita = @idCita;

       IF @@ROWCOUNT = 0
         INSERT INTO Observaciones_Medicas
           (FK_ID_Cita, Diagnostico_Medico, Receta_Instrucciones)
         VALUES (@idCita, @diagnostico, @receta);

       COMMIT TRANSACTION;
     END TRY
     BEGIN CATCH
       IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
       THROW;
     END CATCH;`,
    { idCita, diagnostico, receta },
  );
  agregarAccionDeshacer(sesion.token, {
    Tipo: "Expediente",
    Id_Cita: idCita,
    Id_Veterinario: sesion.usuario.Id_Usuario,
    Anterior: anterior,
  });
  res.json({
    Id_Cita: idCita,
    Diagnostico_Medico: diagnostico,
    Receta_Instrucciones: receta,
    Fecha_Observacion: new Date().toISOString(),
  });
});

app.post("/api/acciones/deshacer", async (req, res) => {
  const sesion = exigirSesion(req);
  const historial = historialDeshacer.get(sesion.token) ?? [];
  const accion = historial[historial.length - 1];
  if (!accion) {
    res.json({ Deshecha: false });
    return;
  }

  switch (accion.Tipo) {
    case "Mascota": {
      if (accion.Id_Usuario !== sesion.usuario.Id_Usuario) {
        throw errorHttp(403, "No tienes permiso para deshacer esta acción.");
      }
      const consultas = await db.consultar<{ Id_Consulta: number }>(
        `SELECT TOP (1) PK_ID_Consulta AS Id_Consulta
         FROM Consultas_Akinator
         WHERE FK_ID_Mascota = @idMascota`,
        { idMascota: accion.Id_Mascota },
      );
      if (consultas[0]) {
        throw errorHttp(409, "No se puede eliminar una mascota con consultas registradas.");
      }
      await db.consultar(
        `DELETE FROM Mascotas
         WHERE PK_ID_Mascota = @idMascota
           AND FK_ID_Usuario = @idUsuario`,
        { idMascota: accion.Id_Mascota, idUsuario: accion.Id_Usuario },
      );
      break;
    }
    case "Cita": {
      if (accion.Id_Usuario !== sesion.usuario.Id_Usuario) {
        throw errorHttp(403, "No tienes permiso para deshacer esta acción.");
      }
      const citas = await db.consultar<{ Estado_Cita: string }>(
        `SELECT Estado_Cita
         FROM Citas
         WHERE PK_ID_Cita = @idCita`,
        { idCita: accion.Id_Cita },
      );
      if (!citas[0] || citas[0].Estado_Cita !== "Pendiente") {
        throw errorHttp(409, "Solo se puede deshacer una solicitud que sigue pendiente.");
      }
      await db.consultar(
        `DELETE FROM Citas
         WHERE PK_ID_Cita = @idCita
           AND Estado_Cita = 'Pendiente'`,
        { idCita: accion.Id_Cita },
      );
      break;
    }
    case "Estado_Cita": {
      exigirRol(sesion, "Veterinario");
      if (accion.Id_Veterinario !== sesion.usuario.Id_Usuario) {
        throw errorHttp(403, "No tienes permiso para deshacer esta acción.");
      }
      const resultado = await db.consultar<{ Estado_Cita: string }>(
        `UPDATE Citas
         SET Estado_Cita = @estadoAnterior
         OUTPUT INSERTED.Estado_Cita AS Estado_Cita
         WHERE PK_ID_Cita = @idCita
           AND FK_ID_Usuario = @idVeterinario
           AND Estado_Cita = @estadoNuevo`,
        {
          idCita: accion.Id_Cita,
          idVeterinario: accion.Id_Veterinario,
          estadoAnterior: accion.Estado_Anterior,
          estadoNuevo: accion.Estado_Nuevo,
        },
      );
      if (!resultado[0]) {
        throw errorHttp(409, "La cita cambió y ya no se puede deshacer esa transición.");
      }
      break;
    }
    case "Expediente": {
      exigirRol(sesion, "Veterinario");
      if (accion.Id_Veterinario !== sesion.usuario.Id_Usuario) {
        throw errorHttp(403, "No tienes permiso para deshacer esta acción.");
      }
      if (accion.Anterior) {
        await db.consultar(
          `UPDATE Observaciones_Medicas
           SET Diagnostico_Medico = @diagnostico,
               Receta_Instrucciones = @receta
           WHERE FK_ID_Cita = @idCita`,
          {
            idCita: accion.Id_Cita,
            diagnostico: accion.Anterior.Diagnostico_Medico,
            receta: accion.Anterior.Receta_Instrucciones,
          },
        );
      } else {
        await db.consultar(
          `DELETE FROM Observaciones_Medicas WHERE FK_ID_Cita = @idCita`,
          { idCita: accion.Id_Cita },
        );
      }
      break;
    }
  }

  historial.pop();
  res.json({
    Deshecha: true,
    Tipo_Accion: accion.Tipo === "Estado_Cita" ? "Estado_Cita" : accion.Tipo,
    Id_Cita: "Id_Cita" in accion ? accion.Id_Cita : undefined,
  });
});

app.get("/api/notificaciones", async (req, res) => {
  const sesion = exigirSesion(req);
  const citas = await consultarCitas(sesion);
  const notificaciones = citas
    .filter(
      (cita) =>
        sesion.usuario.Nombre_Rol !== "Veterinario" ||
        cita.Estado_Cita === "Pendiente",
    )
    .map((cita) => ({
      Id_Notificacion: cita.Id_Cita,
      Mensaje_Notificacion:
        sesion.usuario.Nombre_Rol === "Veterinario"
          ? `Nueva solicitud para ${cita.Nombre_Mascota}.`
          : `Tu solicitud para ${cita.Nombre_Mascota} está ${cita.Estado_Cita.toLowerCase()}.`,
      Email_Usuario:
        sesion.usuario.Nombre_Rol === "Veterinario"
          ? ""
          : sesion.usuario.Email_Usuario,
      Nombre_Rol:
        sesion.usuario.Nombre_Rol === "Veterinario" ? "Veterinario" : "",
      Fecha_Notificacion: cita.Fecha_Propuesta,
    }));
  res.json(notificaciones);
});

app.use(express.static(path.resolve(process.cwd(), "web")));

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: (error?: unknown) => void,
  ) => {
    if (error instanceof ErrorHttp) {
      res.status(error.estado).json({ error: error.message });
      return;
    }
    console.error("Error en el servidor:", error);
    res.status(500).json({ error: "Error interno del servidor; revisa la consola." });
  },
);

async function iniciarServidor(): Promise<void> {
  const puerto = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error("PORT debe ser un puerto válido.");
  }
  await db.conectar();
  app.listen(puerto, () => {
    console.log(`Sistema disponible en http://localhost:${puerto}`);
  });
}

void iniciarServidor().catch((error: unknown) => {
  console.error("No se pudo iniciar el servidor:", error);
  process.exitCode = 1;
});
