"use strict";

/**
 * FYI
 *
 * - UI is automatically re-rendered on browser action icon click
 *   (Does not persist in between open/close states)
 *
 *   So, if an action closes the UI, on next icon clock, render() will be called
 */

/**
 * https://developer.chrome.com/docs/extensions/reference/processes/#method-getProcessIdForTab
 * https://developer.chrome.com/docs/extensions/reference/processes/#type-Process
 * https://groups.google.com/a/chromium.org/g/chromium-extensions/c/pyAzuN4neHc
 * https://bugs.chromium.org/p/chromium/issues/detail?id=763960
 */

(function () {
  /**  when calling render() again, window.focused is false for all, cache window where user opened popup */
  let cachedFocusedWindowId: number = undefined;

  const render = async () => {
    chrome.windows.getAll({ populate: true }, (windows) => {
      const outerDiv = document.createElement("div");

      const warning = document.createElement("div");
      warning.className = "warning";
      warning.innerText = "Do NOT freeze tabs with unsaved work!";

      const discardAllWindows = document.createElement("button");
      discardAllWindows.textContent = "Freeze all Tabs in all Windows";
      discardAllWindows.onclick = () => {
        windows.forEach((w) =>
          w.tabs.forEach((t) => chrome.tabs.discard(t.id))
        );

        // render() not needed; discarding all tabs closes extension UI
      };

      outerDiv.appendChild(warning);
      outerDiv.appendChild(discardAllWindows);

      windows.forEach(async (w) => {
        /**
         * The Summary of the div
         * e.g.
         *
         * Window 13 <Discard All>
         */
        const summary = document.createElement("summary");

        const discardedTabs = w.tabs.filter((t) => t.discarded).length;

        let titleDiv;
        const titleText = `Window (${discardedTabs}/${w.tabs.length} frozen tabs)`;
        if (w.focused || cachedFocusedWindowId === w.id) {
          titleDiv = document.createElement("MARK");
          titleDiv.innerText = titleText;
          cachedFocusedWindowId = w.id;
        } else {
          titleDiv = document.createTextNode(titleText);
        }

        const discardAllButton = document.createElement("BUTTON");
        discardAllButton.textContent = "Freeze all tabs";
        discardAllButton.onclick = () => {
          w.tabs.forEach((t) =>
            chrome.tabs.discard(t.id, (tabOrUndefined) => {})
          );

          // if current window, discarding current tab will also close extension UI
          if (!w.focused) render();
        };

        /**
         * TODO see performance summary of all windows/tabs
         * https://developer.chrome.com/docs/extensions/reference/processes/
         * enable
         */
        // if (chrome.processes) {
        //   const windowTabProcesses = [];
        //   for (let i = 0; i < w.tabs.length; i += 1) {
        //     const t = w.tabs[i];

        //     await new Promise((resolve) => {
        //       chrome.processes.getProcessIdForTab(t.id, (processId) => {
        //         windowTabProcesses.push(processId);
        //         resolve();
        //       });
        //     });
        //   }

        //   await new Promise((resolve) => {
        //     chrome.processes.getProcessInfo(
        //       windowTabProcesses,
        //       true,
        //       (processes) => {
        //         console.log(processes);
        //         resolve();
        //       }
        //     );
        //   });
        // }

        const firstTabTitle = document.createElement("div");
        firstTabTitle.textContent = w.tabs[0].title;
        firstTabTitle.className = "first-tab-title";

        summary.appendChild(titleDiv);
        summary.appendChild(discardAllButton);
        summary.appendChild(firstTabTitle);

        /**
         * Tabs in each window
         * e.g.
         *    * Design the user interface - Chrome Developers
         *    * HTML 5 <details> Tag
         */

        const tabList = document.createElement("ul");
        w.tabs.forEach((t) => {
          const tabSpan = document.createElement("li");
          tabSpan.textContent = `${t.title}`;
          tabList.appendChild(tabSpan);
        });

        // done with window
        const details = document.createElement("details");
        details.appendChild(summary);
        details.appendChild(tabList);
        outerDiv.appendChild(details);
      });

      const appRoot = document.getElementById("app");
      // we call render() to update UI, so clear root content on every render
      appRoot.innerHTML = "";
      appRoot.appendChild(outerDiv);
    });
  };

  render();
})();

const tabGroupsGet = async (tabId: number) =>
  await new Promise<chrome.tabGroups.TabGroup>((resolve) => {
    chrome.tabGroups.get(tabId, (v) => resolve(v));
  });

const getAllWindows = async () =>
  await new Promise<chrome.windows.Window[]>((resolve) => {
    chrome.windows.getAll({ populate: true }, (windows) => {
      resolve(windows);
    });
  });

