<script>
  import Header from '$lib/components/Header.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import { theme } from '$lib/stores';
  import { browser } from '$app/environment';

  // هذا الكود هو المسؤول عن تطبيق الوضع الليلي على كامل التطبيق
  // وهو الآن في المكان الصحيح
  $: if (browser) {
    const root = document.documentElement;
    if ($theme === 'dark') {
        root.classList.add('dark-mode');
    } else {
        root.classList.remove('dark-mode');
    }
  }
</script>

<div class="app-wrapper">
  <Header />
  <!-- تم إضافة الكلاس هنا ليتم تطبيقه على كل الصفحات -->
  <main class="container">
    <slot />
  </main>
  <BottomNav />
</div>

<style>
  .app-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
</style>

