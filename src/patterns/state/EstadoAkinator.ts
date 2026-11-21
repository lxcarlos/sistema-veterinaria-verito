import type { Akinator } from "./Akinator";

export interface EstadoAkinator {
  mostrarPregunta(): string;
  responder(akinator: Akinator, numeroOpcion: number): void;
}
