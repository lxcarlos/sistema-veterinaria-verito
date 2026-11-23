# Verito: alcance simple y patrones de diseño

La aplicación conserva únicamente las funciones necesarias para demostrar los patrones desde la página web: registro e inicio de sesión, registro de mascotas y solicitud/gestión de citas. Se eliminaron el pre-triaje y los expedientes.

## Patrones usados por el flujo web

| Patrón | Uso en la aplicación |
|---|---|
| Factory | `EntidadFactory` crea entidades `Usuario` y `Mascota` al registrarlas. |
| Singleton | `ConexionBaseDatos` mantiene la conexión compartida con SQL Server. |
| Strategy | El tipo de cita (consulta general, vacunación o seguimiento) selecciona una recomendación breve de preparación. No es una recomendación médica. |
| State | La cita controla las transiciones Pendiente → Aceptada/Rechazada → Completada y las acciones que se muestran. |
| Command | Registrar mascota, solicitar cita y cambiar su estado son comandos que pueden deshacerse desde la página. |
| Observer | Al solicitar o actualizar una cita, el dueño y el veterinario reciben una notificación en la interfaz. |

## Flujo mínimo

- El dueño crea su cuenta y registra mascotas.
- El dueño solicita una cita para una mascota, selecciona su tipo y propone una fecha futura en intervalos de 30 minutos.
- La solicitud queda Pendiente hasta que un veterinario la acepta o rechaza. Una cita aceptada puede marcarse como Completada.
- La página muestra el estado, las notificaciones y una recomendación breve según el tipo de cita.

## Para ejecutar

1. Ejecuta `BaseDeDatos/BaseDeDatossql.sql` en SQL Server Management Studio. El script crea el esquema mínimo y migra la relación de citas del esquema anterior sin borrar los registros existentes.
2. Copia `.env.example` a `.env` y configura la conexión a SQL Server. Define también el código de invitación para registrar veterinarios. No publiques `.env`.
3. Ejecuta `npm run dev` y abre `http://localhost:3001`.
4. Ejecuta `npm test` para compilar y validar los patrones, o `npm run build` para compilar solamente.

La API es el puente entre la página y SQL Server: mantiene las credenciales fuera del navegador, valida permisos y ejecuta las operaciones. No es una función extra y se conserva reducida a las acciones de esta aplicación.

La validación end-to-end no es una función de usuario ni un módulo adicional: consiste en comprobar manualmente el flujo de registro, mascota, cita y cambio de estado con SQL Server en ejecución.
