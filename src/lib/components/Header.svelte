<script lang="ts">
  import { db, type Place } from '$lib/db';
  import { activePlaceId, theme } from '$lib/stores';
  import { liveQuery } from 'dexie';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let places = liveQuery(() => db.places.toArray());
  let showDropdown = false;
  let activePlaceName = 'اختر مكانًا';
  let newPlaceName = '';
  let editingPlaceId: number | null = null;
  let editedPlaceName = '';
  
  function toggleTheme() {
    theme.update(current => (current === 'dark' ? 'light' : 'dark'));
  }

  onMount(() => {
    const unsubscribeTheme = theme.subscribe(value => {
        if (browser) {
            const root = document.documentElement;
            if (value === 'dark') {
                root.classList.add('dark-mode');
            } else {
                root.classList.remove('dark-mode');
            }
        }
    });

    (async () => {
        if ((await db.places.count()) === 0) {
          const houseId = await db.places.add({ name: 'المنزل' });
          activePlaceId.set(houseId);
        } else if (!get(activePlaceId)) {
            const firstPlace = await db.places.orderBy('id').first();
            if(firstPlace) activePlaceId.set(firstPlace.id);
        }
    })();

    return () => {
        unsubscribeTheme();
    };
  });

  activePlaceId.subscribe(async (id) => {
    if (id) {
      const place = await db.places.get(id);
      activePlaceName = place?.name || 'اختر مكانًا';
    } else {
      activePlaceName = 'اختر مكانًا';
    }
  });

  function switchPlace(placeId: number) {
    activePlaceId.set(placeId);
    showDropdown = false;
  }

  async function addPlace() {
    if (newPlaceName.trim()) {
      const newId = await db.places.add({ name: newPlaceName.trim() });
      activePlaceId.set(newId);
      newPlaceName = '';
      showDropdown = false;
    }
  }

  function startEditing(place: Place) {
    editingPlaceId = place.id!;
    editedPlaceName = place.name;
  }

  async function saveEdit(placeId: number) {
    if (editedPlaceName.trim()) {
      await db.places.update(placeId, { name: editedPlaceName.trim() });
      if (get(activePlaceId) === placeId) {
          activePlaceName = editedPlaceName.trim();
      }
      editingPlaceId = null;
    }
  }

  async function deletePlace(placeId: number) {
    if (confirm('هل أنت متأكد؟ سيتم حذف هذا المكان وكل بياناته بشكل دائم.')) {
      await db.transaction('rw', db.places, db.people, db.expenses, db.monthlySettings, db.monthlyPersonData, async () => {
        await db.people.where('placeId').equals(placeId).delete();
        await db.expenses.where('placeId').equals(placeId).delete();
        await db.monthlySettings.where('placeId').equals(placeId).delete();
        await db.monthlyPersonData.where('placeId').equals(placeId).delete();
        await db.places.delete(placeId);
      });
      if (get(activePlaceId) === placeId) {
        const firstPlace = await db.places.orderBy('id').first();
        activePlaceId.set(firstPlace?.id || null);
      }
    }
  }
</script>

<header class="card">
  <div class="header-content">
    <button class="theme-toggle" on:click={toggleTheme}>
        {#if $theme === 'dark'}🌙{:else}☀️{/if}
    </button>
    
    <h1 on:click={() => showDropdown = !showDropdown}>
      {activePlaceName}
      <span class="arrow" class:open={showDropdown}>▼</span>
    </h1>
  </div>

  {#if showDropdown}
    <div class="dropdown">
      {#if $places && $places.length > 0}
        {#each $places as place (place.id)}
          <div class="place-row">
            {#if editingPlaceId === place.id}
              <input type="text" bind:value={editedPlaceName} on:keydown={(e) => e.key === 'Enter' && saveEdit(place.id!)} class="field" />
              <div class="actions stack">
                <button class="btn" on:click|stopPropagation={() => saveEdit(place.id!)}>حفظ</button>
                <button class="btn btn-outline" on:click|stopPropagation={() => editingPlaceId = null}>إلغاء</button>
              </div>
            {:else}
              <button class="place-name" on:click={() => switchPlace(place.id!)}>{place.name}</button>
              <div class="actions stack">
                <button class="btn-icon" on:click|stopPropagation={() => startEditing(place)}>✏️</button>
                <button class="btn-icon" on:click|stopPropagation={() => deletePlace(place.id!)}>🗑️</button>
              </div>
            {/if}
          </div>
        {/each}
      {/if}

      <div class="add-place-form">
        <input type="text" bind:value={newPlaceName} placeholder="إضافة مكان جديد..." on:click|stopPropagation on:keydown={(e) => e.key === 'Enter' && addPlace()} class="field" />
        <button on:click|stopPropagation={addPlace} class="btn">إضافة</button>
      </div>
    </div>
  {/if}
</header>

<style>
  header {
    /* --- تم إضافة هذا السطر لإصلاح المشكلة --- */
    background: var(--card-bg);
    position: sticky; top: 0; z-index: 20;
    border-radius: 0; border-left: 0; border-right: 0;
    padding: 12px;
  }
  .header-content {
    max-width: 980px; margin: 0 auto;
    display: flex; justify-content: space-between; align-items: center;
  }
  h1 { font-size: 1.2rem; margin: 0; cursor: pointer; user-select: none; }
  .arrow { display: inline-block; transition: transform 0.2s; }
  .arrow.open { transform: rotate(180deg); }
  
  .theme-toggle {
    background: none; border: none; font-size: 1.5rem; cursor: pointer;
    padding: 0; line-height: 1;
  }

  .dropdown { 
    position: absolute; background: var(--card-bg); border: 1px solid var(--border); 
    width: 100%; left: 0; top: 100%; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    max-width: 980px; margin: 0 auto; left: 50%; transform: translateX(-50%);
  }
  .place-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; border-bottom: 1px solid var(--border); }
  .place-name { flex-grow: 1; text-align: right; border: none; background: none; font-size: 1rem; cursor: pointer; padding: 0.5rem 0; color: var(--text);}
  .actions { font-size: 12px; }
  .actions button { padding: 4px 8px; }
  .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; }
  .add-place-form { display: flex; padding: 1rem; gap: 0.5rem; background-color: var(--muted); }
</style>

