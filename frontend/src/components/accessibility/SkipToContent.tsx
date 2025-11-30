'use client';

import React from 'react';

/**
 * Skip to Content Link
 * Allows keyboard users to skip navigation and jump directly to main content
 * WCAG 2.1 Level A requirement
 */
export const SkipToContent: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-red-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
};

/**
 * Screen Reader Only Text
 * Visually hidden but available to screen readers
 */
export const SROnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
};

/**
 * Live Region for Dynamic Content Announcements
 * Announces changes to screen readers
 */
interface LiveRegionProps {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({ 
  children, 
  politeness = 'polite',
  atomic = true 
}) => {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
};

/**
 * Focus Trap for Modals
 * Keeps keyboard focus within a modal dialog
 */
export const useFocusTrap = (isOpen: boolean) => {
  const focusTrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const element = focusTrapRef.current;
    if (!element) return;

    // Get all focusable elements
    const focusableElements = element.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen]);

  return focusTrapRef;
};

/**
 * Keyboard Navigation Hook
 * Handles keyboard navigation for custom components
 */
export const useKeyboardNavigation = (onEnter?: () => void, onEscape?: () => void) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
    if (e.key === 'Escape' && onEscape) {
      e.preventDefault();
      onEscape();
    }
  };

  return { onKeyDown: handleKeyDown };
};

/**
 * Announce to Screen Readers
 * Dynamically announces messages to screen readers
 */
export const useAnnouncer = () => {
  const [announcement, setAnnouncement] = React.useState('');

  const announce = (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement('');
    setTimeout(() => {
      setAnnouncement(message);
    }, 100);
  };

  const AnnouncerComponent = () => (
    <LiveRegion politeness={announcement ? 'assertive' : 'polite'}>
      {announcement}
    </LiveRegion>
  );

  return { announce, AnnouncerComponent };
};

export default {
  SkipToContent,
  SROnly,
  LiveRegion,
  useFocusTrap,
  useKeyboardNavigation,
  useAnnouncer,
};
