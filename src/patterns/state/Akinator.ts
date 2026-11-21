import { EstadoInicio } from "./EstadoInicio";
import type { EstadoAkinator } from "./EstadoAkinator";

export class Akinator {
  private estado: EstadoAkinator;
  private totalPuntos = 0;
  private respuestas: string[] = [];
  private especie = "";

  public constructor() {
    this.estado = new EstadoInicio();
  }

  public mostrarPregunta(): string {
    return this.estado.mostrarPregunta();
  }

  public responder(numeroOpcion: number): void {
    this.estado.responder(this, numeroOpcion);
  }

  public cambiarEstado(estado: EstadoAkinator): void {
    this.estado = estado;
  }

  public sumarPuntos(puntos: number): void {
    this.totalPuntos += puntos;
  }

  public obtenerPuntos(): number {
    return this.totalPuntos;
  }

  public guardarEspecie(especie: string): void {
    this.especie = especie;
  }

  public obtenerEspecie(): string {
    return this.especie;
  }

  public obtenerRespuestas(): string[] {
    return [...this.respuestas];
  }

  public agregarRespuesta(texto: string): void {
    this.respuestas.push(texto);
  }
}
