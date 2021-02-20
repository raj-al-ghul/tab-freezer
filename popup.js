"use strict";

/**
 * TODO
 *
 * - show number of tabs per window that have been discarded
 *    e.g.
 *    - Window (0/15 tabs discarded)
 *    - Window (13/15 tabs loaded)
 *
 * - Re-render list after discarding tabs to update count
 */

(function () {
  chrome.windows.getAll({ populate: true }, (windows) => {
    const outerDiv = document.createElement("div");

    const warning = document.createElement("div");
    warning.className = "warning";
    warning.innerText = "Do NOT freeze tabs with unsaved work!";

    const discardAllWindows = document.createElement("button");
    discardAllWindows.textContent = "Freeze all Tabs in all Windows";
    discardAllWindows.onclick = () => {
      windows.forEach((w) => w.tabs.forEach((t) => chrome.tabs.discard(t.id)));
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

      let titleDiv;
      const titleText = `Window (${w.tabs.length} tabs)`;
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

    document.getElementById("app").appendChild(outerDiv);
  });
})();
