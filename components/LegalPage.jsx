/**
 * Legal / static page shell. Keeps /about, /contact, /privacy-policy and /dmca
 * visually consistent and readable without pulling in a typography plugin.
 */
export default function LegalPage({ title, updated, children }) {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
          {title}
        </h1>
        {updated && (
          <p className="mt-2 text-sm text-ink-400">Last updated: {updated}</p>
        )}
        <div
          className="prose-article mt-8 space-y-5
            [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a:hover]:text-brand-700
            [&_h2]:mb-2 [&_h2]:mt-9 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink-900 dark:[&_h2]:text-white
            [&_h3]:mb-1.5 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-ink-900 dark:[&_h3]:text-white
            [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1
            [&_ul]:space-y-1.5"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
