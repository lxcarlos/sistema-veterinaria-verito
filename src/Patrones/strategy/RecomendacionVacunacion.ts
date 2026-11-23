import type { EstrategiaRecomendacion } from "./EstrategiaRecomendacion";

export class RecomendacionVacunacion implements EstrategiaRecomendacion {
  public readonly tipo = "Vacunación" as const;

  public recomendar(): string {
    return "Si tienes su cartilla de vacunación, llévala a la cita.";
  }
}
