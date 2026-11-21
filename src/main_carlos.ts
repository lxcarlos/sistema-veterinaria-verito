import { Akinator } from "./patterns/state/Akinator";
import { AgendarCitaComando } from "./patterns/command/AgendarCitaComando";
import { ActualizarExpedienteComando } from "./patterns/command/ActualizarExpedienteComando";
import { GestorComandos } from "./patterns/command/GestorComandos";
import { MotorRecomendaciones } from "./patterns/strategy/MotorRecomendaciones";

const akinator = new Akinator();
const respuestas = [1, 2, 2, 2, 2];

console.log("=== Pre-triage Akinator ===");
respuestas.forEach((respuesta) => {
  console.log(akinator.mostrarPregunta());
  console.log(`Respuesta elegida: ${respuesta}`);
  akinator.responder(respuesta);
});

console.log(akinator.mostrarPregunta());
console.log(`Especie: ${akinator.obtenerEspecie()}`);
console.log(`Puntos: ${akinator.obtenerPuntos()}`);

const motor = new MotorRecomendaciones();
console.log("\n=== Recomendación ===");
console.log(
  motor.recomendar(akinator.obtenerEspecie(), 12, akinator.obtenerPuntos()),
);

const gestor = new GestorComandos();
const citas: string[] = [];
const cita = `Consulta para ${akinator.obtenerEspecie()}`;
const expediente = { texto: "Expediente inicial" };

console.log("\n=== Comandos ===");
gestor.ejecutar(new AgendarCitaComando(citas, cita));
console.log(`Cita agendada: ${citas.join(", ")}`);

gestor.ejecutar(
  new ActualizarExpedienteComando(expediente, "Pre-triage completado"),
);
console.log(`Expediente actualizado: ${expediente.texto}`);

gestor.deshacerUltimo();
console.log(`Último comando deshecho. Expediente: ${expediente.texto}`);
