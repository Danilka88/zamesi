/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        monetization: {
          ad: '#3B82F6',
          ecom: '#10B981',
          clip: '#8B5CF6',
          music: '#F59E0B',
          merch: '#EC4899',
          event: '#EF4444',
          celebrity: '#FCD34D',
        },
      },
    },
  },
  plugins: [],
}
