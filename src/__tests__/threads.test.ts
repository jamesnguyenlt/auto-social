import { describe, it, expect } from 'vitest';

const FOLLOW_LABELS = [
  'follow', 'theo dõi', 'seguir', 'siguiente', 'follow back',
  '追随', 'theo'
];

const ALREADY_FOLLOWING_LABELS = [
  'following', 'đang theo dõi', 'requested', 'đã yêu cầu',
  'siguiendo', 'solicitado',
];

function isFollowButton(btn: Element): boolean {
  const aria = (btn as HTMLElement).getAttribute('aria-label') || '';
  const title = (btn as HTMLElement).getAttribute('title') || '';
  const text = (btn as HTMLElement).innerText?.trim() || (btn as HTMLElement).textContent?.trim() || '';
  
  const lowerAria = aria.toLowerCase().trim();
  const lowerTitle = title.toLowerCase().trim();
  const lowerText = text.toLowerCase().trim();

  // Quick exclusion for non-buttons to save CPU
  if (btn.tagName !== 'BUTTON' && btn.getAttribute('role') !== 'button') return false;

  // Exclude known non-follow buttons
  const excludeExact = ['avatar', 'like', 'thích', 'reply', 'trả lời', 'share',
    'repost', 'đăng lại', 'bookmark', 'save', 'more', 'xem thêm', 'close', 'đóng'];
  if (excludeExact.includes(lowerAria) || excludeExact.includes(lowerTitle)) return false;

  // Exclude "Following" / "Đang theo dõi" buttons (already followed)
  if (ALREADY_FOLLOWING_LABELS.some(l => lowerAria.includes(l) || lowerTitle.includes(l) || lowerText.includes(l))) return false;

  // Match follow labels in aria-label, title OR innerText
  return FOLLOW_LABELS.some(l => 
    lowerAria.includes(l) || lowerAria === l || 
    lowerTitle.includes(l) || lowerTitle === l ||
    lowerText === l || lowerText.includes(l)
  );
}

function createMockButton(attrs: { ariaLabel?: string; title?: string; text?: string; role?: string; tag?: string }): Element {
  // We don't have a real DOM, but we can mock enough for the test
  return {
    tagName: (attrs.tag || 'BUTTON').toUpperCase(),
    getAttribute: (attr: string) => {
      if (attr === 'aria-label') return attrs.ariaLabel || null;
      if (attr === 'title') return attrs.title || null;
      if (attr === 'role') return attrs.role !== undefined ? attrs.role : 'button';
      return null;
    },
    innerText: attrs.text || '',
    textContent: attrs.text || '',
  } as unknown as Element;
}

describe('Threads Content Script - isFollowButton', () => {
  it('identifies standard follow buttons', () => {
    expect(isFollowButton(createMockButton({ ariaLabel: 'Follow' }))).toBe(true);
    expect(isFollowButton(createMockButton({ text: 'Follow' }))).toBe(true);
    expect(isFollowButton(createMockButton({ ariaLabel: 'Follow user' }))).toBe(true);
  });

  it('identifies Vietnamese "Theo dõi" buttons', () => {
    // Exact match
    expect(isFollowButton(createMockButton({ ariaLabel: 'Theo dõi' }))).toBe(true);
    expect(isFollowButton(createMockButton({ text: 'Theo dõi' }))).toBe(true);
    // Substring match
    expect(isFollowButton(createMockButton({ ariaLabel: 'Theo dõi tunz.motion' }))).toBe(true);
    // Title attribute
    expect(isFollowButton(createMockButton({ title: 'Theo dõi' }))).toBe(true);
  });

  it('identifies buttons that only have an icon (empty text but valid aria/title)', () => {
    expect(isFollowButton(createMockButton({ ariaLabel: 'Follow', text: '' }))).toBe(true);
    expect(isFollowButton(createMockButton({ title: 'Theo dõi', text: '' }))).toBe(true);
  });

  it('rejects "Following" (already followed) buttons', () => {
    expect(isFollowButton(createMockButton({ ariaLabel: 'Following' }))).toBe(false);
    expect(isFollowButton(createMockButton({ text: 'Following' }))).toBe(false);
    expect(isFollowButton(createMockButton({ ariaLabel: 'Đang theo dõi' }))).toBe(false);
    expect(isFollowButton(createMockButton({ text: 'Đang theo dõi' }))).toBe(false);
    expect(isFollowButton(createMockButton({ ariaLabel: 'Đang theo dõi tunz.motion' }))).toBe(false);
  });

  it('rejects unrelated buttons', () => {
    expect(isFollowButton(createMockButton({ ariaLabel: 'Like' }))).toBe(false);
    expect(isFollowButton(createMockButton({ ariaLabel: 'Reply' }))).toBe(false);
    expect(isFollowButton(createMockButton({ ariaLabel: 'Thích' }))).toBe(false);
    expect(isFollowButton(createMockButton({ ariaLabel: 'Trả lời' }))).toBe(false);
    expect(isFollowButton(createMockButton({ ariaLabel: 'Share' }))).toBe(false);
    expect(isFollowButton(createMockButton({ ariaLabel: 'Avatar' }))).toBe(false);
    expect(isFollowButton(createMockButton({ ariaLabel: 'Close' }))).toBe(false);
  });

  it('rejects elements that are not buttons', () => {
    // If it's a <div> and doesn't have role="button", reject it
    expect(isFollowButton(createMockButton({ tag: 'DIV', role: '', ariaLabel: 'Follow' }))).toBe(false);
    // If it's a <div> but has role="button", accept it
    expect(isFollowButton(createMockButton({ tag: 'DIV', role: 'button', ariaLabel: 'Follow' }))).toBe(true);
  });
});
