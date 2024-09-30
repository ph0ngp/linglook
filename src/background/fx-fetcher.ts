import Bugsnag from '@birchill/bugsnag-zero';
import * as s from 'superstruct';
import browser from 'webextension-polyfill';

// import { fetchWithTimeout } from '../utils/fetch';
// import { isError } from '../utils/is-error';
// import { getReleaseStage } from '../utils/release-stage';
import { getLocalFxData } from './fx-data';

declare let self: (Window | ServiceWorkerGlobalScope) & typeof globalThis;

const FxDataSchema = s.type({
  timestamp: s.min(s.integer(), 0),
  rates: s.record(s.string(), s.number()),
});

// // Hopefully this is sufficiently similar enough to the DownloadError class used
// // by jpdict-idb that our Bugsnag grouping code should treat them as the same.
// class DownloadError extends Error {
//   code: number;
//   url: string;

//   constructor(url: string, code: number, ...params: any[]) {
//     super(...params);
//     Object.setPrototypeOf(this, DownloadError.prototype);

//     if (typeof (Error as any).captureStackTrace === 'function') {
//       (Error as any).captureStackTrace(this, DownloadError);
//     }

//     this.name = 'DownloadError';
//     this.code = code;
//     this.url = url;
//   }
// }

type FetchState =
  | {
      type: 'idle';
      didFail?: boolean;
    }
  | {
      type: 'fetching';
      retryCount?: number;
    }
  | {
      type: 'waiting to retry';
      timeout: number;
      retryCount: number;
    };

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

export class FxFetcher {
  private fetchState: FetchState = { type: 'idle' };
  private updated: number | undefined;

