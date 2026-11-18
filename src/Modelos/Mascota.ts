export class Mascota {
    private idMascota?: number;
    private idEspecie: number;
    private idDueno: number; // Referencia al usuario dueño
    private nombreMascota: string;
    private edadMascota: number;
    private pesoMascota: number;

    constructor(idEspecie: number, idDueno: number, nombreMascota: string, edadMascota: number, pesoMascota: number, idMascota?: number) {
        this.idMascota = idMascota;
        this.idEspecie = idEspecie;
        this.idDueno = idDueno;
        this.nombreMascota = nombreMascota;
        this.edadMascota = edadMascota;
        this.pesoMascota = pesoMascota;
    }

    // Getters
    public getIdMascota(): number | undefined {
        return this.idMascota;
    }

    public getNombreMascota(): string {
        return this.nombreMascota;
    }

    public getPesoMascota(): number {
        return this.pesoMascota;
    }

    // Setter protegido para el peso (ideal para cuando el veterinario lo actualice en consulta)
    public actualizarPeso(nuevoPeso: number): void {
        if (nuevoPeso <= 0) {
            throw new Error("El peso debe ser mayor a cero.");
        }
        this.pesoMascota = nuevoPeso;
    }
}