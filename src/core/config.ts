// Config tipada do framework.
export type FlyConfig = {
  appDir: string;
  siteUrl?: string;
  adapter?: "node" | "edge" | "serverless";
  build?: { minify?: boolean; sourcemap?: boolean };
  dev?: boolean;
  i18n?: {
    defaultLocale: string;
    locales: string[];
    strategy?: "prefix" | "cookie";
  };
  db?: { path?: string };
  css?: { tailwind?: boolean; input?: string };
};

export function defineConfig(config: FlyConfig): FlyConfig {
  return config;
}
