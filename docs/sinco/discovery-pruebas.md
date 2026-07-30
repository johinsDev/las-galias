# Reconocimiento del API Sinco — ambiente de pruebas

Salida de `bun run scripts/sinco-discover.ts` contra
`https://pruebas4.sincoerp.com/SincoConsGalias_Nueva_PRBINT`, más un barrido
completo de los 110 macroproyectos. Fecha: 2026-07-30.

Todo lo de aquí se verificó llamando al API, no leyendo el spec. Cuando el spec
y la instancia no coinciden, manda esto.

## Autenticación

| Ambiente   | Respuesta del login | BDs (`bdIngreso`) | Consecuencia                                       |
| ---------- | ------------------- | ----------------- | -------------------------------------------------- |
| pruebas    | **HTTP 200**        | `[1]`             | El `access_token` sirve directo                     |
| producción | **HTTP 300**        | `[1, 2, 3]`       | Hay que encadenar `Empresas` → `IniciarMovil`       |

Las mismas credenciales (`APICBR`) sirven en los dos ambientes. En producción
**hay que fijar `SINCO_ID_ORIGEN` / `SINCO_ID_EMPRESA`**: son tres BDs y elegir
la primera a ciegas apuntaría la integración a la empresa equivocada (por eso
`SincoClient` lanza un error explícito en vez de adivinar).

## Inventario

- **110 macroproyectos** (`/Macroproyectos/Basica`).
- **565 proyectos con unidades**, de los cuales **193 tienen disponibilidad > 0**.
- Los nombres incluyen histórico y basura operativa (`INACTIVO ...`, `POSTVENTAS
  ZONAS COMUNES`, duplicados con sufijo `(I)`). **El amarre con nuestro CMS tiene
  que ser explícito** (`sincoId` por proyecto); no hay forma de derivarlo por nombre.
- `Macroproyectos/Basica.logo` viene como **base64 completo embebido** — un JPEG
  entero por macroproyecto. Cuidado al listar los 110 de una.

### `UnidadConAreas` — lo que trae de verdad

Campos útiles y confiables: `valor` (COP), `estado` (`DISPONIBLE` / `VENDIDO`),
`areaPrivada`, `areaConstruida`, `areaTotal`, `tipoUnidad`, `idTipoInmueble`,
`esPrincipal`, `fechaCreacion`.

Qué tan poblados están (sobre 565 proyectos muestreados):

| Campo              | Poblado  | Lectura                                     |
| ------------------ | -------- | ------------------------------------------- |
| `numeroPiso`       | 517/565  | confiable                                   |
| `tipoInmueble`     | 320/565  | a medias                                    |
| `cantidadAlcobas`  | 222/565  | **no confiable** → alcobas siguen manuales   |
| `fechaEntrega`     | 115/565  | **no confiable**                            |
| baños              | —        | **no existe** en el schema                  |

`/Unidades/PorProyecto/{id}` responde **409 "No existen unidades en el proyecto"**
cuando no hay ninguna — un 409 esperado, no un error.

### `etapa` no es el estado de obra

Corrige la suposición del análisis original. Los valores distintos de
`ProyectoMostrar.etapa` en toda la instancia son:

```
"", "1", "2", "3", ... "13", "2,3,4", "5,6,7,8", "A", "B", ... "K"
```

Son **etiquetas de etapa/torre**, no `preventa | construcción | entrega
inmediata`. **Sinco no tiene un campo de estado de obra**, así que
`constructionStatus` se queda como campo manual del CMS, igual que los baños.

## Catálogos (los que importan para leads)

`/SalaVentas/OrigenesInformacion` — 41 entradas. La que aplica:

- **`1` = "Web"** ← el `origenInformacion` que usamos.

`/SalaVentas/MediosPublicitarios` — 54 entradas. La que aplica:

- **`20` = "SITIO WEB GALIAS"** ← el `idMedioPublicitario` que usamos.
  (Existe también `50` = "Pagina Web", más genérico.)

