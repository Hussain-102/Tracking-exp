<script lang="ts">
  import { db } from '$lib/db';
  import { activePlaceId } from '$lib/stores';
  import { derived, get, writable } from 'svelte/store';
  import { liveQuery } from 'dexie';

  const selectedMonth = writable(new Date().toISOString().slice(0, 7));
  
  // --- جديد: متغير لحفظ القطة الموحدة ---
  let globalMonthlyFee: number | null = null;

  // متجر تفاعلي شامل لكل البيانات المطلوبة في الصفحة
  const pageData = derived([activePlaceId, selectedMonth], ([$id, $month], set) => {
    if (!$id || !$month) return set({ people: [], settings: null });

    const query = liveQuery(async () => {
        const settings = await db.monthlySettings.where({ placeId: $id, month: $month }).first();
        const people = await db.people.where('placeId').equals($id).toArray();
        const pData = await db.monthlyPersonData.where({ placeId: $id, month: $month }).toArray();
        
        const peopleWithData = people.map(person => {
            const data = pData.find(d => d.personId === person.id);
            return { 
                personId: person.id, name: person.name,
                monthlyDataId: data?.id || null,
                feePaidDate: data?.feePaidDate || null,
                monthlyFee: data?.monthlyFee || 0
            };
        });
        return { settings, people: peopleWithData };
    });

    return query.subscribe(set);
  }, { people: [], settings: null });


  // الرصيد السنوي (يعتمد الآن على استعلام تفاعلي منفصل وصحيح)
  const annualBalance = derived(activePlaceId, ($id, set) => {
    if (!$id) return set(0);
    const query = liveQuery(async () => {
        const year = new Date().getFullYear().toString();
        let balance = 0;
        let addedOpeningBalance = false;
        
        const settings = await db.monthlySettings.where({ placeId: $id }).filter(s => s.month.startsWith(year)).toArray();
        const pData = await db.monthlyPersonData.where({ placeId: $id }).filter(p => p.month.startsWith(year)).toArray();
        const expenses = await db.expenses.where({ placeId: $id, status: 'paid' }).filter(e => e.date.startsWith(year)).toArray();
        
        for (let i = 1; i <= 12; i++) {
            const loopMonth = `${year}-${String(i).padStart(2, '0')}`;
            const monthSettings = settings.find(s => s.month === loopMonth);
            
            if (monthSettings) {
                if (!addedOpeningBalance && monthSettings.openingBalance > 0) {
                    balance += Number(monthSettings.openingBalance) || 0;
                    addedOpeningBalance = true;
                }
            }
            const monthPData = pData.filter(p => p.month === loopMonth);
            monthPData.forEach(p => { if (p.feePaidDate) balance += Number(p.monthlyFee) || 0; });

            const monthExpenses = expenses.filter(e => e.date.startsWith(loopMonth));
            monthExpenses.forEach(exp => { balance -= Number(exp.amount) || 0; });
        }
        return balance;
    });
    return query.subscribe(set);
  }, 0);


  // دوال الحفظ الفورية
  async function saveOpeningBalance(opening) {
    const placeId = get(activePlaceId);
    if (!placeId) return;
    const currentSettings = $pageData?.settings || {};
    await db.monthlySettings.put({ 
        id: currentSettings.id || undefined,
        openingBalance: Number(opening) || 0,
        placeId: placeId, 
        month: $selectedMonth 
    });
  }

  async function updatePersonData(person) {
      const placeId = get(activePlaceId);
      if (!placeId) return;
      try {
        await db.monthlyPersonData.put({
            id: person.monthlyDataId || undefined,
            placeId: placeId, personId: person.personId, month: $selectedMonth,
            feePaidDate: person.feePaidDate,
            monthlyFee: Number(person.monthlyFee) || 0
        });
      } catch (e) { console.error(e); alert("حدث خطأ."); }
  }

  // --- جديد: دالة لتطبيق القطة الموحدة على الجميع ---
  async function applyGlobalFeeToAll() {
    if (globalMonthlyFee !== null && globalMonthlyFee >= 0) {
        for (const person of $pageData.people) {
            const updatedPerson = { ...person, monthlyFee: globalMonthlyFee };
            await updatePersonData(updatedPerson);
        }
        alert('تم تطبيق القطة الموحدة على الجميع.');
    }
  }

  function togglePaidStatus(person) {
      const newDate = person.feePaidDate ? null : new Date();
      updatePersonData({ ...person, feePaidDate: newDate });
  }

  function handleFeeDateChange(person, dateStr) {
      const newDate = dateStr ? new Date(dateStr) : null;
      updatePersonData({ ...person, feePaidDate: newDate });
  }

  function formatDateForInput(date) {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }
