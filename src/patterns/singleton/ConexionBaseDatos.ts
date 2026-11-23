import 'dotenv/config';
import { ConnectionPool } from "mssql";

export class ConexionBaseDatos {

    private static instancia: ConexionBaseDatos;
    
    private pool: ConnectionPool | null = null;

    private constructor() {}

    public static getInstancia(): ConexionBaseDatos {
        if (ConexionBaseDatos.instancia == null) {
            ConexionBaseDatos.instancia = new ConexionBaseDatos();
        }
        return ConexionBaseDatos.instancia;
    }
    
    public async conectar (): Promise<ConnectionPool> {
        if (this.pool == null) {
            this.pool = await new ConnectionPool({
                server: process.env.DB_SERVER ?? "localhost",
                database: process.env.DB_NAME ?? "VeterinariaVerito",
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                port: Number(process.env.DB_PORT ?? 1433),
                options: {
                    encrypt: process.env.DB_ENCRYPT === "true",
                    trustServerCertificate: process.env.DB_TRUST_CERT === "true",
                },
                }).connect();
                console.log("Conexion abierta");
            }
            return this.pool;
        }

        public async consultar<T = any>(
    sql: string,
    parametros: Record<string, unknown> = {}
): Promise<T[]> {
    const pool = await this.conectar();
    const request = pool.request();
    for (const [nombre, valor] of Object.entries(parametros)) {
        request.input(nombre, valor);
    }
    const resultado = await request.query(sql);
    return resultado.recordset as T[];
}

        public async cerrar(): Promise<void> {
            if (this.pool != null) {
                await this.pool.close();
                this.pool = null;
                console.log("Conexion cerrada");
            
        }

    }
}