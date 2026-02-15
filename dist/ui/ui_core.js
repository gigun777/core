import { h } from './ui_primitives.js';

export function createModuleManagerUI({ sdo, mount, api }) {
  if (!mount) return null;

  const status = h('div', { class: 'sdo-status' }, ['Ready']);
  const toolbar = h('div', { class: 'sdo-toolbar' });
  const panelsHost = h('div', { class: 'sdo-panels' });

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

  function evaluateGuard(fn, fallback = true) {
    if (typeof fn !== 'function') return fallback;
    return Boolean(fn({ api, sdo }));
  }

  function renderButtons() {
    const buttons = sdo.ui.listButtons({ location: 'toolbar' });
    const items = [addButton];
    for (const def of buttons) {
      if (!evaluateGuard(def.visible, true)) continue;
      const btn = h('button', {
        class: 'sdo-module-button',
        disabled: evaluateGuard(def.enabled, true) ? null : 'disabled',
        onClick: () => def.onClick({ api, sdo })
      }, [def.label]);
      items.push(btn);
    }
    toolbar.innerHTML = '';
    toolbar.append(...items);
  }

  let panelCleanup = null;
  function renderPanel() {
    panelCleanup?.();
    panelCleanup = null;
    panelsHost.innerHTML = '';
    const panel = sdo.ui.listPanels({ location: 'settings' })[0];
    if (!panel) return;

    const wrapper = h('div', { class: 'sdo-panel' }, [h('h3', {}, [panel.title])]);
    panelsHost.append(wrapper);
    const maybeCleanup = panel.render(wrapper, { api, sdo });
    if (typeof maybeCleanup === 'function') panelCleanup = maybeCleanup;
  }

  function refresh() {
    renderButtons();
    renderPanel();
  }

  const unsubscribe = sdo.ui.subscribe(refresh);
  refresh();

  const root = h('div', { class: 'sdo-core-shell' }, [toolbar, panelsHost, status]);
  mount.innerHTML = '';
  mount.append(root);

  return {
    destroy() {
      unsubscribe();
      panelCleanup?.();
      root.remove();
    }
  };
}
