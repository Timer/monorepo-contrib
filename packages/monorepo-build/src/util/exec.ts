import { execSync as _execSync } from 'child_process'

export const execSync = (cwd: string, command: string) =>
  _execSync(command, { cwd })
