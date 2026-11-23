import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import path from "node:path";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { AgendarCitaComando } from "./Patrones/command/AgendarCitaComando";
import { CambiarEstadoCitaComando } from "./Patrones/command/CambiarEstadoCitaComando";
import { GestorComandos } from "./Patrones/command/GestorComandos";
import { RegistrarMascotaComando } from "./Patrones/command/RegistrarMascotaComando";
import { EntidadFactory } from "./Patrones/factory/EntidadFactory";
import { NotificacionDueno } from "./Patrones/observer/NotificacionDueno";
import { NotificacionVeterinario } from "./Patrones/observer/NotificacionVeterinario";
import { Notificador } from "./Patrones/observer/Notificador";
import { ConexionBaseDatos } from "./Patrones/singleton/ConexionBaseDatos";
import { EstadoAceptada } from "./Patrones/state/EstadoAceptada";
import { EstadoCompletada } from "./Patrones/state/EstadoCompletada";
import { EstadoPendiente } from "./Patrones/state/EstadoPendiente";
import { EstadoRechazada } from "./Patrones/state/EstadoRechazada";
import type { EstadoCita } from "./Patrones/state/EstadoCita";
import { MotorRecomendaciones } from "./Patrones/strategy/MotorRecomendaciones";

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

interface CitaDb {
  Id_Cita: number;
  Id_Mascota: number;
  Nombre_Mascota: string;
  Nombre_Especie: string;
  Nombre_Usuario: string;
  Email_Usuario: string;
  Tipo_Cita: string;
  Texto_Recomendacion: string;
  Fecha_Propuesta: Date;
  Estado_Cita: string;
}

interface NotificacionWeb {
  Id_Notificacion: number;
  Mensaje_Notificacion: string;
  Fecha_Notificacion: string;
}

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
const comandos = new GestorComandos();
const motorRecomendaciones = new MotorRecomendaciones();
const cookieSesion = "verito_session";
const sesiones = new Map<string, UsuarioPublico>();
const notificaciones = new Map<number, NotificacionWeb[]>();
let siguienteNotificacion = 1;

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
    throw errorHttp(
      400,
      `${campo} es obligatorio y no debe exceder ${maximo} caracteres.`,
    );
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

