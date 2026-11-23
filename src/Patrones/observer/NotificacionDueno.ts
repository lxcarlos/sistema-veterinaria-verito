import { Observador } from "./Observador";
import { almacenamientoNotificacion } from "./almacenamientoNotificacion";


export class NotificacionDueno implements Observador {
    constructor( private nombre: string, private email: string) {}

    actualizar(mensaje: string): void {
        console.log(`[Dueño ${this.nombre}] recibio: ${mensaje}`);
        almacenamientoNotificacion.getInstancia().agregar(mensaje, this.email, "");
    }
}