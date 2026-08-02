import { QueueTableItemDynamic } from "@/components/queue/queue-table/QueueTableItemDynamic";
import type { QueueItemRow } from "@/lib/triage/queue/queue-types";

type Props = {
  item: QueueItemRow;
  currentUserId: string | null;
  canMutate: boolean;
};

/** One queue row — server markup; dynamic cells stay a client island. */
export function QueueTableItem({ item, currentUserId, canMutate }: Props) {
  return (
    <tr className="border-b border-border/70 last:border-0">
      <td className="px-3 py-2.5 font-mono text-xs text-muted">{item.id}</td>
      <td className="px-3 py-2.5 font-medium text-foreground">{item.title}</td>
      <QueueTableItemDynamic
        item={item}
        currentUserId={currentUserId}
        canMutate={canMutate}
      />
    </tr>
  );
}
