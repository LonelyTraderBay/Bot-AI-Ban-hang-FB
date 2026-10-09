import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ownedLabelGeometry } from '../../tests/design/owned-label-geometry.mjs';

export async function captureNativeLabelRoutes({ root, outputPath, evidenceRunId, server, send, context, evaluateJson, evaluateString, setNativeZoom }) {
    const routes = JSON.parse(fs.readFileSync(path.join(root, 'packages/contracts/src/routes.json'), 'utf8')).routes;
    const seed = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/src/mocks/seed.json'), 'utf8'));
    const values = { shopId: 'shop-demo', conversationId: 'cv1', customerId: 'c1', productId: 'p1', orderId: 'DH-1001', knowledgeId: 'k1', jobId: seed.jobs[0]?.id || 'missing-job' };
    const observations = [];
    for (const route of routes) for (const width of [390, 1280]) {
        const pathname = route.path.replace(/:([A-Za-z]+)/g, (_, key) => {
            if (!values[key]) throw Error('Unresolved native route parameter ' + key);
            return values[key];
        });
        await send('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
        await send('browsingContext.navigate', { context, url: new URL(pathname, server.url).toString(), wait: 'complete' }, 30_000);
        await evaluateString(send, context, `new Promise((resolve, reject) => {
            const start=Date.now(); const check=()=>{
                if(document.querySelector('main h1')?.getClientRects().length&&!document.querySelector('main .MuiCircularProgress-root,main .MuiLinearProgress-root'))resolve('route-ready');
                else if(Date.now()-start>15000)reject(Error('Native label route not ready'));
                else setTimeout(check,50);
            };check();
        })`);
        await evaluateString(send, context, `(() => {
            const tools=document.querySelector('#mock-tools-controls');
            if(tools&&getComputedStyle(tools).display==='none')document.querySelector('[aria-controls="mock-tools-controls"]').click();
            return 'expanded-visible-demo-tools';
        })()`);
        const baselineZoom = await setNativeZoom(send, context, 1);
        const capture = () => evaluateJson(send, context, `(() => ({
            labels: (${ownedLabelGeometry.toString()})(true),
            font: parseFloat(getComputedStyle(document.querySelector('main h1')).fontSize),
            width:innerWidth, height:innerHeight, dpr:devicePixelRatio,
            documentWidth:document.documentElement.scrollWidth,
            errors:window.__w30PageErrors||[],
            writes:(window.__w30Requests||[]).filter(x=>!['GET','HEAD','OPTIONS'].includes(x.method))
        }))()`);
        const before = await capture();
        const zoom = await setNativeZoom(send, context, 2);
        await evaluateString(send, context, `document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve('painted')))))`);
        const after = await capture();
        const issues = [];
        if (baselineZoom.zoomFactor !== 1 || baselineZoom.zoomFullPage.value !== false || zoom.zoomFactor !== 2 || zoom.zoomFullPage.value !== false) issues.push('Native text setting not confirmed');
        if (before.width !== width || after.width !== before.width || before.height !== after.height || after.dpr !== before.dpr || Math.abs(after.font / before.font - 2) > 0.06) issues.push('Native text ratio/viewport/DPR mismatch');
        for (const label of after.labels) if (label.overlaps || label.outsideField || label.labelPosition !== 'static' || label.labelTransform !== 'none' || label.labelFontSize < 24 || label.fieldBounds.height > label.naturalHeight + 1 || label.legends.some(size => size > 1)) issues.push('Label/value/intrinsic-height/notch violation: ' + label.label);
        if (after.documentWidth > width + 1 || after.errors.length || after.writes.length) issues.push('Route overflow/page error/unexpected write');
        const imageFile = path.join(path.dirname(outputPath), `native-label-${route.id}-${width}-${evidenceRunId}.png`);
        const screenshot = await send('browsingContext.captureScreenshot', { context, origin: 'viewport' }, 20_000);
        const bytes = Buffer.from(screenshot.data, 'base64');
        fs.writeFileSync(imageFile, bytes);
        observations.push({ route: route.id, pathname, width, baselineZoom, zoom, before, after, issues, result: issues.length ? 'FAIL' : 'PASS',
            screenshot: { path: path.relative(root, imageFile).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(bytes).digest('hex') } });
        console.log(JSON.stringify({ nativeLabelRoute: route.id, width, result: issues.length ? 'FAIL' : 'PASS', labels: after.labels.length, issues }));
    }
    if (observations.length !== routes.length * 2) throw Error('Incomplete canonical native route coverage');
    return observations;
}
