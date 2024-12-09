import { Client as BugsnagClient } from '@birchill/bugsnag-zero';
import {
  BITS_PER_GLOSS_TYPE,
  Gloss,
  GlossType,
  GlossTypes,
  RawKanjiMeta,
  RawReadingMeta,
  RawWordSense,
  WordResult,
} from '@birchill/jpdict-idb';
import { kanaToHiragana } from '@birchill/normal-jp';
import { LRUMap } from 'lru_map';
import browser from 'webextension-polyfill';

import { DbLanguageId } from '../common/db-languages';
import { hskData } from '../content/hsk';
import { tocflData } from '../content/tocfl';
import { stripFields } from '../utils/strip-fields';
import { Overwrite } from '../utils/type-helpers';

import { DictionaryWordResult, Sense } from './search-result';
import { sortWordResults } from './word-match-sorting';

interface FlatFileDatabaseOptions {
  // Although the v7 API of bugsnag-js can operate on a singleton client we
  // still need to pass this in so that we can avoid trying to call bugsnag
  // when running unit tests (and trying to do so would trigger errors because
  // we failed to call start anyway).
  bugsnag?: BugsnagClient;
}

type FlatFileDatabaseEvent =
  | { type: 'loaded' }
  | { type: 'error'; error: any; willRetry: boolean };

type FlatFileDatabaseListener = (event: FlatFileDatabaseEvent) => void;

interface CacheEntry {
  cedict_id: number[];
  ids_id: number[];
}

class FlatFileDatabase {
  bugsnag?: BugsnagClient;
  listeners: Array<FlatFileDatabaseListener> = [];
  loaded: Promise<any>;
  cache = new LRUMap<string, CacheEntry | null>(500);
  // wordDict: string;
  cedictWordDict: string;
  // wordIndex: string;
  cedictWordIndex: string;
  idsDict: string;

  constructor(options: FlatFileDatabaseOptions & { lang: DbLanguageId }) {
    this.bugsnag = options.bugsnag;
    this.loaded = this.loadData(options.lang);
  }

  //
  // Loading
  //

  private async loadData(lang: DbLanguageId): Promise<void> {
    try {
      // Read in series to reduce contention
      // this.wordDict = await this.readFileWithAutoRetry(
      //   browser.runtime.getURL('data/words.ljson')
      // );
      // this.wordIndex = await this.readFileWithAutoRetry(
      //   browser.runtime.getURL('data/words.idx')
      // );
      this.cedictWordDict = await this.readFileWithAutoRetry(
        browser.runtime.getURL(`data/cedict_${lang}.u8`)
      );
      this.cedictWordIndex = await this.readFileWithAutoRetry(
        browser.runtime.getURL(`data/cedict_${lang}.idx`)
      );
      this.idsDict = await this.readFileWithAutoRetry(
        browser.runtime.getURL(`data/char_${lang === 'fr' ? 'en' : lang}.txt`) // TODOP: sync this with default dict lang
      );

      this.notifyListeners({ type: 'loaded' });
    } catch (e) {
      this.notifyListeners({ type: 'error', error: e, willRetry: false });
    }
  }

