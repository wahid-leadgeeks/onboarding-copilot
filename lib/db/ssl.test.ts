import { resolveSslOption } from './ssl';
import * as dbModule from './index';

describe('resolveSslOption', () => {
  it('disables ssl when the url carries sslmode=disable', () => {
    expect(resolveSslOption('postgres://u:p@db.example.com:5432/app?sslmode=disable')).toBe(false);
  });

  it('disables ssl for localhost', () => {
    expect(resolveSslOption('postgres://u:p@localhost:5432/app')).toBe(false);
  });

  it('disables ssl for 127.0.0.1', () => {
    expect(resolveSslOption('postgres://postgres@127.0.0.1:54329/app')).toBe(false);
  });

  it("requires ssl for a remote host", () => {
    expect(resolveSslOption('postgres://u:p@db.example.com:5432/app')).toBe('require');
  });

  it("requires ssl for a remote host with other query params", () => {
    expect(resolveSslOption('postgresql://u:p@db.example.com/app?sslmode=require')).toBe('require');
  });

  it("requires ssl for an empty url", () => {
    expect(resolveSslOption('')).toBe('require');
  });

  it('lets sslmode=disable win on a remote host even when the query comes first', () => {
    expect(resolveSslOption('postgres://u@db.example.com/app?x=1&sslmode=disable')).toBe(false);
  });

  it('is re-exported unchanged from lib/db', () => {
    expect(dbModule.resolveSslOption).toBe(resolveSslOption);
  });
});
