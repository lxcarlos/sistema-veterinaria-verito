import { Observador } from "./Observador";

export class Notificador {
  private observadores: Observador[] = [];

  public agregarObservador(observador: Observador): void {
    this.observadores.push(observador);
  }

  public notificar(mensaje: string): void {
    this.observadores.forEach((observador) => observador.actualizar(mensaje));
  }

  public eliminarObservador(observador: Observador): void {
    this.observadores = this.observadores.filter((item) => item !== observador);
  }
}