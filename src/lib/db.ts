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
  date: string; // Format: 'YYYY-MM-DD'
  payerId: number;
  amount: number;
  status: 'unpaid' | 'paid';
}

// الرصيد الافتتاحي فقط
export interface MonthlySetting {
    id?: number;
    placeId: number;
    month: string; // "YYYY-MM"
    openingBalance: number;
}

// القطة المخصصة أصبحت هنا
export interface MonthlyPersonData {
    id?: number;
    placeId: number;
    personId: number;
    month: string; // "YYYY-MM"
    feePaidDate: Date | null;
    monthlyFee: number; // القطة الخاصة بهذا الشخص
}

export class AppDatabase extends Dexie {
  places!: Table<Place>;
  people!: Table<Person>;
  expenses!: Table<Expense>;
  monthlySettings!: Table<MonthlySetting>;
  monthlyPersonData!: Table<MonthlyPersonData>;

  constructor() {
    super('sharedExpensesDB');
    // -- تمت زيادة الإصدار إلى 9 لتطبيق التغييرات --
    this.version(9).stores({
      places: '++id, name',
      people: '++id, placeId, name',
      expenses: '++id, date, status, placeId',
      monthlySettings: '++id, &[placeId+month]',
      monthlyPersonData: '++id, &[placeId+month+personId]',
    });
  }
}

export const db = new AppDatabase();

