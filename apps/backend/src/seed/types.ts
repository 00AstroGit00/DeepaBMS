export interface SeedModule {
  name: string;
  dependsOn: string[];
  run: () => Promise<void>;
  verify?: () => Promise<boolean>;
}

export interface BootstrapOptions {
  skipSeeds?: string[];
  onlySeeds?: string[];
  dryRun?: boolean;
}
