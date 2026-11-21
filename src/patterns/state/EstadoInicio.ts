import type { Akinator } from "./Akinator";
import type { EstadoAkinator } from "./EstadoAkinator";
import { EstadoAnalizandoSintomas } from "./EstadoAnalizandoSintomas";

export class EstadoInicio implements EstadoAkinator {
  private opciones = [
    { texto: "Perro", puntos: 0 },
    { texto: "Gato", puntos: 0 },
    { texto: "Ave", puntos: 0 },
    { texto: "Conejo", puntos: 0 },
    { texto: "Otro", puntos: 0 },
  ];

  public mostrarPregunta(): string {
    const opciones = this.opciones
      .map((opcion, indice) => `${indice + 1}) ${opcion.texto}`)
      .join("\n");
    return `¿Qué especie es tu mascota?\n${opciones}`;
  }

  public responder(akinator: Akinator, numeroOpcion: number): void {
    const opcion = this.opciones[numeroOpcion - 1];
    if (opcion === undefined) {
      throw new RangeError("La opción de especie no es válida.");
    }

    akinator.guardarEspecie(opcion.texto);
    akinator.agregarRespuesta(opcion.texto);
    akinator.cambiarEstado(new EstadoAnalizandoSintomas());
  }
}