  private async readFileWithAutoRetry(url: string): Promise<string> {
    let attempts = 0;

    // Bugsnag only gives us 30 characters for the breadcrumb but it's the
    // end of the url we really want to record.
    const makeBreadcrumb = (prefix: string, url: string): string => {
      const urlStart = Math.max(0, url.length - (30 - prefix.length - 1));
      return prefix + '…' + url.substring(urlStart);
    };

    if (this.bugsnag) {
      this.bugsnag.leaveBreadcrumb(makeBreadcrumb('Loading: ', url));
    }

    while (true) {
      // We seem to occasionally hit loads that never finish (particularly on
      // Linux and particularly on startup / upgrade). Set a timeout so that
      // we can at least abort and try again.
      const TIMEOUT_MS = 5 * 1000;
      let timeoutId: number | undefined;

      try {
        let controller: AbortController | undefined;
        let requestOptions: RequestInit | undefined;

        // It turns out some people are still using Firefox < 57. :/
        if (typeof AbortController === 'function') {
          controller = new AbortController();
          requestOptions = { signal: controller.signal };
        }

        timeoutId = self.setTimeout(
          () => {
            timeoutId = undefined;
            if (controller) {
              console.error(`Load of ${url} timed out. Aborting.`);
              if (this.bugsnag) {
                this.bugsnag.leaveBreadcrumb(makeBreadcrumb('Aborting: ', url));
              }
              controller.abort();
            } else {
              // TODO: This error doesn't actually propagate and do anything
              // useful yet. But for now at least it means Firefox 56 doesn't
              // break altogether.
              if (this.bugsnag) {
                void this.bugsnag.notify('[Pre FF57] Load timed out');
              }
              throw new Error(`Load of ${url} timed out.`);
            }
          },
          TIMEOUT_MS * (attempts + 1)
        );

        const response = await fetch(url, requestOptions);
        const responseText = await response.text();

        clearTimeout(timeoutId);
        if (this.bugsnag) {
          this.bugsnag.leaveBreadcrumb(makeBreadcrumb('Loaded: ', url));
        }

        return responseText;
      } catch (e) {
        if (typeof timeoutId === 'number') {
          clearTimeout(timeoutId);
        }

        if (this.bugsnag) {
          this.bugsnag.leaveBreadcrumb(
            makeBreadcrumb(`Failed(#${attempts + 1}): `, url)
          );
        }

        if (++attempts >= 3) {
          console.error(`Failed to load ${url} after ${attempts} attempts`);
          throw e;
        }

        this.notifyListeners({ type: 'error', error: e, willRetry: true });

        // Wait for a (probably) increasing interval before trying again
        const intervalToWait = Math.round(Math.random() * attempts * 1000);
        console.log(
          `Failed to load ${url}. Trying again in ${intervalToWait}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, intervalToWait));
      }
    }
  }

  //
  // Searching
  //

  // async getWords1({
  //   input,
  //   maxResults,
  // }: {
  //   input: string;
  //   maxResults: number;
  // }): Promise<Array<DictionaryWordResult>> {
  //   await this.loaded;

  //   let offsets = this.lookupCache.get(input);
  //   if (!offsets) {
  //     const lookupResult = findLineStartingWith({
  //       source: this.wordIndex,
  //       text: input + ',',
  //     });
  //     if (!lookupResult) {
  //       this.lookupCache.set(input, []);
  //       return [];
  //     }
  //     offsets = lookupResult.split(',').slice(1).map(Number);
  //     this.lookupCache.set(input, offsets);
  //   }

  //   const result: Array<DictionaryWordResult> = [];

  //   for (const offset of offsets) {
  //     const entry = JSON.parse(
  //       this.wordDict.substring(offset, this.wordDict.indexOf('\n', offset))
  //     ) as RawWordRecord;

  //     result.push(
  //       toDictionaryWordResult({ entry, matchingText: input, offset })
  //     );
  //   }

  //   // Sort before capping the number of results
  //   sortWordResults(result);
  //   result.splice(maxResults);

  //   return result;
  // }

  async getWords({
    input,
    maxResults,
  }: {
    input: string;
    maxResults: number;
  }): Promise<Array<DictionaryWordResult>> {
    await this.loaded;
    const matchedEntries: Array<{
      def: string;
      pinyin: string;
      cedict_idx: number;
      traditional: string;
      simplified: string;
      ids_data: string;
    }> = [];
    let maxLen = 0;

    if (!this.cache.has(input)) {
      const separatorChar = ' ';
      const found = findNeedle(input + separatorChar, this.cedictWordIndex);
      if (found) {
        const parts = found.split(separatorChar).slice(1);
        this.cache.set(input, {
          cedict_id: parts[0].split(',').map(Number),
          ids_id: parts.length > 1 ? parts[1].split(',').map(Number) : [],
        });
      } else {
        this.cache.set(input, null);
      }
    }

    const word_data = this.cache.get(input);
    if (word_data) {
      // if this input is found in cedict
      const cedict_indices = word_data.cedict_id;
      const ids_data = word_data.ids_id
        .map((idx) => this.idsDict.slice(idx, this.idsDict.indexOf('\n', idx)))
        .join('\n');
      for (let i = 0; i < cedict_indices.length; i++) {
        const dataEntry: string = this.cedictWordDict.slice(
          cedict_indices[i],
          this.cedictWordDict.indexOf('\n', cedict_indices[i])
        );
        const entry = dataEntry.match(
          /^([^\s]+?)\s+([^\s]+?)\s+\[(.*?)\]?\s*\/(.+)\//
        );
        if (!entry) {
          // This definition's format is wrong
          continue;
        }
        matchedEntries.push({
          def: entry[4].replace(/\//g, '; '),
          pinyin: entry[3].trim(),
          cedict_idx: cedict_indices[i],
          traditional: entry[1],
          simplified: entry[2],
          ids_data, // can be empty string or single line or multiple lines separated by \n
        });
        maxLen = maxLen || input.length;
      }
    }

    const result: Array<DictionaryWordResult> = [];

    if (!matchedEntries.length) {
      return result;
    }

    for (let i = 0; i < matchedEntries.length; i++) {
      const hasHSK = Object.prototype.hasOwnProperty.call(
        hskData,
        matchedEntries[i].simplified
      );
      const hasTOCFL = Object.prototype.hasOwnProperty.call(
        tocflData,
        matchedEntries[i].traditional
      );
      const pField = ['bg1'];
      if (hasHSK) {
        pField.push('wk' + hskData[matchedEntries[i].simplified]);
      }
      if (hasTOCFL) {
        pField.push('bv' + tocflData[matchedEntries[i].traditional]);
      }

      const rawWordRecord: RawWordRecord = {
        k: [matchedEntries[i].simplified, matchedEntries[i].traditional],
        km: [
          {
            p: pField,
            bg: matchedEntries[i].ids_data,
          },
        ],
        r: [matchedEntries[i].pinyin],
        s: [
          {
            g: [matchedEntries[i].def],
          },
        ],
      };
      result.push(
        toDictionaryWordResult({
          entry: rawWordRecord,
          matchingText: input,
          offset: matchedEntries[i].cedict_idx,
        })
      );
    }

    // Sort before capping the number of results
    sortWordResults(result);
    result.splice(maxResults);

    return result;
  }

  //
  // Listeners
  //

  addListener(listener: FlatFileDatabaseListener) {
    if (this.listeners.includes(listener)) {
      return;
    }

    this.listeners.push(listener);
  }

  removeListener(listener: FlatFileDatabaseListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  notifyListeners(event: FlatFileDatabaseEvent) {
    const listenersCopy = this.listeners.slice();
    for (const listener of listenersCopy) {
      listener(event);
    }
  }
}

function findNeedle(needle: string, haystack: string): string | null {
  let start = 0;
  let end = haystack.length - 1;

  // TODO2: can there be problems with first line (because not started with \n) or last line (because not ended with \n)?
  while (start < end) {
    const mid = Math.floor((start + end) / 2);
    const newLineIndex = haystack.lastIndexOf('\n', mid) + 1; // Find the start of the line containing 'mid'
    const slice = haystack.slice(newLineIndex, newLineIndex + needle.length); // Extract the potential match

    if (needle < slice) {
      end = newLineIndex - 1; // Adjust the end to just before the start of the current line
    } else if (needle > slice) {
      start = haystack.indexOf('\n', mid + 1) + 1; // Move the start to the beginning of the next line
    } else {
      return haystack.slice(newLineIndex, haystack.indexOf('\n', mid + 1)); // Return the matching line
    }
  }

  return null; // If no match is found
}

// // Performs a binary search of a linefeed delimited string, |data|, for |text|.
// function findLineStartingWith({
//   source,
//   text,
// }: {
//   source: string;
//   text: string;
// }): string | null {
//   const tlen = text.length;
//   let start = 0;
//   let end: number = source.length - 1;

//   while (start < end) {
//     const midpoint: number = (start + end) >> 1;
//     const i: number = source.lastIndexOf('\n', midpoint) + 1;

//     const candidate: string = source.substring(i, i + tlen);
//     if (text < candidate) {
//       end = i - 1;
//     } else if (text > candidate) {
//       start = source.indexOf('\n', midpoint + 1) + 1;
//     } else {
//       return source.substring(i, source.indexOf('\n', midpoint + 1));
//     }
//   }

//   return null;
// }

// This type matches the structure of the records in the flat file database
// (which, incidentally, differ slightly from the data format used by jpdict-idb
// since, for example, they don't include the ID field).
//
// As a result it is only used as part of the fallback mechanism.

interface RawWordRecord {
  k?: Array<string>;
  km?: Array<0 | RawKanjiMeta>;
  r: Array<string>;
  rm?: Array<0 | RawReadingMeta>;
  s: Array<RawWordSense>;
}

function toDictionaryWordResult({
  entry,
  matchingText,
  offset,
}: {
  entry: RawWordRecord;
  matchingText: string;
  offset: number;
}): DictionaryWordResult {
  const kanjiMatch =
    !!entry.k && entry.k.some((k) => kanaToHiragana(k) === matchingText);
  const kanaMatch =
    !kanjiMatch && entry.r.some((r) => kanaToHiragana(r) === matchingText);

  return {
    id: offset,
    k: mergeMeta(entry.k, entry.km, (key, meta) => ({
      ent: key,
      ...meta,
      match:
        (kanjiMatch && kanaToHiragana(key) === matchingText) || !kanjiMatch,
      matchRange:
        kanaToHiragana(key) === matchingText ? [0, key.length] : undefined,
    })),
    r: mergeMeta(entry.r, entry.rm, (key, meta) => ({
      ent: key,
      ...meta,
      match: (kanaMatch && kanaToHiragana(key) === matchingText) || !kanaMatch,
      matchRange:
        kanaToHiragana(key) === matchingText ? [0, key.length] : undefined,
    })),
    s: expandSenses(entry.s),
  };
}

type WithExtraMetadata<T> = Overwrite<
  T,
  {
    wk: WordResult['k'][0]['wk'];
    bv: WordResult['k'][0]['bv'];
    bg: WordResult['k'][0]['bg'];
  }
>;

function mergeMeta<MetaType extends RawKanjiMeta | RawReadingMeta, MergedType>(
  keys: Array<string> | undefined,
  metaArray: Array<0 | MetaType> | undefined,
  merge: (key: string, meta?: WithExtraMetadata<MetaType>) => MergedType
): Array<MergedType> {
  const result: Array<MergedType> = [];

  for (const [i, key] of (keys || []).entries()) {
    const meta: MetaType | undefined =
      metaArray && metaArray.length >= i + 1 && metaArray[i] !== 0
        ? (metaArray[i] as MetaType)
        : undefined;

    // The following is taken from jpdict-idb's `makeWordResult` function.
    //
    // WaniKani levels are stored in the `p` (priority) field for simplicity
    // in the form `wk{N}` where N is the level number.
    // We need to extract any such levels and store them in the `wk` field
    // instead.
    //
    // Likewise for Bunpro levels which need to be combined with an `bv` /
    // `bg` fields since these contain the original source text for a fuzzy
    // match.
    let wk: number | undefined;
    let bv: number | undefined;
    let bg: number | undefined;

    const p = meta?.p?.filter((p) => {
      if (/^wk\d+$/.test(p)) {
        const wkLevel = parseInt(p.slice(2), 10);
        if (typeof wk === 'undefined' || wkLevel < wk) {
          wk = wkLevel;
        }
        return false;
      }

      if (/^bv\d+$/.test(p)) {
        const bvLevel = parseInt(p.slice(2), 10);
        if (typeof bv === 'undefined' || bvLevel < bv) {
          bv = bvLevel;
        }
        return false;
      }

      if (/^bg\d+$/.test(p)) {
        const bgLevel = parseInt(p.slice(2), 10);
        if (typeof bg === 'undefined' || bgLevel < bg) {
          bg = bgLevel;
        }
        return false;
      }

      return true;
    });

    if (p?.length) {
      meta!.p = p;
    } else {
      delete meta?.p;
    }

    const extendedMeta = meta as WithExtraMetadata<MetaType> | undefined;

    if (wk) {
      extendedMeta!.wk = wk;
    }

    if (typeof bv === 'number') {
      extendedMeta!.bv = Object.assign(
        { l: bv },
        meta?.bv ? { src: meta?.bv } : undefined
      );
    }

    if (typeof bg === 'number') {
      extendedMeta!.bg = Object.assign(
        { l: bg },
        meta?.bg ? { src: meta?.bg } : undefined
      );
    }

    result.push(merge(key, extendedMeta));
  }

  return result;
}

function expandSenses(senses: Array<RawWordSense>): Array<Sense> {
  return senses.map((sense) => ({
    g: expandGlosses(sense),
    ...stripFields(sense, ['g', 'gt']),
    match: true,
  }));
}

function expandGlosses(sense: RawWordSense): Array<Gloss> {
  // Helpers to work out the gloss type
  const gt = sense.gt || 0;
  const typeMask = (1 << BITS_PER_GLOSS_TYPE) - 1;
  const glossTypeAtIndex = (i: number): GlossType => {
    return GlossTypes[(gt >> (i * BITS_PER_GLOSS_TYPE)) & typeMask];
  };

  return sense.g.map((gloss, i) => {
    // This rather convoluted mess is because our test harness differentiates
    // between properties that are not set and those that are set to
    // undefined.
    const result: Gloss = { str: gloss };

    const type = glossTypeAtIndex(i);
    if (type !== 'none') {
      result.type = type;
    }

    return result;
  });
}

// ---------------------------------------------------------------------------
//
// Loader utility
//
// ---------------------------------------------------------------------------

// This is all a bit complicated. It comes about because we want the following
// behavior:
//
// If we are looking up words and need to fallback to the flat file dictionary
// we should wait for it to load. However, if it fails to load the first time
// we should retry automatically but NOT make callers wait for those retries.
//
// However, if one of those automatic retries succeeds, subsequent calls to get
// the database should use the resolved promise.

export type FlatFileDatabaseLoadState =
  | 'unloaded'
  | 'loading'
  | 'retrying'
  | 'error'
  | 'ok';

export type FlatFileDatabaseLoadCallback = (
  state: FlatFileDatabaseLoadState
) => void;

export class FlatFileDatabaseLoader {
  loadState: FlatFileDatabaseLoadState = 'unloaded';
  onUpdate: FlatFileDatabaseLoadCallback | undefined;

  private bugsnag?: BugsnagClient;
  private flatFileDatabase: FlatFileDatabase | undefined;
  private loadError: any;

  private loadPromise: Promise<FlatFileDatabase> | undefined;
  private resolveLoad: (db: FlatFileDatabase) => void;
  private rejectLoad: (e: any) => void;

  private lang: DbLanguageId;

  constructor(options: FlatFileDatabaseOptions) {
    this.bugsnag = options.bugsnag;
    this.onFlatFileDatabaseUpdated = this.onFlatFileDatabaseUpdated.bind(this);
  }

  reset(): void {
    if (this.flatFileDatabase) {
      this.flatFileDatabase.removeListener(this.onFlatFileDatabaseUpdated);
      this.flatFileDatabase = undefined;
    }

    this.loadState = 'unloaded';
    if (this.onUpdate) {
      this.onUpdate(this.loadState);
    }
  }

  resetIfNotLoaded(): void {
    if (this.loadState === 'ok') {
      return;
    }

    this.reset();
  }

  // CY: must setLang before calling loading database the first time
  setLang(lang: DbLanguageId): void {
    if (typeof this.lang === 'undefined') {
      this.lang = lang;
    } else if (this.lang === lang) {
      return;
    } else {
      this.reset();
      this.lang = lang;
    }
  }

  // CY: must setLang before calling load()
  load(): Promise<FlatFileDatabase> {
    if (this.flatFileDatabase && this.loadPromise) {
      return this.loadPromise;
    }

    this.flatFileDatabase = new FlatFileDatabase({
      bugsnag: this.bugsnag,
      lang: this.lang,
    });
    this.flatFileDatabase.addListener(this.onFlatFileDatabaseUpdated);

    this.loadPromise = new Promise<FlatFileDatabase>((resolve, reject) => {
      this.resolveLoad = resolve;
      this.rejectLoad = reject;
    });

    this.loadState = 'loading';
    if (this.onUpdate) {
      this.onUpdate(this.loadState);
    }

    return this.loadPromise;
  }

  private onFlatFileDatabaseUpdated(event: FlatFileDatabaseEvent) {
    switch (event.type) {
      case 'loaded':
        this.loadState = 'ok';
        this.loadError = undefined;

        // If this is the initial load, make sure to resolve the load promise.
        //
        // (If it is NOT the initial load, resolveLoad will be a no-op since
        // rejectLoad will have already been called.)
        if (this.resolveLoad && this.flatFileDatabase) {
          this.resolveLoad(this.flatFileDatabase);
        }

        // If this is not the initial load, make sure to replace the loadPromise
        // so that anyone who waits on it from now on will get the resolved
        // database.
        if (this.flatFileDatabase) {
          this.loadPromise = Promise.resolve(this.flatFileDatabase);
        }
        break;

      case 'error':
        if (event.willRetry) {
          this.loadState = 'retrying';
        } else {
          this.loadState = 'error';
          // Reset the flat file database so that subsequence calls to load()
          // will retry loading.
          this.flatFileDatabase?.removeListener(this.onFlatFileDatabaseUpdated);
          this.flatFileDatabase = undefined;
        }
        this.loadError = event.error;
        if (this.rejectLoad) {
          this.rejectLoad(event.error);
        }
        break;
    }

    if (this.onUpdate) {
      this.onUpdate(this.loadState);
    }
  }

  get database(): Promise<FlatFileDatabase> {
    switch (this.loadState) {
      case 'unloaded':
        return this.load();

      case 'loading':
        return this.loadPromise!;

      case 'retrying':
      // This should fail since we don't want the caller to wait on retries so
      // this falls through

      case 'error':
        return Promise.reject(this.loadError);

      case 'ok':
        return Promise.resolve(this.flatFileDatabase!);
    }
  }
}
