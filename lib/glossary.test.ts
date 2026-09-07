import {
  OFFICIAL_TRAINING_MODULES,
  OFFICIAL_SHEET_GUIDES,
  findTrainingModule,
  clipboardRowForModule,
} from './glossary';

describe('Glossaries and Guide sheet data', () => {
  it('contains mandatory training modules from Glossaries worksheet', () => {
    expect(OFFICIAL_TRAINING_MODULES.length).toBe(19);
    const ceo = OFFICIAL_TRAINING_MODULES.find((m) => m.pic === 'CEO');
    expect(ceo).toBeDefined();
    expect(ceo?.topic).toContain('Welcoming Message');
  });

  it('ensures all training modules have complete detail fields (objectives, materials, access, notes)', () => {
    for (const mod of OFFICIAL_TRAINING_MODULES) {
      expect(mod.id).toBeTruthy();
      expect(mod.topic).toBeTruthy();
      expect(mod.pic).toBeTruthy();
      expect(mod.objectives.length).toBeGreaterThan(0);
      expect(mod.frameworkMaterials.length).toBeGreaterThan(0);
      expect(mod.media.length).toBeGreaterThan(0);
      expect(mod.durationMinutes).toBeGreaterThan(0);
      expect(mod.materialAccess).toBeDefined();
    }
  });

  it('finds training modules by ID or topic', () => {
    const mod = findTrainingModule('mod-8');
    expect(mod).toBeDefined();
    expect(mod?.topic).toContain('IT Department Introduction');

    const byName = findTrainingModule('Company Policy');
    expect(byName).toBeDefined();
    expect(byName?.durationMinutes).toBe(60);
  });

  it('generates an 8-column TSV matching the Glossaries spreadsheet row', () => {
    const mod = OFFICIAL_TRAINING_MODULES[0];
    const tsv = clipboardRowForModule(mod);
    const cols = tsv.split('\t');
    expect(cols).toHaveLength(8);
    expect(cols[0]).toBe('CEO');
    expect(cols[1]).toContain('Welcoming Message');
    expect(cols[4]).toBe('Video');
    expect(cols[5]).toBe('3');
  });

  it('contains the 6 official sheet guides from Guide worksheet', () => {
    expect(OFFICIAL_SHEET_GUIDES).toHaveLength(6);
    const tabs = OFFICIAL_SHEET_GUIDES.map((g) => g.tabName);
    expect(tabs).toContain('Schedule');
    expect(tabs).toContain('Timeline');
    expect(tabs).toContain('Onboarding Diary');
    expect(tabs).toContain('Feedback Sheet');
    expect(tabs).toContain('1st to 3rd Month Review');
    expect(tabs).toContain('Glossaries');
  });
});

