// ====== Nodo "Construir correo HTML" (n8n Code node) ======
// Lee los textos que redactó la IA y los pone dentro de la plantilla de Louder.

// ---- CONFIGURACIÓN (edita aquí) ----
const CTA_URL     = 'https://louder.fm/';   // destino de los botones: WhatsApp, Calendly o formulario
const FIRMA_EQUIPO = 'Equipo Louder';       // se usa si el formulario no trae nombre de quien firma
// ------------------------------------

const PLANTILLA = __PLANTILLA_HTML__;

const prep = $('Preparar prompt para IA').first().json;
const form = $('Formulario Louder').first().json;
const r = $input.first().json;

// 1) Validar la respuesta de OpenAI
if (r.error) throw new Error('Error de OpenAI: ' + JSON.stringify(r.error));
const choice = (r.choices || [])[0];
if (!choice) throw new Error('La respuesta de OpenAI no trae choices: ' + JSON.stringify(r).slice(0, 500));
if (choice.message?.refusal) throw new Error('La IA no redactó el correo: ' + choice.message.refusal);
if (choice.finish_reason === 'length') throw new Error('La respuesta se cortó por longitud; vuelve a enviar el formulario.');
let t;
try { t = JSON.parse(choice.message.content); }
catch (e) { throw new Error('La IA no devolvió JSON válido: ' + choice.message.content); }

// 2) Utilidades
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const parrafos = s => esc(s).trim().replace(/\r?\n\s*\r?\n/g, '<br><br>').replace(/\r?\n/g, '<br>');

const chip = c => `<span style="display:inline-block; margin:0 6px 8px 0; padding:4px 14px; border-radius:20px; background-color:#ffffff; border:1px solid #E3D4EE; font-family:'Rubik', Arial, sans-serif; font-size:13px; line-height:22px; color:#9B3F80; font-weight:500;">${esc(c)}</span>`;
const sugeridos = (t.categorias_podcast || []).slice(0, 3);
const categorias = sugeridos.map(chip).join(' ');

// Todos los géneros de la red; los sugeridos para esta empresa van resaltados
const generoChip = g => sugeridos.includes(g)
  ? `<span style="display:inline-block; margin:0 3px 8px 3px; padding:3px 12px; border-radius:20px; background-color:#FF0080; border:1px solid #FF0080; font-family:'Rubik', Arial, sans-serif; font-size:12px; line-height:20px; color:#ffffff; font-weight:500;">${esc(g)}</span>`
  : `<span style="display:inline-block; margin:0 3px 8px 3px; padding:3px 12px; border-radius:20px; border:1px solid #3E4D73; font-family:'Rubik', Arial, sans-serif; font-size:12px; line-height:20px; color:#C9D0E6;">${esc(g)}</span>`;
const generos = prep.generos.map(generoChip).join(' ');

// Historias de éxito (la más parecida al cliente va primero)
const IMG = 'https://raw.githubusercontent.com/hanarvaezq-louder/booster-responsive-email/main/louder/images/louder/';
let casos = [
  { id: 'Chokis',         nombre: 'Chokis Latam',                 img: 'caso-chokis.png',         texto: '+35% de preferencia de marca en 5 países.' },
  { id: 'Banco Nacional', nombre: 'Banco Nacional de Costa Rica', img: 'caso-banco-nacional.png', texto: 'El LTR pasó de 89% a 97% con creatividades en formato testimonial.' },
  { id: 'HSBC',           nombre: 'HSBC México',                  img: 'caso-hsbc.png',           texto: 'Su podcast llegó al top 3 de descargas de su categoría.' },
  { id: 'Cinépolis',      nombre: 'Cinépolis',                    img: 'caso-cinepolis.png',      texto: 'Acompañamos el lanzamiento de sus películas en México.' },
];
casos.sort((a, b) => (b.id === t.caso_relevante) - (a.id === t.caso_relevante));
const tarjeta = (c, lado) => `
<table width="285" border="0" cellpadding="0" cellspacing="0" align="${lado}" class="half" style="border-collapse:separate; margin-bottom:16px;">
	<tr><td style="border:1px solid #ECE6F2; border-radius:14px; background-color:#ffffff;">
		<table width="100%" border="0" cellpadding="0" cellspacing="0">
			<tr><td style="text-align:center; padding:8px 8px 0 8px;"><img src="${IMG}${c.img}" width="200" alt="${esc(c.nombre)}" border="0" style="width:200px; height:auto; margin:0 auto;"></td></tr>
			<tr><td class="rubik" style="padding:4px 18px 0 18px; text-align:center; font-family:'Rubik', Arial, sans-serif; font-size:15px; line-height:21px; color:#2D2D2D; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${esc(c.nombre)}</td></tr>
			<tr><td style="padding:6px 18px 20px 18px; text-align:center; font-family:'Roboto', Arial, sans-serif; font-size:13px; line-height:20px; color:#6B6F80;">${esc(c.texto)}</td></tr>
		</table>
	</td></tr>
</table>`;
const fila = (a, b) => `<table width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td>${tarjeta(a, 'left')}${tarjeta(b, 'right')}</td></tr></table>`;
const casosHtml = fila(casos[0], casos[1]) + fila(casos[2], casos[3]);

// Firma como en un correo normal
const remitente = String(form['Tu nombre (firma)'] ?? '').trim();
const cargoRem  = String(form['Tu cargo (firma)'] ?? '').trim();
const firma = 'Saludos,<br><br>' + (remitente
  ? `<strong>${esc(remitente)}</strong><br><span style="color:#777777;">${esc(cargoRem ? cargoRem + ' · Louder' : 'Louder')}</span>`
  : `<strong>${esc(FIRMA_EQUIPO)}</strong>`);

// 3) Rellenar la plantilla
const valores = {
  ASUNTO:           esc(t.asunto),
  PREHEADER:        esc(t.preheader),
  HERO_TITULO:      esc(t.hero_titulo),
  HERO_SUBTITULO:   esc(t.hero_subtitulo),
  SALUDO:           esc(t.saludo),
  INTRO:            parrafos(t.intro),
  PUENTE:           esc(t.puente),
  CASOS:            casosHtml,
  GENEROS:          generos,
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
