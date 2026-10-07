# Leads desde un aliado (API externa)

Cómo un portal aliado —Zonario, por ejemplo— entrega sus leads a Las Galias.
El lead se guarda en Strapi como cualquier otro y, si la integración lo tiene
encendido, se envía a Sinco con el mismo mecanismo que los del sitio (envío
inmediato, reintentos por cron, alerta si se queda sin proyecto).

## Configurar un aliado

En el admin, **Integración de leads → Crear**. Solo el Super Admin debe tener
permiso sobre este tipo: guarda las claves.

Al guardar, el panel de la derecha muestra la URL real y los botones para
compartirla: **Copiar instrucciones** (URL, clave, campos con sus validaciones,
las respuestas y un ejemplo, listo para pegar en un correo al aliado),
**Copiar prompt para IA** (el mismo contrato redactado para que el aliado lo
pegue en su asistente de código, también con la clave), **Copiar URL** / **Copiar
clave** y **Generar clave nueva**. Debajo están las cifras: leads de hoy, 7 y
30 días, en qué estado quedaron en Sinco, y las peticiones aceptadas y
rechazadas (con el motivo) de los últimos 7 días.

| Campo                         | Qué hace                                                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre / Slug                 | El slug es el final de la URL: `/api/leads/external/<slug>`.                                                                           |
| Encendida                     | Apagada responde `403` y no guarda nada. Nace apagada.                                                                                 |
| Clave (API key)               | Se genera al guardar y no se escribe a mano. Para rotarla: «Generar clave nueva» en el panel; la anterior deja de servir de inmediato. |
| Orígenes permitidos           | Solo para peticiones desde un navegador (traen `Origin`). Vacío las rechaza todas. Un servidor no envía `Origin`.                      |
| IP permitidas                 | Direcciones exactas, una por línea. Vacío acepta cualquier IP que traiga la clave.                                                     |
| Máximo por minuto / por día   | Por encima responde `429` con `Retry-After`.                                                                                           |
| Enviar a Sinco                | Apagado, los leads quedan solo en Strapi (`skipped`). Al encenderlo y guardar, los que estaban en espera se envían.                    |
| Proyecto de Sinco por defecto | A dónde van los leads que no nombran un proyecto del sitio. Vacío usa el de su formulario o el general de «Configuración · CRM».       |

A qué proyecto de Sinco llega cada lead, en orden: el proyecto del sitio que
nombra el lead → el proyecto por defecto de la integración → el general de
«Configuración · CRM». Sin ninguno queda «sin proyecto» y se avisa por correo.

Los leads llegan a la lista **Lead** con formulario «Integración externa»,
origen `externo:<slug>` y la columna **Integración** con el aliado que lo
envió, así que se filtran y exportan como los demás.

Cada petición del aliado —aceptada o rechazada— deja una fila en **Peticiones
de integraciones** con el resultado, el código HTTP, el detalle (qué campo
falló), la IP y el lead creado. Se conservan 90 días. Las peticiones a un slug
que no existe no se registran.

## Contrato para el aliado

```
POST https://<cms>/api/leads/external/<slug>
Authorization: Bearer <clave>
Content-Type: application/json
```

La clave también se acepta en la cabecera `X-Api-Key`. La llamada debe salir
del servidor del aliado, nunca de un navegador: la clave quedaría a la vista.

```json
{
  "externalId": "zon-48213",
  "name": "Ana María Pérez",
  "phone": "+57 300 123 4567",
  "email": "ana@example.com",
  "message": "Quiere visitar la sala de ventas el sábado",
  "project": "brezza",
  "acceptsDataPolicy": true,
  "acceptsWhatsApp": true,
  "acceptsCall": true,
  "acceptsEmail": false,
  "acceptsSms": false,
  "interestCity": "Bogotá",
  "residenceCity": "Bogotá",
  "budgetRange": "200 a 300 millones",
  "utmSource": "zonario",
  "utmMedium": "portal",
  "utmCampaign": "octubre"
}
```

