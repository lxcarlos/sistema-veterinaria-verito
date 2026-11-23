function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => {
    const caracteres = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return caracteres[caracter];
  });
}

function iniciales(nombre) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

function formatoFecha(fecha) {
  return new Date(fecha).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fechaMinimaLocal() {
  const intervalo = 30 * 60 * 1000;
  const fecha = new Date(Math.ceil(Date.now() / intervalo) * intervalo);
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 16);
}

function claseEstado(estado) {
  return estado.toLowerCase().replaceAll(" ", "-");
}

export function encabezado(
  usuario,
  perfilAbierto,
  notificacionesAbiertas,
  notificaciones,
) {
  if (!usuario) return "";

  const listaNotificaciones = notificacionesAbiertas
    ? `<div class="menu-desplegable menu-notificaciones">
        <h3>Notificaciones</h3>
        ${
          notificaciones.length
            ? notificaciones
                .map(
                  (item) => `
                    <p class="notificacion-item">
                      ${escapar(item.Mensaje_Notificacion)}
                      <small>${formatoFecha(item.Fecha_Notificacion)}</small>
                    </p>`,
                )
                .join("")
            : '<p class="texto-secundario">No tienes notificaciones.</p>'
        }
      </div>`
    : "";
  const menuPerfil = perfilAbierto
    ? `<div class="menu-desplegable menu-perfil">
        <strong>${escapar(usuario.Nombre_Usuario)}</strong>
        <span>${escapar(usuario.Nombre_Rol)}</span>
        <button class="boton-texto" type="button" data-accion="cerrar-sesion">
          Cerrar sesión
        </button>
      </div>`
    : "";

  return `
    <button class="boton-icono" type="button" aria-label="Deshacer última acción"
      title="Deshacer última acción" data-accion="deshacer">↶</button>
    <div class="contenedor-desplegable">
      <button class="boton-icono campana" type="button"
        aria-label="Notificaciones" aria-expanded="${notificacionesAbiertas}"
        data-accion="notificaciones">
        <svg class="icono-campana" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        ${notificaciones.length ? '<span class="punto-notificacion"></span>' : ""}
      </button>
      ${listaNotificaciones}
    </div>
    <div class="contenedor-desplegable">
      <button class="perfil-resumen" type="button" data-accion="perfil"
        aria-expanded="${perfilAbierto}">
        <span class="avatar">${escapar(iniciales(usuario.Nombre_Usuario))}</span>
        <span class="perfil-resumen-texto">
          <strong>${escapar(usuario.Nombre_Usuario)}</strong>
          <small>${escapar(usuario.Nombre_Rol)}</small>
        </span>
      </button>
      ${menuPerfil}
    </div>`;
}

export function login(roles, modo, rolSeleccionado) {
  const registro = modo === "registro";
  return `
    <section class="tarjeta acceso">
      <div class="marca-grande"><span class="marca-icono">V</span></div>
      <p class="sobrelinea">Bienvenido a Verito</p>
      <h1>${registro ? "Crea tu cuenta" : "Tu cuidado veterinario, más cerca"}</h1>
      <p class="texto-secundario">
        ${registro ? "Regístrate para comenzar." : "Inicia sesión para continuar."}
      </p>
      <div class="pestanas" role="tablist" aria-label="Acceso">
        <button type="button" role="tab" aria-selected="${!registro}"
          class="${!registro ? "seleccionado" : ""}" data-accion="modo-login">
          Iniciar sesión
        </button>
        <button type="button" role="tab" aria-selected="${registro}"
          class="${registro ? "seleccionado" : ""}" data-accion="modo-registro">
          Crear cuenta
        </button>
      </div>
      <div class="segmentado" role="group" aria-label="Selecciona tu rol">
        ${roles
          .map(
            (rol) => `
              <button type="button"
                class="${rol.Nombre_Rol === rolSeleccionado ? "seleccionado" : ""}"
                aria-pressed="${rol.Nombre_Rol === rolSeleccionado}"
                data-rol="${escapar(rol.Nombre_Rol)}">
                ${escapar(rol.Nombre_Rol)}
              </button>`,
          )
          .join("")}
      </div>
      <form class="formulario" data-formulario="${registro ? "registro" : "login"}">
        ${
          registro
            ? `<label>Nombre
                <input name="Nombre_Usuario" autocomplete="name" required />
              </label>`
            : ""
        }
        <label>Correo electrónico
          <input name="Email_Usuario" type="email" autocomplete="email" required />
        </label>
        <label>Contraseña
          <input name="Contrasena" type="password"
            autocomplete="${registro ? "new-password" : "current-password"}"
            minlength="${registro ? "8" : "1"}" required />
        </label>
        ${
          registro && rolSeleccionado === "Veterinario"
            ? `<label>Código de invitación para veterinarios
                <input name="Codigo_Veterinario" type="password" autocomplete="off" required />
              </label>`
            : ""
        }
        <button class="boton-principal" type="submit">
          ${registro ? "Crear cuenta" : "Iniciar sesión"}
        </button>
      </form>
    </section>`;
}

export function menu(rol, vistaActual) {
  const enlaces =
    rol === "Veterinario"
      ? [{ vista: "citas", texto: "Citas" }]
      : [
          { vista: "mascotas", texto: "Mis mascotas" },
          { vista: "agendar", texto: "Solicitar cita" },
          { vista: "citas", texto: "Mis citas" },
        ];
  return `
    <nav class="menu-principal" aria-label="Navegación principal">
      ${enlaces
        .map(
          (enlace) => `
            <button type="button"
              class="${enlace.vista === vistaActual ? "activo" : ""}"
              data-vista="${enlace.vista}">
              ${enlace.texto}
            </button>`,
        )
        .join("")}
    </nav>`;
}