</script>

<div class="grid">
    <h2>إدارة الدخل والشهرية</h2>
    <div class="card balance-display">
        <span class="muted">الرصيد السنوي التراكمي</span>
        <span class="amount">{$annualBalance !== null ? $annualBalance.toFixed(2) : '0.00'}</span>
        <span>ريال سعودي</span>
    </div>
    <div class="card grid">
        <label for="month">تغيير الشهر</label>
        <input type="month" id="month" bind:value={$selectedMonth} class="field" />
        
        <label for="opening-balance">الرصيد الافتتاحي / تعديل يدوي للشهر</label>
        <input 
            type="number" id="opening-balance" 
            value={$pageData?.settings?.openingBalance || 0}
            on:change={(e) => saveOpeningBalance(e.currentTarget.value)}
            class="field" placeholder="0" />
    </div>
    
    <!-- --- جديد: قسم القطة الموحدة --- -->
    <div class="card grid">
        <h3>القطة الموحدة (افتراضي)</h3>
        <div class="stack">
            <input type="number" bind:value={globalMonthlyFee} class="field" placeholder="مبلغ موحد للجميع" />
            <button class="btn" on:click={applyGlobalFeeToAll}>تطبيق على الكل</button>
        </div>
    </div>

    <div class="card">
        <h3>دفع العزبة (مخصص)</h3>
        <div class="grid">
            {#if $pageData?.people && $pageData.people.length > 0}
                {#each $pageData.people as person (person.personId)}
                    <div class="person-row">
                        <span class="person-name">{person.name}</span>
                        <div class="payment-controls">
                           <button type="button" class="styled-checkbox" class:checked={!!person.feePaidDate} on:click={() => togglePaidStatus(person)}>
                                <div class="checkmark-icon"></div>
                           </button>
                           <input 
                                type="number"
                                value={person.monthlyFee}
                                on:change={(e) => updatePersonData({ ...person, monthlyFee: e.currentTarget.value })}
                                class="fee-input field"
                                placeholder="القطة"
                            />
                           <label class="date-picker-label">
                                <input type="date" class="hidden-date-input" value={formatDateForInput(person.feePaidDate)} on:input={(e) => handleFeeDateChange(person, e.currentTarget.value)} />
                                <span class="date-text">{person.feePaidDate ? formatDateForInput(person.feePaidDate) : 'تحديد التاريخ'}</span>
                           </label>
                        </div>
                    </div>
                {/each}
            {:else}
               <p class="muted">الرجاء إضافة أشخاص أولاً.</p>
            {/if}
        </div>
    </div>
</div>

<style>
    .balance-display { text-align: center; }
    .balance-display .amount { font-size: 2.5rem; font-weight: bold; color: var(--brand); margin: 0.5rem 0; }
    .person-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border); }
    .person-name { font-weight: 600; }
    .payment-controls { display: flex; align-items: center; gap: 8px; }
    .fee-input { max-width: 90px; text-align: center; }
    .date-picker-label { position: relative; cursor: pointer; padding: 8px; border-radius: 8px; background-color: var(--muted); }
    .hidden-date-input { position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
    .styled-checkbox { flex-shrink: 0; width: 30px; height: 30px; border: 1px solid var(--border); background-color: var(--card-bg); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
    .styled-checkbox.checked { background-color: var(--brand); border-color: var(--brand); }
    .checkmark-icon { display: none; width: 6px; height: 12px; border: solid white; border-width: 0 3px 3px 0; transform: rotate(45deg); }
    .styled-checkbox.checked .checkmark-icon { display: block; }
    .date-text { font-weight: 600; color: var(--text); font-size: 14px; }
</style>

