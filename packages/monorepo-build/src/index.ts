import { execSync } from './util/exec'
import { repkg } from 'monorepo-repkg'
import { getPackages } from 'monorepo-repkg/lib/util/packages'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as Debug from 'debug'

const debug = Debug('monorepo-build')

export function build(
  directory: string,
  cloneUrl: string,
  sha: string,
  {
    userName = 'monorepo-build',
    userEmail = 'monorepo-build@hostname.local',
    packagesDirectory = './packages/',
    exclude = [] as string[],

    preRepkg = function(cwd: string) {},
    postRepkg = function(cwd: string) {},
  } = {}
) {
  debug(`cloning ${cloneUrl} into ${directory} ...`)
  execSync(directory, `git clone ${cloneUrl} .`)
  debug(`(ok)`)
  const pkgs = path.resolve(directory, packagesDirectory)
  debug(`setting commit user ...`)
  execSync(directory, `git config user.name "${userName}"`)
  execSync(directory, `git config user.email "${userEmail}"`)
  debug(`(ok)`)
  debug(`checking out ${sha} ...`)
  execSync(directory, `git reset --hard ${sha}`)
  debug(`(ok)`)

  debug(`getting packages ...`)
  const _packages = getPackages(pkgs)
  debug(`-> packages: ${_packages.map(({ name }) => name).join(', ')}`)

  _packages
    .filter(({ name }) => exclude.includes(name))
    .forEach(({ name, directory }) => {
      debug(`\t removing ${name} ...`)
      fs.removeSync(directory)
      debug('(ok)')
    })

  debug('calling preRepkg ...')
  preRepkg(directory)
  debug('(ok)')

  debug('calling repkg ...')
  repkg(pkgs)
  debug('(ok)')

  debug('calling postRepkg ...')
  postRepkg(directory)
  debug('(ok)')

  debug(`committing changes ...`)
  execSync(directory, 'git add -A')
  execSync(directory, 'git commit -m "chore: alias packages"')
  debug('(ok)')

  return getPackages(pkgs)
}
