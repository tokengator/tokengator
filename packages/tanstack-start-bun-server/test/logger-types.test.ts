import { expect, test } from 'bun:test'
import { getAppLogger } from '@tokengator/logger'
import { DEFAULT_GZIP_MIME_TYPES, createConsoleLogger, type Logger } from '../src/index'

const appLogger: Logger = getAppLogger('api', 'web-server')
const consoleLogger: Logger = createConsoleLogger()

test('logger types accept tokengator and console implementations', () => {
  appLogger.info('app logger is assignable')
  consoleLogger.info('console logger is assignable')

  expect(typeof appLogger.info).toBe('function')
  expect(typeof consoleLogger.info).toBe('function')
})

test('createConsoleLogger prefixes debug, error, and info output', () => {
  const calls: Array<{ args: unknown[]; method: 'error' | 'log' }> = []
  const originalConsoleError = console.error
  const originalConsoleLog = console.log
  const logger = createConsoleLogger()

  console.log = (...args: unknown[]) => {
    calls.push({
      args,
      method: 'log',
    })
  }
  console.error = (...args: unknown[]) => {
    calls.push({
      args,
      method: 'error',
    })
  }

  try {
    logger.debug('debug message', 1)
    logger.error('error message', 2)
    logger.info('info message', 3)
  } finally {
    console.error = originalConsoleError
    console.log = originalConsoleLog
  }

  expect(calls).toEqual([
    {
      args: ['DBG', 'debug message', 1],
      method: 'log',
    },
    {
      args: ['ERR', 'error message', 2],
      method: 'error',
    },
    {
      args: ['INF', 'info message', 3],
      method: 'log',
    },
  ])
})

test('DEFAULT_GZIP_MIME_TYPES is exported for composition', () => {
  expect(DEFAULT_GZIP_MIME_TYPES).toEqual([
    'application/javascript',
    'application/json',
    'application/xml',
    'image/svg+xml',
    'text/',
  ])
})
