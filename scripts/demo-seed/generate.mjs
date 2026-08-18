/**
 * Generators for clients, sessions, billing and parent-facing data.
 *
 * Everything is driven by a deterministic PRNG seeded per client, so re-running
 * the seeder produces the same demo rather than a different random world each
 * time — which matters when you are re-taking a screenshot.
 */
import * as RO from "./content.ro.mjs";

export const SEED_TAG = "demo-mock-v1";

/* ---------------- deterministic randomness ---------------- */

/** mulberry32 — small, fast, good enough for demo data, and reproducible. */
export function makeRng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const pickN = (rng, arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(...copy.splice(Math.floor(rng() * copy.length), 1));
  return out;
};
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

/* ---------------- dates ---------------- */

export const ageMonths = (birthDate, at = new Date()) => {
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return 48;
  return Math.max(0, (at.getFullYear() - b.getFullYear()) * 12 + (at.getMonth() - b.getMonth()));
};

const iso = (d) => d.toISOString();
const ymd = (d) => d.toISOString().slice(0, 10);

/* ---------------- clients ---------------- */

/**
 * Fills in the clinical and billing fields the demo roster is missing, and
 * spreads clients across the therapist caseloads. Only ever fills gaps —
 * anything already set on the document is left alone.
 */
export function enrichClients({ clients, therapists, heroes }) {
  const writes = [];
  const caseloads = new Map(therapists.map((t) => [t.__id, 0]));

  for (const client of clients) {
    const rng = makeRng(`client:${client.__id}`);
    const patch = { seedTag: SEED_TAG };

    if (!client.primaryDiagnosis) {
      const dx = pick(rng, RO.DIAGNOSES);
      patch.primaryDiagnosis = dx.primaryDiagnosis;
      patch.diagnosisLevel = pick(rng, dx.levels);
    }
    if (!client.diagnosisDate && client.birthDate) {
      // Diagnosed somewhere between 24 and 42 months old.
      const b = new Date(client.birthDate);
      b.setMonth(b.getMonth() + int(rng, 24, 42));
      patch.diagnosisDate = ymd(b);
    }
    if (!client.therapistIds || !client.therapistIds.length) {
      // Assign to the least-loaded therapists so caseloads stay balanced.
      const sorted = [...therapists].sort((a, b) => caseloads.get(a.__id) - caseloads.get(b.__id));
      const assigned = sorted.slice(0, heroes.has(client.__id) ? 2 : 1);
      assigned.forEach((t) => caseloads.set(t.__id, caseloads.get(t.__id) + 1));
      patch.therapistIds = assigned.map((t) => t.__id);
      patch.assignedTherapistId = assigned[0].__id;
    }
    if (client.hasActiveSubscription === undefined) {
      // Roughly a third on a monthly subscription, a third on a fixed per-session
      // price, the rest billed per hour from the service rate.
      const roll = rng();
      if (roll < 0.3) {
        patch.hasActiveSubscription = true;
        patch.subscriptionPrice = pick(rng, [1800, 2200, 2600, 3000]);
      } else if (roll < 0.6) {
        patch.hasActiveSubscription = false;
        patch.fixedSessionPrice = pick(rng, [150, 170, 180, 200]);
      } else {
        patch.hasActiveSubscription = false;
      }
    }
    if (!client.billingAddress) {
      patch.billingAddress = `Str. ${pick(rng, ["Aviatorilor", "Mihai Eminescu", "Dorobanți", "Primăverii", "Unirii", "Victoriei"])} nr. ${int(rng, 2, 140)}, București`;
    }
    if (!client.status) patch.status = "active";

    writes.push({ id: client.__id, patch });
  }

  return { writes, caseloads };
}

/* ---------------- sessions ---------------- */

const BILLABLE_SERVICES = ["therapy", "therapy", "therapy", "logopedie", "logopedie", "psihoterapie", "dezvoltare-personala"];
const OCCASIONAL_SERVICES = ["evaluare", "group-therapy", "consiliere-parinti"];

