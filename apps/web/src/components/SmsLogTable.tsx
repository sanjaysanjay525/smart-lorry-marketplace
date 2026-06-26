import type { SmsLogDTO } from "@smart-lorry/shared";
import { formatDateTime } from "../lib/labels";

interface SmsLogTableProps {
  logs: SmsLogDTO[];
}

export function SmsLogTable({ logs }: SmsLogTableProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-charcoal/50 italic">No SMS logs yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-charcoal/10">
      <table className="min-w-full text-sm">
        <thead className="bg-charcoal/5">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-charcoal/70">Type</th>
            <th className="px-3 py-2 text-left font-medium text-charcoal/70">To</th>
            <th className="px-3 py-2 text-left font-medium text-charcoal/70">Message</th>
            <th className="px-3 py-2 text-left font-medium text-charcoal/70">Sent At</th>
            <th className="px-3 py-2 text-left font-medium text-charcoal/70">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal/5">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                {log.messageType.replace(/_/g, " ")}
              </td>
              <td className="whitespace-nowrap px-3 py-2">{log.toPhone}</td>
              <td className="max-w-xs truncate px-3 py-2 text-charcoal/70">{log.messageBody}</td>
              <td className="whitespace-nowrap px-3 py-2 text-charcoal/60">
                {formatDateTime(log.sentAt)}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                {log.success ? (
                  <span className="text-neem font-medium">✓ Sent</span>
                ) : (
                  <span className="text-vermilion font-medium">✗ Failed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
