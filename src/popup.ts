/**
 * FYI
 *
 * - UI is automatically re-rendered on browser action icon click
 *   (Does not persist in between open/close states)
 *
 *   So, if an action closes the UI, on next icon clock, render() will be called
 */

import {
  createSessionConfig,
  getSessions,
  openWindows,
  saveSessions,
} from "./sessionManager.js";

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
    const windows = await chrome.windows.getAll({ populate: true });
    const outerDiv = document.createElement("div");

    const warning = document.createElement("div");
    warning.className = "warning";
    warning.innerText = "Do NOT freeze tabs with unsaved work!";

    const discardCurrentTab = button("Freeze Current Tab", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.discard(tabs[0].id);

        // render() not needed; discarding all tabs closes extension UI
      });
    });

    const discardAllWindows = button("Freeze all Tabs in all Windows", () => {
      windows.forEach(
        (w) => w.tabs.forEach((t) => chrome.tabs.discard(t.id))

        // render() not needed; discarding all tabs closes extension UI
      );
    });

    outerDiv.appendChild(warning);
    outerDiv.append(discardCurrentTab);
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

      const discardAllButton = button("Freeze all tabs", () => {
        w.tabs.forEach((t) =>
          chrome.tabs.discard(t.id, (tabOrUndefined) => {})
        );

        // if current window, discarding current tab will also close extension UI
        if (!w.focused) render();
      });

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
  };

  render();
})();

const button = (text: string, cb: () => void, className?: string) => {
  const btn = document.createElement("BUTTON");
  if (className) btn.className = className;
  btn.textContent = text;
  btn.onclick = () => {
    cb();
  };

  return btn;
};

(function () {
  const renderSaveSession = async () => {
    const { title, save, saveToClipboard } = await createSessionConfig();

    const saveBtn = button(title, () => {
      save();
      renderSessions();
    });

    const appRoot = document.getElementById("save");
    appRoot.innerHTML = "";
    appRoot.appendChild(saveBtn);
    appRoot.appendChild(
      button("Export", () => {
        saveToClipboard();
      })
    );
  };

  renderSaveSession();

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
        button("Open", () => {
          openWindows(sesh.windows);
        })
      );

      seshDiv.appendChild(
        button(
          "Delete",
          () => {
            const newS = sessions.filter((s) => s !== sesh);
            saveSessions(newS);
            renderSessions();
          },
          "danger"
        )
      );
      sessionDiv.appendChild(seshDiv);
    });

    const appRoot = document.getElementById("sessions");
    appRoot.innerHTML = "";
    appRoot.appendChild(sessionDiv);
  };

  renderSessions();
})();
