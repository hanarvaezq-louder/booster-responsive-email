// ====== Nodo "Preparar prompt para Claude" (n8n Code node) ======
// Toma los datos del formulario y arma la petición a la API de Claude.
// La respuesta llega como JSON con todos los textos del correo (asunto incluido).

const MODELO = 'claude-opus-5-5';

const d = $input.first().json;
const campo = k => String(d[k] ?? '').trim();

const datos = {
  empresa:      campo('Empresa'),
  contacto:     campo('Nombre del contacto'),
  cargo:        campo('Cargo del contacto'),
  pais:         campo('País'),
  sitio:        campo('Sitio web'),
  descripcion:  campo('Descripción del negocio'),
  contexto:     campo('Contexto de la relación'),
  trato:        campo('Trato') || 'Tú',
  remitente:    campo('Tu nombre (firma)'),
};

const system = `Eres parte del equipo comercial de Louder (louder.fm), una red de publicidad en podcast en Latinoamérica.
Redactas los textos de un correo que una persona del equipo revisará en Gmail y enviará ella misma a un prospecto, uno a uno. No es una campaña masiva: debe leerse como un correo escrito a mano para esa empresa, con el diseño de marca de Louder alrededor.

Lo que Louder ofrece (usa solo estos datos, no inventes otros sobre Louder):
- Red de más de 5k shows y más de 40 millones de usuarios únicos en Latinoamérica.
- Anuncios de audio dentro de podcasts, que la audiencia escucha completos y con atención.
- Second screen: reimpactar en digital a quien escuchó el 100% del anuncio, para llevarlo al sitio web o a la tienda física.
- Un equipo que acompaña desde la producción del anuncio hasta la medición de resultados (ROAS).
- Sirve en todo el embudo: construcción de marca, consideración, conversiones online y visitas a tienda física.

Cómo escribir:
- Habla de lo que hace la empresa y de su cliente; conecta eso con una o dos ideas concretas de cómo el audio en podcast le sirve. Que se note que leíste la descripción.
- Usa solo los datos del formulario sobre la empresa. No inventes cifras, clientes, premios ni resultados, y no prometas resultados.
- Tono cercano y profesional, en español latinoamericano neutro. Respeta el trato indicado (tú o usted) en todos los campos.
- Si hay contexto de la relación (cómo se conocieron, una conversación previa), menciónalo de forma natural en la introducción.
- Nada que suene a newsletter o a spam: sin emojis, sin MAYÚSCULAS sostenidas, sin signos de exclamación repetidos, y sin palabras como gratis, oferta, promoción, urgente, garantizado, "última oportunidad", "no te lo pierdas" o "100%" (salvo en "100% del anuncio").
- El asunto parece escrito por una persona a otra: entre 3 y 8 palabras, en minúsculas normales (solo mayúscula inicial y nombres propios), sin clickbait. Puede mencionar a la empresa o una idea concreta de su negocio.
- Frases cortas. Cada texto cabe en el espacio que indica la descripción del campo.`;

const user = `Datos del formulario:
- Empresa: ${datos.empresa}
- Nombre del contacto: ${datos.contacto}
- Cargo del contacto: ${datos.cargo || '(no indicado)'}
- País: ${datos.pais || '(no indicado)'}
- Sitio web: ${datos.sitio || '(no indicado)'}
- Trato: ${datos.trato}
- Descripción del negocio: ${datos.descripcion}
- Contexto de la relación: ${datos.contexto || '(ninguno: es un primer contacto)'}
- Quién firma: ${datos.remitente || 'el equipo de Louder'}

Redacta los textos del correo.`;

const texto = d => ({ type: 'string', description: d });

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['asunto', 'preheader', 'hero_titulo', 'hero_subtitulo', 'saludo', 'intro',
             'negocio_titulo', 'negocio_texto', 'propuesta_titulo', 'propuesta_texto',
             'categorias_podcast', 'cta_texto', 'cierre_titulo', 'cierre_texto'],
  properties: {
    asunto:            texto('Asunto del correo. 3 a 8 palabras, como lo escribiría una persona.'),
    preheader:         texto('Texto de vista previa en la bandeja de entrada. Una frase de máximo 90 caracteres que complemente el asunto.'),
    hero_titulo:       texto('Titular grande del encabezado, sobre fondo morado. Máximo 9 palabras, sobre la marca o el negocio del cliente y el audio.'),
    hero_subtitulo:    texto('Subtítulo bajo el titular. Una frase de máximo 22 palabras.'),
    saludo:            texto('Saludo inicial con el nombre de pila del contacto, terminado en dos puntos. Ejemplo: "Hola, Laura:".'),
    intro:             texto('Primer párrafo del correo, 2 o 3 frases (máximo 60 palabras): por qué le escribes a esta empresa en particular.'),
    negocio_titulo:    texto('Título de la columna sobre el negocio del cliente. Máximo 6 palabras.'),
    negocio_texto:     texto('Lo que entendiste del negocio y de su cliente ideal, en tus palabras, y la oportunidad que ves en audio. Máximo 55 palabras.'),
    propuesta_titulo:  texto('Título de la columna con la propuesta. Máximo 6 palabras.'),
    propuesta_texto:   texto('Cómo usaría Louder los podcasts para esta empresa: en qué tipo de shows, con qué objetivo del embudo y cómo se mediría. Máximo 55 palabras.'),
    categorias_podcast: {
      type: 'array',
      description: 'Exactamente 3 categorías de podcast donde encajaría la marca, de 1 a 3 palabras cada una.',
      items: { type: 'string' },
    },
    cta_texto:         texto('Texto del botón principal. 2 a 5 palabras, sin signos de exclamación.'),
    cierre_titulo:     texto('Título del párrafo de cierre. Máximo 8 palabras.'),
    cierre_texto:      texto('Párrafo de cierre con un siguiente paso concreto y sin presión (por ejemplo, una llamada corta o responder el correo). Máximo 50 palabras. Sin despedida ni firma.'),
  },
};

const body = {
  model: MODELO,
  max_tokens: 16000,
  output_config: {
    effort: 'medium',
    format: { type: 'json_schema', schema },
  },
  // Si un filtro de seguridad rechazara la petición, la API la reintenta en otro modelo.
  fallbacks: 'default',
  system,
  messages: [{ role: 'user', content: user }],
};

return [{ json: { body, datos, correo: campo('Correo del contacto') } }];
