<script lang="ts">
  import { db, type MonthlySetting, type MonthlyPersonData } from '$lib/db';
  import { activePlaceId } from '$lib/stores';
  import { derived, get, writable } from 'svelte/store';
  import { liveQuery } from 'dexie';

  const selectedMonth = writable(new Date().toISOString().slice(0, 7));
  
  let settings: Partial<MonthlySetting> = {
      openingBalance: 0,
      monthlyFee: 0,
  };

  // --- جديد: متغيرات للتحكم بالنافذة المنبثقة ---
  let isModalOpen = false;
  let personForModal = null;

  const peopleWithData = derived([activePlaceId, selectedMonth], ([$id, $month], set) => {
    if (!$id) return set([]);
    const query = liveQuery(async () => {
        const people = await db.people.where('placeId').equals($id).toArray();
        const personMonthData = await db.monthlyPersonData.where({ placeId: $id, month: $month }).toArray();
        return people.map(person => {
            const data = personMonthData.find(d => d.personId === person.id);
            return { 
                personId: person.id,
                name: person.name,
                monthlyDataId: data?.id || null,
                feePaidDate: data?.feePaidDate || null 
            };
        });
    });
    return query.subscribe(set);
  });
  
  const pageData = derived([activePlaceId, selectedMonth], ([$id, $month], set) => {
    if (!$id) return set(null);
    const query = liveQuery(async () => {
        const expenses = await db.expenses.where({ placeId: $id }).filter(exp => exp.date.startsWith($month)).toArray();
        const monthSettings = await db.monthlySettings.get({ placeId: $id, month: $month });
        return { expenses, monthSettings };
    });
    return query.subscribe(set);
  });

  $: if ($pageData?.monthSettings) {
      settings = $pageData.monthSettings;
  } else {
      settings = { openingBalance: 0, monthlyFee: 0 };
  }

  const totalBalance = derived([pageData, peopleWithData], ([$data, $people]) => {
      if (!$data) return 0;
      const opening = $data.monthSettings?.openingBalance || 0;
      const feesCollected = ($people || []).filter(p => p.feePaidDate).length * ($data.monthSettings?.monthlyFee || 0);
      const expensesReimbursed = ($data.expenses || []).filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
      return opening + feesCollected - expensesReimbursed;
  });

  async function saveSettings() {
    const placeId = get(activePlaceId);
    if (!placeId) return;
    await db.monthlySettings.put({ ...settings, placeId, month: $selectedMonth });
    alert('تم حفظ الإعدادات بنجاح!');
  }

  async function togglePaidStatus(person) {
      const newDate = person.feePaidDate ? null : new Date();
      await updatePersonFeeDate(person, newDate);
  }

  // --- تم التعديل: هذه الدالة الآن تغلق النافذة بعد التحديد ---
  async function handleFeeDateChange(person, dateStr: string) {
      const newDate = dateStr ? new Date(dateStr) : null;
      await updatePersonFeeDate(person, newDate);
      closeDatePickerModal();
  }

  async function updatePersonFeeDate(person, newDate) {
      const placeId = get(activePlaceId);
      if (!placeId) return;
      try {
        await db.monthlyPersonData.put({
            id: person.monthlyDataId || undefined,
            placeId: placeId,
            personId: person.personId,
            month: $selectedMonth,
            feePaidDate: newDate,
        });
      } catch (error) {
        console.error("Failed to update date:", error);
        alert("حدث خطأ.");
      }
  }

  // --- دوال جديدة لفتح وإغلاق النافذة المنبثقة ---
  function openDatePickerModal(person) {
    personForModal = person;
    isModalOpen = true;
  }

  function closeDatePickerModal() {
    isModalOpen = false;
    personForModal = null;
  }

  function formatDateForInput(date: Date | null | undefined): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }
</script>

