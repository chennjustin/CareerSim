import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type {
  User,
  Project,
  Session,
  ChatMessage,
  Report,
} from '@careersim/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Database {
  users: User[];
  projects: Project[];
  sessions: Session[];
  messages: ChatMessage[];
  reports: Report[];
  // Simple token storage (userId -> token)
  tokens: Record<string, string>;
}

const defaultData: Database = {
  users: [],
  projects: [],
  sessions: [],
  messages: [],
  reports: [],
  tokens: {},
};

const file = join(__dirname, '../data.json');
const adapter = new JSONFile<Database>(file);
export const db = new Low<Database>(adapter, defaultData);

// Initialize DB
export async function initDB() {
  await db.read();
  db.data ||= defaultData;
  await db.write();
}

