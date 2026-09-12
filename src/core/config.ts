// Config tipada do framework.
export type FlyConfig = {
  appDir: string;
  siteUrl?: string;
  adapter?: "node" | "edge" | "serverless";
  build?: { minify?: boolean; sourcemap?: boolean };
};

export function defineConfig(config: FlyConfig): FlyConfig {
  return config;
}
