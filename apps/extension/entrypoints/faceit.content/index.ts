import { defineContentScript, createShadowRootUi } from '#imports'
import { createApp } from 'vue'
import App from './App.vue'
import '@/assets/tailwind.css'

// The Faceit overlay, mounted as a Vue app inside a Shadow DOM so Tailwind and
// shadcn-vue styles are fully isolated from Faceit's page (and vice-versa).
export default defineContentScript({
  matches: ['*://*.faceit.com/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'cs2dv-overlay',
      position: 'inline',
      anchor: 'body',
      onMount(container) {
        const app = createApp(App)
        // Expose the shadow-root container so reka-ui portals (Select dropdown)
        // teleport inside the shadow tree (keeps styles) and escape the panel's
        // own `overflow-hidden`/scroll clipping.
        app.provide('uiRoot', container)
        app.mount(container)
        return app
      },
      onRemove(app) {
        app?.unmount()
      },
    })
    ui.mount()
  },
})
