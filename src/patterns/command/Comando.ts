export interface Comando {
  ejecutar(): void;
  deshacer(): void;
}
