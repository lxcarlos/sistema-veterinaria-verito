import type { EstrategiaRecomendacion } from "./EstrategiaRecomendacion";

export class RecomendacionModerada implements EstrategiaRecomendacion {
  public recomendar(especie: string, peso: number, puntos: number): string {
    return `Gravedad moderada (${puntos} puntos): lleva a tu ${especie} de ${peso} kg a consulta en 24-48 h.`;
  }
}
