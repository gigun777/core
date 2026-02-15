import { h } from './ui_primitives.js';

export function createModuleManagerUI({ sdo, mount, api }) {
  if (!mount) return null;

  const status = h('div', { class: 'sdo-status' }, ['Ready']);
  const toolbar = h('div', { class: 'sdo-toolbar' });
  const panelsHost = h('div', { class: 'sdo-panels' });
  const settingsHost = h('div', { class: 'sdo-settings' });

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
    const uiButtons = sdo.ui.listButtons({ location: 'toolbar' });
    const commandButtons = sdo.commands.list((c) => c.menu?.location === 'toolbar');
    const items = [addButton];

    for (const def of uiButtons) {
      if (!evaluateGuard(def.visible, true)) continue;
      const btn = h('button', {
        class: 'sdo-module-button',
        disabled: evaluateGuard(def.enabled, true) ? null : 'disabled',
        onClick: () => def.onClick({ api, sdo })
      }, [def.label]);
      items.push(btn);
    }

    for (const cmd of commandButtons) {
      if (!evaluateGuard(cmd.when, true)) continue;
      const btn = h('button', {
        class: 'sdo-module-button',
        onClick: async () => sdo.commands.run(cmd.id)
      }, [cmd.title]);
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

  async function renderSettings() {
    settingsHost.innerHTML = '';
    const tabs = sdo.settings.listTabs();
    for (const tab of tabs) {
      const tabEl = h('div', { class: 'sdo-settings-tab' }, [h('h4', {}, [tab.title])]);
      for (const def of tab.items) {
        for (const field of def.fields) {
          if (typeof field.when === 'function' && !field.when({ api, sdo })) continue;
          const row = h('label', { class: 'sdo-settings-row' }, [field.label]);
          const value = await field.read({ api, sdo });
          const input = h('input', { value: value ?? '', type: field.type === 'number' ? 'number' : 'text' });
          input.addEventListener('change', () => field.write({ api, sdo }, input.value));
          row.append(input);
          tabEl.append(row);
        }
      }
      settingsHost.append(tabEl);
    }
  }

  async function refresh() {
    renderButtons();
    renderPanel();
    await renderSettings();
  }

  const unsubscribe = sdo.ui.subscribe(refresh);
  refresh();

  const root = h('div', { class: 'sdo-core-shell' }, [toolbar, panelsHost, settingsHost, status]);
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
