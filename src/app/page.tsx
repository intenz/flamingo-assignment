import { QueueSection } from "@/components/queue/QueueSection";
import { SessionPanel } from "@/components/session/SessionPanel";
import { TriageHeader } from "@/components/layout/TriageHeader";
import { getSessionUser, listSeededUsersForPicker } from "@/lib/auth/session";
import { loadInitialQueueForSession } from "@/lib/triage/queue/load-initial-queue";

/**
 * RSC shell: session cookie + picker users + first queue page from the DB.
 * Row Claim/Resolve/Release patch client state only (no full reload).
 * User switch in UserPicker still refreshes this tree once (new cookie/ACL).
 */
export default async function Home() {
  const [users, session] = await Promise.all([
    listSeededUsersForPicker(),
    getSessionUser(),
  ]);
  const queue = await loadInitialQueueForSession(session);

  return (
    <div className="min-h-full bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--flamingo-pink-soft)_0%,_transparent_55%)] opacity-70"
      />
      <main className="relative mx-auto flex w-[80%] max-w-[80%] flex-col gap-8 px-6 py-12">
        <TriageHeader />
        <SessionPanel users={users} session={session} />
        <QueueSection signedIn={Boolean(session)} queue={queue} />
      </main>
    </div>
  );
}
