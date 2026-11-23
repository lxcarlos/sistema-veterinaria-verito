import type { EstrategiaRecomendacion } from "./EstrategiaRecomendacion";

export class RecomendacionSeguimiento implements EstrategiaRecomendacion {
  public readonly tipo = "Seguimiento" as const;

  public recomendar(): string {
    return "Lleva la información de la atención o indicaciones anteriores.";
  }
}
