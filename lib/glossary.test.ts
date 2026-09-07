import { OFFICIAL_TRAINING_MODULES, OFFICIAL_SHEET_GUIDES } from './glossary';

describe('Glossaries and Guide sheet data', () => {
  it('contains mandatory training modules from Glossaries worksheet', () => {
    expect(OFFICIAL_TRAINING_MODULES.length).toBeGreaterThanOrEqual(15);
    const ceo = OFFICIAL_TRAINING_MODULES.find((m) => m.pic === 'CEO');
    expect(ceo).toBeDefined();
    expect(ceo?.topic).toContain('Welcoming Message');
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
