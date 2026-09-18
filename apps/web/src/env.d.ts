declare module "astro" {
  interface AstroClientDirectives {
    /** Hydrate on `lg:open-search` or ⌘K. See `src/directives/search.ts`. */
    "client:search"?: boolean;
    /** Hydrate on hover/focus/touch, remembering an early click. See `src/directives/interact.ts`. */
    "client:interact"?: boolean;
    /** Hydrate when this custom event first fires on `document`. See `src/directives/on.ts`. */
    "client:on"?: string;
  }
}

export {};