export function vistaMascotas(mascotas, especies) {
  return `
    <section class="encabezado-vista">
      <p class="sobrelinea">Tu familia</p>
      <h1>Mis mascotas</h1>
      <p class="texto-secundario">Registra tus mascotas y solicita sus citas.</p>
    </section>
    <section class="rejilla-mascotas">
      ${
        mascotas.length
          ? mascotas
              .map(
                (mascota) => `
                  <article class="tarjeta tarjeta-mascota">
                    <span class="icono-mascota" aria-hidden="true">✦</span>
                    <h2>${escapar(mascota.Nombre_Mascota)}</h2>
                    <p>${escapar(mascota.Nombre_Especie)}</p>
                    <div class="detalles-mascota">
                      <span>${escapar(mascota.Edad_Mascota)} años</span>
                      <span>${escapar(mascota.Peso_Mascota)} kg</span>
                    </div>
                  </article>`,
              )
              .join("")
          : '<p class="vacio">Aún no has agregado mascotas.</p>'
      }
    </section>
    <section class="tarjeta formulario-mascota">
      <h2>Agregar mascota</h2>
      <form class="formulario formulario-en-linea" data-formulario="mascota">
        <label>Nombre
          <input name="Nombre_Mascota" required maxlength="50" />
        </label>
        <label>Especie
          <select name="Nombre_Especie" required>
            <option value="">Selecciona una especie</option>
            ${especies
              .map(
                (especie) =>
                  `<option value="${escapar(especie.Nombre_Especie)}">${escapar(especie.Nombre_Especie)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label>Edad
          <input name="Edad_Mascota" type="number" min="0" max="100" required />
        </label>
        <label>Peso (kg)
          <input name="Peso_Mascota" type="number" min="0.1" step="0.1" required />
        </label>
        <button class="boton-principal" type="submit">Guardar mascota</button>
      </form>
    </section>`;
}

export function vistaAgendarCita(mascotas, tiposCita) {
  return `
    <section class="encabezado-vista">
      <p class="sobrelinea">Agenda</p>
      <h1>Solicitar cita</h1>
      <p class="texto-secundario">Elige una mascota, el tipo de cita y un horario.</p>
    </section>
    <section class="tarjeta tarjeta-formulario-cita">
      ${
        mascotas.length
          ? `<form class="formulario" data-formulario="agendar-cita">
              <label>Mascota
                <select name="Id_Mascota" required>
                  <option value="">Selecciona una mascota</option>
                  ${mascotas
                    .map(
                      (mascota) =>
                        `<option value="${mascota.Id_Mascota}">${escapar(mascota.Nombre_Mascota)} · ${escapar(mascota.Nombre_Especie)}</option>`,
                    )
                    .join("")}
                </select>
              </label>
              <label>Tipo de cita
                <select name="Tipo_Cita" required>
                  <option value="">Selecciona el tipo de cita</option>
                  ${tiposCita
                    .map(
                      (tipo) =>
                        `<option value="${escapar(tipo)}">${escapar(tipo)}</option>`,
                    )
                    .join("")}
                </select>
              </label>
              <label>Fecha y hora
                <input name="Fecha_Propuesta" type="datetime-local"
                  min="${fechaMinimaLocal()}" step="1800" required />
              </label>
              <button class="boton-principal" type="submit">Solicitar cita</button>
              <p class="texto-secundario">
                La cita queda pendiente hasta que un veterinario responda.
              </p>
            </form>`
          : `<p class="texto-secundario">Primero agrega una mascota para solicitar una cita.</p>
             <button class="boton-secundario" type="button" data-vista="mascotas">
               Ir a mis mascotas
             </button>`
      }
    </section>`;
}

export function vistaCitas(citas, esVeterinario) {
  return `
    <section class="encabezado-vista">
      <p class="sobrelinea">${esVeterinario ? "Agenda clínica" : "Seguimiento"}</p>
      <h1>${esVeterinario ? "Citas" : "Mis citas"}</h1>
      <p class="texto-secundario">
        ${esVeterinario ? "Revisa las solicitudes y actualiza su estado." : "Consulta tus solicitudes de cita."}
      </p>
    </section>
    <section class="lista-citas">
      ${
        citas.length
          ? citas
              .map(
                (cita) => `
                  <article class="tarjeta tarjeta-cita">
                    <div class="cita-cabecera">
                      <div>
                        <h2>${escapar(cita.Nombre_Mascota)}</h2>
                        <p>${escapar(cita.Nombre_Especie)} · ${formatoFecha(cita.Fecha_Propuesta)}</p>
                        <p>${escapar(cita.Tipo_Cita)}</p>
                        <p>${escapar(cita.Texto_Recomendacion)}</p>
                        ${esVeterinario ? `<p>Dueño: ${escapar(cita.Nombre_Usuario)}</p>` : ""}
                      </div>
                      <span class="estado estado-${claseEstado(cita.Estado_Cita)}">
                        ${escapar(cita.Estado_Cita)}
                      </span>
                    </div>
                    ${
                      esVeterinario
                        ? `<div class="acciones-cita">
                            ${cita.Acciones_Disponibles.map(
                              (accion) => `
                                <button class="${accion.Estilo_Accion === "secundario" ? "boton-secundario" : "boton-principal"}"
                                  type="button" data-estado="${escapar(accion.Estado_Cita)}"
                                  data-cita="${cita.Id_Cita}">
                                  ${escapar(accion.Texto_Accion)}
                                </button>`,
                            ).join("")}
                          </div>`
                        : ""
                    }
                  </article>`,
              )
              .join("")
          : '<p class="vacio">Todavía no hay citas para mostrar.</p>'
      }
    </section>`;
}
