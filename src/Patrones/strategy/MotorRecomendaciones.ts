import type { EstrategiaRecomendacion } from "./EstrategiaRecomendacion";
import type { TipoCita } from "./EstrategiaRecomendacion";
import { RecomendacionConsultaGeneral } from "./RecomendacionConsultaGeneral";
import { RecomendacionSeguimiento } from "./RecomendacionSeguimiento";
import { RecomendacionVacunacion } from "./RecomendacionVacunacion";

export class MotorRecomendaciones {
  private readonly estrategias = [
    new RecomendacionConsultaGeneral(),
    new RecomendacionVacunacion(),
    new RecomendacionSeguimiento(),
  ];

  public tiposDisponibles(): TipoCita[] {
    return this.estrategias.map((estrategia) => estrategia.tipo);
  }

  public recomendar(tipo: string): string {
    const estrategia = this.estrategias.find((item) => item.tipo === tipo);
    if (!estrategia) {
      throw new Error("El tipo de cita seleccionado no es válido.");
    }
    return estrategia.recomendar();
  }
}
