# Integración con Sinco CBR/CRM

Estado: **análisis del API — sin implementar.** Bloqueado por credenciales.

Este documento resume lo que expone el API que nos pasó Sinco, cómo encaja con lo
que ya existe en el repo y qué falta para implementarlo. Es la contraparte real
del `TODO` que vive en `packages/providers/src/project-data/sinco.ts`.

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
Sinco"_, así que **confirmar que Las Galias lo tiene contratado es prerrequisito
de todo lo demás**.

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

Verificado el 2026-07-28: `GET /Macroproyectos/Basica` sin token responde `401` y
`POST /V3/API/Auth/Usuario` con credenciales falsas responde `500` (o sea, ambos
endpoints existen y el host está arriba).

## Lo que ya existe en el repo

| Pieza                                     | Dónde                                                        | Estado                               |
| ----------------------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| Contrato `ProjectDataProvider`            | `packages/providers/src/project-data/types.ts`               | Listo                                |
| Factory por env (`PROJECT_DATA_PROVIDER`) | `packages/providers/src/project-data/index.ts`               | Listo                                |
| `SincoProvider`                           | `packages/providers/src/project-data/sinco.ts`               | **Stub** (`NotImplementedError`)     |
| Campos `syncFromSinco` / `sincoId`        | `apps/cms/src/api/project/content-types/project/schema.json` | Listo                                |
| Merge en create/update                    | `apps/cms/src/utils/project-rules.ts` (`mergeSincoData`)     | Listo, pero ver "Cambios necesarios" |
| Env en despliegue                         | `sst.config.ts`, `deploy/lightsail/docker-compose.yml`       | Hoy en `manual`                      |

Nada de esto contempla el **push de leads**: el contrato actual es solo de lectura
de datos de proyecto.

---

## Frente A — Enviar leads del sitio al CRM

Es el frente de mayor valor de negocio y el más pequeño. Hoy los `lead` mueren en
Strapi; con esto entran al embudo comercial.

**Endpoint principal:** `POST /SalaVentas/Externo/Visitas` (schema `VisitaExterna`).
Crea visitante + visita en una sola llamada. Único campo requerido: `idProyecto`.

Campos relevantes para nuestro `LeadForm`:

- **Persona:** `nombres`, `apellidos`, `correo`, `celular`, `numeroIdentificacion`,
  `tipoIdentificacion`, `fechaNacimiento`, `valorIngresosFamiliares`,
  `idPaisResidencia` / `idCiudadResidencia` / `idZonaResidencia` / `idBarrioResidencia`.
- **Proyecto:** `idProyecto`, `idMacroProyecto`, `idMacroProyectoExterno`.
- **Atribución:** `origenInformacion`, `idMedioPublicitario` y —muy útil—
  `campana`, `medio`, `fuente`, `fuenteReg`: los UTM del sitio entran directo.
  También `observacion` y `camposAdicionalesVisita` / `camposAdicionalesVisitante`.
- **Habeas Data (crítico en Colombia):** `haAutorizadoManejoInformacion`,
  `haAutorizadoEnvioCorreo`, `haAutorizadoEnvioSMS`, `haAutorizadoEnvioWhatsApp`,
  `haAutorizadoLlamada`. El formulario debe capturarlos explícitamente.
- **Idempotencia:** `idVisitaExterna` y `idVisitanteExterno` son **nuestros** IDs.
  Mandando ahí el `documentId` del lead de Strapi, los reintentos no duplican.

Alternativa de menor granularidad: `POST /SalaVentas/Visitantes` (solo prospecto,
sin visita) y `PATCH /SalaVentas/Visitantes/Actualizacion`. Ojo: el identificador
único del visitante (correo, celular o cédula) **es configurable en el CRM** y es
requerido — hay que preguntar cuál está activo.

**Catálogos a cachear** (todos `GET`, cambian poco):
`/SalaVentas/OrigenesInformacion`, `/SalaVentas/MediosPublicitarios`,
`/SalaVentas/TiposLeads/Visitas`, `/SalaVentas/Vendedores`, `/TiposIdentificacion`,
`/Paises`, `/Ciudades/Pais/{idPais}`, `/Zonas/Ciudad/{idCiudad}`, `/Barrios/idZOna/{idZOna}`.

**Consulta y seguimiento:** `GET /SalaVentas/Externo/Visitas/idVisitante/{id}`,
`GET /SalaVentas/Visitantes/Celular/{celular}`, `POST /SeguimientosVisita`,
`POST /SalaVentas/Externo/Visitas/EnviarObservacionVisita`.

