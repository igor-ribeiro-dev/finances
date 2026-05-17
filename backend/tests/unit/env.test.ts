// Isolation: This test file has no dependency on the frontend/ directory.
import { validateEnv } from '../../src/env';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('does not exit when all required vars are present', () => {
    process.env.PORT = '3001';
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    validateEnv(['PORT']);
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('exits with code 1 when a required var is missing', () => {
    delete process.env.PORT;
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    validateEnv(['PORT']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('lists all missing var names in the error output', () => {
    delete process.env.PORT;
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    validateEnv(['PORT']);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('PORT'));
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('lists multiple missing vars when several are absent', () => {
    delete process.env.PORT;
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    validateEnv(['PORT', 'MISSING_TWO']);
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('PORT');
    expect(output).toContain('MISSING_TWO');
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });
});
