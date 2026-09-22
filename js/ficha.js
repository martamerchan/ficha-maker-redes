/*
 * ============================================================
 *  Ficha Maker · Generación de la ficha visual del proyecto
 * ============================================================
 *  A partir de los datos del formulario genera el HTML de la ficha.
 *  Los estilos de la ficha están en este archivo (FICHA_CSS) para
 *  poder usarlos tanto en la vista previa como en el archivo HTML
 *  exportado, que así funciona solo, sin depender de nada más.
 * ============================================================
 */
window.Ficha = (function () {
  'use strict';

  // Máquinas disponibles: identificador → nombre visible
  const MAQUINAS = {
    impresion3d: 'Impresión 3D',
    laser: 'Corte láser',
    cnc: 'Fresadora CNC',
    electronica: 'Electrónica',
    vinilo: 'Plóter de vinilo',
    bordado: 'Bordadora digital',
    escaner: 'Escáner 3D',
    termoformado: 'Termoformado'
  };

  const DIFICULTAD = { basica: 'Básica', media: 'Media', avanzada: 'Avanzada' };

  /* Estilos de la ficha. Todas las clases empiezan por "fm-" para no
     mezclarse con los estilos de la página. */
  const FICHA_CSS = `
.fm-ficha{--fm-verde:#166534;--fm-tinta:#1d1d1b;--fm-suave:#5b5a55;--fm-linea:#dcd9cf;--fm-papel:#fffdf7;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--fm-tinta);background:var(--fm-papel);
  max-width:820px;margin:0 auto;border:1px solid var(--fm-linea);border-radius:18px;overflow:hidden;line-height:1.5}
.fm-cabecera{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 22px;background:var(--fm-verde);color:#fff;
  font:600 12px/1.2 ui-monospace,"Cascadia Mono",Consolas,monospace;letter-spacing:.08em;text-transform:uppercase}
.fm-cuerpo{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:0}
.fm-foto{background:#e9e6dc;min-height:260px;display:flex;align-items:center;justify-content:center}
.fm-foto img{width:100%;height:100%;object-fit:cover;display:block;aspect-ratio:4/3}
.fm-foto span{font:500 13px ui-monospace,Consolas,monospace;color:var(--fm-suave)}
.fm-texto{padding:22px 24px}
.fm-titulo{margin:0 0 6px;font-size:28px;line-height:1.15;letter-spacing:-.01em}
.fm-resumen{margin:0 0 14px;color:var(--fm-suave);font-size:15px}
.fm-autores{margin:0;font-size:14px}
.fm-autores strong{display:block;font:600 11px ui-monospace,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--fm-verde);margin-bottom:2px}
.fm-desc{padding:18px 24px;font-size:15px;white-space:pre-line}
.fm-maquinas{display:flex;flex-wrap:wrap;gap:6px;padding:0 24px 18px;margin:0;list-style:none}
.fm-maquinas li{padding:4px 10px;border:1.5px solid var(--fm-verde);border-radius:99px;color:var(--fm-verde);font-size:13px;font-weight:600}
.fm-datos{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:0;border-top:1px solid var(--fm-linea)}
.fm-datos div{padding:12px 24px;border-bottom:1px solid var(--fm-linea)}
.fm-datos dt{font:600 11px ui-monospace,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--fm-suave)}
.fm-datos dd{margin:2px 0 0;font-size:15px;font-weight:600}
.fm-pie{display:flex;gap:18px;align-items:center;justify-content:space-between;padding:16px 24px;flex-wrap:wrap}
.fm-enlaces{margin:0;padding:0;list-style:none;font-size:14px}
.fm-enlaces li{margin:3px 0;overflow-wrap:anywhere}
.fm-enlaces a{color:var(--fm-verde)}
.fm-qr{display:flex;align-items:center;gap:10px;font:500 11px ui-monospace,Consolas,monospace;color:var(--fm-suave);max-width:220px}
.fm-qr svg,.fm-qr img{width:96px;height:96px;flex-shrink:0}
@media (max-width:640px){.fm-cuerpo{grid-template-columns:1fr}.fm-titulo{font-size:24px}}
@media print{.fm-ficha{border:1px solid #999;box-shadow:none;max-width:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

  /** Escapa texto para insertarlo en HTML. */
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Solo se enlazan direcciones http/https (evita enlaces maliciosos). */
  function urlSegura(u) {
    return /^https?:\/\/\S+$/i.test(String(u || '').trim()) ? String(u).trim() : '';
  }

  /** Lista de máquinas con su nombre visible (incluida "otra", si la hay). */
  function nombresMaquinas(d) {
    const lista = (d.maquinas || []).map((m) => MAQUINAS[m]).filter(Boolean);
    if (d.otraMaquina && d.otraMaquina.trim()) lista.push(d.otraMaquina.trim());
    return lista;
  }

  /** "3 h 30 min", "45 min"… */
  function textoTiempo(t) {
    const h = parseInt(t && t.horas, 10) || 0;
    const m = parseInt(t && t.minutos, 10) || 0;
    if (!h && !m) return '';
    return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
  }

  /** Fecha "2026-05-14" → "14 de mayo de 2026". */
  function textoFecha(f) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f || '')) return '';
    const [a, m, d] = f.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /** Código QR en SVG con la librería qrcode-generator (si está disponible). */
  function qrSvg(url) {
    if (!url || typeof window.qrcode !== 'function') return '';
    const qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true });
  }

  /** Devuelve el HTML de la ficha a partir de los datos. */
  function html(d) {
    const maquinas = nombresMaquinas(d);
    const autores = (d.autores || []).filter(Boolean);
    const docu = urlSegura(d.enlaces && d.enlaces.documentacion);
    const archivos = urlSegura(d.enlaces && d.enlaces.archivos);
    const video = urlSegura(d.enlaces && d.enlaces.video);

    const datos = [
      ['Materiales', (d.materiales || []).join(', ')],
      ['Tiempo de fabricación', textoTiempo(d.tiempo)],
      ['Dificultad', DIFICULTAD[d.dificultad] || ''],
      ['Fecha', textoFecha(d.fecha)],
      ['Licencia del diseño', d.licencia && d.licencia !== 'Sin especificar' ? d.licencia : '']
    ].filter(([, v]) => v);

    const enlaces = [
      docu && `<li>Documentación: <a href="${esc(docu)}">${esc(docu)}</a></li>`,
      archivos && `<li>Archivos de diseño: <a href="${esc(archivos)}">${esc(archivos)}</a></li>`,
      video && `<li>Vídeo: <a href="${esc(video)}">${esc(video)}</a></li>`
    ].filter(Boolean);

    const urlQr = docu || archivos || video;
    const qr = qrSvg(urlQr);

    return `
<article class="fm-ficha">
  <div class="fm-cabecera"><span>Ficha de proyecto</span><span>${esc(d.fablab || 'FabLab')}</span></div>
  <div class="fm-cuerpo">
    <div class="fm-foto">${d.foto ? `<img src="${esc(d.foto)}" alt="${esc(d.altFoto || d.titulo || 'Foto del proyecto')}">` : '<span>Sin foto</span>'}</div>
    <div class="fm-texto">
      <h2 class="fm-titulo">${esc(d.titulo || 'Título del proyecto')}</h2>
      ${d.resumen ? `<p class="fm-resumen">${esc(d.resumen)}</p>` : ''}
      ${autores.length ? `<p class="fm-autores"><strong>Autoría</strong>${esc(autores.join(', '))}</p>` : ''}
    </div>
  </div>
  ${d.descripcion ? `<div class="fm-desc">${esc(d.descripcion)}</div>` : ''}
  ${maquinas.length ? `<ul class="fm-maquinas" aria-label="Máquinas utilizadas">${maquinas.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
  ${datos.length ? `<dl class="fm-datos">${datos.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
  ${enlaces.length || qr ? `<div class="fm-pie">
    <ul class="fm-enlaces">${enlaces.join('')}</ul>
    ${qr ? `<div class="fm-qr">${qr}<span>Escanea para ver ${docu ? 'la documentación' : archivos ? 'los archivos' : 'el vídeo'}</span></div>` : ''}
  </div>` : ''}
</article>`;
  }

  /** Documento HTML completo e independiente con la ficha (para exportar). */
  function documento(d) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.titulo || 'Ficha de proyecto')}</title>
<style>body{margin:0;padding:24px 16px;background:#f1efe8}${FICHA_CSS}</style>
</head>
<body>
${html(d)}
</body>
</html>`;
  }

  return { MAQUINAS, DIFICULTAD, FICHA_CSS, html, documento, nombresMaquinas, textoTiempo, urlSegura };
})();
