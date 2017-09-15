import * as GhApi from 'github'

const github = new GhApi({})
const { promisify } = require('util')

export default (owner: string, repo: string) => {
  return {
    authenticate(token: string) {
      github.authenticate({
        type: 'token',
        token,
      })
    },
    getCommits(per_page = 1) {
      return promisify(github.repos.getCommits)({
        owner,
        repo,
        per_page,
      })
    },
    getStatus(ref: string) {
      return promisify(github.repos.getCombinedStatusForRef)({
        owner,
        repo,
        ref,
      })
    },
    getPulls(
      {
        state = 'open',
        sort = 'updated',
        direction = 'desc',
        per_page = 10,
      } = {}
    ) {
      return promisify(github.pullRequests.getAll)({
        owner,
        repo,
        state,
        sort,
        per_page,
        direction,
      })
    },
    getPull(number: number) {
      return promisify(github.pullRequests.get)({
        owner,
        repo,
        number,
      })
    },
    getFiles(number: number, { per_page = 100 } = {}) {
      return promisify(github.pullRequests.getFiles)({
        owner,
        repo,
        per_page,
        number,
      })
    },
    getComments(number: number, { per_page = 100 } = {}) {
      return promisify(github.issues.getComments)({
        owner,
        repo,
        per_page,
        number,
      })
    },
    createComment(number: number, body: string) {
      return promisify(github.issues.createComment)({
        owner,
        repo,
        number,
        body,
      })
    },
  }
}
