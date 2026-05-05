# Automatización de carga de resúmenes con Make

Este documento explica cómo configurar Make para cargar automáticamente los resúmenes de Ualá desde Gmail.

## Requisitos previos

- Cuenta de Make (make.com)
- Acceso a tu cuenta de Gmail
- API key de Ualá Tracker (generada desde Settings)

## Paso 0: Generar API key

1. Ingresá a Ualá Tracker
2. Andá a **Settings** en el sidebar
3. En la sección "Create API Key", ingresá un nombre (ej: "Make.com automation")
4. Hacé clic en **Create**
5. **Copiá la API key inmediatamente** — no se mostrará de nuevo
6. Guardala en un lugar seguro (ej: 1Password, Bitwarden)

---

## Escenario 1: Ingesta automática de resúmenes

### Paso 1: Crear nuevo escenario

1. En Make, creá un nuevo escenario
2. Nombre: "Ualá - Ingesta automática de resúmenes"

### Paso 2: Gmail - Watch Emails

1. Agregá el módulo **Gmail → Watch Emails**
2. Conectá tu cuenta de Gmail
3. Configuración:
   - **Folder**: `INBOX`
   - **Filter type**: `Gmail filter`
   - **Query**: `subject:"Resumen tarjeta de crédito" has:attachment`
   - **Maximum number of results**: `1`

### Paso 3: Flow Control - Iterator

Dado que un email puede tener múltiples adjuntos, Make requiere iterarlos para extraer la data binaria.

1. Agregá el módulo **Tools → Iterator** (Flow Control)
2. Configuración:
   - **Array**: `{{1.attachments[]}}` (mapealo desde el paso de Gmail)

### Paso 4: HTTP - Ingestar PDF

1. Agregá el módulo **HTTP → Make a Request**
2. Configuración:
   - **URL**: `https://tu-app.vercel.app/api/ingest` (reemplazá con tu URL de Vercel)
   - **Method**: `POST`
   - **Headers**:
     - `X-API-Key`: `uala_tu_api_key_aqui` (pegá tu API key generada en el Paso 0)
   - **Body type**: `Multipart/form-data`
   - **Fields**:
     - **Key**: `file`
     - **Type**: `File`
     - **File name**: `{{2.fileName}}` (viene del Iterator)
     - **Data**: `{{2.data}}` (viene del Iterator)

### Paso 5: Notificación (opcional)

1. Agregá el módulo **Gmail → Send an Email** o **Slack → Create a Message**
2. Configuración:
   - **Subject/Message**: `✅ Resumen {{3.data.period}} cargado - {{3.data.transactions}} transacciones`

### Paso 6: Activar el escenario

1. Guardá el escenario
2. **NO lo actives todavía** — esperá a que llegue el próximo resumen para probarlo
3. Cuando llegue, activalo y verificá que funcione

---

## Escenario 2: Keep-alive (evitar pausa de Supabase)

Supabase Free Plan pausa los proyectos después de 7 días de inactividad. Este escenario hace un ping cada 4 días para mantenerlo activo.

### Paso 1: Crear nuevo escenario

1. En Make, creá un nuevo escenario
2. Nombre: "Ualá - Keep-alive"

### Paso 2: Schedule

1. Agregá el módulo **Tools → Schedule**
2. Configuración:
   - **Interval**: `4 days`
   - **Start time**: Cualquier hora

### Paso 3: HTTP - Ping

1. Agregá el módulo **HTTP → Make a Request**
2. Configuración:
   - **URL**: `https://tu-app.vercel.app/api/extract` (reemplazá con tu URL de Vercel)
   - **Method**: `GET`

### Paso 4: Activar

1. Guardá y activá el escenario

---

## Troubleshooting

### Error 401: Invalid API key

- Verificá que hayas copiado la API key completa (empieza con `uala_`)
- Verificá que la key no haya sido revocada (chequeá en Settings)
- Si perdiste la key, generá una nueva desde Settings

### Error 422: Not a Ualá statement

- El PDF adjunto no es un resumen de Ualá
- Verificá el filtro de Gmail (debe buscar emails con el asunto exacto)

### Error 502: Failed to save statement

- Problema con Supabase (puede estar pausado)
- Verificá que el proyecto de Supabase esté activo

### El escenario no se dispara

- Verificá que el filtro de Gmail sea correcto
- Probá manualmente con "Run once" en Make

---

## Seguridad

- **Nunca compartas tu API key** — es como una contraseña
- Si creés que tu key fue comprometida, revocala inmediatamente desde Settings y generá una nueva
- Podés tener múltiples API keys activas (ej: una para Make, otra para scripts locales)
- Las keys revocadas dejan de funcionar inmediatamente
