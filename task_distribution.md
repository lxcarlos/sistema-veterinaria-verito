# 📋 Distribución de Tareas - Proyecto Sistema de Veterinaria Verito

Este documento define qué parte del sistema desarrollará cada integrante del equipo, equilibrando la carga de trabajo según la complejidad técnica.

---

### 🟢 Gerardo (Módulo Operativo / Interfaz Básica)
*Dado que te toca el área más accesible, serás el encargado de la estructuración de vistas o la simulación de entrada/salida de datos sencilla.*
- **Tareas asignadas:**
  1. Crear los modelos faltantes en la carpeta `src/Modelos/`: `Cita.ts` y `ObservacionMedica.ts`.
  2. Redactar los manuales básicos o la documentación de usuario para el reporte final del proyecto.
  3. Apoyar en las pruebas unitarias básicas o en la validación visual de los datos de prueba insertados en SQL Server.

---

### 🟡 Christian (Lógica de Negocio y Conexión) El gerrado es puto 
*Te encargarás de conectar la base de datos con el código y estructurar parte de la lógica central.*
- **Tareas asignadas:**
  1. Crear el módulo de conexión a SQL Server (`src/database/db.ts`) utilizando la librería `mssql` y las variables de entorno `.env`.
  2. Desarrollar las consultas CRUD básicas (Insertar, Consultar) para los usuarios, mascotas y el registro de consultas del Akinator.
  3. Estructurar el modelo `ConsultaAkinator.ts` en la carpeta de modelos.

---

### 🔴 Carlos (Arquitectura Avanzada y Patrones - *Carga Pesada*)
*Al ser el líder técnico, te encargarás de la parte más compleja y de mayor peso para la rúbrica de la profesora.*
- **Tareas asignadas:**
  1. Diseñar e implementar el **Patrón de Diseño State** en la carpeta `src/Patrones/` para controlar el flujo inteligente de preguntas del chat estilo Akinator.
  2. Implementar el **Patrón de Diseño Strategy** para el motor de decisiones o reglas de derivación médica.
  3. Programar el archivo principal (`src/main.ts`) que unifica la ejecución del sistema, las clases de POO y los patrones de diseño para la demostración final.
  4. Revisar la integración de los códigos de tus compañeros antes de la entrega final.


  //ola