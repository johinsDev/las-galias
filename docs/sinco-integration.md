# Integración con Sinco CBR/CRM

Estado: **Frente A (leads → CRM) implementado y probado contra el ambiente de
pruebas. Frente B (datos de proyecto) pendiente.**

Este documento resume lo que expone el API que nos pasó Sinco, cómo encaja con lo
que ya existe en el repo y qué falta. Lo verificado contra la instancia real está
en [`sinco/discovery-pruebas.md`](./sinco/discovery-pruebas.md) — **cuando el spec
y ese documento no coincidan, manda el segundo.**

## Ambientes y credenciales

| Ambiente   | URL raíz                                                     | Login    |
| ---------- | ------------------------------------------------------------ | -------- |
| pruebas    | `https://pruebas4.sincoerp.com/SincoConsGalias_Nueva_PRBINT` | HTTP 200 |
| producción | `https://www4.sincoerp.com/SincoConsGalias_Nueva`            | HTTP 300 |

Usuario `APICBR`; la clave es un blob cifrado que viaja verbatim en el body. Las
mismas credenciales sirven en ambos ambientes. **Nunca al repo**: van por
`bunx sst secret set` (AWS) o el `.env` del compose (Lightsail).

## Origen de la información

- Swagger UI (ambiente que nos compartieron):
  `https://www4.sincoerp.com/SincoConsGalias_Nueva/V3/CBRClientes/API/swagger/index.html`
- El `index.html` es solo el shell de Swagger UI; el spec real está en
  `../swagger/v4/Swagger.json` (mismo directorio, subruta `v4`).
- Copia versionada del spec: [`sinco/openapi-cbr-clientes-v4.json`](./sinco/openapi-cbr-clientes-v4.json)
  (OpenAPI 3.0.1, `API CBR Clientes` v4, 154 endpoints, descargado 2026-07-28).
  Está en `.prettierignore` a propósito: se guarda tal cual lo publica Sinco.
- Contacto técnico de Sinco: `construyamosjuntos@sinco.co` · https://www.sinco.co/api-cbr

El API se autodescribe como el módulo **SINCO CBR/CRM**, no como el ERP. Muchos
endpoints llevan la nota _"solo aplica para clientes que hayan adquirido el CRM de
Sinco"_. **Ya no es un bloqueante**: los endpoints de `SalaVentas` responden 200 y
crean visitas de verdad, o sea que el CRM está disponible en esta instancia.

## Autenticación

No es una API key: es un **JWT Bearer de ~24 h (`expires_in: 86399`)** que se pide
en una **base path distinta** a la de los endpoints (`/V3/API/...` vs
`/V3/CBRClientes/API/...`).

1. `POST [URL]/V3/API/Auth/Usuario` con `{ "NomUsuario": "APICBR", "ClaveUsuario": "<clave>" }`.
   El token trae cifrada la BD, empresa, sucursal y usuario.
2. **HTTP 200** → el usuario tiene una sola BD/sucursal: el `access_token` ya sirve.
   **HTTP 300** → hay varias; entonces:
   - `GET [URL]/V3/API/Cliente/Empresas` (con el token del paso 1) → `IdOrigen`, `IdEmpresa`.
   - `GET [URL]/V3/API/Auth/Sesion/IniciarMovil/{idOrigen}/Empresa/{idEmpresa}/Sucursal/{idSucursal}`
     → token definitivo. Para CBRClientes `{idSucursal}` es siempre `0` o `1`.
3. Todas las llamadas: `Authorization: Bearer <access_token>` contra
   `[URL]/V3/CBRClientes/API/<endpoint>`.

Un `401` significa token vencido o inválido → hay que regenerarlo y reintentar.
Eso lo maneja `SincoClient`: cachea el token en memoria, lo renueva una sola vez
aunque haya llamadas concurrentes, y reintenta una vez ante un `401`.

## Lo que ya existe en el repo

