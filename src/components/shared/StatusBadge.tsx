import { Badge } from "@/components/ui/badge";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

type Status = Order['status'];

const statusStyles: Record<Status, string> = {
    pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
};

const statusText: Record<Status, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed"
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
