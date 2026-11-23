import type { Akinator } from "./Akinator";
import type { EstadoAkinator } from "./EstadoAkinator";
import { EstadoDerivadoACita } from "./EstadoDerivadoACita";

interface Opcion {
  texto: string;
  puntos: number;
}

interface Pregunta {
  texto: string;
  opciones: Opcion[];
}

export class EstadoAnalizandoSintomas implements EstadoAkinator {
  private indicePregunta = 0;
  private preguntas: Pregunta[] = [
    {
      texto: "Síntoma principal",
      opciones: [
        { texto: "Ninguno claro", puntos: 0 },
        { texto: "Vómito o diarrea", puntos: 2 },
        { texto: "Cojera o dolor", puntos: 2 },
        { texto: "Dificultad para respirar", puntos: 7 },
      ],
    },
    {
      texto: "¿Desde cuándo?",
      opciones: [
        { texto: "Desde hoy", puntos: 0 },
        { texto: "2 a 3 días", puntos: 1 },
        { texto: "Más de una semana", puntos: 2 },
      ],
    },
    {
      texto: "¿Cómo está su apetito?",
      opciones: [
        { texto: "Normal", puntos: 0 },
        { texto: "Come poco", puntos: 1 },
        { texto: "No quiere comer", puntos: 2 },
      ],
    },
    {
      texto: "¿Cómo está su energía?",
      opciones: [
        { texto: "Normal", puntos: 0 },
        { texto: "Decaído", puntos: 1 },
        { texto: "No se levanta", puntos: 3 },
      ],
    },
  ];

  public mostrarPregunta(): string {
    const pregunta = this.preguntas[this.indicePregunta];
    if (pregunta === undefined) {
      return "Análisis terminado.";
    }

    const opciones = pregunta.opciones
      .map((opcion, indice) => `${indice + 1}) ${opcion.texto}`)
      .join("\n");
    return `${pregunta.texto}\n${opciones}`;
  }

  public responder(akinator: Akinator, numeroOpcion: number): void {
    const pregunta = this.preguntas[this.indicePregunta];
    if (pregunta === undefined) {
      throw new Error("El análisis de síntomas ya terminó.");
    }

    const opcion = pregunta.opciones[numeroOpcion - 1];
    if (opcion === undefined) {
      throw new RangeError("La opción de respuesta no es válida.");
    }

    akinator.sumarPuntos(opcion.puntos);
    akinator.agregarRespuesta(opcion.texto);
    this.indicePregunta += 1;

    if (this.indicePregunta === this.preguntas.length) {
      akinator.cambiarEstado(new EstadoDerivadoACita(akinator.obtenerPuntos()));
    }
  }
}
