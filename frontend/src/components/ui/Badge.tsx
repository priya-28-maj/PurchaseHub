import { WarrantyStatus } from '../../types';
import { WARRANTY_LABELS, WARRANTY_COLORS, cn } from '../../utils';

interface BadgeProps {
  status: WarrantyStatus;
  days?: number | null;
  className?: string;
}

export default function WarrantyBadge({ status, days, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      WARRANTY_COLORS[status],
      className
    )}>
      {WARRANTY_LABELS[status]}
      {days !== null && days !== undefined && status !== 'none' && status !== 'expired' && (
        <span className="opacity-75">· {days}d</span>
      )}
    </span>
  );
}
