IF DB_ID('VeterinariaVerito') IS NULL
    CREATE DATABASE VeterinariaVerito;
GO

USE VeterinariaVerito;
GO

IF OBJECT_ID('dbo.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles (
        PK_ID_Rol INT IDENTITY(1,1) PRIMARY KEY,
        Nombre_Rol VARCHAR(50) NOT NULL
    );
END;

IF OBJECT_ID('dbo.Especies', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Especies (
        PK_ID_Especie INT IDENTITY(1,1) PRIMARY KEY,
        Nombre_Especie VARCHAR(50) NOT NULL
    );
END;

IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Usuarios (
        PK_ID_Usuario INT IDENTITY(1,1) PRIMARY KEY,
        FK_ID_Rol INT NOT NULL,
        Nombre_Usuario VARCHAR(100) NOT NULL,
        Email_Usuario VARCHAR(100) UNIQUE NOT NULL,
        Password_Hash VARCHAR(255) NOT NULL,
        CONSTRAINT FK_Usuario_Rol
            FOREIGN KEY (FK_ID_Rol) REFERENCES dbo.Roles(PK_ID_Rol)
    );
END;

IF OBJECT_ID('dbo.Mascotas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Mascotas (
        PK_ID_Mascota INT IDENTITY(1,1) PRIMARY KEY,
        FK_ID_Especie INT NOT NULL,
        FK_ID_Usuario INT NOT NULL,
        Nombre_Mascota VARCHAR(50) NOT NULL,
        Edad_Mascota INT NOT NULL,
        Peso_Mascota DECIMAL(5,2) NOT NULL,
        CONSTRAINT FK_Mascota_Especie
            FOREIGN KEY (FK_ID_Especie) REFERENCES dbo.Especies(PK_ID_Especie),
        CONSTRAINT FK_Mascota_Usuario
            FOREIGN KEY (FK_ID_Usuario) REFERENCES dbo.Usuarios(PK_ID_Usuario)
    );
END;

IF OBJECT_ID('dbo.Citas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Citas (
        PK_ID_Cita INT IDENTITY(1,1) PRIMARY KEY,
        FK_ID_Mascota INT NOT NULL,
        FK_ID_Usuario INT NOT NULL,
        Tipo_Cita VARCHAR(50) NOT NULL,
        Fecha_Propuesta DATETIME NOT NULL,
        Estado_Cita VARCHAR(30) NOT NULL
            CONSTRAINT DF_Citas_Estado DEFAULT 'Pendiente',
        CONSTRAINT FK_Cita_Mascota
            FOREIGN KEY (FK_ID_Mascota) REFERENCES dbo.Mascotas(PK_ID_Mascota),
        CONSTRAINT FK_Cita_Veterinario
            FOREIGN KEY (FK_ID_Usuario) REFERENCES dbo.Usuarios(PK_ID_Usuario)
    );
END;

/* Migrate the previous appointment link without deleting existing records. */
IF COL_LENGTH('dbo.Citas', 'FK_ID_Mascota') IS NULL
BEGIN
    EXEC sp_executesql N'ALTER TABLE dbo.Citas ADD FK_ID_Mascota INT NULL;';

    IF OBJECT_ID('dbo.Consultas_Akinator', 'U') IS NOT NULL
       AND COL_LENGTH('dbo.Citas', 'FK_ID_Consulta') IS NOT NULL
    BEGIN
        EXEC sp_executesql N'
            UPDATE c
            SET FK_ID_Mascota = q.FK_ID_Mascota
            FROM dbo.Citas c
            INNER JOIN dbo.Consultas_Akinator q
                ON q.PK_ID_Consulta = c.FK_ID_Consulta;';
    END;

    DECLARE @hayMascotasSinAsignar BIT = 0;
    EXEC sp_executesql
        N'SELECT @hay = CASE WHEN EXISTS (
              SELECT 1 FROM dbo.Citas WHERE FK_ID_Mascota IS NULL
          ) THEN 1 ELSE 0 END;',
        N'@hay BIT OUTPUT',
        @hay = @hayMascotasSinAsignar OUTPUT;

    IF @hayMascotasSinAsignar = 1
        THROW 50001, 'No se pudieron asociar todas las citas existentes a una mascota.', 1;

    EXEC sp_executesql N'ALTER TABLE dbo.Citas ALTER COLUMN FK_ID_Mascota INT NOT NULL;';

    EXEC sp_executesql N'
        ALTER TABLE dbo.Citas ADD CONSTRAINT FK_Cita_Mascota
            FOREIGN KEY (FK_ID_Mascota) REFERENCES dbo.Mascotas(PK_ID_Mascota);';
END;

IF COL_LENGTH('dbo.Citas', 'Tipo_Cita') IS NULL
BEGIN
    EXEC sp_executesql N'
        ALTER TABLE dbo.Citas ADD Tipo_Cita VARCHAR(50) NOT NULL
            CONSTRAINT DF_Citas_TipoCita DEFAULT ''Consulta general'';';
END;

IF COL_LENGTH('dbo.Citas', 'FK_ID_Consulta') IS NOT NULL
    EXEC sp_executesql N'ALTER TABLE dbo.Citas ALTER COLUMN FK_ID_Consulta INT NULL;';

UPDATE dbo.Citas
SET Estado_Cita = 'Pendiente'
WHERE Estado_Cita IS NULL;

IF COLUMNPROPERTY(OBJECT_ID('dbo.Citas'), 'Estado_Cita', 'AllowsNull') = 1
    EXEC sp_executesql N'ALTER TABLE dbo.Citas ALTER COLUMN Estado_Cita VARCHAR(30) NOT NULL;';

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Citas') AND name = 'IX_Citas_MascotaEstado'
)
    EXEC sp_executesql N'CREATE INDEX IX_Citas_MascotaEstado
        ON dbo.Citas (FK_ID_Mascota, Estado_Cita);';

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Citas') AND name = 'IX_Citas_FechaEstado'
)
    EXEC sp_executesql N'CREATE INDEX IX_Citas_FechaEstado
        ON dbo.Citas (Fecha_Propuesta, Estado_Cita);';

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Nombre_Rol = 'Dueño')
    INSERT INTO dbo.Roles (Nombre_Rol) VALUES ('Dueño');

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Nombre_Rol = 'Veterinario')
    INSERT INTO dbo.Roles (Nombre_Rol) VALUES ('Veterinario');

IF NOT EXISTS (SELECT 1 FROM dbo.Especies WHERE Nombre_Especie = 'Perro')
    INSERT INTO dbo.Especies (Nombre_Especie) VALUES ('Perro');

IF NOT EXISTS (SELECT 1 FROM dbo.Especies WHERE Nombre_Especie = 'Gato')
    INSERT INTO dbo.Especies (Nombre_Especie) VALUES ('Gato');

IF NOT EXISTS (SELECT 1 FROM dbo.Especies WHERE Nombre_Especie = 'Ave')
    INSERT INTO dbo.Especies (Nombre_Especie) VALUES ('Ave');

IF NOT EXISTS (SELECT 1 FROM dbo.Especies WHERE Nombre_Especie = 'Conejo')
    INSERT INTO dbo.Especies (Nombre_Especie) VALUES ('Conejo');

IF NOT EXISTS (SELECT 1 FROM dbo.Especies WHERE Nombre_Especie = 'Otro')
    INSERT INTO dbo.Especies (Nombre_Especie) VALUES ('Otro');
