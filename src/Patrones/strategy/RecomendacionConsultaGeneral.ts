import type { EstrategiaRecomendacion } from "./EstrategiaRecomendacion";

export class RecomendacionConsultaGeneral implements EstrategiaRecomendacion {
  public readonly tipo = "Consulta general" as const;

  public recomendar(): string {
    return "Lleva cualquier duda o cambio reciente que quieras comentar.";
  }
}