`/SalaVentas/TiposLeads/Visitas` — 12 estados del embudo, de `1` = "Lead" hasta
`15` = "Cerrado Ganado y Efectivo" / `16` = "Cerrado y Perdido".

`/TiposIdentificacion` — 15 (`CC`, `CE`, `NIT`, `PA`, `TI`, …). Hoy no lo usamos:
el formulario público no pide documento.

`/SalaVentas/Vendedores` — 1722 registros. Solo relevante si algún día hay que
asignar asesor (`idResponsable` en los seguimientos).

## `POST /SalaVentas/Externo/Visitas` — comportamiento real

1. **`idMacroProyecto` es obligatorio de facto.** El spec marca solo `idProyecto`,
   pero sin el macro responde `409 "El macroproyecto no existe"`. Por eso
   `macroproject` tiene ahora su propio `sincoId` en el CMS.
2. **La respuesta es prosa, no un id.**
   - Éxito: `"visitante creado:  853204, visita creada id: 921260"`
   - Duplicado: `"El visitante id: 853204, tiene la visita asociada id: 921260"`
     (con status **409**)
   En ambos el id de la visita es el último número del mensaje.
3. **La deduplicación es por correo _o_ celular**, no por nuestro
   `idVisitanteExterno`. Verificado: mismo correo con otro celular → duplicado;
   otro correo con el mismo celular → duplicado. Nuestro id externo igual sirve,
   pero no es lo que decide.
   - Bueno: los reintentos nunca duplican.
   - Malo: **una persona ya registrada que vuelve a llenar el formulario por otro
     proyecto no genera visita nueva** — el CRM devuelve la que ya tenía. Lo
     marcamos como `crmStatus: "duplicate"` en Strapi para que sea visible.
4. El CRM normaliza al guardar: `"Prueba Integracion Web"` quedó como
   nombres `PRUEBA` / apellidos `INTEGRACIONWEB` (mayúsculas, sin espacios).
5. El celular se guarda con indicativo: `3009988771` → `573009988771`.

### Bug de Sinco: consentimientos que no se guardan

Enviando los cinco flags en `true`, el CRM guarda solo tres:

| Campo                           | Enviado | Guardado  |
| ------------------------------- | ------- | --------- |
| `haAutorizadoManejoInformacion`  | `true`  | `true`    |
| `haAutorizadoEnvioCorreo`        | `true`  | `true`    |
| `haAutorizadoEnvioSMS`           | `true`  | `true`    |
| `haAutorizadoEnvioWhatsApp`      | `true`  | **`false`** |
| `haAutorizadoLlamada`            | `true`  | **`false`** |

Verificado con un `POST` crudo (sin pasar por nuestro código) y releyendo con
`GET /SalaVentas/Visitantes/Celular/{celular}`. **Hay que reportárselo a Sinco.**

Mitigación: Strapi guarda los cuatro consentimientos (`acceptsWhatsApp`,
`acceptsSms`, `acceptsCall`, `acceptsEmail`), así que el registro de la
autorización no se pierde aunque el CRM lo bote.

## Endpoints publicados que no existen en esta instancia

Responden **404** aunque estén en el spec:

- `POST /SalaVentas/Externo/Visitas/EnviarObservacionVisita`
- `GET /SalaVentas/Externo/Visitas/idVisitante/{idVisitante}`

Sí funcionan: `GET /SalaVentas/Visitantes/Celular/{celular}` y
`GET /SeguimientosVisita/IdVisita/{idVisita}`.

`POST /SeguimientosVisita` sí existe, pero exige `idResponsable` (un vendedor) e
`idTipoGestion` — o sea, asignar asesor. Es el camino para registrar el interés
repetido de alguien que ya está en el CRM, pero requiere definición comercial.

## Cómo reproducirlo

```sh
# credenciales fuera del repo
set -a && source .sinco.env && set +a
bun run scripts/sinco-discover.ts discovery.json
```
