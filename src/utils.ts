export const discardTabs = (tabs: chrome.tabs.Tab[]) =>
  Promise.all(tabs.map((t) => chrome.tabs.discard(t.id)));

export const sleep = async (seconds: number) =>
  await new Promise((r) => setTimeout(r, seconds * 1000));

export function chunkArray<T>(
  origArr: Readonly<T[]>,
  chunkSize: number
): T[][] {
  if (chunkSize === origArr.length) return [[...origArr]];

  const chunkedArrs: T[][] = [];

  for (let i = 0; i < origArr.length; i += chunkSize) {
    chunkedArrs.push(origArr.slice(i, i + chunkSize));
  }

  return chunkedArrs;
}
