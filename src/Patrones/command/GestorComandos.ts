import type { Comando } from "./Comando";

export class GestorComandos {
  private historiales: { [token: string]: Comando[] } = {};

  public ejecutar(token: string, comando: Comando) {
    return comando.ejecutar().then(() => {
      if (!this.historiales[token]) {
        this.historiales[token] = [];
      }
      this.historiales[token].push(comando);
    });
  }

  public deshacerUltimo(token: string) {
    const historial = this.historiales[token];
    if (!historial || historial.length === 0) {
      return Promise.resolve(undefined);
    }

    const ultimoComando = historial[historial.length - 1];
    if (!ultimoComando) {
      return Promise.resolve(undefined);
    }

    return ultimoComando.deshacer().then(() => {
      historial.pop();
      return ultimoComando;
    });
  }

  public limpiar(token: string): void {
    delete this.historiales[token];
  }
}