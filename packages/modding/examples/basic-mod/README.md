# Basic Example Mod

A simple example mod that demonstrates the fundamental concepts of the Steam Simulation Toolkit modding framework.

## What This Mod Does

- Displays a welcome message when loaded
- Registers event handlers for player join/leave events
- Demonstrates hook registration for game events
- Performs periodic updates with configurable intervals
- Shows configuration management and hot-reloading
- Implements proper cleanup when unloaded

## Features Demonstrated

### 1. Mod Lifecycle
- **Initialization**: Sets up the mod when loaded
- **Cleanup**: Properly cleans up resources when unloaded

### 2. Configuration Management
- Reads configuration values with defaults
- Reacts to configuration changes in real-time
- Demonstrates different configuration types (boolean, string, number)

### 3. Event Handling
- Registers event listeners for player events
- Handles mod-specific events

### 4. Hook System
- Registers hooks for game lifecycle events
- Demonstrates how to interact with the game engine

### 5. Logging
- Uses the provided logger for different log levels
- Shows proper logging practices

### 6. Periodic Tasks
- Implements timed updates
- Shows how to manage timers properly

## Configuration Options

The mod supports the following configuration options:

- **enabled** (boolean): Whether the mod is active
- **message** (string): Welcome message to display
- **interval** (number): Update interval in seconds (1-60)

## Installation

1. Copy this folder to your mods directory
2. The mod will be automatically discovered
3. Load it through the mod manager

## Usage

Once loaded, the mod will:

1. Display the configured welcome message
2. Log player join/leave events
3. Perform periodic updates based on the configured interval
4. Respond to configuration changes without requiring a restart

## Code Structure

### mod.json
Contains all the metadata and configuration schema for the mod.

### index.js
The main entry point with:
- `initialize()`: Setup function called when mod loads
- `cleanup()`: Cleanup function called when mod unloads
- Event handlers and hook implementations
- Configuration change handlers

### config.json
Default configuration values and metadata.

## Learning Points

This example demonstrates:

1. **Proper Error Handling**: Graceful handling of configuration and runtime errors
2. **Resource Management**: Proper cleanup of timers and event listeners
3. **Configuration Patterns**: How to use configuration effectively
4. **Event-Driven Architecture**: Working with the framework's event system
5. **Hook Registration**: Integrating with game events
6. **Logging Best Practices**: Using appropriate log levels and structured logging

## Extending This Example

You can extend this mod by:

1. Adding more hook handlers
2. Implementing asset loading
3. Adding more configuration options
4. Creating custom events
5. Adding dependency management
6. Implementing storage usage

## Next Steps

After understanding this basic example, you can:

1. Look at the advanced example for more complex scenarios
2. Study the API documentation for available hooks and events
3. Create your own mod using this as a template
4. Explore other example mods in this directory