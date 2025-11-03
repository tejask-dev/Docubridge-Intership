// Minimal type declarations to satisfy TypeScript for markdown libraries
declare module 'react-markdown' {
  import * as React from 'react';
  interface ReactMarkdownProps {
    children?: React.ReactNode;
    remarkPlugins?: any[];
    // Allow any other props passed through
    [key: string]: any;
  }
  const ReactMarkdown: React.ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
}

declare module 'remark-gfm' {
  const remarkGfm: any;
  export default remarkGfm;
}

declare module 'remark-breaks' {
  const remarkBreaks: any;
  export default remarkBreaks;
}


