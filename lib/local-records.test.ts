import {
  appendDiary,
  appendQuickNote,
  appendSession,
  clipboardRowForDiary,
  completedActivityIds,
  convertQuickNote,
  createDiaryEntry,
  createQuickNote,
  diaryId,
  editDiary,
  escapeTsvCell,
  formatTakeawaysForDiary,
  mergeImportedDiary,
  quickNoteId,
  readDiary,
  readQuickNotes,
  readSessions,
  removeDiary,
  removeQuickNote,
} from "./local-records";

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

  it("reads legacy diary records unchanged", () => {
    const raw = JSON.stringify([{ content: "legacy note", createdAt: "2026-09-01T09:00:00.000Z" }]);
    expect(readDiary(raw)).toStrictEqual([{ content: "legacy note", createdAt: "2026-09-01T09:00:00.000Z" }]);
  });

  it("reads mixed legacy and structured diary entries", () => {
    const legacy = { content: "legacy", createdAt: "2026-09-01T09:00:00.000Z" };
    const structured = {
      content: "structured",
      createdAt: "2026-09-02T10:00:00.000Z",
      id: "d-custom",
      activityId: "security",
      activityName: "Security & Access Setup",
      source: "ai-assisted",
      updatedAt: "2026-09-02T11:00:00.000Z",
    };
    expect(readDiary(JSON.stringify([legacy, structured]))).toStrictEqual([legacy, structured]);
  });

  it("drops diary entries whose optional fields are invalid", () => {
    const raw = JSON.stringify([
      { content: "bad source", createdAt: "t", source: "dreamed" },
      { content: "bad id", createdAt: "t", id: 42 },
      { content: "bad updatedAt", createdAt: "t", updatedAt: null },
      { content: "bad activityId", createdAt: "t", activityId: 7 },
      { content: "bad activityName", createdAt: "t", activityName: false },
      { content: "good", createdAt: "t" },
    ]);
    expect(readDiary(raw).map((entry) => entry.content)).toEqual(["good"]);
  });

  it("reads quick notes with optional ids and drops invalid ones", () => {
    const raw = JSON.stringify([
      { content: "legacy", createdAt: "t1" },
      { content: "with id", createdAt: "t2", id: "q-abc" },
      { content: "bad id", createdAt: "t3", id: true },
    ]);
    expect(readQuickNotes(raw)).toStrictEqual([
      { content: "legacy", createdAt: "t1" },
      { content: "with id", createdAt: "t2", id: "q-abc" },
    ]);
  });

  it("derives stable diary ids from content and creation time", () => {
    const first = diaryId({ content: "same note", createdAt: "2026-09-01T09:00:00.000Z" });
    const second = diaryId({ content: "same note", createdAt: "2026-09-01T09:00:00.000Z" });
    expect(first).toBe(second);
    expect(first).not.toBe(diaryId({ content: "edited note", createdAt: "2026-09-01T09:00:00.000Z" }));
    expect(first).not.toBe(diaryId({ content: "same note", createdAt: "2026-09-02T09:00:00.000Z" }));
  });

  it("derives different ids for diary entries and quick notes", () => {
    const note = { content: "shared text", createdAt: "2026-09-01T09:00:00.000Z" };
    expect(diaryId(note)).not.toBe(quickNoteId(note));
  });

  it("creates diary entries with derived ids and no invented metadata", () => {
    const entry = createDiaryEntry({ content: "learned the release flow" }, "2026-09-05T10:00:00.000Z");
    expect(entry).toStrictEqual({
      content: "learned the release flow",
      createdAt: "2026-09-05T10:00:00.000Z",
      id: diaryId({ content: "learned the release flow", createdAt: "2026-09-05T10:00:00.000Z" }),
    });
  });

  it("creates diary entries carrying activity and source metadata", () => {
    const entry = createDiaryEntry(
      { content: "paired on access setup", activityId: "security", activityName: "Security & Access Setup", source: "manual" },
      "2026-09-05T10:00:00.000Z",
    );
    expect(entry).toStrictEqual({
      content: "paired on access setup",
      createdAt: "2026-09-05T10:00:00.000Z",
      id: diaryId({ content: "paired on access setup", createdAt: "2026-09-05T10:00:00.000Z" }),
      activityId: "security",
      activityName: "Security & Access Setup",
      source: "manual",
    });
  });

  it("creates quick notes with derived ids", () => {
    const note = createQuickNote("ask about the staging deploy", "2026-09-05T09:30:00.000Z");
    expect(note).toStrictEqual({
      content: "ask about the staging deploy",
      createdAt: "2026-09-05T09:30:00.000Z",
      id: quickNoteId({ content: "ask about the staging deploy", createdAt: "2026-09-05T09:30:00.000Z" }),
    });
  });

  it("edits diary content while keeping createdAt stable and the input untouched", () => {
    const next = editDiary(
      [{ content: "original", createdAt: "2026-09-01T09:00:00.000Z", id: "d-1", activityId: "security", source: "ai-assisted" }],
      { id: "d-1", content: "edited", updatedAt: "2026-09-05T12:00:00.000Z" },
    );
    expect(next).toStrictEqual([{
      content: "edited",
      createdAt: "2026-09-01T09:00:00.000Z",
      id: "d-1",
      activityId: "security",
      source: "ai-assisted",
      updatedAt: "2026-09-05T12:00:00.000Z",
    }]);
  });

  it("materializes the derived id when editing a legacy diary entry", () => {
    const id = diaryId({ content: "legacy note", createdAt: "2026-09-01T09:00:00.000Z" });
    const next = editDiary(
      [{ content: "legacy note", createdAt: "2026-09-01T09:00:00.000Z" }],
      { id, content: "clarified", updatedAt: "2026-09-05T12:00:00.000Z" },
    );
    expect(next).toStrictEqual([{ content: "clarified", createdAt: "2026-09-01T09:00:00.000Z", id, updatedAt: "2026-09-05T12:00:00.000Z" }]);
  });

  it("returns the diary unchanged when no entry matches the edit", () => {
    const next = editDiary([{ content: "note", createdAt: "t" }], { id: "d-missing", content: "edited", updatedAt: "u" });
    expect(next).toStrictEqual([{ content: "note", createdAt: "t" }]);
  });

  it("removes diary entries by explicit or derived id", () => {
    const legacy = { content: "legacy", createdAt: "t1" };
    const structured = { content: "structured", createdAt: "t2", id: "d-9" };
    const afterExplicit = removeDiary([legacy, structured], "d-9");
    expect(afterExplicit).toStrictEqual([legacy]);
    expect(removeDiary(afterExplicit, diaryId(legacy))).toStrictEqual([]);
  });

  it("removes quick notes by derived id and keeps the rest", () => {
    const first = { content: "first", createdAt: "t1" };
    const second = { content: "second", createdAt: "t2" };
    expect(removeQuickNote([first, second], quickNoteId(second))).toStrictEqual([first]);
  });

  it("converts a quick note into a diary entry with the original timestamp", () => {
    const note = { content: "follow up on VPN access", createdAt: "2026-09-01T14:00:00.000Z" };
    const result = convertQuickNote([note], [{ content: "earlier learning", createdAt: "2026-09-01T09:00:00.000Z" }], quickNoteId(note));
    expect(result.quickNotes).toStrictEqual([]);
    expect(result.diary).toStrictEqual([
      { content: "earlier learning", createdAt: "2026-09-01T09:00:00.000Z" },
      {
        content: "follow up on VPN access",
        createdAt: "2026-09-01T14:00:00.000Z",
        id: diaryId({ content: "follow up on VPN access", createdAt: "2026-09-01T14:00:00.000Z" }),
        source: "quick-note",
      },
    ]);
  });

  it("converts quick notes with explicit ids", () => {
    const result = convertQuickNote([{ content: "tagged", createdAt: "t1", id: "q-7" }], [], "q-7");
    expect(result.quickNotes).toStrictEqual([]);
    expect(result.diary).toStrictEqual([{ content: "tagged", createdAt: "t1", id: diaryId({ content: "tagged", createdAt: "t1" }), source: "quick-note" }]);
  });

  it("leaves both collections unchanged when the note id is unknown", () => {
    const result = convertQuickNote([{ content: "note", createdAt: "t1" }], [{ content: "entry", createdAt: "t2" }], "q-missing");
    expect(result.quickNotes).toStrictEqual([{ content: "note", createdAt: "t1" }]);
    expect(result.diary).toStrictEqual([{ content: "entry", createdAt: "t2" }]);
  });

  it("merges imported diary entries without duplicating exact content", () => {
    const next = mergeImportedDiary(
      [{ content: "already known", createdAt: "t1", id: "d-1" }],
      [
        { content: "already known", createdAt: "t9", id: "d-9" },
        { content: "new learning", createdAt: "t2", source: "manual" },
      ],
    );
    expect(next).toStrictEqual([
      { content: "already known", createdAt: "t1", id: "d-1" },
      { content: "new learning", createdAt: "t2", source: "manual" },
    ]);
  });

  it("keeps only the first of repeated content within one import", () => {
    const next = mergeImportedDiary([], [
      { content: "duplicate", createdAt: "t1" },
      { content: "duplicate", createdAt: "t2" },
      { content: "unique", createdAt: "t3" },
    ]);
    expect(next.map((entry) => entry.createdAt)).toEqual(["t1", "t3"]);
  });

  it("returns the existing diary when the import adds nothing new", () => {
    const expected = [{ content: "only", createdAt: "t1" }];
    expect(mergeImportedDiary([{ content: "only", createdAt: "t1" }], [{ content: "only", createdAt: "t2" }])).toStrictEqual(expected);
    expect(mergeImportedDiary([{ content: "only", createdAt: "t1" }], [])).toStrictEqual(expected);
  });
});

