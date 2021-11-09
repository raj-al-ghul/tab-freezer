import { chunkArray, sleep } from "./utils.js";

export const openWindows = async (windows: SessionWindowI[]) => {
  for (let WINDOWS_I = 0; WINDOWS_I < windows.length; WINDOWS_I += 1) {
    const windowConfig = windows[WINDOWS_I];

    const createdWindow = await chrome.windows.create({});
    const tempStarterTab = createdWindow.tabs?.[0];
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

export const getSessions = (): SessionI[] =>
  JSON.parse(localStorage.getItem("TAB_FREEZER__SAVED_SESSIONS")) ?? [];

const saveSession = (session: SessionI) => {
  localStorage.setItem(
    "TAB_FREEZER__SAVED_SESSIONS",
    JSON.stringify([...getSessions(), session])
  );
};

export const saveSessions = (sessions: SessionI[]) => {
  localStorage.setItem("TAB_FREEZER__SAVED_SESSIONS", JSON.stringify(sessions));
};

export const createSessionConfig = async () => {
  const windows = await chrome.windows.getAll({ populate: true });
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
          const tabGroupInfo = await chrome.tabGroups.get(tab.groupId);
          WINDOW_CONFIG.tabGroups[tab.groupId] = {
            ...tabGroupInfo,
            tabIndices: [TAB_i],
          };
        }
      }
    }
  }

  const title = `Save Session (${CONFIG.windows.length} windows)`;

  const save = () => {
    CONFIG.timestamp = Date.now();
    saveSession(CONFIG);
  };

  const saveToClipboard = () => {
    const txt = localStorage.getItem("TAB_FREEZER__SAVED_SESSIONS");
    navigator.clipboard.writeText(txt).then(
      () => alert("Copied to clipboard"),
      () => alert("Export failed")
    );
  };

  return { title, save, saveToClipboard };
};
