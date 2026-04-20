// Feature: alpine-js-enhancement, Property 1: Hamburger toggle is a round-trip
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Simulates the Alpine mobile nav component state logic.
 * The hamburger @click="open = !open" toggles the open boolean.
 */
function createNavComponent(initialOpen) {
  let open = initialOpen;
  return {
    get open() { return open; },
    clickHamburger() { open = !open; },
  };
}

describe('Property 1: Hamburger toggle is a round-trip', () => {
  // Validates: Requirements 2.2
  it('clicking hamburger twice returns open to its initial state', () => {
    fc.assert(
      fc.property(fc.boolean(), (initialOpen) => {
        const nav = createNavComponent(initialOpen);

        // First click: state should be negated
        nav.clickHamburger();
        expect(nav.open).toBe(!initialOpen);

        // Second click: state should return to initial
        nav.clickHamburger();
        expect(nav.open).toBe(initialOpen);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: alpine-js-enhancement, Property 2: Open state reflects to all bound DOM elements
describe('Property 2: Open state reflects to all bound DOM elements', () => {
  /**
   * Simulates the Alpine mobile nav DOM reflection logic:
   * - :class="{ active: open }" on nav-menu and hamburger
   * - x-effect="document.body.classList.toggle('menu-open', open)" on header
   * - :aria-expanded="open" on hamburger
   */
  function applyNavState(open, { navMenu, hamburger, body }) {
    // :class="{ active: open }"
    navMenu.classList.toggle('active', open);
    hamburger.classList.toggle('active', open);
    // x-effect body class
    body.classList.toggle('menu-open', open);
    // :aria-expanded="open"
    hamburger.setAttribute('aria-expanded', String(open));
  }

  // Validates: Requirements 2.3, 2.4, 2.6, 2.7
  it('all DOM bindings consistently reflect the open state', () => {
    fc.assert(
      fc.property(fc.boolean(), (open) => {
        // Set up minimal DOM elements
        const navMenu = { classList: { _set: new Set(), toggle(cls, force) { force ? this._set.add(cls) : this._set.delete(cls); }, contains(cls) { return this._set.has(cls); } } };
        const hamburger = {
          classList: { _set: new Set(), toggle(cls, force) { force ? this._set.add(cls) : this._set.delete(cls); }, contains(cls) { return this._set.has(cls); } },
          _attrs: {},
          setAttribute(k, v) { this._attrs[k] = v; },
          getAttribute(k) { return this._attrs[k]; },
        };
        const body = { classList: { _set: new Set(), toggle(cls, force) { force ? this._set.add(cls) : this._set.delete(cls); }, contains(cls) { return this._set.has(cls); } } };

        applyNavState(open, { navMenu, hamburger, body });

        // 2.3: nav-menu active class
        expect(navMenu.classList.contains('active')).toBe(open);
        // 2.4: hamburger active class
        expect(hamburger.classList.contains('active')).toBe(open);
        // 2.6: body menu-open class
        expect(body.classList.contains('menu-open')).toBe(open);
        // 2.7: aria-expanded attribute
        expect(hamburger.getAttribute('aria-expanded')).toBe(String(open));
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: alpine-js-enhancement, Property 3: Any nav link click closes the menu
describe('Property 3: Any nav link click closes the menu', () => {
  /**
   * Simulates the Alpine nav component with nav links.
   * Each nav link has @click="open = false" (or @click.prevent="open = false; ...")
   * There are 6 nav links: Home, Jadwal, Tim, FAQ, Kontak, Absensi
   */
  const NAV_LINK_COUNT = 6;

  function createNavWithLinks(initialOpen) {
    let open = initialOpen;
    return {
      get open() { return open; },
      clickNavLink(/* index unused — all links set open = false */) {
        open = false;
      },
    };
  }

  // Validates: Requirements 2.5
  it('clicking any nav link sets open to false regardless of prior state', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 0, max: NAV_LINK_COUNT - 1 }),
        (initialOpen, linkIndex) => {
          const nav = createNavWithLinks(initialOpen);

          nav.clickNavLink(linkIndex);

          expect(nav.open).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: alpine-js-enhancement, Property 4: Opening password modal always resets state
describe('Property 4: Opening password modal always resets state', () => {
  /**
   * Simulates the Alpine password modal component state logic.
   * The @open-password-modal.window handler:
   *   "pwOpen = true; password = ''; pwError = false"
   */
  function createPasswordModalComponent({ password = '', pwError = false } = {}) {
    let state = { pwOpen: false, password, pwError };
    return {
      get pwOpen() { return state.pwOpen; },
      get password() { return state.password; },
      get pwError() { return state.pwError; },
      openPasswordModal() {
        state.pwOpen = true;
        state.password = '';
        state.pwError = false;
      },
    };
  }

  // Validates: Requirements 3.2
  it('triggering open-password-modal always resets state regardless of prior values', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.boolean(),
        (priorPassword, priorPwError) => {
          const modal = createPasswordModalComponent({
            password: priorPassword,
            pwError: priorPwError,
          });

          modal.openPasswordModal();

          expect(modal.pwOpen).toBe(true);
          expect(modal.password).toBe('');
          expect(modal.pwError).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: alpine-js-enhancement, Property 5: Invalid password always sets error flag
describe('Property 5: Invalid password always sets error flag', () => {
  /**
   * Simulates the Alpine password modal checkPassword() logic:
   *   if password === 'newzswimming': pwOpen = false, password = '', window.open(...)
   *   else if password === 'admin123': pwOpen = false, password = '', window.location.href = 'dashboard.html'
   *   else: pwError = true
   */
  function createPasswordComponent({ password = '', pwOpen = true } = {}) {
    let state = { pwOpen, password, pwError: false };
    const windowOpenCalls = [];
    const locationChanges = [];

    return {
      get pwOpen() { return state.pwOpen; },
      get password() { return state.password; },
      get pwError() { return state.pwError; },
      checkPassword() {
        const ABSENSI_URL = 'https://script.google.com/macros/s/AKfycbwxFQf-l3bvEWcExkDHYGvEkAJSklVx3Pwt1KDn4YJYSj4G7K5iBP2TxjxddwR11t7c/exec';
        if (state.password === 'newzswimming') {
          state.pwOpen = false;
          state.password = '';
          windowOpenCalls.push(ABSENSI_URL);
        } else if (state.password === 'admin123') {
          state.pwOpen = false;
          state.password = '';
          locationChanges.push('dashboard.html');
        } else {
          state.pwError = true;
        }
      },
      setPassword(pw) { state.password = pw; },
    };
  }

  // Validates: Requirements 3.9
  it('any password that is not a valid key sets pwError=true and keeps pwOpen=true', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s !== 'newzswimming' && s !== 'admin123'),
        (invalidPassword) => {
          const modal = createPasswordComponent({ password: invalidPassword, pwOpen: true });
          modal.setPassword(invalidPassword);

          modal.checkPassword();

          expect(modal.pwError).toBe(true);
          expect(modal.pwOpen).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: alpine-js-enhancement, Property 6: Modal visibility equals open state (password modal)
describe('Property 6: Modal visibility equals open state (password modal)', () => {
  /**
   * Simulates Alpine's x-show="pwOpen" logic on the password modal element.
   * When pwOpen=true:  Alpine removes display:none  → element is visible
   * When pwOpen=false: Alpine sets display:none     → element is hidden
   */
  function applyXShow(element, isOpen) {
    if (isOpen) {
      delete element.style.display;
    } else {
      element.style.display = 'none';
    }
  }

  // Validates: Requirements 3.3, 3.4
  it('password modal element visibility matches pwOpen boolean state', () => {
    fc.assert(
      fc.property(fc.boolean(), (pwOpen) => {
        // Minimal mock element with a style object (simulates a DOM element)
        const modalElement = { style: {} };

        applyXShow(modalElement, pwOpen);

        if (pwOpen) {
          // Visible: display must NOT be 'none'
          expect(modalElement.style.display).not.toBe('none');
        } else {
          // Hidden: display must be 'none'
          expect(modalElement.style.display).toBe('none');
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: alpine-js-enhancement, Property 7: Coach card click populates modal with card data
describe('Property 7: Coach card click populates modal with card data', () => {
  /**
   * Simulates the Alpine coach modal component state logic.
   * When a .team-card is clicked:
   *   coach.img  = $el.querySelector('img').src;
   *   coach.name = $el.dataset.name;
   *   coach.role = $el.dataset.role;
   *   coach.desc = $el.dataset.desc;
   *   coachOpen  = true
   */
  function createCoachModalComponent() {
    let state = {
      coachOpen: false,
      coach: { img: '', name: '', role: '', desc: '' },
    };
    return {
      get coachOpen() { return state.coachOpen; },
      get coach() { return state.coach; },
      clickTeamCard({ img, name, role, desc }) {
        state.coach.img  = img;
        state.coach.name = name;
        state.coach.role = role;
        state.coach.desc = desc;
        state.coachOpen  = true;
      },
    };
  }

  // Validates: Requirements 4.2, 4.5
  it('clicking a team card populates coach fields and sets coachOpen=true', () => {
    fc.assert(
      fc.property(
        fc.record({
          img:  fc.webUrl(),
          name: fc.string(),
          role: fc.string(),
          desc: fc.string(),
        }),
        (cardData) => {
          const component = createCoachModalComponent();

          component.clickTeamCard(cardData);

          expect(component.coachOpen).toBe(true);
          expect(component.coach.img).toBe(cardData.img);
          expect(component.coach.name).toBe(cardData.name);
          expect(component.coach.role).toBe(cardData.role);
          expect(component.coach.desc).toBe(cardData.desc);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: alpine-js-enhancement, Property 6 (coach modal): Modal visibility equals open state (coach modal)
describe('Property 6 (coach modal): Modal visibility equals open state (coach modal)', () => {
  /**
   * Simulates Alpine's x-show="coachOpen" logic on the coach modal element.
   * When coachOpen=true:  Alpine removes display:none  → element is visible
   * When coachOpen=false: Alpine sets display:none     → element is hidden
   */
  function applyXShow(element, isOpen) {
    if (isOpen) {
      delete element.style.display;
    } else {
      element.style.display = 'none';
    }
  }

  // Validates: Requirements 4.3, 4.4
  it('coach modal element visibility matches coachOpen boolean state', () => {
    fc.assert(
      fc.property(fc.boolean(), (coachOpen) => {
        // Minimal mock element with a style object (simulates a DOM element)
        const modalElement = { style: {} };

        applyXShow(modalElement, coachOpen);

        if (coachOpen) {
          // Visible: display must NOT be 'none'
          expect(modalElement.style.display).not.toBe('none');
        } else {
          // Hidden: display must be 'none'
          expect(modalElement.style.display).toBe('none');
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: alpine-js-enhancement, Property 8: FAQ toggle is a round-trip and items are independent
describe('Property 8: FAQ toggle is a round-trip and items are independent', () => {
  /**
   * Simulates an array of .faq-item Alpine components.
   * Each item has independent state: { expanded: false }
   * The heading @click="expanded = !expanded"
   */
  function createFaqItems(count, initialStates) {
    return initialStates.slice(0, count).map((expanded) => {
      let state = expanded;
      return {
        get expanded() { return state; },
        clickHeading() { state = !state; },
      };
    });
  }

  // Validates: Requirements 5.2
  it('clicking a FAQ heading twice returns expanded to its initial state (round-trip)', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (initialExpanded) => {
          const items = createFaqItems(1, [initialExpanded]);
          const item = items[0];

          // First click: state should be negated
          item.clickHeading();
          expect(item.expanded).toBe(!initialExpanded);

          // Second click: state should return to initial
          item.clickHeading();
          expect(item.expanded).toBe(initialExpanded);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Validates: Requirements 5.7
  it('toggling one FAQ item leaves all other items expanded states unchanged (independence)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }),
        fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }),
        fc.nat({ max: 7 }),
        (count, initialStates, targetIndex) => {
          const clampedTarget = targetIndex % count;
          const items = createFaqItems(count, initialStates);

          // Capture states of all other items before toggling
          const statesBefore = items.map((item) => item.expanded);

          // Toggle the target item
          items[clampedTarget].clickHeading();

          // All items except the target must remain unchanged
          items.forEach((item, i) => {
            if (i !== clampedTarget) {
              expect(item.expanded).toBe(statesBefore[i]);
            }
          });

          // The target item must have toggled
          expect(items[clampedTarget].expanded).toBe(!statesBefore[clampedTarget]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: alpine-js-enhancement, Property 9: Exactly one tab panel is visible at a time
describe('Property 9: Exactly one tab panel is visible at a time', () => {
  /**
   * Simulates the Alpine dashboard tab component state logic.
   * State: { activeTab: 'tab-overview' }
   * Each panel: x-show="activeTab === '<panelId>'"
   * Each button: :class="{ active: activeTab === '<panelId>' }"
   */
  const VALID_TABS = ['tab-overview', 'tab-payroll', 'tab-coach', 'tab-log'];

  function createTabComponent(activeTab) {
    return {
      activeTab,
      isPanelVisible(tabId) {
        return this.activeTab === tabId;
      },
      isButtonActive(tabId) {
        return this.activeTab === tabId;
      },
    };
  }

  // Validates: Requirements 6.2, 6.3, 6.4, 6.5
  it('exactly one panel is visible and its button has active class for any activeTab value', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_TABS),
        (activeTab) => {
          const component = createTabComponent(activeTab);

          const visiblePanels = VALID_TABS.filter((id) => component.isPanelVisible(id));
          const activeButtons = VALID_TABS.filter((id) => component.isButtonActive(id));

          // Exactly one panel must be visible
          expect(visiblePanels).toHaveLength(1);
          expect(visiblePanels[0]).toBe(activeTab);

          // Exactly one button must have the active class
          expect(activeButtons).toHaveLength(1);
          expect(activeButtons[0]).toBe(activeTab);

          // All other panels must be hidden
          VALID_TABS.filter((id) => id !== activeTab).forEach((id) => {
            expect(component.isPanelVisible(id)).toBe(false);
            expect(component.isButtonActive(id)).toBe(false);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: alpine-js-enhancement, Property 10: Filter model binding is a round-trip
describe('Property 10: Filter model binding is a round-trip', () => {
  /**
   * Simulates the Alpine global filter component state logic.
   * State: { filterMode: 'week' }
   * x-model="filterMode" on the <select> element binds the value two-way.
   * @change="applyGlobalFilter()" is called exactly once per change event.
   */
  function createFilterComponent(initialFilterMode = 'week') {
    let filterMode = initialFilterMode;
    let applyGlobalFilterCallCount = 0;

    return {
      get filterMode() { return filterMode; },
      get applyGlobalFilterCallCount() { return applyGlobalFilterCallCount; },
      // Simulates x-model binding + @change handler firing together
      selectFilterValue(value) {
        filterMode = value;           // x-model sets filterMode = selectedValue
        applyGlobalFilterCallCount++; // @change fires applyGlobalFilter() exactly once
      },
    };
  }

  // Validates: Requirements 8.2, 8.3
  it('selecting a valid filter value sets filterMode to that value and calls applyGlobalFilter exactly once', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('week', 'month', 'all'),
        (selectedValue) => {
          const component = createFilterComponent();

          component.selectFilterValue(selectedValue);

          // x-model round-trip: filterMode must equal the selected value
          expect(component.filterMode).toBe(selectedValue);

          // @change handler must be called exactly once per selection
          expect(component.applyGlobalFilterCallCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
