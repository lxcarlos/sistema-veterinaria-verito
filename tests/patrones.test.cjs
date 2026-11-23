const assert = require("node:assert/strict");
const { test } = require("node:test");
const { EntidadFactory } = require("../dist/Patrones/factory/EntidadFactory");
const { GestorComandos } = require("../dist/Patrones/command/GestorComandos");
const { NotificacionDueno } = require("../dist/Patrones/observer/NotificacionDueno");
const { NotificacionVeterinario } = require("../dist/Patrones/observer/NotificacionVeterinario");
const { Notificador } = require("../dist/Patrones/observer/Notificador");
const { EstadoAceptada } = require("../dist/Patrones/state/EstadoAceptada");
const { EstadoCompletada } = require("../dist/Patrones/state/EstadoCompletada");
const { EstadoPendiente } = require("../dist/Patrones/state/EstadoPendiente");
const { EstadoRechazada } = require("../dist/Patrones/state/EstadoRechazada");
const { ArbolSintomas } = require("../dist/Patrones/state/ArbolSintomas");
const { MotorRecomendaciones } = require("../dist/Patrones/strategy/MotorRecomendaciones");
const { MotorOrientacionSintomas } = require("../dist/Patrones/strategy/MotorOrientacionSintomas");

test("Factory crea entidades para el registro web", () => {
  const usuario = EntidadFactory.crearUsuario(1, "Ana", "ana@example.com", "hash", 7);
  const mascota = EntidadFactory.crearMascota(2, 7, "Luna", 4, 8, 3);

  assert.equal(usuario.getIdUsuario(), 7);
  assert.equal(mascota.getNombreMascota(), "Luna");
});

test("Strategy selecciona una recomendación según el tipo de cita", () => {
  const motor = new MotorRecomendaciones();

  assert.deepEqual(motor.tiposDisponibles(), [
    "Consulta general",
    "Vacunación",
    "Seguimiento",
  ]);
  assert.match(motor.recomendar("Vacunación"), /cartilla/);
  assert.throws(() => motor.recomendar("Otro"), /tipo de cita/);
});

test("State permite únicamente las transiciones previstas", () => {
  const pendiente = new EstadoPendiente();
  assert.deepEqual(
    pendiente.accionesDisponibles().map((accion) => accion.Estado_Cita),
    ["Aceptada", "Rechazada"],
  );
  assert.ok(pendiente.transicionar("Aceptada") instanceof EstadoAceptada);
  assert.ok(pendiente.transicionar("Rechazada") instanceof EstadoRechazada);
  assert.ok(
    new EstadoAceptada().transicionar("Completada") instanceof EstadoCompletada,
  );
  assert.throws(() => pendiente.transicionar("Completada"), /no está permitida/);
});

test("State recorre el árbol de síntomas y conserva las respuestas", () => {
  const arbol = new ArbolSintomas();

  assert.match(arbol.obtenerPregunta().texto, /síntoma principal/i);
  assert.throws(() => arbol.responder(0), /opción de respuesta válida/);
  assert.equal(arbol.obtenerPuntos(), 0);

  arbol.responder(4);
  assert.match(arbol.obtenerPregunta().texto, /desde cuándo/i);
  arbol.responder(1);
  arbol.responder(1);
  arbol.responder(1);

  assert.equal(arbol.obtenerPregunta(), null);
  assert.equal(arbol.obtenerPuntos(), 7);
  assert.deepEqual(arbol.obtenerRespuestas(), [
    "Dificultad para respirar",
    "Desde hoy",
    "Normal",
    "Normal",
  ]);
  assert.throws(() => arbol.responder(1), /ya terminó/);
});

test("Strategy elige la orientación según el puntaje del árbol", () => {
  const motor = new MotorOrientacionSintomas();

  assert.equal(motor.evaluar(3).Gravedad, "Leve");
  assert.equal(motor.evaluar(4).Gravedad, "Moderada");
  assert.equal(motor.evaluar(7).Gravedad, "Grave");
  assert.throws(() => motor.evaluar(-1), /puntaje/);
});

test("Command ejecuta y deshace la última acción del usuario", async () => {
  let citaCreada = false;
  const comando = {
    tipoAccion: "Cita",
    idElemento: 12,
    async ejecutar() {
      citaCreada = true;
    },
    async deshacer() {
      citaCreada = false;
    },
  };
  const gestor = new GestorComandos();

  await gestor.ejecutar("sesion", comando);
  assert.equal(citaCreada, true);
  assert.equal((await gestor.deshacerUltimo("sesion")).idElemento, 12);
  assert.equal(citaCreada, false);
  assert.equal(await gestor.deshacerUltimo("sesion"), undefined);
});

test("Observer entrega notificaciones a dueño y veterinario", () => {
  const recibidas = [];
  const notificador = new Notificador();
  notificador.agregarObservador(
    new NotificacionDueno((mensaje) => recibidas.push(`dueño:${mensaje}`)),
  );
  notificador.agregarObservador(
    new NotificacionVeterinario((mensaje) =>
      recibidas.push(`veterinario:${mensaje}`),
    ),
  );

  notificador.notificar("Nueva cita");
  assert.deepEqual(recibidas, ["dueño:Nueva cita", "veterinario:Nueva cita"]);
});
