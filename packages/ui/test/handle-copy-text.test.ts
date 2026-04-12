import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { handleCopyText } from '../src/lib/handle-copy-text'

const originalDocument = globalThis.document
const originalNavigator = globalThis.navigator

describe('handleCopyText', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: undefined,
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
      writable: true,
    })
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
      writable: true,
    })
  })

  test('uses navigator.clipboard.writeText when available', async () => {
    const writeText = mock(async () => undefined)

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText,
        },
      },
      writable: true,
    })

    await handleCopyText('wallet-address')

    expect(writeText).toHaveBeenCalledWith('wallet-address')
  })

  test('falls back to document.execCommand when clipboard api is unavailable', async () => {
    const appendChild = mock(() => undefined)
    const execCommand = mock(() => true)
    const removeChild = mock(() => undefined)
    const select = mock(() => undefined)
    const setSelectionRange = mock(() => undefined)
    const setAttribute = mock(() => undefined)

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        body: {
          appendChild,
          removeChild,
        },
        createElement: mock(() => ({
          select,
          setAttribute,
          setSelectionRange,
          style: {},
          value: '',
        })),
        execCommand,
      },
      writable: true,
    })

    await handleCopyText('community_01')

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(appendChild).toHaveBeenCalledTimes(1)
    expect(removeChild).toHaveBeenCalledTimes(1)
    expect(select).toHaveBeenCalledTimes(1)
    expect(setSelectionRange).toHaveBeenCalledWith(0, 'community_01'.length)
  })

  test('removes the fallback textarea when copy selection throws', async () => {
    const appendChild = mock(() => undefined)
    const removeChild = mock(() => undefined)
    const select = mock(() => {
      throw new Error('selection failed')
    })
    const setAttribute = mock(() => undefined)

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        body: {
          appendChild,
          removeChild,
        },
        createElement: mock(() => ({
          select,
          setAttribute,
          setSelectionRange: mock(() => undefined),
          style: {},
          value: '',
        })),
        execCommand: mock(() => true),
      },
      writable: true,
    })

    await expect(handleCopyText('community_02')).rejects.toThrow('selection failed')
    expect(removeChild).toHaveBeenCalledTimes(1)
  })
})
