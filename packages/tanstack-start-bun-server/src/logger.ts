export interface Logger {
  debug(message: unknown, ...args: unknown[]): void
  error(message: unknown, ...args: unknown[]): void
  info(message: unknown, ...args: unknown[]): void
}

export function createConsoleLogger(): Logger {
  return {
    debug(message, ...args) {
      console.log('DBG', message, ...args)
    },
    error(message, ...args) {
      console.error('ERR', message, ...args)
    },
    info(message, ...args) {
      console.log('INF', message, ...args)
    },
  }
}