| Campo                                                          | Obligatorio | Notas                                                                                                                        |
| -------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `name`                                                         | sí          | 2 a 160 caracteres.                                                                                                          |
| `phone`                                                        | sí          | 7 a 15 dígitos, con o sin `+` e indicativo. Espacios, guiones y paréntesis se ignoran.                                       |
| `acceptsDataPolicy`                                            | sí          | Debe ser `true`: sin autorización de tratamiento de datos (Ley 1581) el lead no se guarda.                                   |
| `externalId`                                                   | recomendado | El id del lead en el sistema del aliado. Un reenvío con el mismo id no crea otro lead.                                       |
| `email`, `message`                                             | no          | `message` hasta 1000 caracteres.                                                                                             |
| `project`                                                      | no          | El slug del proyecto en el sitio (`/proyectos-de-vivienda/<slug>`). Si no existe, el lead se guarda sin proyecto y se avisa. |
| `acceptsWhatsApp`, `acceptsCall`, `acceptsEmail`, `acceptsSms` | no          | Canales por los que la persona autorizó ser contactada.                                                                      |
| `interestCity`, `residenceCity`, `budgetRange`                 | no          | Texto libre; el asesor los lee en la observación de la visita.                                                               |
| `utmSource`, `utmMedium`, `utmCampaign`                        | no          | Atribución de campaña.                                                                                                       |

Los campos vacíos (`""` o `null`) cuentan como no enviados. Cualquier otro
campo se ignora.

### Respuestas

| Código | Significado                                                                                 |
| ------ | ------------------------------------------------------------------------------------------- |
| `201`  | Lead guardado. `{ "data": { "id": "…", "crmStatus": "pending", "duplicate": false } }`      |
| `200`  | Ya existía un lead con ese `externalId`; se devuelve el mismo `id` con `"duplicate": true`. |
| `400`  | Datos inválidos. `error.issues` dice qué campo.                                             |
| `401`  | Clave ausente o incorrecta (o slug inexistente).                                            |
| `403`  | Integración apagada, origen no permitido o IP no permitida.                                 |
| `429`  | Límite por minuto o por día alcanzado. Reintentar después de los segundos de `Retry-After`. |

Un `201` puede traer `warnings` (por ejemplo, un `project` desconocido). El
envío a Sinco ocurre después de responder: `crmStatus` es `pending` en la
respuesta y el resultado se ve en el admin.

### Listado de proyectos

```
GET https://<cms>/api/leads/external/<slug>/projects
Authorization: Bearer <clave>
```

Devuelve los proyectos publicados y el slug que va en `project`, para que el
aliado mapee sus avisos sin depender de una hoja de cálculo:

```json
{
  "data": [
    { "slug": "brezza", "name": "Brezza", "city": "Bogotá", "type": "housing", "stage": "sale" }
  ]
}
```

`type` es `housing`, `lot` o `local`. Mismas comprobaciones que el envío
(clave, encendida, origen, IP) y un límite propio de 30 consultas por minuto,
que no consume el de leads. Se consulta una vez al día o al configurar, no en
cada lead.

### Buenas prácticas para el aliado

- Respetar los límites; ante un `429`, esperar `Retry-After` antes de reintentar.
- No reintentar `400`, `401` ni `403`: fallarán igual.
- Enviar cada lead una vez y con `externalId`.
- No enviar leads de prueba sin avisar: llegan al equipo comercial.
- Llamar solo desde su servidor; la clave puede ir en una variable de entorno
  (recomendado) o en el código del backend, nunca en un navegador ni en un
  repositorio público.
- Todas las peticiones quedan registradas; un volumen anormal o muchas
  rechazadas pueden llevar a pausar la integración o cambiar la clave.

### Ejemplo

```bash
curl -X POST "https://<cms>/api/leads/external/zonario" \
  -H "Authorization: Bearer lg_xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"externalId":"zon-1","name":"Ana Pérez","phone":"3001234567","acceptsDataPolicy":true,"project":"brezza"}'
```
