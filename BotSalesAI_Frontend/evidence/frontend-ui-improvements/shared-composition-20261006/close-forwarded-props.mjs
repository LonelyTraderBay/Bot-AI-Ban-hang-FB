import fs from 'node:fs';
const file = 'apps/web/src/shared/ui/composition.tsx';
let source = fs.readFileSync(file, 'utf8');
source = source.replace('type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };', "type DataAttributes = { 'data-testid'?: string; 'data-draft-clean'?: string };");
const flow = `children={props.children} direction={props.direction} alignItems={props.alignItems} justifyContent={props.justifyContent} flexWrap={props.flexWrap} id={props.id} role={props.role} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} data-testid={props['data-testid']} data-draft-clean={props['data-draft-clean']}`;
source = source.replace('if (props.component === \'form\') return <Stack {...props}', `if (props.component === 'form') return <Stack component="form" noValidate={props.noValidate} onSubmit={props.onSubmit} ref={props.ref} ${flow}`);
source = source.replace('return <Stack {...props} data-ui-composition="form-fields"', `return <Stack ref={props.ref} ${flow} data-ui-composition="form-fields"`);
source = source.replaceAll('return <Stack {...props}', `return <Stack ${flow}`);
// ActionGroup owns direction explicitly, not through two forwarded attributes.
source = source.replace(`${flow} data-ui-composition="action-group" direction={direction}`, `${flow.replace(' direction={props.direction}', '')} data-ui-composition="action-group" direction={direction}`);
source = source.replace('return <Box {...props}', `return <Box children={props.children} id={props.id} role={props.role} aria-label={props['aria-label']} alignItems={props.alignItems} data-testid={props['data-testid']} data-draft-clean={props['data-draft-clean']}`);
fs.writeFileSync(file, source);
console.log('Closed runtime forwarding in six canonical components; no style spread exemption.');
