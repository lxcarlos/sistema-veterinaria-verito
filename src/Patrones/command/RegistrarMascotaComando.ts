import type { Comando } from "./Comando";

export class RegistrarMascotaComando implements Comando {
  public readonly tipoAccion = "Mascota" as const;
  public idElemento: number | null = null;

  public constructor(
    private readonly crear: () => Promise<number>,
    private readonly eliminar: (idMascota: number) => Promise<void>,
  ) {}

  public async ejecutar(): Promise<void> {
    this.idElemento = await this.crear();
  }

  public async deshacer(): Promise<void> {
    if (this.idElemento === null) {
      throw new Error("No se puede deshacer una mascota que no fue registrada.");
    }
    await this.eliminar(this.idElemento);
  }
}
