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

- [Installing](#installing)
- [Features](#features)
- [Usage](#usage)
- [Building from source](#building-a-release-from-source)
- [Contributing](#contributing)

## Features

- Pitch accent information

- Support for non-English dictionaries

- Dictionaries that update automatically twice a week by fetching just the updated entries
- Easy to read dictionary entries

- Automatic translation of Japanese-era years into Gregorian years (e.g. 昭和５６年、令和元年、平成三十一年)

- Automatic translation between 畳/帖 measurements and square meters (e.g. 四畳半、12.6 帖、25 平米、6m<sup>2</sup>)

- Recognition of a wide range of grammatical forms
  (e.g. vs-c verbs like 兼した,
  irregular verbs like いらっしゃいます,
  continuous forms like 食べてた,
  ん as a negative form like 分からん、知らん,
  words with ー like じーちゃん、頑張ろー、そーゆー,
  ぬ verbs,
  とく・どく forms like 買っとく,
  causative passive, させる for verbs ending in す e.g. 起こさせる)
- Automatic preview of name entries when there is a better match in the name dictionary

- Handling of a wide range of characters including ㋕, ㌀, ㋿, 𠏹沢, ８月, Ｂ級グルメ, オーサカ

- Localized into Japanese (so you can study Japanese while you study Japanese!) and Simplified Chinese

- Prioritization of common matches
- Support for displaying romaji
- Copy feature that allows selecting which entry and in what format to copy to the clipboard

- Smart popup positioning
- Support for vertical text and text in SVG images
- Minimal memory usage
- Kanji data for Kanji kentei, Conning references, updated educational levels, heavily reworked kanji components etc.

- Intuitive settings window

- Isolation of styles so that the popup always looks correct
- Handling of ruby text in YouTube

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

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md).
