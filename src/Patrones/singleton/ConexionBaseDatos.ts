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
    
    public async conectar () {
        if (this.pool == null) {
            this.pool = await new ConnectionPool({
                server: "localhost",
                database: "VeterinariaVerito",
                user: "sa",
                password: "chris1234",
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
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


            public async cerrar() {
            if (this.pool != null) {
                await this.pool.close();
                this.pool = null;
                console.log("Conexion cerrada");
            
        }

    }
}