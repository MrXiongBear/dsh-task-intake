/**
 * dsh-task-intake — host side.
 *
 * Injects one system-prompt section that makes every new user task pass through an
 * explicit intake loop: understand → report back (understanding, open questions, ideas)
 * → WAIT for the user's confirmation → execute. A revision re-enters the loop.
 *
 * Why a prompt section and not a skill/AGENTS.md: a prompt section is re-sent on
 * every request, so it survives long contexts and compression. Skills load on
 * demand and memory files are model-discretionary — neither can carry a rule that
 * must hold every single turn.
 *
 * Tunables live in cordis.patch.yml (see `config:` on the `task-intake` row); this
 * file only supplies the defaults, so upgrading the plugin never drops user tweaks.
 */

export const inject = ['systemPrompt']

const SECTION_NAME = 'task-intake:protocol'

/** Defaults; every value can be overridden from the plugin row's `config:`. */
export const defaults = {
  enabled: true,
  order: 9900,
  /** Check npm / GitHub / the web for prior art when the task builds something new. */
  priorArt: true,
  /** "auto" follows the user's language; anything else is used verbatim. */
  language: 'auto',
  /** Phrases that mean "skip the intake pass, just do it". */
  directDirectives: ['直接做', '别问了', '别问', '不用问', '先做', 'just do it', 'no questions'],
}

const DIRECTIVE_LIST = (config) =>
  config.directDirectives.map((phrase) => JSON.stringify(phrase)).join(', ')

/**
 * Build the prompt text from the effective config.
 * @param {typeof defaults} config
 */
export function buildRules(config) {
  const lang =
    config.language === 'auto'
      ? "Write the whole round in the language the user writes in (Chinese when they write Chinese)."
      : `Write the whole round in ${config.language}.`

  const priorArt =
    config.priorArt === false
      ? ''
      : '\nWhen the task builds something new, check for prior art first (npm registry, GitHub, the\nweb) and fold it into the ideas list: a link per item, then reuse / borrow / build from\nscratch — and why.\n'

  return `## Task intake protocol (host policy)

The user asked for this: never start a delegated task until they have confirmed your
reading of it. Understand first, report back, wait; execute only after a clear yes.

A NEW task is a message asking for new work. An answer, a correction, an approval, or a
continuation of the current objective is NOT new: skip the pass and continue.

For a new task, before touching files, running commands or changing configuration:
1. Restate the task in your own words: what you understand is wanted, and what "done" looks
   like. A few lines of prose, no template headings.
2. List every question and doubt that could change the result — numbered, as many as you
   actually have. For each one, say what its answer would change.
3. List every idea you have: a better, cheaper or safer approach, a missing step, a hidden
   risk, something worth reusing. One line each, as many as you actually have, marked as
   suggestions so the user can take or drop them one by one.
4. STOP and WAIT for the user. No file writes, no mutating commands, no subagents in this
   same turn. Do not call the \`ask_user_question\` tool — the user reads the reply.
5. On a clear confirmation: state a 1-3 line plan, then execute.
6. On a revision, an answer or an explanation: apply it and go back to step 1 — send a fresh
   round (updated understanding, remaining questions, new ideas) and WAIT again. Repeat
   until the user confirms.
${priorArt}
Keep each round short: its length comes from what you actually have to say, not from a quota.
Number the questions 1, 2, 3 so the user can answer them the same way.

${lang}

Skip this pass for read-only or purely informative requests, a single trivial step, or when
the user said (${DIRECTIVE_LIST(config)}).`
}

/**
 * @param {import('cordis').Context} ctx
 * @param {Partial<typeof defaults>} [raw]
 */
export function apply(ctx, raw) {
  const config = { ...defaults, ...(raw ?? {}) }
  if (config.enabled === false) return

  const text = buildRules(config)
  ctx.effect(
    () => ctx.systemPrompt.section({ name: SECTION_NAME, order: config.order, text }),
    'task-intake: protocol section',
  )
}