| Pieza                                         | Dónde                                                                            | Estado                               |
| --------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| Cliente HTTP + auth (200/300, token, 401)     | `packages/providers/src/sinco/client.ts`                                         | **Listo**                            |
| Contrato `LeadProvider` + `SincoLeadProvider` | `packages/providers/src/leads/`                                                  | **Listo** (probado contra pruebas)   |
| Push + reintentos en el CMS                   | `apps/cms/src/utils/lead-rules.ts`                                               | **Listo**                            |
| Cron de reintento de leads                    | `apps/cms/config/cron-tasks.ts` (`retryCrmLeads`)                                | **Listo**                            |
| Consentimientos + UTM en el formulario        | `packages/schemas/src/lead.ts`, `apps/web/src/islands/LeadForm.tsx`              | **Listo**                            |
| Catálogo de proyectos (selector buscable)     | `packages/providers/src/sinco/catalog.ts`, `apps/cms/src/utils/sinco-catalog.ts` | **Listo**                            |
| Content type espejo `sinco-project`           | `apps/cms/src/api/sinco-project/`                                                | **Listo** (662 entradas)             |
| Contrato `ProjectDataProvider`                | `packages/providers/src/project-data/types.ts`                                   | Listo                                |
| `SincoProvider` (lectura de proyectos)        | `packages/providers/src/project-data/sinco.ts`                                   | **Stub** (`NotImplementedError`)     |
| Merge en create/update                        | `apps/cms/src/utils/project-rules.ts` (`mergeSincoData`)                         | Listo, pero ver "Cambios necesarios" |
| Env en despliegue                             | `sst.config.ts`, `deploy/lightsail/docker-compose.yml`                           | Declarado; providers hoy en `manual` |
| Script de reconocimiento                      | `scripts/sinco-discover.ts`                                                      | **Listo**                            |

---

## Frente A — Enviar leads del sitio al CRM ✅

Implementado. `POST /SalaVentas/Externo/Visitas` crea visitante + visita en una
llamada. Detalles verificados contra la instancia real (respuesta en prosa,
deduplicación, bug de consentimientos) en
[`sinco/discovery-pruebas.md`](./sinco/discovery-pruebas.md).

**Cómo fluye un lead:**

1. `LeadForm` (web) envía a `POST /api/leads` de Strapi, con la autorización de
   contacto y los UTM de la URL.
2. El middleware de `apps/cms/src/index.ts` ve `create` sobre `api::lead.lead` y
   llama a `schedulePushLeadToCrm` **después** de `next()` (necesita el
   `documentId`) y **sin await**: el formulario nunca espera al CRM.
3. `pushLeadToCrm` arma el `ExternalLead` y llama al `LeadProvider`. Nunca lanza:
   el resultado queda en `crmStatus`.
4. El cron `retryCrmLeads` (cada 15 min) reintenta lo que quedó en `pending` o
   `failed`, hasta 5 intentos.

**`crmStatus` en el `lead`:**

| Valor       | Significa                                                           |
| ----------- | ------------------------------------------------------------------- |
| `pending`   | Aún no se ha intentado (o el intento no terminó)                    |
| `sent`      | Visita nueva creada en el CRM; `crmVisitId` tiene el id             |
| `duplicate` | La persona ya existía; el CRM devolvió su visita previa (ver abajo) |
| `failed`    | Falló; `crmLastError` tiene el motivo. El cron reintenta            |
| `skipped`   | `LEAD_PROVIDER=manual` — el lead se queda en Strapi a propósito     |

**Requisitos de datos.** El push necesita el `idProyecto` y el `idMacroProyecto`.
Los dos salen de **un solo campo** del CMS: el selector `sincoProject` del
proyecto (ver abajo). Sin él, el lead queda en `failed` con un mensaje explícito —
nunca se pierde, pero tampoco llega al CRM.

### El selector de proyecto de Sinco

El editor **no escribe ids**. Elige el proyecto de una lista buscable por nombre
("LA ITALIA - FLORENCIA · CONJUNTO CERRADO LA ITALIA") y el macroproyecto sale
solo, porque la entrada del catálogo carga los dos.

Ese catálogo es el content type `sinco-project`: un espejo de solo lectura del
API. Se arma con 1 llamada a `/Macroproyectos/Externo` + 1 por macroproyecto
(~110 llamadas, **~1.5 s**, 445 KB) y se refresca en el cron
`refreshSincoCatalog` (5:30 am) y en el arranque si está vacío. **Nunca se llama
a Sinco mientras alguien edita.**

