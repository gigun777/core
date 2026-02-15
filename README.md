# @sdo/core

ESM-first ядро СЕДО з plugin-системою, v2-only моделлю навігації, backup/import API та базовим web-ready UI для підключення модулів під час виконання.

## Install

```bash
npm i @sdo/core
```

## Quick start

```js
import { createSEDO, createMemoryStorage } from '@sdo/core';

const sdo = createSEDO({
  storage: createMemoryStorage(),
  mount: document.getElementById('app')
});

await sdo.start();
```

## Запуск через XAMPP (Apache)

1. Зберіть `dist`:

```bash
npm install
npm run build
```

2. Скопіюйте проект у `htdocs` (наприклад, `C:\xampp\htdocs\core`).
3. Створіть `index.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="./dist/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import { createSEDO, createMemoryStorage } from './dist/index.js';
      const sdo = createSEDO({ storage: createMemoryStorage(), mount: document.getElementById('app') });
      await sdo.start();
    </script>
  </body>
</html>
```

4. Запустіть Apache в XAMPP і відкрийте `http://localhost/core/`.

## Public API
- `createSEDO(options)`
- `createNavi(storage)`
- `version`
- `encryptBackup(bundle, password)` / `decryptBackup(envelope, password)`
- `signBackup(payload, { privateKey, publicKey })` / `verifyBackup(envelope)`
- `verifyIntegrity(bundle)`

SEDO instance:
- `use(module)`
- `loadModuleFromUrl(url)`
- `start()` / `destroy()`
- `getState()`
- `commit(mutator, changedKeys?)`
- `exportNavigationState()` / `importNavigationState(payload)`
- `exportBackup(options)` / `importBackup(bundle, options)`
- `exportDelta(options)` / `applyDelta(base, delta)`
- `on(event, handler)` / `off(event, handler)`

## Backup
- Canonical JSON + SHA-256 integrity for plaintext backups.
- Encrypted envelope via PBKDF2-SHA256 + AES-GCM-256.
- Module-level providers via `ctx.backup.registerProvider(...)`.

## Module authoring
Див. повну специфікацію: [`docs/MODULES_SPEC.md`](./docs/MODULES_SPEC.md).
