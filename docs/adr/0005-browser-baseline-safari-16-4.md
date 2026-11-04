# Browser baseline: Safari 16.4+, not Safari 15

We originally aimed for Safari 15 to cover older iPads, but the chosen stack sets the floor: both Next.js 16 and Tailwind CSS v4 officially support Safari 16.4+ / Chrome 111+ (Tailwind v4 relies on cascade layers, `@property` and `color-mix()`). We kept the stack and accepted the floor. iPadOS 16.4 runs on every iPad from the 5th generation (2017) onward, so only iPads stuck on iPadOS 15 (iPad Air 2, mini 4 and older) are excluded. Supporting them would mean going back to Tailwind v3 and adding polyfills.