- Se usa `/Macroproyectos/Externo` y no `/Basica` porque este último embebe el
  logo en base64 de cada macroproyecto: 0.86 MB contra 10 KB.
- Las entradas que desaparecen de Sinco **no se borran**: puede haber un proyecto
  nuestro apuntando a ellas y perder la referencia rompería su push en silencio.
  Se quedan sin refrescar y `lastSyncedAt` lo delata.
- ⚠️ **Los ids no son portables entre ambientes.** Comparando el catálogo de
  producción contra el de pruebas, los códigos más recientes ya apuntan a
  proyectos distintos (p. ej. el 1238 es "FORESTA DE LA SULTANA TORRE 2" en
  producción y "LONDRES TORRE 3" en pruebas). Por eso el catálogo se sincroniza
  desde el mismo ambiente al que se envían los leads, y nunca se copia a mano.

**Atribución.** `idMedioPublicitario: 20` ("SITIO WEB GALIAS") siempre, para que
en la sala de ventas se vea que el lead entró por el sitio. El
`origenInformacion` **se deduce del tráfico**:

| De dónde llega                                           | `origenInformacion` |
| -------------------------------------------------------- | ------------------- |
| Directo, orgánico, referido, correo                      | `1` — Web           |
| `utm_source=google` / youtube / adwords (con medio pago) | `14` — Google ADS   |
| `utm_source=facebook` / instagram / meta                 | `13` — Facebook ADS |

Un `utm_medium` de `organic`, `referral`, `email` o `social` manda a Web aunque
la fuente sea Google o Meta. Se puede forzar un origen fijo con
`SINCO_LEAD_ORIGEN_INFORMACION`. Los UTM además van tal cual a
`campana` / `medio` / `fuente`, y nuestro `source` interno a `fuenteReg`.

**Hueco conocido — contacto repetido.** El CRM deduplica por correo o celular, así
que si alguien que ya está en el CRM llena el formulario por otro proyecto, no se
crea visita nueva: queda `duplicate` apuntando a la visita vieja. El detalle
completo (qué proyecto, cuándo, qué mensaje) sí queda en Strapi. Cerrarlo del todo
requiere `POST /SeguimientosVisita`, que exige asignar asesor (`idResponsable`) y
`idTipoGestion` — decisión comercial pendiente.

**Fuera de alcance por ahora:** `numeroIdentificacion` / `tipoIdentificacion`,
datos de residencia (`idPaisResidencia`, `idCiudadResidencia`, …),
`fechaNacimiento`, `valorIngresosFamiliares` y `camposAdicionales*`. El formulario
público no los pide y pedirlos bajaría la conversión.

## Frente B — Traer datos de proyecto (lo que esperaba el stub)

| Endpoint                                    | Devuelve                                                  | Uso                             |
| ------------------------------------------- | --------------------------------------------------------- | ------------------------------- |
| `GET /Macroproyectos/Basica`                | `id`, `nombre`, `direccion`, `telefono`, `ciudad`, `logo` | Nuestro `macroproject`          |
| `GET /Proyectos/{idMacro}`                  | `ProyectoMostrar`                                         | Nuestro `project`               |
| `GET /Unidades/PorProyecto/{idProyecto}`    | `UnidadConAreas`                                          | `unitTypes` + precios           |
| `GET /TipoInmueble/IdProyecto/{idProyecto}` | tipologías + `rutaImagen` / `imagenConBase64`             | Nombres e imágenes de tipología |

`ProyectoMostrar` trae además insumos para el **calculador**: `valorSeparacion`,
`porcentajeSeparacion`, `valorConfirmacion`, `porcentajeFinanciacion`,
`tasaInteresCorrienteMesVencido`, `tasaInteresFinancieroMesVencido`,
`numeroDiasReservaOpcionDeVenta`, `fechaEntrega`, `estrato`,
`esViviendaDeInteresSocial`, `cantidadUnidadesPrincipalesDisponibles`.

