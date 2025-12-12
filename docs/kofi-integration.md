# Ko-fi Button Integration - Implementation Notes

**Date:** December 2024
**Problem:** Integrate Ko-fi donation widget with custom styling that matches app theme

---

## The Challenge

Ko-fi's floating-chat widget renders inside an iframe, making it impossible to:
- Programmatically click the button (cross-origin security)
- Style the button directly (iframe isolation)
- Control when/how the popup appears

## The Solution: Overlay Technique

We use a **visual overlay** that sits on top of Ko-fi's invisible button. Clicks pass through our overlay to Ko-fi underneath.

### Key Concepts

1. **Our button has `pointer-events: none`** - clicks pass through to whatever is underneath
2. **Ko-fi's button is invisible but clickable** - using `opacity: 0` on button elements
3. **Ko-fi's container is stretched** - using `scaleX(1.65)` to make clickable area match our overlay
4. **Backgrounds are transparent** - to hide the white rectangle that appears on deployed site

---

## The Magic CSS

```css
/* Move Ko-fi's widget to lower left and stretch it */
.floatingchat-container-wrap,
.floatingchat-container-wrap-mobi,
[class*="floatingchat-container-wrap"] {
  bottom: 10px !important;
  top: auto !important;
  left: 10px !important;
  right: auto !important;
  transform: scaleX(1.65) !important;    /* KEY: stretch to match overlay width */
  transform-origin: left center !important;
}

/* Hide Ko-fi's button visually but keep it clickable */
.floatingchat-container-wrap,
.floatingchat-container-wrap-mobi,
[class*="floatingchat-container-wrap"],
.floatingchat-container-wrap > *,
.floatingchat-container-wrap-mobi > * {
  background: transparent !important;
  background-color: transparent !important;
}

.floatingchat-container-wrap > *:first-child,
.floatingchat-container-wrap button,
.floatingchat-container-wrap [class*="btn"],
.floatingchat-container-wrap-mobi > *:first-child,
.floatingchat-container-wrap-mobi button {
  opacity: 0 !important;    /* KEY: invisible but clickable */
}

/* Our styled overlay button */
.kofi-overlay-btn {
  position: fixed;
  bottom: 10px;
  left: 10px;
  /* ... styling ... */
  z-index: 2147483647 !important;    /* Max z-index to stay on top */
  pointer-events: none;               /* KEY: clicks pass through */
}
```

---

## Critical Values

| Value | Purpose |
|-------|---------|
| `scaleX(1.65)` | Stretches Ko-fi's clickable area to match our overlay width |
| `z-index: 2147483647` | Maximum integer - ensures our overlay stays on top of Ko-fi |
| `pointer-events: none` | Allows clicks to pass through to Ko-fi underneath |
| `opacity: 0` | Hides Ko-fi's button while keeping it clickable |
| `background: transparent` | Removes white rectangle that shows on deployed site |

---

## Gotchas & Lessons Learned

1. **`[class*="kofi"]` selector catches our button too!** - Our `.kofi-overlay-btn` class contains "kofi", so don't use that selector for hiding

2. **The white rectangle only shows on deployed site** - Not visible on localhost, so test on deployed site

3. **`overflow: hidden` breaks the popup** - Don't use it - it clips the Ko-fi popup modal

4. **`max-width`/`max-height` also break the popup** - Same issue - clips the expanded popup

5. **The scaleX value (1.65) was found through trial and error:**
   - 1.3 = ~80% clickable
   - 1.5 = ~90% clickable
   - 1.65 = full coverage without Ko-fi showing through
   - 1.8 = Ko-fi's green button "dribbles out" the right side

---

## File Locations

- **Ko-fi script & CSS:** `index.html` (in `<body>` after `#root`)
- **Overlay button HTML:** `index.html` (after styles)
- **Rieger icon:** `public/rieger-icon.png`

---

## Ko-fi Widget Configuration

```javascript
kofiWidgetOverlay.draw('peacefroggaming', {
  'type': 'floating-chat',
  'floating-chat.donateButton.text': 'Support',
  'floating-chat.donateButton.background-color': '#00ff88',
  'floating-chat.donateButton.text-color': '#0a0e27'
});
```

---

## If It Breaks Again

1. Check if Ko-fi changed their class names (inspect element on their button)
2. Verify the overlay z-index is still higher than Ko-fi's
3. Test scaleX value - Ko-fi may have changed button dimensions
4. Check for new wrapper elements that need transparent backgrounds
