import type { Akinator } from "./Akinator";
import type { EstadoAkinator } from "./EstadoAkinator";

export class EstadoDerivadoACita implements EstadoAkinator {
  public constructor(private puntos: number) {}

  public mostrarPregunta(): string {
    const gravedad =
      this.puntos <= 3 ? "leve" : this.puntos <= 6 ? "moderada" : "grave";
    return `Gravedad ${gravedad}. Se debe agendar una cita.`;
  }

  public responder(_akinator: Akinator, _numeroOpcion: number): void {
    throw new Error("El pre-triage ya terminó.");
  }
}
