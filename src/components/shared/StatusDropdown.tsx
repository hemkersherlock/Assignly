"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatus = "pending" | "writing" | "on the way" | "delivered";

interface StatusDropdownProps {
  currentStatus: string;
  onStatusChange: (newStatus: OrderStatus) => void;
  disabled?: boolean;
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    icon: "⏳"
  },
  writing: {
    label: "Writing", 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    icon: "✍️"
  },
  "on the way": {
    label: "On the Way",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300", 
    icon: "🚀"
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    icon: "✅"
  }
};

export function StatusDropdown({ currentStatus, onStatusChange, disabled = false }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusChange = (newStatus: OrderStatus) => {
    onStatusChange(newStatus);
    setIsOpen(false);
  };

  const currentConfig = statusConfig[currentStatus as OrderStatus] || statusConfig.pending;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 px-3 text-xs font-medium transition-all duration-200 hover:scale-105",
            currentConfig.color,
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="mr-1">{currentConfig.icon}</span>
          {currentConfig.label}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {Object.entries(statusConfig).map(([status, config]) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status as OrderStatus)}
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center w-full">
              <span className="mr-2">{config.icon}</span>
              <span className="flex-1">{config.label}</span>
              {currentStatus === status && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
