import { repkg } from './index'
import * as tmp from 'tmp'
import { copySync, readFileSync } from 'fs-extra'
import * as path from 'path'

import { getFiles as _getFiles } from './util/files'

const getFiles = (dir: string) =>
  _getFiles(dir, {
    includes: ['**/*.*'],
  })

describe('repkg', () => {
  it('should purely repackage a repo', () => {
    const pkgs = path.resolve(__dirname, '..', 'fixtures', 'packages')
    const sources = getFiles(pkgs)

    const { name: directory } = tmp.dirSync()
    copySync(pkgs, directory, {
      errorOnExist: true,
      recursive: true,
    })

    // Capture source files
    expect(
      sources.map(name => readFileSync(path.resolve(pkgs, name), 'utf8'))
    ).toMatchSnapshot()

    repkg(directory)

    // Ensure source files left alone
    expect(
      sources.map(name => readFileSync(path.resolve(pkgs, name), 'utf8'))
    ).toMatchSnapshot()

    // Ensure target was repackaged
    expect(
      getFiles(directory).map(name =>
        readFileSync(path.resolve(directory, name), 'utf8')
      )
    ).toMatchSnapshot()
  })
})
