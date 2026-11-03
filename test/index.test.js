import assert from 'node:assert/strict'
import test from 'node:test'

import { apply, buildRules, defaults } from '../index.js'

function fakeCtx() {
  const sections = []
  const ctx = {
    sections,
    systemPrompt: {
      section(entry) {
        sections.push(entry)
        return () => {}
      },
    },
    effect(run) {
      return run()
    },
  }
  return ctx
}

test('registers one prompt section with the default order', () => {
  const ctx = fakeCtx()
  apply(ctx)
  assert.equal(ctx.sections.length, 1)
  assert.equal(ctx.sections[0].name, 'task-intake:protocol')
  assert.equal(ctx.sections[0].order, 9900)
  assert.match(ctx.sections[0].text, /Task intake protocol/)
})

test('enabled:false registers nothing', () => {
  const ctx = fakeCtx()
  apply(ctx, { enabled: false })
  assert.equal(ctx.sections.length, 0)
})

test('order is configurable', () => {
  const ctx = fakeCtx()
  apply(ctx, { order: 500 })
  assert.equal(ctx.sections[0].order, 500)
})

test('language auto follows the user, explicit language is used verbatim', () => {
  assert.match(buildRules(defaults), /language the user writes in/)
  assert.match(buildRules({ ...defaults, language: 'Japanese' }), /in Japanese/)
})

test('direct directives are quoted into the skip rule', () => {
  const text = buildRules({ ...defaults, directDirectives: ['冲'] })
  assert.match(text, /"冲"/)
  assert.doesNotMatch(text, /直接做/)
})

test('rules distinguish a new task from a continuation', () => {
  const text = buildRules(defaults)
  assert.match(text, /is NOT new/)
})

test('the pass reports understanding, questions and ideas, then waits', () => {
  const text = buildRules(defaults)
  assert.match(text, /Restate the task in your own words/)
  assert.match(text, /every question and doubt/)
  assert.match(text, /every idea you have/)
  assert.match(text, /STOP and WAIT/)
  assert.match(text, /Do not call the `ask_user_question` tool/)
})

test('execution needs a confirmation, and a revision re-enters the loop', () => {
  const text = buildRules(defaults)
  assert.match(text, /On a clear confirmation/)
  assert.match(text, /go back to step 1/)
  assert.match(text, /Repeat[\s\S]*until the user confirms/)
})

test('no artificial quota on questions or ideas', () => {
  const text = buildRules(defaults)
  assert.doesNotMatch(text, /at most \d+ (questions?|improvements?)/)
  assert.match(text, /not from a quota/)
})

test('missing config is tolerated', () => {
  const ctx = fakeCtx()
  apply(ctx, undefined)
  assert.equal(ctx.sections.length, 1)
})

test('prior art is mentioned by default and can be turned off', () => {
  assert.match(buildRules(defaults), /npm registry/)
  assert.doesNotMatch(buildRules({ ...defaults, priorArt: false }), /npm registry/)
})
