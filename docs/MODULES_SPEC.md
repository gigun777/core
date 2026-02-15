# Module system specification for `@sdo/core` (ESM, npm-style)

## 1) Module contract
A module is an ESM object and must integrate **only via `ctx`**:

```js
export default {
  id: 'table',
  version: '1.2.0',
  init(ctx) {}
};
```

Rules:
- `id` unique, `kebab-case`, semver version.
- `init(ctx)` is called once per `use(module)`.
- Do **not** import `@sdo/core/src/*` internal files.
- Backwards-compatible additions in MINOR, breaking changes only in MAJOR.

## 2) Context API
- `ctx.api.getState()` / `ctx.api.dispatch(action)`
- `ctx.storage.get/set/del/list`
- `ctx.ui.registerButton(def)` -> `unregisterFn`
- `ctx.ui.registerPanel(def)` -> `unregisterFn`
- `ctx.ui.listButtons(filter?)`, `ctx.ui.listPanels(filter?)`
- `ctx.backup.registerProvider(provider)`

## 3) UI registry
Core provides a headless UI registry (no DOM in core). Host UI renders registry entries.

### ButtonDef
Required:
- `id: string`
- `label: string`
- `location: "toolbar" | "nav" | "settings" | "context" | string`
- `onClick: (ctx)=>void|Promise<void>`

Optional:
- `order?: number`
- `enabled?: (ctx)=>boolean`
- `visible?: (ctx)=>boolean`
- `icon?: string`
- `hotkey?: string`

### PanelDef
Required:
- `id: string`
- `title: string`
- `location: "settings" | "sidebar" | "modal" | string`
- `render: (mountEl, ctx)=>void|(()=>void)`

Optional:
- `order?: number`
- `open?: ()=>void`
- `size?: "sm"|"md"|"lg"`

Best practices:
- keep `id` namespaced (`example:settings`)
- use `order` for deterministic placement
- store `unregisterFn` and call on teardown if module has custom lifecycle

## 4) Storage namespacing
All keys must be module-scoped:
- `table:settings`
- `table:userData`
- `export:presets`

Never write unprefixed keys from modules.

## 5) Backup provider contract
Register provider in `init(ctx)`:

```js
ctx.backup.registerProvider({
  id: 'table',
  version: '1.3.0',
  describe: () => ({ settings: ['table:settings'], userData: ['table:userData'] }),
  export: async (opts) => ({ ... }),
  import: async (payload, opts) => ({ applied: true, warnings: [] })
});
```

Requirements:
- `describe()` is required.
- Payload must be JSON-compatible.
- `includeUserData=false` must exclude user data.
- Import must support `mode: "merge" | "replace"` where applicable.

## 6) Encryption/password/signature/integrity
- Modules **do not encrypt themselves**; core backup manager handles encryption.
- Core encrypted mode: PBKDF2-SHA256 + AES-GCM-256.
- Plain backup integrity: SHA-256 digest of canonical JSON.
- Optional signed envelope: ECDSA P-256 + SHA-256.
- Module import logic should respect host policy for `unsigned` / `invalid signature` backups.

## 7) Delta backups
Use keyed patch style for module data:

```json
{
  "revision": 42,
  "set": { "table:rows:123": {"id":123} },
  "del": ["table:rows:101"]
}
```

Recommendations:
- maintain module `revision` (monotonic)
- keep change-log in module namespace
- include `baseId` and `baseHashB64` at bundle level
- support apply in `patch` mode

## 8) Reference module
See: [`docs/reference-module.mjs`](./reference-module.mjs)

It demonstrates:
- `registerButton` + `registerPanel`
- namespaced storage (`example:*`)
- backup export/import with `includeUserData`
- merge/replace import behavior
- keyed delta helper methods
