import * as path from 'path';
import * as fs from 'fs/promises';
import { ModMetadata, ModInstance, ValidationResult, ModDependency, PermissionType } from '../types';

export class ModHelpers {
  static validateModId(id: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(id) && id.length >= 3 && id.length <= 50;
  }

  static validateVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9-]+)?$/.test(version);
  }

  static compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;

      if (v1 > v2) return 1;
      if (v1 < v2) return -1;
    }

    return 0;
  }

  static isVersionCompatible(required: string, available: string): boolean {
    if (required.startsWith('^')) {
      const baseVersion = required.slice(1);
      const baseParts = baseVersion.split('.').map(Number);
      const availableParts = available.split('.').map(Number);

      return baseParts[0] === availableParts[0] &&
        (availableParts[1] > baseParts[1] ||
          (availableParts[1] === baseParts[1] && availableParts[2] >= baseParts[2]));
    }

    if (required.startsWith('~')) {
      const baseVersion = required.slice(1);
      const baseParts = baseVersion.split('.').map(Number);
      const availableParts = available.split('.').map(Number);

      return baseParts[0] === availableParts[0] &&
        baseParts[1] === availableParts[1] &&
        availableParts[2] >= baseParts[2];
    }

    return required === available;
  }

  static generateModId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  static sanitizeModName(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '').trim();
  }

  static getModPriority(mod: ModInstance): number {
    const loadOrder = mod.metadata.loadOrder || 0;
    const isFramework = mod.metadata.category.toString() === 'framework' ? 1000 : 0;
    const isLibrary = mod.metadata.category.toString() === 'library' ? 500 : 0;
    const dependencyCount = mod.dependencies.size * 10;

    return loadOrder + isFramework + isLibrary + dependencyCount;
  }

  static async discoverMods(directory: string): Promise<string[]> {
    const modPaths: string[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const modPath = path.join(directory, entry.name);
          const metadataPath = path.join(modPath, 'mod.json');

          try {
            await fs.access(metadataPath);
            modPaths.push(modPath);
          } catch {
            // mod.json doesn't exist, skip this directory
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to discover mods in directory ${directory}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return modPaths;
  }

  static async createModTemplate(
    directory: string,
    options: {
      id: string;
      name: string;
      version?: string;
      author?: string;
      description?: string;
      category?: string;
    }
  ): Promise<void> {
    const modPath = path.join(directory, options.id);

    await fs.mkdir(modPath, { recursive: true });

    const metadata: Partial<ModMetadata> = {
      id: options.id,
      name: options.name,
      version: options.version || '1.0.0',
      description: options.description || 'A new mod',
      author: options.author || 'Unknown',
      tags: [],
      category: options.category as any || 'content',
      compatibility: {
        gameVersion: '1.0.0',
        frameworkVersion: '1.0.0'
      },
      dependencies: [],
      entryPoint: 'index.js',
      permissions: []
    };

    const metadataPath = path.join(modPath, 'mod.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const entryPointContent = `
// ${options.name} - Entry Point
// This is the main entry point for your mod

module.exports = {
  // Called when the mod is loaded
  initialize: async function(context) {
    context.logger.info('${options.name} mod initialized');

    // Your initialization code here
  },

  // Called when the mod is unloaded
  cleanup: async function() {
    console.log('${options.name} mod cleaned up');

    // Your cleanup code here
  }
};
`;

    const entryPointPath = path.join(modPath, 'index.js');
    await fs.writeFile(entryPointPath, entryPointContent.trim());

    const readmeContent = `# ${options.name}

${options.description || 'A new mod for the Steam Simulation Toolkit'}

## Installation

1. Copy this folder to your mods directory
2. Enable the mod in the mod manager

## Configuration

No configuration options available.

## Features

- Feature 1
- Feature 2

## Changelog

### 1.0.0
- Initial release
`;

    const readmePath = path.join(modPath, 'README.md');
    await fs.writeFile(readmePath, readmeContent.trim());
  }

  static extractDependencies(mod: ModInstance): ModDependency[] {
    return mod.metadata.dependencies.filter(dep => !dep.optional);
  }

  static extractOptionalDependencies(mod: ModInstance): ModDependency[] {
    return mod.metadata.dependencies.filter(dep => dep.optional);
  }

  static calculateModSize(modPath: string): Promise<number> {
    return this.calculateDirectorySize(modPath);
  }

  private static async calculateDirectorySize(dirPath: string): Promise<number> {
    let size = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          size += await this.calculateDirectorySize(fullPath);
        } else {
          const stat = await fs.stat(fullPath);
          size += stat.size;
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return size;
  }

  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  static isModSecure(mod: ModInstance): boolean {
    const dangerousPermissions = [
      PermissionType.PROCESS_SPAWN,
      PermissionType.NATIVE_MODULE,
      PermissionType.ENVIRONMENT_ACCESS,
      PermissionType.REGISTRY_WRITE
    ];

    return !mod.metadata.permissions.some(p =>
      dangerousPermissions.includes(p.type)
    );
  }

  static getModRisks(mod: ModInstance): string[] {
    const risks: string[] = [];

    for (const permission of mod.metadata.permissions) {
      switch (permission.type) {
        case PermissionType.PROCESS_SPAWN:
          risks.push('Can execute external processes');
          break;
        case PermissionType.NATIVE_MODULE:
          risks.push('Can load native modules');
          break;
        case PermissionType.FILE_WRITE:
          risks.push('Can write files to disk');
          break;
        case PermissionType.NETWORK_ACCESS:
          risks.push('Can access network resources');
          break;
        case PermissionType.ENVIRONMENT_ACCESS:
          risks.push('Can access environment variables');
          break;
        case PermissionType.REGISTRY_WRITE:
          risks.push('Can modify mod registry');
          break;
      }
    }

    if (mod.sandbox && !mod.sandbox.isSecure) {
      risks.push('Runs without sandbox protection');
    }

    return risks;
  }

  static createModFingerprint(mod: ModInstance): string {
    const content = JSON.stringify({
      id: mod.metadata.id,
      version: mod.metadata.version,
      dependencies: mod.metadata.dependencies,
      permissions: mod.metadata.permissions,
      entryPoint: mod.metadata.entryPoint
    });

    return this.simpleHash(content);
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  static async backupMod(mod: ModInstance, backupDir: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${mod.metadata.id}_${mod.metadata.version}_${timestamp}`;
    const backupPath = path.join(backupDir, backupName);

    await fs.mkdir(backupPath, { recursive: true });

    const modDir = path.dirname(mod.metadata.entryPoint);
    await this.copyDirectory(modDir, backupPath);

    const backupInfo = {
      modId: mod.metadata.id,
      version: mod.metadata.version,
      timestamp: Date.now(),
      originalPath: modDir,
      metadata: mod.metadata,
      config: mod.config
    };

    await fs.writeFile(
      path.join(backupPath, 'backup-info.json'),
      JSON.stringify(backupInfo, null, 2)
    );

    return backupPath;
  }

  private static async copyDirectory(source: string, destination: string): Promise<void> {
    await fs.mkdir(destination, { recursive: true });

    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        await fs.copyFile(sourcePath, destPath);
      }
    }
  }

  static parseModMetadata(content: string): ModMetadata {
    try {
      const metadata = JSON.parse(content);
      return this.normalizeMetadata(metadata);
    } catch (error) {
      throw new Error(`Invalid mod metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static normalizeMetadata(metadata: any): ModMetadata {
    return {
      id: metadata.id || '',
      name: metadata.name || '',
      version: metadata.version || '1.0.0',
      description: metadata.description || '',
      author: metadata.author || 'Unknown',
      homepage: metadata.homepage,
      repository: metadata.repository,
      license: metadata.license,
      tags: metadata.tags || [],
      category: metadata.category || 'content',
      compatibility: metadata.compatibility || {
        gameVersion: '1.0.0',
        frameworkVersion: '1.0.0'
      },
      dependencies: metadata.dependencies || [],
      optionalDependencies: metadata.optionalDependencies,
      conflicts: metadata.conflicts,
      provides: metadata.provides,
      loadOrder: metadata.loadOrder,
      entryPoint: metadata.entryPoint || 'index.js',
      assets: metadata.assets,
      permissions: metadata.permissions || [],
      configuration: metadata.configuration,
      hooks: metadata.hooks
    };
  }

  static validateModStructure(modPath: string): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Add validation logic here

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  static async getModStats(mod: ModInstance): Promise<{
    size: number;
    fileCount: number;
    dependencies: number;
    permissions: number;
    isSecure: boolean;
  }> {
    const modDir = path.dirname(mod.metadata.entryPoint);
    const size = await this.calculateModSize(modDir);
    const fileCount = await this.countFiles(modDir);

    return {
      size,
      fileCount,
      dependencies: mod.metadata.dependencies.length,
      permissions: mod.metadata.permissions.length,
      isSecure: this.isModSecure(mod)
    };
  }

  private static async countFiles(dirPath: string): Promise<number> {
    let count = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          count += await this.countFiles(path.join(dirPath, entry.name));
        } else {
          count++;
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return count;
  }
}