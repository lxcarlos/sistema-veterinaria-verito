import type { Comando } from "./Comando";

export class AgendarCitaComando implements Comando {
  public readonly tipoAccion = "Cita" as const;
  public idElemento: number | null = null;

  public constructor(
    private readonly crear: () => Promise<number>,
    private readonly eliminar: (idCita: number) => Promise<void>,
  ) {}

  public async ejecutar(): Promise<void> {
    this.idElemento = await this.crear();
  }

  public async deshacer(): Promise<void> {
    if (this.idElemento === null) {
      throw new Error("No se puede deshacer una cita que no fue creada.");
    }
    await this.eliminar(this.idElemento);
  }
}
