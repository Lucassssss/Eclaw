import { tool } from 'ai';
import { z } from 'zod';
import { createBashTool } from "bash-tool";
import { Bash } from "just-bash";
import path from 'node:path';
import { ReadWriteFs } from "just-bash";

const bashInstances = new Map();
const PROJECT_ROOT = path.resolve(import.meta.dir, '../../../../');

const rwfs = new ReadWriteFs({ root: path.join(PROJECT_ROOT, 'friend-g') });
const sandbox = new Bash({ 
  // cwd: PROJECT_ROOT,
  fs: rwfs,
  network: { dangerouslyAllowFullInternetAccess: true },
  python: true,
  // javascript: true,
  // logger: {
  //   info: console.info,
  //   debug: console.debug,
  // },
});
const { tools } = await createBashTool({
  sandbox,
  // destination: 'friend-g',
  uploadDirectory: {
    source: PROJECT_ROOT,
    include: "**/*.{ts,json,tsx}",
  },
});

export const { bash } = tools;
export const { readFile } = tools;
export const { writeFile } = tools;
