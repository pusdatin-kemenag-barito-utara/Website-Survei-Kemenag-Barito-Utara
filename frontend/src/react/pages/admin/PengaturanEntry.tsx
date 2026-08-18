
import { Providers } from '@/react/Providers'
import AdminLayout from '@/components/admin/AdminLayout'
import Page from '@/react/pages/admin/PengaturanPage'

export default function AdminPengaturanEntry() {
  return (
    <Providers>
      <AdminLayout>
        <Page />
      </AdminLayout>
    </Providers>
  )
}