<!-- --- نافذة التقويم المنبثقة --- -->
{#if isModalOpen && personForModal}
<div class="modal-overlay" on:click={closeDatePickerModal} on:keydown={()=>{}}>
    <div class="modal-content card" on:click|stopPropagation>
        <input 
            type="date" 
            class="field"
            value={formatDateForInput(personForModal.feePaidDate)}
            on:input={(e) => handleFeeDateChange(personForModal, e.currentTarget.value)}
        />
        <button on:click={closeDatePickerModal} class="btn btn-outline">إغلاق</button>
    </div>
</div>
{/if}


<div class="grid">
    <h2>إدارة الدخل والشهرية</h2>

    <div class="card balance-display">
        <span class="muted">الرصيد الحالي في الصندوق</span>
        <span class="amount">{$totalBalance.toFixed(2)}</span>
        <span>ريال سعودي</span>
    </div>

    <div class="card grid">
        <div class="grid">
            <label for="month">تغيير الشهر</label>
            <input type="month" id="month" bind:value={$selectedMonth} class="field" />
        </div>
        <div class="grid">
            <label for="opening-balance">الرصيد الافتتاحي</label>
            <input type="number" id="opening-balance" bind:value={settings.openingBalance} class="field" placeholder="0" />
        </div>
        <div class="grid">
            <label for="monthly-fee">مبلغ العزبة (القطة)</label>
            <input type="number" id="monthly-fee" bind:value={settings.monthlyFee} class="field" placeholder="0" />
        </div>
        <button on:click={saveSettings} class="btn">حفظ الإعدادات</button>
    </div>

    <div class="card">
        <h3>دفع العزبة</h3>
        <div class="grid">
            {#if $peopleWithData && $peopleWithData.length > 0}
                {#each $peopleWithData as person (person.personId)}
                    <div class="person-row">
                        <span class="person-name">{person.name}</span>
                        <div class="payment-controls">
                           <button 
                                type="button"
                                class="styled-checkbox" 
                                class:checked={!!person.feePaidDate}
                                on:click={() => togglePaidStatus(person)}
                           >
                                <div class="checkmark-icon"></div>
                           </button>
                           <!-- --- تم التعديل: هذا الزر الآن يفتح النافذة المنبثقة --- -->
                           <button 
                                type="button" 
                                class="date-picker-label"
                                on:click={() => openDatePickerModal(person)}
                            >
                                <span class="date-text">
                                    {person.feePaidDate ? formatDateForInput(person.feePaidDate) : 'تحديد تاريخ الدفع'}
                                </span>
                           </button>
                        </div>
                    </div>
                {/each}
            {:else}
               <p class="muted">الرجاء إضافة أشخاص أولاً من لوحة التحكم.</p>
            {/if}
        </div>
    </div>
</div>

<style>
    .balance-display { text-align: center; }
    .balance-display .amount {
        display: block; font-size: 2.5rem; font-weight: bold;
        color: var(--brand); margin: 0.5rem 0;
    }
    .person-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 0; border-bottom: 1px solid var(--border);
    }
    .person-row:last-child { border-bottom: none; }
    .person-name { font-weight: 600; }
    
    .payment-controls {
        display: flex; align-items: center; gap: 10px; padding: 4px;
        border: 1px solid var(--border); border-radius: 8px;
        background-color: var(--muted);
    }

    .styled-checkbox {
        flex-shrink: 0; width: 30px; height: 30px;
        border: 1px solid var(--border); background-color: var(--card-bg);
        border-radius: 8px; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; cursor: pointer; padding: 0;
    }

    .date-picker-label {
        background: none; border: none; padding: 8px;
        flex-grow: 1; cursor: pointer; text-align: right;
    }
    .styled-checkbox.checked { background-color: var(--brand); border-color: var(--brand); }
    .checkmark-icon {
        display: none; width: 6px; height: 12px;
        border: solid white; border-width: 0 3px 3px 0;
        transform: rotate(45deg);
    }
    .styled-checkbox.checked .checkmark-icon { display: block; }
    .date-text { font-weight: 600; color: var(--text); }

    /* --- تصميم النافذة المنبثقة --- */
    .modal-overlay {
        position: fixed; top: 0; left: 0;
        width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex; justify-content: center; align-items: center;
        z-index: 100;
    }
    .modal-content {
        width: 90%; max-width: 400px;
        display: flex; flex-direction: column; gap: 1rem;
    }
</style>

