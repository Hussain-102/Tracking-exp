<script>
  import { onMount } from 'svelte';
  import { getPlaceById, savePlace } from '$lib/db.js';
  import Header from '$lib/components/Header.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';

  let currentPlace = null;
  let places = [];
  const currentUser = { email: 'admin@example.com', id: 'p1', name: 'أحمد' };

  onMount(async () => {
    currentPlace = await getPlaceById('place_1');
    places = [currentPlace];
  });

  const handlePlaceChange = (p) => currentPlace = p;

  function isAdmin() {
    if (!currentPlace) return false;
    return currentPlace.adminId === currentUser.id ||
           currentPlace.invited.some(u => u.email === currentUser.email && u.status === 'accepted');
  }

  async function approveClaim(id) {
    const c = currentPlace.claims.find(x => x.id === id);
    if (!c) return;
    c.status = 'approved';
    await savePlace(currentPlace);
  }

  async function markPaid(id) {
    const c = currentPlace.claims.find(x => x.id === id);
    if (!c) return;
    c.status = 'paid';
    await savePlace(currentPlace);
  }
</script>

<Header {currentPlace} {places} onPlaceChange={handlePlaceChange} />
<div class="container grid">
  {#if currentPlace && isAdmin()}
    <div class="card">
      <h2 style="margin-top:0">إدارة المطالبات</h2>
      <table>
        <thead>
          <tr>
            <th>القائمة</th><th>المبلغ</th><th>الوصف</th><th>الشهر</th><th>من</th><th>الحالة</th><th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {#each currentPlace.claims as c}
            <tr>
              <td>{c.listName}</td>
              <td>{c.amount}</td>
              <td>{c.reason}</td>
              <td>{c.month}</td>
              <td>{currentPlace.people.find(p=>p.id===c.fromPersonId)?.name}</td>
              <td>
                {#if c.status==='pending'}<span class="pill">قيد المراجعة</span>{/if}
                {#if c.status==='approved'}<span class="pill">مقبول</span>{/if}
                {#if c.status==='paid'}<span class="pill">تم السداد</span>{/if}
              </td>
              <td class="row">
                <button class="btn btn-outline" on:click={() => approveClaim(c.id)} disabled={c.status!=='pending'}>موافقة</button>
                <button class="btn" on:click={() => markPaid(c.id)} disabled={c.status!=='approved'}>تم السداد</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="card"><p>هذه الصفحة للإدارة فقط.</p></div>
  {/if}
</div>

<BottomNav />
