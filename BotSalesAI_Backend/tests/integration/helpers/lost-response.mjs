export async function dropCreateResponse(page, endpoint) {
    const receipt = Promise.withResolvers();
    let writes = 0;
    const match = request => request.method() === 'POST' && request.url() === endpoint;
    page.on('request', request => { if (match(request)) writes++; });
    await page.route(endpoint, async route => {
        if (!match(route.request())) return route.continue();
        try {
            const response = await route.fetch({ timeout: 10000 });
            const body = await response.json();
            await route.abort('failed');
            receipt.resolve({ status: response.status(), resourceId: body.data?.id, key: route.request().headers()['idempotency-key'] });
        } catch (error) {
            receipt.reject(error);
        }
    });
    return { received: receipt.promise, writes: () => writes };
}
