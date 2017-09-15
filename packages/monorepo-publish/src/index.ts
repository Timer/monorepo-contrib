import * as tmp from 'tmp'
import { execSync } from './util/exec'
import { repkg } from 'monorepo-repkg'
import { getPackages } from 'monorepo-repkg/lib/util/packages'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as Debug from 'debug'

const debug = Debug('monorepo-publish')

export function publish(
  cloneUrl: string,
  sha: string,
  {
    tagname = 'contrib',
    userName = 'monorepo-publish',
    userEmail = 'monorepo-publish@hostname.local',
    packagesDirectory = './packages/',
    exclude = [] as string[],

    preRepkg = function(cwd: string) {},
    postRepkg = function(cwd: string) {},
    prePublish = function(cwd: string) {},
    postPublish = function(cwd: string) {},
    npmToken = null as string | null,
  } = {}
) {
  const { name: cwd } = tmp.dirSync()

  debug(`cloning ${cloneUrl} into ${cwd} ...`)
  execSync(cwd, `git clone ${cloneUrl} .`)
  debug(`(ok)`)
  const pkgs = path.resolve(cwd, packagesDirectory)
  debug(`setting commit user ...`)
  execSync(cwd, `git config user.name "${userName}"`)
  execSync(cwd, `git config user.email "${userEmail}"`)
  debug(`(ok)`)
  debug(`checking out ${sha} ...`)
  execSync(cwd, `git reset --hard ${sha}`)
  debug(`(ok)`)

  debug(`getting packages ...`)
  const packages = getPackages(pkgs)
  debug(`-> packages: ${packages.map(({ name }) => name).join(', ')}`)

  packages
    .filter(({ name }) => exclude.includes(name))
    .forEach(({ name, directory }) => {
      debug(`\t removing ${name} ...`)
      fs.removeSync(directory)
      debug('(ok)')
    })

  debug('calling preRepkg ...')
  preRepkg(cwd)
  debug('(ok)')

  debug('calling repkg ...')
  repkg(pkgs)
  debug('(ok)')

  debug('calling postRepkg ...')
  postRepkg(cwd)
  debug('(ok)')

  debug(`committing changes ...`)
  execSync(cwd, 'git add -A')
  execSync(cwd, 'git commit -m "chore: alias packages"')
  debug('(ok)')

  debug('calling prePublish ...')
  prePublish(cwd)
  debug('(ok)')

  if (npmToken != null) {
    for (const { name, directory } of packages) {
      debug(`creating .npmrc for ${name} ...`)
      fs.writeFileSync(
        path.resolve(directory, '.npmrc'),
        '//registry.npmjs.org/:_authToken=${npmToken}'
      )
    }
  }
  debug('publishing ...')
  execSync(
    cwd,
    `./node_modules/.bin/lerna publish --independent --exact --force-publish=* --cd-version=prepatch --preid=${sha.slice(
      0,
      7
    )} --yes --skip-git --npm-tag=${tagname}`
  )
  debug('(ok)')

  debug('calling postPublish ...')
  postPublish(cwd)
  debug('(ok)')
}
