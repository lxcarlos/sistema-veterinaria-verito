/* 
   1. IMPORTS Y CONFIGURACIÓN INICIAL
   Aquí traemos todas las herramientas que necesita el servidor para vivir:
   Express para las rutas web, crypto para encriptar contraseñas, y TODAS las
   clases de nuestros 6 patrones de diseño (Singleton, Factory, State,
   Strategy, Command y Observer).
    */
import "dotenv/config";
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
import { ArbolSintomas } from "./Patrones/state/ArbolSintomas";
import { MotorRecomendaciones } from "./Patrones/strategy/MotorRecomendaciones";
import { MotorOrientacionSintomas } from "./Patrones/strategy/MotorOrientacionSintomas";

type Rol = "Dueño" | "Veterinario";
interface UsuarioPublico { Id_Usuario: number; Nombre_Usuario: string; Email_Usuario: string; Nombre_Rol: Rol; }

/* Esta clase sirve para lanzar errores controlados con su código HTTP (400, 401, 404, etc.) */
class ErrorHttp extends Error {
  constructor(public readonly estado: number, mensaje: string) { super(mensaje); }
}

/* Aquí prendemos Express, jalamos la única instancia de la BD (Singleton) y preparamos
   los motores de Strategy, el gestor de Command y unos Map en memoria para guardar
   sesiones activas, evaluaciones de síntomas en curso y notificaciones. */
const app = express();
const db = ConexionBaseDatos.getInstancia();
const comandos = new GestorComandos();
const motorRec = new MotorRecomendaciones();
const motorSintomas = new MotorOrientacionSintomas();
const COOKIE = "verito_session";
const sesiones = new Map<string, UsuarioPublico>();
const evaluaciones = new Map<string, { Id_Mascota: number; Arbol: ArbolSintomas }>();
const notificaciones = new Map<number, { Id_Notificacion: number; Mensaje_Notificacion: string; Fecha_Notificacion: string }[]>();
let seqNotif = 1;

app.use(cors({ origin: process.env.APP_ORIGIN ?? "http://localhost:5500", credentials: true }));
app.use(express.json({ limit: "100kb" }));

/* 
   2. FUNCIONES AYUDANTES (VALIDAR, SESIONES, CONTRASEÑAS, ESTADOS Y AVISOS)
   Aquí se juntan puras funciones chiquitas para no repetir código a cada rato.
    */

/* texto() y entero() se usan para revisar que los datos que manda el usuario
   no vengan vacíos, muy largos o con números raros antes de tocar la BD. */
const texto = (v: unknown, campo: string, max: number) => {
  if (typeof v !== "string" || !v.trim() || v.length > max) throw new ErrorHttp(400, `${campo} es obligatorio y no debe exceder ${max} caracteres.`);
  return v.trim();
};
const entero = (v: unknown, campo: string) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1) throw new ErrorHttp(400, `${campo} debe ser un entero positivo.`);
  return n;
};

/* leerSesion() y exigir() se usan para leer la cookie del navegador, ver quién
   está conectado y bloquearlo si no ha iniciado sesión o no tiene el rol adecuado. */
function leerSesion(req: Request) {
  const par = req.headers.cookie?.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  const token = par?.slice(COOKIE.length + 1);
  const usuario = token ? sesiones.get(token) : undefined;
  return token && usuario ? { token, usuario } : null;
}
function exigir(req: Request, rol?: Rol) {
  const s = leerSesion(req);
  if (!s) throw new ErrorHttp(401, "Inicia sesión para continuar.");
  if (rol && s.usuario.Nombre_Rol !== rol) throw new ErrorHttp(403, "No tienes permiso para realizar esta acción.");
  return s;
}

/* derivar() y verificarClave() se usan para comprobar que la contraseña escrita
   al iniciar sesión coincida con la guardada en la base de datos. */
