export class Usuario {
    // Encapsulamiento: propiedades privadas
    private idUsuario?: number;
    private idRol: number;
    private nombreUsuario: string;
    private emailUsuario: string;
    private passwordHash: string;

    constructor(idRol: number, nombreUsuario: string, emailUsuario: string, passwordHash: string, idUsuario?: number) {
        this.idUsuario = idUsuario;
        this.idRol = idRol;
        this.nombreUsuario = nombreUsuario;
        this.emailUsuario = emailUsuario;
        this.passwordHash = passwordHash;
    }

    // Getters para acceder a los datos de forma segura
    public getIdUsuario(): number | undefined {
        return this.idUsuario;
    }

    public getIdRol(): number {
        return this.idRol;
    }

    public getNombreUsuario(): string {
        return this.nombreUsuario;
    }

    public getEmailUsuario(): string {
        return this.emailUsuario;
    }

    // Setters con validación básica (ejemplo de lógica de negocio)
    public setNombreUsuario(nombre: string): void {
        if (nombre.trim() === "") {
            throw new Error("El nombre de usuario no puede estar vacío.");
        }
        this.nombreUsuario = nombre;
    }
}