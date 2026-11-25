import type { Comando } from "./Comando";

export class RegistrarMascotaComando implements Comando {
  public tipoAccion: string = "Mascota";
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
      throw new Error("No se puede deshacer una mascota que no fue registrada.");
    }
    return this.eliminar(this.idElemento);
  }
}