
import { Providers } from '@/react/Providers'
import AdminLayout from '@/components/admin/AdminLayout'
import Page from '@/react/pages/admin/ResponPage'

export default function AdminResponEntry() {
  return (
    <Providers>
      <AdminLayout>
        <Page />
      </AdminLayout>
    </Providers>
  )
}
