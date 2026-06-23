// SkeletonLoader.jsx - Loading skeleton components for BATTLEHUB FF

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      {/* Avatar */}
      <div className="flex items-center space-x-4">
        <div className="rounded-full bg-gray-700 h-16 w-16"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-700 rounded-lg h-16"></div>
        ))}
      </div>
      {/* Details */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded w-full"></div>
        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        <div className="h-3 bg-gray-700 rounded w-4/6"></div>
      </div>
    </div>
  );
}

export function TournamentSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-40 bg-gray-700 rounded-lg w-full"></div>
      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse p-4 bg-gray-800 rounded-lg space-y-3">
      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      <div className="h-3 bg-gray-700 rounded w-full"></div>
      <div className="h-3 bg-gray-700 rounded w-5/6"></div>
    </div>
  );
}

export default ProfileSkeleton;
