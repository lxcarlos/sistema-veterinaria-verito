/* base de datos veterinaria verito */
IF DB_ID('VeterinariaVerito') IS NULL
    CREATE DATABASE VeterinariaVerito;

GO

USE VeterinariaVerito;

GO

/* tabla de roles */
IF OBJECT_ID('dbo.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE Roles (
        PK_ID_Rol INT IDENTITY(1,1) PRIMARY KEY,
        Nombre_Rol VARCHAR(50) NOT NULL
    );
END;


/* tabla de especies */
IF OBJECT_ID('dbo.Especies', 'U') IS NULL
BEGIN
    CREATE TABLE Especies (
        PK_ID_Especie INT IDENTITY(1,1) PRIMARY KEY,
        Nombre_Especie VARCHAR(50) NOT NULL
    );
END;


/* tabla de usuarios */
IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
BEGIN
    CREATE TABLE Usuarios (
        PK_ID_Usuario INT IDENTITY(1,1) PRIMARY KEY,
        FK_ID_Rol INT NOT NULL,
        Nombre_Usuario VARCHAR(100) NOT NULL,
        Email_Usuario VARCHAR(100) UNIQUE NOT NULL,
        Password_Hash VARCHAR(255) NOT NULL,
        CONSTRAINT FK_Usuario_Rol FOREIGN KEY (FK_ID_Rol) REFERENCES Roles(PK_ID_Rol)
    );
END;


/* tabla de mascotas */
IF OBJECT_ID('dbo.Mascotas', 'U') IS NULL
BEGIN
    CREATE TABLE Mascotas (
        PK_ID_Mascota INT IDENTITY(1,1) PRIMARY KEY,
        FK_ID_Especie INT NOT NULL,
        FK_ID_Usuario INT NOT NULL, -- El Dueño
        Nombre_Mascota VARCHAR(50) NOT NULL,
        Edad_Mascota INT NOT NULL,
        Peso_Mascota DECIMAL(5,2) NOT NULL,
        CONSTRAINT FK_Mascota_Especie FOREIGN KEY (FK_ID_Especie) REFERENCES Especies(PK_ID_Especie),
        CONSTRAINT FK_Mascota_Usuario FOREIGN KEY (FK_ID_Usuario) REFERENCES Usuarios(PK_ID_Usuario)
    );
END;


/* tabla de consultas akinator */
IF OBJECT_ID('dbo.Consultas_Akinator', 'U') IS NULL
BEGIN
    CREATE TABLE Consultas_Akinator (
        PK_ID_Consulta INT IDENTITY(1,1) PRIMARY KEY,
        FK_ID_Mascota INT NOT NULL,
        Sintomas_Cap TEXT NOT NULL,
        Resultado_Prel VARCHAR(255) NOT NULL,
        Fecha_Consulta DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Consulta_Mascota FOREIGN KEY (FK_ID_Mascota) REFERENCES Mascotas(PK_ID_Mascota)
    );
END;


/* tabla de citas */
IF OBJECT_ID('dbo.Citas', 'U') IS NULL
BEGIN
    CREATE TABLE Citas (
        PK_ID_Cita INT IDENTITY(1,1) PRIMARY KEY,
        FK_ID_Consulta INT NOT NULL,
        FK_ID_Usuario INT NOT NULL, -- El Veterinario asignado
        Fecha_Propuesta DATETIME NOT NULL,
        Estado_Cita VARCHAR(30) DEFAULT 'Pendiente', -- Pendiente, Aceptada, Rechazada, Completada
        CONSTRAINT FK_Cita_Consulta FOREIGN KEY (FK_ID_Consulta) REFERENCES Consultas_Akinator(PK_ID_Consulta),
        CONSTRAINT FK_Cita_Veterinario FOREIGN KEY (FK_ID_Usuario) REFERENCES Usuarios(PK_ID_Usuario)
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Citas')
      AND name = 'IX_Citas_ConsultaEstado'
)
    CREATE INDEX IX_Citas_ConsultaEstado
        ON Citas (FK_ID_Consulta, Estado_Cita);

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Citas')
      AND name = 'IX_Citas_FechaEstado'
)
    CREATE INDEX IX_Citas_FechaEstado
        ON Citas (Fecha_Propuesta, Estado_Cita);


/* tabla de observaciones medicas */
IF OBJECT_ID('dbo.Observaciones_Medicas', 'U') IS NULL
BEGIN
    CREATE TABLE Observaciones_Medicas (
        PK_ID_Observacion INT IDENTITY(1,1) PRIMARY KEY,
        FK_ID_Cita INT NOT NULL,
        Diagnostico_Medico TEXT NOT NULL,
        Receta_Instrucciones TEXT NOT NULL,
        Fecha_Registro DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Observacion_Cita FOREIGN KEY (FK_ID_Cita) REFERENCES Citas(PK_ID_Cita)
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Observaciones_Medicas')
      AND name = 'UX_Observaciones_Medicas_FK_ID_Cita'
)
    CREATE UNIQUE INDEX UX_Observaciones_Medicas_FK_ID_Cita
        ON Observaciones_Medicas (FK_ID_Cita);

/* datos iniciales requeridos por el sistema */
IF NOT EXISTS (SELECT 1 FROM Roles WHERE Nombre_Rol = 'Dueño')
    INSERT INTO Roles (Nombre_Rol) VALUES ('Dueño');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE Nombre_Rol = 'Veterinario')
    INSERT INTO Roles (Nombre_Rol) VALUES ('Veterinario');

IF NOT EXISTS (SELECT 1 FROM Especies WHERE Nombre_Especie = 'Perro')
    INSERT INTO Especies (Nombre_Especie) VALUES ('Perro');

IF NOT EXISTS (SELECT 1 FROM Especies WHERE Nombre_Especie = 'Gato')
    INSERT INTO Especies (Nombre_Especie) VALUES ('Gato');

IF NOT EXISTS (SELECT 1 FROM Especies WHERE Nombre_Especie = 'Ave')
    INSERT INTO Especies (Nombre_Especie) VALUES ('Ave');

IF NOT EXISTS (SELECT 1 FROM Especies WHERE Nombre_Especie = 'Conejo')
    INSERT INTO Especies (Nombre_Especie) VALUES ('Conejo');

IF NOT EXISTS (SELECT 1 FROM Especies WHERE Nombre_Especie = 'Otro')
    INSERT INTO Especies (Nombre_Especie) VALUES ('Otro');


/* ver todos los roles */
SELECT * FROM Roles;

/* ver todas las especies */
SELECT * FROM Especies;

/* ver todos los usuarios */
SELECT * FROM Usuarios;

/* ver todas las mascotas */
SELECT * FROM Mascotas;

/* ver todas las consultas del akinator */
SELECT * FROM Consultas_Akinator;

/* ver todas las citas */
SELECT * FROM Citas;

/* ver todas las observaciones medicas */
SELECT * FROM Observaciones_Medicas;


