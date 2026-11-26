import { Box, ListItem, Typography } from '@mui/material';
import { tokens } from '@botsales/tokens';
import type { ReactNode } from 'react';
import { ActionGroup, SectionGrid, SurfaceContent } from '../composition';
import { visualSx } from '../visual';

export type TableColumn<T> = {
    key: string;
    label: string;
    render: (row: T) => ReactNode;
    align?: 'left' | 'right' | 'center';
};

export type MobileCards<T> = {
    layout: 'cards';
    titleKey: string;
    summaryKeys: readonly [string?, string?, string?];
    titleText?: (row: T) => string;
    actionKey?: string;
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
    const summary = mobile.summaryKeys.flatMap(key => key && byKey.has(key) ? [byKey.get(key)!] : []);
    const shown = new Set([title, action, ...summary]);
    const details = columns.filter(column => !shown.has(column));
    const renderField = (column: TableColumn<T>, row: T) => <Box key={column.key} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <Typography variant="caption" color="text.secondary">{column.label}</Typography>
        <Box>{column.render(row)}</Box>
    </Box>;

    return <SurfaceContent bodyMode="inset">
        <SectionGrid component="ul" role="list" columns="minmax(0, 1fr)" rhythm="content">
            {rows.map(row => <ListItem key={rowKey(row)} disablePadding sx={{ display: 'block', minWidth: 0 }}>
                <SurfaceContent bodyMode="compactOutlined">
                    <Box sx={{ overflowWrap: 'anywhere', fontWeight: visualSx.typography.fontWeight.strong }}>
                        {mobile.titleText ? mobile.titleText(row) : title?.render(row)}
                    </Box>
                    {summary.length > 0 && <SectionGrid columns={{ xs: 'repeat(auto-fit, minmax(min(100%, 8em), 1fr))' }} rhythm="content" shrinkChildren>
                        {summary.map(column => renderField(column, row))}
                    </SectionGrid>}
                    {action && <ActionGroup flexWrap="wrap">{action.render(row)}</ActionGroup>}
                    {details.length > 0 && <Box component="details">
                        <Typography component="summary" variant="body2" color="text.secondary"
                            sx={{ cursor: 'pointer', alignContent: 'center', minHeight: tokens.layout.touchTarget }}>
                            Xem thêm thông tin
                        </Typography>
                        <SurfaceContent>{details.map(column => renderField(column, row))}</SurfaceContent>
                    </Box>}
                </SurfaceContent>
            </ListItem>)}
        </SectionGrid>
    </SurfaceContent>;
}
