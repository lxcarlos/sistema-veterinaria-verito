export type NivelOrientativo = "Leve" | "Moderada" | "Grave";

interface EstrategiaOrientacion {
  readonly nivel: NivelOrientativo;
  readonly maximoPuntos: number;
  recomendar(): string;
}

class OrientacionLeve implements EstrategiaOrientacion {
  public readonly nivel = "Leve" as const;
  public readonly maximoPuntos = 3;

  public recomendar(): string {
    return "Las respuestas quedaron en el nivel orientativo leve de este prototipo. Consulta a un veterinario si te preocupa su estado o notas cambios.";
  }
}

class OrientacionModerada implements EstrategiaOrientacion {
  public readonly nivel = "Moderada" as const;
  public readonly maximoPuntos = 6;

  public recomendar(): string {
    return "Las respuestas sugieren solicitar orientación veterinaria. Este resultado no es un diagnóstico.";
  }
}

class OrientacionGrave implements EstrategiaOrientacion {
  public readonly nivel = "Grave" as const;
  public readonly maximoPuntos = Number.POSITIVE_INFINITY;

  public recomendar(): string {
    return "Las respuestas quedaron en el nivel orientativo alto de este prototipo. Contacta pronto a un veterinario; no esperes una cita en línea si parece una emergencia.";
  }
}

export class MotorOrientacionSintomas {
  private readonly estrategias: readonly EstrategiaOrientacion[] = [
    new OrientacionLeve(),
    new OrientacionModerada(),
    new OrientacionGrave(),
  ];

  public evaluar(puntos: number): {
    Gravedad: NivelOrientativo;
    Texto_Recomendacion: string;
  } {
    if (!Number.isSafeInteger(puntos) || puntos < 0) {
      throw new RangeError("El puntaje de orientación no es válido.");
    }

    const estrategia = this.estrategias.find(
      (item) => puntos <= item.maximoPuntos,
    );
    if (!estrategia) throw new Error("No hay estrategia de orientación disponible.");
    return {
      Gravedad: estrategia.nivel,
      Texto_Recomendacion: estrategia.recomendar(),
    };
  }
}
