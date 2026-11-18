# 🐾 Sistema de Gestión Veterinaria "Verito" — Guía Maestra y Asignación de Tareas

Este documento detalla la arquitectura global del sistema, los requerimientos de la rúbrica universitaria (POO, tipado estricto en TypeScript, SQL Server) y el reparto exacto de responsabilidades y Patrones de Diseño para el equipo de desarrollo.

---

## 👥 Equipo de Trabajo y Reparto de Patrones (Total: 6 Patrones)

Para superar por completo el requisito mínimo de la materia, el proyecto implementará un total de **6 Patrones de Diseño**, distribuidos equitativamente según la complejidad de cada módulo:

1. **Gerardo** (1 Patrón Creacional)
2. **Christian** (2 Patrones: Estructural y Comportamiento)
3. **Carlos** (3 Patrones: Comportamiento, Algorítmico y Estructural/Control)

---

## 📂 Estructura Modular del Proyecto (VS Code)

Para cumplir con la rúbrica de arquitectura limpia, el proyecto se organiza dentro de la carpeta `src/`:

```text
sistema/
│
├── BaseDeDatossql.sql         <--- Script SQL Server con las 7 tablas relacionales
├── package.json               <--- Dependencias (mssql, typescript, etc.)
├── tsconfig.json              <--- Configuración de compilación TypeScript
│
└── src/
    ├── database/
    │   └── db.ts              <--- [Patrón Singleton] Conexión única a SQL Server
    ├── models/
    │   ├── Usuario.ts         <--- Entidad de Usuario (Dueño y Veterinario)
    │   ├── Mascota.ts         <--- Entidad de Mascota
    │   ├── ConsultaAkinator.ts<--- Registro de pre-triage de síntomas
    │   ├── Cita.ts            <--- Gestión de citas médicas
    │   └── ObservacionMedica.ts<--- Expediente y recetas finales
    └── patterns/
        ├── factory/           <--- [Patrón Factory Method - Gerardo]
        ├── observer/          <--- [Patrón Observer - Christian]
        ├── singleton/         <--- [Patrón Singleton - Christian]
        ├── state/             <--- [Patrón State - Carlos]
        ├── strategy/          <--- [Patrón Strategy - Carlos]
        └── command/           <--- [Patrón Command - Carlos]
```

---

## 📋 Tareas y Módulos Detallados por Integrante

---

### 🟢 1. GERARDO — Creación Dinámica de Entidades
* **Objetivo:** Asegurar que la creación de objetos complejos del sistema esté desacoplada y sea flexible mediante un patrón creacional.
* **Patrón Asignado (1):** **Factory Method** (Fábrica).
* **Módulos a Desarrollar:**
  1. **Fábrica de Entidades (`src/patterns/factory/`):** Implementar clases creadoras (`EntidadFactory`) que permitan instanciar de manera limpia distintos tipos de usuarios (Dueño vs Veterinario) o especies de mascotas según los datos de entrada sin saturar el código con `new` repetitivos.
  2. **Apoyo en Modelos:** Asegurar que las clases base (`Usuario.ts`, `Mascota.ts`) cuenten con constructores limpios listos para recibir los datos procesados por la fábrica.

---

### 🟡 2. CHRISTIAN — Conexión Centralizada y Notificaciones en Tiempo Real
* **Objetivo:** Garantizar la estabilidad de la base de datos y mantener a los usuarios informados en tiempo real sobre el estado de sus consultas y citas.
* **Patrones Asignados (2):** **Singleton** y **Observer**.
* **Módulos a Desarrollar:**
  1. **Gestor de Conexión (`src/patterns/singleton/dbConnection.ts`):** 
     * *Patrón Singleton:* Programar la clase de conexión a SQL Server utilizando la librería `mssql` asegurando que **jamás se abra más de una instancia de conexión simultánea**, optimizando recursos y centralizando las credenciales del archivo `.env`.
  2. **Sistema de Alertas (`src/patterns/observer/`):**
     * *Patrón Observer:* Crear un Notificador de Citas. Cuando el sistema registre una nueva Cita o un resultado preliminar del Akinator, el patrón notificará automáticamente tanto al Dueño de la mascota como al Veterinario asignado (simulando notificaciones en consola o interfaz).

---

### 🔵 3. CARLOS (Tú) — Motor de Pre-triage (Akinator), Reglas y Registro de Comandos
* **Objetivo:** Liderar la lógica central del sistema: el chat de diagnóstico interactivo, el motor de recomendaciones y el control de transacciones de acciones del sistema.
* **Patrones Asignados (3):** **State**, **Strategy** y **Command**.
* **Módulos a Desarrollar:**
  1. **Máquina de Estados del Akinator (`src/patterns/state/`):**
     * *Patrón State:* Implementar los estados del chat de pre-triage (`EstadoInicio`, `EstadoAnalizandoSintomas`, `EstadoDerivadoACita`). Cada estado encapsulará el comportamiento de las preguntas sin usar condicionales gigantes (`if/else` o `switch`).
  2. **Motor de Estrategias Médicas (`src/patterns/strategy/`):**
     * *Patrón Strategy:* Crear una familia de algoritmos de recomendación nutricional o médica según la especie, peso y gravedad de los síntomas detectados en el chat.
  3. **Gestor de Acciones / Transacciones (`src/patterns/command/`):**
     * *Patrón Command:* Encapsular las peticiones de agendado de citas o cambios de expedientes como objetos independientes (comandos), permitiendo un control estructurado de las operaciones del usuario.

---

## 🚀 Pasos Siguientes para el Equipo

1. **Actualizar el entorno local:**
   ```bash
   git pull origin main
   ```
2. **Instalar dependencias:**
   ```bash
   npm install
   ```
3. **Configurar base de datos:** Ejecutar el script SQL proporcionado en `BaseDeDatossql.sql` en SQL Server Management Studio.
4. **Desarrollar por ramas:** Cada integrante crea su propia rama en Git (`git checkout -b feature/patron-state`, etc.) para trabajar su módulo de forma limpia y segura.