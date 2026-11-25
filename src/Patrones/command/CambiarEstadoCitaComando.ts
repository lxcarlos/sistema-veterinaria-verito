import type { Comando } from "./Comando";

export class CambiarEstadoCitaComando implements Comando {
  public tipoAccion: string = "Estado_Cita";
  public idElemento: number;
  private estadoAnterior: string;
  private estadoNuevo: string;
  private actualizar: Function;

  constructor(
    idCita: number,
    estadoAnterior: string,
    estadoNuevo: string,
    actualizar: Function,
  ) {
    this.idElemento = idCita;
    this.estadoAnterior = estadoAnterior;
    this.estadoNuevo = estadoNuevo;
    this.actualizar = actualizar;
  }

  public ejecutar() {
    return this.actualizar(this.estadoNuevo, this.estadoAnterior);
  }

  public deshacer() {
    return this.actualizar(this.estadoAnterior, this.estadoNuevo);
  }
}