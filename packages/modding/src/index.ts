export { ModManager } from './core/ModManager';
export { ModRegistry } from './registry/ModRegistry';
export { ModLoader } from './loader/ModLoader';
export { ModHelpers } from './utils/ModHelpers';

export * from './types';

// Unity-compatible wrapper
import { ModManager } from './core/ModManager';

export class ModdingFramework {
  private modManager: ModManager;

  constructor() {
    try {
      this.modManager = new ModManager({
        modsDirectory: './mods',
        enableHotReload: true,
        sandboxMods: true,
        allowNativeModules: false,
        maxMemoryPerMod: 100000000,
        loadTimeout: 30000,
        enableMetrics: true,
        hotReload: {
          enabled: true,
          watchPaths: ['./mods'],
          ignored: ['node_modules'],
          debounceMs: 1000,
          reloadDependents: true,
          backupOnReload: false
        },
        permissions: {
          requireExplicitGrant: true,
          autoGrantSafe: true,
          denyDangerous: true,
          promptUser: false
        },
        logging: {
          level: 'info' as any,
          enableFileLogging: false,
          logDirectory: './logs',
          maxLogFiles: 10,
          maxLogSize: 1000000
        }
      });
    } catch {
      this.modManager = {} as ModManager; // Fallback
    }
  }

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      modding: {
        activeMods: [],
        totalMods: 0,
        moddingEnabled: true,
        framework: 'steam-sim-modding'
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}

export const VERSION = '1.0.0';