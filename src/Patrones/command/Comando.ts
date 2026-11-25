export interface Comando {
  tipoAccion: string;
  idElemento: number | null;
  ejecutar(): any;
  deshacer(): any;
}