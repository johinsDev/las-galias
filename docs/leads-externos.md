# Leads desde un aliado (API externa)

Cómo un portal aliado —Zonario, por ejemplo— entrega sus leads a Las Galias.
El lead se guarda en Strapi como cualquier otro y, si la integración lo tiene
encendido, se envía a Sinco con el mismo mecanismo que los del sitio (envío
inmediato, reintentos por cron, alerta si se queda sin proyecto).

## Configurar un aliado

En el admin, **Integración de leads → Crear**. Solo el Super Admin debe tener
permiso sobre este tipo: guarda las claves.

| Campo                         | Qué hace                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Nombre / Slug                 | El slug es el final de la URL: `/api/leads/external/<slug>`.                                                                     |
| Encendida                     | Apagada responde `403` y no guarda nada. Nace apagada.                                                                           |
| Clave (API key)               | Se genera al crear. Para rotarla: borrar el campo y guardar.                                                                     |
| Orígenes permitidos           | Solo para peticiones desde un navegador (traen `Origin`). Vacío las rechaza todas. Un servidor no envía `Origin`.                |
| IP permitidas                 | Direcciones exactas, una por línea. Vacío acepta cualquier IP que traiga la clave.                                               |
| Máximo por minuto / por día   | Por encima responde `429` con `Retry-After`.                                                                                     |
| Enviar a Sinco                | Apagado, los leads quedan solo en Strapi (`skipped`). Al encenderlo y guardar, los que estaban en espera se envían.              |
| Proyecto de Sinco por defecto | A dónde van los leads que no nombran un proyecto del sitio. Vacío usa el de su formulario o el general de «Configuración · CRM». |

A qué proyecto de Sinco llega cada lead, en orden: el proyecto del sitio que
nombra el lead → el proyecto por defecto de la integración → el general de
«Configuración · CRM». Sin ninguno queda «sin proyecto» y se avisa por correo.

Los leads llegan a la lista **Lead** con formulario «Integración externa»,
origen `externo:<slug>` y la integración enlazada, así que se filtran y
exportan como los demás.

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

### Ejemplo

```bash
curl -X POST "https://<cms>/api/leads/external/zonario" \
  -H "Authorization: Bearer lg_xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"externalId":"zon-1","name":"Ana Pérez","phone":"3001234567","acceptsDataPolicy":true,"project":"brezza"}'
```