describe("diary schema extension & clipboard serialization", () => {
  function parseTsvRow(row: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    while (i < row.length) {
      const char = row[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < row.length && row[i + 1] === '"') {
            current += '"';
            i += 2;
            continue;
          } else {
            inQuotes = false;
            i += 1;
            continue;
          }
        } else {
          current += char;
          i += 1;
          continue;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
          i += 1;
          continue;
        } else if (char === '\t') {
          cells.push(current);
          current = '';
          i += 1;
          continue;
        } else {
          current += char;
          i += 1;
          continue;
        }
      }
    }
    cells.push(current);
    return cells;
  }

  it("reads modern diary entries with all additive fields", () => {
    const fullEntry = {
      content: "Summary note",
      createdAt: "2026-09-07T09:00:00.000Z",
      id: "d-123",
      activityId: "act-1",
      activityName: "Architecture Overview",
      source: "manual" as const,
      takeaways: ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
      topic: "Architecture Overview",
      day: "Day 1",
      date: "2026-09-07",
      week: 1,
      pic: "Arief",
      activityCount: 1,
      notes: "Follow up tomorrow",
    };
    const records = readDiary(JSON.stringify([fullEntry]));
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(fullEntry);
  });

  it("drops diary entries whose additive fields fail type checks", () => {
    const raw = JSON.stringify([
      { content: "c", createdAt: "t", takeaways: "not-an-array" },
      { content: "c", createdAt: "t", takeaways: [1, 2, 3] },
      { content: "c", createdAt: "t", topic: 42 },
      { content: "c", createdAt: "t", day: false },
      { content: "c", createdAt: "t", date: null },
      { content: "c", createdAt: "t", week: { w: 1 } },
      { content: "c", createdAt: "t", pic: true },
      { content: "c", createdAt: "t", activityCount: ["1"] },
      { content: "c", createdAt: "t", notes: 123 },
      { content: "valid", createdAt: "t", takeaways: ["a", "b"], week: "Week 1", activityCount: 2 },
    ]);
    const records = readDiary(raw);
    expect(records).toHaveLength(1);
    expect(records[0].content).toBe("valid");
    expect(records[0].week).toBe("Week 1");
    expect(records[0].activityCount).toBe(2);
  });

  it("creates diary entries with all additive fields when provided", () => {
    const entry = createDiaryEntry(
      {
        content: "Learning note",
        takeaways: ["Point 1", "Point 2", "Point 3"],
        topic: "Security",
        day: "Day 2",
        date: "2026-09-08",
        week: 1,
        pic: "Jane",
        activityCount: 1,
        notes: "Remember 2FA",
      },
      "2026-09-08T10:00:00.000Z",
    );
    expect(entry.topic).toBe("Security");
    expect(entry.takeaways).toEqual(["Point 1", "Point 2", "Point 3"]);
    expect(entry.day).toBe("Day 2");
    expect(entry.date).toBe("2026-09-08");
    expect(entry.week).toBe(1);
    expect(entry.pic).toBe("Jane");
    expect(entry.activityCount).toBe(1);
    expect(entry.notes).toBe("Remember 2FA");
  });

  it("edits diary entries updating additive fields while keeping other fields intact", () => {
    const original = createDiaryEntry(
      { content: "Old note", topic: "Old Topic", takeaways: ["Old 1", "Old 2", "Old 3"], pic: "Mentor A" },
      "2026-09-07T09:00:00.000Z",
    );
    const updated = editDiary([original], {
      id: original.id!,
      content: "New note",
      updatedAt: "2026-09-07T11:00:00.000Z",
      topic: "New Topic",
      takeaways: ["New 1", "New 2", "New 3"],
    });
    expect(updated[0].content).toBe("New note");
    expect(updated[0].topic).toBe("New Topic");
    expect(updated[0].takeaways).toEqual(["New 1", "New 2", "New 3"]);
    expect(updated[0].pic).toBe("Mentor A"); // preserved
  });

  describe("escapeTsvCell", () => {
    it("returns empty string for null and undefined", () => {
      expect(escapeTsvCell(undefined)).toBe('');
      expect(escapeTsvCell(null)).toBe('');
    });

    it("returns plain text untouched when no special characters are present", () => {
      expect(escapeTsvCell("Normal text 123")).toBe("Normal text 123");
    });

    it("quotes cells containing newlines", () => {
      expect(escapeTsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeTsvCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
    });

    it("quotes cells containing tabs", () => {
      expect(escapeTsvCell("Col A\tCol B")).toBe('"Col A\tCol B"');
    });

    it("escapes internal quotes by doubling them and wrapping in quotes", () => {
      expect(escapeTsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
    });

    it("handles combination of quotes, tabs, and newlines", () => {
      expect(escapeTsvCell('Line 1 with "quotes"\tand tab\nLine 2')).toBe(
        '"Line 1 with ""quotes""\tand tab\nLine 2"',
      );
    });
  });

  describe("formatTakeawaysForDiary", () => {
    it("returns empty string for undefined or empty list", () => {
      expect(formatTakeawaysForDiary(undefined)).toBe('');
      expect(formatTakeawaysForDiary([])).toBe('');
      expect(formatTakeawaysForDiary(['  ', ''])).toBe('');
    });

    it("formats 3 unnumbered items into 1., 2., 3.", () => {
      const result = formatTakeawaysForDiary([
        "First concept",
        "Second process",
        "Third application",
      ]);
      expect(result).toBe("1. First concept\n2. Second process\n3. Third application");
    });

    it("does not double-number items that are already numbered", () => {
      const result = formatTakeawaysForDiary([
        "1. First concept",
        "2) Second process",
        "3. Third application",
      ]);
      expect(result).toBe("1. First concept\n2) Second process\n3. Third application");
    });
  });

  describe("clipboardRowForDiary", () => {
    it("produces exact 9 columns in correct order for full entry", () => {
      const row = clipboardRowForDiary({
        day: "Day 1",
        week: 1,
        date: "2026-09-07",
        activityCount: 1,
        pic: "Arief",
        topic: "Architecture Overview",
        takeaways: [
          "Cockpit philosophy",
          "AI assistive rules",
          "Sheets source of truth",
        ],
        notes: "Follow up with mentor",
        itmNotes: "",
      });

      const cells = parseTsvRow(row);
      expect(cells).toHaveLength(9);
      expect(cells[0]).toBe("Day 1");
      expect(cells[1]).toBe("1");
      expect(cells[2]).toBe("2026-09-07");
      expect(cells[3]).toBe("1");
      expect(cells[4]).toBe("Arief");
      expect(cells[5]).toBe("Architecture Overview");
      expect(cells[6]).toBe(
        "1. Cockpit philosophy\n2. AI assistive rules\n3. Sheets source of truth",
      );
      expect(cells[7]).toBe("Follow up with mentor");
      expect(cells[8]).toBe("");
    });

    it("quotes column 7 when takeaways span multiple lines", () => {
      const row = clipboardRowForDiary({
        topic: "Security",
        takeaways: ["Point 1", "Point 2", "Point 3"],
      });
      expect(row.includes('"1. Point 1\n2. Point 2\n3. Point 3"')).toBe(true);
    });

    it("falls back to activityName when topic is missing", () => {
      const row = clipboardRowForDiary({
        activityName: "Git Setup",
      });
      const cells = parseTsvRow(row);
      expect(cells[5]).toBe("Git Setup");
    });

    it("falls back to content when takeaways are missing", () => {
      const row = clipboardRowForDiary({
        topic: "Legacy Session",
        content: "Raw reflection notes from yesterday",
      });
      const cells = parseTsvRow(row);
      expect(cells[6]).toBe("Raw reflection notes from yesterday");
    });

    it("handles special characters and quotes across multiple cells", () => {
      const row = clipboardRowForDiary({
        topic: 'Using "Git" & Bash',
        notes: 'Quote: "Done"\nNext line',
        takeaways: ['Learned about "rebase"'],
      });
      const cells = parseTsvRow(row);
      expect(cells[5]).toBe('Using "Git" & Bash');
      expect(cells[6]).toBe('1. Learned about "rebase"');
      expect(cells[7]).toBe('Quote: "Done"\nNext line');
    });

    it("produces exactly 8 tabs for empty input", () => {
      const row = clipboardRowForDiary({});
      expect(row).toBe('\t\t\t\t\t\t\t\t');
      const cells = parseTsvRow(row);
      expect(cells).toHaveLength(9);
      expect(cells.every((c) => c === '')).toBe(true);
    });
  });
});
