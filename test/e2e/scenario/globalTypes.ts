import { LogsGlobal } from '@keitoaino/datadog-browser-logs'
import { RumGlobal } from '@keitoaino/datadog-browser-rum'

declare global {
  interface Window {
    DD_LOGS?: LogsGlobal
    DD_RUM?: RumGlobal
  }

  namespace WebdriverIO {
    interface Config {
      e2eMode: string
    }
  }
}
