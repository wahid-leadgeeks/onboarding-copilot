/**
 * SSL rule for postgres connections. Pure (no env, no I/O) so scripts can import it
 * without pulling in the app's database client.
 */
export function resolveSslOption(url: string): false | 'require' {
  return url.includes('sslmode=disable')
    ? false
    : url.includes('localhost') || url.includes('127.0.0.1')
    ? false
    : 'require';
}
