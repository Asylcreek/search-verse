import { build, files, version } from '$service-worker';

const worker = self;
const cacheName = `searchverse-${version}`;
const assets = [...build, ...files];

worker.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(cacheName)
			.then((cache) => cache.addAll(assets))
			.then(() => worker.skipWaiting())
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
			)
			.then(() => worker.clients.claim())
	);
});

worker.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	if (url.origin !== worker.location.origin) return;

	event.respondWith(resolveResponse(event.request, url));
});

async function resolveResponse(request, url) {
	const cache = await caches.open(cacheName);

	if (assets.includes(url.pathname)) {
		const cached = await cache.match(url.pathname);

		if (cached) return cached;
	}

	try {
		const response = await fetch(request);

		if (response.status === 200 && !response.headers.get('cache-control')?.includes('no-store')) {
			await cache.put(request, response.clone());
		}

		return response;
	} catch (error) {
		const cached = await cache.match(request);

		if (cached) return cached;

		throw error;
	}
}
