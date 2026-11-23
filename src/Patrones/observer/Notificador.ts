import { Observador } from "./Observador";

export class Notificador {
    private observadores: Observador[] = [];

    agregarObservador(obs: Observador): void {
        this.observadores.push(obs);
    }

    eliminarObservador(obs: Observador): void {
        this.observadores = this.observadores.filter(o => o !== obs);
    }

    notificar(mensaje: string): void {
        this.observadores.forEach(obs => {
            obs.actualizar(mensaje);
        });
    }

    registrarCita(nombreMascota: string): void {
        console.log("Cita registrada");
        this.notificar(`Hay una nueva cita pendiente para ${nombreMascota}`);
    }

    registrarResultadoAkinator (nombreMascota: string, gravedad: string): void {
        console.log("Pre-triage terminado");
        this.notificar(`Resultado del Akinator para ${nombreMascota}: gravedad ${gravedad}`);
    }

    cambiarEstadoCita(nombreMascota: string, estado: string): void {
        console.log("Estado de cita actualizado");
        this.notificar(`La cita de ${nombreMascota} cambio a ${estado}`);
    }
}