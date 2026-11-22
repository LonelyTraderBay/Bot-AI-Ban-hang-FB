import type { NotificationPolicy } from '../../generated/prisma/client.js';

export type EventPriority = 'off' | 'normal' | 'urgent';
const defaults = {
    order: 'normal', lateShipment: 'off', lowStock: 'off', paymentMismatch: 'off', operationalError: 'off',
} satisfies Record<string, EventPriority>;
export type EventPriorities = Record<keyof typeof defaults, EventPriority>;

export function notificationPriorities(policy: Pick<NotificationPolicy, 'eventPriorities'> | null): EventPriorities {
    const value = policy?.eventPriorities;
    const effective: EventPriorities = { ...defaults };
    if (!value || typeof value !== 'object' || Array.isArray(value)) return effective;
    for (const event of Object.keys(defaults) as (keyof EventPriorities)[]) {
        const priority = value[event];
        if (priority === 'off' || priority === 'normal' || priority === 'urgent') effective[event] = priority;
    }
    return effective;
}

export function duringQuietHours(now: Date, timeZone: string, start: string, end: string) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const current = parts.filter(part => part.type === 'hour' || part.type === 'minute').map(part => part.value).join(':');
    return end > start ? current >= start && current < end : current >= start || current < end;
}

export function notificationBlockedByQuietHours(policy: NotificationPolicy, priority: EventPriority, now: Date) {
    return !(priority === 'urgent' && policy.eventPriorities && policy.urgentMayBypassQuietHours) &&
        Boolean(policy.quietStart && policy.quietEnd && duringQuietHours(now, policy.timezone, policy.quietStart, policy.quietEnd));
}