const derivar = (pass: string, sal: string) => new Promise<Buffer>((ok, err) => scrypt(pass, sal, 64, (e, k) => (e ? err(e) : ok(k))));
async function verificarClave(pass: string, hash: string) {
  if (hash.startsWith("scrypt$")) {
    const [, sal, guardada] = hash.split("$");
    if (!sal || !guardada) return false;
    const a = Buffer.from(guardada, "hex"), b = await derivar(pass, sal);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const a = Buffer.from(hash), b = Buffer.from(pass);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* Aquí conectamos el patrón STATE de las citas: convierte el texto de la BD
   ("Pendiente", "Aceptada", etc.) en su clase de estado correspondiente. */
const ESTADOS: Record<string, () => EstadoCita> = {
  Pendiente: () => new EstadoPendiente(),
  Aceptada: () => new EstadoAceptada(),
  Rechazada: () => new EstadoRechazada(),
  Completada: () => new EstadoCompletada(),
};
const estadoCita = (nombre: string) => {
  if (!ESTADOS[nombre]) throw new Error(`Estado de cita desconocido: ${nombre}`);
  return ESTADOS[nombre]();
};

/* Aquí usamos el patrón OBSERVER: cuando se crea o cambia una cita, avisa
   al mismo tiempo al dueño y al veterinario guardando su notificación. */
function notificar(idDueno: number, idVet: number, mascota: string, estado?: string) {
  const push = (id: number, msg: string) => {
    const lista = [{ Id_Notificacion: seqNotif++, Mensaje_Notificacion: msg, Fecha_Notificacion: new Date().toISOString() }, ...(notificaciones.get(id) ?? [])];
    notificaciones.set(id, lista.slice(0, 20));
  };
  const n = new Notificador();
  n.agregarObservador(new NotificacionDueno((m) => push(idDueno, m)));
  n.agregarObservador(new NotificacionVeterinario((m) => push(idVet, m)));
  n.notificar(estado ? `La cita de ${mascota} cambió a ${estado}.` : `Hay una nueva solicitud de cita para ${mascota}.`);
}

/* Aquí agarramos la pregunta actual del ArbolSintomas y la acomodamos en JSON
   para mandársela bonita a la pantalla. */
function serializarPregunta(arbol: ArbolSintomas) {
  const p = arbol.obtenerPregunta();
  if (!p) throw new ErrorHttp(400, "El árbol de síntomas ya terminó.");
  return {
    Tipo_Respuesta: "Pregunta", Numero_Pregunta: p.numero, Total_Preguntas: ArbolSintomas.totalPreguntas, Pregunta: p.texto,
    Opciones: p.opciones.map((o, i) => ({ Numero_Opcion: i + 1, Texto_Opcion: o.texto })),
  };
}

/* 
   3. CATÁLOGOS Y CUENTAS DE USUARIO (FACTORY)
   Aquí se consultan listas básicas y se maneja registro, login y cierre de sesión.
    */

/* Estas 4 rutas GET se usan para llenar los selectores de la página y saber quién está logueado. */
app.get("/api/roles", async (_req, res) => res.json(await db.consultar("SELECT PK_ID_Rol AS Id_Rol, Nombre_Rol FROM Roles ORDER BY PK_ID_Rol")));
app.get("/api/especies", async (_req, res) => res.json(await db.consultar("SELECT PK_ID_Especie AS Id_Especie, Nombre_Especie FROM Especies ORDER BY Nombre_Especie")));
app.get("/api/tipos-cita", (_req, res) => res.json(motorRec.tiposDisponibles()));
app.get("/api/usuarios/actual", (req, res) => res.json(leerSesion(req)?.usuario ?? null));

/* Aquí se registra un usuario nuevo: lo guarda en SQL, crea el objeto con el
   patrón FACTORY (EntidadFactory) y le abre sesión con su cookie. */
app.post("/api/usuarios", async (req, res) => {
  const nombre = texto(req.body?.nombre, "El nombre", 100);
  const email = texto(req.body?.email, "El correo", 100).toLowerCase();
  const pass = typeof req.body?.password === "string" ? req.body.password : "";
  const rolNombre = texto(req.body?.nombreRol, "El rol", 50);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErrorHttp(400, "Ingresa un correo válido.");
  if (pass.length < 8 || pass.length > 128) throw new ErrorHttp(400, "La contraseña debe tener entre 8 y 128 caracteres.");
  const [rol] = await db.consultar<{ Id_Rol: number; Nombre_Rol: Rol }>("SELECT PK_ID_Rol AS Id_Rol, Nombre_Rol FROM Roles WHERE Nombre_Rol = @r", { r: rolNombre });
  if (!rol) throw new ErrorHttp(400, "El rol seleccionado no existe.");
  let creados: { Id_Usuario: number }[];
  try {
    creados = await db.consultar("INSERT INTO Usuarios (FK_ID_Rol, Nombre_Usuario, Email_Usuario, Password_Hash) OUTPUT INSERTED.PK_ID_Usuario AS Id_Usuario VALUES (@r, @n, @e, @p)", { r: rol.Id_Rol, n: nombre, e: email, p: pass });
  } catch (e: any) {
    if (e?.number === 2627 || e?.number === 2601) throw new ErrorHttp(409, "Ese correo ya está registrado.");
    throw e;
  }
  const ent = EntidadFactory.crearUsuario(rol.Id_Rol, nombre, email, pass, creados[0].Id_Usuario);
  const usuario: UsuarioPublico = { Id_Usuario: ent.getIdUsuario(), Nombre_Usuario: ent.getNombreUsuario(), Email_Usuario: ent.getEmailUsuario(), Nombre_Rol: rol.Nombre_Rol };
  const token = randomBytes(32).toString("hex");
  sesiones.set(token, usuario);
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  res.status(201).json(usuario);
});

/* Aquí se inicia sesión: revisa correo, rol y contraseña; si coinciden, entrega la cookie. */
app.post("/api/sesion", async (req, res) => {
  const email = texto(req.body?.email, "El correo", 100).toLowerCase();
  const pass = typeof req.body?.password === "string" ? req.body.password : "";
  const rol = texto(req.body?.nombreRol, "El rol", 50);
  const [u] = await db.consultar<UsuarioPublico & { Password_Hash: string }>(
    "SELECT u.PK_ID_Usuario AS Id_Usuario, u.Nombre_Usuario, u.Email_Usuario, r.Nombre_Rol, u.Password_Hash FROM Usuarios u INNER JOIN Roles r ON r.PK_ID_Rol = u.FK_ID_Rol WHERE LOWER(u.Email_Usuario) = @e",
    { e: email },
  );
  if (!u || u.Nombre_Rol !== rol || !(await verificarClave(pass, u.Password_Hash))) throw new ErrorHttp(401, "Revisa el correo, la contraseña y el rol.");
  const usuario: UsuarioPublico = { Id_Usuario: u.Id_Usuario, Nombre_Usuario: u.Nombre_Usuario, Email_Usuario: u.Email_Usuario, Nombre_Rol: u.Nombre_Rol };
  const token = randomBytes(32).toString("hex");
  sesiones.set(token, usuario);
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  res.json(usuario);
});

/* Aquí se cierra sesión: borra el token en memoria, limpia comandos pendientes y expira la cookie. */
app.delete("/api/sesion", (req, res) => {
  const s = leerSesion(req);
  if (s) { sesiones.delete(s.token); evaluaciones.delete(s.token); comandos.limpiar(s.token); }
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`).json({ Cerrada: true });
});

/* 
   4. CUESTIONARIO DE SÍNTOMAS TIPO AKINATOR (STATE + STRATEGY)
   Aquí se inicia y se responde el árbol de preguntas veterinarias.
    */

/* Aquí arranca el cuestionario para una mascota del dueño: crea un ArbolSintomas
   nuevo (patrón STATE) y devuelve la primera pregunta. */
app.post("/api/akinator/iniciar", async (req, res) => {
  const s = exigir(req, "Dueño");
  const idMascota = entero(req.body?.Id_Mascota, "La mascota");
  const [m] = await db.consultar("SELECT PK_ID_Mascota FROM Mascotas WHERE PK_ID_Mascota = @m AND FK_ID_Usuario = @u", { m: idMascota, u: s.usuario.Id_Usuario });
  if (!m) throw new ErrorHttp(404, "No se encontró una mascota tuya con ese ID.");
  const arbol = new ArbolSintomas();
  evaluaciones.set(s.token, { Id_Mascota: idMascota, Arbol: arbol });
  res.json(serializarPregunta(arbol));
});

/* Aquí se contesta cada pregunta: avanza el árbol (STATE) y, cuando ya no quedan
   preguntas, le pasa los puntos al motor de STRATEGY (motorSintomas.evaluar) para
   sacar la gravedad y la recomendación, lo guarda en BD y manda el resultado final. */
app.post("/api/akinator/responder", async (req, res) => {
  const s = exigir(req, "Dueño");
  const ev = evaluaciones.get(s.token);
  if (!ev) throw new ErrorHttp(400, "Inicia primero el árbol de síntomas.");
  const opcion = Number(req.body?.Numero_Opcion);
  if (!Number.isInteger(opcion)) throw new ErrorHttp(400, "Selecciona una opción de respuesta válida.");
  try { ev.Arbol.responder(opcion); } catch (e) { if (e instanceof RangeError) throw new ErrorHttp(400, e.message); throw e; }
  if (ev.Arbol.obtenerPregunta()) return res.json(serializarPregunta(ev.Arbol));

  const orientacion = motorSintomas.evaluar(ev.Arbol.obtenerPuntos());
  const sintomas = ev.Arbol.obtenerRespuestas().join(", ");
  const [consulta] = await db.consultar<{ Id_Consulta_Akinator: number }>(
    "INSERT INTO Consultas_Akinator (FK_ID_Mascota, Sintomas_Cap, Resultado_Prel) OUTPUT INSERTED.PK_ID_Consulta AS Id_Consulta_Akinator VALUES (@m, @s, @r)",
    { m: ev.Id_Mascota, s: sintomas, r: orientacion.Gravedad },
  );
  if (!consulta) throw new Error("No se pudo guardar el resultado del árbol.");
  evaluaciones.delete(s.token);
  res.json({
    Tipo_Respuesta: "Resultado", Id_Consulta_Akinator: consulta.Id_Consulta_Akinator, Id_Mascota: ev.Id_Mascota,
    Sintomas_Cap: sintomas, Resultado_Prel: orientacion.Gravedad, Puntos_Akinator: ev.Arbol.obtenerPuntos(),
    Texto_Recomendacion: orientacion.Texto_Recomendacion, Fecha_Consulta: new Date().toISOString(),
  });
});

/* ============================================================================
   5. GESTIÓN DE MASCOTAS (FACTORY + COMMAND)
   Aquí se consultan y registran mascotas con soporte para deshacer.
   ============================================================================ */

/* Aquí se listan las mascotas: el veterinario ve todas y el dueño solo las suyas. */
app.get("/api/mascotas", async (req, res) => {
  const s = exigir(req);
  res.json(await db.consultar(
    "SELECT m.PK_ID_Mascota AS Id_Mascota, m.Nombre_Mascota, e.Nombre_Especie, m.Edad_Mascota, m.Peso_Mascota FROM Mascotas m INNER JOIN Especies e ON e.PK_ID_Especie = m.FK_ID_Especie WHERE (@vet = 1 OR m.FK_ID_Usuario = @u) ORDER BY m.Nombre_Mascota",
    { vet: s.usuario.Nombre_Rol === "Veterinario" ? 1 : 0, u: s.usuario.Id_Usuario },
  ));
});

/* Aquí se registra una mascota nueva usando FACTORY para armar la entidad y
   COMMAND (RegistrarMascotaComando) para que el dueño pueda deshacer el registro. */
app.post("/api/mascotas", async (req, res) => {
  const s = exigir(req, "Dueño");
  const nombre = texto(req.body?.Nombre_Mascota, "El nombre de la mascota", 50);
  const especie = texto(req.body?.Nombre_Especie, "La especie", 50);
  const edad = Number(req.body?.Edad_Mascota), peso = Number(req.body?.Peso_Mascota);
  if (!Number.isInteger(edad) || edad < 0 || edad > 100) throw new ErrorHttp(400, "La edad de la mascota no es válida.");
  if (!Number.isFinite(peso) || peso <= 0 || peso > 999.99) throw new ErrorHttp(400, "El peso de la mascota no es válido.");
  const [esp] = await db.consultar<{ Id_Especie: number }>("SELECT PK_ID_Especie AS Id_Especie FROM Especies WHERE Nombre_Especie = @n", { n: especie });
  if (!esp) throw new ErrorHttp(400, "La especie seleccionada no existe.");

  let creada: any;
  await comandos.ejecutar(s.token, new RegistrarMascotaComando(
    async () => {
      const [f] = await db.consultar<{ Id_Mascota: number }>("INSERT INTO Mascotas (FK_ID_Especie, FK_ID_Usuario, Nombre_Mascota, Edad_Mascota, Peso_Mascota) OUTPUT INSERTED.PK_ID_Mascota AS Id_Mascota VALUES (@e, @u, @n, @ed, @p)", { e: esp.Id_Especie, u: s.usuario.Id_Usuario, n: nombre, ed: edad, p: peso });
      const ent = EntidadFactory.crearMascota(esp.Id_Especie, s.usuario.Id_Usuario, nombre, edad, peso, f.Id_Mascota);
      creada = { Id_Mascota: ent.getIdMascota(), Nombre_Mascota: ent.getNombreMascota(), Nombre_Especie: especie, Edad_Mascota: edad, Peso_Mascota: peso };
      return ent.getIdMascota();
    },
    async (id) => {
      const [ref] = await db.consultar<{ Tiene: number }>("SELECT CASE WHEN OBJECT_ID('dbo.Consultas_Akinator','U') IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.Consultas_Akinator WHERE FK_ID_Mascota = @id) THEN 1 ELSE 0 END AS Tiene", { id });
      if (ref?.Tiene) throw new ErrorHttp(409, "No se puede deshacer una mascota con registros anteriores.");
      const del = await db.consultar("DELETE FROM Mascotas OUTPUT DELETED.PK_ID_Mascota WHERE PK_ID_Mascota = @id AND FK_ID_Usuario = @u AND NOT EXISTS (SELECT 1 FROM Citas WHERE FK_ID_Mascota = @id)", { id, u: s.usuario.Id_Usuario });
      if (!del[0]) throw new ErrorHttp(409, "No se puede deshacer una mascota que ya tiene citas.");
    },
  ));
  res.status(201).json(creada);
});

/* ============================================================================
   6. CITAS, CAMBIO DE ESTADO, DESHACER Y ARRANQUE (STRATEGY + COMMAND + STATE + OBSERVER)
   Aquí se agenda, consulta y actualiza el estado de las citas veterinarias.
   ============================================================================ */

/* Aquí se traen las citas y a cada una se le agrega su recomendación (STRATEGY)
   y las acciones permitidas según su estado actual (STATE). */
app.get("/api/citas", async (req, res) => {
  const s = exigir(req);
  const filas = await db.consultar<any>(
    `SELECT c.PK_ID_Cita AS Id_Cita, c.FK_ID_Consulta AS Id_Consulta_Akinator, m.PK_ID_Mascota AS Id_Mascota, m.Nombre_Mascota, e.Nombre_Especie,
     dueno.Nombre_Usuario, dueno.Email_Usuario, c.Tipo_Cita, c.Fecha_Propuesta, c.Estado_Cita, q.Resultado_Prel, q.Sintomas_Cap
     FROM Citas c INNER JOIN Mascotas m ON m.PK_ID_Mascota = c.FK_ID_Mascota INNER JOIN Especies e ON e.PK_ID_Especie = m.FK_ID_Especie
     INNER JOIN Usuarios dueno ON dueno.PK_ID_Usuario = m.FK_ID_Usuario LEFT JOIN Consultas_Akinator q ON q.PK_ID_Consulta = c.FK_ID_Consulta
     WHERE (@vet = 1 AND c.FK_ID_Usuario = @u) OR (@vet = 0 AND m.FK_ID_Usuario = @u) ORDER BY c.Fecha_Propuesta DESC`,
    { vet: s.usuario.Nombre_Rol === "Veterinario" ? 1 : 0, u: s.usuario.Id_Usuario },
  );
  res.json(filas.map((c) => ({ ...c, Texto_Recomendacion: motorRec.recomendar(c.Tipo_Cita), Acciones_Disponibles: estadoCita(c.Estado_Cita).accionesDisponibles() })));
});

/* Aquí el dueño agenda una cita: valida horario, verifica que no esté ocupado
   con una transacción SQL, la guarda usando COMMAND y avisa con OBSERVER. */
app.post("/api/citas", async (req, res) => {
  const s = exigir(req, "Dueño");
  const idMascota = entero(req.body?.Id_Mascota, "La mascota");
  const rawCons = req.body?.Id_Consulta_Akinator;
  const idConsulta = rawCons === undefined || rawCons === null || rawCons === "" ? null : entero(rawCons, "La evaluación");
  const tipoCita = texto(req.body?.Tipo_Cita, "El tipo de cita", 50);
  const fecha = new Date(typeof req.body?.Fecha_Propuesta === "string" ? req.body.Fecha_Propuesta : NaN);
  if (Number.isNaN(fecha.getTime()) || fecha <= new Date()) throw new ErrorHttp(400, "Selecciona una fecha y hora futuras.");
  if (fecha.getUTCMinutes() % 30 !== 0 || fecha.getUTCSeconds() !== 0 || fecha.getUTCMilliseconds() !== 0) throw new ErrorHttp(400, "Selecciona un horario en intervalos de 30 minutos.");

  
  if (!motorRec.tiposDisponibles().includes(tipoCita as never)) {
  throw new ErrorHttp(400, "El tipo de cita seleccionado no es válido.");
}


  const [mascota] = await db.consultar<{ Nombre_Mascota: string }>("SELECT Nombre_Mascota FROM Mascotas WHERE PK_ID_Mascota = @m AND FK_ID_Usuario = @u", { m: idMascota, u: s.usuario.Id_Usuario });
  if (!mascota) throw new ErrorHttp(404, "No se encontró una mascota tuya con ese ID.");
  if (idConsulta !== null) {
    const [q] = await db.consultar<{ Resultado_Prel: string }>("SELECT q.Resultado_Prel FROM Consultas_Akinator q INNER JOIN Mascotas m ON m.PK_ID_Mascota = q.FK_ID_Mascota WHERE q.PK_ID_Consulta = @q AND q.FK_ID_Mascota = @m AND m.FK_ID_Usuario = @u", { q: idConsulta, m: idMascota, u: s.usuario.Id_Usuario });
    if (!q) throw new ErrorHttp(404, "No se encontró una evaluación de esa mascota.");
    if (q.Resultado_Prel !== "Grave") throw new ErrorHttp(409, "El resultado no habilita una solicitud de cita desde el árbol.");
  }
  const [vet] = await db.consultar<{ Id_Usuario: number }>("SELECT TOP (1) u.PK_ID_Usuario AS Id_Usuario FROM Usuarios u INNER JOIN Roles r ON r.PK_ID_Rol = u.FK_ID_Rol WHERE r.Nombre_Rol = 'Veterinario' ORDER BY u.PK_ID_Usuario");
  if (!vet) throw new ErrorHttp(409, "Todavía no hay un veterinario registrado para recibir solicitudes.");

  let idCita = 0;
  await comandos.ejecutar(s.token, new AgendarCitaComando(
    async () => {
      const [r] = await db.consultar<{ Id_Cita?: number; Conflicto?: string }>(
        `SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
         IF EXISTS (SELECT 1 FROM Citas WITH (UPDLOCK, HOLDLOCK) WHERE FK_ID_Usuario = @v AND Fecha_Propuesta = @f AND Estado_Cita IN ('Pendiente', 'Aceptada'))
         BEGIN ROLLBACK TRANSACTION; SELECT 'horario' AS Conflicto; RETURN; END;
         INSERT INTO Citas (FK_ID_Mascota, FK_ID_Usuario, FK_ID_Consulta, Tipo_Cita, Fecha_Propuesta, Estado_Cita) OUTPUT INSERTED.PK_ID_Cita AS Id_Cita VALUES (@m, @v, @q, @t, @f, 'Pendiente');
         COMMIT TRANSACTION; END TRY BEGIN CATCH IF XACT_STATE() <> 0 ROLLBACK TRANSACTION; THROW; END CATCH;`,
        { v: vet.Id_Usuario, m: idMascota, q: idConsulta, t: tipoCita, f: fecha },
      );
      if (r?.Conflicto === "horario") throw new ErrorHttp(409, "Ese horario ya está solicitado. Elige otro.");
      if (!r?.Id_Cita) throw new Error("No se pudo guardar la solicitud de cita.");
      return (idCita = r.Id_Cita);
    },
    async (id) => {
      const del = await db.consultar("DELETE FROM Citas OUTPUT DELETED.PK_ID_Cita WHERE PK_ID_Cita = @id AND Estado_Cita = 'Pendiente' AND EXISTS (SELECT 1 FROM Mascotas WHERE PK_ID_Mascota = Citas.FK_ID_Mascota AND FK_ID_Usuario = @u)", { id, u: s.usuario.Id_Usuario });
      if (!del[0]) throw new ErrorHttp(409, "Solo se puede deshacer una solicitud que sigue pendiente.");
    },
  ));
  notificar(s.usuario.Id_Usuario, vet.Id_Usuario, mascota.Nombre_Mascota);
  res.status(201).json({ Id_Cita: idCita, Id_Consulta_Akinator: idConsulta, Id_Mascota: idMascota, Nombre_Mascota: mascota.Nombre_Mascota, Tipo_Cita: tipoCita, Fecha_Propuesta: fecha.toISOString(), Estado_Cita: "Pendiente", Texto_Recomendacion: motorRec.recomendar(tipoCita) });
});

/* Aquí el veterinario cambia el estado de una cita (Aceptada, Rechazada, Completada):
   valida la transición con STATE, actualiza con COMMAND y avisa con OBSERVER. */
app.patch("/api/citas/:idCita/estado", async (req, res) => {
  const s = exigir(req, "Veterinario");
  const idCita = entero(req.params.idCita, "La cita");
  const nuevo = texto(req.body?.Estado_Cita, "El estado", 30);
  const [cita] = await db.consultar<{ Estado_Cita: string; Fecha_Propuesta: Date; Id_Dueno: number; Nombre_Mascota: string }>(
    "SELECT c.Estado_Cita, c.Fecha_Propuesta, m.FK_ID_Usuario AS Id_Dueno, m.Nombre_Mascota FROM Citas c INNER JOIN Mascotas m ON m.PK_ID_Mascota = c.FK_ID_Mascota WHERE c.PK_ID_Cita = @id AND c.FK_ID_Usuario = @v",
    { id: idCita, v: s.usuario.Id_Usuario },
  );
  if (!cita) throw new ErrorHttp(404, "No se encontró una solicitud asignada a ti.");
  let sig: EstadoCita;
  try { sig = estadoCita(cita.Estado_Cita).transicionar(nuevo); } catch (e: any) { if (e?.message?.includes("no está permitida")) throw new ErrorHttp(409, e.message); throw e; }
  if (sig.nombre === "Aceptada" && new Date(cita.Fecha_Propuesta).getTime() <= Date.now()) throw new ErrorHttp(409, "No se puede aceptar una fecha que ya pasó.");

  await comandos.ejecutar(s.token, new CambiarEstadoCitaComando(idCita, cita.Estado_Cita, sig.nombre, async (n, ant) => {
    const upd = await db.consultar("UPDATE Citas SET Estado_Cita = @n OUTPUT INSERTED.Estado_Cita WHERE PK_ID_Cita = @id AND FK_ID_Usuario = @v AND Estado_Cita = @ant", { id: idCita, v: s.usuario.Id_Usuario, n, ant });
    if (!upd[0]) throw new ErrorHttp(409, "La solicitud cambió; actualiza la agenda e inténtalo otra vez.");
  }));
  notificar(cita.Id_Dueno, s.usuario.Id_Usuario, cita.Nombre_Mascota, sig.nombre);
  res.json({ Id_Cita: idCita, Estado_Cita: sig.nombre });
});

/* Aquí se deshace la última acción del usuario (COMMAND), se consultan sus
   notificaciones (OBSERVER), se sirve el HTML de la carpeta web y se prende el servidor. */
app.post("/api/acciones/deshacer", async (req, res) => {
  const cmd = await comandos.deshacerUltimo(exigir(req).token);
  res.json(cmd ? { Deshecha: true, Tipo_Accion: cmd.tipoAccion, Id_Elemento: cmd.idElemento } : { Deshecha: false });
});
app.get("/api/notificaciones", (req, res) => res.json(notificaciones.get(exigir(req).usuario.Id_Usuario) ?? []));
app.use(express.static(path.resolve(process.cwd(), "web")));
app.use((err: unknown, _req: Request, res: Response, _next: any) => {
  if (err instanceof ErrorHttp) return res.status(err.estado).json({ error: err.message });
  console.error("Error en el servidor:", err);
  res.status(500).json({ error: "Error interno del servidor; revisa la consola." });
});

db.conectar().then(() => app.listen(Number(process.env.PORT ?? 3001), () => console.log(`Sistema disponible en http://localhost:${process.env.PORT ?? 3001}`))).catch((e) => { console.error("No se pudo iniciar el servidor:", e); process.exitCode = 1; });