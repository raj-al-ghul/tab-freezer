interface SessionWindowI {
  tabGroups: {
    [key in number]: {
      tabIdxs: number[];
    } & chrome.tabGroups.TabGroup;
  };
  pinnedTabIndices: number[];
  tabs: chrome.tabs.Tab[];
}

interface SessionI {
  timestamp: number;
  windows: SessionWindowI[];
}
