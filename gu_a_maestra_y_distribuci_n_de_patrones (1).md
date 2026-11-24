# Verito: alcance simple y patrones de diseño

La aplicación conserva las funciones necesarias para demostrar los patrones desde la página web: registro e inicio de sesión, registro de mascotas, un árbol de orientación de síntomas y solicitud/gestión de citas. No incluye expedientes. El resultado del árbol es orientativo, no un diagnóstico; sus preguntas y puntajes requieren validación veterinaria.

## Patrones usados por el flujo web

| Patrón | Uso en la aplicación |
|---|---|
| Factory | `EntidadFactory` crea entidades `Usuario` y `Mascota` al registrarlas. |
| Singleton | `ConexionBaseDatos` mantiene la conexión compartida con SQL Server. |
| Strategy | Selecciona la orientación según el puntaje del árbol y también una recomendación breve según el tipo de cita. |
| State | Controla el avance entre preguntas del árbol y las transiciones Pendiente → Aceptada/Rechazada → Completada de una cita. |
| Command | Registrar mascota, solicitar cita y cambiar su estado son comandos que pueden deshacerse desde la página. |
| Observer | Al solicitar o actualizar una cita, el dueño y el veterinario reciben una notificación en la interfaz. |

## Responsables del desarrollo

| Integrante | Patrones |
|---|---|
| Christian | Singleton y Observer |
| Gerardo | Factory y Strategy |
| Carlos | State y Command |

## Flujo mínimo

- El dueño crea su cuenta y registra mascotas.
- El dueño elige una mascota y responde las preguntas del árbol; el resultado y las respuestas se guardan en SQL Server.
- Si el prototipo clasifica el resultado como grave, permite proponer una cita. El resultado no sustituye la valoración veterinaria.
- La solicitud queda Pendiente hasta que un veterinario la acepta o rechaza. Una cita aceptada puede marcarse como Completada.
- El veterinario puede consultar las respuestas asociadas a la cita. La página muestra el estado y las notificaciones.
- El modo oscuro es una preferencia del navegador, guardada en `localStorage`; no se guarda en SQL Server.

## Para ejecutar

1. Ejecuta `BaseDeDatos/BaseDeDatossql.sql` en SQL Server Management Studio. El script crea el esquema mínimo, las evaluaciones del árbol y la relación opcional entre evaluación y cita; migra el esquema anterior sin borrar los registros existentes.
2. Copia `.env.example` a `.env` y configura la conexión a SQL Server. No publiques `.env`.
3. Ejecuta `npm run dev` y abre `http://localhost:3001`.
4. Ejecuta `npm test` para compilar y validar los patrones, o `npm run build` para compilar solamente.

La API es el puente entre la página y SQL Server: mantiene las credenciales fuera del navegador, valida permisos y ejecuta las operaciones. No es una función extra y se conserva reducida a las acciones de esta aplicación.

Las cuentas, mascotas, evaluaciones completadas y citas se guardan en la base SQL Server local. La sesión, las notificaciones de interfaz y el historial de deshacer viven en memoria y se pierden al reiniciar el servidor. La validación end-to-end no es una función de usuario: consiste en comprobar manualmente el flujo de acceso, mascota, árbol, cita y cambio de estado con SQL Server en ejecución.
