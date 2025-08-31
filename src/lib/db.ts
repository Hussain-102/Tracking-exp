import Dexie, { type Table } from 'dexie';

export interface Place {
  id?: number;
  name: string;
}

export interface Person {
  id?: number;
  placeId: number;
  name: string;
}

export interface Expense {
  id?: number;
  placeId: number;
  description: string;
  // -- تم التعديل --
  // سيتم تخزين التاريخ كنص لمنع مشاكل المنطقة الزمنية
  date: string; // Format: 'YYYY-MM-DD'
  payerId: number;
  amount: number;
  status: 'unpaid' | 'paid';
}

export interface MonthlySetting {
    id?: number;
    placeId: number;
    month: string;
    monthlyFee: number;
    openingBalance: number;
}

export interface MonthlyPersonData {
    id?: number;
    placeId: number;
    personId: number;
    month: string;
    feePaidDate: Date | null;
}

export class AppDatabase extends Dexie {
  places!: Table<Place>;
  people!: Table<Person>;
  expenses!: Table<Expense>;
  monthlySettings!: Table<MonthlySetting>;
  monthlyPersonData!: Table<MonthlyPersonData>;

  constructor() {
    super('sharedExpensesDB');
    // -- تمت زيادة الإصدار إلى 6 لتطبيق التغييرات --
    this.version(6).stores({
      places: '++id, name',
      people: '++id, placeId, name',
      // -- تم تحديث الفهرس --
      expenses: '++id, placeId, date, status',
      monthlySettings: '++id, &[placeId+month]',
      monthlyPersonData: '++id, &[placeId+month+personId]',
    });
  }
}

export const db = new AppDatabase();

