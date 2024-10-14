<div align="center">
  <img src="images/wenzi.svg" alt="Wenzi" width="200" height="200" />
  <h1>Wenzi</h1>

  <p>
    Hi fellow Chinese reader! This browser extension lets you look up Chinese words with the hover of a mouse or tap of a screen.
  </p>

  <p>
    <a href=""><img src="https://github.com/ph0ngp/wenzi/workflows/CI/badge.svg" alt="automated test status" /></a>
  </p>
</div>

## Table of Contents

- [Usage](#usage)
- [Building from source](#building-a-release-from-source)
- [Contributing](#contributing)

## Usage

By default, you can enable the Wenzi by either:

- Pressing the toolbar button (you may need to add it to the browser toolbar yourself in some browsers)
- Pressing <kbd>Alt</kbd>+<kbd>R</kbd>
- Choosing to enable it from the context menu

Alternatively, a lot of users find it helpful to have the extension permanently
enabled but configured to only show the pop-up when either <kbd>Alt</kbd> or
<kbd>Ctrl</kbd> is pressed.

The other keys are as follows:

| Action                                    | Key                                                 |
| ----------------------------------------- | --------------------------------------------------- |
| Switch dictionary (words → kanji → names) | <kbd>Shift</kbd> / <kbd>Enter</kbd>                 |
| Show kanji results only                   | <kbd>Shift</kbd> _(disabled by default)_            |
| Toggle display of definitions             | <kbd>d</kbd> _(disabled by default)_                |
| Move the popup up or down                 | <kbd>j</kbd> / <kbd>k</kbd> _(disabled by default)_ |
| Enter copy mode                           | <kbd>c</kbd>                                        |
| (Copy mode) Copy entry                    | <kbd>e</kbd>                                        |
| (Copy mode) Copy tab-separated fields     | <kbd>y</kbd>                                        |
| (Copy mode) Copy word/kanji               | <kbd>w</kbd>                                        |
| (Copy mode) Select next entry             | <kbd>c</kbd>                                        |

## Building a release from source

First replace `bugsnag_api_key_placeholder` in `src/utils/secrets.ts` with your Bugsnag API key. You can run `git update-index --assume-unchanged src/utils/secrets.ts` to prevent it from being shown in diffs and from being committed.

You may also build the add-ons using a source package from the
[Releases](https://github.com/ph0ngp/wenzi/releases) page and running the
following commands:

```
export RELEASE_BUILD=1
pnpm install
pnpm package:firefox
# Or `yarn package:firefox` for versions 0.20.0 and earlier
# Or `yarn package` for versions 0.5.8 and earlier
```

(Note that you may ignore the `.js` files associated with each release.
These are published simply to provide a public URL for each version of the
source files to associating stack traces from error reports.)

The above builds the package for **Firefox**.
Use `pnpm package:chrome` to build the Chrome package, `pnpm package:edge` for
Edge, `pnpm package:safari` for Safari, or `pnpm package:thunderbird` for
Thunderbird.

**Note:** For versions prior to and including 0.5.5 `pnpm install` will try to
install `husky` but fail so you will need to run `pnpm install --ignore-scripts`.

To build the latest trunk version please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Data sources
- [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict), licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/)
- [Hanzi Writer project](https://hanziwriter.org), licensed under the [MIT License](https://hanziwriter.org/license.html)
- [Hán-Việt Pinyin wordlist](https://github.com/ph0ngp/hanviet-pinyin-wordlist), licensed under the [MIT License](https://github.com/ph0ngp/hanviet-pinyin-wordlist/blob/main/LICENSE)

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md).
