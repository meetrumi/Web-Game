export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }) {
  return <div className="container-page py-8 sm:py-10">{children}</div>
}
