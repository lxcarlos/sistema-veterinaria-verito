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

function claseEstado(estado) {
  return estado.toLowerCase().replaceAll(" ", "-");
}

export function encabezado(
  usuario,
  modoOscuro,
  perfilAbierto,
  notificacionesAbiertas,
  notificaciones,
) {
  const controlTema = `
    <div class="control-tema">
      <span class="etiqueta-tema">Modo oscuro</span>
      <button class="interruptor" type="button" role="switch"
        aria-checked="${modoOscuro}" aria-label="Cambiar modo oscuro"
        data-accion="tema">
        <span></span>
      </button>
    </div>`;

  if (!usuario) return controlTema;

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
    ${controlTema}
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
            minlength="4" required />
        </label>
        <button class="boton-principal" type="submit">
          ${registro ? "Crear cuenta" : "Iniciar sesión"}
        </button>
      </form>
    </section>`;
}

export function menu(rol, vistaActual) {
  const enlaces =
    rol === "Veterinario"
      ? [
          { vista: "citas", texto: "Citas" },
          { vista: "expediente", texto: "Expedientes" },
        ]
      : [
          { vista: "mascotas", texto: "Mis mascotas" },
          { vista: "akinator", texto: "Pre-triage" },
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
      <p class="texto-secundario">Toda su información, en un solo lugar.</p>
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
          <input name="Nombre_Mascota" required maxlength="60" />
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

function burbuja(mensaje) {
  if (mensaje.Tipo === "usuario") {
    return `<div class="fila-chat usuario"><div class="burbuja">${escapar(mensaje.Texto)}</div></div>`;
  }

  if (mensaje.Tipo === "resultado") {
    const gravedad = mensaje.Recomendacion.Gravedad;
    const clase = claseEstado(gravedad);
    return `
      <div class="fila-chat bot">
        <article class="tarjeta-resultado gravedad-${clase}">
          <p class="sobrelinea">Resultado del pre-triage</p>
          <h2>Gravedad ${escapar(gravedad.toLowerCase())}</h2>
          <p>${escapar(mensaje.Recomendacion.Texto_Recomendacion)}</p>
          ${
            mensaje.CitaAgendada
              ? '<button class="boton-secundario" type="button" disabled>Cita agendada</button>'
              : '<button class="boton-principal" type="button" data-accion="agendar-cita">Agendar cita</button>'
          }
        </article>
      </div>`;
  }

  return `
    <div class="fila-chat bot">
      <div class="burbuja">
        ${escapar(mensaje.Texto)}
        ${
          mensaje.Opciones?.length
            ? `<div class="opciones-chat">
                ${mensaje.Opciones.map(
                  (opcion) => `
                    <button class="chip-opcion" type="button"
                      data-opcion="${opcion.Numero_Opcion}">
                      ${escapar(opcion.Texto_Opcion)}
                    </button>`,
                ).join("")}
              </div>`
            : ""
        }
      </div>
    </div>`;
}

export function vistaAkinator(
  mascotas,
  idMascota,
  mensajes,
  progreso,
  escribiendo,
) {
  return `
    <section class="encabezado-vista">
      <p class="sobrelinea">Orientación inicial</p>
      <h1>Pre-triage</h1>
      <p class="texto-secundario">Responde con las opciones para orientar la consulta.</p>
    </section>
    <section class="tarjeta chat-tarjeta">
      <label class="selector-mascota">¿Para cuál mascota es la consulta?
        <select data-mascota-chat>
          <option value="">Selecciona una mascota</option>
          ${mascotas
            .map(
              (mascota) => `
                <option value="${mascota.Id_Mascota}"
                  ${Number(idMascota) === mascota.Id_Mascota ? "selected" : ""}>
                  ${escapar(mascota.Nombre_Mascota)} · ${escapar(mascota.Nombre_Especie)}
                </option>`,
            )
            .join("")}
        </select>
      </label>
      <div class="progreso-chat" aria-label="Progreso del pre-triage">
        <span style="width: ${progreso}%"></span>
      </div>
      <div class="mensajes-chat" id="mensajes-chat" aria-live="polite">
        ${
          mensajes.length
            ? mensajes.map(burbuja).join("")
            : '<p class="texto-secundario mensaje-inicial">Elige una mascota para comenzar.</p>'
        }
        ${
          escribiendo
            ? '<div class="fila-chat bot"><div class="burbuja indicador-escribiendo" aria-label="Verito está escribiendo"><span></span><span></span><span></span></div></div>'
            : ""
        }
      </div>
      ${
        idMascota
          ? `<button class="boton-texto reiniciar-chat" type="button"
              data-accion="reiniciar-chat">Reiniciar conversación</button>`
          : ""
      }
    </section>`;
}

export function vistaCitas(citas, esVeterinario) {
  return `
    <section class="encabezado-vista">
      <p class="sobrelinea">${esVeterinario ? "Agenda clínica" : "Seguimiento"}</p>
      <h1>${esVeterinario ? "Citas" : "Mis citas"}</h1>
      <p class="texto-secundario">
        ${esVeterinario ? "Revisa las solicitudes y actualiza su estado." : "Consulta el estado de tus citas."}
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
                            <button class="boton-texto" type="button"
                              data-accion="editar-expediente" data-cita="${cita.Id_Cita}">
                              Expediente
                            </button>
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

export function vistaExpediente(citas, idCita, expediente) {
  const cita = citas.find((item) => item.Id_Cita === Number(idCita));
  return `
    <section class="encabezado-vista">
      <p class="sobrelinea">Atención veterinaria</p>
      <h1>Expediente médico</h1>
      <p class="texto-secundario">Guarda el diagnóstico y las instrucciones de atención.</p>
    </section>
    <section class="tarjeta tarjeta-expediente">
      <label>Selecciona una cita
        <select data-cita-expediente>
          <option value="">Selecciona una cita</option>
          ${citas
            .map(
              (item) => `
                <option value="${item.Id_Cita}"
                  ${Number(idCita) === item.Id_Cita ? "selected" : ""}>
                  ${escapar(item.Nombre_Mascota)} · ${formatoFecha(item.Fecha_Propuesta)}
                </option>`,
            )
            .join("")}
        </select>
      </label>
      ${
        cita && expediente
          ? `<div class="resumen-cita">
              <strong>${escapar(cita.Nombre_Mascota)}</strong>
              <span>${escapar(cita.Nombre_Especie)} · ${escapar(cita.Nombre_Usuario)}</span>
            </div>
            <form class="formulario" data-formulario="expediente">
              <input type="hidden" name="Id_Cita" value="${cita.Id_Cita}" />
              <label>Diagnóstico
                <textarea name="Diagnostico_Medico" rows="4" required>${escapar(expediente.Diagnostico_Medico)}</textarea>
              </label>
              <label>Receta e instrucciones
                <textarea name="Receta_Instrucciones" rows="4" required>${escapar(expediente.Receta_Instrucciones)}</textarea>
              </label>
              <button class="boton-principal" type="submit">Guardar expediente</button>
            </form>`
          : '<p class="texto-secundario">Elige una cita para consultar o guardar su expediente.</p>'
      }
    </section>`;
}
