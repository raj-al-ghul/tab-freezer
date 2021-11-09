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

const tabGroupsGet = (tabId: number) =>
  new Promise<chrome.tabGroups.TabGroup>((resolve) => {
    chrome.tabGroups.get(tabId, (v) => resolve(v));
  });

const getAllWindows = () =>
  new Promise<chrome.windows.Window[]>((resolve) => {
    chrome.windows.getAll({ populate: true }, (windows) => {
      resolve(windows);
    });
  });

const getSessions = (): SessionI[] =>
  JSON.parse(localStorage.getItem("TAB_FREEZER__SAVED_SESSIONS")) ?? [];

const saveSession = (session: SessionI) => {
  localStorage.setItem(
    "TAB_FREEZER__SAVED_SESSIONS",
    JSON.stringify([...getSessions(), session])
  );
};

const saveSessions = (sessions: SessionI[]) => {
  localStorage.setItem("TAB_FREEZER__SAVED_SESSIONS", JSON.stringify(sessions));
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
    const CONFIG: SessionI = { timestamp: Date.now(), windows: [] };

    for (let WINDOWS_I = 0; WINDOWS_I < windows.length; WINDOWS_I += 1) {
      const w = windows[WINDOWS_I];

      const WINDOW_CONFIG: SessionWindowI = {
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
            WINDOW_CONFIG.tabGroups[tab.groupId].tabIndices.push(TAB_i);
          } else {
            const tabGroupInfo = await tabGroupsGet(tab.groupId);
            WINDOW_CONFIG.tabGroups[tab.groupId] = {
              ...tabGroupInfo,
              tabIndices: [TAB_i],
            };
          }
        }
      }
    }

    const saveBtn = document.createElement("BUTTON");
    saveBtn.textContent = `Save Session (${CONFIG.windows.length} windows)`;
    saveBtn.onclick = () => {
      CONFIG.timestamp = Date.now();
      saveSession(CONFIG);
      renderSessions();
    };

    const appRoot = document.getElementById("save");
    appRoot.innerHTML = "";
    appRoot.appendChild(saveBtn);
    appRoot.appendChild(
      createButton("Export", () => {
        const txt = localStorage.getItem("TAB_FREEZER__SAVED_SESSIONS");
        navigator.clipboard.writeText(txt).then(
          () => {
            alert("Copied to clipboard");
          },
          () => {
            alert("Export failed");
          }
        );
      })
    );
  };

  renderSaveSession();

  const openWindows = async (windows: SessionWindowI[]) => {
    for (let WINDOWS_I = 0; WINDOWS_I < windows.length; WINDOWS_I += 1) {
      const windowConfig = windows[WINDOWS_I];

      const createdWindow = await chrome.windows.create({});
      const tempStarterTab = createdWindow.tabs?.[0];
      // const tabs = await batchOpenTabs(createdWindow.id, windowConfig.tabs);
      // await chrome.tabs.remove(tempStarterTab.id);
      // await Promise.all(tabs.map((t) => chrome.tabs.discard(t.id)));
      await batchOpenAndDiscardTabs(createdWindow.id, windowConfig.tabs);
      await chrome.tabs.remove(tempStarterTab.id);

      const currTabs = (
        await chrome.windows.get(createdWindow.id, {
          populate: true,
        })
      ).tabs;

      const groupMps = Object.values(windowConfig.tabGroups).map(
        ({ tabIndices, ...props }) => ({
          props: props,
          tabIds: tabIndices.map((idx) => currTabs[idx].id),
        })
      );

      if (groupMps.length > 0) await sleep(1);

      for (let i = 0; i < groupMps.length; i += 1) {
        const { tabIds, props } = groupMps[i];

        const groupId = await chrome.tabs.group({
          tabIds,
          createProperties: { windowId: createdWindow.id },
        });
        await chrome.tabGroups.update(groupId, {
          color: props.color,
          collapsed: props.collapsed,
          title: props.title,
        });
      }

      // await sleep(1);
    }

    console.log(chrome.tabs.onUpdated.hasListeners());
  };

  const renderSessions = async () => {
    const sessions = getSessions();

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
          saveSessions(newS);
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

const batchOpenTabs = async (windowId: number, tabs: chrome.tabs.Tab[]) => {
  const createdTabs: Promise<chrome.tabs.Tab>[] = [];

  for (let i = 0; i < tabs.length; i += 1) {
    const tab = tabs[i];

    const t = createTab(windowId, tab);
    createdTabs.push(t);

    // if (batch && i >= 10 && i % 10 === 0) {
    //   console.log(i, i % 10);
    //   // await sleep(2);
    //   const v = await Promise.all(createdTabs);
    //   const n = await discardTabs(v);
    //   console.log(
    //     "old",
    //     v.map((_) => _.id)
    //   );
    //   console.log(
    //     "new",
    //     n.map((_) => _.id)
    //   );
    // }
  }

  return Promise.all(createdTabs);
};

const batchOpenAndDiscardTabs = async (
  windowId: number,
  tabsToCreate: chrome.tabs.Tab[],
  batch: number = 10
): Promise<chrome.tabs.Tab[]> => {
  const tabsToCreateChunks = chunkArray(tabsToCreate, batch);
  const createdTabs: chrome.tabs.Tab[] = [];

  for (let X_i = 0; X_i < tabsToCreateChunks.length; X_i += 1) {
    const chunkedCreatedTabs: Promise<chrome.tabs.Tab>[] = [];

    const tabs = tabsToCreateChunks[X_i];
    for (let i = 0; i < tabs.length; i += 1) {
      chunkedCreatedTabs.push(createTab(windowId, tabs[i]));
    }

    const v = await Promise.all(chunkedCreatedTabs);
    // const n = await discardTabs(v);

    const n = await Promise.all(
      v.map((tabToDiscard) => {
        //@ts-ignore
        if (tabToDiscard.__TIMEDOUT) {
          return Promise.resolve(tabToDiscard);
        } else {
          return chrome.tabs.discard(tabToDiscard.id);
        }
      })
    );

    createdTabs.push(...n);
  }

  return createdTabs;
};

/**
 * Create tab and return a promise for when it will start or finish loading
 */
const createTab = async (windowId: number, tab: chrome.tabs.Tab) => {
  let createdTab = await chrome.tabs.create({
    url: tab.url,
    pinned: tab.pinned,
    windowId,
  });

  let timeoutId: number;

  return new Promise<chrome.tabs.Tab>(async (resolve) => {
    const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      // console.log("CHANGE", tabId, changeInfo.status);
      if (
        createdTab?.id === tabId &&
        ["complete", "loading"].includes(changeInfo.status)
      ) {
        chrome.tabs.onUpdated.removeListener(listener);
        window.clearTimeout(timeoutId);
        resolve(createdTab);
      }
    };

    // TODO label these so they are not discarded!
    timeoutId = window.setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      //@ts-ignore
      createdTab.__TIMEDOUT = true;
      resolve(createdTab);
      console.log("Failed to load Tab", tab);
    }, 4000);

    chrome.tabs.onUpdated.addListener(listener);
  });
};

const discardTabs = (tabs: chrome.tabs.Tab[]) =>
  Promise.all(tabs.map((t) => chrome.tabs.discard(t.id)));

const sleep = async (seconds: number) =>
  await new Promise((r) => setTimeout(r, seconds * 1000));

function chunkArray<T>(origArr: Readonly<T[]>, chunkSize: number): T[][] {
  if (chunkSize === origArr.length) return [[...origArr]];

  const chunkedArrs: T[][] = [];

  for (let i = 0; i < origArr.length; i += chunkSize) {
    chunkedArrs.push(origArr.slice(i, i + chunkSize));
  }

  return chunkedArrs;
}
