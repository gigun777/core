import { canGoBackJournal, canGoBackSpace } from '../core/navigation_core.js';
import { h } from './ui_primitives.js';

function findById(items, id) {
  return items.find((item) => item.id === id) ?? null;
}

export function createModuleManagerUI({ sdo, mount, api }) {
  if (!mount) return null;

  const status = h('div', { class: 'sdo-status' }, ['Ready']);
  const navigationHost = h('div', { class: 'sdo-navigation' });
  const toolbar = h('div', { class: 'sdo-toolbar' });
  const panelsHost = h('div', { class: 'sdo-panels' });
  const settingsHost = h('div', { class: 'sdo-settings' });
  const modalLayer = h('div', { class: 'sdo-modal-layer' });
  modalLayer.hidden = true;

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

  function openPicker({ title, items, onSelect, onAddCurrentLevel, getLabel }) {
    modalLayer.innerHTML = '';
    modalLayer.hidden = false;

    const close = () => {
      modalLayer.hidden = true;
      modalLayer.innerHTML = '';
    };

    const list = h('div', { class: 'sdo-picker-list' });
    for (const item of items) {
      const row = h('button', {
        class: 'sdo-picker-row',
        onClick: async () => {
          await onSelect(item);
          close();
        }
      }, [getLabel(item)]);
      list.append(row);
    }

    const addButton = h('button', {
      class: 'sdo-picker-add',
      onClick: async () => {
        await onAddCurrentLevel();
        close();
      }
    }, ['+ Додати на цей рівень']);

    const modal = h('div', { class: 'sdo-picker-modal' }, [
      h('div', { class: 'sdo-picker-title' }, [title]),
      list,
      addButton,
      h('button', { class: 'sdo-picker-close', onClick: close }, ['Закрити'])
    ]);

    modalLayer.append(modal);
  }

  function evaluateGuard(fn, fallback = true) {
    if (typeof fn !== 'function') return fallback;
    return Boolean(fn({ api, sdo }));
  }

  async function ensureRootSpace() {
    const state = sdo.getState();
    if (state.spaces.length > 0) return;
    await sdo.commit((next) => {
      const rootId = crypto.randomUUID();
      next.spaces = [{ id: rootId, title: 'Простір 1', parentId: null, childCount: 0 }];
      next.activeSpaceId = rootId;
      next.activeJournalId = null;
    }, ['spaces_nodes_v2', 'nav_last_loc_v2']);
  }

  function getJournalLabel(journal) {
    const idx = journal.index ? `${journal.index} ` : '';
    return `${idx}${journal.title}`;
  }

  async function renderNavigation() {
    await ensureRootSpace();
    const state = sdo.getState();
    const activeSpace = findById(state.spaces, state.activeSpaceId);
    const activeJournal = findById(state.journals, state.activeJournalId);

    const spaceSiblings = state.spaces.filter((x) => x.parentId === (activeSpace?.parentId ?? null));
    const spaceChildren = state.spaces.filter((x) => x.parentId === activeSpace?.id);

    const journalSiblings = activeJournal
      ? state.journals.filter((j) => j.spaceId === state.activeSpaceId && j.parentId === activeJournal.parentId)
      : state.journals.filter((j) => j.spaceId === state.activeSpaceId && j.parentId === state.activeSpaceId);
    const journalChildren = activeJournal
      ? state.journals.filter((j) => j.spaceId === state.activeSpaceId && j.parentId === activeJournal.id)
      : [];

    const spaceBackBtn = h('button', {
      class: 'sdo-nav-btn sdo-nav-back',
      disabled: canGoBackSpace(activeSpace) ? null : 'disabled',
      onClick: async () => {
        if (!activeSpace?.parentId) return;
        await sdo.commit((next) => {
          next.activeSpaceId = activeSpace.parentId;
          next.activeJournalId = null;
        }, ['nav_last_loc_v2']);
      }
    }, ['←']);

    const spaceCurrentBtn = h('button', {
      class: 'sdo-nav-btn sdo-nav-main',
      onClick: () => openPicker({
        title: 'Оберіть простір поточного рівня',
        items: spaceSiblings,
        getLabel: (item) => item.title,
        onSelect: async (item) => {
          await sdo.commit((next) => {
            next.activeSpaceId = item.id;
            next.activeJournalId = null;
          }, ['nav_last_loc_v2']);
        },
        onAddCurrentLevel: async () => {
          const title = window.prompt('Назва простору:', 'Новий простір');
          if (!title) return;
          await sdo.commit((next) => {
            next.spaces = [...next.spaces, { id: crypto.randomUUID(), title, parentId: activeSpace?.parentId ?? null, childCount: 0 }];
          }, ['spaces_nodes_v2']);
        }
      })
    }, [activeSpace?.title ?? 'Простір']);

    const spaceChildrenBtn = h('button', {
      class: 'sdo-nav-btn sdo-nav-main',
      disabled: spaceChildren.length > 0 ? null : 'disabled',
      onClick: () => openPicker({
        title: 'Оберіть підпростір поточного рівня',
        items: spaceChildren,
        getLabel: (item) => item.title,
        onSelect: async (item) => {
          await sdo.commit((next) => {
            next.activeSpaceId = item.id;
            next.activeJournalId = null;
          }, ['nav_last_loc_v2']);
        },
        onAddCurrentLevel: async () => {
          const title = window.prompt('Назва підпростору:', 'Новий підпростір');
          if (!title || !activeSpace?.id) return;
          await sdo.commit((next) => {
            next.spaces = [...next.spaces, { id: crypto.randomUUID(), title, parentId: activeSpace.id, childCount: 0 }];
          }, ['spaces_nodes_v2']);
        }
      })
    }, [spaceChildren[0]?.title ?? '—']);

    const spacePlusBtn = h('button', {
      class: 'sdo-nav-btn sdo-nav-plus',
      onClick: async () => {
        const title = window.prompt('Назва підпростору:', 'Новий підпростір');
        if (!title || !activeSpace?.id) return;
        await sdo.commit((next) => {
          next.spaces = [...next.spaces, { id: crypto.randomUUID(), title, parentId: activeSpace.id, childCount: 0 }];
        }, ['spaces_nodes_v2']);
      }
    }, ['+']);

    const journalBackBtn = h('button', {
      class: 'sdo-nav-btn sdo-nav-back',
      disabled: canGoBackJournal(activeJournal, state.activeSpaceId) ? null : 'disabled',
      onClick: async () => {
        if (!activeJournal || activeJournal.parentId === state.activeSpaceId) return;
        await sdo.commit((next) => {
          next.activeJournalId = activeJournal.parentId;
        }, ['nav_last_loc_v2']);
      }
    }, ['←']);

    const journalCurrentBtn = h('button', {
      class: 'sdo-nav-btn sdo-nav-main',
      onClick: () => openPicker({
        title: 'Оберіть журнал поточного рівня',
        items: journalSiblings,
        getLabel: getJournalLabel,
        onSelect: async (item) => {
          await sdo.commit((next) => {
            next.activeJournalId = item.id;
          }, ['nav_last_loc_v2']);
        },
        onAddCurrentLevel: async () => {
          if (!state.activeSpaceId) return;
          const title = window.prompt('Назва журналу:', 'Вхідні поточні');
          if (!title) return;
          await sdo.commit((next) => {
            const parentId = activeJournal ? activeJournal.parentId : state.activeSpaceId;
            const node = { id: crypto.randomUUID(), spaceId: state.activeSpaceId, parentId, templateId: 'table-template-v1', title, childCount: 0 };
            next.journals = [...next.journals, node];
            next.activeJournalId = node.id;
          }, ['journals_nodes_v2', 'nav_last_loc_v2']);
        }
      })
    }, [activeJournal ? getJournalLabel(activeJournal) : 'Додай журнал']);

    const journalChildrenBtn = h('button', {
      class: 'sdo-nav-btn sdo-nav-main',
      disabled: journalChildren.length > 0 ? null : 'disabled',
      onClick: () => openPicker({
        title: 'Оберіть піджурнал поточного рівня',
        items: journalChildren,
        getLabel: getJournalLabel,
        onSelect: async (item) => {
          await sdo.commit((next) => {
            next.activeJournalId = item.id;
          }, ['nav_last_loc_v2']);
        },
        onAddCurrentLevel: async () => {
          if (!activeJournal) return;
          const title = window.prompt('Назва піджурналу:', 'Піджурнал');
          if (!title) return;
          await sdo.commit((next) => {
            const node = { id: crypto.randomUUID(), spaceId: state.activeSpaceId, parentId: activeJournal.id, templateId: 'table-template-v1', title, childCount: 0 };
            next.journals = [...next.journals, node];
            next.activeJournalId = node.id;
          }, ['journals_nodes_v2', 'nav_last_loc_v2']);
        }
      })
    }, [journalChildren[0] ? getJournalLabel(journalChildren[0]) : '—']);

    const journalPlusBtn = h('button', {
      class: 'sdo-nav-btn sdo-nav-plus',
      onClick: async () => {
        if (!state.activeSpaceId) return;
        const title = window.prompt('Назва піджурналу:', activeJournal ? 'Піджурнал' : 'Вхідні поточні');
        if (!title) return;
        await sdo.commit((next) => {
          const parentId = activeJournal ? activeJournal.id : state.activeSpaceId;
          const node = { id: crypto.randomUUID(), spaceId: state.activeSpaceId, parentId, templateId: 'table-template-v1', title, childCount: 0 };
          next.journals = [...next.journals, node];
          next.activeJournalId = node.id;
        }, ['journals_nodes_v2', 'nav_last_loc_v2']);
      }
    }, ['+']);

    const spaceRow = h('div', { class: 'sdo-nav-row' }, [spaceBackBtn, spaceCurrentBtn, spaceChildrenBtn, spacePlusBtn]);
    const journalRow = h('div', { class: 'sdo-nav-row' }, [journalBackBtn, journalCurrentBtn, journalChildrenBtn, journalPlusBtn]);

    navigationHost.innerHTML = '';
    navigationHost.append(spaceRow, journalRow);
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
    await renderNavigation();
    renderButtons();
    renderPanel();
    await renderSettings();
  }

  const unsubscribeRegistry = sdo.ui.subscribe(refresh);
  const unsubscribeState = sdo.on('state:changed', refresh);
  refresh();

  const root = h('div', { class: 'sdo-core-shell' }, [navigationHost, toolbar, panelsHost, settingsHost, status, modalLayer]);
  mount.innerHTML = '';
  mount.append(root);

  return {
    destroy() {
      unsubscribeRegistry();
      unsubscribeState();
      panelCleanup?.();
      root.remove();
    }
  };
}
