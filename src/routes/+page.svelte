<script lang="ts">
  import { db, type Expense } from '$lib/db';
  import { activePlaceId } from '$lib/stores';
  import { liveQuery } from 'dexie';
  import { get } from 'svelte/store';

  let newPersonName = '';
  let expenses;
  $: expenses = $activePlaceId 
    ? liveQuery(() => db.expenses.where('placeId').equals($activePlaceId).reverse().sortBy('date')) 
    : undefined;

  let peopleMap;
  $: peopleMap = $activePlaceId
    ? liveQuery(async () => {
        const people = await db.people.where('placeId').equals($activePlaceId).toArray();
        return new Map(people.map(p => [p.id!, p.name]));
      })
    : undefined;

  async function addPerson() {
    const currentPlaceId = get(activePlaceId);
    if (!currentPlaceId) return;
    if (newPersonName.trim()) {
      await db.people.add({ name: newPersonName.trim(), placeId: currentPlaceId });
      newPersonName = '';
    }
  }

  async function toggleExpenseStatus(expense: Expense) {
    await db.expenses.update(expense.id!, { status: expense.status === 'unpaid' ? 'paid' : 'unpaid' });
  }
</script>

<!-- تم حذف الحاوية القديمة والاعتماد على الحاوية الرئيسية من layout -->
<h2>لوحة التحكم</h2>

<div class="card">
  <h3>إضافة شخص جديد</h3>
  <form on:submit|preventDefault={addPerson} class="add-person-form stack">
    <input type="text" bind:value={newPersonName} class="field" placeholder="اسم الشخص" required />
    <button type="submit" class="btn">إضافة</button>
  </form>
</div>

<div class="grid">
  <h3>أحدث المصروفات</h3>
  {#if $expenses && $expenses.length > 0}
    {#each $expenses as expense (expense.id)}
      <div class="expense-item card" class:paid={expense.status === 'paid'}>
          <div class="details">
              <span class="description">{expense.description}</span>
              <span class="muted">{expense.date} | دفع بواسطة: {$peopleMap?.get(expense.payerId) || '...'}</span>
          </div>
          <div class="amount-status">
              <strong class="amount">{expense.amount.toFixed(2)}</strong>
              <button 
                  class="btn"
                  class:ok-btn={expense.status === 'paid'}
                  class:bad-btn={expense.status === 'unpaid'}
                  on:click={() => toggleExpenseStatus(expense)}>
                  {expense.status === 'unpaid' ? 'غير مسدد' : 'تم السداد'}
              </button>
          </div>
      </div>
    {/each}
  {:else}
      <div class="card">
        <p class="muted">لا توجد مصروفات مسجلة حاليًا.</p>
      </div>
  {/if}
</div>

<style>
    /* تم تبسيط التصميم ليعتمد على الكلاسات العامة */
    .add-person-form input {
        flex-grow: 1; /* لجعل حقل الإدخال يأخذ المساحة المتاحة */
    }
    .expense-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        gap: 1rem;
        /* يتم التحكم بالألوان الآن من خلال المتغيرات العامة */
        border-right: 6px solid var(--bad);
    }
    .expense-item.paid {
        border-right-color: var(--ok);
    }
    .details {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .description {
        font-weight: 600;
    }
    .amount-status {
        display: flex;
        align-items: center;
        gap: 1rem;
        text-align: left;
    }
    .amount-status button {
        padding: 4px 10px;
        font-size: 12px;
        border-radius: 999px; /* شكل الحبة */
    }
    /* ألوان خاصة بالأزرار */
    .ok-btn { background-color: var(--ok); }
    .bad-btn { background-color: var(--bad); }
</style>

