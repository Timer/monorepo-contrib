import { lstatSync, readFileSync, writeFileSync, renameSync } from 'fs'
import { isDirectory, getDirectories, getFiles } from './files'
import * as path from 'path'
import { getAst, isRequire, rewriteRequireNode, getCode } from './ast'
import traverse from 'babel-traverse'
import { CallExpression } from 'babel-types'

export const getPackages = (directoryPath: string) =>
  getDirectories(directoryPath)
    .filter(directory => {
      try {
        return lstatSync(path.join(directory, 'package.json')).isFile()
      } catch (e) {
        if (e.code === 'ENOENT') {
          return false
        }
        throw e
      }
    })
    .map(directory => ({
      name: require(path.join(directory, 'package.json')).name as string,
      directory,
    }))
    .filter(({ name }) => name != null)

export type Package = { directory: string }

export type PackageRename = {
  oldName: string
  newName: string
} & Package

export const renamePackages = (packages: PackageRename[]) => {
  for (const { directory, oldName, newName } of packages) {
    const packagePath = path.resolve(directory, 'package.json')
    const json = JSON.parse(readFileSync(packagePath, 'utf8'))
    if (json.name !== oldName) {
      throw new Error(`Package name mismatch: ${json.name} !== ${oldName}`)
    }
    json.name = newName
    const pkgObjs = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]
    for (const key of pkgObjs) {
      if (json[key] == null) {
        continue
      }
      for (const { oldName, newName } of packages) {
        if (json[key][oldName] == null) {
          continue
        }
        json[key][newName] = json[key][oldName]
        delete json[key][oldName]
      }
    }
    writeFileSync(packagePath, JSON.stringify(json, null, 2) + '\n')
  }
}

export const repackagePackages = (
  packagesDirectory: string,
  packages: PackageRename[]
) => {
  if (!isDirectory(packagesDirectory)) {
    return false
  }
  for (const { directory, oldName, newName } of packages) {
    const oldDirectory = path.join(packagesDirectory, oldName)
    if (path.relative(directory, oldDirectory) !== '') {
      throw new Error(`Path mismatch: ${directory} !== ${oldDirectory}`)
    }
    renameSync(oldDirectory, path.join(packagesDirectory, newName))
  }
  return true
}

export const rewriteRequires = (packages: PackageRename[]) => {
  for (const { directory } of packages) {
    const files = getFiles(directory)

    for (const file of files) {
      const filePath = path.join(directory, file)
      const { ast, code: origCode } = getAst(filePath)
      let changedFile = false
      traverse(ast, {
        enter(path) {
          if (!isRequire(path)) {
            return
          }

          if (
            rewriteRequireNode(path.node as CallExpression, packages, {
              fileName: file,
            })
          ) {
            changedFile = true
          }
        },
      })

      if (!changedFile) {
        continue
      }

      const outCode = getCode(ast, origCode)
      writeFileSync(filePath, outCode)
    }
  }
}