**Diseño propuesto:** un `LeadProvider` nuevo en `packages/providers` (mismo
patrón de estrategia: `manual` = no-op, `sinco` = este API), invocado desde un
middleware `afterCreate` de `lead` en el CMS, **asíncrono y con reintentos**: el
lead se guarda en Strapi siempre, y el envío al CRM nunca puede tumbar el
formulario público. Guardar en el `lead` el `idVisita` devuelto (la respuesta es
un `string`) para trazabilidad.

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

| Nuestro campo                  | Realidad en Sinco                                                            |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `unitTypes[].bathrooms`        | **No existe** en `UnidadConAreas` → sigue siendo manual en el CMS            |
| `priceFromCOP`                 | No es un campo: hay que calcular `MIN(valor)` sobre unidades disponibles     |
| `constructionStatus` (enum)    | `ProyectoMostrar.etapa` es string libre → hace falta tabla de mapeo          |
| `getProjectById()` = 1 llamada | Son 2–3 (proyecto + unidades + tipologías), más el token                     |
| `updatedAt`                    | No hay un `updatedAt` por proyecto; lo más cercano es la auditoría por fecha |

## Otras capacidades disponibles (fuera de alcance por ahora)

- **Cotizador:** `POST /SalaVentas/Cotizaciones/Simulacion` y `POST /SalaVentas/Cotizaciones`
  generan cotizaciones reales con plan de pagos y cuota inicial. Es el camino
  natural si algún día el `MortgageCalculator` debe producir una cotización formal
  en vez de una estimación.
- **Reservas:** `POST /SalaVentas/Visitas/Reservas` reserva una unidad desde afuera.
- **Portal del comprador:** `LoginCompradores`, `Ventas/PlanDePagos`, `Pagos`,
  `Facturas`, `Desistimiento`, `SimualcionMoras` (sic).
- **Posventa:** rama completa (`PosVentaAPI/...`) para solicitudes de garantía.

## Cambios necesarios en nuestro código

1. **`SincoConfig` no sirve como está** (`{ baseUrl, apiKey }`). Necesita
   `authBaseUrl` + `apiBaseUrl` + `usuario`/`clave` (+ `idOrigen`/`idEmpresa`/
   `idSucursal` para el caso 300) y una **caché de token** con renovación en `401`.
   Las env vars `SINCO_BASE_URL` / `SINCO_API_KEY` de
   `packages/providers/src/project-data/index.ts` hay que reemplazarlas.
2. **Sacar el merge del middleware de create/update.** Hoy `mergeSincoData()` corre
   en cada guardado del editor (`apps/cms/src/utils/project-rules.ts`); con este API
   eso significa auth + 2–3 llamadas HTTP síncronas por cada tecleo de "Guardar".
   Debe pasar a un cron (o a una acción manual "Sincronizar desde Sinco"), dejando
   el middleware solo para respetar el toggle `syncFromSinco`.
3. **`LeadProvider` nuevo** para el frente A (ver arriba); el contrato actual solo
   cubre lectura de proyectos.
4. **Secretos**: usuario y clave de Sinco van por `bunx sst secret set` (AWS) o por
   el `.env` del compose en Lightsail — nunca en el repo.

## Trampas conocidas

- ⚠️ **Caracteres invisibles en el spec**: las rutas de `/SalaVentas/Externo/Visitas`
  traen `U+200B` (zero-width space) después de `SalaVentas` y de `Externo`. Copiadas
  del Swagger tal cual dan `404`. Hay que escribirlas a mano.
- El auth vive en otra base path (`/V3/API/`), no bajo `/V3/CBRClientes/API/`.
- La respuesta `300` del login **no es un error**: es el flujo multi-BD.
- Varias respuestas se declaran como `text/plain`, `text/json` y `application/json`
  a la vez; hay que pedir `application/json` explícitamente.
- No hay paginación en los listados de catálogo ni en `Unidades/PorProyecto`.

## Bloqueantes — qué pedirle a Sinco

1. **Credenciales** (`NomUsuario` / `ClaveUsuario`) y URL del ambiente de **pruebas**
   (el doc habla de `[URL_PRUEBAS]` y `[URL_PRODUCCION]` por cliente).
2. Confirmación de que Las Galias tiene el **módulo CRM** contratado.
3. Los `idMacroproyecto` / `idProyecto` que corresponden a nuestros proyectos, o
   luz verde para usar la homologación de IDs externos.
4. Cuál es el **identificador único de visitante** configurado (correo, celular o
   número de identificación) y qué `camposAdicionales` existen.
5. Qué `origenInformacion` / `idMedioPublicitario` debemos usar para los leads que
   entran por la web.
