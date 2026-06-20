import { defineContentScript } from '#imports'

// Runs in the page's MAIN world so it can monkey-patch the page's own fetch.
// When Faceit asks its API for a signed demo download URL, we read the answer
// out of the response and forward it to the isolated content script. This is the
// no-API-key path: we never call Faceit ourselves, we just observe the call the
// site already makes when the user hits its "Download demo" button.
export default defineContentScript({
  matches: ['*://*.faceit.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    const DOWNLOAD_API = '/api/download/v2/demos/download-url'
    const origFetch = window.fetch

    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const res = await origFetch.apply(this, args)
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url
        if (url && url.includes(DOWNLOAD_API)) {
          // Clone so the page still consumes the body normally.
          res
            .clone()
            .json()
            .then((data) => {
              const signed = data?.payload?.download_url
              if (signed) {
                window.postMessage({ source: 'cs2dv-extension', kind: 'capturedDemoUrl', url: signed }, '*')
              }
            })
            .catch(() => {})
        }
      } catch {
        /* never break the page's fetch */
      }
      return res
    }
  },
})
