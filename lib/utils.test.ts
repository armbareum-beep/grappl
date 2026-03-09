import { describe, it, expect, vi } from 'vitest'

vi.mock('./react-query', () => ({ queryClient: { clear: vi.fn() } }))

import { upgradeThumbnailQuality, getOptimizedThumbnail, hasHighlight } from './utils'

describe('upgradeThumbnailQuality', () => {
  it('returns placeholder for null input', () => {
    expect(upgradeThumbnailQuality(null)).toBe('/placeholder-thumbnail.png')
  })

  it('returns placeholder for undefined input', () => {
    expect(upgradeThumbnailQuality(undefined)).toBe('/placeholder-thumbnail.png')
  })

  it('upgrades _640 vimeocdn thumbnail to _1280', () => {
    const input = 'https://i.vimeocdn.com/video/abc_640.jpg'
    expect(upgradeThumbnailQuality(input)).toBe('https://i.vimeocdn.com/video/abc_1280.jpg')
  })

  it('upgrades WxH format vimeocdn thumbnail to _1280', () => {
    const input = 'https://i.vimeocdn.com/video/abc_200x150.jpg'
    expect(upgradeThumbnailQuality(input)).toBe('https://i.vimeocdn.com/video/abc_1280.jpg')
  })

  it('passes non-vimeo URLs through unchanged', () => {
    const url = 'https://example.com/thumb.jpg'
    expect(upgradeThumbnailQuality(url)).toBe(url)
  })
})

describe('getOptimizedThumbnail', () => {
  it('returns placeholder for null input', () => {
    expect(getOptimizedThumbnail(null)).toBe('/placeholder-thumbnail.png')
  })

  it('returns 640 size for small', () => {
    const input = 'https://i.vimeocdn.com/video/abc_1920.jpg'
    expect(getOptimizedThumbnail(input, 'small')).toContain('_640.')
  })

  it('returns 960 size for medium (default)', () => {
    const input = 'https://i.vimeocdn.com/video/abc_1920.jpg'
    expect(getOptimizedThumbnail(input)).toContain('_960.')
  })

  it('returns 1280 size for large', () => {
    const input = 'https://i.vimeocdn.com/video/abc_640.jpg'
    expect(getOptimizedThumbnail(input, 'large')).toContain('_1280.')
  })

  it('passes non-vimeo URLs through unchanged', () => {
    const url = 'https://cdn.example.com/thumb.jpg'
    expect(getOptimizedThumbnail(url, 'large')).toBe(url)
  })
})

describe('hasHighlight', () => {
  it('returns false for null', () => {
    expect(hasHighlight(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(hasHighlight(undefined)).toBe(false)
  })

  it('returns false for text without highlight markers', () => {
    expect(hasHighlight('Guard passing technique')).toBe(false)
  })

  it('returns true for text with highlight markers', () => {
    expect(hasHighlight('Guard {passing} technique')).toBe(true)
  })

  it('returns false when only opening brace', () => {
    expect(hasHighlight('Guard {passing technique')).toBe(false)
  })
})
