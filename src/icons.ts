const svg = (content: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${content}</svg>`;

export const bearIcon = svg(
  '<circle cx="8" cy="7" r="2.6"/><circle cx="16" cy="7" r="2.6"/><path d="M5.2 12c0-4 3-7 6.8-7s6.8 3 6.8 7c0 4.4-3.2 7.6-6.8 7.6S5.2 16.4 5.2 12Z"/><circle cx="9.6" cy="11.4" r=".8" fill="currentColor"/><circle cx="14.4" cy="11.4" r=".8" fill="currentColor"/><path d="M12 13.2c.9 0 1.5.5 1.5 1.2 0 .9-1 1.5-1.5 1.5s-1.5-.6-1.5-1.5c0-.7.6-1.2 1.5-1.2Z"/>',
);

export const lockIcon = svg(
  '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/>',
);

export const trophyIcon = svg(
  '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5H4.8a.8.8 0 0 0-.8.9A4.6 4.6 0 0 0 8 10M16 5h3.2a.8.8 0 0 1 .8.9A4.6 4.6 0 0 1 16 10"/><path d="M12 13v3"/><path d="M9 19.5h6"/><path d="M10.5 16h3"/>',
);

export const targetIcon = svg(
  '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
);

export const hintIcon = svg(
  '<path d="M12 3a6 6 0 0 0-4 10.4c.8.8 1.4 1.8 1.6 2.9.1.4.4.7.8.7h3.2c.4 0 .7-.3.8-.7.2-1.1.8-2.1 1.6-2.9A6 6 0 0 0 12 3Z"/><path d="M10 20h4"/>',
);

export const shuffleIcon = svg(
  '<path d="M4 7h4l8 10h4"/><path d="M20 7h-4l-2.7 3.4"/><path d="M13.3 13.6 16 17h4"/><path d="M17 4.5 20 7l-3 2.5"/><path d="M17 14.5 20 17l-3 2.5"/>',
);

export const checkIcon = svg(
  '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
);

export const keyboardIcon = svg(
  '<rect x="3" y="6.5" width="18" height="11" rx="2"/><path d="M7 10.5h.01M11 10.5h.01M15 10.5h.01M17.5 14h.01M6.5 14h.01M9 14h6"/>',
);

export const eyeIcon = svg(
  '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
);

export const banIcon = svg(
  '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
);
