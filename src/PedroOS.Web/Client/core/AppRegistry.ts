import type { AppDefinition, ClientAppModule } from '../types/index.js';

/**
 * Central registry of applications and their client-side lifecycle controllers.
 */
export class AppRegistry {
  private readonly definitions = new Map<string, AppDefinition>();
  private readonly modules = new Map<string, ClientAppModule>();

  public constructor(initialDefinitions: AppDefinition[] = []) {
    for (const def of initialDefinitions) {
      this.registerDefinition(def);
    }
  }

  public registerDefinition(definition: AppDefinition): void {
    this.definitions.set(definition.id.toLowerCase(), definition);
  }

  public registerClientApp(appId: string, module: ClientAppModule): void {
    this.modules.set(appId.toLowerCase(), module);
  }

  public getDefinition(appId: string): AppDefinition | undefined {
    if (!appId || !/^[a-z0-9-]{1,40}$/i.test(appId)) {
      return undefined;
    }
    return this.definitions.get(appId.toLowerCase());
  }

  public getClientModule(appId: string): ClientAppModule | undefined {
    return this.modules.get(appId.toLowerCase());
  }

  public getAllDefinitions(): AppDefinition[] {
    return Array.from(this.definitions.values());
  }
}
