export function SkeletonPlaceholder({ rows = 6 }: { rows?: number }) {
  return (
    <div className="p-6 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded mb-3 ${
            i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-3/4' : 'w-5/6'
          }`}
        />
      ))}
    </div>
  );
}
