<script lang="ts">
  import { db, type Expense } from '$lib/db';
  import { activePlaceId, theme } from '$lib/stores';
  import { writable, derived } from 'svelte/store';
  import { liveQuery } from 'dexie';
  import { browser } from '$app/environment';
  
  const selectedMonth = writable(new Date().toISOString().slice(0, 7));
  
  let canvasElement: HTMLCanvasElement;
  let expenseChart: any = null;
  let editingExpenseId: number | null = null;
  
  const peopleList = derived(activePlaceId, ($id, set) => {
    if (!$id) return set([]);
    const query = liveQuery(() => db.people.where({ placeId: $id }).toArray());
    return query.subscribe(set);
  });

  const chartData = derived(activePlaceId, ($id, set) => {
    if (!$id) return set(null);
    const query = liveQuery(() => db.expenses.where({ placeId: $id }).toArray());
    return query.subscribe(set);
  });

  function updateChart(data) {
    if (!browser || !canvasElement || !data || typeof Chart === 'undefined') return;
    const getCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const brandColor = getCssVar('--brand');
    const textColor = getCssVar('--text');
    const borderColor = getCssVar('--border');
    const brandColorTransparent = brandColor + '20';
    const monthlyTotals = (data || []).reduce((acc, expense) => {
        const month = expense.date.slice(0, 7);
        acc[month] = (acc[month] || 0) + expense.amount;
        return acc;
    }, {});
    const sortedMonths = Object.keys(monthlyTotals).sort();
    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart(canvasElement, {
        type: 'line',
        data: { labels: sortedMonths, datasets: [{
                label: 'إجمالي المصروفات الشهرية',
                data: sortedMonths.map(month => monthlyTotals[month]),
                borderColor: brandColor, backgroundColor: brandColorTransparent,
                fill: true, tension: 0.3 }]
        },
        options: { responsive: true, maintainAspectRatio: false,
            scales: {
                y: { ticks: { color: textColor }, grid: { color: borderColor } },
                x: { ticks: { color: textColor }, grid: { color: borderColor } }
            },
            plugins: { legend: { labels: { color: textColor } } }
        }
    });
  }

  $: if ($chartData) {
    updateChart($chartData);
  }

  const reportData = derived([activePlaceId, selectedMonth], ([$id, $month], set) => {
    if (!$id || !$month) return set(null);
    const query = liveQuery(async () => {
        const people = await db.people.where('placeId').equals($id).toArray();
        const expenses = await db.expenses.where('placeId').equals($id).filter(exp => exp.date.startsWith($month)).toArray();
        const pData = await db.monthlyPersonData.where({ placeId: $id, month: $month }).toArray();
        
        const summary = people.map(p => {
            const personMonthlyData = pData.find(d => d.personId === p.id);
            const hasPaidFee = !!personMonthlyData?.feePaidDate;
            const monthlyFeeForPerson = personMonthlyData?.monthlyFee || 0;

            // --- تم تعديل منطق الحساب هنا ---
            const له = expenses
                .filter(e => e.payerId === p.id)
                .reduce((sum, e) => sum + e.amount, 0);
            
            const المسدد = expenses
                .filter(e => e.payerId === p.id && e.status === 'paid')
                .reduce((sum, e) => sum + e.amount, 0);

            // "عليه" الآن هو فقط مبلغ القطة إذا لم يدفعها
            const عليه = hasPaidFee ? 0 : monthlyFeeForPerson;
            
            const صافي = له - عليه;
            
            return { name: p.name, له, المسدد, عليه, صافي };
        });

        const details = expenses.map(e => ({
            ...e,
            payerName: people.find(p => p.id === e.payerId)?.name || ''
        })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return { summary, details };
    });
    const subscription = query.subscribe(set);
    return () => subscription.unsubscribe();
  }, null);

  async function handleSave(expense: Expense) {
    await db.expenses.update(expense.id!, {
        description: expense.description, date: expense.date,
        amount: Number(expense.amount), payerId: Number(expense.payerId)
    });
    editingExpenseId = null;
  }

  async function handleDelete(expenseId: number) {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
        await db.expenses.delete(expenseId);
    }
  }
