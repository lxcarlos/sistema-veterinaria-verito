import type { EstadoCita } from "./EstadoCita";

export class EstadoCompletada implements EstadoCita {
  public readonly nombre = "Completada";

  public accionesDisponibles() {
    return [];
  }

  public transicionar(_nuevoEstado: string): EstadoCita {
    throw new Error("La transición de estado solicitada no está permitida.");
  }
}
