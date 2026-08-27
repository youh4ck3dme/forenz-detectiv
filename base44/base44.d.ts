// Type declarations for Base44 cloud runtime & Deno npm specifiers
declare module 'base44:runtime' {
  export const secrets: {
    get(key: string): string | undefined;
  };
}

declare module 'npm:@base44/sdk*' {
  export * from '@base44/sdk';
}

declare module 'npm:zod*' {
  export * from 'zod';
}

declare module 'npm:haversine-distance*' {
  import haversine from 'haversine-distance';
  export default haversine;
}
