import { Observador } from "./Observador";

export class NotificacionDueno implements Observador {
    constructor( private nombre: string ) {}

    actualizar(mensaje: string): void {
        console.log(`[Dueño ${this.nombre}] recibio: ${mensaje}`);
    }
}