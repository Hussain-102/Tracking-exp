<script>
  import { onMount } from 'svelte';
  import { getPlaces, savePlace } from '$lib/db.js';
  import { normalizeName } from '$lib/utils';

  let places = [];
  let place = null;
  let email = '';
  let fullName = '';
  let message = '';

  onMount(async () => {
    places = await getPlaces();
    place = places[0];
  });

  async function join() {
    if (!place) return;
    const invited = place.invited.find(u => u.email === email);
    if (!invited) { message = 'البريد غير مدعو.'; return; }

    const matched = place.people.find(p => normalizeName(p.name) === normalizeName(fullName));
    if (!matched) { message = 'الاسم غير مطابق للأسماء المسجلة.'; return; }

    invited.status = 'accepted';
    await savePlace(place);
    message = 'تم قبولك — يمكنك الدخول الآن.';
  }
</script>

<div class="container grid">
  <div class="card grid">
    <h2 style="margin:0">الانضمام إلى {place?.name}</h2>
    <input class="field" type="email" placeholder="البريد" bind:value={email} />
    <input class="field" type="text" placeholder="الاسم الكامل (مطابق)" bind:value={fullName} />
    <button class="btn" on:click={join}>انضم</button>
    {#if message}<p class="muted">{message}</p>{/if}
  </div>

  <div class="card grid">
    <h3 style="margin:0">أشخاص المكان</h3>
    <div class="stack">
      {#each place?.people || [] as p}<span class="pill">{p.name}</span>{/each}
    </div>
    <h3 style="margin:8px 0 0">المدعوون</h3>
    <ul style="margin:0; padding-inline-start:18px;">
      {#each place?.invited || [] as u}
        <li>{u.email} — <b>{u.status}</b></li>
      {/each}
    </ul>
  </div>
</div>
