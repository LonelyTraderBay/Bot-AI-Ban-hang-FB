import { navigation } from '../../apps/web/src/app/navigation';

const menuTitles = new Map<string, string>(
    navigation.flatMap(group => group.items.map(([id, title]) => [id, title] as const)),
);

export function expectedDocumentTitle({ id, title }: { id: string; title: string }) {
    return `${menuTitles.get(id) ?? title} · BotSales AI`;
}
