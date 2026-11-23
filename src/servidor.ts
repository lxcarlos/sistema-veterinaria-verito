import express from "express";
import cors from "cors";
import { ConexionBaseDatos } from "./patterns/singleton/ConexionBaseDatos";

const app = express();
app.use(cors());
app.use(express.json());

const db = ConexionBaseDatos.getInstancia();

app.get("/api/roles", async (req, res) => {
    try {
        const roles = await db.consultar("SELECT * FROM Roles");
        res.json(roles);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/especies", async (req, res) => {
    try {
        const especies = await db.consultar ("SELECT * FROM Especies");
        res.json(especies);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/usuarios", async (req, res) => {
    const { nombre, email, password, idRol } = req.body;

    if (!nombre || !email || !password || !idRol) {
        return res.status(400).json({ error: "Faltan datos" });
    }

    try {
        const filas = await db.consultar<{ id: number }>(
            `INSERT INTO Usuarios (FK_ID_Rol, Nombre_Usuario, Email_Usuario, Password_Hash)
             OUTPUT INSERTED.PK_ID_Usuario AS id
             VALUES (@rol, @nombre, @email, @password)`,
            { rol: idRol, nombre, email, password }
        );
        res.status(201).json({ id: filas[0].id, nombre, email });
    } catch (e: any) {
        if (e.number === 2627 || e.number === 2601) {
            return res.status(409).json({ error: "Ese correo ya está registrado" });
        }
        res.status(500).json({ error: e.message });
    }
});

app.listen(3001, () => {
    console.log("Servidor listo en http://localhost:3001");
});