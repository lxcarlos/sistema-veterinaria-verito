import type { Comando } from "./Comando";

export class AgendarCitaComando implements Comando {
  public constructor(
    private citas: string[],
    private textoCita: string,
  ) {}

  public ejecutar(): void {
    this.citas.push(this.textoCita);
  }

  public deshacer(): void {
    const indice = this.citas.lastIndexOf(this.textoCita);
    if (indice === -1) {
      throw new Error("No se encontró la cita para deshacer.");
    }
    this.citas.splice(indice, 1);
  }
}
