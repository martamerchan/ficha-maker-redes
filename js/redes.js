/*
 * ============================================================
 *  Ficha Maker · Textos para redes sociales
 * ============================================================
 *  Genera un texto para cada red a partir de los datos del proyecto,
 *  con la longitud y el tono de cada una, y sugiere hashtags.
 *
 *  Criterios de accesibilidad que siguen todos los textos:
 *   - Hashtags en CamelCase (#CorteLaser), legibles por lectores de pantalla.
 *   - Pocos emojis y nunca en mitad de una frase.
 *   - Sin frases en mayúsculas.
 * ============================================================
 */
window.Redes = (function () {
  'use strict';

  const F = window.Ficha;

  /* Configuración de cada red.
     - limite: máximo de caracteres que admite la plataforma.
     - recomendado: longitud orientativa para que el texto funcione bien.
     - hashtags: número máximo de hashtags sugeridos. */
  const REDES = {
    instagram: { nombre: 'Instagram', limite: 2200, recomendado: 900, hashtags: 8 },
    linkedin: { nombre: 'LinkedIn', limite: 3000, recomendado: 1300, hashtags: 4 },
    tiktok: { nombre: 'TikTok', limite: 4000, recomendado: 300, hashtags: 5 }
  };

  // Hashtags asociados a cada máquina
  const HASHTAGS_MAQUINA = {
    impresion3d: ['Impresion3D'],
    laser: ['CorteLaser'],
    cnc: ['CNC', 'Fresado'],
    electronica: ['Electronica'],
    vinilo: ['Vinilo'],
    bordado: ['BordadoDigital'],
    escaner: ['Escaneo3D'],
    termoformado: ['Termoformado']
  };

  const HASHTAGS_BASE = ['FabLab', 'FabricacionDigital', 'Maker', 'Prototipado', 'HazloTuMismo', 'CulturaMaker'];

  /** Convierte un texto cualquiera en un hashtag en CamelCase, sin tildes. */
  function aHashtag(texto) {
    return String(texto)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quita tildes
      .replace(/[^A-Za-z0-9ñÑ\s]/g, ' ')
      .split(/\s+/).filter(Boolean)
      .map((p) => (/^[A-Z0-9]+$/.test(p) && p.length <= 4 ? p : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
      .join('');
  }

  /** Lista de hashtags sugeridos, sin repetir, en orden de relevancia. */
  function hashtags(d, max) {
    const lista = [];
    const anadir = (h) => { if (h && h.length > 1 && !lista.some((x) => x.toLowerCase() === h.toLowerCase())) lista.push(h); };
    // 1. Los que escribe el usuario, primero
    String(d.hashtagsExtra || '').split(/[\s,]+/).map((h) => h.replace(/^#/, '')).filter(Boolean).forEach((h) => anadir(/\p{Lu}/u.test(h.slice(1)) ? h.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : aHashtag(h)));
    // 2. Los genéricos más importantes
    anadir('FabLab'); anadir('FabricacionDigital');
    // 3. Los de las máquinas usadas
    (d.maquinas || []).forEach((m) => (HASHTAGS_MAQUINA[m] || []).forEach(anadir));
    // 4. Materiales de una o dos palabras
    (d.materiales || []).filter((m) => m.split(/\s+/).length <= 2 && m.length <= 18).forEach((m) => anadir(aHashtag(m)));
    // 5. El resto de genéricos
    HASHTAGS_BASE.forEach(anadir);
    return lista.slice(0, max).map((h) => '#' + h);
  }

  /** Une elementos en una lista natural: "a, b y c". */
  function listaNatural(items) {
    const l = items.filter(Boolean);
    if (l.length <= 1) return l.join('');
    return l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1];
  }

  /** Recorta un texto largo por el final de una frase o palabra. */
  function recortar(texto, max) {
    const t = String(texto || '').trim();
    if (t.length <= max) return t;
    const corte = t.slice(0, max);
    const punto = corte.lastIndexOf('. ');
    if (punto > max * 0.5) return corte.slice(0, punto + 1);
    return corte.slice(0, corte.lastIndexOf(' ')) + '…';
  }

  /** Primera letra en minúscula (para integrar el título en una frase). */
  function enFrase(t) {
    const s = String(t || '').trim();
    return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  }

  // ============================================================
  //  Plantillas por red
  // ============================================================

  /** Instagram: cercano, visual, llamada a la acción al enlace de la bio. */
  function instagram(d) {
    const maquinas = F.nombresMaquinas(d);
    const tiempo = F.textoTiempo(d.tiempo);
    const lineas = [];
    lineas.push(`${d.titulo || 'Nuevo proyecto'} ✨`);
    if (d.resumen) lineas.push(d.resumen);
    lineas.push('');
    if (d.descripcion) { lineas.push(recortar(d.descripcion, 450)); lineas.push(''); }
    if (maquinas.length) lineas.push(`— Hecho con: ${listaNatural(maquinas.map(enFrase))}`);
    if (d.materiales && d.materiales.length) lineas.push(`— Materiales: ${listaNatural(d.materiales.map(enFrase))}`);
    if (tiempo) lineas.push(`— Tiempo de fabricación: ${tiempo}`);
    if (d.autores && d.autores.length) lineas.push(`— Autoría: ${listaNatural(d.autores)}`);
    if (d.fablab) lineas.push(`— Dónde: ${d.fablab}`);
    lineas.push('');
    const enlace = F.urlSegura(d.enlaces && (d.enlaces.documentacion || d.enlaces.archivos));
    lineas.push(enlace ? 'Tienes toda la documentación en el enlace de la bio 👆' : '¿Qué te parece? Te leemos en comentarios 👇');
    lineas.push('');
    lineas.push(hashtags(d, REDES.instagram.hashtags).join(' '));
    return lineas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /** LinkedIn: profesional, explica el proceso y pone en valor el trabajo. */
  function linkedin(d) {
    const maquinas = F.nombresMaquinas(d);
    const tiempo = F.textoTiempo(d.tiempo);
    const autores = listaNatural(d.autores || []);
    const p = [];
    let intro = d.titulo ? `Presentamos «${d.titulo}»` : 'Presentamos un nuevo proyecto';
    if (d.resumen) intro += `: ${enFrase(d.resumen).replace(/\.$/, '')}`;
    intro += '.';
    p.push(intro);

    let quien = '';
    if (autores && d.fablab) quien = `Es un prototipo desarrollado por ${autores} en ${d.fablab}.`;
    else if (autores) quien = `Es un prototipo desarrollado por ${autores}.`;
    else if (d.fablab) quien = `Es un prototipo desarrollado en ${d.fablab}.`;
    if (quien || d.descripcion) p.push([quien, recortar(d.descripcion, 900)].filter(Boolean).join(' '));

    const proceso = [];
    if (maquinas.length) proceso.push(`• Tecnologías de fabricación: ${listaNatural(maquinas.map(enFrase))}`);
    if (d.materiales && d.materiales.length) proceso.push(`• Materiales: ${listaNatural(d.materiales.map(enFrase))}`);
    if (tiempo) proceso.push(`• Tiempo de fabricación: ${tiempo}`);
    if (d.licencia && d.licencia !== 'Sin especificar') proceso.push(`• Licencia del diseño: ${d.licencia}`);
    if (proceso.length) p.push('Proceso de fabricación:\n' + proceso.join('\n'));

    if (d.licencia && /CC|CERN|MIT|GPL/.test(d.licencia)) {
      p.push('El diseño está publicado con licencia abierta, para que cualquier persona pueda reproducirlo, adaptarlo y mejorarlo.');
    }

    const enlaces = [];
    const docu = F.urlSegura(d.enlaces && d.enlaces.documentacion);
    const arch = F.urlSegura(d.enlaces && d.enlaces.archivos);
    if (docu) enlaces.push(`Documentación: ${docu}`);
    if (arch) enlaces.push(`Archivos de diseño: ${arch}`);
    if (enlaces.length) p.push(enlaces.join('\n'));

    p.push(hashtags(d, REDES.linkedin.hashtags).join(' '));
    return p.join('\n\n');
  }

  /** TikTok: gancho inicial corto y directo, el vídeo hace el resto. */
  function tiktok(d) {
    const maquinas = F.nombresMaquinas(d);
    const tiempo = F.textoTiempo(d.tiempo);
    const lineas = [tiempo ? `De la idea al prototipo en ${tiempo} ⏱️` : 'De la idea al prototipo 🛠️'];
    const detalle = [];
    if (maquinas.length) detalle.push(listaNatural(maquinas.map((m, i) => (i ? enFrase(m) : m))));
    if (d.materiales && d.materiales.length) detalle.push(listaNatural(d.materiales.slice(0, 3).map(enFrase)));
    let linea = d.titulo ? `«${d.titulo}»` : '';
    if (detalle.length) linea += (linea ? ': ' : '') + (linea ? enFrase(detalle.join(' + ')) : detalle.join(' + '));
    if (linea) lineas.push(linea + (d.fablab ? `. Hecho en ${d.fablab}.` : '.'));
    lineas.push(hashtags(d, REDES.tiktok.hashtags).join(' '));
    return lineas.join('\n');
  }

  /** Genera los tres textos. */
  function generar(d) {
    return { instagram: instagram(d), linkedin: linkedin(d), tiktok: tiktok(d) };
  }

  return { REDES, generar, hashtags, aHashtag };
})();
