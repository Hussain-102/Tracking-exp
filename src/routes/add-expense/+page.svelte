<script lang="ts">
  import { db } from '$lib/db';
  import { activePlaceId } from '$lib/stores';
  import { derived, get } from 'svelte/store';
  import { liveQuery } from 'dexie';
  import { goto } from '$app/navigation';

  let description = '';
  let amount: number | null = null;
  let payerId: number | null = null;
  let expenseDate = new Date().toISOString().split('T')[0];

  // جلب قائمة الأشخاص بشكل تفاعلي
  const people = derived(activePlaceId, ($id, set) => {
    if (!$id) { set([]); return; }
    const query = liveQuery(() => db.people.where('placeId').equals($id).toArray());
    return query.subscribe(set);
  });

  async function addExpense() {
    const currentPlaceId = get(activePlaceId);
    if (!currentPlaceId || !description || !amount || amount <= 0 || !payerId) {
      alert("الرجاء تعبئة جميع الحقول بشكل صحيح.");
      return;
    }
    try {
      await db.expenses.add({
        placeId: currentPlaceId, description, date: expenseDate,
        payerId: payerId, amount: amount, status: 'unpaid',
      });
      goto('/');
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  }
</script>

<div class="container">
  <h2>تسجيل مصروف جديد</h2>

  <form on:submit|preventDefault={addExpense} class="card grid">
    <div class="grid">
      <label for="description">اسم الصرف</label>
      <input type="text" id="description" bind:value={description} class="field" placeholder="مثال: فاتورة الإنترنت" required />
    </div>

    <div class="grid grid-2-responsive">
        <div>
            <label for="date">تاريخ الصرف</label>
            <input type="date" id="date" bind:value={expenseDate} class="field" required />
        </div>
        <div>
            <label for="amount">المبلغ المدفوع</label>
            <input type="number" id="amount" bind:value={amount} class="field" min="0.01" step="0.01" placeholder="0.00" required />
        </div>
    </div>

    <div class="grid">
      <label for="payer">من دفع المبلغ؟</label>
      <select id="payer" bind:value={payerId} class="field" required>
        <option value={null} disabled selected>اختر شخصًا...</option>
        {#if $people}
            {#each $people as person (person.id)}
                <option value={person.id}>{person.name}</option>
            {/each}
        {/if}
      </select>
    </div>
    
    <button type="submit" class="btn" disabled={!payerId || !amount || !description}>حفظ المصروف</button>
  </form>
</div>

<!-- تم إضافة هذا الجزء لجعل التصميم متجاوبًا -->
<style>
    .grid-2-responsive {
        display: grid;
        gap: 12px;
        grid-template-columns: 1fr 1fr; /* الوضع الافتراضي للشاشات الكبيرة */
    }

    @media (max-width: 600px) {
        .grid-2-responsive {
            grid-template-columns: 1fr; /* يترتب الحقلان فوق بعضهما في الشاشات الصغيرة */
        }
    }
</style>

