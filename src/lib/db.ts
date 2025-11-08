import Dexie, { Table } from 'dexie';

// Define interfaces
export interface User {
  id?: number;
  email: string;
  password: string; // In real app, hash this
  name: string;
}

export interface Transaction {
  id?: number;
  userId: number;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
}

export interface Holding {
  id?: number;
  userId: number;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  type: 'stock' | 'crypto';
}

// Create database
export class PersonalFinanceDB extends Dexie {
  users!: Table<User>;
  transactions!: Table<Transaction>;
  holdings!: Table<Holding>;

  constructor() {
    super('PersonalFinanceDB');
    this.version(1).stores({
      users: '++id, email',
      transactions: '++id, userId, type, category, date',
      holdings: '++id, userId, symbol, type',
    });
  }
}

export const db = new PersonalFinanceDB();