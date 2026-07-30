export interface SincoConfig {
  /**
   * Environment root, without a trailing slash — e.g.
   * `https://pruebas4.sincoerp.com/SincoConsGalias_Nueva_PRBINT`. Auth
   * (`/V3/API`) and the endpoints (`/V3/CBRClientes/API`) both hang off it.
   */
  baseUrl: string;
  usuario: string;
  /** Pre-encrypted blob Sinco hands over; it travels verbatim in the body. */
  clave: string;
  /** Only needed when the login answers HTTP 300 (several databases). */
  idOrigen?: string;
  idEmpresa?: string;
  /** Always "0" or "1" for CBRClientes. Defaults to "1". */
  idSucursal?: string;
  timeoutMs?: number;
}

export class SincoAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SincoAuthError";
  }
}

export class SincoRequestError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: string,
  ) {
    super(`Sinco ${path} responded ${status}: ${body}`);
    this.name = "SincoRequestError";
  }
}

export interface SincoEnv {
  SINCO_BASE_URL?: string;
  SINCO_USER?: string;
  SINCO_PASSWORD?: string;
  SINCO_ID_ORIGEN?: string;
  SINCO_ID_EMPRESA?: string;
  SINCO_ID_SUCURSAL?: string;
}

export function sincoConfigFromEnv(env: SincoEnv): SincoConfig {
  return {
    baseUrl: env.SINCO_BASE_URL ?? "",
    usuario: env.SINCO_USER ?? "",
    clave: env.SINCO_PASSWORD ?? "",
    idOrigen: env.SINCO_ID_ORIGEN,
    idEmpresa: env.SINCO_ID_EMPRESA,
    idSucursal: env.SINCO_ID_SUCURSAL,
  };
}
