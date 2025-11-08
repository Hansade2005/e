# Vite + React + TypeScript + Tailwind CSS

This template provides a fast, modern development experience with:

- ⚡️ [Vite](https://vitejs.dev/) - Fast build tool and dev server
- ⚛️ [React 18](https://reactjs.org/) - UI library with React Router v6
- 🔷 [TypeScript](https://www.typescriptlang.org/) - Type safety
- 🎨 [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start development server:**
   ```bash
   pnpm dev
   ```

3. **Build for production:**
   ```bash
   pnpm build
   ```

4. **Preview production build:**
   ```bash
   pnpm preview
   ```

## Project Structure

```
src/
├── App.tsx          # Main application component
├── App.css          # App-specific styles
├── index.css        # Global styles with Tailwind
├── main.tsx         # Application entry point
├── components/      # Reusable UI components
├── hooks/           # Custom React hooks
├── assets/          # Static assets (images, icons)
└── lib/             # Utility functions
```

## Features

- 🚀 **Fast Refresh** - Instant updates during development
- 📱 **Responsive Design** - Mobile-first with Tailwind CSS
- 🎯 **Type Safety** - Full TypeScript support
- 🔧 **ESLint** - Code quality and consistency
- 📦 **Modern Build** - ES modules and tree shaking
- 🎣 **Custom Hooks** - Essential React hooks for common patterns
- 🧩 **UI Components** - Complete shadcn/ui component library
- 📊 **Data Tables** - Advanced table with sorting, filtering, pagination

## Available Templates

Choose from these comprehensive templates:

### 🚀 **Vite React Template**
- **Framework**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Features**: 25+ UI components, 10 custom hooks, fast HMR
- **Use Case**: Client-side applications, SPAs, prototypes

### ⚡ **Next.js Template**
- **Framework**: Next.js 14 + App Router + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Features**: SSR/SSG, API routes, 25+ UI components, 10 custom hooks
- **Use Case**: Full-stack applications, production websites

## Available Hooks

The template includes essential custom hooks in `src/hooks/`:

- **useLocalStorage** - Persistent state with localStorage
- **useDebounce** - Debounce values to optimize performance
- **useOnClickOutside** - Detect clicks outside elements
- **useMediaQuery** - Responsive design breakpoints
- **useMobile** - Mobile device detection (responsive)
- **useCopyToClipboard** - Copy text to clipboard
- **useInterval** - Custom interval with cleanup
- **usePrevious** - Access previous state values
- **useToggle** - Boolean state with toggle actions
- **useToast** - Easy toast notifications system

## Customization

- Edit `src/App.tsx` to modify the main component
- Update `tailwind.config.js` to customize Tailwind
- Modify `vite.config.ts` for build configuration
- Add new components in the `src/components/` directory
- Create custom hooks in the `src/hooks/` directory

## AI Development

- Generate code following React and TypeScript best practices
- Apply Tailwind CSS for consistent styling
- Maintain proper component structure and state management
- Ensure responsive design and accessibility
- Follow established patterns for forms, API integration, and state management
- Create responsive, accessible, and performant components
- Implement proper multi-page routing with React Router

## Deployment

This project is ready to deploy to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

Happy coding! 🎉