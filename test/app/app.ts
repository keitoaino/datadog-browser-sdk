import { datadogLogs } from '@keitoaino/datadog-browser-logs'
import { datadogRum } from '@keitoaino/datadog-browser-rum'

// fallback for server side rendering
const hostname = typeof location === 'object' ? location.hostname : ''
const intakeOrigin = `http://${hostname}:4000`

datadogLogs.init({
  clientToken: 'key',
  forwardErrorsToLogs: true,
  internalMonitoringEndpoint: `${intakeOrigin}/monitoring`,
  logsEndpoint: `${intakeOrigin}/logs`,
  rumEndpoint: `${intakeOrigin}/rum`,
})

datadogRum.init({
  applicationId: 'rum',
  clientToken: 'key',
  internalMonitoringEndpoint: `${intakeOrigin}/monitoring`,
  logsEndpoint: `${intakeOrigin}/logs`,
  rumEndpoint: `${intakeOrigin}/rum`,
  enableExperimentalFeatures: ['collect-user-actions'],
})
