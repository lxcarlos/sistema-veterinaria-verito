export interface OpcionSintomas {
  readonly texto: string;
  readonly puntos: number;
}

export interface PreguntaSintomas {
  readonly numero: number;
  readonly texto: string;
  readonly opciones: readonly OpcionSintomas[];
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

export class ArbolSintomas {
  public static readonly totalPreguntas = preguntas.length;
  private indice = 0;
  private puntos = 0;
  private readonly respuestas: string[] = [];







/**UBICACION */
  public obtenerPregunta(): PreguntaSintomas | null {/** obtiene el numero de pregunta actual */
    if (this.indice >= preguntas.length) return null;
    const pregunta = preguntas[this.indice];
    if (!pregunta) throw new Error("No hay una pregunta de síntomas disponible.");
    return { ...pregunta, numero: this.indice + 1 };// ... esos puntos suspensivos son para que se haga una copia de la
    //pregunta y no se modifique el original, ademas que le suman el nuero de pregunta actual, que es el indice + 1
  }






/**REVISAR QUE PUSO EL USUSARIO */
  public responder(numeroOpcion: number): void {/**revisa que el usuario haya elegido una opcion valida */
    if (this.indice >= preguntas.length) {
      throw new Error("El árbol de síntomas ya termino.");
    }
    const pregunta = this.obtenerPregunta()!;// pide la pregunta actual, y el signo de exclamacion es para decirle a typescript que aun quedan preguntas por responder
    const opcion = pregunta.opciones[numeroOpcion - 1];
    if (!Number.isInteger(numeroOpcion) || !opcion) {
      throw new RangeError("Selecciona una opción de respuesta válida.");
    }

    this.puntos += opcion.puntos;
    this.respuestas.push(opcion.texto);/**lo que hace push es agregar el texto de la opción
    seleccionada al arreglo de respuestas */
    /**es decir jala el texto de la opción seleccionada */
    this.indice++;
  } 





  /**Lanza los resultados */
  public obtenerPuntos(): number {
    return this.puntos;
  }

  public obtenerRespuestas(): string[] {
  return this.respuestas.slice();
}
}