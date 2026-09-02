import { appendDiary, appendSession, completedActivityIds, readDiary, readSessions } from "./local-records";

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

  it("deduplicates completed activity IDs", () => {
    expect(completedActivityIds([
      { activityId: "a", name: "A", startedAt: 1, finishedAt: 2 },
      { activityId: "a", name: "A", startedAt: 3, finishedAt: 4 },
      { activityId: "b", name: "B", startedAt: 5, finishedAt: 5 },
    ])).toEqual(new Set(["a"]));
  });
});
