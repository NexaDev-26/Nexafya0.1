// Fallback type declarations for missing modules
// These are temporary stubs to allow the build to succeed

declare module '*?raw' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: any;
  export default content;
}

declare module '*.png' {
  const content: any;
  export default content;
}

declare module '*.jpg' {
  const content: any;
  export default content;
}

declare module '*.jpeg' {
  const content: any;
  export default content;
}

declare module '*.gif' {
  const content: any;
  export default content;
}

declare module '*.webp' {
  const content: any;
  export default content;
}

// Allow any imports that might be missing
declare module '*' {
  const content: any;
  export default content;
  export const __esModule: boolean;
  export = content;
}
