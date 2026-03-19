import { Member } from "@/lib/househub";

interface AvatarProps {
  member?: Member | null;
  name?: string;
  size?: number;
  radius?: number;
  fontSize?: number;
  isTravelling?: boolean;
  isTopContributor?: boolean;
  // Keep profile prop accepted but ignored — prevents TypeScript errors in other components
  profile?: any;
}

const Avatar = ({
  member,
  name,
  profile,
  size = 44,
  radius = 14,
  fontSize = 18,
  isTravelling = false,
  isTopContributor = false,
}: AvatarProps) => {
  const displayName = name || profile?.nickname || member?.name || "?";
  const initial = displayName[0]?.toUpperCase() || "?";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center font-display font-bold w-full h-full shadow-inner"
        style={{
          borderRadius: radius,
          backgroundColor: "#770042",
          color: "#ffffff",
          fontSize,
        }}
      >
        {initial}
      </div>

      {/* Travel Badge */}
      {isTravelling && (
        <div
          className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md pointer-events-none"
          style={{ fontSize: "12px", border: "2px solid #3b82f6" }}
        >
          ✈️
        </div>
      )}

      {/* Top Contributor Badge */}
      {isTopContributor && (
        <div
          className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md pointer-events-none"
          style={{ fontSize: "12px", border: "2px solid #fbbf24" }}
        >
          🌟
        </div>
      )}
    </div>
  );
};

export default Avatar;
