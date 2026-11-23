import type { EstadoCita } from "./EstadoCita";
import { EstadoCompletada } from "./EstadoCompletada";

export class EstadoAceptada implements EstadoCita {
  public readonly nombre = "Aceptada";

  public accionesDisponibles() {
    return [
      { Estado_Cita: "Completada", Texto_Accion: "Completar", Estilo_Accion: "principal" },
    ];
  }

  public transicionar(nuevoEstado: string): EstadoCita {
    if (nuevoEstado === "Completada") return new EstadoCompletada();
    throw new Error("La transición de estado solicitada no está permitida.");
  }
}
