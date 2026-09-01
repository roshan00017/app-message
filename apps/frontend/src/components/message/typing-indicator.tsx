interface TypingIndicatorProps {
  userIds: string[];
  userNames?: Record<string, string>;
}

export function TypingIndicator({ userIds, userNames }: TypingIndicatorProps) {
  if (!userIds || userIds.length === 0) return null;

  const resolveName = (id: string) => userNames?.[id] ?? 'Someone';

  const label =
    userIds.length === 1
      ? `${resolveName(userIds[0])} is typing`
      : userIds.length === 2
        ? `${resolveName(userIds[0])} and ${resolveName(userIds[1])} are typing`
        : `${resolveName(userIds[0])} and ${userIds.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 py-2 pl-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/5 bg-cardx px-4 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 typing-dot" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 typing-dot" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 typing-dot" />
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
