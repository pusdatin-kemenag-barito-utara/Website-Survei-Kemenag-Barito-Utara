
import { Providers } from '@/react/Providers'
import AdminLayout from '@/components/admin/AdminLayout'
import Page from '@/react/pages/admin/PertanyaanPage'

export default function AdminPertanyaanEntry() {
  return (
    <Providers>
      <AdminLayout>
        <Page />
      </AdminLayout>
    </Providers>
  )
}
