import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const privateRoutes = ['control-center'];
const distDir = resolve('dist');

for (const route of privateRoutes) {
	const target = resolve(distDir, route);
	if (!target.startsWith(distDir)) {
		throw new Error(`Refusing to remove route outside dist: ${target}`);
	}
	if (existsSync(target)) {
		rmSync(target, { recursive: true, force: true });
		console.log(`Removed private route from deploy artifact: /${route}/`);
	}
}
