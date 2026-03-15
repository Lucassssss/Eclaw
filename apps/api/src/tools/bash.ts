import { tool } from 'ai';
import { z } from "zod";
import { Bash } from "just-bash";
import { ReadWriteFs } from "just-bash";
import path from 'node:path';
import fs from 'node:fs';
import { tmpdir } from 'node:os';

const friendGDir = path.join(tmpdir(), 'friend-g');
if (!fs.existsSync(friendGDir)) {
  fs.mkdirSync(friendGDir, { recursive: true });
}

console.log('friendGDir:', friendGDir);

const rwfs = new ReadWriteFs({ root: friendGDir });
const sandbox = new Bash({
  fs: rwfs,
  network: {
    dangerouslyAllowFullInternetAccess: true,
    allowedMethods: ["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
  },
  python: true,
  logger: {
    info: console.info,
    debug: console.debug,
  },
});

export const bash = tool({
  description: 'Execute bash commands in a sandboxed environment',
  inputSchema: z.object({
    command: z.string().describe('The bash command to execute'),
  }),
  execute: async ({ command }: { command: string }) => {
    const result = await sandbox.exec(command);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  },
});