const getConfig = (): ConfigI[] =>
  JSON.parse(localStorage.getItem("TAB_FREEZER__SAVED_SESSIONS")) ?? [];

const updateConfig = (config: ConfigI) => {
  localStorage.setItem(
    "TAB_FREEZER__SAVED_SESSIONS",
    JSON.stringify([...getConfig(), config])
  );
};

const saveConfig = (config: ConfigI[]) => {
  localStorage.setItem("TAB_FREEZER__SAVED_SESSIONS", JSON.stringify(config));
};

const createButton = (text: string, cb: () => void) => {
  const btn = document.createElement("BUTTON");
  btn.textContent = text;
  btn.onclick = () => {
    cb();
  };

  return btn;
};

(function () {
  const renderSaveSession = async () => {
    const windows = await getAllWindows();
    const CONFIG: ConfigI = { timestamp: Date.now(), windows: [] };

    for (let WINDOWS_I = 0; WINDOWS_I < windows.length; WINDOWS_I += 1) {
      const w = windows[WINDOWS_I];

      const WINDOW_CONFIG: WindowConfigI = {
        tabGroups: {},
        pinnedTabIndices: [],
        tabs: [],
      };
      CONFIG.windows.push(WINDOW_CONFIG);

      for (let TAB_i = 0; TAB_i < w.tabs.length; TAB_i += 1) {
        const tab = w.tabs[TAB_i];

        WINDOW_CONFIG.tabs.push(tab);

        if (tab.pinned) WINDOW_CONFIG.pinnedTabIndices.push(TAB_i);

        if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          if (WINDOW_CONFIG.tabGroups[tab.groupId]) {
            WINDOW_CONFIG.tabGroups[tab.groupId].tabIdxs.push(TAB_i);
          } else {
            const tabGroupInfo = await tabGroupsGet(tab.groupId);
            WINDOW_CONFIG.tabGroups[tab.groupId] = {
              ...tabGroupInfo,
              tabIdxs: [TAB_i],
            };
          }
        }
      }
    }

    const saveBtn = document.createElement("BUTTON");
    saveBtn.textContent = `Save Session (${CONFIG.windows.length} windows)`;
    saveBtn.onclick = () => {
      CONFIG.timestamp = Date.now();
      updateConfig(CONFIG);
      renderSessions();
    };

    const appRoot = document.getElementById("save");
    appRoot.innerHTML = "";
    appRoot.appendChild(saveBtn);
  };

  renderSaveSession();

  const openWindows = (windows: WindowConfigI[]) => {
    for (let WINDOWS_I = 0; WINDOWS_I < windows.length; WINDOWS_I += 1) {
      const windowConfig = windows[WINDOWS_I];

      const urls = windowConfig.tabs.map((t) => t.url);
      chrome.windows.create({ url: urls }, (createdWindow) => {
        Object.values(windowConfig.tabGroups).forEach((tabGroup) => {
          const tabIds = tabGroup.tabIdxs.map(
            (idx) => createdWindow.tabs[idx].id
          );

          chrome.tabs.group(
            { tabIds, createProperties: { windowId: createdWindow.id } },
            (tabGroupId) => {
              chrome.tabGroups.update(tabGroupId, {
                color: tabGroup.color,
                collapsed: tabGroup.collapsed,
                title: tabGroup.title,
              });
            }
          );
        });

        windowConfig.pinnedTabIndices
          .map((idx) => createdWindow.tabs[idx].id)
          .forEach((pinnedTabId) => {
            chrome.tabs.update(pinnedTabId, { pinned: true });
          });
      });
    }
  };

  const renderSessions = async () => {
    const sessions = getConfig();

    const sessionDiv = document.createElement("DIV");
    sessions.forEach((sesh) => {
      const totalTabs = sesh.windows.reduce((p, c) => p + c.tabs.length, 0);
      const totalWindows = sesh.windows.length;

      const seshDiv = document.createElement("DIV");
      seshDiv.className = "session-div";
      seshDiv.innerText = `${totalWindows} windows, ${totalTabs} tabs - ${new Date(
        sesh.timestamp
      ).toLocaleDateString()} - ${new Date(
        sesh.timestamp
      ).toLocaleTimeString()}`;

      seshDiv.appendChild(
        createButton("Open", () => {
          openWindows(sesh.windows);
        })
      );

      seshDiv.appendChild(
        createButton("Delete", () => {
          const newS = sessions.filter((s) => s !== sesh);
          saveConfig(newS);
          renderSessions();
        })
      );
      sessionDiv.appendChild(seshDiv);
    });

    const appRoot = document.getElementById("sessions");
    appRoot.innerHTML = "";
    appRoot.appendChild(sessionDiv);
  };

  renderSessions();
})();
