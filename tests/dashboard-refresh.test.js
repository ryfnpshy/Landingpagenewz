// Dashboard Auto-Refresh Tests
// Tests for: refreshData, cache-busting, JSONP cleanup, setInterval, smooth transitions
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ============================================================
// Test helpers — simulate the dashboard's refresh logic in isolation
// ============================================================

/**
 * Simulates the buildGvizUrl cache-busting logic.
 * Each call must produce a URL with a unique _cb parameter.
 */
function buildGvizUrl(baseUrl) {
    return `${baseUrl}&_cb=${Date.now()}`;
}

/**
 * Simulates the dashboard refresh state machine.
 */
function createDashboardRefreshState() {
    let isRefreshing = false;
    let allRows = [];
    let jsonpCounter = 0;
    let refreshTimer = null;
    let refreshUIActive = false;
    let contentDimmed = false;
    let cleanupCallCount = 0;
    let fetchCallCount = 0;
    let renderCallCount = 0;

    return {
        get isRefreshing() { return isRefreshing; },
        get allRows() { return allRows; },
        get jsonpCounter() { return jsonpCounter; },
        get refreshTimer() { return refreshTimer; },
        get refreshUIActive() { return refreshUIActive; },
        get contentDimmed() { return contentDimmed; },
        get cleanupCallCount() { return cleanupCallCount; },
        get fetchCallCount() { return fetchCallCount; },
        get renderCallCount() { return renderCallCount; },

        setRefreshUI(active) {
            refreshUIActive = active;
        },

        cleanupJsonpScripts() {
            cleanupCallCount++;
        },

        refreshData() {
            if (isRefreshing) return false; // rejected
            isRefreshing = true;
            contentDimmed = true;
            refreshUIActive = true;

            // Simulate _fetchFromSheet
            this.cleanupJsonpScripts();
            jsonpCounter++;
            fetchCallCount++;
            return true; // accepted
        },

        onFetchDone(success, newRows = null) {
            if (success && newRows) {
                const hasChanged = newRows.length !== allRows.length ||
                    JSON.stringify(newRows) !== JSON.stringify(allRows);

                allRows = newRows;

                if (hasChanged) {
                    renderCallCount++;
                }
            }

            contentDimmed = false;
            refreshUIActive = false;
            isRefreshing = false;
        },

        startAutoRefresh(intervalMs) {
            this.stopAutoRefresh();
            refreshTimer = setInterval(() => this.refreshData(), intervalMs);
        },

        stopAutoRefresh() {
            if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        },

        setRows(rows) {
            allRows = rows;
        }
    };
}


// ============================================================
// Property 1: Cache-busting — every buildGvizUrl call is unique
// ============================================================
describe('Property 1: Cache-busting URL uniqueness', () => {
    it('two calls to buildGvizUrl produce different _cb parameters', () => {
        fc.assert(
            fc.property(
                fc.webUrl(),
                (base) => {
                    const url1 = buildGvizUrl(base);
                    // Ensure at least 1ms difference
                    const start = Date.now();
                    while (Date.now() === start) { /* busy wait 1ms */ }
                    const url2 = buildGvizUrl(base);

                    // Both URLs should contain _cb=
                    expect(url1).toContain('_cb=');
                    expect(url2).toContain('_cb=');

                    // The _cb values should differ
                    const cb1 = url1.split('_cb=')[1];
                    const cb2 = url2.split('_cb=')[1];
                    expect(cb1).not.toBe(cb2);
                }
            ),
            { numRuns: 10 } // limited to avoid slow busy-waits
        );
    });

    it('_cb parameter is a valid numeric timestamp', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(
                    'https://docs.google.com/spreadsheets/d/SHEET/gviz/tq?tqx=out:json',
                    'https://example.com/data?format=json'
                ),
                (base) => {
                    const url = buildGvizUrl(base);
                    const cb = url.split('_cb=')[1];
                    const num = Number(cb);

                    expect(Number.isNaN(num)).toBe(false);
                    expect(num).toBeGreaterThan(0);
                    // Should be a reasonable Unix timestamp in milliseconds
                    expect(num).toBeGreaterThan(1600000000000);
                }
            ),
            { numRuns: 20 }
        );
    });
});


