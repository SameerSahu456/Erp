import { useEffect, useState } from 'react'

import { UI } from '@/shared/constants'
import { useDebounce } from '@/shared/hooks'

import { useInsightView } from './useInsightView'

// The Sales Team search box — on the dashboard card AND on the inner leaderboard.
//
// The text lives in the URL (`?team_search=`) so the card's "Show all" opens the
// leaderboard already searched, and the back arrow brings it home again. The input
// itself stays local state (typing must not rewrite the URL on every keystroke):
// it STARTS from the URL, and the URL is written once the typing settles — the
// same debounce the query already waits on, so the URL, the box and the request
// always agree.
export function useSalesTeamSearch() {
  const { teamSearch, setTeamSearch } = useInsightView()
  const [raw, setRaw] = useState(teamSearch ?? '')
  const applied = useDebounce(raw.trim(), UI.DEBOUNCE_SEARCH_MS)

  // Deliberately keyed on `applied` only: it is the typed value settling that
  // should write the URL. Keying on `teamSearch` too would fight an external URL
  // change (Back, a pasted link) by writing the old text straight back.
  const urlValue = teamSearch ?? ''
  useEffect(() => {
    if (applied !== urlValue) setTeamSearch(applied || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied])

  return { raw, setRaw, applied }
}
