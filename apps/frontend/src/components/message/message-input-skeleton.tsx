export function MessageInputSkeleton() {
  return (
    <div className="p-4 border-t animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="flex-1 h-10 bg-muted rounded-lg" />
        <div className="h-10 w-10 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
