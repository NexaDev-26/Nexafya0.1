import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description?: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrlKey === undefined ? true : event.ctrlKey === shortcut.ctrlKey;
        const shiftMatch = shortcut.shiftKey === undefined ? true : event.shiftKey === shortcut.shiftKey;
        const altMatch = shortcut.altKey === undefined ? true : event.altKey === shortcut.altKey;
        const metaMatch = shortcut.metaKey === undefined ? true : event.metaKey === shortcut.metaKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
          event.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Common shortcuts helper
export const createCommonShortcuts = (
  onNavigate: (view: string) => void,
  onSearch?: () => void
): KeyboardShortcut[] => [
  {
    key: 'k',
    ctrlKey: true,
    action: () => onSearch?.(),
    description: 'Open search',
  },
  {
    key: 'd',
    ctrlKey: true,
    action: () => onNavigate('dashboard'),
    description: 'Go to dashboard',
  },
  {
    key: 'm',
    ctrlKey: true,
    action: () => onNavigate('messages'),
    description: 'Go to messages',
  },
  {
    key: 'p',
    ctrlKey: true,
    action: () => onNavigate('profile'),
    description: 'Go to profile',
  },
  {
    key: '/',
    action: () => onSearch?.(),
    description: 'Open search',
  },
];

