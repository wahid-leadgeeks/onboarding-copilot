import { appendDiary, appendQuickNote, appendSession, completedActivityIds, readDiary, readQuickNotes, readSessions } from "./local-records";

describe("local records", () => {
  it("migrates a single completed session object", () => {
    const sessions = readSessions(JSON.stringify({ startedAt: 1, finishedAt: 61000 }));
    expect(sessions).toHaveLength(1);
    expect(sessions[0].finishedAt).toBe(61000);
  });

  it("appends diary entries without overwriting history", () => {
    const next = appendDiary([{ content: "first", createdAt: "a" }], { content: "second", createdAt: "b" });
    expect(next.map((entry) => entry.content)).toEqual(["first", "second"]);
  });

  it("appends finished sessions instead of replacing them", () => {
    const next = appendSession(
      [{ activityId: "a", name: "A", startedAt: 1, finishedAt: 2 }],
      { activityId: "b", name: "B", startedAt: 3, finishedAt: 4 },
    );
    expect(next).toHaveLength(2);
  });

  it("ignores malformed diary JSON", () => {
    expect(readDiary("not-json")).toEqual([]);
  });

  it("reads quick notes and drops invalid entries", () => {
    const raw = JSON.stringify([
      { content: "MD explained company strategy", createdAt: "2026-09-03T09:00:00.000Z" },
      { content: 42 },
      "not-a-note",
    ]);
    const notes = readQuickNotes(raw);
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("MD explained company strategy");
  });

  it("ignores malformed quick note JSON", () => {
    expect(readQuickNotes("not-json")).toEqual([]);
    expect(readQuickNotes(null)).toEqual([]);
  });

  it("appends quick notes without overwriting earlier ones", () => {
    const next = appendQuickNote(
      [{ content: "first", createdAt: "a" }],
      { content: "second", createdAt: "b" },
    );
    expect(next.map((note) => note.content)).toEqual(["first", "second"]);
  });

  it("deduplicates completed activity IDs", () => {
    expect(completedActivityIds([
      { activityId: "a", name: "A", startedAt: 1, finishedAt: 2 },
      { activityId: "a", name: "A", startedAt: 3, finishedAt: 4 },
      { activityId: "b", name: "B", startedAt: 5, finishedAt: 5 },
    ])).toEqual(new Set(["a"]));
  });
});
