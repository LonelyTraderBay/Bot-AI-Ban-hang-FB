import { Alert } from '@mui/material';
import { SurfaceContent } from '@/shared/ui/composition';

/** Preserve every source warning; the content owner supplies the shared rhythm. */
export function ReportWarnings({ warnings, severity = 'warning' }: { warnings: readonly string[]; severity?: 'info' | 'warning' }) {
    if (!warnings.length) return null;
    return <SurfaceContent beforeGap="surface">{warnings.map((warning, index) => <Alert key={`${index}-${warning}`} severity={severity}>{warning}</Alert>)}</SurfaceContent>;
}
