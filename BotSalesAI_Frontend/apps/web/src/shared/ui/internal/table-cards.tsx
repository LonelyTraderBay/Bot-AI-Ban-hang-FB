import { Box, ListItem, Paper, Stack, Typography } from '@mui/material';
import { tokens } from '@botsales/tokens';
import type { ReactNode } from 'react';
import { ActionGroup, SectionGrid, SurfaceContent } from '../composition';
import { layoutSx } from '../layout';
import { visualSx } from '../visual';

export type TableColumn<T> = {
    key: string;
    label: string;
    render: (row: T) => ReactNode;
    align?: 'left' | 'right' | 'center';
    width?: number;
    gridAction?: boolean;
};

export type MobileCards<T> = {
    layout: 'cards';
    titleKey: string;
    summaryKeys: readonly [string?, string?, string?];
    titleText?: (row: T) => string;
    actionKey?: string;
    statusKey?: string;
    splitActions?: (row: T) => { primary: ReactNode; secondary: ReactNode };
};

export default function TableCards<T>({ rows, columns, rowKey, mobile }: {
    rows: readonly T[];
    columns: readonly TableColumn<T>[];
    rowKey: (row: T) => string;
    mobile: MobileCards<T>;
}) {
    const byKey = new Map(columns.map(column => [column.key, column]));
    const title = byKey.get(mobile.titleKey) || columns[0];
    const action = byKey.get(mobile.actionKey ?? '');
    const status = byKey.get(mobile.statusKey ?? '');
    const summary = mobile.summaryKeys.flatMap(key => key && byKey.has(key) ? [byKey.get(key)!] : []);
    const shown = new Set([title, action, status, ...summary]);
    const details = columns.filter(column => !shown.has(column));
    const renderField = (column: TableColumn<T>, row: T) => <Box key={column.key} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <Typography variant="caption" color="text.secondary">{column.label}</Typography>
        <Box>{column.render(row)}</Box>
    </Box>;

    return <SurfaceContent bodyMode="inset">
        <SectionGrid component="ul" role="list" columns="minmax(0, 1fr)" rhythm="content">
            {rows.map(row => {
                const actions = mobile.splitActions?.(row);
                const primary = actions ? actions.primary : action?.render(row);
                const secondary = actions?.secondary;
                const titleContent = <Box sx={{ minWidth: 0, flex: status ? '1 1 8em' : undefined,
                    overflowWrap: 'anywhere', fontWeight: visualSx.typography.fontWeight.strong }}>
                    {mobile.titleText ? mobile.titleText(row) : title?.render(row)}
                </Box>;
                const content = <Stack sx={layoutSx.surface.compactContentGap}>
                    {status ? <Stack direction="row" alignItems="flex-start" flexWrap="wrap" sx={layoutSx.surface.compactContentGap}>
                        {titleContent}
                        <Box sx={{ maxWidth: '100%' }}>{status.render(row)}</Box>
                    </Stack> : titleContent}
                    {summary.length > 0 && <SectionGrid columns="repeat(auto-fit, minmax(min(100%, 6.5em), 1fr))" rhythm="content" shrinkChildren>
                        {summary.map(column => renderField(column, row))}
                    </SectionGrid>}
                    {(primary || secondary || details.length > 0) && <ActionGroup alignItems="flex-start" flexWrap="wrap">
                        {primary && <ActionGroup flexWrap="wrap" geometry={{ maxWidth: '100%' }}>{primary}</ActionGroup>}
                        {(details.length > 0 || secondary) && <Box component="details" sx={{ maxWidth: '100%', '&[open]': { flexBasis: '100%' } }}>
                            <Typography component="summary" variant="body2" color="text.secondary"
                                sx={{ cursor: 'pointer', alignContent: 'center', minHeight: tokens.layout.touchTarget, overflowWrap: 'anywhere' }}>
                                Xem thêm thông tin
                            </Typography>
                            <SurfaceContent>{details.map(column => renderField(column, row))}{secondary}</SurfaceContent>
                        </Box>}
                    </ActionGroup>}
                </Stack>;
                return <ListItem key={rowKey(row)} disablePadding sx={{ display: 'block', minWidth: 0 }}>
                    <Paper variant="outlined" sx={[layoutSx.table.compactCardInset, { borderRadius: visualSx.radius.card }]}>
                        {content}
                    </Paper>
                </ListItem>;
            })}
        </SectionGrid>
    </SurfaceContent>;
}
