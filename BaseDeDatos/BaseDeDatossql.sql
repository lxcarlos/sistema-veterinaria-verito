/* base de datos veterinaria verito */
CREATE DATABASE VeterinariaVerito;


USE VeterinariaVerito;


/* tabla de roles */
CREATE TABLE Roles (
    PK_ID_Rol INT IDENTITY(1,1) PRIMARY KEY,
    Nombre_Rol VARCHAR(50) NOT NULL
);


/* tabla de especies */
CREATE TABLE Especies (
    PK_ID_Especie INT IDENTITY(1,1) PRIMARY KEY,
    Nombre_Especie VARCHAR(50) NOT NULL
);


/* tabla de usuarios */
CREATE TABLE Usuarios (
    PK_ID_Usuario INT IDENTITY(1,1) PRIMARY KEY,
    FK_ID_Rol INT NOT NULL,
    Nombre_Usuario VARCHAR(100) NOT NULL,
    Email_Usuario VARCHAR(100) UNIQUE NOT NULL,
    Password_Hash VARCHAR(255) NOT NULL,
    CONSTRAINT FK_Usuario_Rol FOREIGN KEY (FK_ID_Rol) REFERENCES Roles(PK_ID_Rol)
);


/* tabla de mascotas */
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


/* tabla de consultas akinator */
CREATE TABLE Consultas_Akinator (
    PK_ID_Consulta INT IDENTITY(1,1) PRIMARY KEY,
    FK_ID_Mascota INT NOT NULL,
    Sintomas_Cap TEXT NOT NULL,
    Resultado_Prel VARCHAR(255) NOT NULL,
    Fecha_Consulta DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Consulta_Mascota FOREIGN KEY (FK_ID_Mascota) REFERENCES Mascotas(PK_ID_Mascota)
);


/* tabla de citas */
CREATE TABLE Citas (
    PK_ID_Cita INT IDENTITY(1,1) PRIMARY KEY,
    FK_ID_Consulta INT NOT NULL,
    FK_ID_Usuario INT NOT NULL, -- El Veterinario asignado
    Fecha_Propuesta DATETIME NOT NULL,
    Estado_Cita VARCHAR(30) DEFAULT 'Pendiente', -- Pendiente, Aceptada, Rechazada, Completada
    CONSTRAINT FK_Cita_Consulta FOREIGN KEY (FK_ID_Consulta) REFERENCES Consultas_Akinator(PK_ID_Consulta),
    CONSTRAINT FK_Cita_Veterinario FOREIGN KEY (FK_ID_Usuario) REFERENCES Usuarios(PK_ID_Usuario)
);


/* tabla de observaciones medicas */
CREATE TABLE Observaciones_Medicas (
    PK_ID_Observacion INT IDENTITY(1,1) PRIMARY KEY,
    FK_ID_Cita INT NOT NULL,
    Diagnostico_Medico TEXT NOT NULL,
    Receta_Instrucciones TEXT NOT NULL,
    Fecha_Registro DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Observacion_Cita FOREIGN KEY (FK_ID_Cita) REFERENCES Citas(PK_ID_Cita)
);


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