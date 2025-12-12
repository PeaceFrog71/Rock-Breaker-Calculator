# Active Module Stacking Test Procedure

**Issue:** #27 - Verify active module stacking behavior
**Goal:** Determine which active modules can be used together and how they interact

---

## Equipment Setup

### Required Ship

- [ ] MISC Prospector or Argo MOLE (any mining ship with module slots)

### Required Modules

You'll need these active modules for testing:

- [ ] **Sustained modules (pick 2):** Rime, Brandt, Forel, Lifeline, Optimum, or Torpid
- [ ] **Potential instant modules:** Surge, Stampede

### Recommended Loadouts

**Test Loadout A** (2-slot laser like Helix I):

- [ ] Slot 1: Rime (sustained)
- [ ] Slot 2: Surge (potential instant)

**Test Loadout B** (2-slot laser):

- [ ] Slot 1: Rime (sustained)
- [ ] Slot 2: Stampede (potential instant)

**Test Loadout C** (3-slot laser like Helix II):

- [ ] Slot 1: Surge
- [ ] Slot 2: Stampede
- [ ] Slot 3: Rime

**Test Loadout D** (2-slot laser):

- [ ] Slot 1: Rime (sustained)
- [ ] Slot 2: Brandt (sustained)

---

## Test Procedures

### Test 1: Sustained Module Replacement

**Question:** When one sustained module is active, what happens when you activate another sustained module?

**Setup:** Loadout D (Rime + Brandt)

**Steps:**

- [ ] Find a rock and start mining
- [ ] Activate **Rime** (note the visual effect and UI indicator)
- [ ] Wait 5 seconds to confirm Rime is active
- [ ] While Rime is still active, activate **Brandt**
- [ ] Observe what happens

**Record Results:**

- [ ] Brandt activates and Rime stops (replacement)
- [ ] Brandt fails to activate, Rime continues (blocked)
- [ ] Both appear to be active simultaneously (stacking)
- [ ] Other behavior: **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***

## **Notes:** Active modules can only be run one at a time. Starting a second active module will stop the running module and start the new module.

### Test 2: Surge with Active Sustained Module

**Question:** Can Surge fire while another active module is running?

**Setup:** Loadout A (Rime + Surge)

**Steps:**

- [ ] Find a rock and start mining
- [ ] Activate **Rime** (observe effect)
- [ ] Wait 5 seconds to confirm Rime is active
- [ ] While Rime is active, activate **Surge**
- [ ] Watch carefully for:
  - [ ] Power spike on the mining UI
  - [ ] Whether Rime effect stops or continues
  - [ ] Any visual/audio feedback from Surge

**Record Results:**

- [ ] Surge fires AND Rime stays active (Surge is instant/stackable)
- [ ] Surge fires AND Rime stops (Surge replaces)
- [ ] Surge fails to fire, Rime continues (Surge blocked)
- [ ] Other behavior: **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***

**If Surge fired, was it:**

- [ ] An instant spike then back to Rime effects
- [ ] A sustained 15s effect that replaced Rime

**Notes:** The surge module can run with other surge modules, up to 3, and any other module.

---

### Test 3: Stampede with Active Sustained Module

**Question:** Can Stampede fire while another active module is running?

**Setup:** Loadout B (Rime + Stampede)

**Steps:**

- [ ] Find a rock and start mining
- [ ] Activate **Rime** (observe effect)
- [ ] Wait 5 seconds to confirm Rime is active
- [ ] While Rime is active, activate **Stampede**
- [ ] Watch carefully for:
  - [ ] Power spike on the mining UI
  - [ ] Whether Rime effect stops or continues
  - [ ] Any visual/audio feedback from Stampede

**Record Results:**

- [ ] Stampede fires AND Rime stays active (Stampede is instant/stackable)
- [ ] Stampede fires AND Rime stops (Stampede replaces)
- [ ] Stampede fails to fire, Rime continues (Stampede blocked)
- [ ] Other behavior: **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***

**If Stampede fired, was it:**

