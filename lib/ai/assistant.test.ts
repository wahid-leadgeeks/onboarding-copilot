import { extractReply, parseAssistantMessages, type AssistantMessage } from './assistant';

describe('assistant message validation', () => {
  it('accepts a valid message list', () => {
    const messages: AssistantMessage[] = [
      { role: 'user', content: 'How do I phrase a learning note?' },
      { role: 'assistant', content: 'Just write a few honest words.' },
      { role: 'user', content: 'Thanks!' },
    ];
    expect(parseAssistantMessages(messages)).toEqual(messages);
  });

  it('rejects non-array and empty input', () => {
    expect(parseAssistantMessages(null)).toBe(null);
    expect(parseAssistantMessages('hello')).toBe(null);
    expect(parseAssistantMessages({})).toBe(null);
    expect(parseAssistantMessages([])).toBe(null);
  });

  it('rejects invalid roles, empty or oversized content', () => {
    expect(parseAssistantMessages([{ role: 'system', content: 'hi' }])).toBe(null);
    expect(parseAssistantMessages([{ role: 'user', content: '' }])).toBe(null);
    expect(parseAssistantMessages([{ role: 'user', content: 42 }])).toBe(null);
    expect(parseAssistantMessages([{ role: 'user', content: 'x'.repeat(2001) }])).toBe(null);
  });

  it('rejects lists longer than 20 messages', () => {
    const tooLong = Array.from({ length: 21 }, (_, index) => ({ role: 'user' as const, content: `m${index}` }));
    expect(parseAssistantMessages(tooLong)).toBe(null);
  });
});

describe('assistant reply extraction', () => {
  it('extracts the assistant message content from a provider response', () => {
    const payload = { id: 'x', choices: [{ index: 0, message: { role: 'assistant', content: ' Hello ' }, finish_reason: 'stop' }] };
    expect(extractReply(payload)).toBe('Hello');
  });

  it('returns null for malformed provider payloads', () => {
    expect(extractReply(null)).toBe(null);
    expect(extractReply({})).toBe(null);
    expect(extractReply({ choices: [] })).toBe(null);
    expect(extractReply({ choices: [{}] })).toBe(null);
    expect(extractReply({ choices: [{ message: { content: 7 } }] })).toBe(null);
    expect(extractReply({ choices: [{ message: { content: '   ' } }] })).toBe(null);
    expect(extractReply({ choices: [{ message: null }] })).toBe(null);
  });
});