  constructor() {
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'fx-update') {
        Bugsnag.leaveBreadcrumb('Running FX data update from alarm');
        this.fetchData().catch((e) => Bugsnag.notify(e));
      }
    });

    // Fetch the latest update date and if we've never downloaded the data,
    // do it now.
    //
    // No need to catch errors here, getLocalFxData does its own error
    // handling.
    void getLocalFxData().then((fxData) => {
      if (!fxData) {
        Bugsnag.leaveBreadcrumb('No stored FX data. Doing initial fetch.');
        this.fetchData().catch((e) => Bugsnag.notify(e));
      } else {
        Bugsnag.leaveBreadcrumb(
          `Got stored FX data from ${new Date(
            fxData.timestamp
          )}. Last updated ${new Date(fxData.updated)}.`
        );
        this.updated = fxData.updated;
      }
    });
  }

  private async fetchData() {
    // Don't try fetching if we are offline
    if (!self.navigator.onLine) {
      Bugsnag.leaveBreadcrumb('Deferring FX data update until we are online');
      self.addEventListener('online', () => {
        Bugsnag.leaveBreadcrumb(
          'Fetching FX data update now that we are online'
        );
        void this.fetchData();
      });
      return;
    }

    // Don't try if we are already fetching
    if (this.fetchState.type === 'fetching') {
      Bugsnag.leaveBreadcrumb('Overlapping attempt to fetch FX data.');
      return;
    }

    // Abort any timeout to retry
    if (this.fetchState.type === 'waiting to retry') {
      self.clearTimeout(this.fetchState.timeout);
    }

    // Update our state
    this.fetchState = {
      type: 'fetching',
      retryCount:
        this.fetchState.type === 'waiting to retry'
          ? this.fetchState.retryCount + 1
          : undefined,
    };

    // // Set up base URL
    // let url = 'https://data.10ten.life/fx/jpy.json';

    // // Set up query string
    // const manifest = browser.runtime.getManifest();
    // const queryParams = new URLSearchParams({
    //   sp: '10ten-ja-reader',
    //   sv: (manifest as any).version_name || manifest.version,
    //   sc: getReleaseStage() === 'production' ? 'prod' : 'dev',
    // });
    // url += `?${queryParams.toString()}`;

    // Do the fake fetch
    const fxData: s.Infer<typeof FxDataSchema> = {
      timestamp: Date.now(),
      rates: {
        AED: 0.02583809774841355,
        AFN: 0.47835019037094934,
        ALL: 0.6207995356265652,
        AMD: 2.724614474679851,
        ANG: 0.012676172563110412,
        AOA: 6.63710091719057,
        ARS: 6.7915948854246695,
        AUD: 0.010178734276901143,
        AWG: 0.012679731351885408,
        AZN: 0.011986617870822532,
        BAM: 0.012321994345733408,
        BBD: 0.014201803265356878,
        BDT: 0.8404508825389895,
        BGN: 0.012318259192204962,
        BHD: 0.0026484569050929806,
        BIF: 20.329772887989403,
        BMD: 0.007034522348598277,
        BND: 0.00902245545956967,
        BOB: 0.04860303336920026,
        BRL: 0.038224925037263824,
        BSD: 0.007033483056301154,
        BTC: 1.0699388224053608e-7,
        BTN: 0.5885746339828263,
        BWP: 0.09194627770881601,
        BYN: 0.023016633318926224,
        BZD: 0.014177672787840049,
        CAD: 0.009513139996117834,
        CDF: 20.153912348770927,
        CHF: 0.005917604364992376,
        CLP: 6.325094579850688,
        CNY: 0.04932399988382603,
        CNH: 0.049110856780539155,
        COP: 29.365829351694316,
        CRC: 3.6506320493897406,
        CUC: 0.007034522348598277,
        CUP: 0.1864148737315603,
        CVE: 0.6981792247724755,
        CZK: 0.1583717756531242,
        DJF: 1.2501782842948304,
        DKK: 0.04698501902985138,
        DOP: 0.425239708516681,
        DZD: 0.9299009817098349,
        EGP: 0.33982828031623036,
        ERN: 0.10551785412519774,
        ETB: 0.8385424521393773,
        EUR: 0.006298741194682621,
        FJD: 0.01535990871763481,
        FKP: 0.005357205360901463,
        GBP: 0.005261029881599853,
        GEL: 0.019136652834190093,
        GHS: 0.11093717767176114,
        GIP: 0.005357205360901463,
        GMD: 0.4818919473497546,
        GNF: 60.72555111009299,
        GTQ: 0.0544056668111661,
        GYD: 1.4713223068955703,
        HKD: 0.0546747805287089,
        HNL: 0.17495132852450898,
        HRK: 0.04782780319918231,
        HTG: 0.9269398678893204,
        HUF: 2.501057209066451,
        IDR: 106.39611263487109,
        ILS: 0.02601528763696117,
        INR: 0.5889201073398721,
        IQD: 9.215225775764146,
        IRR: 296.18861409181716,
        ISK: 0.9508592556924922,
        JMD: 1.1049976032974818,
        JOD: 0.0049853969669205415,
        KES: 0.9074559969467735,
        KGS: 0.5923336030517301,
        KHR: 28.595340458330803,
        KMF: 3.1066217148183073,
        KPW: 6.331067153330087,
        KRW: 9.21730123618276,
        KWD: 0.002145603200556688,
        KYD: 0.0058615770620656735,
        KZT: 3.373703256891999,
        LAK: 155.33989158896398,
        LBP: 630.2933073021477,
        LKR: 2.1001191715535295,
        LRD: 1.3631150666449965,
        LSL: 0.12088855888524024,
        LYD: 0.03334631692855793,
        MAD: 0.06818740072750838,
        MDL: 0.12249267190277244,
        MGA: 32.01411884884382,
        MKD: 0.3878480061596146,
        MMK: 22.84785789984436,
        MNT: 23.9033105119232,
        MOP: 0.05632319259306332,
        MRU: 0.27937637624739403,
        MUR: 0.3232390147859233,
        MVR: 0.10805293998752762,
        MWK: 12.211935206285444,
        MXN: 0.1386413404865114,
        MYR: 0.029017683407265755,
        MZN: 0.44933045987279535,
        NAD: 0.12088855888524024,
        NGN: 11.737034748284445,
        NIO: 0.258896649127003,
        NOK: 0.07389169192320165,
        NPR: 0.9417000230678799,
        NZD: 0.011093714617805518,
        OMR: 0.0027051266796215396,
        PAB: 0.007033388575183233,
        PEN: 0.02637315691667826,
        PGK: 0.027951709642442448,
        PHP: 0.39399689400253457,
        PKR: 1.9535132113986482,
        PLN: 0.026946084117005394,
        PYG: 54.900217370188514,
        QAR: 0.025610946244709717,
        RON: 0.03136204338622065,
        RSD: 0.7379710246693286,
        RUB: 0.6628231999846362,
        RWF: 9.369985292628273,
        SAR: 0.026387656618908416,
        SBD: 0.05833339175415792,
        SCR: 0.0932184092729413,
        SDG: 4.2312917355772575,
        SEK: 0.07098095543476207,
        SGD: 0.00900351514479726,
        SHP: 0.005357205360901463,
        SLE: 0.16071988968183112,
        SLL: 147.51040418826986,
        SOS: 4.016715290744131,
        SRD: 0.2159634150467139,
        SVC: 0.06154066038056075,
        SYP: 17.674450858893515,
        SZL: 0.12088855258649903,
        THB: 0.2277101201641722,
        TJS: 0.07483758018714833,
        TMT: 0.024620834518835163,
        TND: 0.021381461208563032,
        TOP: 0.016475585849225358,
        TRY: 0.24011856473280263,
        TTD: 0.0477782950933921,
        TWD: 0.2222231796308838,
        TZS: 19.204251491578134,
        UAH: 0.28954037146989964,
        UGX: 25.98413284735522,
        USD: 0.007034522348598277,
        UYU: 0.29491383388182457,
        UZS: 89.60226843747209,
        VES: 0.25900806126125453,
        VND: 173.11962312918178,
        VUV: 0.8351527593704939,
        WST: 0.0196788169825224,
        XAF: 4.132995596090223,
        XCD: 0.019011156714627237,
        XDR: 0.005203031072679216,
        XOF: 4.1398423655612895,
        XPF: 0.7516397591686383,
        YER: 1.760917357737781,
        ZAR: 0.12040403451758046,
        ZMW: 0.18600709322661654,
      },
    };

    // try {
    //   const response = await fetchWithTimeout(url, {
    //     mode: 'cors',
    //     timeout: 20_000,
    //   });

    //   // Check the response
    //   if (!response.ok) {
    //     throw new DownloadError(url, response.status, response.statusText);
    //   }

    //   // Parse the response
    //   const result = await response.json();
    //   s.assert(result, FxDataSchema);

    //   fxData = result;
    // } catch (e: unknown) {
    //   // Convert network errors disguised as TypeErrors to DownloadErrors
    //   let error = e;
    //   if (
    //     isError(e) &&
    //     e instanceof TypeError &&
    //     (e.message.startsWith('NetworkError') ||
    //       e.message === 'Failed to fetch')
    //   ) {
    //     // Use 418 just so that we pass the check for a retry-able error below
    //     // which looks for a status code in the 4xx~5xx range.
    //     error = new DownloadError(url, 418, e.message);
    //   }

    //   // Possibly schedule a retry
    //   const retryAbleError =
    //     isError(error) &&
    //     (error.name === 'TimeoutError' ||
    //       error.name === 'NetworkError' ||
    //       (error.name === 'DownloadError' &&
    //         (error as DownloadError).code >= 400 &&
    //         (error as DownloadError).code < 500));

    //   const retryCount =
    //     this.fetchState.type === 'fetching' &&
    //     typeof this.fetchState.retryCount === 'number'
    //       ? this.fetchState.retryCount
    //       : 0;
    //   if (retryAbleError && retryCount < 3) {
    //     console.warn(error);
    //     Bugsnag.leaveBreadcrumb(
    //       `Failed attempt #${retryCount + 1} to fetch FX data. Will retry.`,
    //       { error }
    //     );

    //     // We're using setTimeout here but in the case of event pages or service
    //     // workers (as we use on some platforms) these are not guaranteed to
    //     // run.
    //     //
    //     // That's fine though because if the background page gets killed then
    //     // when it restarts it will trigger a new fetch anyway.
    //     const timeout = self.setTimeout(() => this.fetchData(), 10_000);
    //     this.fetchState = { type: 'waiting to retry', retryCount, timeout };
    //   } else {
    //     console.error(error);
    //     void Bugsnag.notify(error);
    //     this.fetchState = { type: 'idle', didFail: true };
    //   }
    // }

    if (fxData) {
      // Store the response
      //
      // If this fails (e.g. due to a QuotaExceededError) there's not much we
      // can do since we communicate the FX data with other components via
      // local storage.
      const updated = Date.now();
      try {
        await browser.storage.local.set({ fx: { ...fxData, updated } });

        // Update our local state now that everything succeeded
        this.updated = updated;
        this.fetchState = { type: 'idle' };
      } catch {
        // Don't report to Bugsnag because this is really common in Firefox for
        // some reason.
        this.fetchState = { type: 'idle', didFail: true };
      }
    }

    // Clear any alarm that might have triggered us so we can set a new alarm.
    await this.cancelScheduledUpdate();

    // If we succeeded, or failed outright, schedule our next update.
    //
    // For the failed outright case, we determined that retrying isn't going to
    // help but who knows, maybe in an hour it will?
    await this.scheduleNextUpdate();
  }

  async scheduleNextUpdate() {
    // If we have an existing alarm, it's not likely to be later than we
    const existingAlarm = await browser.alarms.get('fx-update');
    if (existingAlarm) {
      return;
    }

    // If we are already fetching (or waiting to re-fetch) let it run. It will
    // schedule the next run when it completes.
    if (this.fetchState.type !== 'idle') {
      return;
    }

    // Schedule the next run to run in a day from the last update.
    //
    // If we failed the last update (or failed _every_ update) try again in an
    // hour. We don't want to re-trigger too soon, however, or else we'll ping
    // the server unnecessarily.
    const now = Date.now();
    let nextRun: number;
    if (typeof this.updated === 'undefined' || this.fetchState.didFail) {
      nextRun = now + ONE_HOUR;
    } else {
      nextRun = Math.max(this.updated + ONE_DAY, now);
    }

    // If the next UTC day is before we're scheduled to run next, bring the next
    // run forwards so that we get the data when it is as fresh as possible.
    const nextUtcDay = now + ONE_DAY - (now % ONE_DAY);
    if (nextUtcDay < nextRun) {
      // ... but add a few minutes to avoid all the clients hitting the server
      // at the same time.
      nextRun = nextUtcDay + Math.random() * ONE_HOUR;
    }

    // If the next run is within a minute or so, run it now. Otherwise, schedule
    // it for later.
    if (nextRun <= now + ONE_MINUTE) {
      // Don't wait on fetchData -- it does its own error handling and caller's
      // of this function shouldn't have to wait for us to run the fetch, only
      // to schedule it.
      void this.fetchData();
    } else {
      try {
        Bugsnag.leaveBreadcrumb(
          `Scheduling next FX data update for ${new Date(nextRun)}`
        );
        browser.alarms.create('fx-update', { when: nextRun });
      } catch (e) {
        console.error('Error creating alarm for FX data update', e);
        void Bugsnag.notify(e);
      }
    }
  }

  async cancelScheduledUpdate() {
    await browser.alarms.clear('fx-update');
  }
}
