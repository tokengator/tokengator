import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'

const SDK_PACKAGE_DIR = resolve(import.meta.dir, '..')

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

function findResultLine(output: string) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .findLast((line) => line.startsWith('RESULT:'))
}

function runSiwsLoginCheck(user: 'alice' | 'bob') {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './test-e2e/siws-login-check.ts', user],
    cwd: SDK_PACKAGE_DIR,
    stderr: 'pipe',
    stdout: 'pipe',
  })
  const output = [decodeOutput(result.stdout), decodeOutput(result.stderr)].filter(Boolean).join('\n')

  expect(result.exitCode).toBe(0)

  const resultLine = findResultLine(output)

  if (!resultLine) {
    throw new Error(`Missing RESULT output from SIWS login check.\n${output}`)
  }

  return JSON.parse(resultLine.slice('RESULT:'.length)) as {
    sessionUser: {
      id: string
      role: string
      username: string
    }
    userCount: number
    verificationUser: {
      id: string
      walletAddress: string
    }
    wallets: {
      address: string
      displayName: string
      id: string
      isPrimary: boolean
      name: string | null
    }[]
  }
}

describe('seeded SIWS login', () => {
  test('Alice signs in with her seeded Solana wallet and resolves to the seeded admin user', () => {
    const result = runSiwsLoginCheck('alice')

    expect(result.userCount).toBe(3)
    expect(result.sessionUser).toMatchObject({
      id: result.verificationUser.id,
      role: 'admin',
      username: 'alice',
    })
    expect(result.verificationUser).toMatchObject({
      walletAddress: 'ALiC98dw6j47Skrxje3zBN4jTA11w67JRjQRBeZH3BRG',
    })
    expect(result.wallets).toEqual([
      {
        address: 'ALiC98dw6j47Skrxje3zBN4jTA11w67JRjQRBeZH3BRG',
        displayName: 'ALiC98…ZH3BRG',
        id: expect.any(String),
        isPrimary: true,
        name: null,
      },
    ])
  })

  test('Bob signs in with his seeded Solana wallet and resolves to the seeded non-admin user', () => {
    const result = runSiwsLoginCheck('bob')

    expect(result.userCount).toBe(3)
    expect(result.sessionUser).toMatchObject({
      id: result.verificationUser.id,
      role: 'user',
      username: 'bob',
    })
    expect(result.verificationUser).toMatchObject({
      walletAddress: 'BoBigKFEgt5izFVmpZAqnHDjNXNMYFbYrbiXy4EkfJDE',
    })
    expect(result.wallets).toEqual([
      {
        address: 'BoBigKFEgt5izFVmpZAqnHDjNXNMYFbYrbiXy4EkfJDE',
        displayName: 'BoBigK…EkfJDE',
        id: expect.any(String),
        isPrimary: true,
        name: null,
      },
    ])
  })
})
