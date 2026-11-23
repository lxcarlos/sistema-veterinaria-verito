import type { Comando } from "./Comando";

export class CambiarEstadoCitaComando implements Comando {
  public readonly tipoAccion = "Estado_Cita" as const;
  public readonly idElemento: number;

  public constructor(
    idCita: number,
    private readonly estadoAnterior: string,
    private readonly estadoNuevo: string,
    private readonly actualizar: (estado: string, esperado: string) => Promise<void>,
  ) {
    this.idElemento = idCita;
  }

  public async ejecutar(): Promise<void> {
    await this.actualizar(this.estadoNuevo, this.estadoAnterior);
  }

  public async deshacer(): Promise<void> {
    await this.actualizar(this.estadoAnterior, this.estadoNuevo);
  }
}
