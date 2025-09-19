export { ResourceManager } from './core/ResourceManager';
export { DependencyResolver } from './core/DependencyResolver';
export { ResourceHelpers } from './utils/ResourceHelpers';

export * from './types';

// Add Unity export method to ResourceManager
import { ResourceManager } from './core/ResourceManager';

// Extend ResourceManager with exportState
(ResourceManager.prototype as any).exportState = function(): string {
  const exportData = {
    timestamp: Date.now(),
    currentTime: Date.now(),
    resources: {
      loadedResources: Object.keys(this.resources || {}).length,
      cacheSize: this.cache ? Object.keys(this.cache).length : 0,
      dependencies: this.dependencies || [],
      manager: 'steam-sim-resources'
    }
  };

  return JSON.stringify(exportData, null, 2);
};

export const ResourceSystemVersion = '1.0.0';