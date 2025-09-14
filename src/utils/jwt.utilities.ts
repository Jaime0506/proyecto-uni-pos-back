// Parse TTL tipo '15m', '7d', '3600s'
export function addFromNow(ttl: string): Date {
	const now = Date.now();
	const m = /^(\d+)([smhd])$/.exec(ttl);
	let ms: number;
	if (m) {
		const val = parseInt(m[1], 10);
		const unit = m[2];
		ms =
			unit === 's'
				? val * 1000
				: unit === 'm'
					? val * 60_000
					: unit === 'h'
						? val * 3_600_000
						: /* d */ val * 86_400_000;
	} else {
		// fallback (ej: '900s' o '15m' inválido): 7 días
		ms = 7 * 86_400_000;
	}
	return new Date(now + ms);
}
