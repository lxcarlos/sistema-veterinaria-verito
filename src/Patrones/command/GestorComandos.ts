import type { Comando } from "./Comando";

export class GestorComandos {
  private readonly historiales = new Map<string, Comando[]>();

  public async ejecutar(token: string, comando: Comando): Promise<void> {
    await comando.ejecutar();
    const historial = this.historiales.get(token) ?? [];
    historial.push(comando);
    this.historiales.set(token, historial);
  }

  public async deshacerUltimo(token: string): Promise<Comando | undefined> {
    const historial = this.historiales.get(token);
    const comando = historial?.[historial.length - 1];
    if (!comando || !historial) return undefined;

    await comando.deshacer();
    historial.pop();
    return comando;
  }

  public limpiar(token: string): void {
    this.historiales.delete(token);
  }
}