function iniciarSesion(res: Response, usuario: UsuarioPublico): void {
  const token = randomBytes(32).toString("hex");
  sesiones.set(token, usuario);
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${cookieSesion}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${seguro}`,
  );
}

function derivarClave(contrasena: string, sal: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(contrasena, sal, 64, (error, clave) => {
      if (error) reject(error);
      else resolve(clave);
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

function estadoCita(nombre: string): EstadoCita {
  switch (nombre) {
    case "Pendiente":
      return new EstadoPendiente();
    case "Aceptada":
      return new EstadoAceptada();
    case "Rechazada":
      return new EstadoRechazada();
    case "Completada":
      return new EstadoCompletada();
    default:
      throw new Error(`Estado de cita desconocido: ${nombre}`);
  }
}

function guardarNotificacion(
  idUsuario: number,
  mensaje: string,
): void {
  const lista = notificaciones.get(idUsuario) ?? [];
  lista.unshift({
    Id_Notificacion: siguienteNotificacion++,
    Mensaje_Notificacion: mensaje,
    Fecha_Notificacion: new Date().toISOString(),
  });
  notificaciones.set(idUsuario, lista.slice(0, 20));
}

function notificarCita(
  idDueno: number,
  idVeterinario: number,
  nombreMascota: string,
  estado?: string,
): void {
  const notificador = new Notificador();
  notificador.agregarObservador(
    new NotificacionDueno((mensaje) => guardarNotificacion(idDueno, mensaje)),
  );
  notificador.agregarObservador(
    new NotificacionVeterinario((mensaje) =>
      guardarNotificacion(idVeterinario, mensaje),
    ),
  );
  notificador.notificar(
    estado
      ? `La cita de ${nombreMascota} cambió a ${estado}.`
      : `Hay una nueva solicitud de cita para ${nombreMascota}.`,
  );
}

async function consultarCitas(sesion: Sesion): Promise<
  (CitaDb & {
    Acciones_Disponibles: ReturnType<EstadoCita["accionesDisponibles"]>;
  })[]
> {
  const filas = await db.consultar<CitaDb>(
    `SELECT
       c.PK_ID_Cita AS Id_Cita,
       m.PK_ID_Mascota AS Id_Mascota,
       m.Nombre_Mascota AS Nombre_Mascota,
       e.Nombre_Especie AS Nombre_Especie,
       dueno.Nombre_Usuario AS Nombre_Usuario,
       dueno.Email_Usuario AS Email_Usuario,
       c.Tipo_Cita AS Tipo_Cita,
       c.Fecha_Propuesta AS Fecha_Propuesta,
       c.Estado_Cita AS Estado_Cita
     FROM Citas c
     INNER JOIN Mascotas m ON m.PK_ID_Mascota = c.FK_ID_Mascota
     INNER JOIN Especies e ON e.PK_ID_Especie = m.FK_ID_Especie
     INNER JOIN Usuarios dueno ON dueno.PK_ID_Usuario = m.FK_ID_Usuario
     WHERE (@esVeterinario = 1 AND c.FK_ID_Usuario = @idUsuario)
        OR (@esVeterinario = 0 AND m.FK_ID_Usuario = @idUsuario)
     ORDER BY c.Fecha_Propuesta DESC`,
    {
      esVeterinario: sesion.usuario.Nombre_Rol === "Veterinario" ? 1 : 0,
      idUsuario: sesion.usuario.Id_Usuario,
    },
  );
  return filas.map((cita) => ({
    ...cita,
    Texto_Recomendacion: motorRecomendaciones.recomendar(cita.Tipo_Cita),
    Acciones_Disponibles: estadoCita(cita.Estado_Cita).accionesDisponibles(),
  }));
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

app.get("/api/tipos-cita", (_req, res) => {
  res.json(motorRecomendaciones.tiposDisponibles());
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
      { idRol: rol.Id_Rol, nombre, email, passwordHash: hash },
    );
  } catch (error) {
    const numero = numeroSql(error);
    if (numero === 2627 || numero === 2601) {
      throw errorHttp(409, "Ese correo ya está registrado.");
    }
    throw error;
  }

  const entidad = EntidadFactory.crearUsuario(
    rol.Id_Rol,
    nombre,
    email,
    hash,
    usuarios[0].Id_Usuario,
  );
  const usuario: UsuarioPublico = {
    Id_Usuario: entidad.getIdUsuario(),
    Nombre_Usuario: entidad.getNombreUsuario(),
    Email_Usuario: entidad.getEmailUsuario(),
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
  if (!usuario || usuario.Nombre_Rol !== rolSolicitado) {
    throw errorHttp(401, "Revisa el correo, la contraseña y el rol.");
  }
  if (!(await verificarContrasena(contrasena, usuario.Password_Hash))) {
    throw errorHttp(401, "Revisa el correo, la contraseña y el rol.");
  }
  if (!usuario.Password_Hash.startsWith("scrypt$")) {
    const hashActualizado = await crearHashContrasena(contrasena);
    await db.consultar(
      `UPDATE Usuarios
       SET Password_Hash = @passwordHash
       WHERE PK_ID_Usuario = @idUsuario`,
      { passwordHash: hashActualizado, idUsuario: usuario.Id_Usuario },
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
    comandos.limpiar(sesion.token);
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
  const nombre = textoRequerido(
    req.body?.Nombre_Mascota,
    "El nombre de la mascota",
    50,
  );
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

  let mascotaCreada: {
    Id_Mascota: number;
    Nombre_Mascota: string;
    Nombre_Especie: string;
    Edad_Mascota: number;
    Peso_Mascota: number;
  } | undefined;
  const comando = new RegistrarMascotaComando(
    async () => {
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
      const entidad = EntidadFactory.crearMascota(
        especies[0].Id_Especie,
        sesion.usuario.Id_Usuario,
        nombre,
        edad,
        peso,
        filas[0].Id_Mascota,
      );
      mascotaCreada = {
        Id_Mascota: entidad.getIdMascota(),
        Nombre_Mascota: entidad.getNombreMascota(),
        Nombre_Especie: nombreEspecie,
        Edad_Mascota: edad,
        Peso_Mascota: peso,
      };
      return entidad.getIdMascota();
    },
    async (idMascota) => {
      const referenciasAntiguas = await db.consultar<{ Tiene_Consulta: number }>(
        `DECLARE @hayConsulta BIT = 0;
         IF OBJECT_ID('dbo.Consultas_Akinator', 'U') IS NOT NULL
         BEGIN
           EXEC sp_executesql
             N'SELECT @hay = CASE WHEN EXISTS (
                 SELECT 1 FROM dbo.Consultas_Akinator WHERE FK_ID_Mascota = @id
               ) THEN 1 ELSE 0 END;',
             N'@id INT, @hay BIT OUTPUT',
             @id = @idMascota,
             @hay = @hayConsulta OUTPUT;
         END;
         SELECT CAST(@hayConsulta AS INT) AS Tiene_Consulta;`,
        { idMascota },
      );
      if (referenciasAntiguas[0]?.Tiene_Consulta) {
        throw errorHttp(409, "No se puede deshacer una mascota con registros anteriores.");
      }
      const eliminadas = await db.consultar<{ Id_Mascota: number }>(
        `DELETE FROM Mascotas
         OUTPUT DELETED.PK_ID_Mascota AS Id_Mascota
         WHERE PK_ID_Mascota = @idMascota
           AND FK_ID_Usuario = @idUsuario
           AND NOT EXISTS (
             SELECT 1 FROM Citas c WHERE c.FK_ID_Mascota = @idMascota
           )`,
        { idMascota, idUsuario: sesion.usuario.Id_Usuario },
      );
      if (!eliminadas[0]) {
        throw errorHttp(409, "No se puede deshacer una mascota que ya tiene citas.");
      }
    },
  );
  await comandos.ejecutar(sesion.token, comando);
  if (!mascotaCreada) throw new Error("No se pudo registrar la mascota.");
  res.status(201).json({
    ...mascotaCreada,
  });
});

app.post("/api/citas", async (req, res) => {
  const sesion = exigirSesion(req);
  exigirRol(sesion, "Dueño");
  const idMascota = enteroPositivo(req.body?.Id_Mascota, "La mascota");
  const tipoCita = textoRequerido(req.body?.Tipo_Cita, "El tipo de cita", 50);
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

  const tipoValido = motorRecomendaciones
    .tiposDisponibles()
    .find((tipo) => tipo === tipoCita);
  if (!tipoValido) throw errorHttp(400, "El tipo de cita seleccionado no es válido.");
  const textoRecomendacion = motorRecomendaciones.recomendar(tipoValido);
  const mascotas = await db.consultar<{
    Id_Mascota: number;
    Nombre_Mascota: string;
  }>(
    `SELECT PK_ID_Mascota AS Id_Mascota, Nombre_Mascota
     FROM Mascotas
     WHERE PK_ID_Mascota = @idMascota
       AND FK_ID_Usuario = @idUsuario`,
    { idMascota, idUsuario: sesion.usuario.Id_Usuario },
  );
  const mascota = mascotas[0];
  if (!mascota) throw errorHttp(404, "No se encontró una mascota tuya con ese ID.");

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
  const idVeterinario = veterinarios[0].Id_Usuario;
  let idCita = 0;
  const comando = new AgendarCitaComando(
    async () => {
      const resultado = await db.consultar<{
        Id_Cita?: number;
        Conflicto?: string;
      }>(
        `SET XACT_ABORT ON;
         BEGIN TRY
           BEGIN TRANSACTION;

           IF EXISTS (
             SELECT 1
             FROM Citas WITH (UPDLOCK, HOLDLOCK)
             WHERE FK_ID_Usuario = @idVeterinario
               AND Fecha_Propuesta = @fecha
               AND Estado_Cita IN ('Pendiente', 'Aceptada')
           )
           BEGIN
             ROLLBACK TRANSACTION;
             SELECT 'horario' AS Conflicto;
             RETURN;
           END;

           INSERT INTO Citas
             (FK_ID_Mascota, FK_ID_Usuario, Tipo_Cita, Fecha_Propuesta, Estado_Cita)
           OUTPUT INSERTED.PK_ID_Cita AS Id_Cita
           VALUES (@idMascota, @idVeterinario, @tipoCita, @fecha, 'Pendiente');

           COMMIT TRANSACTION;
         END TRY
         BEGIN CATCH
           IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
           THROW;
         END CATCH;`,
        { idVeterinario, idMascota, tipoCita, fecha: fechaPropuesta },
      );
      if (resultado[0]?.Conflicto === "horario") {
        throw errorHttp(409, "Ese horario ya está solicitado. Elige otro.");
      }
      if (!resultado[0]?.Id_Cita) {
        throw new Error("No se pudo guardar la solicitud de cita.");
      }
      idCita = resultado[0].Id_Cita;
      return idCita;
    },
    async (id) => {
      const eliminadas = await db.consultar<{ Id_Cita: number }>(
        `DELETE FROM Citas
         OUTPUT DELETED.PK_ID_Cita AS Id_Cita
         WHERE PK_ID_Cita = @idCita
           AND Estado_Cita = 'Pendiente'
           AND EXISTS (
             SELECT 1
             FROM Mascotas m
             WHERE m.PK_ID_Mascota = Citas.FK_ID_Mascota
               AND m.FK_ID_Usuario = @idUsuario
           )`,
        { idCita: id, idUsuario: sesion.usuario.Id_Usuario },
      );
      if (!eliminadas[0]) {
        throw errorHttp(409, "Solo se puede deshacer una solicitud que sigue pendiente.");
      }
    },
  );
  await comandos.ejecutar(sesion.token, comando);
  notificarCita(sesion.usuario.Id_Usuario, idVeterinario, mascota.Nombre_Mascota);
  res.status(201).json({
    Id_Cita: idCita,
    Id_Mascota: idMascota,
    Nombre_Mascota: mascota.Nombre_Mascota,
    Tipo_Cita: tipoCita,
    Fecha_Propuesta: fechaPropuesta.toISOString(),
    Estado_Cita: "Pendiente",
    Texto_Recomendacion: textoRecomendacion,
  });
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
  const filas = await db.consultar<{
    Estado_Cita: string;
    Fecha_Propuesta: Date;
    Id_Mascota: number;
    Id_Dueno: number;
    Nombre_Mascota: string;
  }>(
    `SELECT
       c.Estado_Cita AS Estado_Cita,
       c.Fecha_Propuesta AS Fecha_Propuesta,
       m.PK_ID_Mascota AS Id_Mascota,
       m.FK_ID_Usuario AS Id_Dueno,
       m.Nombre_Mascota AS Nombre_Mascota
     FROM Citas c
     INNER JOIN Mascotas m ON m.PK_ID_Mascota = c.FK_ID_Mascota
     WHERE c.PK_ID_Cita = @idCita
       AND c.FK_ID_Usuario = @idVeterinario`,
    { idCita, idVeterinario: sesion.usuario.Id_Usuario },
  );
  const cita = filas[0];
  if (!cita) throw errorHttp(404, "No se encontró una solicitud asignada a ti.");

  let estadoSiguiente: EstadoCita;
  try {
    estadoSiguiente = estadoCita(cita.Estado_Cita).transicionar(estadoNuevo);
  } catch (error) {
    if (error instanceof Error && error.message.includes("no está permitida")) {
      throw errorHttp(409, error.message);
    }
    throw error;
  }
  if (
    estadoSiguiente.nombre === "Aceptada" &&
    new Date(cita.Fecha_Propuesta).getTime() <= Date.now()
  ) {
    throw errorHttp(409, "No se puede aceptar una fecha que ya pasó.");
  }

  const actualizar = async (nuevo: string, esperado: string): Promise<void> => {
    const actualizadas = await db.consultar<{ Estado_Cita: string }>(
      `UPDATE Citas
       SET Estado_Cita = @estadoNuevo
       OUTPUT INSERTED.Estado_Cita AS Estado_Cita
       WHERE PK_ID_Cita = @idCita
         AND FK_ID_Usuario = @idVeterinario
         AND Estado_Cita = @estadoAnterior`,
      {
        idCita,
        idVeterinario: sesion.usuario.Id_Usuario,
        estadoNuevo: nuevo,
        estadoAnterior: esperado,
      },
    );
    if (!actualizadas[0]) {
      throw errorHttp(409, "La solicitud cambió; actualiza la agenda e inténtalo otra vez.");
    }
  };
  await comandos.ejecutar(
    sesion.token,
    new CambiarEstadoCitaComando(
      idCita,
      cita.Estado_Cita,
      estadoSiguiente.nombre,
      actualizar,
    ),
  );
  notificarCita(
    cita.Id_Dueno,
    sesion.usuario.Id_Usuario,
    cita.Nombre_Mascota,
    estadoSiguiente.nombre,
  );
  res.json({ Id_Cita: idCita, Estado_Cita: estadoSiguiente.nombre });
});

app.post("/api/acciones/deshacer", async (req, res) => {
  const sesion = exigirSesion(req);
  const comando = await comandos.deshacerUltimo(sesion.token);
  if (!comando) {
    res.json({ Deshecha: false });
    return;
  }
  res.json({
    Deshecha: true,
    Tipo_Accion: comando.tipoAccion,
    Id_Elemento: comando.idElemento,
  });
});

app.get("/api/notificaciones", (req, res) => {
  const sesion = exigirSesion(req);
  res.json(notificaciones.get(sesion.usuario.Id_Usuario) ?? []);
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
