export interface EstadoCita {
  readonly nombre: string;
  accionesDisponibles(): {
    Estado_Cita: string;
    Texto_Accion: string;
    Estilo_Accion: string;
  }[];
  transicionar(nuevoEstado: string): EstadoCita;
}