function sessionNote(rng, attendance) {
  if (attendance === "absent") return pick(rng, RO.NOTES_ABSENT);
  if (attendance === "excused") return pick(rng, RO.NOTES_EXCUSED);
  return rng() < 0.7 ? pick(rng, RO.NOTES_GOOD) : pick(rng, RO.NOTES_MIXED);
}

/**
 * Program trial counts for one session. `progress` (0..1) walks the child along
 * their trajectory, so "plus" trials rise and "minus" trials fall over the year
 * — which is what makes the success-rate trend lines actually trend.
 */
function programScoresFor(rng, programIds, progress) {
  const scores = {};
  for (const pid of programIds) {
    const trials = int(rng, 8, 14);
    // Keep session-to-session noise small. calculateTrend() compares only the
    // last 3 sessions against the previous 3, so a wide jitter makes the trend
    // indicator report noise instead of the year-long direction.
    const skill = Math.max(0, Math.min(1, progress + (rng() - 0.5) * 0.08));
    const plus = Math.round(trials * (0.2 + skill * 0.55));
    const prompted = Math.round((trials - plus) * (0.35 + rng() * 0.3));
    const minus = Math.max(0, Math.round((trials - plus - prompted) * (0.55 + rng() * 0.4)));
    const zero = Math.max(0, trials - plus - prompted - minus);
    scores[pid] = { plus, prompted, minus, zero };
  }
  return scores;
}

function attendanceFor(rng) {
  const roll = rng();
  if (roll < 0.85) return "present";
  if (roll < 0.93) return "absent";
  return "excused";
}

/**
 * Builds the weekly session plan for one client and materialises it across a
 * date range. Past sessions are completed and scored; future ones stay
 * "upcoming" with no attendance, exactly as the app would create them.
 */
