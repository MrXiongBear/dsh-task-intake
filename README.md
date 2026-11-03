# dsh-task-intake

<!-- ai-made-notice -->
> **本仓库 100% 由 AI 生成** —— 需求、代码、测试、文档都是人与 AI 对话里由 AI 写出来的，人只负责验收和拍板。
> **实验性 · 自用性质 · 非商业**：它紧贴 DeepSeek Harness（DSH）的宿主接缝（`apply` / `inject` / client bundle / 配置解析），只在写它的那个 DSH 版本上验证过，宿主升级后可能直接失效。
> **安装前必读**：DSH 的 profile 加载是**全有或全无**——一个插件 `import` 失败会连坐整个 profile，甚至把配置写残。装之前先备份 profile 里的 `package.json` 与 `cordis.patch.yml`。
> **没有发布到 npm**：把本目录放进 profile 的 `node_modules`（或 `"<包名>": "link:<本目录绝对路径>"`），再在 `package.json` 的 `dsh.profile.bundles` 里登记，重启 DSH。
> **卸载/回滚**：从 `dsh.profile.bundles` 摘掉 → `pnpm remove <包名>` 或删掉 junction → 重启；出问题就用备份的那两个文件还原。

Host-only DSH bundle. Injects one system-prompt section (`task-intake:protocol`,
order 9900) that makes the agent run an intake pass before acting on a new task:

1. restate the goal and the inferred deliverables,
2. surface unknowns / risky assumptions,
3. search npm / GitHub / the web for prior art (a ready-made plugin, library, template or
   established approach) and say reuse / borrow / build from scratch — before writing anything,
4. offer up to N improvements to the request,
5. ask in the reply text (never the `ask_user_question` tool) and wait when an unknown
   could change the result,
6. state the optimized plan, then execute.

A message that answers a question, corrects the agent, approves a plan, or continues
the current objective is **not** a new task — no intake pass. Read-only, single-step
and purely informational requests skip the question step, and so does any request
that says "直接做" / "别问" / "just do it".

## Why a prompt section

A `systemPrompt.section` is re-sent with every request, so it survives long contexts
and compression. Skills only load on demand and memory files are model-discretionary,
so neither can enforce a per-turn rule.

## Config

Edit the `config:` block on the `task-intake` row in
[cordis.patch.yml](cordis.patch.yml); `index.js` only supplies defaults.

| key | default | meaning |
|---|---|---|
| `enabled` | `true` | `false` disables the plugin without uninstalling it |
| `order` | `9900` | position in the system prompt; must stay below 10000 (environment sections) |
| `maxImprovements` | `3` | how many suggestions the agent may make |
| `maxQuestionsPerTask` | `1` | hard cap per task; extra unknowns become stated assumptions |
| `priorArt` | `true` | run the prior-art search before building something new |
| `priorArtCandidates` | `3` | how many existing candidates to report |
| `language` | `auto` | `auto` follows the user's language; anything else is used verbatim |
| `directDirectives` | Chinese + English list | phrases that mean "skip the pass" |

## Test

```bash
node --test test/
```

Ten tests cover section registration, `enabled:false`, order/budget overrides,
language handling, directive quoting, continuation wording, and the prior-art step
(on by default, `priorArt:false` renumbering, configurable candidate count).

## Install

```bash
dsh plugin --profile desktop add <repo>
```

Changes to `index.js` / `cordis.patch.yml` take effect after restarting DSH.

## Files

- `index.js` — defaults + `buildRules()` + `apply()`
- `cordis.patch.yml` — inserts the plugin row and its config
- `test/index.test.js` — unit tests with a fake cordis context
- `locale/{zh,en}.json` — display metadata