`UnidadConAreas` trae `valor` (COP), `areaPrivada` / `areaConstruida` /
`areaTerraza` / `areaTotal`, `cantidadAlcobas`, `numeroPiso`, `estado`,
`idTipoInmueble`, `fechaEntrega`.

**Homologación de IDs.** Sinco ya prevé el amarre con sistemas externos:
`GET /Macroproyectos/Externo` (devuelve `id` de Sinco + `idProyectoExterno`) y
`PUT /Macroproyectos/HomologacionMacroproyectoExterno/{id}/idProyectoExterno/{idProyectoExterno}`.
Es preferible a nuestro `sincoId` escrito a mano.

**Sync incremental.** No hay webhooks. Sí hay endpoints con delta por fecha:
`GET /Unidades/IdProyecto/{idProyecto}/FechaCreacion/{fechaCreacion}`,
`GET /AuditoriaUnidades/IdProyecto/{id}/FechaCreacion/{fecha}`,
`GET /AuditoriaVentas/...`, `GET /Agrupaciones/IdProyecto/{id}/FechaCreacion/{fecha}`.
→ polling por cron, no push.

### Desajustes con `ExternalProjectData`

| Nuestro campo                  | Realidad en Sinco                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `unitTypes[].bathrooms`        | **No existe** en `UnidadConAreas` → sigue siendo manual en el CMS                                                        |
| `unitTypes[].bedrooms`         | `cantidadAlcobas` existe pero solo está poblado en ~40% → **manual también**                                             |
| `priceFromCOP`                 | No es un campo: hay que calcular `MIN(valor)` sobre unidades `DISPONIBLE`                                                |
| `constructionStatus` (enum)    | **No existe en Sinco.** `etapa` son etiquetas de torre/etapa (`"1"`, `"K"`, `"2,3,4"`), no estado de obra → queda manual |
| `getProjectById()` = 1 llamada | Son 2–3 (proyecto + unidades + tipologías), más el token                                                                 |
| `updatedAt`                    | No hay un `updatedAt` por proyecto; lo más cercano es la auditoría por fecha                                             |

En resumen: de Sinco vale la pena traer **precio, áreas y disponibilidad**. El
resto (estado de obra, alcobas, baños, copy, imágenes) se queda en el CMS. Eso
cambia la forma del merge: no puede pisar el documento entero, solo esos campos.

## Otras capacidades disponibles (fuera de alcance por ahora)

- **Cotizador:** `POST /SalaVentas/Cotizaciones/Simulacion` y `POST /SalaVentas/Cotizaciones`
  generan cotizaciones reales con plan de pagos y cuota inicial. Es el camino
  natural si algún día el `MortgageCalculator` debe producir una cotización formal
  en vez de una estimación.
- **Reservas:** `POST /SalaVentas/Visitas/Reservas` reserva una unidad desde afuera.
- **Portal del comprador:** `LoginCompradores`, `Ventas/PlanDePagos`, `Pagos`,
  `Facturas`, `Desistimiento`, `SimualcionMoras` (sic).
- **Posventa:** rama completa (`PosVentaAPI/...`) para solicitudes de garantía.

## Lo que falta (frente B)

1. **Implementar `SincoProvider.getProjectById`** sobre `SincoClient` (ya está el
   cliente y el `healthCheck`): `Proyectos/{idMacro}` + `Unidades/PorProyecto` +
   `TipoInmueble`, quedándose solo con precio, áreas y disponibilidad.
2. **Sacar el merge del middleware de create/update.** Hoy `mergeSincoData()` corre
   en cada guardado del editor (`apps/cms/src/utils/project-rules.ts`); con este API
   eso significa auth + 2–3 llamadas HTTP síncronas por cada "Guardar". Debe pasar a
   un cron (o a una acción manual "Sincronizar desde Sinco"), dejando el middleware
   solo para respetar el toggle `syncFromSinco`.
3. **Decidir la homologación de IDs**: `sincoId` a mano (lo que hay hoy, y lo que ya
   usa el push de leads) contra `/Macroproyectos/Externo` +
   `PUT /Macroproyectos/HomologacionMacroproyectoExterno/...`. Con 110 macroproyectos
   —muchos históricos o inactivos— escribir el id a mano en el CMS es más predecible.

