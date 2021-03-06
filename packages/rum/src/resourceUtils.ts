import {
  addMonitoringMessage,
  Configuration,
  getPathName,
  haveSameOrigin,
  includes,
  isValidUrl,
  msToNs,
  ResourceKind,
} from '@keitoaino/datadog-browser-core'

import { PerformanceResourceDetails } from './rum'

export const FAKE_INITIAL_DOCUMENT = 'initial_document'

const RESOURCE_TYPES: Array<[ResourceKind, (initiatorType: string, path: string) => boolean]> = [
  [ResourceKind.DOCUMENT, (initiatorType: string) => FAKE_INITIAL_DOCUMENT === initiatorType],
  [ResourceKind.XHR, (initiatorType: string) => 'xmlhttprequest' === initiatorType],
  [ResourceKind.FETCH, (initiatorType: string) => 'fetch' === initiatorType],
  [ResourceKind.BEACON, (initiatorType: string) => 'beacon' === initiatorType],
  [ResourceKind.CSS, (_: string, path: string) => path.match(/\.css$/i) !== null],
  [ResourceKind.JS, (_: string, path: string) => path.match(/\.js$/i) !== null],
  [
    ResourceKind.IMAGE,
    (initiatorType: string, path: string) =>
      includes(['image', 'img', 'icon'], initiatorType) || path.match(/\.(gif|jpg|jpeg|tiff|png|svg|ico)$/i) !== null,
  ],
  [ResourceKind.FONT, (_: string, path: string) => path.match(/\.(woff|eot|woff2|ttf)$/i) !== null],
  [
    ResourceKind.MEDIA,
    (initiatorType: string, path: string) =>
      includes(['audio', 'video'], initiatorType) || path.match(/\.(mp3|mp4)$/i) !== null,
  ],
]

export function computeResourceKind(timing: PerformanceResourceTiming) {
  const url = timing.name
  if (!isValidUrl(url)) {
    addMonitoringMessage(`Failed to construct URL for "${timing.name}"`)
    return ResourceKind.OTHER
  }
  const path = getPathName(url)
  for (const [type, isType] of RESOURCE_TYPES) {
    if (isType(timing.initiatorType, path)) {
      return type
    }
  }
  return ResourceKind.OTHER
}

function areInOrder(...numbers: number[]) {
  for (let i = 1; i < numbers.length; i += 1) {
    if (numbers[i - 1] > numbers[i]) {
      return false
    }
  }
  return true
}

export function computePerformanceResourceDuration(entry: PerformanceResourceTiming): number {
  const { duration, startTime, responseEnd } = entry

  // Safari duration is always 0 on timings blocked by cross origin policies.
  if (duration === 0 && startTime < responseEnd) {
    return msToNs(responseEnd - startTime)
  }

  return msToNs(duration)
}

export function computePerformanceResourceDetails(
  entry: PerformanceResourceTiming
): PerformanceResourceDetails | undefined {
  const {
    startTime,
    fetchStart,
    domainLookupStart,
    domainLookupEnd,
    connectStart,
    secureConnectionStart,
    connectEnd,
    requestStart,
    responseStart,
    responseEnd,
  } = entry
  let { redirectStart, redirectEnd } = entry

  // Ensure timings are in the right order.  On top of filtering out potential invalid
  // PerformanceResourceTiming, it will ignore entries from requests where timings cannot be
  // collected, for example cross origin requests without a "Timing-Allow-Origin" header allowing
  // it.
  if (
    !areInOrder(
      startTime,
      fetchStart,
      domainLookupStart,
      domainLookupEnd,
      connectStart,
      connectEnd,
      requestStart,
      responseStart,
      responseEnd
    )
  ) {
    return undefined
  }

  // The only time fetchStart is different than startTime is if a redirection occured.
  const hasRedirectionOccured = fetchStart !== startTime

  if (hasRedirectionOccured) {
    // Firefox doesn't provide redirect timings on cross origin requests.  Provide a default for
    // those.
    if (redirectStart < startTime) {
      redirectStart = startTime
    }
    if (redirectEnd < startTime) {
      redirectEnd = fetchStart
    }

    // Make sure redirect timings are in order
    if (!areInOrder(startTime, redirectStart, redirectEnd, fetchStart)) {
      return undefined
    }
  }

  const details: PerformanceResourceDetails = {
    download: formatTiming(startTime, responseStart, responseEnd),
    firstByte: formatTiming(startTime, requestStart, responseStart),
  }

  // Make sure a connection occured
  if (connectEnd !== fetchStart) {
    details.connect = formatTiming(startTime, connectStart, connectEnd)

    // Make sure a secure connection occured
    if (areInOrder(connectStart, secureConnectionStart, connectEnd)) {
      details.ssl = formatTiming(startTime, secureConnectionStart, connectEnd)
    }
  }

  // Make sure a domain lookup occured
  if (domainLookupEnd !== fetchStart) {
    details.dns = formatTiming(startTime, domainLookupStart, domainLookupEnd)
  }

  if (hasRedirectionOccured) {
    details.redirect = formatTiming(startTime, redirectStart, redirectEnd)
  }

  return details
}

function formatTiming(origin: number, start: number, end: number) {
  return {
    duration: msToNs(end - start),
    start: msToNs(start - origin),
  }
}

export function computeSize(entry: PerformanceResourceTiming) {
  // Make sure a request actually occured
  if (entry.startTime < entry.responseStart) {
    return entry.decodedBodySize
  }
  return undefined
}

export function isValidResource(url: string, configuration: Configuration) {
  return url && !isBrowserAgentRequest(url, configuration)
}

function isBrowserAgentRequest(url: string, configuration: Configuration) {
  return (
    haveSameOrigin(url, configuration.logsEndpoint) ||
    haveSameOrigin(url, configuration.rumEndpoint) ||
    haveSameOrigin(url, configuration.traceEndpoint) ||
    (configuration.internalMonitoringEndpoint && haveSameOrigin(url, configuration.internalMonitoringEndpoint))
  )
}
