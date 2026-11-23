import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import { ConexionBaseDatos } from "./Patrones/singleton/ConexionBaseDatos";

declare module "express-session" {
    interface SessionData {
        usuario?: {
            Id_Usuario: number;
            Nombre_Usuario: string;
            Email_Usuario: string;
            Nombre_Rol: string;
        };
    }
}

const app = express();
app.use(cors());
app.use(express.json());

app.use(session({
    secret: "verito-secreto",
    resave: false,
    saveUninitialized: false,
}));

app.use(express.static(path.join(__dirname, "..", "web")));

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
    const { nombre, email, password, nombreRol } = req.body;

    if (!nombre || !email || !password || !nombreRol) {
        return res.status(400).json({ error: "Faltan datos" });
    }

    try {
        const roles = await db.consultar<{ id: number }>(
            "SELECT PK_ID_Rol AS id FROM Roles WHERE Nombre_Rol = @nombreRol",
            { nombreRol }
        );
        if (roles.length === 0) {
            return res.status(400).json({ error: "Rol no válido" });
        }

        const filas = await db.consultar<{ id: number }>(
            `INSERT INTO Usuarios (FK_ID_Rol, Nombre_Usuario, Email_Usuario, Password_Hash)
             OUTPUT INSERTED.PK_ID_Usuario AS id
             VALUES (@rol, @nombre, @email, @password)`,
            { rol: roles[0].id, nombre, email, password }
        );

        req.session.usuario = {
            Id_Usuario: filas[0].id,
            Nombre_Usuario: nombre,
            Email_Usuario: email,
            Nombre_Rol: nombreRol,
        };
        
        res.status(201).json({
            Id_Usuario: filas[0].id,
            Nombre_Usuario: nombre,
            Email_Usuario: email,
            Nombre_Rol: nombreRol,
        });
    } catch (e: any) {
        if (e.number === 2627 || e.number === 2601) {
            return res.status(409).json({ error: "Ya existe una cuenta con ese correo." });
        }
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/sesion", async (req, res) => {
    const { email, password, nombreRol } = req.body;
    try {
        const filas = await db.consultar<any>(
            `SELECT u.PK_ID_Usuario, u.Nombre_Usuario, u.Email_Usuario, r.Nombre_Rol
             FROM Usuarios u
             JOIN Roles r ON r.PK_ID_Rol = u.FK_ID_Rol
             WHERE u.Email_Usuario = @email
               AND u.Password_Hash = @password
               AND r.Nombre_Rol = @nombreRol`,
            { email, password, nombreRol }
        );
        if (filas.length === 0) {
            return res.status(401).json({ error: "Revisa el correo, la contraseña y el rol." });
        }
        const u = filas[0];
        req.session.usuario = {
            Id_Usuario: u.PK_ID_Usuario,
            Nombre_Usuario: u.Nombre_Usuario,
            Email_Usuario: u.Email_Usuario,
            Nombre_Rol: u.Nombre_Rol,
        };
        res.json(req.session.usuario);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/sesion", (req, res) => {
    req.session.destroy(() => res.json(true));
});

app.get("/api/usuarios/actual", (req, res) => {
    res.json(req.session.usuario ?? null);
});


app.listen(3001, () => {
    console.log("Servidor listo en http://localhost:3001");
});