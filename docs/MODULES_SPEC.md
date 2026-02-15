# Module authoring specification for `@sdo/core`

## 1) Module contract
A module is an ESM object:

```js
export default {
  id: 'table',
  version: '1.0.0',
  init(ctx) {
    // register commands/ui/schemas/backup provider
  }
};
```

Rules:
- `id` must be globally unique (`kebab-case`).
- `version` must follow semver.
- Modules must not import internal `@sdo/core/src/*` files.
- All integration goes through `ctx` only.

## 2) Context API (`ctx`)
- `ctx.api.getState()` — readonly snapshot.
- `ctx.api.dispatch(action)` — controlled state action.
- `ctx.storage.get/set/del/list` — storage adapter only.
- `ctx.ui.registerButton/registerPanel` — optional UI integrations.
- `ctx.registerSchema/registerCommands/registerSettings` — extension points.
- `ctx.backup.registerProvider(provider)` — backup provider contract.

## 3) Backup provider requirements
```js
ctx.backup.registerProvider({
  id: 'table',
  version: '1.3.0',
  export: async (opts) => ({ settings: {}, userData: opts.includeUserData ? {} : undefined }),
  import: async (payload, opts) => ({ applied: true, warnings: [] }),
  describe: () => ({ settings: ['table.columns'], userData: ['table.records'] })
});
```

Provider notes:
- Return JSON-compatible objects only.
- Filter secrets/tokens unless user explicitly approves.
- Support partial import (`mode: merge|replace`) where possible.
- Keep module keys namespaced (`table:*`, `export:*`, etc).

## 4) Delta-ready module logic
For large data modules, implement incremental support:
- Keep a module revision counter and change log.
- Export keyed patch:

```json
{ "revision": 42, "set": {"table:rows:123": {...}}, "del": ["table:rows:100"] }
```

- Accept `mode: "patch"` during import.

## 5) Web runtime module loading
Core can load modules in browser directly:

```js
await sdo.loadModuleFromUrl('https://cdn.example.com/sdo-module-table/index.js');
```

Module MUST ship ESM output and export either:
- `default` module object, or
- named `module` export.

## 6) Security and compatibility
- Avoid side effects at import time.
- Validate all external payloads.
- Use `formatVersion`/`moduleVersion` migrations for backups.
- Keep backwards compatibility in MINOR versions, break only in MAJOR.
