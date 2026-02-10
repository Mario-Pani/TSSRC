import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

export const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: { colors: { primary:'#3390ce', secondary:'#185ce2', surface:'rgba(198, 228, 240, 0.82)', info:'#620ee9d4' } },
      dark:  { colors: { primary:'#327f93', secondary:'#96b3d9', surface:'#0f4856', info:'#d1e7f0' } }
    }
  } 
})