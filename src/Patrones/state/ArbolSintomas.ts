export interface OpcionSintomas {
  readonly texto: string;
  readonly puntos: number;
}

export interface PreguntaSintomas {
  readonly numero: number;
  readonly texto: string;
  readonly opciones: readonly OpcionSintomas[];
}

interface EstadoArbolSintomas {
  obtenerPregunta(): PreguntaSintomas | null;
  responder(arbol: ArbolSintomas, numeroOpcion: number): void;
}

const preguntas: readonly Omit<PreguntaSintomas, "numero">[] = [
  {
    texto: "¿Cuál es el síntoma principal?",
    opciones: [
      { texto: "Ninguno claro", puntos: 0 },
      { texto: "Vómito o diarrea", puntos: 2 },
      { texto: "Cojera o dolor", puntos: 2 },
      { texto: "Dificultad para respirar", puntos: 7 },
    ],
  },
  {
    texto: "¿Desde cuándo presenta el síntoma?",
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

class EstadoPreguntaSintomas implements EstadoArbolSintomas {
  public constructor(private readonly indice: number) {}

  public obtenerPregunta(): PreguntaSintomas {
    const pregunta = preguntas[this.indice];
    if (!pregunta) throw new Error("No hay una pregunta de síntomas disponible.");
    return { ...pregunta, numero: this.indice + 1 };
  }

  public responder(arbol: ArbolSintomas, numeroOpcion: number): void {
    const pregunta = this.obtenerPregunta();
    const opcion = pregunta.opciones[numeroOpcion - 1];
    if (!Number.isInteger(numeroOpcion) || !opcion) {
      throw new RangeError("Selecciona una opción de respuesta válida.");
    }

    arbol.registrarRespuesta(opcion);
    arbol.cambiarEstado(
      this.indice + 1 < preguntas.length
        ? new EstadoPreguntaSintomas(this.indice + 1)
        : new EstadoResultadoSintomas(),
    );
  }
}

class EstadoResultadoSintomas implements EstadoArbolSintomas {
  public obtenerPregunta(): null {
    return null;
  }

  public responder(): never {
    throw new Error("El árbol de síntomas ya terminó.");
  }
}

export class ArbolSintomas {
  public static readonly totalPreguntas = preguntas.length;
  private estado: EstadoArbolSintomas = new EstadoPreguntaSintomas(0);
  private puntos = 0;
  private readonly respuestas: string[] = [];

  public obtenerPregunta(): PreguntaSintomas | null {
    return this.estado.obtenerPregunta();
  }

  public responder(numeroOpcion: number): void {
    this.estado.responder(this, numeroOpcion);
  }

  public cambiarEstado(estado: EstadoArbolSintomas): void {
    this.estado = estado;
  }

  public registrarRespuesta(opcion: OpcionSintomas): void {
    this.puntos += opcion.puntos;
    this.respuestas.push(opcion.texto);
  }

  public obtenerPuntos(): number {
    return this.puntos;
  }

  public obtenerRespuestas(): string[] {
    return [...this.respuestas];
  }
}
