export type MasterType = 'monk' | 'samurai' | 'taoist';

export interface Quote {
  id: string;
  original: string; // Original Chinese or Japanese script
  english: string;  // English translation
  insight: string;  // Insight/commentary
  source: string;   // Original book/source text
}

export interface Article {
  id: string;
  master: string;     // e.g., "Lao Tzu", "Miyamoto Musashi", "Ryōkan"
  title: string;      // e.g., "The Water of Tao"
  subtitle: string;   // e.g., "On the fluid paths of existence"
  era: string;        // e.g., "c. 6th century BCE"
  type: MasterType;
  image: string;      // High-quality atmospheric banner image
  quotes: Quote[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
