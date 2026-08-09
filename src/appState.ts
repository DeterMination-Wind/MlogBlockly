export type LogicLinksListener = (links: string[]) => void;

const storageKey = 'mlogBlocklyLogicLinks';
const defaultLinks = ['switch1', 'message1', 'cell1', 'bank1', 'display1', 'turret1'];

const listeners = new Set<LogicLinksListener>();

const normalizeLink = (raw: string): string | null => {
  const normalized = raw.trim().replace(/^@+/, '').replace(/\s+/g, '_');
  return normalized ? normalized : null;
};

const parseLinksText = (text: string): string[] => {
  const seen = new Set<string>();
  const links: string[] = [];

  text
    .split(/[\r\n,;]+/)
    .map(normalizeLink)
    .filter((value): value is string => !!value)
    .forEach((value) => {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
      links.push(value);
    });

  return links;
};

const loadInitialLinks = () => {
  const stored = window.localStorage?.getItem(storageKey);
  if (!stored) {
    return [...defaultLinks];
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parseLinksText(parsed.join('\n'));
    }
  } catch {
    return parseLinksText(stored);
  }

  return [];
};

let logicLinks = loadInitialLinks();

const notify = () => {
  const snapshot = [...logicLinks];
  listeners.forEach((listener) => listener(snapshot));
};

export const getLogicLinks = () => [...logicLinks];

export const getLogicLinksText = () => logicLinks.join('\n');

export const setLogicLinksFromText = (text: string) => {
  logicLinks = parseLinksText(text);
  window.localStorage?.setItem(storageKey, JSON.stringify(logicLinks));
  notify();
};

export const resetLogicLinks = () => {
  logicLinks = [...defaultLinks];
  window.localStorage?.setItem(storageKey, JSON.stringify(logicLinks));
  notify();
};

export const subscribeLogicLinks = (listener: LogicLinksListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
