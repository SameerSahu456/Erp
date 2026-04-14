export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sans">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Welcome to comprinttech. Select a module from the sidebar to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-card border border-border p-4 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground">Metric {i + 1}</p>
            <p className="text-2xl font-bold font-sans">--</p>
          </div>
        ))}
      </div>
      <div className="h-[200vh]" />
    </div>
  )
}
