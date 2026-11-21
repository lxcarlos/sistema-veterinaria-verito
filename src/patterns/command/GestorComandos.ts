import type { Comando } from "./Comando";

export class GestorComandos {
  private historial: Comando[] = [];

  public ejecutar(comando: Comando): void {
    comando.ejecutar();
    this.historial.push(comando);
  }

  public deshacerUltimo(): void {
    const comando = this.historial[this.historial.length - 1];
    if (comando === undefined) {
      throw new Error("No hay comandos para deshacer.");
    }

    comando.deshacer();
    this.historial.pop();
  }
}
