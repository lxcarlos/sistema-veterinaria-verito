import type { EstrategiaRecomendacion } from "./EstrategiaRecomendacion";
import { RecomendacionGrave } from "./RecomendacionGrave";
import { RecomendacionLeve } from "./RecomendacionLeve";
import { RecomendacionModerada } from "./RecomendacionModerada";

export class MotorRecomendaciones {
  private estrategia: EstrategiaRecomendacion = new RecomendacionLeve();

  public cambiarEstrategia(estrategia: EstrategiaRecomendacion): void {
    this.estrategia = estrategia;
  }

  private elegirEstrategia(puntos: number): EstrategiaRecomendacion {
    if (puntos <= 3) {
      return new RecomendacionLeve();
    }
    if (puntos <= 6) {
      return new RecomendacionModerada();
    }
    return new RecomendacionGrave();
  }

  public recomendar(especie: string, peso: number, puntos: number): string {
    this.cambiarEstrategia(this.elegirEstrategia(puntos));
    return this.estrategia.recomendar(especie, peso, puntos);
  }
}
