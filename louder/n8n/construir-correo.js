// ====== Nodo "Construir correo HTML" (n8n Code node) ======
// Lee los textos que redactó Claude y los pone dentro de la plantilla de Louder.

// ---- CONFIGURACIÓN (edita aquí) ----
const CTA_URL     = 'https://louder.fm/';   // destino de los botones: WhatsApp, Calendly o formulario
const FIRMA_EQUIPO = 'Equipo Louder';       // se usa si el formulario no trae nombre de quien firma
// ------------------------------------

const PLANTILLA = __PLANTILLA_HTML__;

const prep = $('Preparar prompt para Claude').first().json;
const form = $('Formulario Louder').first().json;
const r = $input.first().json;

// 1) Validar la respuesta de la API
if (r.stop_reason === 'refusal') {
  throw new Error('Claude no redactó el correo (refusal): ' + JSON.stringify(r.stop_details || {}));
}
if (r.stop_reason === 'max_tokens') {
  throw new Error('La respuesta de Claude se cortó por max_tokens; vuelve a enviar el formulario.');
}
const bloque = (r.content || []).find(b => b.type === 'text');
if (!bloque) throw new Error('La respuesta de Claude no trae texto: ' + JSON.stringify(r).slice(0, 500));
const t = JSON.parse(bloque.text);

// 2) Utilidades
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const parrafos = s => esc(s).trim().replace(/\r?\n\s*\r?\n/g, '<br><br>').replace(/\r?\n/g, '<br>');

const chip = c => `<span style="display:inline-block; margin:0 6px 8px 0; padding:4px 14px; border-radius:20px; background-color:#ffffff; border:1px solid #E3D4EE; font-family:'Rubik', Arial, sans-serif; font-size:13px; line-height:22px; color:#9B3F80; font-weight:500;">${esc(c)}</span>`;
const categorias = (t.categorias_podcast || []).slice(0, 3).map(chip).join(' ');

const remitente = String(form['Tu nombre (firma)'] ?? '').trim();
const cargoRem  = String(form['Tu cargo (firma)'] ?? '').trim();
const firma = remitente
  ? `<strong style="color:#1B2B4B;">${esc(remitente)}</strong><br><span style="color:#8A8EA0;">${esc(cargoRem ? cargoRem + ' · Louder' : 'Louder')}</span>`
  : `<strong style="color:#1B2B4B;">${esc(FIRMA_EQUIPO)}</strong>`;

// 3) Rellenar la plantilla
const valores = {
  ASUNTO:           esc(t.asunto),
  PREHEADER:        esc(t.preheader),
  HERO_TITULO:      esc(t.hero_titulo),
  HERO_SUBTITULO:   esc(t.hero_subtitulo),
  SALUDO:           esc(t.saludo),
  INTRO:            parrafos(t.intro),
  NEGOCIO_TITULO:   esc(t.negocio_titulo),
  NEGOCIO_TEXTO:    parrafos(t.negocio_texto),
  PROPUESTA_TITULO: esc(t.propuesta_titulo),
  PROPUESTA_TEXTO:  parrafos(t.propuesta_texto),
  CATEGORIAS:       categorias,
  CTA_TEXTO:        esc(t.cta_texto),
  CTA_URL:          esc(CTA_URL),
  CIERRE_TITULO:    esc(t.cierre_titulo),
  CIERRE_TEXTO:     parrafos(t.cierre_texto),
  FIRMA:            firma,
  EMPRESA:          esc(prep.datos.empresa),
};

const html = PLANTILLA.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in valores ? valores[k] : m));
const faltan = html.match(/\{\{[A-Z_]+\}\}/g);
if (faltan) throw new Error('Variables sin rellenar en la plantilla: ' + faltan.join(', '));

return [{
  json: {
    to: prep.correo,
    subject: String(t.asunto).trim(),
    html,
    textos: t,
    modelo: r.model,
  },
}];
