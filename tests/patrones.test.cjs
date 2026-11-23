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
const { MotorRecomendaciones } = require("../dist/Patrones/strategy/MotorRecomendaciones");

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