- [ ] An instant spike then back to Rime effects
- [ ] A sustained 30s effect that replaced Rime

**Notes:** The Stampede is not instantaneous and can only be run with a Surge. Any other active module activation will deactivate the active Stampede.

---

### Test 4: Surge + Stampede Stacking

**Question:** If both Surge and Stampede are instant, can they both be activated?

**Setup:** Loadout C (Surge + Stampede + Rime) or a 2-slot with just Surge + Stampede

**Steps:**

- [x] Find a rock and start mining (NO active modules yet)
- [x] Note your baseline power output
- [x] Activate **Surge**
- [x] Immediately (within 1-2 seconds) activate **Stampede**
- [x] Observe the power reading

**Record Results:**

- [x] Both fired - saw combined power boost higher than either alone
- [ ] Only one fired - the second was blocked
- [ ] Second one cancelled the first
- [ ] Other behavior: **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***

**Power Readings (if possible):**

- [ ] Baseline power: **\_\_\_**
- [ ] With Surge only: **\_\_\_**
- [ ] With Stampede only: **\_\_\_**
- [ ] With both (if stackable): **\_\_\_**

**Notes:** The Stampede can be used with up to two Surge modules but can not be used together with another Stampede or any other active surge modules.

---

### Test 5: Module Activation While No Module Active

**Question:** Baseline - confirm each module works when activated alone

**Setup:** Any loadout with multiple active modules

**Steps:**
For each active module you have equipped:

- [x] Start mining with NO active modules running
- [x] Activate the module
- [x] Confirm it works (visual effect, power change, etc.)
- [x] Wait for it to expire or stop mining
- [x] Repeat for next module

**Record which modules you confirmed work individually:**

- [x] Surge - works alone
- [x] Stampede - works alone
- [x] Rime - works alone
- [x] Brandt - works alone
- [x] Other: **\*\***\_**\*\*** - works alone

---

### Test 6: Cooldown Behavior

**Question:** After a module expires, is there a cooldown before activating another?

**Setup:** Any 2-slot loadout with two sustained modules

**Steps:**

- [x] Activate first module (e.g., Rime)
- [x] Let it run its full duration (20s for Rime)
- [x] Immediately try to activate second module (e.g., Brandt)
- [x] Note if there's any delay or cooldown

**Record Results:**

- [x] Second module activates immediately after first expires
- [ ] There's a cooldown period of approximately **\_0\_** seconds
- [ ] Other behavior: **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***

---

## Summary Table

Fill this out after completing all tests:

| Test | Question                                   | Result        |
| ---- | ------------------------------------------ | ------------- |
| 1    | Can two sustained modules run together?    | NO / REPLACES |
| 2    | Can Surge fire during sustained module?    | YES           |
| 3    | Can Stampede fire during sustained module? | NO / REPLACES |
| 4    | Can Surge + Stampede stack together?       | YES           |
| 5    | Do all modules work individually?          | YES           |
| 6    | Is there a cooldown between modules?       | NO            |

---

## Module Classification (Based on Results)

After testing, classify each module:

### Sustained Modules (only one at a time)

- [x] Brandt
- [x] Forel
- [ ] Lifeline (confirmed)
- [ ] Optimum
- [ ] Rime
- [ ] Stampede
- [ ] Surge
- [ ] Torpid

### Instant Modules (can stack with sustained)

- [x] Surge
- [ ] Stampede
- [ ] Other: **\*\***\_**\*\***

### Instant Modules (can stack with each other)

- [x] Surge + Stampede confirmed stackable
- [ ] Other combinations: Surge Surge Surge, Surge Surge, Surge Any Active, Any active on its own. All passives work with active.

---

## Notes Section

Use this space for any additional observations:

```
Date of testing: 12/12/2025
Game version: Star Citizen 4.4
Tester: Drew N

Additional notes:
_________________________________________________
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## After Testing

Once you have results, update Issue #27 with your findings and we can:

- [ ] Update the Module interface with `activationType` property
- [ ] Adjust calculator logic accordingly
- [ ] Add UI warnings for incompatible module combinations
