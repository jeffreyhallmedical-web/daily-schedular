import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, RotateCcw, Cloud, CloudOff } from "lucide-react";

const STORAGE_KEY = "daily-practice-planner-v8-rest-no-password-fallback";
const API_URL = "/.netlify/functions/planner";

const OPTIONS = [
  { label: "", value: "" },
  { label: "Shimo", value: "SHIMO" },
  { label: "Nasu", value: "NASU" },
  { label: "WFH", value: "WFH" },
  { label: "Off", value: "OFF" },
  { label: "B-Trip", value: "B_TRIP" },
  { label: "Hol", value: "HOLIDAY" },
  { label: "Kawasaki", value: "KAWASAKI" },
];

const FILL_STYLES = {
  "": "bg-neutral-100 text-neutral-500",
  SHIMO: "bg-purple-200 text-purple-950",
  NASU: "bg-emerald-200 text-emerald-950",
  WFH: "bg-sky-200 text-sky-950",
  OFF: "bg-slate-200 text-slate-700",
  B_TRIP: "bg-amber-200 text-amber-950",
  HOLIDAY: "bg-rose-200 text-rose-950",
  KAWASAKI: "bg-teal-200 text-teal-950",
};

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISODate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayLabel(date) {
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

function monthDayLabel(date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function displayName(person) {
  return `${person.surname} ${person.givenName}`.trim();
}

function sortPeople(people) {
  return [...people].sort((a, b) => {
    const surname = a.surname.localeCompare(b.surname, undefined, { sensitivity: "base" });
    if (surname !== 0) return surname;
    return a.givenName.localeCompare(b.givenName, undefined, { sensitivity: "base" });
  });
}

function displayTime(value) {
  if (!value || typeof value !== "string") return "";
  const [hour = "", minute = ""] = value.split(":");
  const hourNumber = Number(hour);
  if (!Number.isFinite(hourNumber)) return value;
  return `${hourNumber}:${minute.padStart(2, "0")}`;
}

function normalizeTime(value, fallback = "08:30") {
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
    const h = compact.slice(0, -2);
    const m = compact.slice(-2);
    hour = Number(h);
    minute = Number(m);
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return fallback;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function blankEntry(defaultTimes) {
  return {
    am: "",
    pm: "",
    pmManual: false,
    startTime: defaultTimes.start,
    endTime: defaultTimes.end,
  };
}

function entryKey(personId, dateISO) {
  return `${personId}__${dateISO}`;
}

function isEntryBlank(entry) {
  return !entry.am && !entry.pm && !entry.pmManual;
}

function optionLabel(value, blankLabel) {
  return OPTIONS.find((option) => option.value === value)?.label || blankLabel;
}

function entriesArrayToMap(entries) {
  const next = {};
  for (const entry of entries || []) {
    next[entryKey(entry.personId, entry.date)] = {
      am: entry.am || "",
      pm: entry.pm || "",
      pmManual: Boolean(entry.pmManual),
      startTime: normalizeTime(entry.startTime, "08:30"),
      endTime: normalizeTime(entry.endTime, "17:00"),
    };
  }
  return next;
}

function LocationSelect({ period, value, onChange }) {
  const blankLabel = period;

  return (
    <div className={`relative h-[36px] border-b border-white ${FILL_STYLES[value] || FILL_STYLES[""]}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 outline-none"
      >
        {OPTIONS.map((option) => (
          <option key={`${period}-${option.value || "blank"}`} value={option.value}>
            {option.label || period}
          </option>
        ))}
      </select>
      <div className="pointer-events-none flex h-full items-center justify-center text-[18px] leading-none">
        {optionLabel(value, blankLabel)}
      </div>
    </div>
  );
}

function TimeInput({ value, fallback, onCommit }) {
  const [draft, setDraft] = useState(displayTime(value));

  useEffect(() => {
    setDraft(displayTime(value));
  }, [value]);

  function commit() {
    const normalized = normalizeTime(draft, fallback);
    setDraft(displayTime(normalized));
    onCommit(normalized);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(displayTime(value));
      }}
      className="h-full w-full bg-white px-0.5 text-center text-[14px] leading-none text-black outline-none focus:bg-yellow-50"
      aria-label="Time"
    />
  );
}

export default function DailyPracticePlannerPreview() {
  const [people, setPeople] = useState([]);
  const [entries, setEntries] = useState({});
  const [summerTime, setSummerTime] = useState(false);
  const [weekStartISO, setWeekStartISO] = useState(toISODate(startOfWeekMonday(new Date())));
  const [dayCount, setDayCount] = useState(10);
  const [showAdd, setShowAdd] = useState(false);
  const [newSurname, setNewSurname] = useState("");
  const [newGivenName, setNewGivenName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteStep, setDeleteStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("loading");
  const [lastError, setLastError] = useState("");

  const defaultTimes = useMemo(
    () => (summerTime ? { start: "08:00", end: "16:30" } : { start: "08:30", end: "17:00" }),
    [summerTime]
  );

  const dates = useMemo(() => {
    const start = parseISODate(weekStartISO);
    const result = [];
    let cursor = new Date(start);

    while (result.length < dayCount) {
      const day = cursor.getDay();
      const isWeekday = day !== 0 && day !== 6;
      if (isWeekday) {
        result.push({ date: new Date(cursor), iso: toISODate(cursor) });
      }
      cursor = addDays(cursor, 1);
    }

    return result;
  }, [weekStartISO, dayCount]);

  const sortedPeople = useMemo(() => sortPeople(people.filter((p) => p.active !== false)), [people]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.people)) setPeople(data.people);
        if (data.entries && typeof data.entries === "object") setEntries(data.entries);
        if (typeof data.summerTime === "boolean") setSummerTime(data.summerTime);
        if (data.weekStartISO) setWeekStartISO(data.weekStartISO);
        if (data.dayCount) setDayCount(data.dayCount);
      }
    } catch (error) {
      console.warn("Unable to load local fallback data", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ people, entries, summerTime, weekStartISO, dayCount })
    );
  }, [people, entries, summerTime, weekStartISO, dayCount, loaded]);

  useEffect(() => {
    if (!loaded || dates.length === 0) return;

    let cancelled = false;

    async function loadFromDatabase() {
      setCloudStatus("loading");
      setLastError("");

      try {
        const response = await fetch(`${API_URL}?start=${dates[0].iso}&days=${dayCount + 14}`, {
          headers: { accept: "application/json" },
        });
        const data = await response.json();


        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Database load failed.");
        }

        if (cancelled) return;
        setPeople(data.people || []);
        setEntries(entriesArrayToMap(data.entries || []));
        setSummerTime(Boolean(data.settings?.summerTime));
        setCloudStatus("cloud");
      } catch (error) {
        if (cancelled) return;
        setCloudStatus("local");
        setLastError(error.message || "Cloud database unavailable.");
      }
    }

    loadFromDatabase();

    return () => {
      cancelled = true;
    };
  }, [loaded, weekStartISO, dayCount]);

  async function postPlanner(payload) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Save failed.");
    }

    setCloudStatus("cloud");
    setLastError("");
    return data;
  }

  function handleSaveError(error) {
    console.warn(error);
    setCloudStatus("local");
    setLastError(error.message || "Cloud save failed. Local fallback saved in this browser.");
  }

  function getEntry(personId, dateISO) {
    return entries[entryKey(personId, dateISO)] || blankEntry(defaultTimes);
  }

  function updateEntry(personId, dateISO, patch) {
    const key = entryKey(personId, dateISO);
    const current = entries[key] || blankEntry(defaultTimes);
    const nextEntry = { ...current, ...patch };

    setEntries((prev) => ({ ...prev, [key]: nextEntry }));

    postPlanner({
      action: "updateEntry",
      personId,
      date: dateISO,
      ...nextEntry,
    }).catch(handleSaveError);
  }

  function handleAMChange(personId, dateISO, value) {
    const current = getEntry(personId, dateISO);
    const patch = { am: value };
    if (!current.pmManual) patch.pm = value;
    updateEntry(personId, dateISO, patch);
  }

  function handlePMChange(personId, dateISO, value) {
    updateEntry(personId, dateISO, { pm: value, pmManual: true });
  }

  function applySummerTimeToggle(nextValue) {
    const oldDefaults = summerTime ? { start: "08:00", end: "16:30" } : { start: "08:30", end: "17:00" };
    const nextDefaults = nextValue ? { start: "08:00", end: "16:30" } : { start: "08:30", end: "17:00" };
    const changed = [];

    setEntries((prev) => {
      const next = { ...prev };
      for (const [key, entry] of Object.entries(prev)) {
        const blank = isEntryBlank(entry);
        const stillDefaultTime = entry.startTime === oldDefaults.start && entry.endTime === oldDefaults.end;
        if (blank && stillDefaultTime) {
          next[key] = { ...entry, startTime: nextDefaults.start, endTime: nextDefaults.end };
          const [personId, date] = key.split("__");
          changed.push({ personId, date, entry: next[key] });
        }
      }
      return next;
    });

    setSummerTime(nextValue);
    postPlanner({ action: "updateSettings", summerTime: nextValue }).catch(handleSaveError);

    for (const item of changed) {
      postPlanner({ action: "updateEntry", personId: item.personId, date: item.date, ...item.entry }).catch(handleSaveError);
    }
  }

  async function addPerson() {
    const surname = newSurname.trim();
    const givenName = newGivenName.trim();
    if (!surname || !givenName || sortedPeople.length >= 50) return;

    try {
      const data = await postPlanner({ action: "addPerson", surname, givenName });
      setPeople((prev) => [...prev, data.person]);
    } catch (error) {
      handleSaveError(error);
      setPeople((prev) => [
        ...prev,
        {
          id: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          surname,
          givenName,
          active: true,
        },
      ]);
    }

    setNewSurname("");
    setNewGivenName("");
    setShowAdd(false);
  }

  function beginDelete(person) {
    setDeleteTarget(person);
    setDeleteStep(1);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }

    setPeople((prev) => prev.map((person) => (person.id === deleteTarget.id ? { ...person, active: false } : person)));

    if (!String(deleteTarget.id).startsWith("local_")) {
      postPlanner({ action: "deletePerson", personId: deleteTarget.id }).catch(handleSaveError);
    }

    setDeleteTarget(null);
    setDeleteStep(0);
  }

  function cancelDelete() {
    setDeleteTarget(null);
    setDeleteStep(0);
  }

  function clearLocalData() {
    localStorage.removeItem(STORAGE_KEY);
    setEntries({});
    setSummerTime(false);
    setWeekStartISO(toISODate(startOfWeekMonday(new Date())));
    setDayCount(10);
  }

  const statusLabel = cloudStatus === "cloud" ? "Supabase" : cloudStatus === "loading" ? "Checking cloud" : "Local fallback";
  const statusIcon = cloudStatus === "cloud" ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />;


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-50 border-b border-slate-300 bg-white">
        <div className="mx-auto max-w-[1800px] px-3 py-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <CalendarDays className="h-6 w-6" />
              Daily Practice Planner
                        </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setWeekStartISO(toISODate(addDays(parseISODate(weekStartISO), -7)))}
                className="inline-flex items-center gap-1 border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
                Week
              </button>
              <button
                onClick={() => setWeekStartISO(toISODate(startOfWeekMonday(new Date())))}
                className="border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
              >
                Today
              </button>
              <button
                onClick={() => setWeekStartISO(toISODate(addDays(parseISODate(weekStartISO), 7)))}
                className="inline-flex items-center gap-1 border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
              >
                Week
                <ChevronRight className="h-4 w-4" />
              </button>

              <select
                value={dayCount}
                onChange={(e) => setDayCount(Number(e.target.value))}
                className="border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium"
              >
                <option value={5}>5 weekdays</option>
                <option value={10}>10 weekdays</option>
                <option value={15}>15 weekdays</option>
                <option value={20}>20 weekdays</option>
              </select>

              <label className="inline-flex cursor-pointer items-center gap-2 border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={summerTime}
                  onChange={(e) => applySummerTimeToggle(e.target.checked)}
                  className="h-4 w-4 border-slate-300"
                />
                Summer time
              </label>

              <button
                onClick={() => setShowAdd(true)}
                disabled={sortedPeople.length >= 50}
                className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Add person
              </button>
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <div>{displayTime(defaultTimes.start)}–{displayTime(defaultTimes.end)}</div>
            <div>{sortedPeople.length}/50 people</div>
            <div className={`inline-flex items-center gap-1 ${cloudStatus === "cloud" ? "text-emerald-700" : "text-amber-700"}`} title={lastError}>
              {statusIcon}
              {statusLabel}
            </div>
            <button onClick={clearLocalData} className="inline-flex items-center gap-1 border border-transparent px-1.5 py-0.5 hover:border-slate-300 hover:bg-slate-100">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset local
            </button>
          </div>
          {lastError && cloudStatus !== "cloud" && (
            <div className="mt-1 text-xs text-amber-700">{lastError}</div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-[1800px] px-3 py-3">
        <div className="max-h-[calc(100vh-112px)] overflow-auto border border-slate-300 bg-white">
          <table className="min-w-max border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 top-0 z-40 w-36 min-w-36 border-b border-r border-slate-300 bg-slate-100 px-2 py-2 text-left align-bottom text-lg font-bold">
                  Person
                </th>
                {dates.map(({ date, iso }) => {
                  const today = iso === toISODate(new Date());
                  return (
                    <th key={iso} className="sticky top-0 z-30 w-[114px] min-w-[114px] border-b border-r border-slate-300 bg-slate-100 px-1.5 py-1.5 text-left align-top">
                      <div className={`border border-slate-300 px-2 py-1 ${today ? "bg-slate-900 text-white" : "bg-white"}`}>
                        <div className="text-[11px] font-medium opacity-80">{dayLabel(date)}</div>
                        <div className="text-sm font-semibold">{monthDayLabel(date)}</div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedPeople.length === 0 && (
                <tr>
                  <td className="sticky left-0 z-20 border-b border-r border-slate-300 bg-white px-2 py-4 text-slate-500" colSpan={dates.length + 1}>
                    No people added yet. Use Add person.
                  </td>
                </tr>
              )}
              {sortedPeople.map((person) => (
                <tr key={person.id} className="group hover:bg-slate-50/70">
                  <td className="sticky left-0 z-20 border-b border-r border-slate-300 bg-white px-2 py-1.5 align-top group-hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="text-lg font-bold leading-tight">{person.surname}</div>
                        <div className="text-base leading-tight text-slate-600">{person.givenName}</div>
                      </div>
                      <button
                        onClick={() => beginDelete(person)}
                        className="p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        title={`Delete ${displayName(person)}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>

                  {dates.map(({ iso }) => {
                    const entry = getEntry(person.id, iso);
                    return (
                      <td key={iso} className="border-b border-r border-slate-300 p-1 align-top">
                        <div className="w-[104px] overflow-hidden border-[2px] border-slate-950 bg-white">
                          <LocationSelect
                            period="AM"
                            value={entry.am}
                            onChange={(value) => handleAMChange(person.id, iso, value)}
                          />
                          <LocationSelect
                            period="PM"
                            value={entry.pm}
                            onChange={(value) => handlePMChange(person.id, iso, value)}
                          />
                          <div className="grid h-[22px] grid-cols-2 gap-[2px] border-t-[2px] border-slate-950 bg-slate-950">
                            <TimeInput
                              value={entry.startTime}
                              fallback={defaultTimes.start}
                              onCommit={(value) => updateEntry(person.id, iso, { startTime: value })}
                            />
                            <TimeInput
                              value={entry.endTime}
                              fallback={defaultTimes.end}
                              onCommit={(value) => updateEntry(person.id, iso, { endTime: value })}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md border border-slate-400 bg-white p-5 shadow-2xl">
            <div className="text-lg font-semibold">Add person</div>
            <div className="mt-4 grid gap-3">
              <input
                value={newSurname}
                onChange={(e) => setNewSurname(e.target.value)}
                autoFocus
                className="w-full border border-slate-400 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Surname"
              />
              <input
                value={newGivenName}
                onChange={(e) => setNewGivenName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addPerson();
                }}
                className="w-full border border-slate-400 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Given name"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="border border-slate-400 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={addPerson}
                disabled={!newSurname.trim() || !newGivenName.trim() || sortedPeople.length >= 50}
                className="border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md border border-slate-400 bg-white p-5 shadow-2xl">
            <div className="text-lg font-semibold text-red-700">
              {deleteStep === 1 ? "Confirm delete" : "Final confirmation"}
            </div>
            <div className="mt-2 text-sm text-slate-700">
              {deleteStep === 1
                ? `Delete ${displayName(deleteTarget)}?`
                : `This will remove ${displayName(deleteTarget)} from the planner. Confirm delete?`}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="border border-slate-400 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="border border-red-700 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {deleteStep === 1 ? "Continue" : "Delete person"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
