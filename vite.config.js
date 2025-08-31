import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		// TailwindCSS plugin
		tailwindcss(),

		// SvelteKit plugin
		sveltekit(),

		// VitePWA plugin for Progressive Web App capabilities
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Expense Tracker',
				short_name: 'Expenses',
				start_url: '/',
				display: 'standalone',
				background_color: '#FAFAFA',
				theme_color: '#4A90E2',
				icons: [
					{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
				]
			}
		})
	],
	server: {
		host: true, // Allow access from any IP
		port: 5179,   // The port the server will run on
		// If you want to allow all ngrok domains, you could use a regex or be more generic.
		// For a specific free domain, this is correct.
		allowedHosts: ['.ngrok-free.app'] // Allowed ngrok domain
	}
});

