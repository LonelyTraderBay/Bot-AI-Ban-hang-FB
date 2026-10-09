/** Label/value geometry; allFields also covers the shared outlined theme profile. */
export function ownedLabelGeometry(allFields = false) {
    return [...document.querySelectorAll(allFields
        ? 'main .MuiTextField-root .MuiInputLabel-outlined, #mock-tools-controls .MuiInputLabel-outlined'
        : 'main form .MuiInputLabel-shrink, #mock-tools-controls .MuiInputLabel-shrink')]
        .filter(label => label.getClientRects().length && getComputedStyle(label).visibility !== 'hidden')
        .filter(label => allFields || label.closest('#mock-tools-controls') || label.textContent === 'Tìm kiếm')
        .map(label => {
            const field = label.closest('.MuiTextField-root');
            const control = field?.querySelector('input, textarea, .MuiSelect-select');
            if (!control) throw new Error('A floating label has no field control');
            const labelRange = document.createRange();
            labelRange.selectNodeContents(label);
            const labelRect = labelRange.getBoundingClientRect();
            let valueRect;
            if (control.tagName === 'INPUT' || control.tagName === 'TEXTAREA') {
                const rect = control.getBoundingClientRect(), style = getComputedStyle(control);
                const contentHeight = rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
                const lineHeight = Math.min(contentHeight, parseFloat(style.lineHeight) || contentHeight);
                const leading = Math.max(0, lineHeight - parseFloat(style.fontSize)) / 2;
                const top = rect.top + parseFloat(style.paddingTop) + leading;
                valueRect = { left: rect.left + parseFloat(style.paddingLeft), right: rect.right - parseFloat(style.paddingRight),
                    top, bottom: top + parseFloat(style.fontSize) };
            } else {
                const range = document.createRange();
                range.selectNodeContents(control);
                valueRect = range.getBoundingClientRect();
            }
            const overlapX = Math.max(0, Math.min(labelRect.right, valueRect.right) - Math.max(labelRect.left, valueRect.left));
            const overlapY = Math.max(0, Math.min(labelRect.bottom, valueRect.bottom) - Math.max(labelRect.top, valueRect.top));
            const fieldRect = field.getBoundingClientRect();
            const naturalHeight = [...field.children].reduce((sum, child) => {
                const style = getComputedStyle(child), rect = child.getBoundingClientRect();
                return sum + rect.height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
            }, 0);
            const legends = [...field.querySelectorAll('legend')].map(legend => parseFloat(getComputedStyle(legend).maxWidth));
            return { label: label.textContent, owner: label.closest('#mock-tools-controls') ? 'demo-tools' : label.textContent === 'Tìm kiếm' ? 'toolbar' : 'outlined-field',
                labelBounds: { left: labelRect.left, right: labelRect.right, top: labelRect.top, bottom: labelRect.bottom },
                valueBounds: { left: valueRect.left, right: valueRect.right, top: valueRect.top, bottom: valueRect.bottom },
                fieldBounds: { left: fieldRect.left, right: fieldRect.right, height: fieldRect.height }, naturalHeight, legends,
                labelPosition: getComputedStyle(label).position, labelTransform: getComputedStyle(label).transform,
                labelFontSize: parseFloat(getComputedStyle(label).fontSize), overlapX, overlapY,
                overlaps: overlapX > 1 && overlapY > 1,
                outsideField: labelRect.left < fieldRect.left - 1 || labelRect.right > fieldRect.right + 1 };
        });
}
