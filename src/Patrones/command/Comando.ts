export interface Comando {
  readonly tipoAccion: "Mascota" | "Cita" | "Estado_Cita";
  readonly idElemento: number | null;
  ejecutar(): Promise<void>;
  deshacer(): Promise<void>;
}
