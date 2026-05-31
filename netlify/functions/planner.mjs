import { createClient } from "@supabase/supabase-js";

const VALID_OPTIONS = new Set(["", "SHIMO", "NASU", "WFH", "OFF", "B_TRIP", "HOLIDAY", "KAWASAKI"]);

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function getSupabase() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isAuthorized(event) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true;
  const supplied = event.headers["x-app-password"] || event.headers["X-App-Password"];
  return supplied === expected;
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function normalizeDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new Error("Invalid date. Expected YYYY-MM-DD.");
  }
  return value;
}

function normalizeTime(value, fallback) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;

  const compact = raw.replace(/[.：]/g, ":").replace(/[^0-9:]/g, "");
  let hour;
  let minute;

  if (compact.includes(":")) {
    const [h, m = "0"] = compact.split(":");
    hour = Number(h);
    minute = Number(m.padEnd(2, "0").slice(0, 2));
  } else if (compact.length <= 2) {
    hour = Number(compact);
    minute = 0;
  } else {
    hour = Number(compact.slice(0, -2));
    minute = Number(compact.slice(-2));
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return fallback;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeOption(value) {
  const normalized = String(value || "");
  if (!VALID_OPTIONS.has(normalized)) {
    throw new Error(`Invalid location option: ${normalized}`);
  }
  return normalized;
}

async function loadPlanner(event) {
  const supabase = getSupabase();
  const params = event.queryStringParameters || {};
  const start = normalizeDate(params.start || new Date().toISOString().slice(0, 10));
  const days = Math.min(Math.max(Number(params.days || 20), 1), 90);
  const endDate = new Date(`${start}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + days);
  const end = endDate.toISOString().slice(0, 10);

  const [peopleResult, entriesResult, settingsResult] = await Promise.all([
    supabase
      .from("people")
      .select("id, surname, given_name, active, created_at, updated_at")
      .eq("active", true)
      .order("surname", { ascending: true })
      .order("given_name", { ascending: true }),
    supabase
      .from("schedule_entries")
      .select("person_id, schedule_date, am_location, pm_location, pm_manually_changed, start_time, end_time")
      .gte("schedule_date", start)
      .lt("schedule_date", end)
      .order("schedule_date", { ascending: true }),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "planner")
      .maybeSingle(),
  ]);

  const firstError = peopleResult.error || entriesResult.error || settingsResult.error;
  if (firstError) throw new Error(firstError.message);

  const people = (peopleResult.data || []).map((person) => ({
    id: person.id,
    surname: person.surname,
    givenName: person.given_name,
    active: person.active,
    created_at: person.created_at,
    updated_at: person.updated_at,
  }));

  const entries = (entriesResult.data || []).map((entry) => ({
    personId: entry.person_id,
    date: entry.schedule_date,
    am: entry.am_location || "",
    pm: entry.pm_location || "",
    pmManual: Boolean(entry.pm_manually_changed),
    startTime: String(entry.start_time || "08:30").slice(0, 5),
    endTime: String(entry.end_time || "17:00").slice(0, 5),
  }));

  const settings = settingsResult.data?.value || { summer_time_enabled: false };

  return json(200, {
    ok: true,
    people,
    entries,
    settings: { summerTime: Boolean(settings.summer_time_enabled) },
  });
}

async function addPerson(body) {
  const supabase = getSupabase();
  const surname = String(body.surname || "").trim();
  const givenName = String(body.givenName || "").trim();

  if (!surname || !givenName) {
    return json(400, { ok: false, error: "Surname and given name are required." });
  }

  const { count, error: countError } = await supabase
    .from("people")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  if (countError) throw new Error(countError.message);
  if ((count || 0) >= 50) {
    return json(400, { ok: false, error: "Maximum of 50 active people reached." });
  }

  const { data, error } = await supabase
    .from("people")
    .insert({ surname, given_name: givenName })
    .select("id, surname, given_name, active, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);

  return json(200, {
    ok: true,
    person: {
      id: data.id,
      surname: data.surname,
      givenName: data.given_name,
      active: data.active,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  });
}

async function deletePerson(body) {
  const supabase = getSupabase();
  const personId = String(body.personId || "");
  if (!personId) return json(400, { ok: false, error: "personId is required." });

  const { error } = await supabase
    .from("people")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", personId);

  if (error) throw new Error(error.message);
  return json(200, { ok: true });
}

async function updateEntry(body) {
  const supabase = getSupabase();
  const personId = String(body.personId || "");
  const scheduleDate = normalizeDate(body.date);
  const am = normalizeOption(body.am) || null;
  const pm = normalizeOption(body.pm) || null;
  const pmManual = Boolean(body.pmManual);
  const startTime = normalizeTime(body.startTime, "08:30");
  const endTime = normalizeTime(body.endTime, "17:00");

  if (!personId) return json(400, { ok: false, error: "personId is required." });

  const { data, error } = await supabase
    .from("schedule_entries")
    .upsert(
      {
        person_id: personId,
        schedule_date: scheduleDate,
        am_location: am,
        pm_location: pm,
        pm_manually_changed: pmManual,
        start_time: startTime,
        end_time: endTime,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "person_id,schedule_date" }
    )
    .select("person_id, schedule_date, am_location, pm_location, pm_manually_changed, start_time, end_time")
    .single();

  if (error) throw new Error(error.message);

  return json(200, {
    ok: true,
    entry: {
      personId: data.person_id,
      date: data.schedule_date,
      am: data.am_location || "",
      pm: data.pm_location || "",
      pmManual: Boolean(data.pm_manually_changed),
      startTime: String(data.start_time || "08:30").slice(0, 5),
      endTime: String(data.end_time || "17:00").slice(0, 5),
    },
  });
}

async function updateSettings(body) {
  const supabase = getSupabase();
  const summerTime = Boolean(body.summerTime);

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        key: "planner",
        value: { summer_time_enabled: summerTime },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (error) throw new Error(error.message);
  return json(200, { ok: true, settings: { summerTime } });
}

export const handler = async (event) => {
  try {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, error: "Unauthorized. Check the app password." });
    }

    if (event.httpMethod === "GET") {
      return await loadPlanner(event);
    }

    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed." });
    }

    const body = parseBody(event);

    switch (body.action) {
      case "addPerson":
        return await addPerson(body);
      case "deletePerson":
        return await deletePerson(body);
      case "updateEntry":
        return await updateEntry(body);
      case "updateSettings":
        return await updateSettings(body);
      default:
        return json(400, { ok: false, error: "Unknown action." });
    }
  } catch (error) {
    console.error(error);
    return json(500, { ok: false, error: error.message || "Server error." });
  }
};