// ============================================================
// Property 2: Concurrent refresh guard
// ============================================================
describe('Property 2: Concurrent refresh prevention', () => {
    it('refreshData rejects if already refreshing', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10 }),
                (extraCalls) => {
                    const dash = createDashboardRefreshState();

                    // First call should succeed
                    const first = dash.refreshData();
                    expect(first).toBe(true);
                    expect(dash.isRefreshing).toBe(true);

                    // All subsequent calls while refreshing should be rejected
                    for (let i = 0; i < extraCalls; i++) {
                        const result = dash.refreshData();
                        expect(result).toBe(false);
                    }

                    // fetchCallCount should be exactly 1
                    expect(dash.fetchCallCount).toBe(1);
                }
            ),
            { numRuns: 50 }
        );
    });

    it('refreshData succeeds again after onFetchDone', () => {
        const dash = createDashboardRefreshState();

        expect(dash.refreshData()).toBe(true);
        expect(dash.isRefreshing).toBe(true);

        dash.onFetchDone(true, [{ id: 1 }]);
        expect(dash.isRefreshing).toBe(false);

        // Should be able to refresh again
        expect(dash.refreshData()).toBe(true);
        expect(dash.fetchCallCount).toBe(2);
    });
});


// ============================================================
// Property 3: JSONP script cleanup happens before every fetch
// ============================================================
describe('Property 3: JSONP script cleanup on every fetch', () => {
    it('cleanupJsonpScripts is called exactly once per refreshData call', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 20 }),
                (refreshCount) => {
                    const dash = createDashboardRefreshState();

                    for (let i = 0; i < refreshCount; i++) {
                        dash.refreshData();
                        dash.onFetchDone(true, [{ id: i }]);
                    }

                    expect(dash.cleanupCallCount).toBe(refreshCount);
                }
            ),
            { numRuns: 50 }
        );
    });
});


// ============================================================
// Property 4: JSONP callback counter always increments
// ============================================================
describe('Property 4: JSONP callback counter monotonically increases', () => {
    it('each refreshData call increments jsonpCounter by 1', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 50 }),
                (n) => {
                    const dash = createDashboardRefreshState();
                    const counters = [];

                    for (let i = 0; i < n; i++) {
                        dash.refreshData();
                        counters.push(dash.jsonpCounter);
                        dash.onFetchDone(true, []);
                    }

                    // Counters should be strictly increasing
                    for (let i = 1; i < counters.length; i++) {
                        expect(counters[i]).toBe(counters[i - 1] + 1);
                    }
                    expect(counters[counters.length - 1]).toBe(n);
                }
            ),
            { numRuns: 50 }
        );
    });
});