## Cómo activarlo

```sh
LEAD_PROVIDER=sinco
SINCO_BASE_URL=https://pruebas4.sincoerp.com/SincoConsGalias_Nueva_PRBINT
SINCO_USER=APICBR
SINCO_PASSWORD=<la clave>
# solo en producción (login 300, 3 BDs):
SINCO_ID_ORIGEN=... SINCO_ID_EMPRESA=...
```

En AWS: `bunx sst secret set SincoPassword <clave> --stage <stage>` (igual para
`SincoBaseUrl` y `SincoUser`). En Lightsail: el `.env` del compose.

Con `LEAD_PROVIDER=manual` (el default) nada sale a la red y los leads se quedan en
Strapi con `crmStatus: skipped`.

## Trampas conocidas

- ⚠️ **Caracteres invisibles en el spec**: las rutas de `/SalaVentas/Externo/Visitas`
  traen `U+200B` (zero-width space) después de `SalaVentas` y de `Externo`. Copiadas
  del Swagger tal cual dan `404`. Hay que escribirlas a mano.
- El auth vive en otra base path (`/V3/API/`), no bajo `/V3/CBRClientes/API/`.
- La respuesta `300` del login **no es un error**: es el flujo multi-BD.
- Varias respuestas se declaran como `text/plain`, `text/json` y `application/json`
  a la vez; hay que pedir `application/json` explícitamente.
- No hay paginación en los listados de catálogo ni en `Unidades/PorProyecto`.
- Varios `409` son respuestas de negocio normales, no errores: "No existen unidades
  en el proyecto", "El celular ingresado no pertenece a ningún visitante", y el
  duplicado de visitante.
- Hay endpoints publicados en el spec que responden **404** en esta instancia
  (`EnviarObservacionVisita`, `Externo/Visitas/idVisitante/{id}`). Probar antes de
  diseñar sobre ellos.

## Bloqueantes — estado

| #   | Bloqueante                                  | Estado                                                                            |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | Credenciales + URL de pruebas               | ✅ Recibidas y verificadas contra ambos ambientes                                 |
| 2   | ¿Módulo CRM contratado?                     | ✅ Resuelto por prueba: `SalaVentas` crea visitas de verdad                       |
| 3   | `idMacroproyecto` / `idProyecto` nuestros   | ⚠️ Los ids se pueden listar, pero **el amarre lo tiene que confirmar Las Galias** |
| 4   | Identificador único de visitante            | ✅ Resuelto por prueba: deduplica por **correo o celular**                        |
| 5   | `origenInformacion` / `idMedioPublicitario` | ✅ `1` = "Web", `20` = "SITIO WEB GALIAS"                                         |

### Pendiente con Sinco

1. **Bug**: `haAutorizadoEnvioWhatsApp` y `haAutorizadoLlamada` se aceptan pero no
   se guardan (ver `sinco/discovery-pruebas.md`). Es un tema de habeas data: el
   asesor no ve la autorización que la persona sí dio.
2. `POST /SalaVentas/Externo/Visitas/EnviarObservacionVisita` y
   `GET /SalaVentas/Externo/Visitas/idVisitante/{id}` dan 404 — ¿no están
   desplegados en esta instancia o cambiaron de ruta?
3. ¿Pruebas y producción comparten credencial a propósito? ¿Cómo se rota?
4. Para producción: cuál de las **3 BDs** (`IdOrigen`/`IdEmpresa`) es la correcta.

### Pendiente con Las Galias

1. Elegir, para cada proyecto publicado en el sitio, su proyecto de Sinco en el
   selector. El catálogo ya está cargado y buscable — es trabajo de contenido, no
   de código. (El Excel "Códigos macro" tiene 183 proyectos activos en 38
   macroproyectos, de los cuales 18 con disponibilidad hoy: buen punto de partida
   para saber cuáles van.)
2. Si el interés repetido debe abrir un seguimiento en el CRM, con qué asesor
   (`idResponsable`) y qué tipo de gestión.
3. Luz verde para apuntar a **producción** (`LEAD_PROVIDER=sinco` +
   `SINCO_BASE_URL` de producción). Hoy todo lo probado vive en pruebas.
