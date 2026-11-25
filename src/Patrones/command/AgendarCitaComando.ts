import type { Comando } from "./Comando";

export class AgendarCitaComando implements Comando {
  public tipoAccion: string = "Cita";
  public idElemento: number | null = null;
  private crear: Function;
  private eliminar: Function;

  constructor(crear: Function, eliminar: Function) {
    this.crear = crear;
    this.eliminar = eliminar;
  }

  public ejecutar() {
    return this.crear().then((id: number) => {
      this.idElemento = id;
    });
  }

  public deshacer() {
    if (this.idElemento === null) {
      throw new Error("No se puede deshacer una cita que no fue creada.");
    }
    return this.eliminar(this.idElemento);
  }
}