// ============================================================
// Property 5: Refresh UI state consistency
// ============================================================
describe('Property 5: Refresh UI reflects isRefreshing state', () => {
    it('refreshUIActive and contentDimmed are true during refresh, false after', () => {
        fc.assert(
            fc.property(
                fc.boolean(), // success
                fc.array(fc.record({ id: fc.integer() }), { minLength: 0, maxLength: 5 }),
                (success, newRows) => {
                    const dash = createDashboardRefreshState();

                    // Before refresh
                    expect(dash.refreshUIActive).toBe(false);
                    expect(dash.contentDimmed).toBe(false);

                    // During refresh
                    dash.refreshData();
                    expect(dash.refreshUIActive).toBe(true);
                    expect(dash.contentDimmed).toBe(true);

                    // After refresh done
                    dash.onFetchDone(success, success ? newRows : null);
                    expect(dash.refreshUIActive).toBe(false);
                    expect(dash.contentDimmed).toBe(false);
                    expect(dash.isRefreshing).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });
});


// ============================================================
// Property 6: Change detection — only re-renders when data differs
// ============================================================
describe('Property 6: Change detection skips render when data is identical', () => {
    it('re-renders only when newRows differ from allRows', () => {
        fc.assert(
            fc.property(
                fc.array(fc.record({ id: fc.integer(), name: fc.string() }), { minLength: 0, maxLength: 10 }),
                fc.boolean(),
                (rows, shouldChange) => {
                    const dash = createDashboardRefreshState();
                    dash.setRows([...rows]);

                    const renderBefore = dash.renderCallCount;

                    dash.refreshData();

                    if (shouldChange && rows.length > 0) {
                        // Modified data — add an element
                        const modified = [...rows, { id: 999, name: 'new' }];
                        dash.onFetchDone(true, modified);
                        expect(dash.renderCallCount).toBe(renderBefore + 1);
                    } else {
                        // Same data
                        dash.onFetchDone(true, [...rows]);
                        // render may or may not be called depending on stringify equality
                        // but if truly identical, renderCallCount should not increase
                        if (JSON.stringify(rows) === JSON.stringify([...rows])) {
                            expect(dash.renderCallCount).toBe(renderBefore);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});


// ============================================================
// Property 7: Auto-refresh timer lifecycle
// ============================================================
describe('Property 7: Auto-refresh timer start/stop lifecycle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('startAutoRefresh creates a timer that fires refreshData periodically', () => {
        const dash = createDashboardRefreshState();
        dash.startAutoRefresh(5000);

        expect(dash.refreshTimer).not.toBeNull();

        // Advance time — each tick should trigger a refreshData call
        // But each call locks the mutex, so we need to complete each fetch
        vi.advanceTimersByTime(5000);
        expect(dash.fetchCallCount).toBe(1);
        dash.onFetchDone(true, []);

        vi.advanceTimersByTime(5000);
        expect(dash.fetchCallCount).toBe(2);
        dash.onFetchDone(true, []);

        dash.stopAutoRefresh();
    });

    it('stopAutoRefresh clears the timer', () => {
        const dash = createDashboardRefreshState();
        dash.startAutoRefresh(1000);
        expect(dash.refreshTimer).not.toBeNull();

        dash.stopAutoRefresh();
        expect(dash.refreshTimer).toBeNull();

        // No more fetches should happen
        vi.advanceTimersByTime(5000);
        expect(dash.fetchCallCount).toBe(0);
    });

    it('calling startAutoRefresh again replaces the old timer (no duplicates)', () => {
        const dash = createDashboardRefreshState();
        dash.startAutoRefresh(2000);
        const timer1 = dash.refreshTimer;

        dash.startAutoRefresh(3000);
        const timer2 = dash.refreshTimer;

        // Should be different timers
        expect(timer2).not.toBe(timer1);

        // Only the new timer should work
        vi.advanceTimersByTime(3000);
        expect(dash.fetchCallCount).toBe(1);

        dash.stopAutoRefresh();
    });
});


// ============================================================
// Property 8: Visibility API behavior simulation
// ============================================================
describe('Property 8: Visibility-based auto-refresh control', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('hiding the tab stops auto-refresh, showing it restarts', () => {
        const dash = createDashboardRefreshState();

        // Tab visible → start
        dash.startAutoRefresh(5000);
        expect(dash.refreshTimer).not.toBeNull();

        // Tab hidden → stop
        dash.stopAutoRefresh();
        expect(dash.refreshTimer).toBeNull();

        // No fetches fire while stopped
        vi.advanceTimersByTime(15000);
        expect(dash.fetchCallCount).toBe(0);

        // Tab visible again → immediate refresh + restart
        dash.refreshData();
        dash.onFetchDone(true, []);
        dash.startAutoRefresh(5000);

        expect(dash.refreshTimer).not.toBeNull();
        // The immediate refresh was call #1
        expect(dash.fetchCallCount).toBe(1);

        // Timer fires again
        vi.advanceTimersByTime(5000);
        expect(dash.fetchCallCount).toBe(2);

        dash.stopAutoRefresh();
    });
});


// ============================================================
// Property 9: Failure handling doesn't break state
// ============================================================
describe('Property 9: Failed refresh resets state correctly', () => {
    it('onFetchDone(false) resets isRefreshing and UI, preserving existing data', () => {
        fc.assert(
            fc.property(
                fc.array(fc.record({ id: fc.integer() }), { minLength: 1, maxLength: 10 }),
                (existingRows) => {
                    const dash = createDashboardRefreshState();
                    dash.setRows(existingRows);
                    const rowsBefore = dash.allRows;

                    dash.refreshData();
                    dash.onFetchDone(false);

                    // State should be reset
                    expect(dash.isRefreshing).toBe(false);
                    expect(dash.refreshUIActive).toBe(false);
                    expect(dash.contentDimmed).toBe(false);

                    // Existing data should be preserved
                    expect(dash.allRows).toBe(rowsBefore);
                }
            ),
            { numRuns: 100 }
        );
    });
});


// ============================================================
// Property 10: Full refresh cycle round-trip
// ============================================================
describe('Property 10: Full refresh cycle round-trip', () => {
    it('a complete refresh cycle leaves the system in a clean state', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10 }),
                fc.array(fc.record({ id: fc.integer(), name: fc.string() }), { minLength: 1, maxLength: 5 }),
                (cycles, baseRows) => {
                    const dash = createDashboardRefreshState();

                    for (let i = 0; i < cycles; i++) {
                        // Each cycle: refresh → fetch → done
                        const accepted = dash.refreshData();
                        expect(accepted).toBe(true);

                        // During refresh, everything should be in "loading" state
                        expect(dash.isRefreshing).toBe(true);
                        expect(dash.contentDimmed).toBe(true);
                        expect(dash.refreshUIActive).toBe(true);

                        // Complete with new data (append cycle index)
                        const newRows = [...baseRows, { id: 1000 + i, name: `cycle-${i}` }];
                        dash.onFetchDone(true, newRows);

                        // After done, everything should be clean
                        expect(dash.isRefreshing).toBe(false);
                        expect(dash.contentDimmed).toBe(false);
                        expect(dash.refreshUIActive).toBe(false);

                        // Data should be updated
                        expect(dash.allRows).toEqual(newRows);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });
});
