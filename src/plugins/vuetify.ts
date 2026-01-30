import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// (Opcional) si instalaste @mdi/font por npm:
// import '@mdi/font/css/materialdesignicons.css'

export const vuetify = createVuetify({
  components,          // 👈 importa TODOS los componentes
  directives,          // 👈 y TODAS las directivas
  theme: {
    defaultTheme: 'light',
    themes: {
      light: { colors: { primary:'#3390ce', secondary:'#185ce2', surface:'rgba(198, 228, 240, 0.82)', info:'#620ee9d4' } },
      dark:  { colors: { primary:'#93d8c7', secondary:'#96b3d9', surface:'#10424f', info:'#d1e7f0' } }
    }
  } 
})