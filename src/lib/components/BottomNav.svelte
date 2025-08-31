<nav class="fixed-bottom">
    <a href="/" class="nav-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>الرئيسية</span>
    </a>
    <a href="/add-expense" class="nav-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
        <span>إضافة</span>
    </a>
    <a href="/manage" class="nav-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        <span>الدخل</span>
    </a>
    <a href="/reports" class="nav-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38"></path></svg>
        <span>التقارير</span>
    </a>
</nav>

<style>
    .fixed-bottom {
        display: flex;
        justify-content: space-around;
        padding: 8px 0;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
    }
    .nav-link {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        text-decoration: none;
        color: #64748b;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 8px;
        transition: color 0.2s, background-color 0.2s;
    }
    .nav-link:hover {
        background-color: var(--muted);
        color: var(--brand);
    }
    .nav-link svg {
        width: 22px;
        height: 22px;
    }
</style>

