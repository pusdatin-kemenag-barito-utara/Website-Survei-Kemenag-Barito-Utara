
import { Providers } from '@/react/Providers'
import Page from '@/react/pages/ArsipPage'

export interface ArsipEntryProps {
  type?: string
  year?: string
  period?: string
}

export default function ArsipEntry(props: ArsipEntryProps) {
  return (
    <Providers>
      <Page {...props} />
    </Providers>
  )
}
