
import { Providers } from '@/react/Providers'
import AdminLayout from '@/components/admin/AdminLayout'
import Page from '@/react/pages/admin/LaporanPage'

export default function AdminLaporanEntry() {
  return (
    <Providers>
      <AdminLayout>
        <Page />
      </AdminLayout>
    </Providers>
  )
}
