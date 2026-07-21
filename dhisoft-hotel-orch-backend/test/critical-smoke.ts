type Json = Record<string, any>;

const baseUrl = (process.env.API_BASE_URL ?? 'http://127.0.0.1:6006/api/v1').replace(/\/$/, '');
const tenantSlug = process.env.SMOKE_TENANT_SLUG ?? 'rainwood';
const tenantEmail = process.env.SMOKE_TENANT_EMAIL;
const tenantPassword = process.env.SMOKE_TENANT_PASSWORD;

if (!tenantEmail || !tenantPassword) {
  throw new Error('Set SMOKE_TENANT_EMAIL and SMOKE_TENANT_PASSWORD through the environment.');
}

async function request(path: string, options: { method?: string; body?: Json; token?: string } = {}) {
  const headers: Record<string, string> = {
    accept: 'application/json',
    'x-tenant-slug': tenantSlug,
  };
  if (options.body) headers['content-type'] = 'application/json';
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    data = undefined;
  }
  return { status: response.status, data };
}

function requireStatus(name: string, actual: number, expected: number | number[]) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(actual)) throw new Error(`${name}: received ${actual}`);
}

function requireValue<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`${name}: missing value`);
  return value;
}

async function main() {
  const login = await request('/auth/login', {
    method: 'POST',
    body: { email: tenantEmail, password: tenantPassword },
  });
  requireStatus('tenant login', login.status, 201);
  const token = requireValue(login.data?.accessToken, 'tenant token');

  const site = await request('/website/public');
  requireStatus('public website', site.status, 200);
  const property = requireValue(site.data?.properties?.[0], 'property');
  const roomType = requireValue(property.roomTypes?.[0], 'room type');
  const ratePlan = requireValue(roomType.ratePlans?.[0], 'rate plan');

  const checkIn = new Date(Date.now() + 86_400_000);
  checkIn.setUTCHours(0, 0, 0, 0);
  const checkOut = new Date(checkIn.getTime() + 2 * 86_400_000);
  const checkInDate = checkIn.toISOString().slice(0, 10);
  const checkOutDate = checkOut.toISOString().slice(0, 10);
  const availabilityPath = `/availability/search?propertyId=${encodeURIComponent(property.id)}&checkIn=${checkInDate}&checkOut=${checkOutDate}&rooms=1&adults=2&children=0`;
  const before = await request(availabilityPath);
  requireStatus('availability before booking', before.status, 200);
  const option = requireValue(before.data?.options?.[0], 'availability option');
  const beforeRooms = Number(option.nightly[0].availableRooms);

  const hold = await request('/reservations/hold', {
    method: 'POST',
    body: {
      propertyId: property.id,
      roomTypeId: roomType.id,
      ratePlanId: ratePlan.id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      quantity: 1,
      adults: 2,
      children: 0,
      firstName: 'Codex',
      lastName: `Smoke${Date.now()}`,
      email: 'codex-smoke@example.invalid',
      mobile: '+919000000000',
      source: 'WEBSITE',
    },
  });
  requireStatus('booking hold', hold.status, 201);
  const reservation = requireValue(hold.data, 'reservation');
  const total = Number(reservation.grandTotal);

  const afterHold = await request(availabilityPath);
  requireStatus('availability after hold', afterHold.status, 200);
  const afterRooms = Number(afterHold.data.options[0].nightly[0].availableRooms);
  if (afterRooms !== beforeRooms - 1) throw new Error('inventory was not decremented exactly once');

  const firstAmount = Number((total / 2).toFixed(2));
  const secondAmount = Number((total - firstAmount).toFixed(2));
  const checkoutInputs = [
    { reservationId: reservation.id, amount: firstAmount, idempotencyKey: `smoke-a-${Date.now()}` },
    { reservationId: reservation.id, amount: secondAmount, idempotencyKey: `smoke-b-${Date.now()}` },
  ];
  const checkouts = await Promise.all(
    checkoutInputs.map(body => request('/payments/checkout', { method: 'POST', body })),
  );
  checkouts.forEach((result, index) => requireStatus(`checkout ${index + 1}`, result.status, 201));

  const replay = await request('/payments/checkout', {
    method: 'POST',
    body: checkoutInputs[0],
  });
  requireStatus('idempotent checkout replay', replay.status, 201);
  if (replay.data.id !== checkouts[0].data.id) throw new Error('idempotent replay created a second payment');

  const webhooks = await Promise.allSettled(
    checkouts.map((result, index) =>
      request('/payments/webhooks/mock', {
        method: 'POST',
        body: {
          paymentId: result.data.id,
          providerEventId: `smoke-event-${Date.now()}-${index}`,
          status: 'PAID',
        },
      }),
    ),
  );
  webhooks.forEach((result, index) => {
    if (result.status === 'rejected') throw result.reason;
    requireStatus(`payment webhook ${index + 1}`, result.value.status, [201, 409]);
  });

  for (const [index, result] of webhooks.entries()) {
    if (result.status === 'fulfilled' && result.value.status === 409) {
      const retry = await request('/payments/webhooks/mock', {
        method: 'POST',
        body: {
          paymentId: checkouts[index].data.id,
          providerEventId: `smoke-retry-${Date.now()}-${index}`,
          status: 'PAID',
        },
      });
      requireStatus(`payment webhook retry ${index + 1}`, retry.status, 201);
    }
  }

  const paid = await request(`/reservations/${reservation.id}`, { token });
  requireStatus('paid reservation', paid.status, 200);
  if (paid.data.status !== 'CONFIRMED' || Number(paid.data.paidTotal) !== total) {
    throw new Error('concurrent payment confirmation produced an incorrect reservation total');
  }

  const page = await request('/website/pages', { token });
  requireStatus('website pages', page.status, 200);
  const slug = `codex-smoke-${Date.now()}`;
  const createdPage = await request('/website/pages', {
    method: 'POST',
    token,
    body: {
      title: 'Codex Smoke Page',
      slug,
      draftContent: { sections: [{ id: 'hero', type: 'hero', settings: { heading: 'Codex smoke' } }] },
      seo: { title: 'Codex smoke' },
      navigation: [],
    },
  });
  requireStatus('website page draft', createdPage.status, 201);
  const published = await request(`/website/pages/${createdPage.data.id}/publish`, {
    method: 'POST',
    token,
  });
  requireStatus('website page publish', published.status, 201);
  const publicAfterPublish = await request('/website/public');
  requireStatus('published website page', publicAfterPublish.status, 200);
  if (!publicAfterPublish.data.pages.some((entry: any) => entry.slug === slug)) {
    throw new Error('published page was not visible publicly');
  }

  const cancellation = await Promise.allSettled([
    request(`/reservations/${reservation.id}/cancel`, {
      method: 'POST',
      token,
      body: { reason: 'Codex concurrency smoke test' },
    }),
    request(`/reservations/${reservation.id}/cancel`, {
      method: 'POST',
      token,
      body: { reason: 'Codex concurrency smoke test' },
    }),
  ]);
  cancellation.forEach((result, index) => {
    if (result.status === 'rejected') throw result.reason;
    requireStatus(`cancellation ${index + 1}`, result.value.status, [201, 409]);
  });
  const afterCancel = await request(availabilityPath);
  requireStatus('availability after concurrent cancellation', afterCancel.status, 200);
  if (Number(afterCancel.data.options[0].nightly[0].availableRooms) !== beforeRooms) {
    throw new Error('concurrent cancellation restored inventory more than once');
  }

  console.log('Critical API smoke passed: booking, payment idempotency, concurrent payment, inventory, website publish, concurrent cancellation');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Critical API smoke failed');
  process.exitCode = 1;
});

export {};
