import { Observador } from "./Observador";

export class NotificacionVeterinario implements Observador {
    constructor(private nombre: string) {}

    actualizar(mensaje: string): void {
        console.log(`[Veterinario ${this.nombre}] recibio: ${mensaje}`);
    }
}