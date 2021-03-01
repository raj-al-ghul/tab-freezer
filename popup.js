"use strict";

/**
 * FYI
 *
 * - UI is automatically re-rendered on browser action icon click
 *   (Does not persist in between open/close states)
 *
 *   So, if an action closes the UI, on next icon clock, render() will be called
 */

(function () {
  function render() {
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

      windows.forEach((w) => {
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
        if (w.focused) {
          titleDiv = document.createElement("MARK");
          titleDiv.innerText = titleText;
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

        summary.appendChild(titleDiv);
        summary.appendChild(discardAllButton);

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
  }

  render();
})();
