Do you keep a lot of Chrome tabs open? Does your laptop sound like jet engine? Does it get hot enough to jeopardize your chances of having kids? Does your battery percentage reduce in front of your very eyes?

Use **Tab Freezer** to freeze tabs so they do not consume memory or cpu, **enabling longer battery life** and **better performance**. You get to **keep all your window and tab organizations as is**, not having to manage bookmarks or links, and can easily get back to paused work.

<INCLUDE GIF HERE>

# Tab Freezer

_A simple, open source, non-minified extension to easily discard chrome tabs to increase performance and battery life._

### Technical specs

With Chrome Extensions being susceptible to take overs and becoming malware, I wanted to make sure that the code was always easy to read and audit.

The code is **not minified/uglified** and the **JavaScript code is ~100 lines of code** _with_ comments. Right click the extension icon in toolbar, click inspect, and you can easily read the code _actually_ deployed and running in your browser, not just on Github.

It only requires `tabs` permission from Chrome, to be able to list windows and tabs in the UI and **use Chrome's built-in discard functionality**.

> A discarded tab is one whose content has been unloaded from memory, but is still visible in the tab strip. Its content is reloaded the next time it is activated.

Chrome has a built in way to "discard" tabs, which puts them in a state where they do not consume your computer's memory or cpu. Discarded tabs are reloaded when you click on them. **Discarding tabs does NOT close them**.

Chrome only discards tabs when your computer is running out of memory. However, there are reasons you may want to discard tabs prematurely: **preserving battery life on a laptop**, needing memory for other applications, keeping numerous JavaScript heavy tabs (YouTube, Facebook, etc.) **open passively for long periods of time**.

This extension simply provides a convenient UI to use Chrome's discard functionality on demand.

[You can read more about Chrome's tab discarding here.](https://developers.google.com/web/updates/2015/09/tab-discarding)

### Inspiration

Auto Tab Discard https://chrome.google.com/webstore/detail/auto-tab-discard/jhnleheckmknfcgijgkadoemagpecfol

The Great Suspender (removed from Chrome store due to malware)

# Dev

Build extension to deploy (after cd into directory):

```
zip -r build.zip . -x "README.md" -x ".DS_Store" -x "*.git*"
```