</script>

<div class="container">
  <h2>التقارير</h2>

  <div class="card">
    <h3>ملخص الصرف السنوي</h3>
    <div class="chart-wrapper">
        <canvas bind:this={canvasElement}></canvas>
    </div>
  </div>

  <div class="card grid">
    <label for="month">تقرير شهر</label>
    <input type="month" id="month" bind:value={$selectedMonth} class="field" />
  </div>

  <div class="card">
    <h3>ملخص أرصدة الشهر</h3>
    <div class="grid">
      {#if $reportData?.summary && $reportData.summary.length > 0}
        {#each $reportData.summary as item}
          <div class="summary-card">
            <h4>{item.name}</h4>
            <div class="details-grid">
              <span class="ok"><strong>له (دفع):</strong> {item.له.toFixed(2)}</span>
              <span class="ok"><strong>المسدد له:</strong> {item.المسدد.toFixed(2)}</span>
              <span class="bad"><strong>عليه:</strong> {item.عليه.toFixed(2)}</span>
              <span class:ok={item.صافي >= 0} class:bad={item.صافي < 0}>
                <strong>الصافي:</strong> {item.صافي.toFixed(2)}
              </span>
            </div>
          </div>
        {/each}
      {:else}
        <p class="muted">لا يوجد ملخص لهذا الشهر.</p>
      {/if}
    </div>
  </div>
  
  <div class="card">
    <h3>تفاصيل مصروفات الشهر</h3>
    <div class="grid">
        {#if $reportData?.details && $reportData.details.length > 0}
            {#each $reportData.details as item (item.id)}
                <div class="details-card">
                    {#if editingExpenseId === item.id}
                        <div class="grid">
                            <input type="text" bind:value={item.description} class="field" placeholder="الوصف" />
                            <div class="grid grid-2">
                                <input type="date" bind:value={item.date} class="field" />
                                <input type="number" bind:value={item.amount} class="field" placeholder="المبلغ" />
                            </div>
                            <select bind:value={item.payerId} class="field">
                                {#if $peopleList}
                                    {#each $peopleList as person}
                                        <option value={person.id}>{person.name}</option>
                                    {/each}
                                {/if}
                            </select>
                            <div class="stack">
                                <button class="btn" on:click={() => handleSave(item)}>حفظ</button>
                                <button class="btn btn-outline" on:click={() => editingExpenseId = null}>إلغاء</button>
                            </div>
                        </div>
                    {:else}
                        <div class="header">
                            <strong>{item.description}</strong>
                            <strong>{item.amount.toFixed(2)} ريال</strong>
                        </div>
                        <div class="body stack muted">
                            <span>{item.date}</span> |
                            <span>{item.payerName}</span> |
                            <span class:ok={item.status === 'paid'} class:bad={item.status === 'unpaid'}>
                                {item.status === 'paid' ? 'مسدد' : 'غير مسدد'}
                            </span>
                        </div>
                        <div class="actions stack">
                            <button class="btn" on:click={() => editingExpenseId = item.id}>تعديل</button>
                            <button class="btn danger" on:click={() => handleDelete(item.id!)}>حذف</button>
                        </div>
                    {/if}
                </div>
            {/each}
        {:else}
            <p class="muted">لا توجد مصروفات مسجلة لهذا الشهر.</p>
        {/if}
    </div>
  </div>
</div>

<style>
    .chart-wrapper { position: relative; height: 250px; }
    .summary-card, .details-card { border-bottom: 1px solid var(--border); padding-bottom: 12px; }
    .summary-card:last-child, .details-card:last-child { border-bottom: none; padding-bottom: 0; }
    .summary-card h4 { margin: 0 0 8px 0; }
    .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 8px;
    }
    .details-card .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .details-card .body { font-size: 14px; margin-bottom: 12px; }
    .actions button { padding: 4px 10px; font-size: 12px; }
    .btn.danger { background-color: var(--bad); color: #fff; }
</style>

