import { h } from './ui_primitives.js';

export function createModuleManagerUI({ sdo, mount }) {
  if (!mount) return null;
  const status = h('div', { class: 'sdo-status' }, ['Ready']);
  const addButton = h('button', {
    class: 'sdo-add-module',
    onClick: async () => {
      const url = window.prompt('Module ESM URL:');
      if (!url) return;
      try {
        await sdo.loadModuleFromUrl(url);
        status.textContent = `Module loaded: ${url}`;
      } catch (error) {
        status.textContent = `Load failed: ${error.message}`;
      }
    }
  }, ['+ Додати модуль']);

  const root = h('div', { class: 'sdo-core-shell' }, [addButton, status]);
  mount.innerHTML = '';
  mount.append(root);

  return {
    destroy() { root.remove(); }
  };
}
