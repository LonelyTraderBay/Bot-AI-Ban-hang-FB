import fs from 'node:fs';
import path from 'node:path';
const original = path.join(import.meta.dirname, 'capture-component-text-zoom.mjs');
let source = fs.readFileSync(original, 'utf8');
source = source.replace(/^const scenarios = .*;$/m, 'const scenarios = ' + JSON.stringify([{ id: 'address', route: '/s/shop-demo/orders', viewport: { width: 390, height: 800 }, targets: ['[data-native-target="true"]'], focus: '[data-native-focus="true"]' }]) + ';');
const probe = `
        const menuProbe = JSON.parse(await evaluateString(send, context, \`(async () => {
          const results = [];
          const controls = [...document.querySelectorAll('[role="dialog"] [role="combobox"]')].filter(node => node.getAttribute('aria-disabled') !== 'true' && node.scrollWidth > node.clientWidth + 2);
          for (const control of controls) {
            const selected = control.textContent.trim();
            control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
            const started = performance.now(); let option;
            while (performance.now() - started < 15000) {
              option = document.querySelector('[role="listbox"] [role="option"][aria-selected="true"]');
              if (option?.textContent.trim() === selected) break;
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            if (!option || option.textContent.trim() !== selected) throw new Error('No matching selected option in menu for ' + selected);
            const paper = option.closest('.MuiPaper-root'), painted = performance.now();
            while (getComputedStyle(paper).opacity !== '1' || paper.getAnimations().some(animation => animation.playState === 'running')) {
              if (performance.now() - painted > 5000) throw new Error('Popup did not finish painting');
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            const parent = option.closest('.MuiPaper-root').getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(option);
            results.push({ controlId: control.id, selected, option: option.textContent.trim(), popup: parent.toJSON(), textRects: [...range.getClientRects()].map(rect => rect.toJSON()), whiteSpace: getComputedStyle(option).whiteSpace, fullLabelVisible: [...range.getClientRects()].every(rect => rect.left >= parent.left - 1 && rect.right <= parent.right + 1) });
            option.click();
            const closed = performance.now();
            while (document.querySelector('[role="listbox"]')) {
              if (performance.now() - closed > 5000) throw new Error('Menu did not close after selection');
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          return JSON.stringify(results);
        })()\`, 30000));
        console.log('NATIVE_MENU_BASELINE=' + JSON.stringify(menuProbe));
`;
source = source.replace('        const issues = [];', probe + '        const issues = [];');
fs.writeFileSync(path.join(import.meta.dirname, 'native-menu-before.mjs'), source);
