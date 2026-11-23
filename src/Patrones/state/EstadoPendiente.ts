import type { EstadoCita } from "./EstadoCita";
import { EstadoAceptada } from "./EstadoAceptada";
import { EstadoRechazada } from "./EstadoRechazada";

export class EstadoPendiente implements EstadoCita {
  public readonly nombre = "Pendiente";

  public accionesDisponibles() {
    return [
      { Estado_Cita: "Aceptada", Texto_Accion: "Aceptar", Estilo_Accion: "principal" },
      { Estado_Cita: "Rechazada", Texto_Accion: "Rechazar", Estilo_Accion: "secundario" },
    ];
  }

  public transicionar(nuevoEstado: string): EstadoCita {
    if (nuevoEstado === "Aceptada") return new EstadoAceptada();
    if (nuevoEstado === "Rechazada") return new EstadoRechazada();
    throw new Error("La transición de estado solicitada no está permitida.");
  }
}
