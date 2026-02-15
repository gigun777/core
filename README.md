# @sdo/core

ESM-first ядро СЕДО з plugin-системою, v2-only моделлю навігації, backup/import API та headless UI registry.

## Install

```bash
npm i @sdo/core
```

## Quick start (headless + host UI)

```js
import { createSEDO, createMemoryStorage } from '@sdo/core';
import { createModuleManagerUI } from '@sdo/core/dist/ui/ui_core.js';

const sdo = createSEDO({
  storage: createMemoryStorage(),
  mount: document.getElementById('app'),
  createUI: createModuleManagerUI
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
3. У репозиторії вже є готовий `index.html`.
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
- `ui.listButtons(filter?)` / `ui.listPanels(filter?)` / `ui.subscribe(handler)`
- `exportNavigationState()` / `importNavigationState(payload)`
- `exportBackup(options)` / `importBackup(bundle, options)`
- `exportDelta(options)` / `applyDelta(base, delta)`
- `on(event, handler)` / `off(event, handler)`

## Module guidelines
- Підключення тільки через `ctx`, без імпорту внутрішніх файлів ядра.
- UI інтеграція через `ctx.ui.registerButton/registerPanel` з `unregisterFn`.
- storage keys тільки у namespace `moduleId:*`.
- backup provider обов’язково має `describe/export/import`.
- `includeUserData=false` має виключати user data.
- Дельта формат: keyed patch (`set`/`del`) + ревізії.

Детально: [`docs/MODULES_SPEC.md`](./docs/MODULES_SPEC.md), приклад: [`docs/reference-module.mjs`](./docs/reference-module.mjs).