export function generateEventsForClient({ client, therapists, programs, isHero, from, to, now }) {
  const rng = makeRng(`events:${client.__id}`);
  const clientTherapists = (client.therapistIds && client.therapistIds.length
    ? client.therapistIds
    : [therapists[0].__id]
  ).map((id) => therapists.find((t) => t.__id === id) || therapists[0]);

  const clientPrograms = pickN(rng, programs.map((p) => p.__id), int(rng, 3, 5));
  // ABA is an intensive therapy — 2-4 sessions a week per child is normal, and
  // anything less leaves the centre billing too little to cover its own payroll,
  // which shows up as a negative monthly profit on the billing page.
  const perWeek = isHero ? 4 : int(rng, 2, 3);

  // Fixed weekday/hour slots, so the calendar looks like a real recurring schedule
  // rather than scattered noise.
  const slots = pickN(rng, [1, 2, 3, 4, 5], perWeek).map((weekday) => ({
    weekday,
    hour: int(rng, 9, 16),
    therapist: pick(rng, clientTherapists),
    service: rng() < 0.18 ? pick(rng, OCCASIONAL_SERVICES) : pick(rng, BILLABLE_SERVICES),
  }));

  const events = [];
  const spanMs = to.getTime() - from.getTime();
  const cursor = new Date(from);

  while (cursor <= to) {
    for (const slot of slots) {
      if (cursor.getDay() !== slot.weekday) continue;
      // Occasional gaps — holidays, illness weeks.
      if (rng() < 0.07) continue;

      const start = new Date(cursor);
      start.setHours(slot.hour, 0, 0, 0);
      const duration = slot.service === "group-therapy" ? 90 : 60;
      const end = new Date(start.getTime() + duration * 60000);
      const isPast = start < now;
      const progress = Math.max(0, Math.min(1, (start.getTime() - from.getTime()) / spanMs));
      const attendance = isPast ? attendanceFor(rng) : null;
      const attended = attendance === "present";

      events.push({
        title: `${RO.EVENT_TITLE_BY_SERVICE[slot.service] || "Ședință"} — ${client.name.split(" ")[0]}`,
        type: slot.service,
        duration,
        therapistId: slot.therapist.__id,
        clientId: client.__id,
        teamMemberIds: [slot.therapist.__id],
        clientIds: [client.__id],
        programIds: clientPrograms,
        details: isPast ? sessionNote(rng, attendance) : "",
        programScores: attended ? programScoresFor(rng, clientPrograms, progress) : {},
        programNotes: attended && rng() < 0.35 ? { [clientPrograms[0]]: pick(rng, RO.PROGRAM_NOTES) } : {},
        objectiveNotes: {},
        status: isPast ? "completed" : "upcoming",
        attendance,
        recurringGroupId: null,
        startTime: iso(start),
        endTime: iso(end),
        createdAt: iso(new Date(start.getTime() - 7 * 86400000)),
        seedTag: SEED_TAG,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return events;
}

/**
 * Repairs an event the demo already had. The demo's own seeding left 214 events
 * with attendance "unknown" (not a value the app writes), no session notes, and
 * all-zero program scores — all of which render as broken or empty.
 */
export function repairEvent({ event, client, programs, now }) {
  const rng = makeRng(`repair:${event.__id}`);
  const patch = {};
  const start = new Date(event.startTime);
  const isPast = start < now;

  const invalidAttendance = !["present", "absent", "excused"].includes(event.attendance);
  if (isPast && invalidAttendance) patch.attendance = attendanceFor(rng);
  if (!isPast && event.attendance) patch.attendance = null;

  const attendance = patch.attendance !== undefined ? patch.attendance : event.attendance;
  const attended = attendance === "present";

  if (isPast && !event.details) patch.details = sessionNote(rng, attendance);
  if (isPast && event.status !== "completed") patch.status = "completed";

  if (!event.title || /fără titlu|fara titlu|untitled/i.test(event.title)) {
    const label = RO.EVENT_TITLE_BY_SERVICE[event.type] || "Ședință";
    patch.title = client ? `${label} — ${client.name.split(" ")[0]}` : label;
  }

  // The demo's existing scores are mostly all-zero maps, and often only one
  // programme in an event carries real trials. Fill the empty entries per
  // programme rather than per event, so genuine data is never overwritten.
  const existing = event.programScores || {};
  const hasTrials = (s) => !!s && (s.plus || s.minus || s.zero || s.prompted);

  if (attended) {
    const ids = event.programIds && event.programIds.length
      ? event.programIds
      : pickN(rng, programs.map((p) => p.__id), 3);
    const empty = ids.filter((id) => !hasTrials(existing[id]));
    if (empty.length) {
      // Mid-trajectory: these are historical sessions from the middle of the year.
      const filled = programScoresFor(rng, empty, 0.35 + rng() * 0.3);
      patch.programScores = { ...existing, ...filled };
      if (!event.programIds || !event.programIds.length) patch.programIds = ids;
    }
  } else if (Object.keys(existing).length) {
    patch.programScores = {};
  }

  if (Object.keys(patch).length) patch.seedRepaired = SEED_TAG;
  return patch;
}

/* ---------------- billing ---------------- */

/**
 * One invoice per client per past month, priced the same way the billing page
 * prices it (subscription > fixed per session > service hourly rate) so the
 * stored invoice agrees with the figure the app derives from the events.
 */
export function generateInvoices({ clients, events, services, now }) {
  const byClientMonth = new Map();

  for (const ev of events) {
    if (!ev.attendance) continue;
    if (ev.attendance !== "present" && ev.attendance !== "absent") continue;
    const service = services.find((s) => s.__id === ev.type);
    if (!service || service.isBillable === false) continue;
    const d = new Date(ev.startTime);
    if (d >= now) continue;
    const key = `${ev.clientId}|${d.getFullYear()}-${d.getMonth()}`;
    const cur = byClientMonth.get(key) || { sessions: 0, minutes: 0, amount: 0 };
    cur.sessions += 1;
    cur.minutes += ev.duration || 60;
    cur.amount += ((ev.duration || 60) / 60) * (service.basePrice || 0);
    byClientMonth.set(key, cur);
  }

  const invoices = [];
  let counter = 1000;

  for (const [key, agg] of [...byClientMonth.entries()].sort()) {
    const [clientId, ym] = key.split("|");
    const [year, monthIdx] = ym.split("-").map(Number);
    const client = clients.find((c) => c.__id === clientId);
    if (!client || agg.sessions === 0) continue;

    const rng = makeRng(`invoice:${key}`);
    const total = client.hasActiveSubscription
      ? client.subscriptionPrice || 0
      : client.fixedSessionPrice
        ? agg.sessions * client.fixedSessionPrice
        : Math.round(agg.amount);
    if (!total) continue;

    // Older months settled; the two most recent left outstanding, with a couple
    // slipping into overdue so the parent portal has something to show.
    const monthsAgo = (now.getFullYear() - year) * 12 + (now.getMonth() - monthIdx);
    let status = "paid";
    if (monthsAgo <= 0) status = "issued";
    else if (monthsAgo === 1) status = rng() < 0.55 ? "issued" : "paid";
    else if (monthsAgo === 2 && rng() < 0.25) status = "overdue";

    const issueDate = new Date(year, monthIdx + 1, 3);
    const dueDate = new Date(year, monthIdx + 1, 18);
    counter += 1;

    invoices.push({
      id: `inv_${clientId}_${year}_${String(monthIdx + 1).padStart(2, "0")}`,
      data: {
        clientId,
        clientName: client.name,
        series: "TMP",
        number: String(counter),
        date: ymd(issueDate),
        dueDate: ymd(dueDate),
        year,
        month: monthIdx,
        sessions: agg.sessions,
        billableSessions: agg.sessions,
        totalHours: Math.round((agg.minutes / 60) * 10) / 10,
        subtotal: total,
        discount: 0,
        total,
        currency: "RON",
        vatRate: 0,
        status,
        items: [
          {
            description: `Servicii de terapie — ${new Date(year, monthIdx, 1).toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}`,
            quantity: agg.sessions,
            price: Math.round((total / agg.sessions) * 100) / 100,
          },
        ],
        createdAt: iso(issueDate),
        seedTag: SEED_TAG,
      },
    });
  }

  return invoices;
}

export function generatePayouts({ team, events, now }) {
  const byMemberMonth = new Map();
  for (const ev of events) {
    if (ev.attendance !== "present") continue;
    const d = new Date(ev.startTime);
    if (d >= now) continue;
    for (const memberId of ev.teamMemberIds || []) {
      const key = `${memberId}|${d.getFullYear()}-${d.getMonth()}`;
      byMemberMonth.set(key, (byMemberMonth.get(key) || 0) + (ev.duration || 60));
    }
  }

  const payouts = [];
  for (const [key, minutes] of byMemberMonth.entries()) {
    const [memberId, ym] = key.split("|");
    const [year, monthIdx] = ym.split("-").map(Number);
    const member = team.find((t) => t.__id === memberId);
    if (!member) continue;
    const rng = makeRng(`payout:${key}`);
    const baseSalary = member.baseSalary || 0;
    const bonus = rng() < 0.4 ? int(rng, 1, 6) * 50 : 0;
    const deductions = rng() < 0.15 ? int(rng, 1, 3) * 50 : 0;
    const monthsAgo = (now.getFullYear() - year) * 12 + (now.getMonth() - monthIdx);

    payouts.push({
      id: `payout_${year}_${String(monthIdx + 1).padStart(2, "0")}_${memberId}`,
      data: {
        teamMemberId: memberId,
        teamMemberName: member.name,
        month: `${year}-${String(monthIdx + 1).padStart(2, "0")}`,
        totalHours: Math.round((minutes / 60) * 10) / 10,
        baseAmount: baseSalary,
        baseSalary,
        bonusAmount: bonus,
        bonus,
        deductions,
        total: baseSalary + bonus - deductions,
        status: monthsAgo >= 1 ? "paid" : "pending",
        seedTag: SEED_TAG,
      },
    });
  }
  return payouts;
}

export function generateExpenses({ now, monthsBack }) {
  const out = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const rng = makeRng(`expense:${d.getFullYear()}-${d.getMonth()}`);
    for (const tpl of RO.EXPENSES) {
      if (!tpl.isRecurring && rng() < 0.6) continue;
      const jitter = tpl.isRecurring ? 1 : 0.8 + rng() * 0.5;
      out.push({
        id: `exp_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, "0")}_${tpl.title.slice(0, 12).replace(/\W+/g, "")}`,
        data: {
          title: tpl.title,
          category: tpl.category,
          amount: Math.round(tpl.amount * jitter),
          date: ymd(new Date(d.getFullYear(), d.getMonth(), int(rng, 1, 26))),
          isRecurring: !!tpl.isRecurring,
          notes: "",
          createdAt: iso(d),
          seedTag: SEED_TAG,
        },
      });
    }
  }
  return out;
}

/* ---------------- parent-facing data ---------------- */

export function generateHomework({ client, therapist, now }) {
  const rng = makeRng(`homework:${client.__id}`);
  const chosen = pickN(rng, RO.HOMEWORK, int(rng, 2, 4));
  return chosen.map((tpl, i) => {
    const created = new Date(now.getTime() - int(rng, 3, 60) * 86400000);
    const completed = rng() < 0.55;
    return {
      id: `hw_${client.__id}_${i}`,
      data: {
        title: tpl.title,
        description: tpl.description,
        assignedBy: therapist.__id,
        frequency: pick(rng, ["daily", "weekly", "3x_week"]),
        completed,
        completedAt: completed ? iso(new Date(created.getTime() + 2 * 86400000)) : null,
        parentNotes: completed && rng() < 0.5 ? "Am lucrat zilnic, merge din ce în ce mai bine." : "",
        createdAt: iso(created),
        seedTag: SEED_TAG,
      },
    };
  });
}

export function generatePlan({ client, programs, coordinator, now }) {
  const rng = makeRng(`plan:${client.__id}`);
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 28);
  const objectives = pickN(rng, RO.OBJECTIVES, int(rng, 4, 6)).map((title, i) => ({
    id: `obj_${client.__id}_${i}`,
    title,
    description: "",
    // A believable plan in flight: some achieved, most in progress, a couple not started.
    status: i === 0 ? "achieved" : i === 1 && rng() < 0.6 ? "achieved" : rng() < 0.7 ? "in_progress" : "not_started",
  }));

  return {
    id: `plan_${client.__id}`,
    data: {
      name: pick(rng, RO.PLAN_NAMES),
      startDate: ymd(start),
      endDate: ymd(end),
      programIds: pickN(rng, programs.map((p) => p.__id), int(rng, 3, 5)),
      objectives,
      status: "active",
      createdAt: iso(start),
      createdBy: coordinator.__id,
      clientId: client.__id,
      seedTag: SEED_TAG,
    },
  };
}

export function generateDocuments({ client, uploader, now }) {
  const rng = makeRng(`docs:${client.__id}`);
  return pickN(rng, RO.DOCUMENTS, int(rng, 2, 4)).map((tpl, i) => ({
    id: `doc_${client.__id}_${i}`,
    data: {
      name: tpl.name,
      fileName: tpl.name,
      category: tpl.category,
      // No Storage object behind these — metadata only, so the tab lists them
      // without pretending a download exists.
      url: "",
      size: int(rng, 80, 900) * 1024,
      sharedWithParent: rng() < 0.7,
      uploadedBy: uploader.__id,
      uploadedByName: uploader.name,
      createdAt: iso(new Date(now.getTime() - int(rng, 10, 200) * 86400000)),
      seedTag: SEED_TAG,
    },
  }));
}

export { pick, pickN, int, iso, ymd };
