import type { Comando } from "./Comando";

export class ActualizarExpedienteComando implements Comando {
  private textoAnterior = "";

  public constructor(
    private expediente: { texto: string },
    private nuevoTexto: string,
  ) {}

  public ejecutar(): void {
    this.textoAnterior = this.expediente.texto;
    this.expediente.texto = this.nuevoTexto;
  }

  public deshacer(): void {
    this.expediente.texto = this.textoAnterior;
  }
}
