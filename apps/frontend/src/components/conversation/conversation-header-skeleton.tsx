export function ConversationHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b animate-pulse">
      <div className="h-10 w-10 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-3 bg-muted rounded w-16" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-8 rounded-lg bg-muted" />
        <div className="h-8 w-8 rounded-lg bg-muted" />
        <div className="h-8 w-8 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
