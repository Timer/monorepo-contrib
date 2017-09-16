import * as tmp from 'tmp'
import { execSync } from './util/exec'
import { build } from 'monorepo-build'
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
    userName = undefined as string | undefined,
    userEmail = undefined as string | undefined,
    packagesDirectory = './packages/',
    exclude = [] as string[],
    preRepkg = function(cwd: string) {},
    postRepkg = function(cwd: string) {},

    prePublish = function(cwd: string) {},
    postPublish = function(cwd: string) {},
    npmToken = null as string | null,

    lernaPath = './node_modules/.bin/lerna',
  } = {}
) {
  const { name: cwd } = tmp.dirSync()
  const packages = build(cwd, cloneUrl, sha, {
    userName,
    userEmail,
    packagesDirectory,
    exclude,
    preRepkg,
    postRepkg,
  })

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
    `${lernaPath} publish --independent --exact --force-publish=* --cd-version=prepatch --preid=${sha.slice(
      0,
      7
    )} --yes --skip-git --npm-tag=${tagname}`
  )
  debug('(ok)')

  debug('calling postPublish ...')
  postPublish(cwd)
  debug('(ok)')
}
