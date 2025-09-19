// Import commented out for build compatibility
// Import commented out for build compatibility
// Import commented out for build compatibility

export const VERSION = '1.0.0';

// Unity-compatible wrapper
export class UiTemplatesSimulation {
  constructor() {}

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      uitemplates: {
        "systemHealth": "operational",
        "framework": "steam-sim-ui-templates"
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}