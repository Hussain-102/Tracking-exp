<script>
  import { onMount } from 'svelte';
  import { getPlaceById, savePlace } from '$lib/db.js';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import Header from '$lib/components/Header.svelte';
  import { monthNowISO, sum } from '$lib/utils';

  export let params;
  let personId = params.id;
  let place = null;
  let places = [];
  let currentPlace = null;

  const currentUser = { email: 'salman@example.com', id: 'p2', name: 'سلمان' };
  let person = null;

  let months = []; // computed from data
  let selectedMonth = monthNowISO();
  let showSummary = true; // true: list months summary, false: single month details

  // claim form
  let claimList = 'ديوانية', claimAmount = '', claimReason = '';

  onMount(async () => {
    currentPlace = await getPlaceById('place_1');
    places = [currentPlace];
    place = currentPlace;
    person = place.people.find(p => p.id === personId);
    months = Array.from(
      new Set(person.monthlyData.map(x => x.month).concat([monthNowISO()]))
    ).sort();
  });

  function personMonth(m) {
    return person?.monthlyData?.find(x => x.month === m) || { month: m, expenses: [], debts: [] };
  }

  async function submitClaim() {
    if (!claimAmount || !Number(claimAmount)) return;
    const newClaim = {
      id: crypto.randomUUID(),
      fromPersonId: currentUser.id,
      listName: claimList,
      amount: Number(claimAmount),
      reason: claimReason || '',
      month: selectedMonth,
      status: 'pending'
    };
    place.claims.push(newClaim);
    await savePlace(place);
    claimAmount=''; claimReason='';
    alert('تم إرسال المطالبة للموافقة');
  }

  const handlePlaceChange = (p) => {
    currentPlace = p;
    location.href = '/';
  }
</script>

<Header {currentPlace} {places} onPlaceChange={handlePlaceChange} />
<div class="container grid">
  {#if person}
    <div class="row" style="justify-content:space-between;">
      <h2 style="margin:0">{person.name}</h2>
      <div class="stack">
        <button class="pill" on:click={() => showSummary = true}>ملخص الشهور</button>
        <button class="pill" on:click={() => showSummary = false}>تفاصيل شهر</button>
      </div>
    </div>

    {#if showSummary}
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>الشهر</th><th>له</th><th>عليه</th><th>الصافي</th>
            </tr>
          </thead>
          <tbody>
            {#each months as m}
              {#key m}
              <tr>
                <td>{m}</td>
                <td class="ok">{sum(personMonth(m).expenses)}</td>
                <td class="bad">
                  {personMonth(m).debts.reduce((a,b)=> b.type==='debit' ? a + (b.amount||0) : a, 0)}
                </td>
                <td>
                  {sum(personMonth(m).expenses) -
                   personMonth(m).debts.reduce((a,b)=> b.type==='debit' ? a + (b.amount||0) : a, 0)}
                </td>
              </tr>
              {/key}
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="card grid">
        <div class="row" style="justify-content:space-between;">
          <label>اختر الشهر:</label>
          <select class="field" style="max-width:200px" bind:value={selectedMonth}>
            {#each months as m}<option value={m}>{m}</option>{/each}
          </select>
        </div>

        <h3 style="margin:0">تفاصيل {selectedMonth}</h3>
        <table>
          <thead><tr><th>البند</th><th>المبلغ</th><th>النوع</th></tr></thead>
          <tbody>
            {#each personMonth(selectedMonth).expenses as e}
              <tr><td>{e.title}</td><td>{e.amount}</td><td>صرف</td></tr>
            {/each}
            {#each personMonth(selectedMonth).debts as d}
              <tr><td class="bad">{d.title}</td><td class="bad">{d.amount}</td><td class="bad">التزام</td></tr>
            {/each}
          </tbody>
        </table>

        <div class="grid">
          <h3 style="margin:0">رفع مطالبة على قائمة</h3>
          <div class="grid grid-2">
            <select class="field" bind:value={claimList}>
              {#each place.lists as l}<option value={l}>{l}</option>{/each}
            </select>
            <input class="field" type="number" min="0" step="0.01" placeholder="المبلغ" bind:value={claimAmount}/>
          </div>
          <input class="field" type="text" placeholder="وش تم شراؤه؟ (اختياري)" bind:value={claimReason} />
          <button class="btn" on:click={submitClaim}>إرسال المطالبة</button>
        </div>

        <div class="grid">
          <h3 style="margin:0">المطالبات الموافق عليها (له/عليه)</h3>
          <ul style="margin:0; padding-inline-start:18px;">
            {#each place.claims.filter(c => c.status==='approved' && c.month===selectedMonth) as c}
              <li>
                <span class="pill">{c.listName}</span>
                — {c.reason ? c.reason + ' — ' : ''}<b>{c.amount}</b> ريال
              </li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}
  {/if}
</div>

<BottomNav />
