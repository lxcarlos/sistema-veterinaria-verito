import type { EstadoCita } from "./EstadoCita";

export class EstadoRechazada implements EstadoCita {
  public readonly nombre = "Rechazada";

  public accionesDisponibles() {
    return [];
  }

  public transicionar(_nuevoEstado: string): EstadoCita {
    throw new Error("La transición de estado solicitada no está permitida.");
  }
}
