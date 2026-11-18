"""Arma el flujo de n8n importable a partir de la plantilla y los nodos de código.

Uso (desde la carpeta del repo):
    python louder/n8n/build_workflow.py                      -> genera un flujo nuevo
    python louder/n8n/build_workflow.py "ruta/a/tu-flujo.json" -> actualiza tu flujo exportado
                                                               (conserva credenciales, IDs y posiciones)

Vuelve a ejecutarlo cada vez que cambies louder/email-louder.html o los .js de esta carpeta,
e importa de nuevo el JSON generado en n8n.
"""
import json
import pathlib
import sys

AQUI = pathlib.Path(__file__).resolve().parent
PLANTILLA = (AQUI.parent / "email-louder.html").read_text(encoding="utf-8")
PROMPT_JS = (AQUI / "preparar-prompt.js").read_text(encoding="utf-8")
CORREO_JS = (AQUI / "construir-correo.js").read_text(encoding="utf-8")

assert "__PLANTILLA_HTML__" in CORREO_JS
CORREO_JS = CORREO_JS.replace("__PLANTILLA_HTML__", json.dumps(PLANTILLA, ensure_ascii=False))

campos = [
    {"fieldLabel": "Empresa", "placeholder": "Ej: Café Montaña", "requiredField": True},
    {"fieldLabel": "Nombre del contacto", "placeholder": "Ej: Laura Gómez", "requiredField": True},
    {"fieldLabel": "Cargo del contacto", "placeholder": "Opcional. Ej: Gerente de Marketing"},
    {"fieldLabel": "Correo del contacto", "fieldType": "email", "placeholder": "cliente@empresa.com", "requiredField": True},
    {"fieldLabel": "País", "placeholder": "Opcional. Ej: Colombia"},
    {"fieldLabel": "Sitio web", "placeholder": "Opcional. Ej: cafemontana.co"},
    {
        "fieldLabel": "Descripción del negocio",
        "fieldType": "textarea",
        "placeholder": "Qué venden, a quién, dónde y qué los hace distintos. Mientras más concreto, más personal queda el correo.",
        "requiredField": True,
    },
    {
        "fieldLabel": "Contexto de la relación",
        "fieldType": "textarea",
        "placeholder": "Opcional. Ej: Nos conocimos en el evento X; están por lanzar una nueva línea; preguntaron por campañas de marca.",
    },
    {
        "fieldLabel": "Trato",
        "fieldType": "dropdown",
        "fieldOptions": {"values": [{"option": "Tú"}, {"option": "Usted"}]},
        "requiredField": True,
    },
    {"fieldLabel": "Tu nombre (firma)", "placeholder": "Ej: Heider Narváez"},
    {"fieldLabel": "Tu cargo (firma)", "placeholder": "Opcional. Ej: Ejecutivo de cuentas"},
]

flujo = {
    "name": "Louder · Correo personalizado con IA (OpenAI, borrador en Gmail)",
    "nodes": [
        {
            "parameters": {
                "formTitle": "Correo personalizado para un prospecto · Louder",
                "formDescription": "Completa los datos de la empresa. La IA redacta el correo (asunto incluido) con la plantilla de Louder y queda como borrador en Gmail para que lo revises y lo envíes tú.",
                "formFields": {"values": campos},
                "options": {
                    "buttonLabel": "Crear borrador",
                    "respondWithOptions": {
                        "values": {
                            "formSubmittedText": "Listo. El borrador quedó en tu Gmail (carpeta Borradores). Revísalo y envíalo desde ahí."
                        }
                    },
                },
            },
            "id": "8f0c1f8e-1d2a-4c55-9a0e-6c2f3a1b0001",
            "name": "Formulario Louder",
            "type": "n8n-nodes-base.formTrigger",
            "typeVersion": 2.2,
            "position": [0, 300],
            "webhookId": "8f0c1f8e-1d2a-4c55-9a0e-6c2f3a1bf001",
        },
        {
            "parameters": {"jsCode": PROMPT_JS},
            "id": "8f0c1f8e-1d2a-4c55-9a0e-6c2f3a1b0002",
            "name": "Preparar prompt para IA",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [260, 300],
        },
        {
            "parameters": {
                "method": "POST",
                "url": "https://api.openai.com/v1/chat/completions",
                "authentication": "genericCredentialType",
                "genericAuthType": "httpHeaderAuth",
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify($json.body) }}",
                "options": {"timeout": 180000},
            },
            "id": "8f0c1f8e-1d2a-4c55-9a0e-6c2f3a1b0003",
            "name": "OpenAI redacta el correo",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [520, 300],
        },
        {
            "parameters": {"jsCode": CORREO_JS},
            "id": "8f0c1f8e-1d2a-4c55-9a0e-6c2f3a1b0004",
            "name": "Construir correo HTML",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [780, 300],
        },
        {
            "parameters": {
                "resource": "draft",
                "subject": "={{ $json.subject }}",
                "emailType": "html",
                "message": "={{ $json.html }}",
                "options": {"sendTo": "={{ $json.to }}"},
            },
            "id": "8f0c1f8e-1d2a-4c55-9a0e-6c2f3a1b0005",
            "name": "Crear borrador en Gmail",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.2,
            "position": [1040, 300],
            "webhookId": "8f0c1f8e-1d2a-4c55-9a0e-6c2f3a1bf005",
        },
    ],
    "connections": {
        "Formulario Louder": {"main": [[{"node": "Preparar prompt para IA", "type": "main", "index": 0}]]},
        "Preparar prompt para IA": {"main": [[{"node": "OpenAI redacta el correo", "type": "main", "index": 0}]]},
        "OpenAI redacta el correo": {"main": [[{"node": "Construir correo HTML", "type": "main", "index": 0}]]},
        "Construir correo HTML": {"main": [[{"node": "Crear borrador en Gmail", "type": "main", "index": 0}]]},
    },
    "pinData": {},
    "active": False,
    "settings": {"executionOrder": "v1"},
    "tags": [],
}

if len(sys.argv) > 1:
    # Actualizar un flujo exportado de n8n: solo cambia el código y los campos del formulario.
    origen = pathlib.Path(sys.argv[1])
    existente = json.loads(origen.read_text(encoding="utf-8"))
    nuevos = {n["name"]: n for n in flujo["nodes"]}
    cambiados = []
    for nodo in existente["nodes"]:
        if nodo["name"] in ("Preparar prompt para IA", "Construir correo HTML"):
            nodo["parameters"]["jsCode"] = nuevos[nodo["name"]]["parameters"]["jsCode"]
            cambiados.append(nodo["name"])
        elif nodo["type"] == "n8n-nodes-base.formTrigger":
            nodo["parameters"]["formFields"] = nuevos["Formulario Louder"]["parameters"]["formFields"]
            cambiados.append(nodo["name"])
    faltan = {"Preparar prompt para IA", "Construir correo HTML"} - set(cambiados)
    if faltan:
        sys.exit("No encontré estos nodos en tu flujo: " + ", ".join(sorted(faltan)))
    salida = AQUI / (origen.stem + " (actualizado).json")
    salida.write_text(json.dumps(existente, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Nodos actualizados:", ", ".join(cambiados))
    print("Flujo actualizado:", salida)
else:
    salida = AQUI / "Louder-correo-personalizado-IA.json"
    salida.write_text(json.dumps(flujo, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Flujo generado:", salida)
