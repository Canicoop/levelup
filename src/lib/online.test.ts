import { afterEach, describe, expect, it } from 'vitest'
import { onlineManager } from '@tanstack/react-query'
import { startOnlineFromNavigator } from '@/lib/online'

describe('startOnlineFromNavigator', () => {
  afterEach(() => {
    onlineManager.setOnline(true)
  })

  it('starts offline when the app opens without network', () => {
    // TanStack's own default, which is the bug: online, whatever the device says.
    expect(onlineManager.isOnline()).toBe(true)
    startOnlineFromNavigator(onlineManager, { onLine: false })
    expect(onlineManager.isOnline()).toBe(false)
  })

  it('stays online with network', () => {
    startOnlineFromNavigator(onlineManager, { onLine: true })
    expect(onlineManager.isOnline()).toBe(true)
  })

  it('changes nothing where there is no navigator', () => {
    startOnlineFromNavigator(onlineManager, undefined)
    expect(onlineManager.isOnline()).toBe(true)
  })
})
