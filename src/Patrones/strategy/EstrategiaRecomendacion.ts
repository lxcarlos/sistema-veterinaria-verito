export type TipoCita = "Consulta general" | "Vacunación" | "Seguimiento";

export interface EstrategiaRecomendacion {
  readonly tipo: TipoCita;
  recomendar(): string;
}
