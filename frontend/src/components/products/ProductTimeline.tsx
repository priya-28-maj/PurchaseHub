import { TimelineEvent, CurrencyCode } from '../../types';
import { formatDate, formatCurrency } from '../../utils';
import { ShoppingBag, Shield, Wrench, AlertCircle } from 'lucide-react';

const EVENT_ICONS = {
  purchase: ShoppingBag,
  warranty_start: Shield,
  repair: Wrench,
  warranty_expiry: AlertCircle,
};

const EVENT_COLORS = {
  purchase: 'bg-brand-100 text-brand-600',
  warranty_start: 'bg-emerald-100 text-emerald-600',
  repair: 'bg-amber-100 text-amber-600',
  warranty_expiry: 'bg-red-100 text-red-600',
};

interface TimelineProps {
  events: TimelineEvent[];
  currency?: CurrencyCode;
}

export default function ProductTimeline({ events, currency = 'USD' }: TimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No timeline events yet.</p>;
  }

  return (
    <div className="relative">
      {events.map((event, index) => {
        const Icon = EVENT_ICONS[event.type];
        const isLast = index === events.length - 1;

        return (
          <div key={`${event.type}-${event.date}-${index}`} className="relative flex gap-4 pb-8">
            {!isLast && (
              <div className="absolute left-5 top-10 bottom-0 w-px bg-surface-border" />
            )}
            <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${EVENT_COLORS[event.type]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900">{event.title}</h4>
                <span className="text-xs text-slate-400">{formatDate(event.date)}</span>
              </div>
              {event.description && (
                <p className="mt-1 text-sm text-slate-500">{event.description}</p>
              )}
              {event.cost !== undefined && (
                <p className="mt-1 text-sm font-medium text-slate-700">{formatCurrency(event.cost, currency)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
