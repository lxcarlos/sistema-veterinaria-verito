import type { EstrategiaRecomendacion } from "./EstrategiaRecomendacion";

export class RecomendacionGrave implements EstrategiaRecomendacion {
  public recomendar(especie: string, peso: number, puntos: number): string {
    return `Gravedad grave (${puntos} puntos): lleva a tu ${especie} de ${peso} kg a urgencias.`;
  }
}
