export function MessageListSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`animate-pulse ${i % 2 === 0 ? 'items-start' : 'items-end'}`}>
            <div className="flex items-center gap-2 mb-1">
              {i % 2 === 0 && <div className="h-6 w-6 rounded-full bg-muted" />}
              <div className="h-3 bg-muted rounded w-16" />
            </div>
            <div
              className={`h-10 bg-muted rounded-lg ${
                i % 2 === 0 ? 'rounded-tl-none w-64' : 'rounded-tr-none w-48'
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
