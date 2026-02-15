export const module = {
  id: 'example',
  version: '1.0.0',
  init(ctx) {
    const SETTINGS_KEY = 'example:settings';
    const USER_DATA_KEY = 'example:userData';
    const CHANGELOG_KEY = 'example:changelog';
    const REV_KEY = 'example:revision';

    ctx.ui.registerButton({
      id: 'example:backup-now',
      label: 'Example backup',
      location: 'toolbar',
      order: 40,
      onClick: async () => {
        const settings = (await ctx.storage.get(SETTINGS_KEY)) ?? {};
        alert(`Settings keys: ${Object.keys(settings).length}`);
      }
    });

    ctx.ui.registerPanel({
      id: 'example:settings',
      title: 'Example settings',
      location: 'settings',
      order: 20,
      render(mountEl) {
        const el = document.createElement('div');
        el.textContent = 'Settings panel from @sdo/module-example';
        mountEl.append(el);
        return () => el.remove();
      }
    });

    ctx.backup.registerProvider({
      id: 'example',
      version: '1.0.0',
      describe: () => ({
        settings: [SETTINGS_KEY],
        userData: [USER_DATA_KEY]
      }),
      export: async (opts) => {
        const settings = (await ctx.storage.get(SETTINGS_KEY)) ?? {};
        const revision = (await ctx.storage.get(REV_KEY)) ?? 0;
        const payload = { settings, revision };
        if (opts.includeUserData) {
          payload.userData = (await ctx.storage.get(USER_DATA_KEY)) ?? [];
        }
        return payload;
      },
      import: async (payload, opts) => {
        await ctx.storage.set(SETTINGS_KEY, payload.settings ?? {});
        if (opts.includeUserData && payload.userData) {
          if (opts.mode === 'replace') {
            await ctx.storage.set(USER_DATA_KEY, payload.userData);
          } else {
            const current = (await ctx.storage.get(USER_DATA_KEY)) ?? [];
            await ctx.storage.set(USER_DATA_KEY, [...current, ...payload.userData]);
          }
        }
        return { applied: true, warnings: [] };
      }
    });

    // keyed delta patch example
    async function appendChange(set = {}, del = []) {
      const rev = ((await ctx.storage.get(REV_KEY)) ?? 0) + 1;
      await ctx.storage.set(REV_KEY, rev);
      const log = (await ctx.storage.get(CHANGELOG_KEY)) ?? [];
      log.push({ revision: rev, set, del, at: new Date().toISOString() });
      await ctx.storage.set(CHANGELOG_KEY, log.slice(-200));
      return rev;
    }

    // expose optional helper in module scope if needed by host
    module.exportDelta = async (sinceRevision = 0) => {
      const log = (await ctx.storage.get(CHANGELOG_KEY)) ?? [];
      const changes = log.filter((c) => c.revision > sinceRevision);
      return { revision: (await ctx.storage.get(REV_KEY)) ?? 0, set: Object.assign({}, ...changes.map((c) => c.set)), del: changes.flatMap((c) => c.del) };
    };

    module.applyDelta = async (patch) => {
      for (const [key, value] of Object.entries(patch.set ?? {})) {
        await ctx.storage.set(key, value);
      }
      for (const key of patch.del ?? []) {
        await ctx.storage.del(key);
      }
      await appendChange(patch.set, patch.del);
    };
  }
};

export default module;
