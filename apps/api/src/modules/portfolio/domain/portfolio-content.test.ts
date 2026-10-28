import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import { parsePortfolioContent } from './portfolio-content.js'

test('accepts the complete initial NandOS portfolio content', () => {
  assert.deepEqual(parsePortfolioContent(DEFAULT_PORTFOLIO_CONTENT), DEFAULT_PORTFOLIO_CONTENT)
})

test('rejects unsafe contact links and malformed list entries', () => {
  const unsafe = structuredClone(DEFAULT_PORTFOLIO_CONTENT)
  unsafe.contact.channels[0]!.href = 'javascript:alert(1)'
  assert.equal(parsePortfolioContent(unsafe), null)

  const malformed = structuredClone(DEFAULT_PORTFOLIO_CONTENT)
  malformed.experienceEntries[0]!.contributions = 'not a list' as unknown as string[]
  assert.equal(parsePortfolioContent(malformed), null)
})
