/*
 * ============================================================
 *  Ficha Maker · Interfaz
 * ============================================================
 *  - Lee el formulario y lo convierte en un objeto de datos.
 *  - Muestra la ficha (js/ficha.js) y los textos (js/redes.js).
 *  - Guarda y carga los datos en JSON, exporta la ficha en HTML
 *    e imprime.
 *  Todo ocurre en el navegador: nada se envía a ningún servidor.
 * ============================================================
 */
(function () {
  'use strict';

  const F = window.Ficha;
  const R = window.Redes;
  const $ = (id) => document.getElementById(id);
  const form = $('formulario');
  const CLAVE_BORRADOR = 'ficha-maker-borrador';   // copia automática en este navegador
  const VERSION_DATOS = 1;

  let foto = '';                 // foto en formato data URL (JPEG reducido)
  const editados = {};           // redes cuyo texto ha modificado el usuario

  // ---------- Estilos de la ficha dentro de la página ----------
  const estilo = document.createElement('style');
  estilo.textContent = F.FICHA_CSS;
  document.head.appendChild(estilo);

  // ---------- Casillas de máquinas ----------
  Object.entries(F.MAQUINAS).forEach(([id, nombre]) => {
    const label = document.createElement('label');
    label.className = 'maquina';
    label.innerHTML = `<input type="checkbox" name="maquinas" value="${id}"><span>${nombre}</span>`;
    $('maquinas').appendChild(label);
  });

  // ============================================================
  //  Formulario ⇄ datos
  // ============================================================

  /** Lee el formulario y devuelve el objeto de datos del proyecto. */
  function leerDatos() {
    const v = (n) => (form.elements[n].value || '').trim();
    return {
      version: VERSION_DATOS,
      titulo: v('titulo'),
      resumen: v('resumen'),
      descripcion: v('descripcion'),
      autores: v('autores').split('\n').map((s) => s.trim()).filter(Boolean),
      fablab: v('fablab'),
      fecha: v('fecha'),
      maquinas: Array.from(form.querySelectorAll('input[name="maquinas"]:checked')).map((c) => c.value),
      otraMaquina: v('otraMaquina'),
      materiales: v('materiales').split(',').map((s) => s.trim()).filter(Boolean),
      tiempo: { horas: parseInt(v('horas'), 10) || 0, minutos: parseInt(v('minutos'), 10) || 0 },
      dificultad: v('dificultad'),
      foto,
      altFoto: v('altFoto'),
      enlaces: { documentacion: v('documentacion'), archivos: v('archivos'), video: v('video') },
      licencia: v('licencia'),
      hashtagsExtra: v('hashtagsExtra')
    };
  }

  /** Rellena el formulario a partir de un objeto de datos. */
  function escribirDatos(d) {
    const pon = (n, val) => { if (form.elements[n]) form.elements[n].value = val == null ? '' : val; };
    pon('titulo', d.titulo);
    pon('resumen', d.resumen);
    pon('descripcion', d.descripcion);
    pon('autores', (d.autores || []).join('\n'));
    pon('fablab', d.fablab);
    pon('fecha', d.fecha);
    form.querySelectorAll('input[name="maquinas"]').forEach((c) => { c.checked = (d.maquinas || []).includes(c.value); });
    pon('otraMaquina', d.otraMaquina);
    pon('materiales', (d.materiales || []).join(', '));
    pon('horas', d.tiempo && d.tiempo.horas ? d.tiempo.horas : '');
    pon('minutos', d.tiempo && d.tiempo.minutos ? d.tiempo.minutos : '');
    pon('dificultad', d.dificultad);
    pon('altFoto', d.altFoto);
    pon('documentacion', d.enlaces && d.enlaces.documentacion);
    pon('archivos', d.enlaces && d.enlaces.archivos);
    pon('video', d.enlaces && d.enlaces.video);
    pon('licencia', d.licencia || 'Sin especificar');
    pon('hashtagsExtra', d.hashtagsExtra);
    ponerFoto(d.foto || '');
    Object.keys(editados).forEach((k) => delete editados[k]);
    actualizar();
  }

  // ============================================================
  //  Vista previa
  // ============================================================

  function pintarFicha(d) {
    $('ficha').innerHTML = F.html(d);
  }

  /** Crea las tarjetas de texto de cada red (una sola vez). */
  function crearTarjetasRedes() {
    Object.entries(R.REDES).forEach(([id, red]) => {
      const div = document.createElement('div');
      div.className = 'red';
      div.innerHTML = `
        <div class="red__cabecera">
          <h3>${red.nombre}</h3>
          <span class="red__contador" id="cont-${id}"></span>
        </div>
        <label class="oculto" for="texto-${id}">Texto para ${red.nombre}</label>
        <textarea id="texto-${id}" rows="10"></textarea>
        <div class="red__pie">
          <span class="nota">Recomendado: hasta ${red.recomendado.toLocaleString('es-ES')} caracteres · Máximo: ${red.limite.toLocaleString('es-ES')}</span>
          <button type="button" class="boton boton--pequeno" data-copiar="${id}">Copiar</button>
        </div>`;
      $('redes').appendChild(div);
      const ta = div.querySelector('textarea');
      ta.addEventListener('input', () => { editados[id] = true; contar(id); });
      div.querySelector('[data-copiar]').addEventListener('click', (e) => copiar(ta, e.target));
    });
  }

  /** Contador de caracteres con aviso si se pasa del recomendado o del límite. */
  function contar(id) {
    const red = R.REDES[id];
    const n = Array.from($(`texto-${id}`).value).length;
    const c = $(`cont-${id}`);
    c.textContent = `${n.toLocaleString('es-ES')} caracteres`;
    c.dataset.estado = n > red.limite ? 'error' : n > red.recomendado ? 'aviso' : 'ok';
  }

  function pintarRedes(d, forzar) {
    const textos = R.generar(d);
    Object.keys(textos).forEach((id) => {
      if (editados[id] && !forzar) return;   // no se pisa lo que ha editado el usuario
      $(`texto-${id}`).value = textos[id];
      contar(id);
    });
    if (forzar) Object.keys(editados).forEach((k) => delete editados[k]);
  }

  let espera;
  function actualizar() {
    clearTimeout(espera);
    espera = setTimeout(() => {
      const d = leerDatos();
      pintarFicha(d);
      pintarRedes(d, false);
      guardarBorrador(d);
    }, 120);
  }

  // ============================================================
  //  Foto: se reduce en el navegador y se guarda como data URL
  // ============================================================

  function ponerFoto(dataUrl) {
    foto = dataUrl;
    $('fotoVista').innerHTML = foto ? `<img src="${foto}" alt="">` : '<span>Sin foto</span>';
  }

  /** Reduce la imagen a un máximo de 1200 px de lado y la convierte en JPEG. */
  function reducirImagen(src) {
    return new Promise((resolver, rechazar) => {
      const img = new Image();
      img.onload = () => {
        const max = 1200;
        const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * escala);
        c.height = Math.round(img.naturalHeight * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        try { resolver(c.toDataURL('image/jpeg', 0.85)); } catch (e) { rechazar(e); }
      };
      img.onerror = rechazar;
      img.src = src;
    });
  }

  $('archivoFoto').addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo || !archivo.type.startsWith('image/')) return avisar('El archivo no es una imagen.');
    const url = URL.createObjectURL(archivo);
    try {
      ponerFoto(await reducirImagen(url));
      actualizar();
    } catch (err) {
      avisar('No se ha podido leer la imagen.');
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  $('quitarFoto').addEventListener('click', () => { ponerFoto(''); actualizar(); });

  // ============================================================
  //  Guardar, cargar y exportar
  // ============================================================

  /** Convierte un título en un nombre de archivo sencillo. */
  function nombreArchivo(titulo) {
    return (titulo || 'proyecto').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'proyecto';
  }

  function descargar(contenido, nombre, tipo) {
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  let temporizadorAviso;
  function avisar(texto) {
    const a = $('aviso');
    a.textContent = texto;
    a.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { a.hidden = true; }, 5000);
  }

  $('botonGuardar').addEventListener('click', () => {
    const d = leerDatos();
    descargar(JSON.stringify(d, null, 2), `ficha-${nombreArchivo(d.titulo)}.json`, 'application/json');
  });

  $('archivoJson').addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const d = JSON.parse(lector.result);
        if (typeof d !== 'object' || d === null || !('titulo' in d)) throw new Error('formato');
        escribirDatos(d);
        avisar('Datos cargados.');
      } catch (err) {
        avisar('El archivo no es una ficha válida de Ficha Maker.');
      }
    };
    lector.readAsText(archivo);
  });

  $('botonHtml').addEventListener('click', () => {
    const d = leerDatos();
    if (!d.titulo) return avisar('Escribe al menos el título del proyecto.');
    descargar(F.documento(d), `ficha-${nombreArchivo(d.titulo)}.html`, 'text/html');
  });

  $('botonImprimir').addEventListener('click', () => {
    mostrarPestana('tabFicha');
    window.print();
  });

  /** Carga el proyecto de ejemplo (ejemplo-proyecto.json) y su foto. */
  $('botonEjemplo').addEventListener('click', async () => {
    try {
      const d = await (await fetch('ejemplo-proyecto.json')).json();
      if (d.foto && !d.foto.startsWith('data:')) {
        const blob = await (await fetch(d.foto)).blob();
        d.foto = await reducirImagen(URL.createObjectURL(blob));
      }
      escribirDatos(d);
    } catch (err) {
      avisar('No se ha podido cargar el ejemplo. Si has abierto el archivo desde tu ordenador, usa «Abrir datos (JSON)» y elige ejemplo-proyecto.json.');
    }
  });

  // Vaciar: pide una segunda pulsación para evitar borrados por error
  let confirmarVaciar = false;
  $('botonVaciar').addEventListener('click', (e) => {
    if (!confirmarVaciar) {
      e.preventDefault();
      confirmarVaciar = true;
      e.target.textContent = '¿Seguro? Pulsa otra vez para vaciar';
      setTimeout(() => { confirmarVaciar = false; e.target.textContent = 'Vaciar formulario'; }, 4000);
    }
  });
  form.addEventListener('reset', () => {
    setTimeout(() => {
      ponerFoto('');
      Object.keys(editados).forEach((k) => delete editados[k]);
      confirmarVaciar = false;
      $('botonVaciar').textContent = 'Vaciar formulario';
      actualizar();
    });
  });

  // ============================================================
  //  Borrador automático (solo en este navegador)
  // ============================================================

  function guardarBorrador(d) {
    try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(d)); } catch (e) { /* sin espacio o bloqueado */ }
  }
  function recuperarBorrador() {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null');
      if (d && d.titulo) escribirDatos(d);
    } catch (e) { /* se ignora */ }
  }

  // ============================================================
  //  Copiar al portapapeles
  // ============================================================

  async function copiar(textarea, boton) {
    try {
      await navigator.clipboard.writeText(textarea.value);
    } catch (e) {
      textarea.select();
      document.execCommand('copy');
    }
    boton.textContent = '¡Copiado!';
    setTimeout(() => { boton.textContent = 'Copiar'; }, 1500);
  }

  // ============================================================
  //  Pestañas (accesibles con teclado)
  // ============================================================

  const pestanas = [$('tabFicha'), $('tabRedes')];
  function mostrarPestana(id) {
    pestanas.forEach((t) => {
      const activa = t.id === id;
      t.setAttribute('aria-selected', activa);
      t.tabIndex = activa ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !activa;
    });
  }
  pestanas.forEach((t, i) => {
    t.addEventListener('click', () => mostrarPestana(t.id));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const otra = pestanas[(i + (e.key === 'ArrowRight' ? 1 : -1) + pestanas.length) % pestanas.length];
      otra.focus();
      mostrarPestana(otra.id);
    });
  });

  $('botonRegenerar').addEventListener('click', () => pintarRedes(leerDatos(), true));

  // ---------- Inicio ----------
  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  form.addEventListener('submit', (e) => e.preventDefault());
  crearTarjetasRedes();
  recuperarBorrador();
  actualizar();
})();
