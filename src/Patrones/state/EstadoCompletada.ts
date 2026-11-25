import type { EstadoCita } from "./EstadoCita";

export class EstadoCompletada implements EstadoCita {
  public readonly nombre = "Completada";//aqui jalan los atriburos de la interfaz que es estadocita y le danel valor
  /* de completada
  
  */

  public accionesDisponibles() {
    return [];
  }/**segun yo aqui regresa el arreglo o el valor vacio pues */

  public transicionar(_nuevoEstado: string): EstadoCita {
    throw new Error("La transición de estado solicitada no está permitida.");
  }/**en caso de haber error el metodo transicionar lanzara un error segun yo */
}
