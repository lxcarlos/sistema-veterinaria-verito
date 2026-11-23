import { Mascota } from "../../Modelos/Mascota";
import { Usuario } from "../../Modelos/Usuario";

export class EntidadFactory {
  public static crearUsuario(
    idRol: number,
    nombre: string,
    email: string,
    passwordHash: string,
    idUsuario: number,
  ): Usuario {
    return new Usuario(idRol, nombre, email, passwordHash, idUsuario);
  }

  public static crearMascota(
    idEspecie: number,
    idDueno: number,
    nombre: string,
    edad: number,
    peso: number,
    idMascota: number,
  ): Mascota {
    return new Mascota(idEspecie, idDueno, nombre, edad, peso, idMascota);
  }
}
