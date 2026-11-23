import { Observador } from "./Observador";
import { almacenamientoNotificacion } from "./almacenamientoNotificacion";


export class NotificacionVeterinario implements Observador {
    constructor(private nombre: string) {}

    actualizar(mensaje: string): void {
        console.log(`[Veterinario ${this.nombre}] recibio: ${mensaje}`);
        almacenamientoNotificacion.getInstancia().agregar(mensaje, "", "Vetrinario");
    }
}