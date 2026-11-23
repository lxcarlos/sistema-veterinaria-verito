export interface Notificacion {
    Id_Notificacion: number;
    Mensaje_Notificacion: string;
    Email_Usuario: string;
    Nombre_Rol: String;
    Fecha_Notificacion: String;
}

export class almacenamientoNotificacion {
    private static instancia: almacenamientoNotificacion | null = null;
    private notificaciones: Notificacion[] = [];
    private siguienteId = 1;

    private constructor() {}

    public static getInstancia(): almacenamientoNotificacion {
        if (almacenamientoNotificacion.instancia === null) {
            almacenamientoNotificacion.instancia = new almacenamientoNotificacion();
        }
        return almacenamientoNotificacion.instancia;
    }

    public agregar (mensaje: string, email: string, nombreRol: string): void {
        this.notificaciones.push({
            Id_Notificacion: this.siguienteId++,
            Mensaje_Notificacion: mensaje,
            Email_Usuario: email,
            Nombre_Rol: nombreRol,
            Fecha_Notificacion: new Date().toISOString(),
        });
    }

    public obtenerPara(email: string, nombreRol: string): Notificacion[] {
        return this.notificaciones.filter(
            (n) =>
            (n.Email_Usuario !== "" && n.Email_Usuario === email) ||
            (n.Nombre_Rol !== "" && n.Nombre_Rol === nombreRol)
        );
    }
}