import { isIE } from '@keitoaino/datadog-browser-core'

import { matchRequestTiming } from '../src/matchRequestTiming'
import { RequestCompleteEvent } from '../src/requestCollection'

describe('matchRequestTiming', () => {
  const FAKE_REQUEST: Partial<RequestCompleteEvent> = { startTime: 100, duration: 500 }
  let entries: PerformanceResourceTiming[]

  beforeEach(() => {
    if (isIE()) {
      pending('no full rum support')
    }
    entries = []
    spyOn(performance, 'getEntriesByName').and.returnValues(entries)
  })

  it('should match single timing nested in the request ', () => {
    const match: Partial<PerformanceResourceTiming> = { startTime: 200, duration: 300 }
    entries.push(match as PerformanceResourceTiming)

    const timing = matchRequestTiming(FAKE_REQUEST as RequestCompleteEvent)

    expect(timing).toEqual(match as PerformanceResourceTiming)
  })

  it('should not match single timing outside the request ', () => {
    const match: Partial<PerformanceResourceTiming> = { startTime: 0, duration: 300 }
    entries.push(match as PerformanceResourceTiming)

    const timing = matchRequestTiming(FAKE_REQUEST as RequestCompleteEvent)

    expect(timing).toEqual(undefined)
  })

  it('should match two following timings nested in the request ', () => {
    const optionsTiming: Partial<PerformanceResourceTiming> = { startTime: 200, duration: 50 }
    const actualTiming: Partial<PerformanceResourceTiming> = { startTime: 300, duration: 100 }
    entries.push(optionsTiming as PerformanceResourceTiming, actualTiming as PerformanceResourceTiming)

    const timing = matchRequestTiming(FAKE_REQUEST as RequestCompleteEvent)

    expect(timing).toEqual(actualTiming as PerformanceResourceTiming)
  })

  it('should not match two not following timings nested in the request ', () => {
    const match1: Partial<PerformanceResourceTiming> = { startTime: 200, duration: 100 }
    const match2: Partial<PerformanceResourceTiming> = { startTime: 250, duration: 100 }
    entries.push(match1 as PerformanceResourceTiming, match2 as PerformanceResourceTiming)

    const timing = matchRequestTiming(FAKE_REQUEST as RequestCompleteEvent)

    expect(timing).toEqual(undefined)
  })

  it('should not match multiple timings nested in the request', () => {
    const match1: Partial<PerformanceResourceTiming> = { startTime: 100, duration: 100 }
    const match2: Partial<PerformanceResourceTiming> = { startTime: 200, duration: 100 }
    const match3: Partial<PerformanceResourceTiming> = { startTime: 300, duration: 100 }
    entries.push(
      match1 as PerformanceResourceTiming,
      match2 as PerformanceResourceTiming,
      match3 as PerformanceResourceTiming
    )

    const timing = matchRequestTiming(FAKE_REQUEST as RequestCompleteEvent)

    expect(timing).toEqual(undefined)
  })
})
