import { EmptyState } from '@/components/common/feedback/EmptyState'
import { NoAccess } from '@/shared/components/feedback/NoAccess'

import { WMS_ACCESS_STRINGS } from '../../access/access.strings'
import { DEVICE_DETAIL_BODY_STRINGS } from '../device-detail-body.strings'

interface DeviceUnavailableProps {
  forbidden: boolean
  isError: boolean
  notFoundTitle: string
  onRetry: () => void
}

/** Why the dossier can't render: no access (a permission boundary — never
 *  "doesn't exist"), a load failure with retry, or genuinely not found. */
export function DeviceUnavailable({ forbidden, isError, notFoundTitle, onRetry }: DeviceUnavailableProps) {
  if (forbidden) {
    return (
      <NoAccess
        title={WMS_ACCESS_STRINGS.deviceForbiddenTitle}
        description={WMS_ACCESS_STRINGS.deviceForbidden}
      />
    )
  }
  if (isError) {
    return (
      <EmptyState
        title={DEVICE_DETAIL_BODY_STRINGS.loadErrorTitle}
        description={DEVICE_DETAIL_BODY_STRINGS.loadErrorDescription}
        action={{ label: DEVICE_DETAIL_BODY_STRINGS.retry, onClick: onRetry }}
      />
    )
  }
  return <EmptyState title={notFoundTitle} description={DEVICE_DETAIL_BODY_STRINGS.notFoundDescription} />
}
