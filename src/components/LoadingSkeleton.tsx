export function LoadingSkeleton() {
  return (
    <div className="animate-fade-in space-y-3">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Analyzing your idea…
        </div>
      </div>

      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-2xl p-5"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded-lg animate-pulse" style={{ width: `${65 + (i % 3) * 10}%` }} />
              <div className="h-3 bg-muted/60 rounded-lg animate-pulse w-20" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 ml-9">
            {[...Array(3 + (i % 2))].map((_, j) => (
              <div
                key={j}
                className="h-7 rounded-lg bg-muted/80 animate-pulse"
                style={{ width: `${50 + j * 20}px` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
