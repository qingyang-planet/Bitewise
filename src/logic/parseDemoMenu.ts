import { cloneDemoMenu } from '../data/demoMenu'
import type { MenuParseResult } from '../domain/types'

export function parseDemoMenu(source: MenuParseResult['source'] = 'sample'): MenuParseResult {
  return {
    parserMode: 'local-demo',
    source,
    dishes: cloneDemoMenu(),
    disclaimer: 'Demo results are generated from a fixed local menu dataset. No OCR or image upload is used.',
  }
}
