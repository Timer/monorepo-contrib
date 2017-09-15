import { readFileSync } from 'fs'
import * as babylon from 'babylon'
import {
  File,
  Node,
  Statement,
  CallExpression,
  MemberExpression,
} from 'babel-types'
import { NodePath } from 'babel-traverse'
import { PackageRename } from './packages'
import generator from 'babel-generator'
import * as prettier from 'prettier'
import * as Debug from 'debug'

const debug = Debug('monorepo-repkg')

export function getAst(filePath: string) {
  const code = readFileSync(filePath, 'utf8')
  const ast = babylon.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'flow', 'objectRestSpread', 'classProperties'],
  })
  return { code, ast }
}

export function isRequire(path: NodePath<Node>) {
  const { type } = path
  if (type !== 'CallExpression') {
    return false
  }

  const node = path.node as CallExpression
  const callee = node.callee
  const arg = node.arguments[0]

  // Check for require(...) or require.func(...)
  if (
    !(
      ((callee.type === 'Identifier' && callee.name === 'require') ||
        (callee.type === 'MemberExpression' &&
          (callee.object as any).name === 'require')) &&
      arg
    )
  ) {
    return false
  }

  return true
}

export function rewriteRequireNode(
  node: CallExpression,
  packageAliases: PackageRename[],
  { fileName = '...' } = {}
) {
  const { arguments: args } = node
  const arg: any = args[0]

  if (arg.type === 'StringLiteral') {
    const orig = arg.value
    let changed = false
    for (const { oldName, newName } of packageAliases) {
      const temp = arg.value
      arg.value = arg.value.replace(oldName, newName)
      if (temp !== arg.value) {
        if (changed) {
          throw new Error('Unstable package replace')
        }
        changed = true

        debug(`${fileName}: ${orig} -> ${arg.value}`)
      }
    }

    return changed
  }

  // TODO: extract this to a passed in function
  // This is a safe require, it's our paths module which does not change.
  // There are other keys, too, I know are safe to ignore (e.g. json files).
  if (
    arg.name === 'packagePath' ||
    arg.name === 'appPackageJson' ||
    arg.name === 'templateDependenciesPath' ||
    (arg.type === 'CallExpression' &&
      arg.arguments[arg.arguments.length - 1] &&
      arg.arguments[arg.arguments.length - 1].value === 'package.json') ||
    (arg.object && arg.object.name === 'paths') ||
    (arg.type === 'BinaryExpression' && arg.left.value.startsWith('..'))
  ) {
    return false
  }

  throw new Error('Require must be a string literal.')
}

export function getCode(ast: File, originalCode: string) {
  let { code } = generator(
    ast,
    {
      sourceMaps: false,
      comments: true,
      retainLines: true,
      compact: false,
      concise: true,
    },
    originalCode
  )

  code = prettier.format(code, {
    singleQuote: true,
    trailingComma: 'es5',
  })

  return (
    code
      // Fix bash comments mangled by Babel module mode
      .replace('///usr/bin/env node', '#!/usr/bin/env node')
  )
}
