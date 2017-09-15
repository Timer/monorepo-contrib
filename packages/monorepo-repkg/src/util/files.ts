import { lstatSync, readdirSync } from 'fs'
import * as path from 'path'
import * as globby from 'globby'

export const isDirectory = (directoryPath: string) =>
  lstatSync(directoryPath).isDirectory()

export const getDirectories = (directoryPath: string) =>
  readdirSync(directoryPath)
    .map(name => path.join(directoryPath, name))
    .filter(isDirectory)

export const getFiles = (
  directory: string,
  {
    includes = ['**/*.js'],
    excludes = [
      'node_modules/**',
      '**/__tests__/**',
      'lib/**',
      '**/fixtures/**',
    ],
  } = {}
) =>
  globby.sync([...includes, ...excludes.map(s => `!${s}`)], {
    cwd: directory,
  })
