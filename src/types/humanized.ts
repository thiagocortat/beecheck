export type HumanLabel = '🟢' | '🟡' | '🔴'

export type HumanCard = {
  key:
    | 'perfNet'
    | 'resources'
    | 'cacheCdn'
    | 'images'
    | 'a11y'
    | 'seo'
    | 'pwa'
    | 'thirdParties'
  title: string
  label: HumanLabel
  lines: {
    what: string
    why: string
    doNow: string
    detail?: string
  }
  bars?: {
    name: string
    value: number
    suffix?: string
    max?: number
  }[]
  chips?: {
    name: string
    value: string
  }[]
  tooltip?: string
}