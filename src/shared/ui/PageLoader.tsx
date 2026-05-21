export function PageLoader() {
  return (
    <div
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-neutral-50 px-4"
      role="status"
    >
      <span className="text-sm font-medium text-neutral-600">Loading...</span>
    </div>
  )
}
