import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReportNotification, ago } from "@/lib/househub";
import { houseService } from "@/services/houseService";
import {
  Bell,
  Handshake,
  AlertTriangle,
  CheckCircle2,
  Mail,
  X,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: ReportNotification[];
  houseId: string;
  onRefresh: () => void;
}

const TYPE_ICONS = {
  co_sign_request:    { emoji: "🤝", bg: "bg-blue-50",    border: "border-blue-100"   },
  reported_notice:    { emoji: "⚠️", bg: "bg-orange-50",  border: "border-orange-100" },
  report_confirmed:   { emoji: "✓",  bg: "bg-green-50",   border: "border-green-100"  },
  university_response:{ emoji: "📬", bg: "bg-primary/8",  border: "border-primary/15" },
};

export const NotificationDrawer = ({
  isOpen,
  onClose,
  notifications,
  houseId,
  onRefresh,
}: NotificationDrawerProps) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (
    notificationId: string,
    reportId: string,
    action: "support" | "decline"
  ) => {
    setLoadingAction(`${notificationId}-${action}`);
    try {
      if (action === "support") {
        await houseService.addCoSigner(
          houseId,
          reportId,
          notifications.find((n) => n.id === notificationId)!.member_id
        );
      } else {
        await houseService.declineCoSign(
          houseId,
          reportId,
          notifications.find((n) => n.id === notificationId)!.member_id
        );
      }
      await houseService.markNotificationRead(houseId, notificationId);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const markRead = async (notificationId: string, read: boolean) => {
    if (read) return;
    try {
      await houseService.markNotificationRead(houseId, notificationId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="flex flex-col bg-white overflow-hidden"
      style={{
        borderRadius: "20px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)",
        maxHeight: "85vh",
      }}
    >

      {/* ── Hero Strip ── */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)",
          padding: "24px 24px 52px 24px",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #D4A373, transparent)" }}
        />
        <div
          className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ffffff, transparent)" }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", zIndex: 20 }}
        >
          <X size={15} color="white" />
        </button>

        {/* Header content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">🔔</span>
            <span
              className="text-lg font-display font-black tracking-tight"
              style={{ color: "#D4A373" }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                className="text-[11px] font-black px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(212,163,115,0.25)", color: "#D4A373" }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-white font-bold text-sm leading-snug">
            Stay on top of your house. 🏠
          </p>
          <p className="text-white/50 text-xs font-medium mt-0.5">
            Cleaning turns, supply duties & house updates — all in one place.
          </p>
        </div>
      </div>

      {/* ── Bell icon overlapping the strip ── */}
      <div
        className="flex justify-center shrink-0 relative z-10"
        style={{ marginTop: "-28px" }}
      >
        <div
          className="p-[3px] shadow-lg"
          style={{
            background: "linear-gradient(135deg, #D4A373 0%, #f5d9a8 50%, #D4A373 100%)",
            borderRadius: "18px",
          }}
        >
          <div
            className="p-[3px] bg-white flex items-center justify-center"
            style={{ borderRadius: "15px", width: "52px", height: "52px" }}
          >
            <Bell size={24} className="text-primary" />
          </div>
        </div>
      </div>

      {/* ── Scrollable notification list ── */}
      <div
        className="overflow-y-auto px-4 pt-3 pb-3 space-y-2"
        style={{ maxHeight: "calc(85vh - 220px)" }}
      >
        {notifications.length > 0 ? (
          notifications.map((n) => {
            const meta = TYPE_ICONS[n.type] ?? {
              emoji: "🔔",
              bg: "bg-slate-50",
              border: "border-slate-100",
            };

            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id, n.read)}
                className={cn(
                  "relative p-4 rounded-2xl border-2 transition-all flex gap-3 cursor-pointer",
                  n.read
                    ? "bg-slate-50 border-slate-100 opacity-60"
                    : "bg-white border-primary/20 shadow-sm shadow-primary/5"
                )}
              >
                {/* Unread dot */}
                {!n.read && (
                  <div
                    className="absolute top-3 right-3 w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#770042" }}
                  />
                )}

                {/* Icon box */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0",
                    meta.bg
                  )}
                >
                  {meta.emoji}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      !n.read ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {n.message}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    {ago(n.created_at)}
                  </p>

                  {/* Co-sign action buttons */}
                  {n.type === "co_sign_request" && !n.read && (
                    <div
                      className="flex gap-2 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        disabled={!!loadingAction}
                        onClick={() => handleAction(n.id, n.report_id, "support")}
                        className="flex-1 h-8 rounded-full text-[11px] font-black uppercase tracking-wider text-white transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: "#770042" }}
                      >
                        {loadingAction === `${n.id}-support` ? "..." : "🤝 Support"}
                      </button>
                      <button
                        disabled={!!loadingAction}
                        onClick={() => handleAction(n.id, n.report_id, "decline")}
                        className="flex-1 h-8 rounded-full text-[11px] font-black uppercase tracking-wider border-2 border-slate-200 text-slate-500 transition-opacity disabled:opacity-50"
                      >
                        {loadingAction === `${n.id}-decline` ? "..." : "Decline"}
                      </button>
                    </div>
                  )}

                  {n.type === "co_sign_request" && n.read && (
                    <p className="text-[10px] font-bold text-primary italic pt-1">
                      Response recorded ✓
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div>
              <p className="font-display font-black text-lg text-foreground/70">
                All quiet here 🎉
              </p>
              <p className="text-sm text-muted-foreground/50 max-w-[200px] mx-auto mt-1 leading-relaxed">
                No notifications yet. We'll let you know when something happens in your house.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Close button at bottom ── */}
      <div
        className="shrink-0 px-5 py-4"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={onClose}
          className="w-full h-11 rounded-2xl font-display font-bold text-sm border-2 transition-all duration-200"
          style={{
            borderColor: "rgba(119, 0, 66, 0.25)",
            color: "#770042",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(119, 0, 66, 0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          }}
        >
          Close
        </button>
      </div>

    </div>
  );
};
