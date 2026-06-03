import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { useAppShell } from './useAppShell'

describe('useAppShell', () => {
  it('inicializa idioma y tab desde valores por defecto', () => {
    const shell = useAppShell()

    expect(shell.language.value).toBe('US')
    expect(shell.activeTab.value).toBe(shell.t.value.nav[0])
    expect(shell.languageOptions.length).toBe(3)
  })

  it('al cambiar tema, persiste en localStorage y aplica atributo data-theme', async () => {
    const shell = useAppShell()

    shell.toggleTheme()
    await nextTick()

    expect(localStorage.getItem('app-theme')).toBe(shell.theme.value)
    expect(document.documentElement.getAttribute('data-theme')).toBe(shell.theme.value)
  })

  it('si cambia idioma y el tab actual no existe, lo corrige al primer tab valido', async () => {
    const shell = useAppShell()
    shell.selectTab('Combinations')

    shell.language.value = 'HVR'
    await nextTick()

    expect(shell.activeTab.value).toBe('Inicio')
    expect(localStorage.getItem('app-language')).toBe('HVR')
  })
})