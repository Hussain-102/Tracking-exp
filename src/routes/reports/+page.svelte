<script lang="ts">
  import { db, type Expense } from '$lib/db';
  import { activePlaceId, theme } from '$lib/stores'; // 1. استيراد الثيم
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

  // --- 2. تم تحديث هذه الدالة بالكامل ---
  // الآن تقرأ الألوان من الثيم وتطبقها على المخطط
  function updateChart(data, currentTheme) {
    // التأكد من أن الكود يعمل في المتصفح فقط وأن العناصر جاهزة
    if (!browser || !canvasElement || !data || typeof Chart === 'undefined') return;

    // دالة مساعدة لجلب الألوان من متغيرات CSS
    const getCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    // جلب الألوان المتوافقة مع الثيم الحالي
    const brandColor = getCssVar('--brand');
    const textColor = getCssVar('--text');
    const borderColor = getCssVar('--border');
    const brandColorTransparent = brandColor + '20'; // إضافة شفافية

    const monthlyTotals = (data || []).reduce((acc, expense) => {
        const month = expense.date.slice(0, 7);
        acc[month] = (acc[month] || 0) + expense.amount;
        return acc;
    }, {});
    const sortedMonths = Object.keys(monthlyTotals).sort();
    
    if (expenseChart) expenseChart.destroy();
    
    expenseChart = new Chart(canvasElement, {
        type: 'line',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: 'إجمالي المصروفات الشهرية',
                data: sortedMonths.map(month => monthlyTotals[month]),
                borderColor: brandColor,
                backgroundColor: brandColorTransparent,
                fill: true, tension: 0.3
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            // تطبيق الألوان على المحاور والخطوط
            scales: {
                y: {
                    ticks: { color: textColor },
                    grid: { color: borderColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: borderColor }
                }
            },
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            }
        }
    });
  }

  // --- 3. الآن يتم تحديث المخطط عند تغيير البيانات أو الثيم ---
  $: if ($chartData) {
    updateChart($chartData, $theme);
  }

  const reportData = derived([activePlaceId, selectedMonth], ([$id, $month], set) => {
    if (!$id || !$month) return set(null);
    const query = liveQuery(async () => {
        const people = await db.people.where('placeId').equals($id).toArray();
        const expenses = await db.expenses.where('placeId').equals($id)
            .filter(exp => exp.date.startsWith($month))
            .toArray();
        
        const settings = await db.monthlySettings.get({ placeId: $id, month: $month });
        const pData = await db.monthlyPersonData.where({ placeId: $id, month: $month }).toArray();
        
        const monthlyFee = settings?.monthlyFee || 0;
        const totalPeople = people.length || 1;
        
        const summary = people.map(p => {
            const hasPaidFee = pData.some(d => d.personId === p.id && d.feePaidDate);
            const له = expenses.filter(e => e.payerId === p.id).reduce((sum, e) => sum + e.amount, 0);
            const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
            const shareOfExpenses = totalPeople > 0 ? totalExpenses / totalPeople : 0;
            const عليه = shareOfExpenses + (hasPaidFee ? 0 : monthlyFee);
            const صافي = له - عليه;
            return { name: p.name, له, عليه, صافي };
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
        description: expense.description,
        date: expense.date,
        amount: Number(expense.amount),
        payerId: Number(expense.payerId)
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
            <div class="row">
              <span class="ok"><strong>له:</strong> {item.له.toFixed(2)}</span>
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
                            <span>{item.date}</span>
                            <span>|</span>
                            <span>{item.payerName}</span>
                            <span>|</span>
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
    .chart-wrapper {
        position: relative;
        height: 250px;
    }
    .summary-card, .details-card {
        border-bottom: 1px solid var(--border);
        padding-bottom: 12px;
    }
    .summary-card:last-child, .details-card:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }
    .summary-card h4 {
        margin: 0 0 8px 0;
    }
    .details-card .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
    }
    .details-card .body {
        font-size: 14px;
        margin-bottom: 12px;
    }
    .actions button {
        padding: 4px 10px;
        font-size: 12px;
    }
    .btn.danger {
        background-color: var(--bad);
        color: #fff;
    }
</style>

