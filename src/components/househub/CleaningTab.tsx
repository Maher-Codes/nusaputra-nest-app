import { useState } from "react";
import { Member, CleanRecord, RotationEntry, fmtDate } from "@/lib/househub";

interface CleaningTabProps {
  rotation:       RotationEntry[];
  myNextClean:    RotationEntry | undefined;
  user:           Member | null;
  getMember:      (id: string) => Member | undefined;
  isMyTurnClean:  boolean;
  doClean:        () => void;
  cleanRecs:      CleanRecord[];
}

const CleaningTab = ({
  rotation,
  myNextClean,
  user,
  getMember,
  isMyTurnClean,
  doClean,
  cleanRecs,
}: CleaningTabProps) => {
  const [justDone, setJustDone] = useState(false);

  // "done" is true if the user just pressed the button OR if they have
  // a clean record within the last 7 days — uses DB column `date` not `cleaning_date`
  const done =
    justDone ||
    (isMyTurnClean &&
      cleanRecs.some(
        r =>
          r.member_id === user?.id &&
          Date.now() - new Date(r.date).getTime() < 7 * 86400000
      ));

  const handle = () => {
    setJustDone(true);
    doClean();
  };

  const nextClean = rotation[0];
  const nextMbr   = getMember(nextClean?.memberId ?? "");
  const lastClean = cleanRecs[0];
  const lastMbr   = getMember(lastClean?.member_id ?? "");

  return (
    <div className="flex flex-col gap-6">

      {/* SECTION 1 — Next Cleaning */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Next Cleaning
        </h3>
        <div className={`rounded-xl border p-5 transition-all ${
          isMyTurnClean && !done
            ? "bg-primary/5 border-primary/30"
            : "bg-card shadow-sm"
        }`}>
          <p className="font-display font-black text-2xl text-foreground mb-1">
            {nextClean ? fmtDate(nextClean.date, { weekday: "long" }) : "—"}
          </p>
          <p className="text-sm text-foreground font-medium">
            Responsible:{" "}
            <span className="font-bold">{nextMbr?.name ?? "—"}</span>
          </p>

          {isMyTurnClean && !done && (
            <button
              className="mt-4 w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90 transition-colors"
              onClick={handle}
            >
              I cleaned the house
            </button>
          )}

          {done && (
            <p className="mt-3 text-sm font-bold text-primary">
              ✓ Cleaning marked as done!
            </p>
          )}

          {!isMyTurnClean && nextMbr && (
            <p className="text-sm text-muted-foreground mt-2">
              Waiting for{" "}
              <span className="font-semibold text-foreground">{nextMbr.name}</span>{" "}
              to clean.
            </p>
          )}
        </div>
      </section>

      {/* SECTION 2 — Last Cleaning */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Last Cleaning
        </h3>
        {lastClean ? (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-base font-bold text-foreground">
              {lastMbr?.name ?? "—"}
              <span className="text-muted-foreground font-normal mx-1">—</span>
              {/* DB column is `date`, not `cleaning_date` */}
              {fmtDate(lastClean.date, { month: "long", day: "numeric" })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No cleaning recorded yet.</p>
        )}
      </section>

      {/* SECTION 3 — Upcoming rotation */}
      <section>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Upcoming Turns
        </h3>
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {rotation.length > 0 ? (
            rotation.map((r, i) => {
              const m    = getMember(r.memberId);
              const isMe = r.memberId === user?.id;
              return (
                <div
                  key={`${r.memberId}-${i}`}
                  className="flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-b-0"
                >
                  <span className="font-display font-bold text-muted-foreground w-5 shrink-0">
                    {i + 1}.
                  </span>
                  <span className="flex-1 font-medium text-foreground">
                    <span className={isMe ? "text-primary font-bold" : ""}>
                      {m?.name ?? "—"}
                    </span>
                    {isMe && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(You)</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(r.date, { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground px-5 py-4">
              No upcoming schedule yet.
            </p>
          )}
        </div>
      </section>

    </div>
  );
};

export default CleaningTab;
