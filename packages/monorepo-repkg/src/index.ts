import {
  getPackages,
  renamePackages,
  rewriteRequires,
  repackagePackages,
  PackageRename,
} from './util/packages'

export function repkg(
  directory: string,
  { suffix = 'dangerous', exclude = [] as string[] } = {}
) {
  const packages: PackageRename[] = getPackages(directory)
    .filter(({ name }) => exclude.indexOf(name) === -1)
    .map(({ name, directory }) => ({
      oldName: name,
      newName: `${name}-${suffix}`,
      directory,
    }))

  renamePackages(packages)
  rewriteRequires(packages)
  repackagePackages(directory, packages)

  return getPackages(directory).filter(
    ({ name }) => exclude.indexOf(name) === -1
  )
}
