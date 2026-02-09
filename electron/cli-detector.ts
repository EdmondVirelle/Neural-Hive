/**
 * CLI Detector
 *
 * Auto-detects installed AI CLI tools by probing the system PATH
 * using `where` (Windows) or `which` (Unix) and `--version` flags.
 *
 * Supports: claude, gemini, aider, codex, opencode, cursor, copilot
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import type { AgentType, CliInfo, DetectClisResult, AppSettings } from '../src/types/shared.js';

type ExecFileAsyncFn = (cmd: string, args: string[], opts?: { timeout?: number }) =>
    Promise<{ stdout: string; stderr: string }>;

let execFileAsync: ExecFileAsyncFn = promisify(execFile) as unknown as ExecFileAsyncFn;

/** @internal Replace execFileAsync for testing */
export function _setExecFileAsync(fn: ExecFileAsyncFn): void {
    execFileAsync = fn;
}

/** @internal Restore the real execFileAsync */
export function _restoreExecFileAsync(): void {
    execFileAsync = promisify(execFile) as unknown as ExecFileAsyncFn;
}

// CLI definitions: how to find and version-check each tool
interface CliDefinition {
    type: AgentType;
    name: string;
    /** Primary command to look for */
    command: string;
    /** Alternative commands (e.g., 'gh copilot' needs 'gh') */
    altCommands?: string[];
    /** Args to get version string */
    versionArgs: string[];
    /** Regex to extract version from output */
    versionRegex: RegExp;
}

const CLI_DEFINITIONS: CliDefinition[] = [
    {
        type: 'claude',
        name: 'Claude Code',
        command: 'claude',
        versionArgs: ['--version'],
        versionRegex: /(\d+\.\d+\.\d+)/,
    },
    {
        type: 'gemini',
        name: 'Gemini CLI',
        command: 'gemini',
        versionArgs: ['--version'],
        versionRegex: /(\d+\.\d+\.\d+)/,
    },
    {
        type: 'aider',
        name: 'Aider',
        command: 'aider',
        versionArgs: ['--version'],
        versionRegex: /(\d+\.\d+\.\d+)/,
    },
    {
        type: 'codex',
        name: 'Codex CLI',
        command: 'codex',
        versionArgs: ['--version'],
        versionRegex: /(\d+\.\d+\.\d+)/,
    },
    {
        type: 'opencode',
        name: 'OpenCode',
        command: 'opencode',
        versionArgs: ['--version'],
        versionRegex: /(\d+\.\d+\.\d+)/,
    },
    {
        type: 'cursor',
        name: 'Cursor',
        command: 'cursor',
        versionArgs: ['--version'],
        versionRegex: /(\d+\.\d+\.\d+)/,
    },
    {
        type: 'copilot',
        name: 'GitHub Copilot',
        command: 'gh',
        versionArgs: ['copilot', '--version'],
        versionRegex: /(\d+\.\d+\.\d+)/,
    },
];

const PROBE_TIMEOUT = 5000; // 5 seconds per probe

/**
 * Find the path of a command using `where` (Windows) or `which` (Unix)
 */
async function findCommand(command: string): Promise<string | null> {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    try {
        const { stdout } = await execFileAsync(whichCmd, [command], {
            timeout: PROBE_TIMEOUT,
        });
        const firstLine = stdout.trim().split('\n')[0].trim();
        return firstLine || null;
    } catch {
        return null;
    }
}

/**
 * Get version string from a CLI tool
 */
async function getVersion(
    command: string,
    args: string[],
    versionRegex: RegExp
): Promise<string | null> {
    try {
        const { stdout, stderr } = await execFileAsync(command, args, {
            timeout: PROBE_TIMEOUT,
        });
        const output = stdout + stderr;
        const match = output.match(versionRegex);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * Detect a single CLI tool
 */
async function detectCli(def: CliDefinition, userPath?: string): Promise<CliInfo> {
    const result: CliInfo = {
        type: def.type,
        name: def.name,
        installed: false,
    };

    // Check user-overridden path first
    const commandToCheck = userPath || def.command;
    const foundPath = await findCommand(commandToCheck);

    if (!foundPath && !userPath) {
        return result;
    }

    const execPath = foundPath || commandToCheck;
    result.path = execPath;

    // Try to get version
    const version = await getVersion(execPath, def.versionArgs, def.versionRegex);
    if (version) {
        result.version = version;
    }

    result.installed = true;
    return result;
}

// Session cache
let cachedResult: DetectClisResult | null = null;

/**
 * Detect all installed AI CLI tools
 *
 * @param settings - Optional settings with user-overridden CLI paths
 * @param forceRefresh - Bypass cache and re-detect
 */
export async function detectInstalledClis(
    settings?: AppSettings | null,
    forceRefresh = false
): Promise<DetectClisResult> {
    if (cachedResult && !forceRefresh) {
        return cachedResult;
    }

    const userPaths = settings?.cliPaths || {};

    const results = await Promise.all(
        CLI_DEFINITIONS.map((def) =>
            detectCli(def, userPaths[def.type])
        )
    );

    cachedResult = {
        clis: results,
        timestamp: Date.now(),
    };

    return cachedResult;
}

/**
 * Clear the detection cache
 */
export function clearCliCache(): void {
    cachedResult = null;
}

/**
 * Get CLI definitions (for UI display)
 */
export function getCliDefinitions(): { type: AgentType; name: string; command: string }[] {
    return CLI_DEFINITIONS.map((d) => ({
        type: d.type,
        name: d.name,
        command: d.command,
    }));
}
