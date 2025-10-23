import { Badge } from "@/components/ui/badge";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

type Status = Order['status'];

const statusStyles: Record<Status, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    writing: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    "on the way": "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
};

const statusText: Record<Status, string> = {
    pending: "⏳ Pending",
    writing: "✍️ Writing",
    "on the way": "🚀 On the Way",
    delivered: "✅ Delivered"
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      className={cn(
        "border-transparent capitalize",
        statusStyles[status]
      )}
    >
      {statusText[status]}
    </Badge>
  );
}
