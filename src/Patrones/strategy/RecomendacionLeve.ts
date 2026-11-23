import type { EstrategiaRecomendacion } from "./EstrategiaRecomendacion";

export class RecomendacionLeve implements EstrategiaRecomendacion {
  public recomendar(especie: string, peso: number, puntos: number): string {
    return `Gravedad leve (${puntos} puntos): vigilar en casa y ajustar la comida de tu ${especie} de ${peso} kg.`;
  }
}
