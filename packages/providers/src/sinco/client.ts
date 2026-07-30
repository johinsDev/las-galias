import type { SincoConfig } from "./types";
import { SincoAuthError, SincoRequestError } from "./types";

/** Renew this many ms before the token actually expires. */
const EXPIRY_MARGIN_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 30_000;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  data?: { bdIngreso?: number[]; NomUsuario?: string };
}

interface Empresa {
  IdOrigen: number;
  IdEmpresa: number;
  Nombre?: string;
  Estado?: boolean;
}

/**
 * Shared HTTP client for the Sinco CBR/CRM API — the base both the project-data
 * and the lead providers sit on.
 *
 * Two things make it more than a `fetch` wrapper:
 *
 * - Auth lives on a different base path (`/V3/API`) than the endpoints
 *   (`/V3/CBRClientes/API`), and it is a ~24h Bearer token, not an API key. The
 *   token is cached in memory and renewed on expiry or on a 401.
 * - The login answers **HTTP 300** when the user can reach several databases
 *   (that is the documented multi-DB flow, not an error). Test answers 200,
 *   production answers 300, so both paths are load-bearing.
 */
export class SincoClient {
  readonly authBase: string;
  readonly apiBase: string;

  private token: string | null = null;
  private expiresAt = 0;
  /** In-flight login, so concurrent calls trigger a single authentication. */
  private pending: Promise<string> | null = null;

  constructor(private readonly config: SincoConfig) {
    const root = config.baseUrl.replace(/\/+$/, "");
    this.authBase = `${root}/V3/API`;
    this.apiBase = `${root}/V3/CBRClientes/API`;
  }

  get name(): string {
    return "sinco";
  }

  private get timeout(): number {
    return this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Cached token, authenticating (once) when missing or expired. */
  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt) return this.token;
    this.pending ??= this.authenticate().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async authenticate(): Promise<string> {
    const { baseUrl, usuario, clave } = this.config;
    if (!baseUrl || !usuario || !clave) {
      throw new SincoAuthError("Missing Sinco credentials (baseUrl / usuario / clave)");
    }

    const res = await fetch(`${this.authBase}/Auth/Usuario`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ NomUsuario: usuario, ClaveUsuario: clave }),
      signal: AbortSignal.timeout(this.timeout),
    });

    // 300 is the multi-database flow, not a failure — anything else that is not
    // 2xx is.
    if (!res.ok && res.status !== 300) {
      throw new SincoAuthError(`Sinco login failed with HTTP ${res.status}`);
    }

    const body = (await res.json()) as TokenResponse;
    if (!body.access_token) {
      throw new SincoAuthError(`Sinco login returned no access_token (HTTP ${res.status})`);
    }

    const token =
      res.status === 300 ? await this.selectDatabase(body.access_token) : body.access_token;

    this.token = token;
    this.expiresAt = Date.now() + (body.expires_in ?? 86_399) * 1000 - EXPIRY_MARGIN_MS;
    return token;
  }

  /**
   * HTTP 300: the user reaches several databases, so a company/branch has to be
   * picked before the token is usable. `idSucursal` is always 0 or 1 for
   * CBRClientes (per Sinco's own docs).
   */
  private async selectDatabase(bootstrapToken: string): Promise<string> {
    const headers = { accept: "application/json", authorization: `Bearer ${bootstrapToken}` };

    let { idOrigen, idEmpresa } = this.config;
    if (!idOrigen || !idEmpresa) {
      const res = await fetch(`${this.authBase}/Cliente/Empresas`, {
        headers,
        signal: AbortSignal.timeout(this.timeout),
      });
      if (!res.ok) {
        throw new SincoAuthError(`Sinco /Cliente/Empresas failed with HTTP ${res.status}`);
      }
      const empresas = (await res.json()) as Empresa[];
      if (empresas.length !== 1) {
        // Picking one at random would silently point the whole integration at
        // the wrong company's data.
        throw new SincoAuthError(
          `Sinco returned ${empresas.length} companies; set SINCO_ID_ORIGEN and SINCO_ID_EMPRESA explicitly ` +
            `(options: ${empresas.map((e) => `${e.Nombre ?? "?"}=${e.IdOrigen}/${e.IdEmpresa}`).join(", ")})`,
        );
      }
      idOrigen ??= String(empresas[0]!.IdOrigen);
      idEmpresa ??= String(empresas[0]!.IdEmpresa);
    }

    const idSucursal = this.config.idSucursal ?? "1";
    const res = await fetch(
      `${this.authBase}/Auth/Sesion/IniciarMovil/${idOrigen}/Empresa/${idEmpresa}/Sucursal/${idSucursal}`,
      { headers, signal: AbortSignal.timeout(this.timeout) },
    );
    if (!res.ok) {
      throw new SincoAuthError(`Sinco IniciarMovil failed with HTTP ${res.status}`);
    }
    const body = (await res.json()) as TokenResponse;
    if (!body.access_token) {
      throw new SincoAuthError("Sinco IniciarMovil returned no access_token");
    }
    return body.access_token;
  }

  /**
   * Calls `/V3/CBRClientes/API{path}`, renewing the token once on a 401.
   * `Accept: application/json` is explicit because several endpoints declare
   * `text/plain`, `text/json` and `application/json` at the same time.
   */
  async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${this.apiBase}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
        authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (res.status === 401 && retry) {
      this.token = null;
      this.expiresAt = 0;
      return this.request<T>(path, init, false);
    }

    const text = await res.text();
    if (!res.ok) {
      throw new SincoRequestError(res.status, path, text.slice(0, 300));
    }
    if (!text) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  /** Cheap round trip: authenticate and hit a catalog that always exists. */
  async healthCheck(): Promise<boolean> {
    try {
      await this.get("/TiposIdentificacion");
      return true;
    } catch {
      return false;
    }
  }
}
