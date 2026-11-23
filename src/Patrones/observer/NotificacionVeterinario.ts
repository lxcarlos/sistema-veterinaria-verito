import { Observador } from "./Observador";

export class NotificacionVeterinario implements Observador {
  public constructor(
    private readonly registrar: (mensaje: string) => void,
  ) {}

  public actualizar(mensaje: string): void {
    this.registrar(mensaje);
  }
}