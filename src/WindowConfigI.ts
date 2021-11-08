interface WindowConfigI {
  tabGroups: {
    [key in number]: {
      tabIdxs: number[];
    } & chrome.tabGroups.TabGroup;
  };
  pinnedTabIndices: number[];
  tabs: chrome.tabs.Tab[];
}

interface ConfigI {
  timestamp: number;
  windows: WindowConfigI[];
}
