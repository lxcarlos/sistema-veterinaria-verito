import "dotenv/config";
import { ConnectionPool } from "mssql";

export class ConexionBaseDatos {
  private static instancia: ConexionBaseDatos;
  private pool: ConnectionPool | null = null;
  private conexionEnCurso: Promise<ConnectionPool> | null = null;

  private constructor() {}

  public static getInstancia(): ConexionBaseDatos {
    if (ConexionBaseDatos.instancia == null) {
      ConexionBaseDatos.instancia = new ConexionBaseDatos();
    }
    return ConexionBaseDatos.instancia;
  }

  public async conectar(): Promise<ConnectionPool> {
    if (this.pool) return this.pool;
    if (!this.conexionEnCurso) {
      this.conexionEnCurso = this.abrirConexion().catch((error: unknown) => {
        this.conexionEnCurso = null;
        throw error;
      });
    }
    return this.conexionEnCurso;
  }

  private async abrirConexion(): Promise<ConnectionPool> {
    const usuario = process.env.DB_USER;
    const contrasena = process.env.DB_PASSWORD;
    if (!usuario || !contrasena) {
      throw new Error("Configura DB_USER y DB_PASSWORD en el archivo .env.");
    }

    const puerto = Number(process.env.DB_PORT ?? 1433);
    if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
      throw new Error("DB_PORT debe ser un puerto válido.");
    }

    const pool = await new ConnectionPool({
      server: process.env.DB_SERVER ?? "localhost",
      database: process.env.DB_NAME ?? "VeterinariaVerito",
      user: usuario,
      password: contrasena,
      port: puerto,
      options: {
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate: process.env.DB_TRUST_CERT === "true",
      },
    }).connect();

    this.pool = pool;
    console.log("Conexión a SQL Server establecida.");
    return pool;
  }

  public async consultar<T = Record<string, unknown>>(
    sql: string,
    parametros: Record<string, unknown> = {},
  ): Promise<T[]> {
    const pool = await this.conectar();
    const request = pool.request();
    for (const [nombre, valor] of Object.entries(parametros)) {
      request.input(nombre, valor);
    }
    const resultado = await request.query(sql);
    return (resultado.recordset ?? []) as T[];
  }

  public async cerrar(): Promise<void> {
    const pool =
      this.pool ?? (this.conexionEnCurso ? await this.conexionEnCurso : null);
    if (!pool) {
      this.conexionEnCurso = null;
      return;
    }

    await pool.close();
    this.pool = null;
    this.conexionEnCurso = null;
    console.log("Conexión a SQL Server cerrada.");
  }
}
