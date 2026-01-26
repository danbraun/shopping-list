# shopping-list

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Note: a fix was applied in order to make Claude for Chrome browser extension available to Claude Code:

What you disabled:
The native messaging host file enables communication between the Claude browser extension and Claude Desktop (the native app). By renaming it, you've broken that
connection.

What still works:

- Claude Code (this CLI) connects to the browser extension via a different mechanism (WebSocket), which is why it's working now

What you may have lost:

- Any browser integration features that Claude Desktop provides (if you use it)
- The conflict likely occurred because both Claude Desktop and Claude Code were trying to control the extension simultaneously

Should you reverse it?

- If you don't use Claude Desktop's browser features, no immediate concern
- If you do use Claude Desktop with the browser, you'll want to restore it when you're done with Claude Code

I ran:

```sh
mv ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.anthropic.claude_browser_extension.json \
~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.anthropic.claude_browser_extension.json.b
# oops, i used '.b' instead of the conventional '.bak'
```

To restore later:

```sh
mv ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.anthropic.claude_browser_extension.json.b \
~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.anthropic.claude_browser_extension.json
```

The underlying issue is that Claude Desktop and Claude Code both want to talk to the same extension. This is a known conflict - you may need to swap between them
depending on which tool you're using.
