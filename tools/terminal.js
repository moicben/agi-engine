// Terminal utilities for the brain module

export async function executeCommand(command) {
    // Basic command execution
    console.log(`Executing command: ${command}`);
    return `Command executed: ${command}`;
}

export async function getSystemInfo() {
    // Get basic system information
    return {
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage()
    };
}

export async function listDirectory(path = '.') {
    // List directory contents
    const fs = await import('fs/promises');
    try {
        const files = await fs.readdir(path);
        return files;
    } catch (error) {
        return `Error reading directory: ${error.message}`;
    }
}

// Parse JSON safely from object or string; return null on failure
export function parseJSONSafe(input) {
    if (input == null) return null;
    if (typeof input === 'object') return input;
    try {
        return JSON.parse(input);
    } catch {
        return null;
    }
}
