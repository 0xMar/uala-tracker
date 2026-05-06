# Automatización de carga de resúmenes con n8n

Este documento explica cómo configurar n8n para cargar automáticamente los resúmenes de Ualá desde Gmail.

## Requisitos previos

- Instancia de n8n (self-hosted o n8n Cloud)
- Acceso a tu cuenta de Gmail
- API key de Ualá Tracker (generada desde Settings)

## Paso 0: Generar API key

1. Ingresá a Ualá Tracker
2. Andá a **Settings** en el sidebar
3. En la sección "Create API Key", ingresá un nombre (ej: "n8n automation")
4. Hacé clic en **Create**
5. **Copiá la API key inmediatamente** — no se mostrará de nuevo
6. Guardala en un lugar seguro (ej: 1Password, Bitwarden)

---

## Workflow 1: Ingesta automática de resúmenes

### Paso 1: Crear nuevo workflow

1. En n8n, creá un nuevo workflow
2. Nombre: "Ualá - Ingesta automática de resúmenes"

### Paso 2: Gmail Trigger

1. Agregá el nodo **Gmail Trigger**
2. Conectá tu cuenta de Gmail con OAuth2
3. Configuración:
   - **Poll Times** → **Mode**: `Custom`
   - **Poll Times** → **Cron Expression**: `0 8-20 1-10 * *` _(corre cada hora entre las 8:00 y las 20:00, del día 1 al 10 de cada mes)_
   - **Simplify**: desactivado
4. Filtros:
   - **Search**: `subject:"Resumen tarjeta de crédito" has:attachment`
   - **Read Status**: `Unread emails only` (default)

### Paso 3: Gmail - Get Message

El trigger devuelve metadata pero no los adjuntos. Necesitás obtener el mensaje completo.

1. Agregá el nodo **Gmail**
2. Configuración:
   - **Operation**: `Get`
   - **Message ID**: `{{ $json.id }}` (viene del trigger)
   - **Simplify**: desactivado _(necesario para recibir los adjuntos como binarios)_

### Paso 4: Code — Extraer adjunto PDF

Los adjuntos en n8n se almacenan en el campo `binary` del item, no en `json`. Este nodo extrae el PDF.

1. Agregá el nodo **Code**
2. Modo: `Run Once for All Items`
3. Código:

```javascript
const binary = $input.first().binary ?? {};

const pdfKey = Object.keys(binary).find(
  key => binary[key].mimeType === 'application/pdf'
);

if (!pdfKey) throw new Error('No PDF attachment found');

return [{
  json: { fileName: binary[pdfKey].fileName },
  binary: { file: binary[pdfKey] }
}];
```

### Paso 5: HTTP Request — Enviar a /api/ingest

1. Agregá el nodo **HTTP Request**
2. Configuración:
   - **Method**: `POST`
   - **URL**: `https://tu-app.vercel.app/api/ingest`
   - **Authentication**: `Generic Credential Type`
   - **Generic Auth Type**: `Header Auth`
   - **Credential for Header Auth**: creá una nueva credencial con:
     - **Name**: `X-API-Key`
     - **Value**: `uala_tu_api_key_aqui`
   - **Body Content Type**: `Form-Data`
   - **Body Parameters** → **Add Parameter**:
     - **Parameter Type**: `n8n Binary File`
     - **Name**: `file`
     - **Input Data Field Name**: `file`

### Paso 6: Gmail — Mark as Read

Marcá el email como leído para que el trigger no lo vuelva a procesar en las próximas ejecuciones del cron.

1. Agregá el nodo **Gmail**
2. Configuración:
   - **Operation**: `Mark as Read`
   - **Message ID**: `{{ $('Gmail Trigger').item.json.id }}`

### Paso 7: Notificación (opcional)

Agregá un nodo **Gmail** o **Slack** para notificar el resultado:

- **Gmail → Send**:
  - **Subject**: `✅ Resumen {{ $json.period }} cargado`
  - **Message**: `{{ $json.transactions }} transacciones importadas`

### Paso 8: Activar el workflow

1. Guardá el workflow
2. Activalo con el toggle en la esquina superior derecha
3. Probalo con **Test Workflow** cuando llegue el próximo resumen

---

## Workflow 2: Keep-alive (evitar pausa de Supabase)

Supabase Free Plan pausa los proyectos después de 7 días de inactividad. Este workflow hace un ping cada 4 días para mantenerlo activo.

### Paso 1: Crear nuevo workflow

1. En n8n, creá un nuevo workflow
2. Nombre: "Ualá - Keep-alive"

### Paso 2: Schedule Trigger

1. Agregá el nodo **Schedule Trigger**
2. Configuración:
   - **Trigger Interval**: `Days`
   - **Days Between Triggers**: `4`

### Paso 3: HTTP Request — Ping

1. Agregá el nodo **HTTP Request**
2. Configuración:
   - **Method**: `GET`
   - **URL**: `https://tu-app.vercel.app`

### Paso 4: Activar

1. Guardá y activá el workflow

---

## Troubleshooting

### Error 401: Invalid API key

- Verificá que hayas copiado la API key completa (empieza con `uala_`)
- Verificá que la key no haya sido revocada (chequeá en Settings)
- Si perdiste la key, generá una nueva desde Settings

### Error 422: Not a Ualá statement

- El PDF adjunto no es un resumen de Ualá
- Verificá el filtro del Gmail Trigger (asunto exacto)

### Error 502: Failed to save statement

- Problema con Supabase (puede estar pausado)
- Verificá que el proyecto de Supabase esté activo

### El workflow no se dispara

- Verificá que el Gmail Trigger esté activo y conectado
- Probá manualmente con **Test Workflow** en n8n

---

## Seguridad

- **Nunca compartas tu API key** — es como una contraseña
- Si creés que tu key fue comprometida, revocala inmediatamente desde Settings y generá una nueva
- Podés tener múltiples API keys activas (ej: una para n8n, otra para Make.com)
- Las keys revocadas dejan de funcionar inmediatamente
