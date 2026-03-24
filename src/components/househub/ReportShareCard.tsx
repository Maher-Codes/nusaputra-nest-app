import { Member, CleanRecord, Purchase, Supply, MemberProfile } from "@/lib/househub";

interface ReportShareCardProps {
  house: { name: string; house_code: string };
  members: Member[];
  cleanRecs: CleanRecord[];
  purchases: Purchase[];
  activeSupplies: Supply[];
  memberProfiles: Record<string, MemberProfile>;
  periodLabel: string;
  reportType: "monthly" | "weekly";
  generatedByLabel: string;
  universityLabel: string;
}

function getDisplayName(
  memberId: string,
  members: Member[],
  memberProfiles: Record<string, MemberProfile>
): string {
  const profile = memberProfiles[memberId];
  const member = members.find(m => m.id === memberId);
  const raw = profile?.nickname?.trim() || member?.name || "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const ReportShareCard = ({
  house,
  members,
  cleanRecs,
  purchases,
  activeSupplies,
  memberProfiles,
  periodLabel,
  reportType,
  generatedByLabel,
  universityLabel,
}: ReportShareCardProps) => {
  return (
    <div
      id="report-share-card"
      style={{
        width: "380px",
        backgroundColor: "#ffffff",
        fontFamily: "'Inter', sans-serif",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(119,0,66,0.15)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)",
          padding: "24px 24px 20px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: "absolute", top: "-20px", right: "-20px",
          width: "100px", height: "100px", borderRadius: "50%",
          background: "radial-gradient(circle, #D4A373, transparent)", opacity: 0.15,
        }} />
        <div style={{
          position: "absolute", bottom: "-10px", left: "-10px",
          width: "70px", height: "70px", borderRadius: "50%",
          background: "radial-gradient(circle, #ffffff, transparent)", opacity: 0.10,
        }} />

        {/* NusaNest branding */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "20px" }}>🏠</span>
            <span style={{ color: "#D4A373", fontWeight: 900, fontSize: "18px", letterSpacing: "-0.02em" }}>
              NusaNest
            </span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.9)", fontWeight: 900, fontSize: "15px", margin: 0 }}>
            {house.name.toUpperCase()}
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600, margin: "3px 0 0" }}>
            {periodLabel}
          </p>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
        {members.map((m, idx) => {
          const memberCleans = cleanRecs.filter(r => r.member_id === m.id).length;
          const memberPurchases = purchases.filter(p => p.member_id === m.id).length;
          const displayName = getDisplayName(m.id, members, memberProfiles);
          return (
            <div key={m.id} style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              padding: "10px 20px",
              borderBottom: idx < members.length - 1 ? "1px solid #f1f5f9" : "none",
              backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa",
              gap: "8px",
            }}>
              {/* Name */}
              <p style={{
                fontWeight: 800,
                fontSize: "13px",
                color: "#770042",
                margin: 0,
                whiteSpace: "nowrap",
              }}>
                {displayName}
              </p>
              {/* Dotted line filling the middle */}
              <div style={{
                flex: 1,
                borderBottom: "2px dotted #e2e8f0",
                marginBottom: "2px",
              }} />
              {/* Stats */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <p style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#770042",
                  margin: 0,
                  whiteSpace: "nowrap",
                  backgroundColor: "rgba(119,0,66,0.08)",
                  padding: "2px 8px",
                  borderRadius: "99px",
                }}>
                  {memberCleans} {memberCleans === 1 ? "clean" : "cleans"}
                </p>
                <p style={{ fontSize: "10px", color: "#cbd5e1", margin: 0 }}>·</p>
                <p style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#b8845a",
                  margin: 0,
                  whiteSpace: "nowrap",
                  backgroundColor: "rgba(212,163,115,0.15)",
                  padding: "2px 8px",
                  borderRadius: "99px",
                }}>
                  {memberPurchases} {memberPurchases === 1 ? "buy" : "buys"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Report Body ── */}
      <div style={{ padding: "16px 20px" }}>

        {/* Cleaning Section */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px" }}>🧹</span>
            <p style={{ fontWeight: 900, fontSize: "11px", color: "#770042", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
              Cleaning
            </p>
          </div>
          {cleanRecs.length > 0 ? (
            cleanRecs
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(r => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "6px 0", borderBottom: "1px solid #f8fafc",
                }}>
                  <span style={{ color: "#22c55e", fontSize: "12px" }}>✓</span>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#334155", margin: 0, flex: 1 }}>
                    <strong style={{ color: "#770042" }}>
                      {getDisplayName(r.member_id, members, memberProfiles)}
                    </strong> cleaned the house
                  </p>
                  <p style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, margin: 0, whiteSpace: "nowrap" }}>
                    {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))
          ) : (
            <p style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic", margin: 0 }}>
              No cleaning this period
            </p>
          )}
        </div>

        {/* Supply Sections */}
        {activeSupplies.map(supply => {
          const supplyPurchases = purchases
            .filter(p => p.item_name === supply.label)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          return (
            <div key={supply.id} style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px" }}>{supply.icon}</span>
                <p style={{ fontWeight: 900, fontSize: "11px", color: "#770042", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                  {supply.label}
                </p>
              </div>
              {supplyPurchases.length > 0 ? (
                supplyPurchases.map(p => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "6px 0", borderBottom: "1px solid #f8fafc",
                  }}>
                    <span style={{ color: "#22c55e", fontSize: "12px" }}>✓</span>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#334155", margin: 0, flex: 1 }}>
                      <strong style={{ color: "#770042" }}>
                        {getDisplayName(p.member_id, members, memberProfiles)}
                      </strong> bought {supply.label}
                    </p>
                    <p style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, margin: 0, whiteSpace: "nowrap" }}>
                      {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic", margin: 0 }}>
                  No purchases this period
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{
        background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
          {generatedByLabel}
        </p>
        <p style={{ color: "#D4A373", fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
          {universityLabel}
        </p>
      </div>
    </div>
  );
};

export default ReportShareCard;
