import { publish } from './index'

jest.mock('./util/exec', () => {
  const { execSync: _execSync } = require('child_process')
  return {
    calls: [] as { command: string }[],
    execSync(cwd: string, command: string) {
      this.calls.push({ command })
      if (!command.includes('lerna')) {
        return _execSync(command, { cwd })
      }
      // TODO: mock git clone
      return _execSync('echo', { cwd })
    },
  }
})

describe('publish', () => {
  it('should publish a project', () => {
    const execUtil = require('./util/exec')
    execUtil.calls = []

    const preRepkg = jest.fn(),
      prePublish = jest.fn(),
      postRepkg = jest.fn(),
      postPublish = jest.fn()

    // TODO: have publish return packages and snapshot that value
    publish(
      'https://github.com/facebookincubator/create-react-app.git',
      'HEAD',
      {
        exclude: ['create-react-app'],
        preRepkg,
        prePublish,
        postRepkg,
        postPublish,
      }
    )

    expect(execUtil.calls).toMatchSnapshot()
    expect(preRepkg.mock.calls.length).toBe(1)
    expect(prePublish.mock.calls.length).toBe(1)
    expect(postRepkg.mock.calls.length).toBe(1)
    expect(postPublish.mock.calls.length).toBe(1)
  })
})
